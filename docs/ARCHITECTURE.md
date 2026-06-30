# Libbuddy Architecture

## Frontend

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- lucide-react icons
- Recharts for admin charts

The main reader experience is intentionally customer-first: large search, need chips, book cards, borrowed/saved panels, and AI advisor chat. The denser dashboard is isolated at `/admin`.

## Backend

- ASP.NET Core 10 Minimal APIs
- Entity Framework Core
- SQLite for local development
- PostgreSQL through Npgsql for production-style deployment
- JWT authentication
- BCrypt password hashing

API groups:

- `/api/auth`
- `/api/books`
- `/api/users`
- `/api/borrow-records`
- `/api/checkout`
- `/api/ai`
- `/api/reports`
- `/api/settings`
- `/api/meta`

## Data Model

Core entities:

- User, Role, UserRole
- Book, Author, Publisher, Category
- BookCopy, ShelfLocation
- BorrowRecord, BorrowRecordItem
- AIConversation, AIMessage, AIRecommendation
- BookEmbedding, NeedAnalytics

## AI Advisor

The advisor follows the rule from the brief: AI must not invent books.

Flow:

```txt
Reader message
→ backend analyzes intent
→ backend searches real books
→ backend filters availability
→ backend returns recommendations with reasons
→ recommendation history is saved
```

When an OpenAI API key is configured in `/admin` → `Cài đặt` → `Chatbot AI`, the backend calls the OpenAI Responses API to write the assistant reply from the same vetted recommendation set. If no key is configured, or the provider call fails, Libbuddy falls back to the internal recommendation engine.

Runtime AI settings are stored locally in `backend/Libbuddy.Api/data/libbuddy.ai-settings.json`. The raw API key is never returned to the frontend; admin screens only receive a masked preview.
