import type { Book } from "@/lib/library-ui-data";

// At build time, Next.js inlines NEXT_PUBLIC_* env vars. When `output: "export"`
// is used with newer Next.js, the env var may not be inlined, so we fall back to
// the production Render URL by default. For local dev / preview overrides, set
// NEXT_PUBLIC_API_BASE_URL explicitly in `.env.local`.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://libbuddy-api.onrender.com/api";
const TOKEN_KEY = "libbuddy.accessToken";
const USER_KEY = "libbuddy.currentUser";
const COOKIE_TOKEN_KEY = "libbuddy_token";
const SESSION_EVENT = "libbuddy:session";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
};

export type AuthResponse = {
  accessToken: string;
  user: CurrentUser;
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type BookListItemDto = {
  id: string;
  title: string;
  authors: string[];
  categories: string[];
  coverImageUrl?: string | null;
  description?: string | null;
  difficultyLevel?: string | null;
  readingTimeLevel?: string | null;
  targetAudience?: string | null;
  status: string;
  totalCopies: number;
  availableCopies: number;
  shelfLocation?: string | null;
};

export type BorrowRecordDto = {
  id: string;
  userId: string;
  readerName: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string | null;
  status: string;
  isOverdue: boolean;
  items: BorrowRecordItemDto[];
};

export type BorrowRecordItemDto = {
  id: string;
  bookCopyId: string;
  copyCode: string;
  bookTitle: string;
  returnCondition?: string | null;
  returnDate?: string | null;
  fineAmount: number;
};

export type CheckoutOrderDto = {
  id: string;
  orderCode: string;
  userId: string;
  readerName: string;
  type: "Rent" | "Purchase";
  fulfillmentMethod: "Pickup" | "Delivery";
  status: string;
  paymentStatus: string;
  rentalFee: number;
  depositAmount: number;
  purchaseAmount: number;
  deliveryFee: number;
  totalAmount: number;
  currency: string;
  deliveryAddress?: string | null;
  borrowRecordId?: string | null;
  createdAt: string;
  items: CheckoutOrderItemDto[];
};

export type CheckoutOrderItemDto = {
  id: string;
  bookId: string;
  bookTitle: string;
  bookCopyId?: string | null;
  copyCode?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type ReaderDto = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  status: string;
  activeBorrows: number;
};

export type AdminUserDto = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  status: string;
  createdAt: string;
  roles: string[];
};

export type AdminUserDetailDto = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  status: string;
  createdAt: string;
  roles: string[];
  totalBorrows: number;
  activeBorrows: number;
};

export type UpsertBookRequest = {
  title: string;
  subtitle?: string;
  isbn?: string;
  description?: string;
  summary?: string;
  language?: string;
  publishedYear?: number;
  publisherName?: string;
  authorNames: string[];
  categoryNames: string[];
  difficultyLevel?: string;
  readingTimeLevel?: string;
  targetAudience?: string;
  coverImageUrl?: string;
};

export type CategoryDto = {
  id: string;
  name: string;
  createdAt: string;
};

export type ShelfDto = {
  id: string;
  area?: string | null;
  floor: string;
  shelfCode: string;
  sectionCode?: string | null;
  description?: string | null;
};

export type TopBookDto = {
  title: string;
  count: number;
};

export type CategoryReportDto = {
  name: string;
  count: number;
};

export type AiNeedDto = {
  topic: string;
  count: number;
};

export type DashboardReportDto = {
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  overdueRecords: number;
  totalReaders: number;
  aiConversations: number;
  topBorrowedBooks: TopBookDto[];
  popularCategories: CategoryReportDto[];
  popularNeeds: AiNeedDto[];
};

export type AiChatResponse = {
  conversationId: string;
  needSummary: string;
  needStatus: string;
  reply: string;
  followUpQuestion?: string | null;
  recommendedBooks: RecommendedBookDto[];
};

export type RecommendedBookDto = {
  bookId: string;
  title: string;
  reason: string;
  score: number;
  availability: string;
};

