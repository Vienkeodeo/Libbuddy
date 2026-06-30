"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, CreditCard, Library, MapPin, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { BookCover } from "@/components/book-cover";
import { catalogFallbackBooks } from "@/lib/library-ui-data";
import { createCheckoutOrder, fetchBooks, getStoredUser, mapBookDtoToBook, type CheckoutOrderDto, type CurrentUser } from "@/lib/api";

type CheckoutMode = "rent" | "buy";
type DeliveryMode = "pickup" | "delivery";

export function CheckoutFlow() {
  const [bookId, setBookId] = useState(catalogFallbackBooks[0].id);
  const [mode, setMode] = useState<CheckoutMode>("rent");
  const [delivery, setDelivery] = useState<DeliveryMode>("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [step, setStep] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [apiBooks, setApiBooks] = useState(catalogFallbackBooks);
  const [order, setOrder] = useState<CheckoutOrderDto | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const syncUser = () => setCurrentUser(getStoredUser());
    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("libbuddy:session", syncUser);

    const focusBook = searchParams.get("book");
    const focusMode = searchParams.get("mode");
    if (focusBook && catalogFallbackBooks.some((book) => book.id === focusBook)) {
      setBookId(focusBook);
    }
    if (focusMode === "buy" || focusMode === "rent") {
      setMode(focusMode);
    }

    fetchBooks()
      .then((result) => {
        const mapped = result.items.map(mapBookDtoToBook);
        if (mapped.length) {
          setApiBooks(mapped);
          if (focusBook && mapped.some((book) => book.id === focusBook)) {
            setBookId(focusBook);
          } else {
            setBookId(mapped[0].id);
          }
        }
      })
      .catch(() => {
        setApiBooks(catalogFallbackBooks);
      });

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("libbuddy:session", syncUser);
    };
  }, [searchParams]);

  const book = apiBooks.find((item) => item.id === bookId) ?? apiBooks[0] ?? catalogFallbackBooks[0];
  const pricing = useMemo(() => {
    const rentFee = mode === "rent" ? 18000 : 0;
    const deposit = mode === "rent" ? 50000 : 0;
    const buyPrice = mode === "buy" ? 129000 : 0;
    const deliveryFee = delivery === "delivery" ? 22000 : 0;
    const total = rentFee + deposit + buyPrice + deliveryFee;
    return { rentFee, deposit, buyPrice, deliveryFee, total };
  }, [delivery, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }

    if (!currentUser) {
      setError("Bạn cần đăng nhập trước khi xác nhận đơn thuê/mua sách.");
      setStep(1);
      return;
    }

    try {
      setLoading(true);
      const savedOrder = await createCheckoutOrder({
        bookId: book.id,
        type: mode === "rent" ? "Rent" : "Purchase",
        fulfillmentMethod: delivery === "pickup" ? "Pickup" : "Delivery",
        deliveryAddress:
          delivery === "delivery"
            ? deliveryAddress.trim()
            : undefined
      });
      setOrder(savedOrder);
      setConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo đơn thuê/mua sách.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lb-page">
      <AppHeader active="books" />
      <main className="mx-auto w-full max-w-[1320px] px-5 py-8 lg:px-9">
        <Link href={`/books?focus=${book.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-700">
          <ArrowLeft className="h-4 w-4" />
          Quay lại chi tiết sách
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          <section className="lb-panel p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <h1 className="text-4xl font-extrabold leading-[1.14] tracking-normal text-slate-950">Hoàn tất thuê hoặc mua sách</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Xác nhận tài khoản, chọn cách nhận sách và kiểm tra chi phí trước khi tạo đơn.
                </p>
              </div>
              <div className="flex gap-2 rounded-lg border border-[var(--line)] bg-white p-1">
                {[
                  { key: "rent" as const, label: "Thuê/Mượn" },
                  { key: "buy" as const, label: "Mua" }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMode(item.key)}
                    className={`h-10 rounded-md px-3 text-sm font-bold transition ${
                      mode === item.key ? "bg-emerald-50 text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <StepPill active={step === 1} done={step > 1} index={1} label="Tài khoản" />
              <StepPill active={step === 2} done={step > 2} index={2} label="Nhận sách" />
              <StepPill active={step === 3} done={confirmed} index={3} label="Thanh toán" />
            </div>

            {confirmed ? (
              <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-3 text-emerald-800">
                  <CheckCircle2 className="h-6 w-6" />
                  <h2 className="text-xl font-bold">Đơn {mode === "rent" ? "thuê/mượn" : "mua"} đã được tạo</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-emerald-900">
                  Mã đơn {order?.orderCode ?? "đang cập nhật"} đã được tạo. Hệ thống sẽ gửi thông báo trạng thái nhận sách và cập nhật vào mục Sách của tôi.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/my-books" className="inline-flex h-10 items-center lb-btn-primary px-4 text-sm font-bold">
                    Xem Sách của tôi
                  </Link>
                  <Link href="/books" className="inline-flex h-10 items-center lb-btn-ghost px-4 text-sm font-bold">
                    Tiếp tục tìm sách
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-5">
                {step === 1 ? <AccountStep currentUser={currentUser} /> : null}
                {step === 2 ? <DeliveryStep delivery={delivery} setDelivery={setDelivery} deliveryAddress={deliveryAddress} setDeliveryAddress={setDeliveryAddress} /> : null}
                {step === 3 ? <PaymentStep mode={mode} delivery={delivery} pricing={pricing} /> : null}

                {error ? <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div> : null}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep((current) => Math.max(1, current - 1))}
                    disabled={step === 1}
                    className="inline-flex h-11 items-center justify-center lb-btn-ghost px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Quay lại
                  </button>
                  <button
                    disabled={loading}
                    className="inline-flex h-11 items-center justify-center lb-btn-primary px-5 text-sm font-bold disabled:bg-slate-300"
                  >
                    {loading ? "Đang tạo đơn..." : step < 3 ? "Tiếp tục" : "Xác nhận đơn"}
                  </button>
                </div>
              </form>
            )}
          </section>

          <aside className="space-y-5">
            <section className="lb-surface p-5">
              <div className="flex gap-4">
                <BookCover book={book} />
                <div className="min-w-0">
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                    {book.available > 0 ? "Còn sẵn" : "Đặt trước"}
                  </span>
                  <h2 className="mt-3 text-xl font-bold leading-7 text-slate-950">{book.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{book.author}</p>
                </div>
              </div>
              <div className="mt-5 space-y-2 text-sm">
                <SummaryLine label="Hình thức" value={mode === "rent" ? "Thuê/Mượn 14 ngày" : "Mua bản cá nhân"} />
                <SummaryLine label="Nhận sách" value={delivery === "pickup" ? "Nhận tại thư viện" : "Giao tận nơi"} />
                <SummaryLine label="Vị trí" value={book.shelf} />
              </div>
            </section>

            <section className="lb-surface p-5">
              <h2 className="text-xl font-bold text-slate-950">Tạm tính</h2>
              <div className="mt-4 space-y-2">
                {mode === "rent" ? (
                  <>
                    <SummaryLine label="Phí thuê" value={formatCurrency(pricing.rentFee)} />
                    <SummaryLine label="Cọc hoàn trả" value={formatCurrency(pricing.deposit)} />
                  </>
                ) : (
                  <SummaryLine label="Giá mua" value={formatCurrency(pricing.buyPrice)} />
                )}
                <SummaryLine label="Giao nhận" value={pricing.deliveryFee ? formatCurrency(pricing.deliveryFee) : "Miễn phí"} />
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="font-bold text-slate-950">Tổng thanh toán</span>
                  <span className="text-xl font-bold text-emerald-700">{formatCurrency(pricing.total)}</span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function AccountStep({ currentUser }: { currentUser: CurrentUser | null }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-slate-950">1. Xác nhận tài khoản</h2>
      <p className="mt-1 text-sm text-slate-500">Đăng nhập giúp đơn thuê/mua xuất hiện trong lịch sử đọc và thông báo đúng người.</p>
      {currentUser ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <KeyTitle icon={<ShieldCheck className="h-5 w-5" />} title={`Đang đăng nhập: ${currentUser.fullName}`} />
          <p className="mt-2 text-sm leading-6">{currentUser.email} · {currentUser.roles.join(", ")}</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link href="/login" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 hover:bg-emerald-100">
            <KeyTitle icon={<ShieldCheck className="h-5 w-5" />} title="Đăng nhập tài khoản" />
            <p className="mt-2 text-sm leading-6">Đăng nhập để đơn thuê/mua gắn với hồ sơ độc giả của bạn.</p>
          </Link>
          <Link href="/register" className="lb-surface-flat p-4 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50">
            <KeyTitle icon={<Library className="h-5 w-5" />} title="Tạo tài khoản mới" />
            <p className="mt-2 text-sm leading-6">Phù hợp cho độc giả mới muốn nhận thông báo hạn trả và giữ chỗ.</p>
          </Link>
        </div>
      )}
      <label className="mt-4 flex gap-3 lb-muted-box p-3 text-sm leading-6 text-slate-600">
        <input required type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700" defaultChecked />
        Tôi xác nhận thông tin tài khoản hiện tại là hợp lệ để tiếp tục.
      </label>
    </section>
  );
}

function DeliveryStep({
  delivery,
  setDelivery,
  deliveryAddress,
  setDeliveryAddress
}: {
  delivery: DeliveryMode;
  setDelivery: (value: DeliveryMode) => void;
  deliveryAddress: string;
  setDeliveryAddress: (value: string) => void;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold text-slate-950">2. Chọn cách nhận sách</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <ChoiceCard
          active={delivery === "pickup"}
          icon={<MapPin className="h-5 w-5" />}
          title="Nhận tại thư viện"
          text="Giữ sách trong 24 giờ tại quầy. Phù hợp khi muốn lấy ngay."
          onClick={() => setDelivery("pickup")}
        />
        <ChoiceCard
          active={delivery === "delivery"}
          icon={<Truck className="h-5 w-5" />}
          title="Giao tận nơi"
          text="Giao sách trong nội thành, có theo dõi trạng thái đơn."
          onClick={() => setDelivery("delivery")}
        />
      </div>
      {delivery === "delivery" ? (
        <label className="mt-4 block">
          <span className="text-sm font-bold text-slate-700">Địa chỉ giao sách</span>
          <input
            name="deliveryAddress"
            required
            value={deliveryAddress}
            onChange={(event) => setDeliveryAddress(event.target.value)}
            placeholder="Số nhà, đường, phường/xã, quận/huyện"
            className="mt-2 h-11 w-full lb-input px-3 text-sm"
          />
        </label>
      ) : null}
    </section>
  );
}

function PaymentStep({
  mode,
  delivery,
  pricing
}: {
  mode: CheckoutMode;
  delivery: DeliveryMode;
  pricing: { rentFee: number; deposit: number; buyPrice: number; deliveryFee: number; total: number };
}) {
  return (
    <section>
      <h2 className="text-xl font-bold text-slate-950">3. Thanh toán và xác nhận</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="lb-surface-flat p-4">
          <KeyTitle icon={<CreditCard className="h-5 w-5" />} title="Thanh toán" />
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {mode === "rent" ? "Thu phí thuê và tiền cọc hoàn trả khi trả sách đúng tình trạng." : "Thanh toán giá mua bản cá nhân và phí giao nếu có."}
          </p>
        </div>
        <div className="lb-surface-flat p-4">
          <KeyTitle icon={<PackageCheck className="h-5 w-5" />} title="Sau xác nhận" />
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {delivery === "pickup" ? "Sách được giữ tại quầy và chuyển sang mục Sách của tôi." : "Đơn giao được tạo kèm trạng thái xử lý."}
          </p>
        </div>
      </div>
      <div className="mt-4 lb-muted-box p-4">
        <SummaryLine label="Tổng cần thanh toán" value={formatCurrency(pricing.total)} />
      </div>
    </section>
  );
}

function ChoiceCard({ active, icon, title, text, onClick }: { active: boolean; icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition ${
        active ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm" : "border-[var(--line)] bg-white text-slate-700 hover:border-emerald-200"
      }`}
    >
      <KeyTitle icon={icon} title={title} />
      <p className="mt-2 text-sm leading-6">{text}</p>
    </button>
  );
}

function StepPill({ active, done, index, label }: { active: boolean; done: boolean; index: number; label: string }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 text-sm font-bold ${
        active || done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-[var(--line)] bg-white text-slate-500"
      }`}
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-xs shadow-sm">{done ? <CheckCircle2 className="h-4 w-4" /> : index}</span>
      {label}
    </div>
  );
}

function KeyTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 font-bold">
      {icon}
      {title}
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-bold text-slate-950">{value}</span>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}
