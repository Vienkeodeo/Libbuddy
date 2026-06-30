"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookMarked,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  Layers3,
  Library,
  ListFilter,
  MapPin,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  TimerReset,
  WandSparkles
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BookCover } from "@/components/book-cover";
import {
  Book,
  catalogFallbackBooks,
  needChips,
} from "@/lib/library-ui-data";
import {
  chatWithAi,
  fetchBooks,
  fetchMyBorrowRecords,
  fetchMyOrders,
  getStoredUser,
  mapBookDtoToBook,
  type BorrowRecordDto,
  type CheckoutOrderDto
} from "@/lib/api";

type ChatMessage = {
  role: "reader" | "assistant";
  content: string;
};

const defaultMessages: ChatMessage[] = [
  {
    role: "assistant",
    content: "Chào bạn! Mình chỉ gợi ý sách có trong kho Libbuddy. Bạn đang muốn đọc về chủ đề gì?"
  }
];

export function CustomerExperience() {
  const [query, setQuery] = useState("");
  const [selectedNeed, setSelectedNeed] = useState("Quản lý thời gian");
  const [catalogBooks, setCatalogBooks] = useState<Book[]>(catalogFallbackBooks);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchBooks()
      .then((result) => {
        const mapped = result.items.map(mapBookDtoToBook);
        if (mapped.length) {
          setCatalogBooks(mapped);
        }
      })
      .catch(() => {
        setCatalogBooks(catalogFallbackBooks);
      });
  }, []);

  const recommendedBooks = useMemo(() => {
    const source = `${query} ${selectedNeed}`.toLowerCase();
    const scored = catalogBooks.map((book) => {
      const haystack = `${book.title} ${book.author} ${book.category} ${book.description} ${book.audience}`.toLowerCase();
      const score =
        source
          .split(/\s+/)
          .filter((word) => word.length > 2 && haystack.includes(word)).length +
        (haystack.includes(selectedNeed.toLowerCase()) ? 4 : 0) +
        (book.available > 0 ? 2 : 0);
      return { book, score };
    });

    return scored
      .filter((item) => item.score > 0 || !query)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.book)
      .slice(0, 4);
  }, [catalogBooks, query, selectedNeed]);

  const popularBooks = catalogBooks.filter((book) => book.available > 0).slice(0, 6);
  const aiBooks = catalogBooks
    .filter((book) => ["Giao tiếp", "Quản lý thời gian", "Tâm lý", "Phát triển bản thân"].includes(book.category))
    .slice(0, 6);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim()) {
      setSelectedNeed(query.trim());
    }
  }

  async function handleAskAi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = chatInput.trim();
    if (!prompt) {
      return;
    }

    setMessages((current) => [...current, { role: "reader", content: prompt }]);
    setChatInput("");
    setAiLoading(true);
    try {
      const response = await chatWithAi({ userId: getStoredUser()?.id, message: prompt });
      const first = response.recommendedBooks[0];
      const matchedBook = first ? catalogBooks.find((book) => book.id === first.bookId) : null;
      if (matchedBook) {
        setSelectedNeed(matchedBook.category);
      }
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.reply
        }
      ]);
    } catch {
      const match = findAiRecommendation(prompt);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: match
            ? `Mình gợi ý "${match.title}" vì sách khớp nhu cầu ${match.category.toLowerCase()} và hiện còn ${match.available} bản.`
            : "Kho hiện chưa có sách thật sự khớp. Mình đã ghi nhận nhu cầu này cho thủ thư."
        }
      ]);
      if (match) {
        setSelectedNeed(match.category);
      }
    } finally {
      setAiLoading(false);
    }
  }

  function findAiRecommendation(prompt: string) {
    const normalized = prompt.toLowerCase();
    return catalogBooks.find((book) => {
      const haystack = `${book.title} ${book.category} ${book.description} ${book.audience}`.toLowerCase();
      return normalized.split(/\s+/).some((word) => word.length > 3 && haystack.includes(word)) && book.available > 0;
    });
  }

  return (
    <div className="lb-page">
      <AppHeader active="home" />

      <main className="lb-container py-8">
        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 lb-panel p-7 lg:p-8">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-extrabold leading-[1.12] tracking-normal text-slate-950 sm:text-5xl">Bạn muốn đọc gì hôm nay?</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Tìm kiếm trong kho sách của thư viện hoặc hỏi AI để được gợi ý phù hợp.
              </p>
            </div>

            <form onSubmit={handleSearch} className="mt-7 flex flex-col gap-3 sm:flex-row">
              <label className="relative flex min-h-12 flex-1 items-center">
                <Search className="pointer-events-none absolute left-4 h-5 w-5 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Bạn muốn đọc gì hôm nay?"
                  className="h-[52px] w-full lb-input bg-white pl-12 pr-4 text-[15px] text-slate-900"
                />
              </label>
              <button className="inline-flex h-[52px] items-center justify-center gap-2 lb-btn-primary px-7 text-sm font-bold">
                <Search className="h-4 w-4" />
                Tìm sách
              </button>
            </form>

            <div className="mt-5 flex flex-wrap gap-2">
              {needChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setSelectedNeed(chip)}
                  className={`inline-flex h-9 items-center gap-2 px-3 text-sm font-semibold transition ${
                    selectedNeed === chip
                      ? "lb-chip lb-chip-active"
                      : "lb-chip hover:border-emerald-300 hover:text-emerald-700"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="lb-surface min-w-0 p-6">
            <div className="flex h-full flex-col justify-between">
              <div>
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  <WandSparkles className="h-6 w-6" />
                </span>
                <h2 className="mt-5 text-2xl font-extrabold text-slate-950">Hỏi AI tư vấn</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Libbuddy AI chỉ gợi ý sách có trong kho dữ liệu của thư viện.
                </p>
              </div>
              <Link
                href="/ai-advisor"
                className="mt-8 inline-flex h-12 items-center justify-center gap-2 lb-btn-secondary px-5 text-sm font-bold"
              >
                <MessageCircle className="h-5 w-5" />
                Hỏi AI tư vấn
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 space-y-7">
            <SectionHeader title="Gợi ý nổi bật dành cho bạn" href="/books" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recommendedBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                />
              ))}
            </div>

            <ShelfRail title="Được mượn nhiều" books={popularBooks} />
            <ShelfRail title="AI gợi ý cho bạn" books={aiBooks} />
          </div>

          <aside className="min-w-0 space-y-5">
            <MyBooksPanel />
            <SavedBooksPanel />
            <AiMiniChat messages={messages} input={chatInput} setInput={setChatInput} onSubmit={handleAskAi} loading={aiLoading} />
          </aside>
        </section>
      </main>
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800">
        Xem tất cả
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function BookCard({ book }: { book: Book }) {
  return (
    <article className="group min-w-0 lb-surface p-3 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
      <div className="flex justify-center lb-muted-box py-3">
        <BookCover book={book} />
      </div>
      <div className="mt-3 min-h-[104px] min-w-0">
        <h3 className="line-clamp-2 text-sm font-bold leading-5 text-slate-950">{book.title}</h3>
        <p className="mt-1 text-sm text-slate-500">{book.author}</p>
        <p className="mt-1 text-sm text-slate-500">{book.category}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md px-2 py-1 text-xs font-bold ${
              book.available > 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {book.available > 0 ? "Còn sẵn" : "Đặt trước"}
          </span>
          <span className="text-xs font-medium text-slate-500">
            {book.available}/{book.total} bản
          </span>
        </div>
      </div>
      <div className="mt-3 grid min-w-0 grid-cols-2 gap-2">
        <Link
          href={`/books?focus=${book.id}`}
            className="inline-flex h-9 min-w-0 items-center justify-center whitespace-nowrap rounded-md border border-emerald-200 px-2 text-center text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50 sm:text-xs"
        >
          Xem chi tiết
        </Link>
        <Link
          href={`/checkout?book=${book.id}&mode=rent`}
          className={`inline-flex h-9 min-w-0 items-center justify-center whitespace-nowrap px-2 text-center text-[11px] font-bold sm:text-xs ${
            book.available > 0 ? "lb-btn-primary" : "rounded-md bg-slate-200 text-slate-500"
          }`}
        >
          {book.available > 0 ? "Mượn sách" : "Hết sách"}
        </Link>
      </div>
    </article>
  );
}

function ShelfRail({ title, books: items }: { title: string; books: Book[] }) {
  return (
    <section className="min-w-0">
      <SectionHeader title={title} href="/books" />
      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((book) => (
          <Link
            key={book.id}
            href={`/books?focus=${book.id}`}
            className="flex min-w-0 items-center gap-3 lb-surface p-3 transition hover:border-emerald-200 hover:shadow-md"
          >
            <BookCover book={book} size="sm" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-slate-950">{book.title}</h3>
              <p className="truncate text-xs text-slate-500">{book.author}</p>
              <span className="mt-2 inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                {book.available > 0 ? "Còn sẵn" : "Đặt trước"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MyBooksPanel() {
  const [records, setRecords] = useState<BorrowRecordDto[]>([]);
  const [orders, setOrders] = useState<CheckoutOrderDto[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([fetchMyBorrowRecords(), fetchMyOrders()])
      .then(([borrowRecords, checkoutOrders]) => {
        setRecords(borrowRecords);
        setOrders(checkoutOrders);
      })
      .catch(() => {
        setRecords([]);
        setOrders([]);
      })
      .finally(() => setLoaded(true));
  }, []);

  const apiRows = records.flatMap((record) =>
    record.items.map((item) => ({
      title: item.bookTitle,
      author: record.readerName,
      dueDate: formatDate(record.dueDate),
      daysLeft: Math.max(0, Math.ceil((new Date(record.dueDate).getTime() - Date.now()) / 86400000)),
      bookId: item.bookCopyId
    }))
  );
  const rows = apiRows.slice(0, 3);

  return (
    <section className="lb-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-950">Sách của tôi</h2>
        <Link href="/my-books" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
          Xem tất cả
        </Link>
      </div>
      <div className="mt-3 flex gap-3 border-b border-slate-200 text-sm font-semibold">
        <button className="border-b-2 border-emerald-700 pb-3 text-emerald-700">Đang mượn ({apiRows.length})</button>
        <Link href="/my-books?tab=reserved" className="pb-3 text-slate-500 hover:text-slate-900">
          Đơn thuê/mua ({orders.length})
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.length ? rows.map((item) => {
          const book = catalogFallbackBooks.find((entry) => entry.title === item.title) ?? catalogFallbackBooks[0];
          return (
            <div key={`${item.title}-${item.dueDate}`} className="flex items-center gap-3 py-4">
              <BookCover book={book} size="sm" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-slate-950">{item.title}</h3>
                <p className="truncate text-xs text-slate-500">{item.author}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Hạn trả</p>
                <p className="text-xs font-semibold text-slate-700">{item.dueDate}</p>
                <p className="text-xs font-bold text-amber-600">Còn {item.daysLeft} ngày</p>
              </div>
            </div>
          );
        }) : (
          <div className="py-6 text-sm leading-6 text-slate-500">
            {loaded ? "Bạn chưa có sách đang mượn. Hãy chọn một cuốn trong kho sách để bắt đầu." : "Đang kiểm tra sách của bạn..."}
          </div>
        )}
      </div>
    </section>
  );
}

function SavedBooksPanel() {
  return (
    <section className="lb-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-950">Sách đã lưu</h2>
        <Link href="/my-books" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
          Xem tất cả
        </Link>
      </div>
      <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
        Khi bạn lưu sách từ kho sách, danh sách sẽ xuất hiện tại đây.
      </div>
    </section>
  );
}

function AiMiniChat({
  messages,
  input,
  setInput,
  onSubmit,
  loading
}: {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
}) {
  return (
    <section className="lb-surface">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-600" />
          <h2 className="text-lg font-bold text-slate-950">Libbuddy AI</h2>
        </div>
        <Clock3 className="h-5 w-5 text-slate-400" />
      </div>
      <div className="max-h-72 space-y-3 overflow-auto p-4">
        {messages.slice(-4).map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex ${message.role === "reader" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[86%] rounded-lg px-3 py-2 text-sm leading-6 ${
                message.role === "reader" ? "lb-btn-secondary text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {["Kỹ năng giao tiếp", "Quản lý thời gian", "Phát triển bản thân"].map((chip) => (
            <button
              key={chip}
              onClick={() => setInput(chip)}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t border-slate-100 p-4">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Nhập câu hỏi về sách..."
          className="h-11 min-w-0 flex-1 lb-input px-3 text-sm"
        />
        <button disabled={loading} className="grid h-11 w-11 place-items-center lb-btn-secondary disabled:bg-slate-300" aria-label="Gửi câu hỏi">
          {loading ? <Clock3 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </section>
  );
}

export function CustomerBooksPage() {
  const searchParams = useSearchParams();
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [difficulty, setDifficulty] = useState("Tất cả");
  const [availability, setAvailability] = useState("Tất cả");
  const [selectedBookId, setSelectedBookId] = useState(catalogFallbackBooks[0].id);
  const [catalogBooks, setCatalogBooks] = useState<Book[]>(catalogFallbackBooks);


  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus && catalogFallbackBooks.some((book) => book.id === focus)) {
      setSelectedBookId(focus);
    }
    fetchBooks()
      .then((result) => {
        const mapped = result.items.map(mapBookDtoToBook);
        if (mapped.length) {
          setCatalogBooks(mapped);
          if (focus && mapped.some((book) => book.id === focus)) {
            setSelectedBookId(focus);
          } else {
            setSelectedBookId(mapped[0].id);
          }
        }
      })
      .catch(() => {
        setCatalogBooks(catalogFallbackBooks);
      });
  }, [searchParams]);

  const categories = useMemo(() => ["Tất cả", ...Array.from(new Set(catalogBooks.map((book) => book.category)))], [catalogBooks]);
  const filtered = useMemo(
    () =>
      catalogBooks.filter((book) => {
        const haystack = `${book.title} ${book.author} ${book.category} ${book.description} ${book.audience}`.toLowerCase();
        const matchesTerm = haystack.includes(term.toLowerCase());
        const matchesCategory = category === "Tất cả" || book.category === category;
        const matchesDifficulty = difficulty === "Tất cả" || book.difficulty === difficulty;
        const matchesAvailability =
          availability === "Tất cả" ||
          (availability === "Còn sẵn" && book.available > 0) ||
          (availability === "Đặt trước" && book.available === 0);
        return matchesTerm && matchesCategory && matchesDifficulty && matchesAvailability;
      }),
    [availability, catalogBooks, category, difficulty, term]
  );

  const selectedBook = catalogBooks.find((book) => book.id === selectedBookId) ?? filtered[0] ?? catalogBooks[0] ?? catalogFallbackBooks[0];
  const availableBooks = catalogBooks.filter((book) => book.available > 0).length;

  return (
    <div className="lb-page">
      <AppHeader active="books" />
      <main className="lb-container py-8">
        <section className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="min-w-0">
            <div className="lb-panel p-6">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Library className="h-5 w-5" />
                    <span className="text-sm font-bold">Kho sách khách hàng</span>
                  </div>
                  <h1 className="mt-3 text-4xl font-extrabold leading-[1.14] tracking-normal text-slate-950">Tìm sách nhanh, xem rõ sách nào còn sẵn</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                    Lọc theo chủ đề, độ khó và tình trạng để khách hàng quyết định mượn sách trong vài bước.
                  </p>
                </div>
                <Link
                  href="/ai-advisor"
                  className="inline-flex h-11 items-center justify-center gap-2 lb-btn-secondary px-4 text-sm font-bold"
                >
                  <Bot className="h-4 w-4" />
                  Hỏi AI tư vấn
                </Link>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <label className="relative">
                  <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    value={term}
                    onChange={(event) => setTerm(event.target.value)}
                    placeholder="Tìm tên sách, tác giả, nhu cầu đọc..."
                    className="h-12 w-full lb-input bg-white pl-12 pr-4 text-sm text-slate-900"
                  />
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                  <Filter className="h-4 w-4" />
                  {filtered.length} kết quả
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <FilterRow label="Chủ đề" icon={<Layers3 className="h-4 w-4" />}>
                  {categories.map((item) => (
                    <FilterChip key={item} active={category === item} onClick={() => setCategory(item)}>
                      {item}
                    </FilterChip>
                  ))}
                </FilterRow>
                <FilterRow label="Độ khó" icon={<ListFilter className="h-4 w-4" />}>
                  {["Tất cả", "Dễ đọc", "Vừa phải", "Chuyên sâu"].map((item) => (
                    <FilterChip key={item} active={difficulty === item} onClick={() => setDifficulty(item)}>
                      {item}
                    </FilterChip>
                  ))}
                </FilterRow>
                <FilterRow label="Tình trạng" icon={<BookMarked className="h-4 w-4" />}>
                  {["Tất cả", "Còn sẵn", "Đặt trước"].map((item) => (
                    <FilterChip key={item} active={availability === item} onClick={() => setAvailability(item)}>
                      {item}
                    </FilterChip>
                  ))}
                </FilterRow>
              </div>
            </div>

            <section className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((book) => (
                <CatalogBookCard key={book.id} book={book} selected={book.id === selectedBook.id} onSelect={() => setSelectedBookId(book.id)} />
              ))}
              {filtered.length === 0 ? (
                <div className="col-span-full lb-surface p-8 text-center">
                  <Search className="mx-auto h-10 w-10 text-slate-300" />
                  <h2 className="mt-3 text-lg font-bold text-slate-950">Chưa tìm thấy sách phù hợp</h2>
                  <p className="mt-1 text-sm text-slate-500">Thử đổi bộ lọc hoặc hỏi AI để thư viện ghi nhận nhu cầu mới.</p>
                </div>
              ) : null}
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-3">
              <CatalogInsight icon={<ShieldCheck className="h-5 w-5" />} label="Chỉ hiển thị dữ liệu thư viện" value="Không gợi ý sách ngoài kho" />
              <CatalogInsight icon={<BookMarked className="h-5 w-5" />} label="Sách còn sẵn" value={`${availableBooks}/${catalogBooks.length} đầu sách có thể mượn`} />
              <CatalogInsight icon={<MapPin className="h-5 w-5" />} label="Vị trí rõ ràng" value="Kệ sách và ngăn sách nằm ngay trong chi tiết" />
            </section>
          </div>

          <BookDetailPanel book={selectedBook} />
        </section>
      </main>
    </div>
  );
}

function FilterRow({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 lg:grid-cols-[110px_1fr] lg:items-start">
      <div className="flex items-center gap-2 pt-1 text-sm font-bold text-slate-700">
        {icon}
        {label}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center px-3 text-sm font-semibold transition ${
        active ? "lb-chip lb-chip-active" : "lb-chip hover:border-emerald-300 hover:text-emerald-700"
      }`}
    >
      {children}
    </button>
  );
}

