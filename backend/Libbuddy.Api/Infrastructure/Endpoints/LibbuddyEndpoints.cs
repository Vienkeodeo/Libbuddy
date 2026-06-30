using System.Security.Claims;
using Libbuddy.Api.Application;
using Libbuddy.Api.Domain;
using Libbuddy.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace Libbuddy.Api.Infrastructure.Endpoints;

public static class LibbuddyEndpoints
{
    public static void MapLibbuddyEndpoints(this WebApplication app)
    {
        MapAuth(app);
        MapBooks(app);
        MapAdminCovers(app);
        MapUsers(app);
        MapBorrowRecords(app);
        MapCheckout(app);
        MapAi(app);
        MapReports(app);
        MapSettings(app);
        MapMeta(app);
    }

    private static void MapAuth(WebApplication app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", async (
            RegisterRequest request,
            AppDbContext db,
            IJwtTokenService jwt,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email) || request.Password.Length < 8)
            {
                return Results.BadRequest(ApiResponse.Fail("Tên, email và mật khẩu tối thiểu 8 ký tự là bắt buộc."));
            }

            var email = request.Email.Trim().ToLowerInvariant();
            if (await db.Users.AnyAsync(x => x.Email == email, cancellationToken))
            {
                return Results.Conflict(ApiResponse.Fail("Email đã tồn tại."));
            }

            var readerRole = await db.Roles.FirstAsync(x => x.Name == "Reader", cancellationToken);
            var user = new User
            {
                FullName = request.FullName.Trim(),
                Email = email,
                Phone = request.Phone,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Status = UserStatus.Active
            };
            user.UserRoles.Add(new UserRole { User = user, Role = readerRole });
            db.Users.Add(user);
            await db.SaveChangesAsync(cancellationToken);

            var roles = new[] { readerRole.Name };
            var currentUser = new CurrentUserDto(user.Id, user.FullName, user.Email, roles);
            var token = jwt.CreateToken(user, roles);
            SetAuthCookie(httpContext, token);
            SetSessionCookie(httpContext, currentUser);
            return Results.Ok(ApiResponse.Ok(new AuthResponse(token, currentUser)));
        });

        group.MapPost("/login", async (
            LoginRequest request,
            AppDbContext db,
            IJwtTokenService jwt,
            HttpContext context,
            CancellationToken cancellationToken) =>
        {
            var email = request.Email.Trim().ToLowerInvariant();
            var user = await db.Users
                .Include(x => x.UserRoles).ThenInclude(x => x.Role)
                .FirstOrDefaultAsync(x => x.Email == email, cancellationToken);

            if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Results.Unauthorized();
            }

            if (user.Status != UserStatus.Active)
            {
                return Results.BadRequest(ApiResponse.Fail("Tài khoản không ở trạng thái hoạt động."));
            }

            var roles = user.UserRoles.Select(x => x.Role.Name).ToList();
            var currentUser = new CurrentUserDto(user.Id, user.FullName, user.Email, roles);
            var token = jwt.CreateToken(user, roles);
            SetAuthCookie(context, token);
            SetSessionCookie(context, currentUser);
            return Results.Ok(ApiResponse.Ok(new AuthResponse(token, currentUser)));
        });

        group.MapGet("/me", [Authorize] async (ClaimsPrincipal principal, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var userId = GetUserId(principal);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var user = await db.Users
                .Include(x => x.UserRoles).ThenInclude(x => x.Role)
                .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);

            if (user is null)
            {
                return Results.NotFound(ApiResponse.Fail("Không tìm thấy người dùng."));
            }

            return Results.Ok(ApiResponse.Ok(new CurrentUserDto(
                user.Id,
                user.FullName,
                user.Email,
                user.UserRoles.Select(x => x.Role.Name).ToList())));
        });

        group.MapPost("/logout", (HttpContext context) =>
        {
            ClearAuthCookie(context);
            return Results.Ok(ApiResponse.Ok(new { }));
        });
    }

    private static void MapBooks(WebApplication app)
    {
        var books = app.MapGroup("/api/books").WithTags("Books");

        books.MapGet("/", async (
            AppDbContext db,
            string? keyword,
            string? category,
            string? difficulty,
            bool? availableOnly,
            int? page,
            int? pageSize,
            CancellationToken cancellationToken) =>
        {
            var pageNumber = Math.Max(page ?? 1, 1);
            var requestedSize = pageSize.GetValueOrDefault(12);
            var size = Math.Clamp(requestedSize <= 0 ? 12 : requestedSize, 1, 60);
            var query = BookIncludes(db.Books.AsNoTracking())
                .Where(x => x.Status != BookStatus.Deleted);

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var term = keyword.Trim().ToLowerInvariant();
                query = query.Where(x =>
                    x.Title.ToLower().Contains(term)
                    || (x.Description != null && x.Description.ToLower().Contains(term))
                    || x.BookAuthors.Any(a => a.Author.FullName.ToLower().Contains(term))
                    || x.BookCategories.Any(c => c.Category.Name.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(x => x.BookCategories.Any(c => c.Category.Name == category));
            }

            if (!string.IsNullOrWhiteSpace(difficulty))
            {
                query = query.Where(x => x.DifficultyLevel == difficulty);
            }

            if (availableOnly == true)
            {
                query = query.Where(x => x.Copies.Any(copy => copy.Status == BookCopyStatus.Available));
            }

            var total = await query.CountAsync(cancellationToken);
            var items = await query
                .OrderBy(x => x.Title)
                .Skip((pageNumber - 1) * size)
                .Take(size)
                .Select(x => ToListItem(x))
                .ToListAsync(cancellationToken);

            return Results.Ok(ApiResponse.Ok(new PaginatedResult<BookListItemDto>(items, pageNumber, size, total)));
        });

        books.MapGet("/{id:guid}", async (Guid id, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var book = await BookIncludes(db.Books.AsNoTracking())
                .FirstOrDefaultAsync(x => x.Id == id && x.Status != BookStatus.Deleted, cancellationToken);

            return book is null
                ? Results.NotFound(ApiResponse.Fail("Không tìm thấy sách."))
                : Results.Ok(ApiResponse.Ok(ToDetail(book)));
        });

        books.MapPost("/", async (UpsertBookRequest request, AppDbContext db, CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return Results.BadRequest(ApiResponse.Fail("Tên sách là bắt buộc."));
            }

            if (!string.IsNullOrWhiteSpace(request.Isbn) && await db.Books.AnyAsync(x => x.Isbn == request.Isbn, cancellationToken))
            {
                return Results.Conflict(ApiResponse.Fail("ISBN đã tồn tại."));
            }

            var book = new Book();
            await ApplyBookRequest(book, request, db, cancellationToken);
            db.Books.Add(book);
            await db.SaveChangesAsync(cancellationToken);

            var saved = await BookIncludes(db.Books.AsNoTracking()).FirstAsync(x => x.Id == book.Id, cancellationToken);
            return Results.Created($"/api/books/{book.Id}", ApiResponse.Ok(ToDetail(saved), "Đã thêm sách."));
        }).RequireAuthorization("AdminOrLibrarian");

        books.MapPut("/{id:guid}", async (Guid id, UpsertBookRequest request, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var book = await db.Books
                .Include(x => x.BookAuthors)
                .Include(x => x.BookCategories)
                .FirstOrDefaultAsync(x => x.Id == id && x.Status != BookStatus.Deleted, cancellationToken);

            if (book is null)
            {
                return Results.NotFound(ApiResponse.Fail("Không tìm thấy sách."));
            }

            if (!string.IsNullOrWhiteSpace(request.Isbn)
                && await db.Books.AnyAsync(x => x.Id != id && x.Isbn == request.Isbn, cancellationToken))
            {
                return Results.Conflict(ApiResponse.Fail("ISBN đã tồn tại."));
            }

            await ApplyBookRequest(book, request, db, cancellationToken);
            book.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);

            var saved = await BookIncludes(db.Books.AsNoTracking()).FirstAsync(x => x.Id == book.Id, cancellationToken);
            return Results.Ok(ApiResponse.Ok(ToDetail(saved), "Đã cập nhật sách."));
        }).RequireAuthorization("AdminOrLibrarian");

        books.MapDelete("/{id:guid}", async (Guid id, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var book = await db.Books.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (book is null)
            {
                return Results.NotFound(ApiResponse.Fail("Không tìm thấy sách."));
            }

            book.Status = BookStatus.Deleted;
            book.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            return Results.Ok(ApiResponse.Ok(new { id }, "Đã xóa mềm sách."));
        }).RequireAuthorization("AdminOrLibrarian");

        books.MapGet("/{id:guid}/copies", async (Guid id, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var copies = await db.BookCopies
                .AsNoTracking()
                .Include(x => x.Book)
                .Include(x => x.ShelfLocation)
                .Where(x => x.BookId == id)
                .OrderBy(x => x.CopyCode)
                .Select(x => ToCopyDto(x))
                .ToListAsync(cancellationToken);

            return Results.Ok(ApiResponse.Ok(copies));
        });

        books.MapPost("/{id:guid}/copies", async (Guid id, AddBookCopiesRequest request, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var book = await db.Books.FirstOrDefaultAsync(x => x.Id == id && x.Status == BookStatus.Active, cancellationToken);
            if (book is null)
            {
                return Results.NotFound(ApiResponse.Fail("Không tìm thấy sách đang lưu hành."));
            }

            var quantity = Math.Clamp(request.Quantity, 1, 50);
            var condition = Enum.TryParse<CopyCondition>(request.Condition, true, out var parsedCondition)
                ? parsedCondition
                : CopyCondition.Good;
            var maxCode = await db.BookCopies
                .OrderByDescending(x => x.CopyCode)
                .Select(x => x.CopyCode)
                .FirstOrDefaultAsync(cancellationToken);
            var existingCount = 0;
            if (maxCode is not null && maxCode.StartsWith("LIB-") && int.TryParse(maxCode[4..], out var parsed))
            {
                existingCount = parsed;
            }

            var copies = Enumerable.Range(1, quantity)
                .Select(index =>
                {
                    var running = existingCount + index;
                    return new BookCopy
                    {
                        BookId = id,
                        CopyCode = $"LIB-{running:000000}",
                        Barcode = $"893LIB{running:000000}",
                        ShelfLocationId = request.ShelfLocationId,
                        Condition = condition,
                        Status = BookCopyStatus.Available
                    };
                })
                .ToList();

            db.BookCopies.AddRange(copies);
            await db.SaveChangesAsync(cancellationToken);
            return Results.Created($"/api/books/{id}/copies", ApiResponse.Ok(copies.Select(x => x.Id).ToList(), "Đã thêm bản sách."));
        }).RequireAuthorization("AdminOrLibrarian");

        app.MapPost("/api/book-copies/{id:guid}/mark-damaged", async (Guid id, AppDbContext db, CancellationToken cancellationToken) =>
            await MarkCopy(id, BookCopyStatus.Damaged, CopyCondition.Damaged, db, cancellationToken)).RequireAuthorization("AdminOrLibrarian");

        app.MapPost("/api/book-copies/{id:guid}/mark-lost", async (Guid id, AppDbContext db, CancellationToken cancellationToken) =>
            await MarkCopy(id, BookCopyStatus.Lost, CopyCondition.Lost, db, cancellationToken)).RequireAuthorization("AdminOrLibrarian");
    }

    private static void MapAdminCovers(WebApplication app)
    {
        var group = app.MapGroup("/api/admin/books").WithTags("Admin - Books").RequireAuthorization("AdminOrLibrarian");

        group.MapPost("/{id:guid}/refresh-cover", async (
            Guid id,
            IBookCoverService coverService,
            AppDbContext db,
            CancellationToken cancellationToken) =>
        {
            var book = await db.Books.FirstOrDefaultAsync(x => x.Id == id && x.Status != BookStatus.Deleted, cancellationToken);
            if (book is null)
            {
                return Results.NotFound(ApiResponse.Fail("Không tìm thấy sách."));
            }

            var url = await coverService.FetchCoverUrlAsync(book.Id, book.Isbn, book.Title, cancellationToken);
            if (!string.IsNullOrEmpty(url))
            {
                book.CoverImageUrl = url;
                book.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(cancellationToken);
                return Results.Ok(ApiResponse.Ok(new { url }, "Đã cập nhật bìa sách."));
            }

            return Results.Ok(ApiResponse<object>.Ok(new { url = (string?)null }, "Không tìm được bìa sách từ Open Library."));
        });

        group.MapPost("/refresh-covers-all", async (
            IBookCoverService coverService,
            CancellationToken cancellationToken) =>
        {
            var refreshed = await coverService.RefreshAllCoversAsync(cancellationToken);
            return Results.Ok(ApiResponse<object>.Ok(new { refreshed }, $"Đã cập nhật {refreshed} bìa sách."));
        });
    }

    private static void MapUsers(WebApplication app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users").RequireAuthorization("AdminOrLibrarian");

        group.MapGet("/", async (AppDbContext db, CancellationToken cancellationToken) =>
        {
            var users = await db.Users
                .AsNoTracking()
                .Include(x => x.UserRoles).ThenInclude(x => x.Role)
                .Include(x => x.BorrowRecords)
                .Where(x => x.UserRoles.Any(role => role.Role.Name == "Reader"))
                .OrderBy(x => x.FullName)
                .Select(x => new ReaderDto(
                    x.Id,
                    x.FullName,
                    x.Email,
                    x.Phone,
                    x.Status.ToString(),
                    x.BorrowRecords.Count(record => record.Status == BorrowStatus.Borrowing || record.Status == BorrowStatus.Overdue)))
                .ToListAsync(cancellationToken);

            return Results.Ok(ApiResponse.Ok(users));
        });

        group.MapPost("/", async (RegisterRequest request, AppDbContext db, CancellationToken cancellationToken) =>
        {
            if (await db.Users.AnyAsync(x => x.Email == request.Email.Trim().ToLowerInvariant(), cancellationToken))
            {
                return Results.Conflict(ApiResponse.Fail("Email đã tồn tại."));
            }

            var role = await db.Roles.FirstAsync(x => x.Name == "Reader", cancellationToken);
            var user = new User
            {
                FullName = request.FullName.Trim(),
                Email = request.Email.Trim().ToLowerInvariant(),
                Phone = request.Phone,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Status = UserStatus.Active
            };
            user.UserRoles.Add(new UserRole { User = user, Role = role });
            db.Users.Add(user);
            await db.SaveChangesAsync(cancellationToken);

            return Results.Created($"/api/users/{user.Id}", ApiResponse.Ok(new ReaderDto(user.Id, user.FullName, user.Email, user.Phone, user.Status.ToString(), 0)));
        });

        group.MapPost("/{id:guid}/lock", async (Guid id, AppDbContext db, CancellationToken cancellationToken) =>
            await SetUserStatus(id, UserStatus.Locked, db, cancellationToken));

        group.MapPost("/{id:guid}/unlock", async (Guid id, AppDbContext db, CancellationToken cancellationToken) =>
            await SetUserStatus(id, UserStatus.Active, db, cancellationToken));
    }

    private static void MapBorrowRecords(WebApplication app)
    {
        var group = app.MapGroup("/api/borrow-records").WithTags("Borrow Records");

        group.MapGet("/", async (AppDbContext db, CancellationToken cancellationToken) =>
        {
            var records = await BorrowIncludes(db.BorrowRecords.AsNoTracking())
                .OrderByDescending(x => x.CreatedAt)
                .Take(80)
                .Select(x => ToBorrowDto(x))
                .ToListAsync(cancellationToken);

            return Results.Ok(ApiResponse.Ok(records));
        }).RequireAuthorization("AdminOrLibrarian");

        group.MapGet("/overdue", async (AppDbContext db, CancellationToken cancellationToken) =>
        {
            var now = DateTime.UtcNow;
            var records = await BorrowIncludes(db.BorrowRecords.AsNoTracking())
                .Where(x => (x.Status == BorrowStatus.Borrowing || x.Status == BorrowStatus.Overdue) && x.DueDate < now)
                .OrderBy(x => x.DueDate)
                .Select(x => ToBorrowDto(x))
                .ToListAsync(cancellationToken);

            return Results.Ok(ApiResponse.Ok(records));
        }).RequireAuthorization("AdminOrLibrarian");

        group.MapGet("/my", [Authorize] async (ClaimsPrincipal principal, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var userId = GetUserId(principal);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var records = await BorrowIncludes(db.BorrowRecords.AsNoTracking())
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => ToBorrowDto(x))
                .ToListAsync(cancellationToken);

            return Results.Ok(ApiResponse.Ok(records));
        });

        group.MapPost("/", async (CreateBorrowRecordRequest request, AppDbContext db, CancellationToken cancellationToken) =>
        {
            if (request.BookCopyIds.Count == 0 || request.DueDate <= DateTime.UtcNow)
            {
                return Results.BadRequest(ApiResponse.Fail("Cần chọn bản sách và hạn trả hợp lệ."));
            }

            var user = await db.Users.FirstOrDefaultAsync(x => x.Id == request.UserId, cancellationToken);
            if (user is null || user.Status != UserStatus.Active)
            {
                return Results.BadRequest(ApiResponse.Fail("Độc giả không tồn tại hoặc không hoạt động."));
            }

            var hasOverdue = await db.BorrowRecords.AnyAsync(
                x => x.UserId == request.UserId
                    && (x.Status == BorrowStatus.Borrowing || x.Status == BorrowStatus.Overdue)
                    && x.DueDate < DateTime.UtcNow,
                cancellationToken);

            if (hasOverdue)
            {
                return Results.BadRequest(ApiResponse.Fail("Độc giả đang có sách quá hạn."));
            }

            var copies = await db.BookCopies
                .Include(x => x.Book)
                .Where(x => request.BookCopyIds.Contains(x.Id))
                .ToListAsync(cancellationToken);

            if (copies.Count != request.BookCopyIds.Distinct().Count())
            {
                return Results.BadRequest(ApiResponse.Fail("Có bản sách không tồn tại."));
            }

            if (copies.Any(x => x.Status != BookCopyStatus.Available))
            {
                return Results.BadRequest(ApiResponse.Fail("Chỉ được mượn bản sách đang khả dụng."));
            }

            var record = new BorrowRecord
            {
                UserId = request.UserId,
                DueDate = request.DueDate,
                Status = BorrowStatus.Borrowing,
                Note = request.Note
            };

            foreach (var copy in copies)
            {
                copy.Status = BookCopyStatus.Borrowed;
                copy.UpdatedAt = DateTime.UtcNow;
                record.Items.Add(new BorrowRecordItem { BookCopyId = copy.Id });
            }

            db.BorrowRecords.Add(record);
            await db.SaveChangesAsync(cancellationToken);

            var saved = await BorrowIncludes(db.BorrowRecords.AsNoTracking()).FirstAsync(x => x.Id == record.Id, cancellationToken);
            return Results.Created($"/api/borrow-records/{record.Id}", ApiResponse.Ok(ToBorrowDto(saved), "Đã tạo phiếu mượn."));
        }).RequireAuthorization("AdminOrLibrarian");

        group.MapPost("/{id:guid}/return", async (Guid id, ReturnBorrowRecordRequest request, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var record = await db.BorrowRecords
                .Include(x => x.Items).ThenInclude(x => x.BookCopy)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

            if (record is null)
            {
                return Results.NotFound(ApiResponse.Fail("Không tìm thấy phiếu mượn."));
            }

            if (record.Status is not (BorrowStatus.Borrowing or BorrowStatus.Overdue))
            {
                return Results.BadRequest(ApiResponse.Fail("Phiếu mượn không ở trạng thái có thể trả."));
            }

            var now = DateTime.UtcNow;
            foreach (var returnItem in request.Items)
            {
                var item = record.Items.FirstOrDefault(x => x.BookCopyId == returnItem.BookCopyId);
                if (item is null)
                {
                    continue;
                }

                var condition = Enum.TryParse<CopyCondition>(returnItem.Condition, true, out var parsed)
                    ? parsed
                    : CopyCondition.Good;

                item.ReturnDate = now;
                item.ReturnCondition = condition;
                item.Note = returnItem.Note;
                item.FineAmount = record.DueDate < now ? (decimal)Math.Ceiling((now - record.DueDate).TotalDays) * 5000 : 0;

                item.BookCopy.Condition = condition;
                item.BookCopy.Status = condition switch
                {
                    CopyCondition.Damaged => BookCopyStatus.Damaged,
                    CopyCondition.Lost => BookCopyStatus.Lost,
                    _ => BookCopyStatus.Available
                };
                item.BookCopy.UpdatedAt = now;
            }

            if (record.Items.All(x => x.ReturnDate.HasValue))
            {
                record.Status = BorrowStatus.Returned;
                record.ReturnDate = now;
            }
            else if (record.DueDate < now)
            {
                record.Status = BorrowStatus.Overdue;
            }

            record.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);

            var saved = await BorrowIncludes(db.BorrowRecords.AsNoTracking()).FirstAsync(x => x.Id == record.Id, cancellationToken);
            return Results.Ok(ApiResponse.Ok(ToBorrowDto(saved), "Đã xử lý trả sách."));
        }).RequireAuthorization("AdminOrLibrarian");
    }

    private static void MapAi(WebApplication app)
    {
        var group = app.MapGroup("/api/ai").WithTags("AI Advisor");

        group.MapPost("/chat", async (AiChatRequest request, ILibraryAdvisorService advisor, CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(request.Message))
            {
                return Results.BadRequest(ApiResponse.Fail("Câu hỏi không được để trống."));
            }

            var response = await advisor.ChatAsync(request, cancellationToken);
            return Results.Ok(ApiResponse.Ok(response));
        });

        group.MapGet("/conversations", async (AppDbContext db, Guid? userId, CancellationToken cancellationToken) =>
        {
            var query = db.AIConversations.AsNoTracking();
            if (userId.HasValue)
            {
                query = query.Where(x => x.UserId == userId);
            }

            var items = await query
                .OrderByDescending(x => x.UpdatedAt ?? x.CreatedAt)
                .Select(x => new AIConversationDto(x.Id, x.Title ?? "Hội thoại AI", x.CreatedAt, x.UpdatedAt))
                .Take(30)
                .ToListAsync(cancellationToken);

            return Results.Ok(ApiResponse.Ok(items));
        }).RequireAuthorization("AdminOrLibrarian");

        group.MapGet("/conversations/{id:guid}", async (Guid id, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var conversation = await db.AIConversations
                .AsNoTracking()
                .Include(x => x.Messages)
                .Include(x => x.Recommendations).ThenInclude(x => x.Book).ThenInclude(x => x.Copies)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

            if (conversation is null)
            {
                return Results.NotFound(ApiResponse.Fail("Không tìm thấy hội thoại."));
            }

            var detail = new AIConversationDetailDto(
                conversation.Id,
                conversation.Title ?? "Hội thoại AI",
                conversation.Messages
                    .OrderBy(x => x.CreatedAt)
                    .Select(x => new AIMessageDto(x.Id, x.Sender.ToString(), x.Message, x.CreatedAt))
                    .ToList(),
                conversation.Recommendations
                    .Select(x => new RecommendedBookDto(
                        x.BookId,
                        x.Book.Title,
                        x.Reason,
                        x.Score,
                        x.Book.Copies.Any(copy => copy.Status == BookCopyStatus.Available) ? "available" : "unavailable"))
                    .ToList());

            return Results.Ok(ApiResponse.Ok(detail));
        }).RequireAuthorization("AdminOrLibrarian");
    }

    private static void MapCheckout(WebApplication app)
    {
        var group = app.MapGroup("/api/checkout/orders").WithTags("Checkout").RequireAuthorization();

        group.MapGet("/my", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken cancellationToken) =>
        {
            var userId = GetUserId(principal);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var orders = await OrderIncludes(db.LibraryOrders.AsNoTracking())
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => ToOrderDto(x))
                .ToListAsync(cancellationToken);

            return Results.Ok(ApiResponse.Ok(orders));
        });

        group.MapGet("/", async (AppDbContext db, CancellationToken cancellationToken) =>
        {
            var orders = await OrderIncludes(db.LibraryOrders.AsNoTracking())
                .OrderByDescending(x => x.CreatedAt)
                .Take(120)
                .Select(x => ToOrderDto(x))
                .ToListAsync(cancellationToken);

            return Results.Ok(ApiResponse.Ok(orders));
        }).RequireAuthorization("AdminOrLibrarian");

        group.MapPost("/{id:guid}/status", async (
            Guid id,
            UpdateCheckoutOrderStatusRequest request,
            AppDbContext db,
            CancellationToken cancellationToken) =>
        {
            var order = await OrderIncludes(db.LibraryOrders)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

            if (order is null)
            {
                return Results.NotFound(ApiResponse.Fail("Không tìm thấy đơn thuê/mua sách."));
            }

            if (!Enum.TryParse<LibraryOrderStatus>(request.Status, true, out var status))
            {
                return Results.BadRequest(ApiResponse.Fail("Trạng thái đơn không hợp lệ."));
            }

            if (!string.IsNullOrWhiteSpace(request.PaymentStatus))
            {
                if (!Enum.TryParse<PaymentStatus>(request.PaymentStatus, true, out var paymentStatus))
                {
                    return Results.BadRequest(ApiResponse.Fail("Trạng thái thanh toán không hợp lệ."));
                }

                order.PaymentStatus = paymentStatus;
            }

            order.Status = status;
            order.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);

            var saved = await OrderIncludes(db.LibraryOrders.AsNoTracking())
                .FirstAsync(x => x.Id == id, cancellationToken);

            return Results.Ok(ApiResponse.Ok(ToOrderDto(saved), "Đã cập nhật trạng thái đơn."));
        }).RequireAuthorization("AdminOrLibrarian");

        group.MapPost("/", async (
            CreateCheckoutOrderRequest request,
            ClaimsPrincipal principal,
            AppDbContext db,
            CancellationToken cancellationToken) =>
        {
            var userId = GetUserId(principal);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            if (!Enum.TryParse<LibraryOrderType>(request.Type, true, out var orderType))
            {
                return Results.BadRequest(ApiResponse.Fail("Loại đơn không hợp lệ."));
            }

            if (!Enum.TryParse<FulfillmentMethod>(request.FulfillmentMethod, true, out var fulfillmentMethod))
            {
                return Results.BadRequest(ApiResponse.Fail("Phương thức nhận sách không hợp lệ."));
            }

            if (fulfillmentMethod == FulfillmentMethod.Delivery && string.IsNullOrWhiteSpace(request.DeliveryAddress))
            {
                return Results.BadRequest(ApiResponse.Fail("Địa chỉ giao sách là bắt buộc."));
            }

            var user = await db.Users.FirstOrDefaultAsync(x => x.Id == userId && x.Status == UserStatus.Active, cancellationToken);
            if (user is null)
            {
                return Results.BadRequest(ApiResponse.Fail("Tài khoản không hoạt động."));
            }

            var book = await db.Books
                .Include(x => x.Copies)
                .FirstOrDefaultAsync(x => x.Id == request.BookId && x.Status == BookStatus.Active, cancellationToken);

            if (book is null)
            {
                return Results.NotFound(ApiResponse.Fail("Không tìm thấy sách đang lưu hành."));
            }

            var now = DateTime.UtcNow;
            var order = new LibraryOrder
            {
                OrderCode = await NextOrderCode(db, cancellationToken),
                UserId = user.Id,
                Type = orderType,
                FulfillmentMethod = fulfillmentMethod,
                Status = fulfillmentMethod == FulfillmentMethod.Pickup ? LibraryOrderStatus.ReadyForPickup : LibraryOrderStatus.InProgress,
                PaymentStatus = PaymentStatus.Paid,
                RentalFee = orderType == LibraryOrderType.Rent ? 18_000 : 0,
                DepositAmount = orderType == LibraryOrderType.Rent ? 50_000 : 0,
                PurchaseAmount = orderType == LibraryOrderType.Purchase ? 129_000 : 0,
                DeliveryFee = fulfillmentMethod == FulfillmentMethod.Delivery ? 22_000 : 0,
                DeliveryAddress = fulfillmentMethod == FulfillmentMethod.Delivery ? request.DeliveryAddress?.Trim() : null,
                Note = request.Note,
                CreatedAt = now
            };
            order.TotalAmount = order.RentalFee + order.DepositAmount + order.PurchaseAmount + order.DeliveryFee;

            if (orderType == LibraryOrderType.Rent)
            {
                var copy = await db.BookCopies
                    .Include(x => x.Book)
                    .Where(x => x.BookId == book.Id && x.Status == BookCopyStatus.Available)
                    .OrderBy(x => x.CopyCode)
                    .FirstOrDefaultAsync(cancellationToken);

                if (copy is null)
                {
                    return Results.BadRequest(ApiResponse.Fail("Sách hiện đã hết bản khả dụng để thuê/mượn."));
                }

                var borrowRecord = new BorrowRecord
                {
                    UserId = user.Id,
                    BorrowDate = now,
                    DueDate = now.AddDays(14),
                    Status = BorrowStatus.Borrowing,
                    Note = $"Tạo từ đơn {order.OrderCode}"
                };
                borrowRecord.Items.Add(new BorrowRecordItem { BookCopyId = copy.Id });
                copy.Status = BookCopyStatus.Borrowed;
                copy.UpdatedAt = now;

                db.BorrowRecords.Add(borrowRecord);
                order.BorrowRecord = borrowRecord;
                order.Items.Add(new LibraryOrderItem
                {
                    BookId = book.Id,
                    BookCopyId = copy.Id,
                    Quantity = 1,
                    UnitPrice = order.RentalFee + order.DepositAmount,
                    LineTotal = order.RentalFee + order.DepositAmount
                });
            }
            else
            {
                order.Items.Add(new LibraryOrderItem
                {
                    BookId = book.Id,
                    Quantity = 1,
                    UnitPrice = order.PurchaseAmount,
                    LineTotal = order.PurchaseAmount
                });
            }

            db.LibraryOrders.Add(order);
            await db.SaveChangesAsync(cancellationToken);

            var saved = await OrderIncludes(db.LibraryOrders.AsNoTracking())
                .FirstAsync(x => x.Id == order.Id, cancellationToken);

            return Results.Created($"/api/checkout/orders/{order.Id}", ApiResponse.Ok(ToOrderDto(saved), "Đã tạo đơn thành công."));
        });
    }

    private static void MapReports(WebApplication app)
    {
        app.MapGet("/api/reports/dashboard", async (AppDbContext db, CancellationToken cancellationToken) =>
        {
            var now = DateTime.UtcNow;
            var topBorrowedRows = await db.BorrowRecordItems
                .AsNoTracking()
                .Include(x => x.BookCopy).ThenInclude(x => x.Book)
                .GroupBy(x => x.BookCopy.Book.Title)
                .Select(x => new { Title = x.Key, Count = x.Count() })
                .OrderByDescending(x => x.Count)
                .Take(5)
                .ToListAsync(cancellationToken);
            var topBorrowed = topBorrowedRows
                .Select(x => new TopBookDto(x.Title, x.Count))
                .ToList();

            var categoryRows = await db.BookCategories
                .AsNoTracking()
                .Include(x => x.Category)
                .GroupBy(x => x.Category.Name)
                .Select(x => new { Name = x.Key, Count = x.Count() })
                .OrderByDescending(x => x.Count)
                .Take(6)
                .ToListAsync(cancellationToken);
            var categories = categoryRows
                .Select(x => new CategoryReportDto(x.Name, x.Count))
                .ToList();

            var needs = await db.NeedAnalytics
                .AsNoTracking()
                .Select(x => x.Topics)
                .ToListAsync(cancellationToken);

            var popularNeeds = needs
                .SelectMany(x => x.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                .GroupBy(x => x)
                .Select(x => new AiNeedDto(x.Key, x.Count()))
                .OrderByDescending(x => x.Count)
                .Take(6)
                .ToList();

            var report = new DashboardReportDto(
                TotalBooks: await db.Books.CountAsync(x => x.Status == BookStatus.Active, cancellationToken),
                TotalCopies: await db.BookCopies.CountAsync(cancellationToken),
                AvailableCopies: await db.BookCopies.CountAsync(x => x.Status == BookCopyStatus.Available, cancellationToken),
                BorrowedCopies: await db.BookCopies.CountAsync(x => x.Status == BookCopyStatus.Borrowed, cancellationToken),
                OverdueRecords: await db.BorrowRecords.CountAsync(x => (x.Status == BorrowStatus.Borrowing || x.Status == BorrowStatus.Overdue) && x.DueDate < now, cancellationToken),
                TotalReaders: await db.Users.CountAsync(x => x.UserRoles.Any(role => role.Role.Name == "Reader"), cancellationToken),
                AiConversations: await db.AIConversations.CountAsync(cancellationToken),
                TopBorrowedBooks: topBorrowed,
                PopularCategories: categories,
                PopularNeeds: popularNeeds);

            return Results.Ok(ApiResponse.Ok(report));
        }).RequireAuthorization("AdminOrLibrarian").WithTags("Reports");
    }

    private static void MapSettings(WebApplication app)
    {
        var group = app.MapGroup("/api/settings").WithTags("Settings").RequireAuthorization("AdminOrLibrarian");

        group.MapGet("/ai", async (IRuntimeAiSettingsStore store, CancellationToken cancellationToken) =>
        {
            var settings = await store.GetEffectiveAsync(cancellationToken);
            return Results.Ok(ApiResponse.Ok(ToAiSettingsDto(settings)));
        });

        group.MapPost("/ai", async (
            UpdateAiProviderSettingsRequest request,
            IRuntimeAiSettingsStore store,
            CancellationToken cancellationToken) =>
        {
            if (!request.ClearApiKey && !string.IsNullOrWhiteSpace(request.ApiKey) && request.ApiKey.Trim().Length < 20)
            {
                return Results.BadRequest(ApiResponse.Fail("OpenAI API key quá ngắn."));
            }

            if (!string.IsNullOrWhiteSpace(request.Model) && request.Model.Trim().Length < 3)
            {
                return Results.BadRequest(ApiResponse.Fail("Tên model không hợp lệ."));
            }

            var settings = await store.SaveAsync(request, cancellationToken);
            return Results.Ok(ApiResponse.Ok(ToAiSettingsDto(settings), "Đã lưu cấu hình chatbot."));
        });
    }

    private static void MapMeta(WebApplication app)
    {
        var group = app.MapGroup("/api/meta").WithTags("Meta");

        group.MapGet("/categories", async (AppDbContext db, CancellationToken cancellationToken) =>
        {
            var categories = await db.Categories.AsNoTracking().OrderBy(x => x.Name).Select(x => new { x.Id, x.Name }).ToListAsync(cancellationToken);
            return Results.Ok(ApiResponse.Ok(categories));
        });

        group.MapGet("/shelves", async (AppDbContext db, CancellationToken cancellationToken) =>
        {
            var shelves = await db.ShelfLocations
                .AsNoTracking()
                .OrderBy(x => x.Floor)
                .ThenBy(x => x.ShelfCode)
                .Select(x => new { x.Id, Label = FormatShelf(x) })
                .ToListAsync(cancellationToken);

            return Results.Ok(ApiResponse.Ok(shelves));
        });
    }

    private static Guid? GetUserId(ClaimsPrincipal principal)
    {
        var id = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(id, out var parsed) ? parsed : null;
    }

    private static IQueryable<Book> BookIncludes(IQueryable<Book> query) =>
        query
            .Include(x => x.Publisher)
            .Include(x => x.Copies).ThenInclude(x => x.ShelfLocation)
            .Include(x => x.BookAuthors).ThenInclude(x => x.Author)
            .Include(x => x.BookCategories).ThenInclude(x => x.Category);

    private static IQueryable<BorrowRecord> BorrowIncludes(IQueryable<BorrowRecord> query) =>
        query
            .Include(x => x.User)
            .Include(x => x.Items).ThenInclude(x => x.BookCopy).ThenInclude(x => x.Book);

    private static IQueryable<LibraryOrder> OrderIncludes(IQueryable<LibraryOrder> query) =>
        query
            .Include(x => x.User)
            .Include(x => x.BorrowRecord)
            .Include(x => x.Items).ThenInclude(x => x.Book)
            .Include(x => x.Items).ThenInclude(x => x.BookCopy);

    private static BookListItemDto ToListItem(Book book)
    {
        var shelf = book.Copies
            .Select(x => x.ShelfLocation)
            .FirstOrDefault(x => x is not null);

        return new BookListItemDto(
            book.Id,
            book.Title,
            book.BookAuthors.Select(x => x.Author.FullName).ToList(),
            book.BookCategories.Select(x => x.Category.Name).ToList(),
            book.CoverImageUrl,
            book.Description,
            book.DifficultyLevel,
            book.ReadingTimeLevel,
            book.TargetAudience,
            book.Status.ToString(),
            book.Copies.Count,
            book.Copies.Count(x => x.Status == BookCopyStatus.Available),
            shelf is null ? null : FormatShelf(shelf));
    }

    private static BookDetailDto ToDetail(Book book) =>
        new(
            book.Id,
            book.Title,
            book.Subtitle,
            book.Isbn,
            book.Description,
            book.Summary,
            book.Language,
            book.PublishedYear,
            book.Publisher?.Name,
            book.BookAuthors.Select(x => x.Author.FullName).ToList(),
            book.BookCategories.Select(x => x.Category.Name).ToList(),
            book.DifficultyLevel,
            book.ReadingTimeLevel,
            book.TargetAudience,
            book.CoverImageUrl,
            book.Status.ToString(),
            book.Copies.OrderBy(x => x.CopyCode).Select(ToCopyDto).ToList());

    private static BookCopyDto ToCopyDto(BookCopy copy) =>
        new(
            copy.Id,
            copy.BookId,
            copy.Book.Title,
            copy.CopyCode,
            copy.Barcode,
            copy.Status.ToString(),
            copy.Condition.ToString(),
            copy.ShelfLocation is null ? null : FormatShelf(copy.ShelfLocation));

    private static BorrowRecordDto ToBorrowDto(BorrowRecord record)
    {
        var computedStatus = record.Status == BorrowStatus.Borrowing && record.DueDate < DateTime.UtcNow
            ? BorrowStatus.Overdue
            : record.Status;

        return new BorrowRecordDto(
            record.Id,
            record.UserId,
            record.User.FullName,
            record.BorrowDate,
            record.DueDate,
            record.ReturnDate,
            computedStatus.ToString(),
            computedStatus == BorrowStatus.Overdue,
            record.Items.Select(item => new BorrowRecordItemDto(
                item.Id,
                item.BookCopyId,
                item.BookCopy.CopyCode,
                item.BookCopy.Book.Title,
                item.ReturnCondition?.ToString(),
                item.ReturnDate,
                item.FineAmount)).ToList());
    }

    private static CheckoutOrderDto ToOrderDto(LibraryOrder order) =>
        new(
            order.Id,
            order.OrderCode,
            order.UserId,
            order.User.FullName,
            order.Type.ToString(),
            order.FulfillmentMethod.ToString(),
            order.Status.ToString(),
            order.PaymentStatus.ToString(),
            order.RentalFee,
            order.DepositAmount,
            order.PurchaseAmount,
            order.DeliveryFee,
            order.TotalAmount,
            order.Currency,
            order.DeliveryAddress,
            order.BorrowRecordId,
            order.CreatedAt,
            order.Items.Select(item => new CheckoutOrderItemDto(
                item.Id,
                item.BookId,
                item.Book.Title,
                item.BookCopyId,
                item.BookCopy?.CopyCode,
                item.Quantity,
                item.UnitPrice,
                item.LineTotal)).ToList());

    private static AiProviderSettingsDto ToAiSettingsDto(EffectiveAiSettings settings) =>
        new(
            settings.HasApiKey,
            settings.KeyPreview,
            settings.Model,
            settings.Source,
            settings.UpdatedAt);

    private static async Task<string> NextOrderCode(AppDbContext db, CancellationToken cancellationToken)
    {
        var prefix = $"LB-{DateTime.UtcNow:yyyyMMdd}";
        var lastCode = await db.LibraryOrders
            .Where(x => x.OrderCode.StartsWith(prefix))
            .OrderByDescending(x => x.OrderCode)
            .Select(x => x.OrderCode)
            .FirstOrDefaultAsync(cancellationToken);
        var nextNumber = 1;
        if (lastCode is not null)
        {
            var suffix = lastCode[(prefix.Length + 1)..];
            if (int.TryParse(suffix, out var parsed))
            {
                nextNumber = parsed + 1;
            }
        }
        return $"{prefix}-{nextNumber:0000}";
    }

    private static async Task ApplyBookRequest(Book book, UpsertBookRequest request, AppDbContext db, CancellationToken cancellationToken)
    {
        book.Title = request.Title.Trim();
        book.Subtitle = request.Subtitle;
        book.Isbn = request.Isbn;
        book.Description = request.Description;
        book.Summary = request.Summary;
        book.Language = string.IsNullOrWhiteSpace(request.Language) ? "Vietnamese" : request.Language;
        book.PublishedYear = request.PublishedYear;
        book.DifficultyLevel = request.DifficultyLevel;
        book.ReadingTimeLevel = request.ReadingTimeLevel;
        book.TargetAudience = request.TargetAudience;
        book.CoverImageUrl = request.CoverImageUrl;
        book.Status = BookStatus.Active;

        if (!string.IsNullOrWhiteSpace(request.PublisherName))
        {
            var publisherName = request.PublisherName.Trim();
            var publisher = await db.Publishers.FirstOrDefaultAsync(x => x.Name == publisherName, cancellationToken);
            if (publisher is null)
            {
                publisher = new Publisher { Name = publisherName };
                db.Publishers.Add(publisher);
            }
            book.Publisher = publisher;
        }

        book.BookAuthors.Clear();
        foreach (var authorName in request.AuthorNames.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).Distinct())
        {
            var author = await db.Authors.FirstOrDefaultAsync(x => x.FullName == authorName, cancellationToken)
                ?? new Author { FullName = authorName };
            book.BookAuthors.Add(new BookAuthor { Book = book, Author = author });
        }

        book.BookCategories.Clear();
        foreach (var categoryName in request.CategoryNames.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).Distinct())
        {
            var category = await db.Categories.FirstOrDefaultAsync(x => x.Name == categoryName, cancellationToken)
                ?? new Category { Name = categoryName };
            book.BookCategories.Add(new BookCategory { Book = book, Category = category });
        }
    }

    private static async Task<IResult> MarkCopy(Guid id, BookCopyStatus status, CopyCondition condition, AppDbContext db, CancellationToken cancellationToken)
    {
        var copy = await db.BookCopies.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (copy is null)
        {
            return Results.NotFound(ApiResponse.Fail("Không tìm thấy bản sách."));
        }

        copy.Status = status;
        copy.Condition = condition;
        copy.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ApiResponse.Ok(new { id }, "Đã cập nhật bản sách."));
    }

    private static async Task<IResult> SetUserStatus(Guid id, UserStatus status, AppDbContext db, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (user is null)
        {
            return Results.NotFound(ApiResponse.Fail("Không tìm thấy người dùng."));
        }

        user.Status = status;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ApiResponse.Ok(new { id, status = status.ToString() }, "Đã cập nhật trạng thái người dùng."));
    }

    private static string FormatShelf(ShelfLocation shelf) =>
        string.Join(" - ", new[] { shelf.Floor, shelf.ShelfCode, shelf.SectionCode is null ? null : $"Ngăn {shelf.SectionCode}" }
            .Where(x => !string.IsNullOrWhiteSpace(x)));

    private const string TokenCookieName = "libbuddy_token";
    private const string SessionCookieName = "libbuddy_session";

    private static void SetAuthCookie(HttpContext context, string token)
    {
        context.Response.Cookies.Append(TokenCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = context.Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddHours(8),
            Path = "/"
        });
    }

    private static void SetSessionCookie(HttpContext context, CurrentUserDto user)
    {
        // Non-httpOnly session cookie for Next.js middleware route guards.
        // Contains only safe, non-sensitive metadata (no JWT).
        var session = $"{user.Id}|{string.Join(",", user.Roles)}";
        var encoded = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(session));
        context.Response.Cookies.Append(SessionCookieName, encoded, new CookieOptions
        {
            HttpOnly = false,
            Secure = context.Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddHours(8),
            Path = "/"
        });
    }

    private static void ClearAuthCookie(HttpContext context)
    {
        context.Response.Cookies.Delete(TokenCookieName, new CookieOptions { Path = "/" });
        context.Response.Cookies.Delete(SessionCookieName, new CookieOptions { Path = "/" });
    }

    public static (Guid Id, string[] Roles)? ParseSessionCookie(HttpRequest request)
    {
        if (!request.Cookies.TryGetValue(SessionCookieName, out var encoded) || string.IsNullOrEmpty(encoded))
        {
            return null;
        }

        try
        {
            var decoded = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(encoded));
            var parts = decoded.Split('|', 2);
            if (parts.Length != 2 || !Guid.TryParse(parts[0], out var id))
            {
                return null;
            }
            var roles = parts[1].Split(',', StringSplitOptions.RemoveEmptyEntries);
            return (id, roles);
        }
        catch
        {
            return null;
        }
    }
}