export type AiProviderSettingsDto = {
  hasApiKey: boolean;
  keyPreview?: string | null;
  model: string;
  source: string;
  updatedAt?: string | null;
};

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): CurrentUser | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

export function storeSession(auth: AuthResponse) {
  window.localStorage.setItem(TOKEN_KEY, auth.accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: auth.user }));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: null }));
}

export function logout() {
  fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
  clearSession();
}

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    let message = `Yêu cầu thất bại (${response.status})`;
    try {
      const body = (await response.json()) as Partial<ApiResponse<unknown>>;
      message = body.message ?? message;
    } catch {
      // Keep default message.
    }
    throw new Error(message);
  }

  const body = (await response.json()) as ApiResponse<T>;
  return body.data;
}

export function login(email: string, password: string) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function register(fullName: string, email: string, password: string, phone?: string) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ fullName, email, password, phone })
  });
}

export function fetchMe() {
  return apiRequest<CurrentUser>("/auth/me");
}

export function fetchBooks(params: { keyword?: string; category?: string; difficulty?: string; availableOnly?: boolean } = {}) {
  const query = new URLSearchParams();
  if (params.keyword) {
    query.set("keyword", params.keyword);
  }
  if (params.category && params.category !== "Tất cả") {
    query.set("category", params.category);
  }
  if (params.difficulty && params.difficulty !== "Tất cả") {
    query.set("difficulty", toApiDifficulty(params.difficulty));
  }
  if (params.availableOnly) {
    query.set("availableOnly", "true");
  }
  query.set("pageSize", "60");
  return apiRequest<PaginatedResult<BookListItemDto>>(`/books?${query.toString()}`);
}

export function fetchMyBorrowRecords() {
  return apiRequest<BorrowRecordDto[]>("/borrow-records/my");
}

export function fetchMyOrders() {
  return apiRequest<CheckoutOrderDto[]>("/checkout/orders/my");
}

export function fetchCheckoutOrders() {
  return apiRequest<CheckoutOrderDto[]>("/checkout/orders");
}

export function updateCheckoutOrderStatus(
  id: string,
  input: { status: string; paymentStatus?: string }
) {
  return apiRequest<CheckoutOrderDto>(`/checkout/orders/${id}/status`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function fetchBorrowRecords() {
  return apiRequest<BorrowRecordDto[]>("/borrow-records");
}

export function fetchReaders() {
  return apiRequest<ReaderDto[]>("/users");
}

export function fetchDashboardReport() {
  return apiRequest<DashboardReportDto>("/reports/dashboard");
}

export function chatWithAi(input: { conversationId?: string; userId?: string; message: string }) {
  return apiRequest<AiChatResponse>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({
      conversationId: input.conversationId,
      userId: input.userId,
      message: input.message
    })
  });
}

export function fetchAiProviderSettings() {
  return apiRequest<AiProviderSettingsDto>("/settings/ai");
}

export function updateAiProviderSettings(input: { apiKey?: string; model?: string; clearApiKey?: boolean }) {
  return apiRequest<AiProviderSettingsDto>("/settings/ai", {
    method: "POST",
    body: JSON.stringify({
      apiKey: input.apiKey,
      model: input.model,
      clearApiKey: input.clearApiKey ?? false
    })
  });
}

export type RefreshCoverResult = {
  url?: string | null;
  refreshed?: number;
};

export function refreshBookCover(bookId: string) {
  return apiRequest<RefreshCoverResult>(`/admin/books/${bookId}/refresh-cover`, { method: "POST" });
}

export function refreshAllBookCovers() {
  return apiRequest<RefreshCoverResult>("/admin/books/refresh-covers-all", { method: "POST" });
}

