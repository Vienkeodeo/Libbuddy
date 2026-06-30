# Libbuddy - chay he thong that

Libbuddy co frontend Next.js va backend ASP.NET Core 10 API. Moi luong chinh co the chay ngay bang SQLite local, khong can Docker.

## 1. Dich vu can chay

- Frontend: `http://localhost:3001`
- Backend API: `http://localhost:5086`
- SQLite dev DB: `backend/Libbuddy.Api/data/libbuddy.local.db`
- PostgreSQL/pgvector: tuy chon neu muon chay production-like

## 2. Tai khoan seed

Backend tu tao database va seed du lieu khi `Database:SeedOnStartup=true`.

- Admin: `admin@libbuddy.local` / `Admin@123456`
- Thu thu: `librarian@libbuddy.local` / `Librarian@123456`
- Doc gia: `reader@libbuddy.local` / `Reader@123456`

## 3. Chay backend

```bash
dotnet run --project backend/Libbuddy.Api/Libbuddy.Api.csproj --urls http://localhost:5086
```

Kiem tra:

```bash
curl http://localhost:5086/api/health
curl "http://localhost:5086/api/books?pageSize=5"
```

## 4. Chay frontend

```bash
cd frontend/libbuddy-web
npm install
npm run dev -- --port 3001
```

Frontend mac dinh goi API:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:5086/api
```

## 5. Cau hinh chatbot OpenAI

1. Dang nhap admin tai `/login`.
2. Vao `/admin`.
3. Mo tab `Cai dat`.
4. Tai panel `Chatbot AI`, nhap OpenAI API key va model.
5. Bam `Luu cau hinh`.

Key duoc luu cuc bo tai:

```text
backend/Libbuddy.Api/data/libbuddy.ai-settings.json
```

File nay da duoc gitignore. API khong tra lai key tho cho frontend, chi tra trang thai da cau hinh va phan duoi key.

## 6. Luong that can test

1. Vao `/login`, dang nhap bang `reader@libbuddy.local` / `Reader@123456`.
2. Vao `/books`, chon sach tu database.
3. Bam `Thue/Muon sach` hoac `Mua ban ca nhan`.
4. Xac nhan tai `/checkout`.
5. Vao `/my-books` de xem borrow records va orders tu backend.
6. Dang nhap admin, vao `/admin`, tab `Muon tra` de xu ly don.
7. Vao `/ai-advisor`, hoi chatbot. Neu da nhap OpenAI API key, cau tra loi se dung OpenAI; neu chua, he thong fallback bang engine noi bo.

## 7. PostgreSQL tuy chon

Neu muon chay voi PostgreSQL/pgvector:

```bash
docker compose up -d
```

Sau do dat:

```json
{
  "Database": {
    "Provider": "Postgres"
  },
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=libbuddy_db;Username=libbuddy;Password=libbuddy_password;Timeout=3;Command Timeout=5"
  }
}
```
