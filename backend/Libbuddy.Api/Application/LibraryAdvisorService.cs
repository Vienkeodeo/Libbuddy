using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Libbuddy.Api.Domain;
using Libbuddy.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Libbuddy.Api.Application;

public interface ILibraryAdvisorService
{
    Task<AiChatResponse> ChatAsync(AiChatRequest request, CancellationToken cancellationToken = default);
}

public class LibraryAdvisorService(
    AppDbContext db,
    IRuntimeAiSettingsStore aiSettingsStore,
    IHttpClientFactory httpClientFactory,
    ILogger<LibraryAdvisorService> logger) : ILibraryAdvisorService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly (string Topic, string[] Terms)[] TopicLexicon =
    [
        ("giao tiếp", ["giao tiếp", "đồng nghiệp", "ứng xử", "thuyết trình", "bán hàng", "quan hệ"]),
        ("quản lý thời gian", ["thời gian", "trì hoãn", "deadline", "ưu tiên", "sắp xếp", "năng suất"]),
        ("tài chính cá nhân", ["tiền", "tài chính", "đầu tư", "tiết kiệm", "chi tiêu"]),
        ("tâm lý", ["stress", "căng thẳng", "overthinking", "chữa lành", "cảm xúc", "lo âu", "mất động lực"]),
        ("kinh doanh", ["kinh doanh", "quản lý", "marketing", "sale", "bán hàng", "lãnh đạo"]),
        ("tư duy", ["tư duy", "ra quyết định", "sáng tạo", "hệ thống", "nghĩ lại"]),
        ("văn học", ["tiểu thuyết", "nhẹ nhàng", "câu chuyện", "cảm hứng"]),
        ("lịch sử", ["lịch sử", "xã hội", "loài người", "văn minh"])
    ];

    public async Task<AiChatResponse> ChatAsync(AiChatRequest request, CancellationToken cancellationToken = default)
    {
        var message = request.Message.Trim();
        if (message.Length < 3)
        {
            return new AiChatResponse(
                Guid.Empty,
                "Nhu cầu chưa đủ rõ",
                ToApiStatus(NeedStatus.NeedMoreInformation),
                "Bạn muốn đọc sách để phục vụ mục tiêu nào?",
                "Bạn muốn đọc để học kỹ năng, giải trí, quản lý công việc hay cải thiện cảm xúc?",
                []);
        }

        var conversation = await GetOrCreateConversation(request, message, cancellationToken);
        conversation.Messages.Add(new AIMessage
        {
            Sender = AiSender.User,
            Message = message,
            Intent = "recommend_books"
        });

        var analysis = AnalyzeNeed(message);
        if (analysis.Status == NeedStatus.NeedMoreInformation)
        {
            var reply = analysis.FollowUpQuestion ?? "Bạn có thể nói rõ hơn về mục tiêu đọc của mình không?";
            conversation.Messages.Add(new AIMessage
            {
                Sender = AiSender.Assistant,
                Message = reply,
                Intent = "need_more_information"
            });
            conversation.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);

            return new AiChatResponse(
                conversation.Id,
                analysis.NeedSummary,
                ToApiStatus(analysis.Status),
                reply,
                analysis.FollowUpQuestion,
                []);
        }

        var candidates = await SearchCandidateBooks(analysis, message, cancellationToken);

        if (candidates.Count == 0)
        {
            var reply = "Hiện thư viện chưa có sách thật sự khớp với nhu cầu này. Mình đã ghi nhận để thủ thư xem xét nhập thêm.";
            conversation.Messages.Add(new AIMessage
            {
                Sender = AiSender.Assistant,
                Message = reply,
                Intent = "no_matching_books"
            });
            AddNeedAnalytics(request.UserId, conversation.Id, analysis);
            conversation.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);

            return new AiChatResponse(
                conversation.Id,
                analysis.NeedSummary,
                ToApiStatus(NeedStatus.NoMatchingBooks),
                reply,
                null,
                []);
        }

        var recommendations = candidates
            .Take(3)
            .Select((book, index) => MapRecommendation(book, analysis, index))
            .ToList();

        var assistantReply = await TryCreateOpenAiReplyAsync(message, analysis, recommendations, cancellationToken)
            ?? (recommendations.Count == 1
            ? "Mình tìm thấy một cuốn phù hợp nhất trong kho sách hiện có."
            : "Dưới đây là các gợi ý phù hợp nhất trong kho sách hiện có.");

        conversation.Messages.Add(new AIMessage
        {
            Sender = AiSender.Assistant,
            Message = assistantReply,
            Intent = "recommend_books"
        });

        foreach (var recommendation in recommendations)
        {
            db.AIRecommendations.Add(new AIRecommendation
            {
                ConversationId = conversation.Id,
                UserId = request.UserId,
                BookId = recommendation.BookId,
                Score = recommendation.Score,
                Reason = recommendation.Reason,
                NeedSummary = analysis.NeedSummary
            });
        }

        AddNeedAnalytics(request.UserId, conversation.Id, analysis);
        conversation.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return new AiChatResponse(
            conversation.Id,
            analysis.NeedSummary,
            ToApiStatus(NeedStatus.EnoughInformation),
            assistantReply,
            null,
            recommendations);
    }

    private async Task<AIConversation> GetOrCreateConversation(AiChatRequest request, string message, CancellationToken cancellationToken)
    {
        if (request.ConversationId.HasValue)
        {
            var existing = await db.AIConversations
                .Include(x => x.Messages)
                .FirstOrDefaultAsync(x => x.Id == request.ConversationId, cancellationToken);

            if (existing is not null && (existing.UserId == null || existing.UserId == request.UserId))
            {
                return existing;
            }
        }

        var title = message.Length > 56 ? $"{message[..56]}..." : message;
        var conversation = new AIConversation
        {
            UserId = request.UserId,
            Title = title,
            Status = "Active"
        };

        db.AIConversations.Add(conversation);
        return conversation;
    }

    private static NeedAnalysis AnalyzeNeed(string message)
    {
        var normalized = message.ToLowerInvariant();
        var matchedTopics = TopicLexicon
            .Where(topic => topic.Terms.Any(term => normalized.Contains(term, StringComparison.OrdinalIgnoreCase)))
            .Select(topic => topic.Topic)
            .Distinct()
            .ToList();

        var hasOnlyGenericNeed = matchedTopics.Count == 0
            && (normalized.Contains("sách hay") || normalized.Contains("đọc gì") || normalized.Contains("gợi ý"));

        if (hasOnlyGenericNeed || normalized.Length < 12)
        {
            return new NeedAnalysis(
                NeedStatus.NeedMoreInformation,
                "Người dùng muốn được gợi ý sách nhưng chưa nêu mục tiêu cụ thể",
                matchedTopics,
                null,
                null,
                "Bạn muốn sách phục vụ mục tiêu nào: học kỹ năng, công việc, tài chính, cảm xúc hay đọc nhẹ nhàng?");
        }

        if (matchedTopics.Count == 0)
        {
            matchedTopics.AddRange(["phát triển bản thân"]);
        }

        var difficulty = normalized.Contains("dễ") || normalized.Contains("nhẹ") || normalized.Contains("mới bắt đầu")
            ? "Easy"
            : normalized.Contains("chuyên sâu") || normalized.Contains("khó") || normalized.Contains("học thuật")
                ? "Hard"
                : null;

        var preferredLength = normalized.Contains("ngắn") || normalized.Contains("1 tuần") || normalized.Contains("ít thời gian")
            ? "Short"
            : normalized.Contains("dài") || normalized.Contains("đầy đủ")
                ? "Long"
                : null;

        var summary = $"Người dùng muốn sách về {string.Join(", ", matchedTopics)}"
            + (difficulty is not null ? $" ở mức {difficulty}" : "")
            + (preferredLength is not null ? $" với thời lượng {preferredLength}" : "");

        return new NeedAnalysis(
            NeedStatus.EnoughInformation,
            summary,
            matchedTopics,
            difficulty,
            preferredLength,
            null);
    }

    private async Task<List<Book>> SearchCandidateBooks(NeedAnalysis analysis, string message, CancellationToken cancellationToken)
    {
        var normalized = message.ToLowerInvariant();
        var topicTerms = TopicLexicon
            .Where(x => analysis.Topics.Contains(x.Topic))
            .SelectMany(x => x.Terms.Append(x.Topic))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var books = await db.Books
            .AsNoTracking()
            .Include(x => x.Copies)
            .Include(x => x.BookAuthors).ThenInclude(x => x.Author)
            .Include(x => x.BookCategories).ThenInclude(x => x.Category)
            .Where(x => x.Status == BookStatus.Active)
            .ToListAsync(cancellationToken);

        return books
            .Select(book => new
            {
                Book = book,
                Score = ScoreBook(book, topicTerms, normalized, analysis)
            })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Book.Copies.Count(copy => copy.Status == BookCopyStatus.Available) > 0)
            .ThenByDescending(x => x.Score)
            .Select(x => x.Book)
            .ToList();
    }

    private static int ScoreBook(Book book, IReadOnlyList<string> terms, string normalizedMessage, NeedAnalysis analysis)
    {
        var searchable = string.Join(" ", new[]
        {
            book.Title,
            book.Description,
            book.Summary,
            book.TargetAudience,
            book.DifficultyLevel,
            book.ReadingTimeLevel,
            string.Join(" ", book.BookAuthors.Select(x => x.Author.FullName)),
            string.Join(" ", book.BookCategories.Select(x => x.Category.Name))
        }.Where(x => !string.IsNullOrWhiteSpace(x))).ToLowerInvariant();

        var score = terms.Count(term => searchable.Contains(term, StringComparison.OrdinalIgnoreCase)) * 10;

        if (normalizedMessage.Split(' ', StringSplitOptions.RemoveEmptyEntries).Any(word => word.Length > 3 && searchable.Contains(word)))
        {
            score += 4;
        }

        if (analysis.Difficulty is not null && string.Equals(book.DifficultyLevel, analysis.Difficulty, StringComparison.OrdinalIgnoreCase))
        {
            score += 3;
        }

        if (analysis.PreferredLength is not null && string.Equals(book.ReadingTimeLevel, analysis.PreferredLength, StringComparison.OrdinalIgnoreCase))
        {
            score += 3;
        }

        if (book.Copies.Any(copy => copy.Status == BookCopyStatus.Available))
        {
            score += 2;
        }

        return score;
    }

    private static RecommendedBookDto MapRecommendation(Book book, NeedAnalysis analysis, int index)
    {
        var available = book.Copies.Count(copy => copy.Status == BookCopyStatus.Available);
        var score = Math.Max(0.72m, 0.94m - index * 0.06m);
        var category = book.BookCategories.FirstOrDefault()?.Category.Name ?? "chủ đề bạn quan tâm";
        var reason = available > 0
            ? $"Phù hợp vì sách thuộc nhóm {category}, {book.DifficultyLevel?.ToLowerInvariant() ?? "dễ tiếp cận"} và còn {available} bản có thể mượn."
            : $"Phù hợp về nội dung {category}, nhưng hiện chưa có bản khả dụng nên nên đặt trước.";

        if (analysis.Topics.Count > 0)
        {
            reason = $"Khớp nhu cầu {string.Join(", ", analysis.Topics)}. {reason}";
        }

        return new RecommendedBookDto(
            book.Id,
            book.Title,
            reason,
            score,
            available > 0 ? "available" : "unavailable");
    }

    private async Task<string?> TryCreateOpenAiReplyAsync(
        string message,
        NeedAnalysis analysis,
        IReadOnlyList<RecommendedBookDto> recommendations,
        CancellationToken cancellationToken)
    {
        var settings = await aiSettingsStore.GetEffectiveAsync(cancellationToken);
        if (!settings.HasApiKey || string.IsNullOrWhiteSpace(settings.ApiKey))
        {
            return null;
        }

        var promptData = new
        {
            userMessage = message,
            analysis.NeedSummary,
            analysis.Topics,
            analysis.Difficulty,
            analysis.PreferredLength,
            recommendations = recommendations.Select(item => new
            {
                item.BookId,
                item.Title,
                item.Reason,
                item.Availability,
                item.Score
            })
        };

        var payload = new
        {
            model = settings.Model,
            input = new object[]
            {
                new
                {
                    role = "developer",
                    content = "Bạn là Libbuddy AI trong một website thư viện. Chỉ gợi ý các sách được cung cấp trong JSON. Trả lời bằng tiếng Việt, thân thiện, ngắn gọn, không bịa thêm sách ngoài danh sách."
                },
                new
                {
                    role = "user",
                    content = $"Dữ liệu kho sách và nhu cầu đọc:\n{JsonSerializer.Serialize(promptData, JsonOptions)}\n\nHãy trả lời 2-4 câu, nêu lý do chọn sách và nhắc khách có thể mở chi tiết/checkout trong Libbuddy."
                }
            },
            temperature = 0.35,
            max_output_tokens = 420
        };

        try
        {
            var http = httpClientFactory.CreateClient();
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/responses");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.ApiKey);
            request.Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");

            using var response = await http.SendAsync(request, cancellationToken);
            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("OpenAI response failed with status {StatusCode}: {Body}", response.StatusCode, json);
                return null;
            }

            return ExtractOpenAiText(json);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            logger.LogWarning(ex, "OpenAI response could not be used. Falling back to internal recommendations.");
            return null;
        }
    }

    private static string? ExtractOpenAiText(string json)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        if (root.TryGetProperty("output_text", out var outputText) && outputText.ValueKind == JsonValueKind.String)
        {
            return CleanText(outputText.GetString());
        }

        if (!root.TryGetProperty("output", out var output) || output.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var item in output.EnumerateArray())
        {
            if (!item.TryGetProperty("content", out var content) || content.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            foreach (var contentItem in content.EnumerateArray())
            {
                if (contentItem.TryGetProperty("text", out var text) && text.ValueKind == JsonValueKind.String)
                {
                    var cleaned = CleanText(text.GetString());
                    if (!string.IsNullOrWhiteSpace(cleaned))
                    {
                        return cleaned;
                    }
                }
            }
        }

        return null;
    }

    private static string? CleanText(string? value)
    {
        var cleaned = value?.Trim();
        return string.IsNullOrWhiteSpace(cleaned) ? null : cleaned;
    }

    private void AddNeedAnalytics(Guid? userId, Guid conversationId, NeedAnalysis analysis)
    {
        db.NeedAnalytics.Add(new NeedAnalytics
        {
            UserId = userId,
            ConversationId = conversationId,
            Purpose = analysis.Purpose,
            Topics = string.Join(",", analysis.Topics),
            Difficulty = analysis.Difficulty,
            PreferredLength = analysis.PreferredLength,
            Language = analysis.Language,
            NeedSummary = analysis.NeedSummary
        });
    }

    private static string ToApiStatus(NeedStatus status) => status switch
    {
        NeedStatus.NeedMoreInformation => "need_more_information",
        NeedStatus.EnoughInformation => "enough_information",
        NeedStatus.NoMatchingBooks => "no_matching_books",
        NeedStatus.OutOfScope => "out_of_scope",
        _ => "need_more_information"
    };
}
