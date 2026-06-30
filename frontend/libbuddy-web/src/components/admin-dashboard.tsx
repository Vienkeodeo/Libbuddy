"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Bot,
  Check,
  Download,
  FileText,
  LayoutDashboard,
  LibraryBig,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle
} from "lucide-react";
import { BookCover } from "@/components/book-cover";
import type { Book } from "@/lib/library-ui-data";
import {
  fetchBooks,
  fetchAiProviderSettings,
  fetchBorrowRecords,
  fetchCheckoutOrders,
  fetchDashboardReport,
  fetchMe,
  fetchReaders,
  getStoredUser,
  mapBookDtoToBook,
  refreshAllBookCovers,
  refreshBookCover,
  updateAiProviderSettings,
  type AiProviderSettingsDto,
  updateCheckoutOrderStatus,
  type BorrowRecordDto,
  type CheckoutOrderDto,
  type CurrentUser,
  type DashboardReportDto,
  type ReaderDto
} from "@/lib/api";

type AdminTab = "overview" | "inventory" | "readers" | "loans" | "ai" | "reports" | "settings";

const tabs = [
  { key: "overview" as AdminTab, label: "Tổng quan", icon: LayoutDashboard, description: "Nhịp vận hành thư viện trong ngày" },
  { key: "inventory" as AdminTab, label: "Kho sách", icon: BookOpen, description: "Đầu sách, số bản và vị trí kệ" },
  { key: "readers" as AdminTab, label: "Độc giả", icon: Users, description: "Hồ sơ và trạng thái mượn sách" },
  { key: "loans" as AdminTab, label: "Mượn trả", icon: FileText, description: "Đơn thuê/mua, phiếu mượn và quá hạn" },
  { key: "ai" as AdminTab, label: "AI tư vấn", icon: Bot, description: "Nhu cầu đọc và gợi ý nổi bật" },
  { key: "reports" as AdminTab, label: "Báo cáo", icon: BarChart3, description: "Xuất nhanh dữ liệu vận hành" },
  { key: "settings" as AdminTab, label: "Cài đặt", icon: Settings, description: "Chính sách hiển thị cho thư viện" }
];

