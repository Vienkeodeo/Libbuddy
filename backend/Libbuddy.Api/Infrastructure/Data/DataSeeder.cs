using Libbuddy.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Libbuddy.Api.Infrastructure.Data;

public class DataSeeder(AppDbContext db, Libbuddy.Api.Application.IBookCoverService? coverService = null)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        await SeedRolesAndUsers(cancellationToken);
        await SeedCatalog(cancellationToken);
        await SeedBorrowAndAiHistory(cancellationToken);
    }

    private async Task SeedRolesAndUsers(CancellationToken cancellationToken)
    {
        var roleDefinitions = new[]
        {
            ("Admin", "Quản trị hệ thống"),
            ("Manager", "Quản lý thư viện"),
            ("Librarian", "Thủ thư"),
            ("Reader", "Độc giả")
        };

        foreach (var (name, description) in roleDefinitions)
        {
            if (!await db.Roles.AnyAsync(x => x.Name == name, cancellationToken))
            {
                db.Roles.Add(new Role { Name = name, Description = description });
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        await EnsureUser(
            fullName: "Nguyễn Thị Lan",
            email: "admin@libbuddy.local",
            password: "Admin@123456",
            phone: "0900000001",
            roles: ["Admin", "Manager"]);

        await EnsureUser(
            fullName: "Trần Minh Anh",
            email: "librarian@libbuddy.local",
            password: "Librarian@123456",
            phone: "0900000002",
            roles: ["Librarian"]);

        await EnsureUser(
            fullName: "Lê Hoàng Nam",
            email: "reader@libbuddy.local",
            password: "Reader@123456",
            phone: "0900000003",
            roles: ["Reader"]);

        async Task EnsureUser(string fullName, string email, string password, string phone, IReadOnlyList<string> roles)
        {
            var user = await db.Users
                .Include(x => x.UserRoles)
                .FirstOrDefaultAsync(x => x.Email == email, cancellationToken);

            if (user is null)
            {
                user = new User
                {
                    FullName = fullName,
                    Email = email,
                    Phone = phone,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                    Status = UserStatus.Active
                };

                db.Users.Add(user);
                await db.SaveChangesAsync(cancellationToken);
            }

            var roleEntities = await db.Roles
                .Where(x => roles.Contains(x.Name))
                .ToListAsync(cancellationToken);

            foreach (var role in roleEntities)
            {
                if (user.UserRoles.All(x => x.RoleId != role.Id))
                {
                    user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
                }
            }

            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task SeedCatalog(CancellationToken cancellationToken)
    {
        var categories = new[]
        {
            "Kỹ năng sống",
            "Giao tiếp",
            "Kinh doanh",
            "Tài chính cá nhân",
            "Tâm lý",
            "Phát triển bản thân",
            "Văn học",
            "Công nghệ",
            "Lịch sử"
        };

        foreach (var name in categories)
        {
            if (!await db.Categories.AnyAsync(x => x.Name == name, cancellationToken))
            {
                db.Categories.Add(new Category { Name = name });
            }
        }

        var shelfDefinitions = new[]
        {
            ("Tầng 1", "Kệ A", "03", "Sách kỹ năng và giao tiếp"),
            ("Tầng 1", "Kệ B", "02", "Văn học và sách dễ đọc"),
            ("Tầng 2", "Kệ C", "01", "Kinh doanh, công nghệ và lịch sử"),
            ("Tầng 2", "Kệ D", "04", "Tâm lý và phát triển bản thân")
        };

        foreach (var (floor, shelf, section, description) in shelfDefinitions)
        {
            if (!await db.ShelfLocations.AnyAsync(x => x.Floor == floor && x.ShelfCode == shelf && x.SectionCode == section, cancellationToken))
            {
                db.ShelfLocations.Add(new ShelfLocation
                {
                    Floor = floor,
                    ShelfCode = shelf,
                    SectionCode = section,
                    Description = description
                });
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        if (await db.Books.AnyAsync(cancellationToken))
        {
            return;
        }

        var books = new[]
        {
            new SeedBook(
                "Đắc Nhân Tâm",
                "Dale Carnegie",
                "Kỹ năng sống|Giao tiếp",
                "First News",
                2016,
                "Easy",
                "Medium",
                "Sách kinh điển về ứng xử, tạo thiện cảm và xây dựng quan hệ tích cực trong công việc lẫn đời sống.",
                "Người mới đi làm, sinh viên, nhân viên bán hàng",
                7,
                "Tầng 1 - Kệ A - Ngăn 03"),
            new SeedBook(
                "Nhà Giả Kim",
                "Paulo Coelho",
                "Văn học|Phát triển bản thân",
                "Nhã Nam",
                2020,
                "Easy",
                "Short",
                "Một câu chuyện nhẹ nhàng về hành trình theo đuổi ước mơ và lắng nghe tiếng nói bên trong.",
                "Người muốn đọc nhẹ nhàng, tìm cảm hứng",
                5,
                "Tầng 1 - Kệ B - Ngăn 02"),
            new SeedBook(
                "Atomic Habits",
                "James Clear",
                "Phát triển bản thân|Kỹ năng sống",
                "Penguin",
                2018,
                "Easy",
                "Medium",
                "Hướng dẫn xây dựng thói quen nhỏ, giảm trì hoãn và tạo hệ thống tiến bộ mỗi ngày.",
                "Người muốn kỷ luật cá nhân, sinh viên, người đi làm",
                6,
                "Tầng 1 - Kệ A - Ngăn 03"),
            new SeedBook(
                "Think Again",
                "Adam Grant",
                "Kinh doanh|Phát triển bản thân",
                "Viking",
                2021,
                "Medium",
                "Medium",
                "Khuyến khích tư duy lại, học cách nghi ngờ giả định cũ và ra quyết định linh hoạt hơn.",
                "Quản lý, nhân sự, người làm tri thức",
                4,
                "Tầng 2 - Kệ C - Ngăn 01"),
            new SeedBook(
                "Sapiens: Lược Sử Loài Người",
                "Yuval Noah Harari",
                "Lịch sử|Khoa học xã hội",
                "Harper",
                2019,
                "Hard",
                "Long",
                "Góc nhìn rộng về lịch sử loài người, nhận thức, xã hội, kinh tế và công nghệ.",
                "Độc giả thích lịch sử, tư duy hệ thống",
                4,
                "Tầng 2 - Kệ C - Ngăn 01"),
            new SeedBook(
                "14 Nguyên Tắc Quản Lý Thời Gian Cho Sinh Viên",
                "Kevin Kruse",
                "Kỹ năng sống|Phát triển bản thân",
                "Alpha Books",
                2022,
                "Easy",
                "Short",
                "Các nguyên tắc thực tế giúp sinh viên sắp xếp việc học, giảm trì hoãn và ưu tiên đúng việc.",
                "Sinh viên, người mới bắt đầu quản lý thời gian",
                3,
                "Tầng 1 - Kệ A - Ngăn 03"),
            new SeedBook(
                "Làm Ít Được Nhiều",
                "Greg McKeown",
                "Kỹ năng sống|Kinh doanh",
                "Portfolio",
                2021,
                "Medium",
                "Medium",
                "Tư duy thiết yếu giúp chọn việc quan trọng, bỏ bớt nhiễu và làm việc có trọng tâm.",
                "Người bận rộn, quản lý, sinh viên cuối khóa",
                2,
                "Tầng 2 - Kệ C - Ngăn 01"),
            new SeedBook(
                "Quản Lý Thời Gian Hiệu Quả",
                "Brian Tracy",
                "Kỹ năng sống|Phát triển bản thân",
                "Tổng hợp TP.HCM",
                2018,
                "Easy",
                "Short",
                "Các phương pháp lập kế hoạch, ưu tiên nhiệm vụ và kiểm soát thời gian hàng ngày.",
                "Người mới đi làm, sinh viên, nhân viên văn phòng",
                4,
                "Tầng 1 - Kệ A - Ngăn 03"),
            new SeedBook(
                "Tâm Lý Học Về Tiền",
                "Morgan Housel",
                "Tài chính cá nhân|Tâm lý",
                "Harriman House",
                2020,
                "Easy",
                "Medium",
                "Giải thích hành vi tài chính cá nhân qua những câu chuyện dễ hiểu về tiền bạc, rủi ro và thói quen.",
                "Người muốn quản lý tiền, sinh viên, người mới đi làm",
                6,
                "Tầng 2 - Kệ D - Ngăn 04"),
            new SeedBook(
                "Dám Bị Ghét",
                "Ichiro Kishimi, Fumitake Koga",
                "Tâm lý|Phát triển bản thân",
                "Nhã Nam",
                2019,
                "Medium",
                "Medium",
                "Đối thoại triết học giúp người đọc giảm phụ thuộc vào đánh giá bên ngoài và sống tự chủ hơn.",
                "Người hay overthinking, cần cân bằng cảm xúc",
                5,
                "Tầng 2 - Kệ D - Ngăn 04")
        };

        var copyCounter = 1;
        foreach (var seed in books)
        {
            var publisher = await EnsurePublisher(seed.Publisher, cancellationToken);
            var book = new Book
            {
                Title = seed.Title,
                Description = seed.Description,
                Summary = seed.Description,
                Language = "Vietnamese",
                PublishedYear = seed.PublishedYear,
                PublisherId = publisher.Id,
                DifficultyLevel = seed.Difficulty,
                ReadingTimeLevel = seed.ReadingTime,
                TargetAudience = seed.TargetAudience,
                Status = BookStatus.Active,
                Isbn = $"LIB-{copyCounter:000000}"
            };

            db.Books.Add(book);

            foreach (var authorName in seed.Authors.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
            {
                var author = await EnsureAuthor(authorName, cancellationToken);
                book.BookAuthors.Add(new BookAuthor { Book = book, Author = author });
            }

            foreach (var categoryName in seed.Categories.Split('|', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
            {
                var category = await EnsureCategory(categoryName, cancellationToken);
                book.BookCategories.Add(new BookCategory { Book = book, Category = category });
            }

            var shelf = await db.ShelfLocations.FirstAsync(cancellationToken);
            if (seed.Shelf.Contains("Kệ B", StringComparison.OrdinalIgnoreCase))
            {
                shelf = await db.ShelfLocations.FirstAsync(x => x.ShelfCode == "Kệ B", cancellationToken);
            }
            else if (seed.Shelf.Contains("Kệ C", StringComparison.OrdinalIgnoreCase))
            {
                shelf = await db.ShelfLocations.FirstAsync(x => x.ShelfCode == "Kệ C", cancellationToken);
            }
            else if (seed.Shelf.Contains("Kệ D", StringComparison.OrdinalIgnoreCase))
            {
                shelf = await db.ShelfLocations.FirstAsync(x => x.ShelfCode == "Kệ D", cancellationToken);
            }

            for (var i = 0; i < seed.Copies; i++)
            {
                db.BookCopies.Add(new BookCopy
                {
                    BookId = book.Id,
                    CopyCode = $"LIB-{copyCounter:000000}",
                    Barcode = $"893LIB{copyCounter:000000}",
                    ShelfLocationId = shelf.Id,
                    Status = BookCopyStatus.Available,
                    Condition = i == 0 ? CopyCondition.New : CopyCondition.Good
                });
                copyCounter++;
            }

            db.BookEmbeddings.Add(new BookEmbedding
            {
                Book = book,
                SourceText = $"{seed.Title}. {seed.Categories}. {seed.Description}. {seed.TargetAudience}"
            });
        }

        await db.SaveChangesAsync(cancellationToken);

        // Attempt to fetch covers from Open Library after all books are seeded
        if (coverService is not null)
        {
            foreach (var book in db.Books.Local.Where(x => x.Status == BookStatus.Active && string.IsNullOrEmpty(x.CoverImageUrl)).ToList())
            {
                try
                {
                    var url = await coverService.FetchCoverUrlAsync(book.Id, book.Isbn, book.Title, cancellationToken);
                    if (!string.IsNullOrEmpty(url))
                    {
                        book.CoverImageUrl = url;
                    }
                    await Task.Delay(300, cancellationToken);
                }
                catch
                {
                    // Cover fetch is best-effort; never fail seeding
                }
            }
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task SeedBorrowAndAiHistory(CancellationToken cancellationToken)
    {
        if (await db.BorrowRecords.AnyAsync(cancellationToken))
        {
            return;
        }

        var reader = await db.Users.FirstAsync(x => x.Email == "reader@libbuddy.local", cancellationToken);
        var librarian = await db.Users.FirstAsync(x => x.Email == "librarian@libbuddy.local", cancellationToken);
        var copies = await db.BookCopies
            .Include(x => x.Book)
            .Where(x => x.Status == BookCopyStatus.Available)
            .Take(5)
            .ToListAsync(cancellationToken);

        var record = new BorrowRecord
        {
            UserId = reader.Id,
            CreatedBy = librarian.Id,
            BorrowDate = DateTime.UtcNow.AddDays(-9),
            DueDate = DateTime.UtcNow.AddDays(5),
            Status = BorrowStatus.Borrowing,
            Note = "Phiếu mượn ban đầu"
        };

        foreach (var copy in copies.Take(2))
        {
            copy.Status = BookCopyStatus.Borrowed;
            record.Items.Add(new BorrowRecordItem { BookCopyId = copy.Id });
        }

        db.BorrowRecords.Add(record);

        var conversation = new AIConversation
        {
            UserId = reader.Id,
            Title = "Quản lý thời gian cho sinh viên"
        };
        conversation.Messages.Add(new AIMessage
        {
            Sender = AiSender.User,
            Message = "Mình muốn tìm sách về quản lý thời gian cho sinh viên."
        });
        conversation.Messages.Add(new AIMessage
        {
            Sender = AiSender.Assistant,
            Message = "Mình gợi ý các sách dễ đọc về quản lý thời gian và thói quen học tập."
        });
        db.AIConversations.Add(conversation);

        var timeBook = await db.Books.FirstAsync(x => x.Title.Contains("Thời Gian"), cancellationToken);
        db.AIRecommendations.Add(new AIRecommendation
        {
            Conversation = conversation,
            UserId = reader.Id,
            BookId = timeBook.Id,
            Score = 0.91m,
            Reason = "Phù hợp với nhu cầu quản lý thời gian, dễ đọc và có ví dụ thực tế cho sinh viên.",
            NeedSummary = "Sách dễ đọc về quản lý thời gian cho sinh viên"
        });
        db.NeedAnalytics.Add(new NeedAnalytics
        {
            UserId = reader.Id,
            ConversationId = conversation.Id,
            Purpose = "study",
            Topics = "quản lý thời gian,sinh viên,thói quen",
            Difficulty = "Easy",
            PreferredLength = "Short",
            NeedSummary = "Sách dễ đọc về quản lý thời gian cho sinh viên"
        });

        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<Publisher> EnsurePublisher(string name, CancellationToken cancellationToken)
    {
        var publisher = await db.Publishers.FirstOrDefaultAsync(x => x.Name == name, cancellationToken);
        if (publisher is not null)
        {
            return publisher;
        }

        publisher = new Publisher { Name = name };
        db.Publishers.Add(publisher);
        await db.SaveChangesAsync(cancellationToken);
        return publisher;
    }

    private async Task<Author> EnsureAuthor(string name, CancellationToken cancellationToken)
    {
        var author = await db.Authors.FirstOrDefaultAsync(x => x.FullName == name, cancellationToken);
        if (author is not null)
        {
            return author;
        }

        author = new Author { FullName = name };
        db.Authors.Add(author);
        await db.SaveChangesAsync(cancellationToken);
        return author;
    }

    private async Task<Category> EnsureCategory(string name, CancellationToken cancellationToken)
    {
        var category = await db.Categories.FirstOrDefaultAsync(x => x.Name == name, cancellationToken);
        if (category is not null)
        {
            return category;
        }

        category = new Category { Name = name };
        db.Categories.Add(category);
        await db.SaveChangesAsync(cancellationToken);
        return category;
    }

    private record SeedBook(
        string Title,
        string Authors,
        string Categories,
        string Publisher,
        int PublishedYear,
        string Difficulty,
        string ReadingTime,
        string Description,
        string TargetAudience,
        int Copies,
        string Shelf);
}
