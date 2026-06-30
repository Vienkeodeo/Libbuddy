# Libbuddy

Libbuddy is an AI-assisted library discovery and management web app based on the LibraryAI brief.

## What Is Included

- Customer-facing reader UI: search, curated book cards, AI advisor preview, borrowed/saved books.
- Admin dashboard UI: inventory, readers, borrow/return, checkout orders, reports, settings.
- ASP.NET Core 10 Web API: auth, books, book copies, readers, borrow/return, checkout orders, AI advisor, reports, runtime settings.
- Local SQLite database by default for immediate development; PostgreSQL + pgvector Docker compose is available when needed.
- Seed data for roles, users, books, copies, borrow history, checkout orders, and AI recommendations.

## Project Structure

```txt
Libbuddy
├── backend
│   └── Libbuddy.Api
├── frontend
│   └── libbuddy-web
├── docs
├── docker-compose.yml
└── README.md
```

## Run Locally

Add .NET to PATH for the current terminal if needed:

```bash
export PATH="/usr/local/share/dotnet:$PATH"
```

Run backend:

```bash
dotnet tool restore
dotnet run --project backend/Libbuddy.Api/Libbuddy.Api.csproj --urls http://localhost:5086
```

Development uses `backend/Libbuddy.Api/data/libbuddy.local.db` automatically. Docker/PostgreSQL is optional.

Run frontend:

```bash
cd frontend/libbuddy-web
npm install
npm run dev -- --port 3001
```

Open:

- Customer UI: http://localhost:3001
- Admin dashboard: http://localhost:3001/admin
- Backend health: http://localhost:5086/api/health

## Seed Accounts

- Admin: `admin@libbuddy.local` / `Admin@123456`
- Librarian: `librarian@libbuddy.local` / `Librarian@123456`
- Reader: `reader@libbuddy.local` / `Reader@123456`

## Chatbot API Key

Log in as Admin, open `/admin`, go to `Cài đặt`, and enter the OpenAI API key in `Chatbot AI`. The key is stored locally in `backend/Libbuddy.Api/data/libbuddy.ai-settings.json`, is ignored by git, and is never returned to the frontend after saving.

## Notes

The AI advisor always recommends books that exist in the database. When an OpenAI API key is configured, the chatbot uses the OpenAI Responses API to write the assistant reply; without a key, it falls back to the internal recommendation engine.
