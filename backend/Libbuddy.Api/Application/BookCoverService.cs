using System.Net.Http;
using System.Text.Json;

namespace Libbuddy.Api.Application;

public interface IBookCoverService
{
    Task<string?> FetchCoverUrlAsync(Guid bookId, string? isbn, string title, CancellationToken cancellationToken = default);
    Task<int> RefreshAllCoversAsync(CancellationToken cancellationToken = default);
}

public class BookCoverService(
    IHttpClientFactory httpClientFactory,
    ILogger<BookCoverService> logger,
    Libbuddy.Api.Infrastructure.Data.AppDbContext db)
    : IBookCoverService
{
    public async Task<string?> FetchCoverUrlAsync(Guid bookId, string? isbn, string title, CancellationToken cancellationToken = default)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(isbn))
            {
                var isbnClean = isbn.Trim();
                var byIsbnUrl = $"https://covers.openlibrary.org/b/isbn/{isbnClean}-L.jpg";
                if (await UrlExistsAsync(byIsbnUrl, cancellationToken))
                {
                    logger.LogInformation("Cover found via ISBN for book {BookId}: {Url}", bookId, byIsbnUrl);
                    return byIsbnUrl;
                }
            }

            var encodedTitle = Uri.EscapeDataString(title.Trim());
            var searchUrl = $"https://openlibrary.org/search.json?title={encodedTitle}&limit=3&fields=cover_i,isbn";
            var client = httpClientFactory.CreateClient("OpenLibrary");
            var response = await client.GetAsync(searchUrl, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("OpenLibrary search failed for title '{Title}': {Status}", title, response.StatusCode);
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

            var root = doc.RootElement;
            if (!root.TryGetProperty("docs", out var docs) || docs.GetArrayLength() == 0)
            {
                logger.LogWarning("No OpenLibrary results for title '{Title}'", title);
                return null;
            }

            foreach (var result in docs.EnumerateArray())
            {
                if (result.TryGetProperty("cover_i", out var coverIElement) && coverIElement.TryGetInt32(out var coverId))
                {
                    var byIdUrl = $"https://covers.openlibrary.org/b/id/{coverId}-L.jpg";
                    if (await UrlExistsAsync(byIdUrl, cancellationToken))
                    {
                        logger.LogInformation("Cover found via title search for book {BookId}: {Url}", bookId, byIdUrl);
                        return byIdUrl;
                    }
                }
            }

            logger.LogWarning("No valid cover found for book {BookId} via title '{Title}'", bookId, title);
            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Error fetching cover for book {BookId}", bookId);
            return null;
        }
    }

    public async Task<int> RefreshAllCoversAsync(CancellationToken cancellationToken = default)
    {
        // Use synchronous ToList to avoid LINQ AsyncEnumerable collision with EF Core
        var booksWithoutCover = db.Books
            .Where(x => x.Status == Domain.BookStatus.Active && string.IsNullOrEmpty(x.CoverImageUrl))
            .ToList();

        var refreshed = 0;
        foreach (var book in booksWithoutCover)
        {
            var url = await FetchCoverUrlAsync(book.Id, book.Isbn, book.Title, cancellationToken);
            if (!string.IsNullOrEmpty(url))
            {
                book.CoverImageUrl = url;
                refreshed++;
            }

            if (cancellationToken.IsCancellationRequested)
            {
                break;
            }
            await Task.Delay(500, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Bulk cover refresh: {Refreshed}/{Total} updated", refreshed, booksWithoutCover.Count);
        return refreshed;
    }

    private static async Task<bool> UrlExistsAsync(string url, CancellationToken cancellationToken)
    {
        try
        {
            var client = new HttpClient { Timeout = TimeSpan.FromSeconds(6) };
            using var request = new HttpRequestMessage(HttpMethod.Head, url);
            var response = await client.SendAsync(request, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}