function CatalogBookCard({ book, selected, onSelect }: { book: Book; selected: boolean; onSelect: () => void }) {
  return (
    <article
      className={`lb-surface p-3 transition hover:-translate-y-0.5 ${
        selected ? "border-emerald-500 ring-4 ring-emerald-100" : "hover:border-emerald-200"
      }`}
    >
      <div className="flex justify-center rounded-lg bg-gradient-to-b from-slate-50 to-white py-4">
        <BookCover book={book} />
      </div>
      <div className="mt-3 min-h-[126px]">
        <h2 className="line-clamp-2 text-base font-bold leading-6 text-slate-950">{book.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{book.author}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{book.category}</span>
          <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{book.difficulty}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`text-sm font-bold ${book.available > 0 ? "text-emerald-700" : "text-amber-700"}`}>
          {book.available > 0 ? `Còn ${book.available} bản` : "Đặt trước"}
        </span>
        <button
          type="button"
          onClick={onSelect}
          className="inline-flex h-9 items-center gap-1 lb-btn-ghost px-3 text-sm font-bold"
        >
          Chi tiết
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function BookDetailPanel({ book }: { book: Book }) {
  return (
    <aside className="lb-surface p-5 xl:sticky xl:top-28 xl:self-start">
      <div className="flex items-start gap-4">
        <BookCover book={book} />
        <div className="min-w-0 flex-1">
          <span
            className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${
              book.available > 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {book.available > 0 ? "Có thể mượn ngay" : "Cần đặt trước"}
          </span>
          <h2 className="mt-3 text-xl font-bold leading-7 text-slate-950">{book.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{book.author}</p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-600">{book.description}</p>
      <div className="mt-5 space-y-3">
        <DetailLine icon={<BookMarked className="h-4 w-4" />} label="Thể loại" value={`${book.category} - ${book.difficulty}`} />
        <DetailLine icon={<Clock3 className="h-4 w-4" />} label="Thời lượng" value={`Đọc ${book.readingTime.toLowerCase()}`} />
        <DetailLine icon={<MapPin className="h-4 w-4" />} label="Vị trí" value={book.shelf} />
        <DetailLine icon={<Sparkles className="h-4 w-4" />} label="Phù hợp" value={book.audience} />
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <Link
          href={`/checkout?book=${book.id}&mode=rent`}
          className="inline-flex h-11 items-center justify-center gap-2 lb-btn-primary px-4 text-sm font-bold"
        >
          <BookMarked className="h-4 w-4" />
          {book.available > 0 ? "Thuê/Mượn sách" : "Đặt trước"}
        </Link>
        <Link
          href={`/checkout?book=${book.id}&mode=buy`}
          className="inline-flex h-11 items-center justify-center gap-2 lb-btn-ghost px-4 text-sm font-bold"
        >
          <BookMarked className="h-4 w-4" />
          Mua bản cá nhân
        </Link>
      </div>
    </aside>
  );
}

function DetailLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3 lb-muted-box p-3">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div>
        <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function CatalogInsight({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 lb-surface p-4">
      <span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-50 text-emerald-700">{icon}</span>
      <div>
        <p className="text-sm font-bold text-slate-950">{label}</p>
        <p className="mt-1 text-sm text-slate-500">{value}</p>
      </div>
    </div>
  );
}

export function MyBooksPage() {
  const [activeTab, setActiveTab] = useState<"borrowed" | "reserved" | "saved" | "history">("borrowed");
  const [apiBorrowRecords, setApiBorrowRecords] = useState<BorrowRecordDto[]>([]);
  const [apiOrders, setApiOrders] = useState<CheckoutOrderDto[]>([]);
  const [myBooksSource, setMyBooksSource] = useState<"loading" | "api" | "guest" | "error">("loading");
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "borrowed" || tab === "reserved" || tab === "saved" || tab === "history") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!getStoredUser()) {
      setMyBooksSource("guest");
      return;
    }

    Promise.all([fetchMyBorrowRecords(), fetchMyOrders()])
      .then(([records, orders]) => {
        setApiBorrowRecords(records);
        setApiOrders(orders);
        setMyBooksSource("api");
      })
      .catch(() => {
        setMyBooksSource("error");
      });
  }, []);

  const tabs = [
    { key: "borrowed" as const, label: "Đang mượn", count: apiBorrowRecords.length },
    { key: "reserved" as const, label: "Đơn thuê/mua", count: apiOrders.length },
    { key: "saved" as const, label: "Đã lưu", count: 0 },
    { key: "history" as const, label: "Lịch sử", count: 0 }
  ];
  const reminderRows = apiBorrowRecords.flatMap((record) =>
    record.items.map((item) => ({
      key: `${record.id}-${item.id}`,
      title: item.bookTitle,
      dueDate: formatDate(record.dueDate),
      daysLeft: Math.max(0, Math.ceil((new Date(record.dueDate).getTime() - Date.now()) / 86400000))
    }))
  );

  return (
    <div className="lb-page">
      <AppHeader active="my" />
      <main className="mx-auto w-full max-w-[1320px] px-5 py-8 lg:px-9">
        <section className="lb-panel p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h1 className="text-4xl font-extrabold leading-[1.14] tracking-normal text-slate-950">Sách của tôi</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">Theo dõi sách đang mượn, đơn thuê/mua, sách đã lưu và lịch sử đọc.</p>
              <p className="mt-1 text-xs font-bold text-slate-400">
                {myBooksSource === "api"
                  ? "Tài khoản đã được đồng bộ"
                  : myBooksSource === "guest"
                    ? "Đăng nhập để xem dữ liệu cá nhân của bạn"
                    : myBooksSource === "error"
                      ? "Chưa thể tải dữ liệu tài khoản"
                      : "Đang kiểm tra phiên đăng nhập"}
              </p>
            </div>
            <Link
              href="/books"
              className="inline-flex h-11 items-center justify-center gap-2 lb-btn-primary px-4 text-sm font-bold"
            >
              <Search className="h-4 w-4" />
              Tìm sách mới
            </Link>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto rounded-lg border border-[var(--line)] bg-white p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-bold transition ${
                  activeTab === tab.key
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{tab.count}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 lb-surface p-5">
            {activeTab === "borrowed" ? (
              apiBorrowRecords.length ? <ApiBorrowedShelf records={apiBorrowRecords} /> : <BorrowedShelf />
            ) : null}
            {activeTab === "reserved" ? (
              apiOrders.length ? <ApiOrdersShelf orders={apiOrders} /> : <ReservationShelf />
            ) : null}
            {activeTab === "saved" ? <SavedShelf /> : null}
            {activeTab === "history" ? <HistoryShelf /> : null}
          </section>

          <aside className="space-y-5">
            <section className="lb-surface p-5">
              <h2 className="text-xl font-bold text-slate-950">Nhắc hạn trả</h2>
              <div className="mt-4 space-y-3">
                {reminderRows.length ? reminderRows.map((item) => (
                  <div key={item.key} className="lb-muted-box p-3">
                    <div className="flex items-center gap-2 text-amber-700">
                      <CalendarClock className="h-4 w-4" />
                      <span className="text-sm font-bold">{item.dueDate}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">Còn {item.daysLeft} ngày</p>
                  </div>
                )) : (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                    Chưa có sách đang mượn cần nhắc hạn.
                  </p>
                )}
              </div>
            </section>
            <section className="rounded-lg border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-center gap-2 text-blue-700">
                <Bot className="h-5 w-5" />
                <h2 className="text-lg font-bold">Gợi ý tiếp theo</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Hỏi Libbuddy AI để tìm sách phù hợp với mục tiêu đọc hiện tại của bạn.
              </p>
              <Link
                href="/ai-advisor"
                className="mt-4 inline-flex h-10 items-center gap-2 lb-btn-secondary px-4 text-sm font-bold"
              >
                Hỏi AI
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function ApiBorrowedShelf({ records }: { records: BorrowRecordDto[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-950">Đang mượn</h2>
      <div className="mt-4 space-y-4">
        {records.map((record) => (
          <article key={record.id} className="lb-surface-flat p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">{record.id.slice(0, 8).toUpperCase()}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950">{record.items.map((item) => item.bookTitle).join(", ")}</h3>
                <p className="text-sm text-slate-500">Hạn trả {formatDate(record.dueDate)} · {record.status}</p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-bold ${record.isOverdue ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                {record.isOverdue ? "Quá hạn" : "Đang mượn"}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ApiOrdersShelf({ orders }: { orders: CheckoutOrderDto[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-950">Đơn thuê/mua</h2>
      <div className="mt-4 space-y-4">
        {orders.map((order) => (
          <article key={order.id} className="lb-surface-flat p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">{order.orderCode}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950">{order.items.map((item) => item.bookTitle).join(", ")}</h3>
                <p className="text-sm text-slate-500">
                  {order.type === "Rent" ? "Thuê/Mượn" : "Mua"} · {order.fulfillmentMethod === "Pickup" ? "Nhận tại thư viện" : "Giao tận nơi"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-700">{formatCurrency(order.totalAmount)}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{order.status}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function BorrowedShelf() {
  return <EmptyShelf title="Đang mượn" text="Bạn chưa có sách đang mượn. Hãy chọn sách trong kho và tạo đơn thuê/mượn để bắt đầu." />;
}

function ReservationShelf() {
  return <EmptyShelf title="Đơn thuê/mua" text="Chưa có đơn thuê hoặc mua sách nào. Sau khi xác nhận checkout, đơn sẽ xuất hiện tại đây." />;
}

function SavedShelf() {
  return <EmptyShelf title="Đã lưu" text="Bạn chưa lưu sách nào. Tính năng lưu sách đã sẵn giao diện và sẽ hiển thị tại đây khi có dữ liệu tài khoản." />;
}

function HistoryShelf() {
  return (
    <EmptyShelf title="Lịch sử đọc" text="Lịch sử sẽ được ghi nhận sau khi bạn hoàn tất và trả sách." />
  );
}

function EmptyShelf({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
        {text}
      </div>
    </div>
  );
}

export function AiAdvisorPage() {
  const [input, setInput] = useState("Mình muốn sách dễ đọc về giao tiếp công sở");
  const [readingMood, setReadingMood] = useState("Dễ đọc");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Bạn cứ nói mục tiêu đọc sách. Mình sẽ tìm trong kho Libbuddy và giải thích vì sao phù hợp." }
  ]);
  const [recommendations, setRecommendations] = useState<Book[]>(catalogFallbackBooks.slice(0, 3));
  const [catalogBooks, setCatalogBooks] = useState<Book[]>(catalogFallbackBooks);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const quickPrompts = [
    "Mình muốn giao tiếp tự tin hơn",
    "Có sách nào giúp quản lý tiền cá nhân không?",
    "Mình hay trì hoãn, nên đọc sách nào?",
    "Muốn đọc nhẹ nhàng để giảm stress"
  ];

  useEffect(() => {
    fetchBooks()
      .then((result) => {
        const mapped = result.items.map(mapBookDtoToBook);
        if (mapped.length) {
          setCatalogBooks(mapped);
          setRecommendations(mapped.filter((book) => book.available > 0).slice(0, 3));
        }
      })
      .catch(() => {
        setCatalogBooks(catalogFallbackBooks);
      });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt) {
      return;
    }
    const searchPrompt = `${prompt} ${readingMood}`;
    setMessages((current) => [...current, { role: "reader", content: prompt }]);
    setInput("");
    setLoading(true);

    try {
      const response = await chatWithAi({
        conversationId,
        userId: getStoredUser()?.id,
        message: searchPrompt
      });
      setConversationId(response.conversationId);
      const matched = response.recommendedBooks
        .map((item) => catalogBooks.find((book) => book.id === item.bookId))
        .filter((book): book is Book => Boolean(book));
      setRecommendations(matched.length ? matched : catalogBooks.filter((book) => book.available > 0).slice(0, 3));
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.followUpQuestion ? `${response.reply} ${response.followUpQuestion}` : response.reply
        }
      ]);
    } catch {
      const matches = catalogBooks
        .filter((book) => {
          const haystack = `${book.title} ${book.category} ${book.description} ${book.audience}`.toLowerCase();
          return searchPrompt.toLowerCase().split(/\s+/).some((word) => word.length > 3 && haystack.includes(word)) && book.available > 0;
        })
        .slice(0, 3);
      setRecommendations(matches.length ? matches : catalogBooks.filter((book) => book.available > 0).slice(0, 3));
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: matches.length
            ? `Mình tìm thấy ${matches.length} sách có sẵn trong thư viện. Mình ưu tiên sách còn bản khả dụng và dễ bắt đầu.`
            : "Mình chưa thấy kết quả khớp hoàn toàn, nên gợi ý các sách dễ bắt đầu đang còn bản."
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lb-page">
      <AppHeader active="ai" />
      <main className="mx-auto grid w-full max-w-[1500px] min-w-0 gap-5 px-5 py-7 xl:grid-cols-[320px_minmax(0,1fr)_420px] lg:px-9">
        <aside className="lb-surface p-5">
          <div className="flex items-center gap-2 text-blue-700">
            <WandSparkles className="h-5 w-5" />
            <h2 className="text-lg font-bold">Cấu hình gợi ý</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">AI chỉ chọn sách có trong dữ liệu kho Libbuddy và ưu tiên sách còn bản.</p>
          <div className="mt-5 space-y-3">
            {["Dễ đọc", "Vừa phải", "Chuyên sâu"].map((mood) => (
              <button
                key={mood}
                type="button"
                onClick={() => setReadingMood(mood)}
                className={`flex h-11 w-full items-center justify-between rounded-md border px-3 text-sm font-bold transition ${
                  readingMood === mood ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {mood}
                {readingMood === mood ? <CheckCircle2 className="h-4 w-4" /> : null}
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-md bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="h-4 w-4" />
              Quy tắc an toàn
            </div>
            <p className="mt-1">Không bịa sách ngoài kho, luôn nêu lý do gợi ý và tình trạng còn bản.</p>
          </div>
        </aside>

        <section className="lb-surface">
          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-md bg-blue-50 text-blue-700">
                <Bot className="h-6 w-6" />
                </span>
                <div>
                  <h1 className="text-2xl font-bold text-slate-950">AI tư vấn sách</h1>
                  <p className="text-sm text-slate-500">Nói mục tiêu đọc, Libbuddy sẽ giải thích lựa chọn phù hợp.</p>
                </div>
              </div>
              <span className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-100 px-3 text-sm font-bold text-slate-600">
                <TimerReset className="h-4 w-4" />
                {loading ? "Đang phản hồi" : "Sẵn sàng"}
              </span>
            </div>
          </div>
          <div className="min-h-[500px] space-y-4 p-5">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "reader" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[76%] rounded-lg px-4 py-3 text-sm leading-6 ${
                    message.role === "reader" ? "lb-btn-secondary text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
          <form onSubmit={submit} className="flex gap-3 border-t border-slate-100 p-5">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="h-12 min-w-0 flex-1 lb-input px-4 text-sm"
              placeholder="Ví dụ: Mình muốn quản lý tiền tốt hơn..."
            />
            <button disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 lb-btn-secondary px-5 text-sm font-bold disabled:bg-slate-300">
              {loading ? <Clock3 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="hidden sm:inline">Gửi</span>
            </button>
          </form>
        </section>

        <aside className="lb-surface p-5">
          <h2 className="text-xl font-bold text-slate-950">Sách AI đề xuất</h2>
          <div className="mt-4 space-y-4">
            {recommendations.map((book) => (
              <div key={book.id} className="flex gap-3 lb-surface-flat p-3">
                <BookCover book={book} size="sm" />
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-950">{book.title}</h3>
                  <p className="text-sm text-slate-500">{book.author}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{book.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Còn {book.available} bản
                    </span>
                    <Link href={`/books?focus=${book.id}`} className="text-xs font-bold text-blue-700 hover:text-blue-800">
                      Xem vị trí
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-bold text-slate-950">Vì sao các sách này?</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Hệ thống so khớp nhu cầu đọc với tiêu đề, thể loại, mô tả, nhóm độc giả phù hợp và số bản còn lại.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}

export function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
      <Star className="h-3.5 w-3.5 text-amber-500" />
      {children}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}
