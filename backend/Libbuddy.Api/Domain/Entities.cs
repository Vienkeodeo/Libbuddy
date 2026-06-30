namespace Libbuddy.Api.Domain;

public enum UserStatus
{
    Active,
    Locked,
    Inactive,
    Deleted
}

public enum BookStatus
{
    Active,
    Inactive,
    Deleted
}

public enum BookCopyStatus
{
    Available,
    Borrowed,
    Reserved,
    Lost,
    Damaged,
    Maintenance,
    Inactive
}

public enum CopyCondition
{
    New,
    Good,
    Old,
    Damaged,
    Lost
}

public enum BorrowStatus
{
    Pending,
    Borrowing,
    Returned,
    Overdue,
    Cancelled,
    Lost
}

public enum AiSender
{
    User,
    Assistant,
    System,
    Tool
}

public enum NeedStatus
{
    NeedMoreInformation,
    EnoughInformation,
    NoMatchingBooks,
    OutOfScope
}

public enum LibraryOrderType
{
    Rent,
    Purchase
}

public enum FulfillmentMethod
{
    Pickup,
    Delivery
}

public enum LibraryOrderStatus
{
    PendingPayment,
    Confirmed,
    ReadyForPickup,
    InProgress,
    Completed,
    Cancelled
}

public enum PaymentStatus
{
    Pending,
    Paid,
    Refunded,
    Failed
}

public class Role
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public UserStatus Status { get; set; } = UserStatus.Active;
    public DateOnly? DateOfBirth { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<BorrowRecord> BorrowRecords { get; set; } = new List<BorrowRecord>();
    public ICollection<AIConversation> AIConversations { get; set; } = new List<AIConversation>();
}

public class UserRole
{
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;
    public Guid RoleId { get; set; }
    public Role Role { get; set; } = default!;
}

public class Publisher
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Book> Books { get; set; } = new List<Book>();
}

public class Author
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<BookAuthor> BookAuthors { get; set; } = new List<BookAuthor>();
}

public class Category
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ParentCategoryId { get; set; }
    public Category? ParentCategory { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<BookCategory> BookCategories { get; set; } = new List<BookCategory>();
}

public class Book
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string? Isbn { get; set; }
    public string? Description { get; set; }
    public string? Summary { get; set; }
    public string Language { get; set; } = "Vietnamese";
    public int? PublishedYear { get; set; }
    public Guid? PublisherId { get; set; }
    public Publisher? Publisher { get; set; }
    public string? DifficultyLevel { get; set; }
    public string? ReadingTimeLevel { get; set; }
    public string? TargetAudience { get; set; }
    public string? CoverImageUrl { get; set; }
    public BookStatus Status { get; set; } = BookStatus.Active;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<BookAuthor> BookAuthors { get; set; } = new List<BookAuthor>();
    public ICollection<BookCategory> BookCategories { get; set; } = new List<BookCategory>();
    public ICollection<BookCopy> Copies { get; set; } = new List<BookCopy>();
    public ICollection<AIRecommendation> AIRecommendations { get; set; } = new List<AIRecommendation>();
}

public class BookAuthor
{
    public Guid BookId { get; set; }
    public Book Book { get; set; } = default!;
    public Guid AuthorId { get; set; }
    public Author Author { get; set; } = default!;
}

public class BookCategory
{
    public Guid BookId { get; set; }
    public Book Book { get; set; } = default!;
    public Guid CategoryId { get; set; }
    public Category Category { get; set; } = default!;
}

public class ShelfLocation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? Area { get; set; }
    public string? Floor { get; set; }
    public string ShelfCode { get; set; } = string.Empty;
    public string? SectionCode { get; set; }
    public string? Description { get; set; }
    public ICollection<BookCopy> Copies { get; set; } = new List<BookCopy>();
}

public class BookCopy
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BookId { get; set; }
    public Book Book { get; set; } = default!;
    public string CopyCode { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public Guid? ShelfLocationId { get; set; }
    public ShelfLocation? ShelfLocation { get; set; }
    public BookCopyStatus Status { get; set; } = BookCopyStatus.Available;
    public CopyCondition Condition { get; set; } = CopyCondition.Good;
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<BorrowRecordItem> BorrowItems { get; set; } = new List<BorrowRecordItem>();
}

public class BorrowRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;
    public DateTime BorrowDate { get; set; } = DateTime.UtcNow;
    public DateTime DueDate { get; set; }
    public DateTime? ReturnDate { get; set; }
    public BorrowStatus Status { get; set; } = BorrowStatus.Borrowing;
    public Guid? CreatedBy { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<BorrowRecordItem> Items { get; set; } = new List<BorrowRecordItem>();
}

public class BorrowRecordItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BorrowRecordId { get; set; }
    public BorrowRecord BorrowRecord { get; set; } = default!;
    public Guid BookCopyId { get; set; }
    public BookCopy BookCopy { get; set; } = default!;
    public DateTime? ReturnDate { get; set; }
    public CopyCondition? ReturnCondition { get; set; }
    public decimal FineAmount { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class LibraryOrder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderCode { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;
    public LibraryOrderType Type { get; set; }
    public FulfillmentMethod FulfillmentMethod { get; set; }
    public LibraryOrderStatus Status { get; set; } = LibraryOrderStatus.Confirmed;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Paid;
    public decimal RentalFee { get; set; }
    public decimal DepositAmount { get; set; }
    public decimal PurchaseAmount { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "VND";
    public string? DeliveryAddress { get; set; }
    public Guid? BorrowRecordId { get; set; }
    public BorrowRecord? BorrowRecord { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<LibraryOrderItem> Items { get; set; } = new List<LibraryOrderItem>();
}

public class LibraryOrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LibraryOrderId { get; set; }
    public LibraryOrder LibraryOrder { get; set; } = default!;
    public Guid BookId { get; set; }
    public Book Book { get; set; } = default!;
    public Guid? BookCopyId { get; set; }
    public BookCopy? BookCopy { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class AIConversation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public string? Title { get; set; }
    public string Status { get; set; } = "Active";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<AIMessage> Messages { get; set; } = new List<AIMessage>();
    public ICollection<AIRecommendation> Recommendations { get; set; } = new List<AIRecommendation>();
}

public class AIMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ConversationId { get; set; }
    public AIConversation Conversation { get; set; } = default!;
    public AiSender Sender { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Intent { get; set; }
    public string? MetadataJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class AIRecommendation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? ConversationId { get; set; }
    public AIConversation? Conversation { get; set; }
    public Guid? UserId { get; set; }
    public Guid BookId { get; set; }
    public Book Book { get; set; } = default!;
    public decimal Score { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? NeedSummary { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class BookEmbedding
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BookId { get; set; }
    public Book Book { get; set; } = default!;
    public string SourceText { get; set; } = string.Empty;
    public float[]? Embedding { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class NeedAnalytics
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }
    public Guid? ConversationId { get; set; }
    public string? Purpose { get; set; }
    public string Topics { get; set; } = string.Empty;
    public string? Difficulty { get; set; }
    public string? PreferredLength { get; set; }
    public string Language { get; set; } = "vietnamese";
    public string? NeedSummary { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
