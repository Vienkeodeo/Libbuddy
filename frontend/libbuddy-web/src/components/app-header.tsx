"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Bookmark, LibraryBig, LogIn, LogOut, Menu, UserPlus, X } from "lucide-react";
import { clearSession, logout, getStoredUser, type CurrentUser } from "@/lib/api";

type AppHeaderProps = {
  active?: "home" | "books" | "ai" | "my" | "admin";
};

const navItems = [
  { key: "home", label: "Khám phá", href: "/" },
  { key: "books", label: "Kho sách", href: "/books" },
  { key: "ai", label: "AI tư vấn", href: "/ai-advisor" },
  { key: "my", label: "Sách của tôi", href: "/my-books" }
] as const;

export function AppHeader({ active = "home" }: AppHeaderProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const syncUser = () => setUser(getStoredUser());
    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("libbuddy:session", syncUser);
    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("libbuddy:session", syncUser);
    };
  }, []);

  function handleLogout() {
    logout();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 lg:px-9">
        <Link href="/" className="flex items-center gap-3 text-slate-950">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-700 text-white shadow-[0_12px_24px_rgba(4,120,87,0.18)]">
            <LibraryBig className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <span className="text-xl font-extrabold tracking-normal">Libbuddy</span>
        </Link>

        <nav className="hidden items-center rounded-lg border border-[var(--line)] bg-slate-50/80 p-1 md:flex">
          {navItems.map((item) => {
            const selected = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`rounded-md px-4 py-2.5 text-sm font-bold transition ${
                  selected ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative flex items-center gap-3">
          <button
            type="button"
            onClick={() => setNotificationsOpen((current) => !current)}
            className="relative grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            aria-label="Thông báo"
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-600" />
          </button>
          <Link
            href="/my-books?tab=saved"
            className="hidden h-10 w-10 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 sm:grid"
            aria-label="Sách đã lưu"
          >
            <Bookmark className="h-5 w-5" />
          </Link>

          {user ? (
            <div className="hidden items-center gap-3 sm:flex">
              <span className="text-sm font-bold text-slate-700">{user.fullName}</span>
              <button
                onClick={handleLogout}
                className="lb-btn-ghost inline-flex h-10 items-center gap-2 px-3 text-sm font-bold text-slate-600 hover:text-rose-600"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="lb-btn-ghost hidden h-10 items-center gap-2 px-3 text-sm font-bold sm:inline-flex"
              >
                <LogIn className="h-4 w-4" />
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="lb-btn-primary inline-flex h-10 items-center gap-2 px-3 text-sm font-bold"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Đăng ký</span>
              </Link>
            </>
          )}

          <button
            className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 md:hidden"
            aria-label="Menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {notificationsOpen ? (
        <div className="absolute right-5 top-[64px] z-40 w-[min(360px,calc(100vw-40px))] rounded-lg border border-[var(--line)] bg-white p-3 shadow-xl lg:right-9">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <p className="text-sm font-bold text-slate-950">Thông báo</p>
            <button
              type="button"
              onClick={() => setNotificationsOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Đóng thông báo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 pt-3">
            <NotificationItem title="Đơn thuê/mua" detail="Theo dõi trạng thái nhận sách trong Sách của tôi." href="/my-books?tab=reserved" />
            <NotificationItem title="Nhắc hạn trả" detail="Libbuddy sẽ hiển thị sách sắp đến hạn sau khi bạn đăng nhập." href="/my-books" />
            <NotificationItem title="AI tư vấn" detail="Hỏi AI để tìm sách phù hợp với mục tiêu đọc hôm nay." href="/ai-advisor" />
          </div>
        </div>
      ) : null}

      {mobileMenuOpen ? (
        <nav className="border-t border-[var(--line)] bg-white px-5 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const selected = active === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-md px-4 py-3 text-sm font-bold transition ${
                    selected ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {user ? (
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="rounded-md px-4 py-3 text-left text-sm font-bold text-rose-600 transition hover:bg-rose-50"
              >
                Đăng xuất ({user.fullName})
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function NotificationItem({ title, detail, href }: { title: string; detail: string; href: string }) {
  return (
    <Link href={href} className="block rounded-md border border-slate-100 bg-slate-50 p-3 transition hover:border-emerald-200 hover:bg-emerald-50">
      <p className="text-sm font-bold text-slate-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </Link>
  );
}
