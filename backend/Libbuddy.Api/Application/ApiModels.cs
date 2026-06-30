using Libbuddy.Api.Domain;

namespace Libbuddy.Api.Application;

public record ApiResponse<T>(bool Success, string Message, T? Data)
{
    public static ApiResponse<T> Ok(T data, string message = "OK") => new(true, message, data);
    public static ApiResponse<T> Fail(string message) => new(false, message, default);
}

public static class ApiResponse
{
    public static ApiResponse<T> Ok<T>(T data, string message = "OK") => ApiResponse<T>.Ok(data, message);
    public static ApiResponse<object> Fail(string message) => ApiResponse<object>.Fail(message);
}

public record PaginatedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalItems)
{
    public int TotalPages => (int)Math.Ceiling(TotalItems / (double)PageSize);
}

public record RegisterRequest(string FullName, string Email, string Password, string? Phone);
public record LoginRequest(string Email, string Password);
public record CurrentUserDto(Guid Id, string FullName, string Email, IReadOnlyList<string> Roles);
public record AuthResponse(string AccessToken, CurrentUserDto User);

public record BookListItemDto(
    Guid Id,
    string Title,
    IReadOnlyList<string> Authors,
    IReadOnlyList<string> Categories,
    string? CoverImageUrl,
    string? Description,
    string? DifficultyLevel,
    string? ReadingTimeLevel,
    string? TargetAudience,
    string Status,
    int TotalCopies,
    int AvailableCopies,
    string? ShelfLocation);

public record BookDetailDto(
    Guid Id,
    string Title,
    string? Subtitle,
    string? Isbn,
    string? Description,
    string? Summary,
    string Language,
    int? PublishedYear,
    string? Publisher,
    IReadOnlyList<string> Authors,
    IReadOnlyList<string> Categories,
    string? DifficultyLevel,
    string? ReadingTimeLevel,
    string? TargetAudience,
    string? CoverImageUrl,
    string Status,
    IReadOnlyList<BookCopyDto> Copies);

public record BookCopyDto(
    Guid Id,
    Guid BookId,
    string BookTitle,
    string CopyCode,
    string? Barcode,
    string Status,
    string Condition,
    string? ShelfLocation);

public record UpsertBookRequest(
    string Title,
    string? Subtitle,
    string? Isbn,
    string? Description,
    string? Summary,
    string? Language,
    int? PublishedYear,
    string? PublisherName,
    IReadOnlyList<string> AuthorNames,
    IReadOnlyList<string> CategoryNames,
    string? DifficultyLevel,
    string? ReadingTimeLevel,
    string? TargetAudience,
    string? CoverImageUrl);

public record AddBookCopiesRequest(int Quantity, Guid? ShelfLocationId, string? Condition);

public record ReaderDto(Guid Id, string FullName, string Email, string? Phone, string Status, int ActiveBorrows);

public record CreateBorrowRecordRequest(Guid UserId, IReadOnlyList<Guid> BookCopyIds, DateTime DueDate, string? Note);
public record ReturnBorrowRecordRequest(IReadOnlyList<ReturnBookCopyRequest> Items);
public record ReturnBookCopyRequest(Guid BookCopyId, string Condition, string? Note);

public record BorrowRecordDto(
    Guid Id,
    Guid UserId,
    string ReaderName,
    DateTime BorrowDate,
    DateTime DueDate,
    DateTime? ReturnDate,
    string Status,
    bool IsOverdue,
    IReadOnlyList<BorrowRecordItemDto> Items);

public record BorrowRecordItemDto(
    Guid Id,
    Guid BookCopyId,
    string CopyCode,
    string BookTitle,
    string? ReturnCondition,
    DateTime? ReturnDate,
    decimal FineAmount);

public record CreateCheckoutOrderRequest(
    Guid BookId,
    string Type,
    string FulfillmentMethod,
    string? DeliveryAddress,
    string? Note);

public record UpdateCheckoutOrderStatusRequest(string Status, string? PaymentStatus);

public record CheckoutOrderDto(
    Guid Id,
    string OrderCode,
    Guid UserId,
    string ReaderName,
    string Type,
    string FulfillmentMethod,
    string Status,
    string PaymentStatus,
    decimal RentalFee,
    decimal DepositAmount,
    decimal PurchaseAmount,
    decimal DeliveryFee,
    decimal TotalAmount,
    string Currency,
    string? DeliveryAddress,
    Guid? BorrowRecordId,
    DateTime CreatedAt,
    IReadOnlyList<CheckoutOrderItemDto> Items);

public record CheckoutOrderItemDto(
    Guid Id,
    Guid BookId,
    string BookTitle,
    Guid? BookCopyId,
    string? CopyCode,
    int Quantity,
    decimal UnitPrice,
    decimal LineTotal);

public record AiChatRequest(Guid? ConversationId, Guid? UserId, string Message);

public record AiChatResponse(
    Guid ConversationId,
    string NeedSummary,
    string NeedStatus,
    string Reply,
    string? FollowUpQuestion,
    IReadOnlyList<RecommendedBookDto> RecommendedBooks);

public record RecommendedBookDto(Guid BookId, string Title, string Reason, decimal Score, string Availability);

public record AiProviderSettingsDto(
    bool HasApiKey,
    string? KeyPreview,
    string Model,
    string Source,
    DateTime? UpdatedAt);

public record UpdateAiProviderSettingsRequest(string? ApiKey, string? Model, bool ClearApiKey);

public record AIConversationDto(Guid Id, string Title, DateTime CreatedAt, DateTime? UpdatedAt);
public record AIMessageDto(Guid Id, string Sender, string Message, DateTime CreatedAt);
public record AIConversationDetailDto(Guid Id, string Title, IReadOnlyList<AIMessageDto> Messages, IReadOnlyList<RecommendedBookDto> Recommendations);

public record DashboardReportDto(
    int TotalBooks,
    int TotalCopies,
    int AvailableCopies,
    int BorrowedCopies,
    int OverdueRecords,
    int TotalReaders,
    int AiConversations,
    IReadOnlyList<TopBookDto> TopBorrowedBooks,
    IReadOnlyList<CategoryReportDto> PopularCategories,
    IReadOnlyList<AiNeedDto> PopularNeeds);

public record TopBookDto(string Title, int Count);
public record CategoryReportDto(string Name, int Count);
public record AiNeedDto(string Topic, int Count);

public record NeedAnalysis(
    NeedStatus Status,
    string NeedSummary,
    IReadOnlyList<string> Topics,
    string? Difficulty,
    string? PreferredLength,
    string? FollowUpQuestion,
    string Purpose = "reading_advice",
    string Language = "vietnamese");
