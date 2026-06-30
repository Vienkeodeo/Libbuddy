using Libbuddy.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Libbuddy.Api.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Publisher> Publishers => Set<Publisher>();
    public DbSet<Author> Authors => Set<Author>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<BookAuthor> BookAuthors => Set<BookAuthor>();
    public DbSet<BookCategory> BookCategories => Set<BookCategory>();
    public DbSet<BookCopy> BookCopies => Set<BookCopy>();
    public DbSet<ShelfLocation> ShelfLocations => Set<ShelfLocation>();
    public DbSet<BorrowRecord> BorrowRecords => Set<BorrowRecord>();
    public DbSet<BorrowRecordItem> BorrowRecordItems => Set<BorrowRecordItem>();
    public DbSet<LibraryOrder> LibraryOrders => Set<LibraryOrder>();
    public DbSet<LibraryOrderItem> LibraryOrderItems => Set<LibraryOrderItem>();
    public DbSet<AIConversation> AIConversations => Set<AIConversation>();
    public DbSet<AIMessage> AIMessages => Set<AIMessage>();
    public DbSet<AIRecommendation> AIRecommendations => Set<AIRecommendation>();
    public DbSet<BookEmbedding> BookEmbeddings => Set<BookEmbedding>();
    public DbSet<NeedAnalytics> NeedAnalytics => Set<NeedAnalytics>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<UserRole>().HasKey(x => new { x.UserId, x.RoleId });
        modelBuilder.Entity<BookAuthor>().HasKey(x => new { x.BookId, x.AuthorId });
        modelBuilder.Entity<BookCategory>().HasKey(x => new { x.BookId, x.CategoryId });

        modelBuilder.Entity<User>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<Role>().HasIndex(x => x.Name).IsUnique();
        modelBuilder.Entity<Book>().HasIndex(x => x.Isbn).IsUnique();
        modelBuilder.Entity<BookCopy>().HasIndex(x => x.CopyCode).IsUnique();
        modelBuilder.Entity<BookCopy>().HasIndex(x => x.Barcode).IsUnique();
        modelBuilder.Entity<LibraryOrder>().HasIndex(x => x.OrderCode).IsUnique();
        modelBuilder.Entity<Category>().HasIndex(x => x.Name).IsUnique();
        modelBuilder.Entity<Author>().HasIndex(x => x.FullName);

        modelBuilder.Entity<User>().Property(x => x.FullName).HasMaxLength(255);
        modelBuilder.Entity<User>().Property(x => x.Email).HasMaxLength(255);
        modelBuilder.Entity<User>().Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        modelBuilder.Entity<Role>().Property(x => x.Name).HasMaxLength(50);
        modelBuilder.Entity<Book>().Property(x => x.Title).HasMaxLength(500);
        modelBuilder.Entity<Book>().Property(x => x.Subtitle).HasMaxLength(500);
        modelBuilder.Entity<Book>().Property(x => x.Isbn).HasMaxLength(50);
        modelBuilder.Entity<Book>().Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        modelBuilder.Entity<BookCopy>().Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        modelBuilder.Entity<BookCopy>().Property(x => x.Condition).HasConversion<string>().HasMaxLength(30);
        modelBuilder.Entity<BorrowRecord>().Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        modelBuilder.Entity<BorrowRecordItem>().Property(x => x.ReturnCondition).HasConversion<string>().HasMaxLength(30);
        modelBuilder.Entity<BorrowRecordItem>().Property(x => x.FineAmount).HasPrecision(12, 2);
        modelBuilder.Entity<LibraryOrder>().Property(x => x.Type).HasConversion<string>().HasMaxLength(30);
        modelBuilder.Entity<LibraryOrder>().Property(x => x.FulfillmentMethod).HasConversion<string>().HasMaxLength(30);
        modelBuilder.Entity<LibraryOrder>().Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        modelBuilder.Entity<LibraryOrder>().Property(x => x.PaymentStatus).HasConversion<string>().HasMaxLength(30);
        modelBuilder.Entity<LibraryOrder>().Property(x => x.RentalFee).HasPrecision(12, 2);
        modelBuilder.Entity<LibraryOrder>().Property(x => x.DepositAmount).HasPrecision(12, 2);
        modelBuilder.Entity<LibraryOrder>().Property(x => x.PurchaseAmount).HasPrecision(12, 2);
        modelBuilder.Entity<LibraryOrder>().Property(x => x.DeliveryFee).HasPrecision(12, 2);
        modelBuilder.Entity<LibraryOrder>().Property(x => x.TotalAmount).HasPrecision(12, 2);
        modelBuilder.Entity<LibraryOrderItem>().Property(x => x.UnitPrice).HasPrecision(12, 2);
        modelBuilder.Entity<LibraryOrderItem>().Property(x => x.LineTotal).HasPrecision(12, 2);
        modelBuilder.Entity<AIMessage>().Property(x => x.Sender).HasConversion<string>().HasMaxLength(30);
        modelBuilder.Entity<AIRecommendation>().Property(x => x.Score).HasPrecision(5, 4);

        modelBuilder.Entity<UserRole>()
            .HasOne(x => x.User)
            .WithMany(x => x.UserRoles)
            .HasForeignKey(x => x.UserId);

        modelBuilder.Entity<UserRole>()
            .HasOne(x => x.Role)
            .WithMany(x => x.UserRoles)
            .HasForeignKey(x => x.RoleId);

        modelBuilder.Entity<BookAuthor>()
            .HasOne(x => x.Book)
            .WithMany(x => x.BookAuthors)
            .HasForeignKey(x => x.BookId);

        modelBuilder.Entity<BookAuthor>()
            .HasOne(x => x.Author)
            .WithMany(x => x.BookAuthors)
            .HasForeignKey(x => x.AuthorId);

        modelBuilder.Entity<BookCategory>()
            .HasOne(x => x.Book)
            .WithMany(x => x.BookCategories)
            .HasForeignKey(x => x.BookId);

        modelBuilder.Entity<BookCategory>()
            .HasOne(x => x.Category)
            .WithMany(x => x.BookCategories)
            .HasForeignKey(x => x.CategoryId);

        modelBuilder.Entity<LibraryOrder>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId);

        modelBuilder.Entity<LibraryOrder>()
            .HasOne(x => x.BorrowRecord)
            .WithMany()
            .HasForeignKey(x => x.BorrowRecordId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<LibraryOrderItem>()
            .HasOne(x => x.LibraryOrder)
            .WithMany(x => x.Items)
            .HasForeignKey(x => x.LibraryOrderId);

        modelBuilder.Entity<LibraryOrderItem>()
            .HasOne(x => x.Book)
            .WithMany()
            .HasForeignKey(x => x.BookId);

        modelBuilder.Entity<LibraryOrderItem>()
            .HasOne(x => x.BookCopy)
            .WithMany()
            .HasForeignKey(x => x.BookCopyId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
