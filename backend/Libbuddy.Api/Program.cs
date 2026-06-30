using System.Text;
using Libbuddy.Api.Application;
using Libbuddy.Api.Infrastructure.Data;
using Libbuddy.Api.Infrastructure.Endpoints;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var databaseProvider = builder.Configuration["Database:Provider"] ?? "Postgres";
var defaultConnection = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is missing.");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (IsSqlite(databaseProvider))
    {
        EnsureSqliteDirectory(defaultConnection);
        options.UseSqlite(defaultConnection);
        return;
    }

    options.UseNpgsql(defaultConnection);
});

builder.Services.AddScoped<DataSeeder>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<ILibraryAdvisorService, LibraryAdvisorService>();
builder.Services.AddSingleton<IRuntimeAiSettingsStore, RuntimeAiSettingsStore>();
builder.Services.AddScoped<IBookCoverService, BookCoverService>();
builder.Services.AddHttpClient("OpenLibrary", client => client.Timeout = TimeSpan.FromSeconds(10));

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is missing.");
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = signingKey,
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        // Extract JWT from httpOnly cookie — also fall back to Authorization header
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var cookieName = "libbuddy_token";
                if (string.IsNullOrEmpty(context.Request.Headers.Authorization) &&
                    context.Request.Cookies.TryGetValue(cookieName, out var token) &&
                    !string.IsNullOrEmpty(token))
                {
                    context.Token = token;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOrLibrarian", policy =>
        policy.RequireRole("Admin", "Librarian"));
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("Admin"));
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseStatusCodePages();
app.UseHttpsRedirection();
app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(ApiResponse.Ok(new
{
    service = "Libbuddy.Api",
    status = "healthy",
    time = DateTimeOffset.UtcNow
})));

app.MapLibbuddyEndpoints();

if (app.Environment.IsDevelopment() && app.Configuration.GetValue("Database:SeedOnStartup", true))
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");

    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (IsSqlite(app.Configuration["Database:Provider"]))
        {
            await db.Database.EnsureCreatedAsync();
        }
        else
        {
            await db.Database.ExecuteSqlRawAsync("CREATE EXTENSION IF NOT EXISTS vector;");
            await db.Database.MigrateAsync();
        }

        var seeder = scope.ServiceProvider.GetRequiredService<DataSeeder>();
        await seeder.SeedAsync();
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Database is not ready. API still started; check Database:Provider and ConnectionStrings:DefaultConnection.");
    }
}

app.Run();

static bool IsSqlite(string? provider) =>
    string.Equals(provider, "Sqlite", StringComparison.OrdinalIgnoreCase)
    || string.Equals(provider, "SQLite", StringComparison.OrdinalIgnoreCase);

static void EnsureSqliteDirectory(string connectionString)
{
    var builder = new SqliteConnectionStringBuilder(connectionString);
    var dataSource = builder.DataSource;
    if (string.IsNullOrWhiteSpace(dataSource) || dataSource.Equals(":memory:", StringComparison.OrdinalIgnoreCase))
    {
        return;
    }

    var directory = Path.GetDirectoryName(Path.GetFullPath(dataSource));
    if (!string.IsNullOrWhiteSpace(directory))
    {
        Directory.CreateDirectory(directory);
    }
}