const adminRoles = ["Admin", "Librarian"];

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [query, setQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [report, setReport] = useState<DashboardReportDto | null>(null);
  const [catalog, setCatalog] = useState<Book[]>([]);
  const [readers, setReaders] = useState<ReaderDto[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecordDto[]>([]);
  const [orders, setOrders] = useState<CheckoutOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const active = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const isAuthorized = Boolean(currentUser?.roles.some((role) => adminRoles.includes(role)));

  const loadAdminData = useCallback(async () => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setActionMessage("");
    try {
      const [bookResult, dashboardReport, readerResult, borrowResult, orderResult] = await Promise.all([
        fetchBooks(),
        fetchDashboardReport(),
        fetchReaders(),
        fetchBorrowRecords(),
        fetchCheckoutOrders()
      ]);
      const mappedBooks = bookResult.items.map(mapBookDtoToBook);
      setCatalog(mappedBooks);
      setReport(dashboardReport);
      setReaders(readerResult);
      setBorrowRecords(borrowResult);
      setOrders(orderResult);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Không thể tải dữ liệu quản trị.");
    } finally {
      setLoading(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    const syncUser = () => setCurrentUser(getStoredUser());
    syncUser();
    fetchMe()
      .then((user) => setCurrentUser(user))
      .catch(() => undefined);
    window.addEventListener("storage", syncUser);
    window.addEventListener("libbuddy:session", syncUser);
    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("libbuddy:session", syncUser);
    };
  }, []);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  async function handleOrderStatus(order: CheckoutOrderDto, status: string, paymentStatus = order.paymentStatus) {
    setActionMessage("");
    try {
      const updated = await updateCheckoutOrderStatus(order.id, { status, paymentStatus });
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setActionMessage(`Đã cập nhật ${updated.orderCode} sang ${translateOrderStatus(updated.status)}.`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Không thể cập nhật trạng thái đơn.");
    }
  }

  if (!currentUser || !isAuthorized) {
    return (
      <div className="lb-page">
        <main className="mx-auto grid min-h-screen w-full max-w-[980px] place-items-center px-5 py-10">
          <section className="lb-panel p-7 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-white">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h1 className="mt-5 text-3xl font-extrabold text-slate-950">Khu vực quản trị Libbuddy</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Đăng nhập bằng tài khoản quản trị hoặc thủ thư để xử lý kho sách, độc giả và đơn thuê/mua.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/login" className="inline-flex h-11 items-center justify-center lb-btn-primary px-5 text-sm font-bold">
                Đăng nhập quản trị
              </Link>
              <Link href="/" className="inline-flex h-11 items-center justify-center lb-btn-ghost px-5 text-sm font-bold">
                Về giao diện khách hàng
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="lb-page">
      <div className="mx-auto grid max-w-[1500px] gap-6 px-5 py-6 lg:grid-cols-[248px_1fr] lg:px-9">
        <aside className="hidden rounded-lg border border-slate-900 bg-slate-950 p-3 text-white shadow-sm lg:block">
          <div className="flex items-center gap-3 px-2 py-4">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-600">
              <LibraryBig className="h-5 w-5" />
            </span>
            <div>
              <span className="block text-sm font-bold">Quản trị Libbuddy</span>
              <span className="text-xs text-slate-400">{currentUser.fullName}</span>
            </div>
          </div>
          <nav className="mt-3 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold transition ${
                    selected ? "bg-white text-slate-950 shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
          <Link
            href="/"
            className="mt-5 flex h-10 items-center justify-center rounded-md border border-white/15 text-sm font-bold text-slate-200 hover:bg-white/10 hover:text-white"
          >
            Về giao diện khách hàng
          </Link>
        </aside>

        <main className="min-w-0 space-y-5">
          <section className="lb-panel p-6">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <h1 className="text-4xl font-extrabold leading-[1.14] tracking-normal text-slate-950">{active.label}</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">{active.description}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm sách, độc giả, mã đơn..."
                    className="h-10 w-full lb-input pl-9 pr-3 text-sm sm:w-80"
                  />
                </label>
                <button
                  type="button"
                  onClick={loadAdminData}
                  className="inline-flex h-10 items-center justify-center gap-2 lb-btn-primary px-4 text-sm font-bold"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Làm mới
                </button>
              </div>
            </div>
            <div className="mt-5 flex gap-2 overflow-x-auto lg:hidden">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-bold ${
                      activeTab === tab.key
                        ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {actionMessage ? (
              <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-800">{actionMessage}</div>
            ) : null}
          </section>

          {loading ? <LoadingState /> : null}
          {!loading && activeTab === "overview" ? <OverviewTab report={report} books={catalog} orders={orders} records={borrowRecords} /> : null}
          {!loading && activeTab === "inventory" ? <InventoryTab books={catalog} query={query} onRefreshBook={loadAdminData} /> : null}
          {!loading && activeTab === "readers" ? <ReadersTab readers={readers} query={query} /> : null}
          {!loading && activeTab === "loans" ? (
            <LoansTab orders={orders} records={borrowRecords} query={query} onOrderStatus={handleOrderStatus} />
          ) : null}
          {!loading && activeTab === "ai" ? <AiTab report={report} /> : null}
          {!loading && activeTab === "reports" ? <ReportsTab report={report} books={catalog} readers={readers} orders={orders} records={borrowRecords} /> : null}
          {!loading && activeTab === "settings" ? <SettingsTab onRefreshAllCovers={loadAdminData} /> : null}
        </main>
      </div>
    </div>
  );
}

function OverviewTab({
  report,
  books,
  orders,
  records
}: {
  report: DashboardReportDto | null;
  books: Book[];
  orders: CheckoutOrderDto[];
  records: BorrowRecordDto[];
}) {
  const activeOrders = orders.filter((order) => order.status !== "Completed" && order.status !== "Cancelled");
  const metrics = [
    { label: "Đầu sách", value: String(report?.totalBooks ?? books.length), note: `${report?.availableCopies ?? 0} bản sẵn`, tone: "green" },
    { label: "Độc giả", value: String(report?.totalReaders ?? 0), note: "Đang hoạt động", tone: "blue" },
    { label: "Đơn cần xử lý", value: String(activeOrders.length), note: "Thuê/mua", tone: "amber" },
    { label: "Phiếu quá hạn", value: String(report?.overdueRecords ?? 0), note: "Cần nhắc", tone: report?.overdueRecords ? "amber" : "green" }
  ];

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((stat) => (
          <MetricCard key={stat.label} label={stat.label} value={stat.value} note={stat.note} tone={stat.tone} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Panel title="Sách được mượn nhiều" subtitle="Dựa trên phiếu mượn trong hệ thống.">
          <StackedBars
            items={(report?.topBorrowedBooks ?? []).map((item) => ({ label: item.title, value: item.count }))}
            emptyText="Chưa đủ dữ liệu mượn sách."
          />
        </Panel>
        <Panel title="Hàng chờ đơn" subtitle="Các đơn mới cần theo dõi.">
          <OrderQueue orders={activeOrders.slice(0, 4)} />
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Panel title="Kho sách gần đây" subtitle="Các đầu sách đang có trong catalog.">
          <BookRows items={books.slice(0, 6)} />
        </Panel>
        <Panel title="Phiếu mượn mới" subtitle="Theo dõi hạn trả gần nhất.">
          <BorrowRows records={records.slice(0, 4)} compact />
        </Panel>
      </section>
    </div>
  );
}

function InventoryTab({ books, query, onRefreshBook }: { books: Book[]; query: string; onRefreshBook?: () => void }) {
  const [category, setCategory] = useState("Tất cả");
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [refreshMessage, setRefreshMessage] = useState("");
  const categories = useMemo(() => ["Tất cả", ...Array.from(new Set(books.map((book) => book.category)))], [books]);
  const filtered = books.filter((book) => {
    const haystack = `${book.title} ${book.author} ${book.category} ${book.shelf}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (category === "Tất cả" || book.category === category);
  });
  const lowStock = books.filter((book) => book.available <= 2);

  async function handleRefreshCover(bookId: string) {
    setRefreshingId(bookId);
    setRefreshMessage("");
    try {
      await refreshBookCover(bookId);
      setRefreshMessage("Đã cập nhật bìa sách.");
      onRefreshBook?.();
    } catch (err) {
      setRefreshMessage(err instanceof Error ? err.message : "Không thể cập nhật bìa.");
    } finally {
      setRefreshingId(null);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Kho sách" subtitle="Theo dõi tình trạng còn bản và vị trí kệ.">
        {refreshMessage ? <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-800">{refreshMessage}</div> : null}
        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="rounded-lg border border-[var(--line)] bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
            {filtered.length} đầu sách phù hợp
          </div>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 lb-input px-3 text-sm font-semibold text-slate-700"
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <BookRows items={filtered} onRefreshCover={handleRefreshCover} refreshingId={refreshingId} />
      </Panel>
      <aside className="space-y-5">
        <Panel title="Tình trạng kho" subtitle="Số bản khả dụng theo catalog hiện tại.">
          <MetricStrip label="Tổng bản sách" value={String(books.reduce((sum, book) => sum + book.total, 0))} />
          <MetricStrip label="Bản sẵn sàng" value={String(books.reduce((sum, book) => sum + book.available, 0))} />
          <MetricStrip label="Sắp hết bản" value={String(lowStock.length)} />
        </Panel>
        <Panel title="Sách cần chú ý" subtitle="Hết bản hoặc còn rất ít.">
          <div className="space-y-3">
            {lowStock.length ? lowStock.map((book) => (
              <CompactBook key={book.id} title={book.title} detail={`Còn ${book.available}/${book.total} bản`} />
            )) : <EmptyText>Kho hiện không có đầu sách sắp hết bản.</EmptyText>}
          </div>
        </Panel>
      </aside>
    </section>
  );
}

function ReadersTab({ readers, query }: { readers: ReaderDto[]; query: string }) {
  const filtered = readers.filter((reader) =>
    `${reader.fullName} ${reader.email} ${reader.phone ?? ""} ${reader.status}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Danh sách độc giả" subtitle="Đọc trạng thái trực tiếp từ hệ thống tài khoản.">
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((reader) => (
            <article key={reader.id} className="lb-surface-flat p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-400">{reader.id.slice(0, 8).toUpperCase()}</p>
                  <h3 className="mt-1 truncate text-lg font-bold text-slate-950">{reader.fullName}</h3>
                  <p className="truncate text-sm text-slate-500">{reader.email}</p>
                  {reader.phone ? <p className="mt-1 text-sm text-slate-500">{reader.phone}</p> : null}
                </div>
                <Badge tone={reader.status === "Active" ? "green" : "amber"}>{translateUserStatus(reader.status)}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <MiniStat label="Đang mượn" value={reader.activeBorrows} />
                <MiniStat label="Trạng thái" value={reader.status === "Active" ? 1 : 0} />
              </div>
            </article>
          ))}
          {filtered.length === 0 ? <EmptyText>Không tìm thấy độc giả phù hợp.</EmptyText> : null}
        </div>
      </Panel>
      <Panel title="Tổng quan độc giả" subtitle="Các con số cần theo dõi.">
        <MetricStrip label="Độc giả hoạt động" value={`${readers.filter((reader) => reader.status === "Active").length}/${readers.length}`} />
        <MetricStrip label="Đang có sách" value={String(readers.filter((reader) => reader.activeBorrows > 0).length)} />
        <MetricStrip label="Cần chăm sóc" value={String(readers.filter((reader) => reader.status !== "Active").length)} />
      </Panel>
    </section>
  );
}

function LoansTab({
  orders,
  records,
  query,
  onOrderStatus
}: {
  orders: CheckoutOrderDto[];
  records: BorrowRecordDto[];
  query: string;
  onOrderStatus: (order: CheckoutOrderDto, status: string, paymentStatus?: string) => void;
}) {
  const filteredOrders = orders.filter((order) =>
    `${order.orderCode} ${order.readerName} ${order.status} ${order.items.map((item) => item.bookTitle).join(" ")}`.toLowerCase().includes(query.toLowerCase())
  );
  const filteredRecords = records.filter((record) =>
    `${record.readerName} ${record.status} ${record.items.map((item) => item.bookTitle).join(" ")}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <Panel title="Đơn thuê/mua" subtitle="Xác nhận, hoàn tất hoặc hủy đơn cho khách hàng.">
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} onOrderStatus={onOrderStatus} />
          ))}
          {filteredOrders.length === 0 ? <EmptyText>Chưa có đơn thuê/mua phù hợp.</EmptyText> : null}
        </div>
      </Panel>
      <Panel title="Phiếu mượn" subtitle="Theo dõi sách đang mượn và hạn trả.">
        <BorrowRows records={filteredRecords} />
      </Panel>
    </section>
  );
}

function AiTab({ report }: { report: DashboardReportDto | null }) {
  const needs = report?.popularNeeds ?? [];
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <Panel title="Nhu cầu nổi bật từ AI" subtitle="Các chủ đề độc giả đang hỏi nhiều.">
        <div className="grid gap-4 md:grid-cols-3">
          {needs.map((need) => (
            <article key={need.topic} className="lb-surface-flat p-4">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h3 className="mt-4 text-lg font-bold text-slate-950">{need.topic}</h3>
              <p className="mt-1 text-sm text-slate-500">{need.count} lượt hỏi</p>
              <Bar value={need.count} max={Math.max(...needs.map((item) => item.count), 1)} color="#2563eb" />
            </article>
          ))}
          {needs.length === 0 ? <EmptyText>Chưa có đủ hội thoại AI để tổng hợp nhu cầu.</EmptyText> : null}
        </div>
      </Panel>
      <Panel title="Tín hiệu vận hành" subtitle="Dùng để bổ sung đầu sách phù hợp.">
        <MetricStrip label="Hội thoại AI" value={String(report?.aiConversations ?? 0)} />
        <MetricStrip label="Chủ đề nổi bật" value={needs[0]?.topic ?? "Đang cập nhật"} />
        <Link href="/ai-advisor" className="mt-3 inline-flex h-10 items-center justify-center lb-btn-secondary px-4 text-sm font-bold">
          Mở AI tư vấn
        </Link>
      </Panel>
    </section>
  );
}

function ReportsTab({
  report,
  books,
  readers,
  orders,
  records
}: {
  report: DashboardReportDto | null;
  books: Book[];
  readers: ReaderDto[];
  orders: CheckoutOrderDto[];
  records: BorrowRecordDto[];
}) {
  const categories = report?.popularCategories ?? [];

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-5">
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Bản sách" value={String(report?.totalCopies ?? 0)} note={`${report?.borrowedCopies ?? 0} đang mượn`} tone="blue" />
          <MetricCard label="Đơn thuê/mua" value={String(orders.length)} note="Từ checkout" tone="green" />
          <MetricCard label="Phiếu mượn" value={String(records.length)} note={`${report?.overdueRecords ?? 0} quá hạn`} tone="amber" />
        </section>
        <Panel title="Nhu cầu theo thể loại" subtitle="Dựa trên catalog và lịch sử mượn.">
          <StackedBars
            items={categories.map((item) => ({ label: item.name, value: item.count }))}
            emptyText="Chưa có đủ dữ liệu thể loại."
          />
        </Panel>
      </div>
      <Panel title="Xuất dữ liệu" subtitle="Tạo file CSV nhanh cho vận hành.">
        <ExportButton
          label="Xuất kho sách"
          onClick={() => downloadCsv("libbuddy-books.csv", books.map((book) => ({
            title: book.title,
            author: book.author,
            category: book.category,
            available: book.available,
            total: book.total,
            shelf: book.shelf
          })))}
        />
        <ExportButton
          label="Xuất độc giả"
          onClick={() => downloadCsv("libbuddy-readers.csv", readers.map((reader) => ({
            fullName: reader.fullName,
            email: reader.email,
            phone: reader.phone ?? "",
            status: reader.status,
            activeBorrows: reader.activeBorrows
          })))}
        />
        <ExportButton
          label="Xuất đơn thuê mua"
          onClick={() => downloadCsv("libbuddy-orders.csv", orders.map((order) => ({
            orderCode: order.orderCode,
            reader: order.readerName,
            type: order.type,
            status: order.status,
            totalAmount: order.totalAmount,
            createdAt: order.createdAt
          })))}
        />
      </Panel>
    </section>
  );
}

function SettingsTab({ onRefreshAllCovers }: { onRefreshAllCovers?: () => void }) {
  const [settings, setSettings] = useState({
    pickupHold: true,
    dueReminder: true,
    aiAdvisor: true
  });
  const [aiSettings, setAiSettings] = useState<AiProviderSettingsDto | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [aiSaving, setAiSaving] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [bulkRefreshing, setBulkRefreshing] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");

  useEffect(() => {
    fetchAiProviderSettings()
      .then((data) => {
        setAiSettings(data);
        setModel(data.model);
      })
      .catch((error) => {
        setAiMessage(error instanceof Error ? error.message : "Không thể tải cấu hình chatbot.");
      });
  }, []);

  async function handleAiSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAiSaving(true);
    setAiMessage("");
    try {
      const updated = await updateAiProviderSettings({
        apiKey: apiKey.trim() || undefined,
        model: model.trim() || undefined,
        clearApiKey: false
      });
      setAiSettings(updated);
      setModel(updated.model);
      setApiKey("");
      setAiMessage(updated.hasApiKey ? "Đã lưu API key. Chatbot sẽ ưu tiên dùng OpenAI cho câu trả lời mới." : "Đã lưu model, nhưng chưa có API key.");
    } catch (error) {
      setAiMessage(error instanceof Error ? error.message : "Không thể lưu cấu hình chatbot.");
    } finally {
      setAiSaving(false);
    }
  }

  async function handleClearAiKey() {
    setAiSaving(true);
    setAiMessage("");
    try {
      const updated = await updateAiProviderSettings({ model, clearApiKey: true });
      setAiSettings(updated);
      setApiKey("");
      setAiMessage(updated.hasApiKey ? "Đã xóa key runtime, hệ thống đang dùng key từ cấu hình máy chủ." : "Đã xóa API key runtime.");
    } catch (error) {
      setAiMessage(error instanceof Error ? error.message : "Không thể xóa API key.");
    } finally {
      setAiSaving(false);
    }
  }

  async function handleBulkRefreshCovers() {
    setBulkRefreshing(true);
    setBulkMessage("");
    try {
      const result = await refreshAllBookCovers();
      const count = result.refreshed ?? 0;
      setBulkMessage(`Đã cập nhật ${count} bìa sách. Có thể cần tải lại trang để xem thay đổi.`);
      onRefreshAllCovers?.();
    } catch (error) {
      setBulkMessage(error instanceof Error ? error.message : "Không thể làm mới bìa sách.");
    } finally {
      setBulkRefreshing(false);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-5">
        <Panel title="Chatbot AI" subtitle="Nhập OpenAI API key để Libbuddy AI trả lời bằng model thật.">
          <form onSubmit={handleAiSubmit} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={aiSettings?.hasApiKey ? "green" : "amber"}>
                {aiSettings?.hasApiKey ? "Đã cấu hình" : "Chưa có API key"}
              </Badge>
              {aiSettings?.keyPreview ? <span className="text-sm font-semibold text-slate-500">{aiSettings.keyPreview}</span> : null}
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{aiSettings?.model ?? model}</span>
            </div>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">OpenAI API key</span>
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                type="password"
                autoComplete="off"
                placeholder="sk-..."
                className="mt-2 h-11 w-full lb-input px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Model chatbot</span>
              <input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="gpt-4.1-mini"
                className="mt-2 h-11 w-full lb-input px-3 text-sm"
              />
            </label>
            {aiMessage ? <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-800">{aiMessage}</div> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button disabled={aiSaving} className="inline-flex h-10 items-center justify-center gap-2 lb-btn-primary px-4 text-sm font-bold disabled:bg-slate-300">
                <Check className="h-4 w-4" />
                {aiSaving ? "Đang lưu..." : "Lưu cấu hình"}
              </button>
              <button
                type="button"
                disabled={aiSaving || !aiSettings?.hasApiKey}
                onClick={handleClearAiKey}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-rose-200 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Xóa key
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Chính sách thư viện" subtitle="Các quy tắc hiển thị trong luồng khách hàng.">
          <div className="grid gap-4 md:grid-cols-3">
            <PolicyCard label="Thời hạn mượn" value="14 ngày" note="Tạo phiếu mượn và hạn trả tự động khi khách thuê/mượn." />
            <PolicyCard label="Giữ sách tại quầy" value="24 giờ" note="Đơn nhận tại thư viện chuyển sang sẵn sàng để lấy." />
            <PolicyCard label="Cọc thuê sách" value="50.000đ" note="Tính cùng đơn thuê/mượn và hoàn trả khi sách đủ điều kiện." />
          </div>
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-bold text-slate-950">Tải lại bìa sách</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">Gọi Open Library Covers API để lấy bìa thật cho tất cả sách chưa có hình.</p>
            {bulkMessage ? <div className="mt-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-blue-800">{bulkMessage}</div> : null}
            <button
              type="button"
              disabled={bulkRefreshing}
              onClick={handleBulkRefreshCovers}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-md border border-blue-300 bg-white px-4 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${bulkRefreshing ? "animate-spin" : ""}`} />
              {bulkRefreshing ? "Đang tải..." : "Tải lại tất cả bìa sách"}
            </button>
          </div>
        </Panel>
      </div>

      <Panel title="Tùy chọn vận hành" subtitle="Thiết lập cục bộ cho phiên quản trị hiện tại.">
        <ToggleRow
          label="Giữ sách tại quầy"
          checked={settings.pickupHold}
          onChange={() => setSettings((current) => ({ ...current, pickupHold: !current.pickupHold }))}
        />
        <ToggleRow
          label="Nhắc hạn trả"
          checked={settings.dueReminder}
          onChange={() => setSettings((current) => ({ ...current, dueReminder: !current.dueReminder }))}
        />
        <ToggleRow
          label="AI tư vấn"
          checked={settings.aiAdvisor}
          onChange={() => setSettings((current) => ({ ...current, aiAdvisor: !current.aiAdvisor }))}
        />
      </Panel>
    </section>
  );
}

function BookRows({ items, onRefreshCover, refreshingId }: { items: Book[]; onRefreshCover?: (bookId: string) => void; refreshingId?: string | null }) {
  return (
    <div className="space-y-3">
      {items.map((book) => (
        <div key={book.id} className="grid gap-3 lb-surface-flat p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <BookCover book={book} size="sm" />
          <div className="min-w-0">
            <h3 className="truncate font-bold text-slate-950">{book.title}</h3>
            <p className="truncate text-sm text-slate-500">
              {book.author} · {book.category}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">{book.shelf}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={book.available > 0 ? "green" : "amber"}>{book.available > 0 ? "Còn sẵn" : "Hết bản"}</Badge>
            <span className="text-sm font-bold text-slate-700">
              {book.available}/{book.total}
            </span>
            {onRefreshCover ? (
              <button
                type="button"
                onClick={() => onRefreshCover(book.id)}
                disabled={refreshingId === book.id}
                className="lb-btn-ghost inline-flex h-9 items-center gap-1 px-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                title="Làm mới bìa sách"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshingId === book.id ? "animate-spin" : ""}`} />
                Bìa
              </button>
            ) : null}
            <Link href={`/books?focus=${book.id}`} className="inline-flex h-9 items-center lb-btn-ghost px-3 text-sm font-bold">
              Xem
            </Link>
          </div>
        </div>
      ))}
      {items.length === 0 ? <EmptyText>Không có sách phù hợp.</EmptyText> : null}
    </div>
  );
}

function OrderCard({
  order,
  onOrderStatus
}: {
  order: CheckoutOrderDto;
  onOrderStatus: (order: CheckoutOrderDto, status: string, paymentStatus?: string) => void;
}) {
  const canComplete = order.status !== "Completed" && order.status !== "Cancelled";
  const canCancel = order.status !== "Completed" && order.status !== "Cancelled";

  return (
    <article className="lb-surface-flat p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400">{order.orderCode}</p>
          <h3 className="mt-1 truncate font-bold text-slate-950">{order.items.map((item) => item.bookTitle).join(", ")}</h3>
          <p className="text-sm text-slate-500">
            {order.readerName} · {order.type === "Rent" ? "Thuê/Mượn" : "Mua"} · {order.fulfillmentMethod === "Pickup" ? "Tại thư viện" : "Giao tận nơi"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <Badge tone={order.status === "Completed" ? "green" : order.status === "Cancelled" ? "amber" : "blue"}>
            {translateOrderStatus(order.status)}
          </Badge>
          <span className="text-sm font-bold text-emerald-700">{formatCurrency(order.totalAmount)}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {canComplete ? (
          <button
            type="button"
            onClick={() => onOrderStatus(order, "Completed", "Paid")}
            className="inline-flex h-9 items-center gap-2 lb-btn-primary px-3 text-sm font-bold"
          >
            <Check className="h-4 w-4" />
            Hoàn tất
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            onClick={() => onOrderStatus(order, "Cancelled")}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-rose-200 px-3 text-sm font-bold text-rose-700 hover:bg-rose-50"
          >
            <XCircle className="h-4 w-4" />
            Hủy
          </button>
        ) : null}
      </div>
    </article>
  );
}

function OrderQueue({ orders }: { orders: CheckoutOrderDto[] }) {
  return (
    <div className="space-y-3">
      {orders.length ? orders.map((order) => (
        <div key={order.id} className="lb-surface-flat p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-slate-950">{order.readerName}</p>
              <p className="text-sm text-slate-500">{order.items.map((item) => item.bookTitle).join(", ")}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateTime(order.createdAt)}</p>
            </div>
            <Badge tone="blue">{translateOrderStatus(order.status)}</Badge>
          </div>
        </div>
      )) : <EmptyText>Không có đơn đang chờ xử lý.</EmptyText>}
    </div>
  );
}

function BorrowRows({ records, compact = false }: { records: BorrowRecordDto[]; compact?: boolean }) {
  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div key={record.id} className="grid gap-3 lb-surface-flat p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-400">{record.id.slice(0, 8).toUpperCase()}</p>
            <h3 className="mt-1 truncate font-bold text-slate-950">{record.items.map((item) => item.bookTitle).join(", ")}</h3>
            <p className="text-sm text-slate-500">
              {record.readerName} · hạn {formatDate(record.dueDate)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={record.isOverdue ? "amber" : "green"}>{record.isOverdue ? "Quá hạn" : translateBorrowStatus(record.status)}</Badge>
            {!compact ? <span className="text-sm font-bold text-slate-700">{record.items.length} bản</span> : null}
          </div>
        </div>
      ))}
      {records.length === 0 ? <EmptyText>Không có phiếu mượn phù hợp.</EmptyText> : null}
    </div>
  );
}

function StackedBars({ items, emptyText }: { items: { label: string; value: number }[]; emptyText: string }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  if (items.length === 0) {
    return <EmptyText>{emptyText}</EmptyText>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold text-slate-700">{item.label}</span>
            <span className="font-semibold text-slate-500">{item.value}</span>
          </div>
          <Bar value={item.value} max={max} color="#047857" />
        </div>
      ))}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="lb-surface">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function MetricCard({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  const toneClass = tone === "amber" ? "bg-amber-50 text-amber-700" : tone === "blue" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700";
  return (
    <div className="lb-surface p-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <span className="text-3xl font-bold text-slate-950">{value}</span>
        <span className={`rounded-md px-2 py-1 text-xs font-bold ${toneClass}`}>{note}</span>
      </div>
    </div>
  );
}

function Badge({ tone, children }: { tone: "green" | "amber" | "blue"; children: ReactNode }) {
  const toneClass =
    tone === "amber" ? "bg-amber-50 text-amber-700" : tone === "blue" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700";
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${toneClass}`}>{children}</span>;
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="lb-muted-box px-3 py-2">
      <p className="text-lg font-bold text-slate-950">{value}</p>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function MetricStrip({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 flex items-center justify-between lb-muted-box px-3 py-3">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span className="text-lg font-bold text-slate-950">{value}</span>
    </div>
  );
}

function CompactBook({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="lb-muted-box p-3">
      <p className="font-bold text-slate-950">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function PolicyCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="lb-surface-flat p-4">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{note}</p>
    </article>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className="mb-3 flex w-full items-center justify-between lb-surface-flat p-3 text-left">
      <span className="text-sm font-bold text-slate-950">{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-emerald-600" : "bg-slate-300"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function ExportButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mb-3 flex w-full items-center gap-3 lb-surface-flat p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50">
      <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-slate-600">
        <Download className="h-4 w-4" />
      </span>
      <span className="block text-sm font-bold text-slate-950">{label}</span>
    </button>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="mt-3 h-3 rounded-full bg-slate-100">
      <div className="h-3 rounded-full" style={{ width: `${Math.max(8, (value / max) * 100)}%`, backgroundColor: color }} />
    </div>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-500">{children}</div>;
}

function LoadingState() {
  return (
    <section className="lb-surface p-8 text-center">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-700" />
      <p className="mt-3 text-sm font-semibold text-slate-600">Đang tải dữ liệu quản trị...</p>
    </section>
  );
}

function translateOrderStatus(status: string) {
  const map: Record<string, string> = {
    PendingPayment: "Chờ thanh toán",
    Confirmed: "Đã xác nhận",
    ReadyForPickup: "Sẵn sàng lấy",
    InProgress: "Đang xử lý",
    Completed: "Hoàn tất",
    Cancelled: "Đã hủy"
  };
  return map[status] ?? status;
}

function translateBorrowStatus(status: string) {
  const map: Record<string, string> = {
    Pending: "Chờ xử lý",
    Borrowing: "Đang mượn",
    Returned: "Đã trả",
    Overdue: "Quá hạn",
    Cancelled: "Đã hủy",
    Lost: "Mất sách"
  };
  return map[status] ?? status;
}

function translateUserStatus(status: string) {
  const map: Record<string, string> = {
    Active: "Hoạt động",
    Locked: "Đã khóa",
    Inactive: "Tạm ngưng",
    Deleted: "Đã xóa"
  };
  return map[status] ?? status;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number) {
  const text = String(value);
  return `"${text.replaceAll("\"", "\"\"")}"`;
}
