# Development Status

## Done

- Created monorepo structure.
- Scaffolded ASP.NET Core 10 API.
- Added EF Core domain model and DbContext.
- Added seed data for roles, users, books, copies, borrow records, and AI history.
- Implemented REST endpoints for MVP flows.
- Built a modern customer-facing Next.js UI.
- Moved the data-heavy dashboard to `/admin`.
- Wired customer and admin screens to the backend API.
- Added login/register, checkout, my-books, admin orders, and settings flows.
- Added runtime OpenAI API key configuration for Libbuddy AI with safe local storage.
- Added SQLite as the default local development database.
- Added Docker compose for PostgreSQL + pgvector.

## Next Recommended Phases

1. Add production EF migration workflow for non-SQLite deployments.
2. Add pgvector semantic search for richer book matching.
3. Add advanced librarian CRUD forms for book copies and inventory audits.
4. Add automated Playwright end-to-end tests for checkout, auth, admin, and AI settings.
5. Add payment provider integration when real purchase settlement is required.
