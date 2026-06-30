using System.Net.Http;
using System.Text.Json;

namespace Libbuddy.Api.Application;

public interface IBookCoverService
{
    Task<string?> FetchCoverUrlAsync(Guid bookId, string? isbn, string title, string? author, CancellationToken cancellationToken = default);
    Task<int> RefreshAllCoversAsync(CancellationToken cancellationToken = default);
}

public class BookCoverService(
    IHttpClientFactory httpClientFactory,
    ILogger<BookCoverService> logger,
    Libbuddy.Api.Infrastructure.Data.AppDbContext db)
    : IBookCoverService
{
    private static string? UpgradeGoogleCover(string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;
        return url
            .Replace("&edge=curl", string.Empty)
            .Replace("zoom=5", "zoom=1")
            .Replace("zoom=2", "zoom=1");
    }

    public async Task<string?> FetchCoverUrlAsync(Guid bookId, string? isbn, string title, string? author, CancellationToken cancellationToken = default)
    {
        try
        {
            var client = httpClientFactory.CreateClient("OpenLibrary");
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Libbuddy/1.0");

            // 1) ISBN lookup (skip fake "LIB-XXXXXX-L" seeding values)
            if (!string.IsNullOrWhiteSpace(isbn) && !isbn.Trim().StartsWith("LIB-", StringComparison.OrdinalIgnoreCase))
            {
                var url = $"https://www.googleapis.com/books/v1/volumes?q=isbn:{Uri.EscapeDataString(isbn.Trim())}";
                var found = await TryFetchGoogleCoverAsync(client, url, cancellationToken);
                if (!string.IsNullOrEmpty(found))
                {
                    logger.LogInformation("Cover found via ISBN for book {BookId}: {Url}", bookId, found);
                    return found;
                }
            }

            // 2) Title + Author lookup (most reliable for Vietnamese titles)
            var query = $"intitle:{title.Trim()}";
            if (!string.IsNullOrWhiteSpace(author))
            {
                query += $"+inauthor:{author.Trim()}";
            }
            var searchUrl = $"https://www.googleapis.com/books/v1/volumes?q={Uri.EscapeDataString(query)}&maxResults=3&printType=books&projection=lite";
            var fromSearch = await TryFetchGoogleCoverAsync(client, searchUrl, cancellationToken);
            if (!string.IsNullOrEmpty(fromSearch))
            {
                logger.LogInformation("Cover found via title+author for book {BookId}: {Url}", bookId, fromSearch);
                return fromSearch;
            }

            // 3) Fallback: title only
            var titleOnly = Uri.EscapeDataString(title.Trim());
            var fallback = await TryFetchGoogleCoverAsync(client,
                $"https://www.googleapis.com/books/v1/volumes?q={titleOnly}&maxResults=3&printType=books&projection=lite",
                cancellationToken);
            if (!string.IsNullOrEmpty(fallback))
            {
                logger.LogInformation("Cover found via title-only for book {BookId}: {Url}", bookId, fallback);
                return fallback;
            }

            logger.LogWarning("No cover found for book {BookId} '{Title}'", bookId, title);
            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Error fetching cover for book {BookId}", bookId);
            return null;
        }
    }

    private static async Task<string?> TryFetchGoogleCoverAsync(HttpClient client, string url, CancellationToken cancellationToken)
    {
        try
        {
            var response = await client.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode) return null;
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            if (!doc.RootElement.TryGetProperty("items", out var items) || items.GetArrayLength() == 0) return null;

            foreach (var item in items.EnumerateArray())
            {
                if (!item.TryGetProperty("volumeInfo", out var info)) continue;
                if (!info.TryGetProperty("imageLinks", out var images)) continue;

                if (images.TryGetProperty("thumbnail", out var thumb))
                {
                    var upgraded = UpgradeGoogleCover(thumb.GetString());
                    if (!string.IsNullOrEmpty(upgraded) && await IsValidImageAsync(upgraded, cancellationToken))
                    {
                        return upgraded;
                    }
                }
            }
        }
        catch
        {
            // Ignore and let caller fall through to next strategy.
        }
        return null;
    }

    private static async Task<bool> IsValidImageAsync(string url, CancellationToken cancellationToken)
    {
        try
        {
            using var probe = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            using var resp = await probe.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            if (!resp.IsSuccessStatusCode) return false;
            var len = resp.Content.Headers.ContentLength ?? 0;
            // Reject tiny placeholders (Google sometimes returns a 1x1 gif for missing covers).
            return len >= 1024;
        }
        catch
        {
            return false;
        }
    }

    public async Task<int> RefreshAllCoversAsync(CancellationToken cancellationToken = default)
    {
        var books = db.Books
            .Where(x => x.Status == Domain.BookStatus.Active)
            .ToList();

        var refreshed = 0;
        var skipped = 0;
        foreach (var book in books)
        {
            // Skip books whose cover is already a known-good Google cover
            if (!string.IsNullOrEmpty(book.CoverImageUrl) &&
                book.CoverImageUrl.Contains("books.google.com", StringComparison.OrdinalIgnoreCase))
            {
                skipped++;
                continue;
            }

            var url = await FetchCoverUrlAsync(book.Id, book.Isbn, book.Title, null, cancellationToken);
            if (!string.IsNullOrEmpty(url))
            {
                book.CoverImageUrl = url;
                refreshed++;
            }

            if (cancellationToken.IsCancellationRequested) break;
            await Task.Delay(250, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Bulk cover refresh: {Refreshed}/{Total} (skipped {Skipped})", refreshed, books.Count, skipped);
        return refreshed;
    }
}