export function createCheckoutOrder(input: {
  bookId: string;
  type: "Rent" | "Purchase";
  fulfillmentMethod: "Pickup" | "Delivery";
  deliveryAddress?: string;
  note?: string;
}) {
  return apiRequest<CheckoutOrderDto>("/checkout/orders", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

// ─── Admin API ─────────────────────────────────────────────────────────────────

export function fetchAdminUsers() {
  return apiRequest<AdminUserDto[]>("/admin/users");
}

export function fetchAdminUserDetail(id: string) {
  return apiRequest<AdminUserDetailDto>(`/admin/users/${id}`);
}

export function createAdminUser(input: {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  roleNames: string[];
}) {
  return apiRequest<AdminUserDto>("/admin/users", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateAdminUser(
  id: string,
  input: {
    fullName?: string;
    phone?: string;
    status?: string;
    roleNames?: string[];
  }
) {
  return apiRequest(`/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export function deleteAdminUser(id: string) {
  return apiRequest(`/admin/users/${id}`, { method: "DELETE" });
}

export function fetchAdminBorrowRecords(params?: {
  status?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
}) {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.userId) query.set("userId", params.userId);
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  return apiRequest<PaginatedResult<BorrowRecordDto>>(`/admin/borrow-records?${query.toString()}`);
}

export function fetchAdminCategories() {
  return apiRequest<CategoryDto[]>("/admin/categories");
}

export function createAdminCategory(name: string) {
  return apiRequest<CategoryDto>("/admin/categories", {
    method: "POST",
    body: JSON.stringify({ name })
  });
}

export function deleteAdminCategory(id: string) {
  return apiRequest(`/admin/categories/${id}`, { method: "DELETE" });
}

export function fetchAdminShelves() {
  return apiRequest<ShelfDto[]>("/admin/shelves");
}

export function createAdminShelf(input: {
  area?: string;
  floor: string;
  shelfCode: string;
  sectionCode?: string;
  description?: string;
}) {
  return apiRequest<ShelfDto>("/admin/shelves", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateAdminShelf(
  id: string,
  input: {
    area?: string;
    floor: string;
    shelfCode: string;
    sectionCode?: string;
    description?: string;
  }
) {
  return apiRequest(`/admin/shelves/${id}`, {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export function createBook(input: UpsertBookRequest) {
  return apiRequest<unknown>("/books", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateBook(id: string, input: UpsertBookRequest) {
  return apiRequest(`/books/${id}`, {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export function deleteBook(id: string) {
  return apiRequest(`/books/${id}`, { method: "DELETE" });
}

export function mapBookDtoToBook(dto: BookListItemDto): Book {
  const category = dto.categories[0] ?? "Chưa phân loại";

  return {
    id: dto.id,
    title: dto.title,
    author: dto.authors.join(", ") || "Chưa rõ tác giả",
    category,
    difficulty: fromApiDifficulty(dto.difficultyLevel),
    readingTime: fromApiReadingTime(dto.readingTimeLevel),
    available: dto.availableCopies,
    total: dto.totalCopies,
    shelf: dto.shelfLocation ?? "Đang cập nhật vị trí",
    description: dto.description ?? "Sách đang được thư viện cập nhật mô tả chi tiết.",
    audience: dto.targetAudience ?? "Độc giả Libbuddy",
    coverImageUrl: dto.coverImageUrl,
  };
}

function toApiDifficulty(value: string) {
  if (value === "Dễ đọc") {
    return "Easy";
  }
  if (value === "Vừa phải") {
    return "Medium";
  }
  if (value === "Chuyên sâu") {
    return "Hard";
  }
  return value;
}

function fromApiDifficulty(value?: string | null): Book["difficulty"] {
  if (value === "Medium") {
    return "Vừa phải";
  }
  if (value === "Hard") {
    return "Chuyên sâu";
  }
  return "Dễ đọc";
}

function fromApiReadingTime(value?: string | null): Book["readingTime"] {
  if (value === "Short") {
    return "Ngắn";
  }
  if (value === "Long") {
    return "Dài";
  }
  return "Vừa";
}
// Tue Jun 30 14:32:37 +07 2026
