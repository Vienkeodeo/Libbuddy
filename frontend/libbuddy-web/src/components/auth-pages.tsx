"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, KeyRound, LibraryBig, Mail, Phone, User, UserPlus } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { login, register, storeSession, type CurrentUser } from "@/lib/api";

type AuthMode = "login" | "register";

export function AuthPage({ mode }: { mode: AuthMode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isLogin = mode === "login";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const phone = String(formData.get("phone") ?? "");

    try {
      const auth = isLogin ? await login(email, password) : await register(fullName, email, password, phone || undefined);
      storeSession(auth);
      setCurrentUser(auth.user);
      setTimeout(() => router.push("/books"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xác thực tài khoản.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lb-page">
      <AppHeader active="home" />
      <main className="mx-auto grid min-h-[calc(100vh-72px)] w-full max-w-[1180px] gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:px-9">
        <section className="lb-panel p-7 lg:p-8">
          <div className="flex items-center gap-3 text-emerald-700">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-700 text-white">
              <LibraryBig className="h-6 w-6" />
            </span>
            <span className="text-sm font-bold">Tài khoản Libbuddy</span>
          </div>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.14] tracking-normal text-slate-950">
            {isLogin ? "Đăng nhập để tiếp tục mượn hoặc mua sách" : "Tạo tài khoản để quản lý hành trình đọc"}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Tài khoản giúp độc giả giữ lịch sử đọc, đặt trước sách, theo dõi hạn trả và thanh toán phí thuê hoặc mua bản cá nhân một cách rõ ràng.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <ValueItem title="Một tài khoản" text="Dùng cho tìm kiếm, AI tư vấn, mượn, mua và theo dõi lịch sử." />
            <ValueItem title="Nhắc hạn thông minh" text="Thông báo trước hạn trả, giữ chỗ và trạng thái giao nhận." />
            <ValueItem title="Hồ sơ riêng tư" text="Thông tin cá nhân và lịch sử đọc được gắn với tài khoản của bạn." />
          </div>
        </section>

        <section className="lb-surface p-6">
          <div className="flex items-center gap-2 text-slate-950">
            {isLogin ? <KeyRound className="h-5 w-5 text-emerald-700" /> : <UserPlus className="h-5 w-5 text-emerald-700" />}
            <h2 className="text-xl font-bold">{isLogin ? "Đăng nhập" : "Đăng ký"}</h2>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {!isLogin ? (
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Họ và tên</span>
                <div className="relative mt-2">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    name="fullName"
                    required
                    className="h-11 w-full lb-input pl-9 pr-3 text-sm"
                  />
                </div>
              </label>
            ) : null}
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Email hoặc số điện thoại</span>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  required
                  type="email"
                  name="email"
                  className="h-11 w-full lb-input pl-9 pr-3 text-sm"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Mật khẩu</span>
              <input
                required
                type="password"
                name="password"
                minLength={8}
                placeholder="Tối thiểu 8 ký tự"
                className="mt-2 h-11 w-full lb-input px-3 text-sm"
              />
            </label>

            {!isLogin ? (
              <>
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Số điện thoại</span>
                  <div className="relative mt-2">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      name="phone"
                      className="h-11 w-full lb-input pl-9 pr-3 text-sm"
                    />
                  </div>
                </label>
                <label className="flex gap-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                  <input required type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700" />
                  Tôi đồng ý nhận thông báo hạn trả, đặt trước và cập nhật đơn thuê/mua sách từ Libbuddy.
                </label>
              </>
            ) : null}

            <button
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 lb-btn-primary px-4 text-sm font-bold disabled:bg-slate-300"
            >
              {loading ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Tạo tài khoản"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {error ? (
            <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>
          ) : null}

          {currentUser ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                {isLogin ? "Đăng nhập thành công" : "Tạo tài khoản thành công"}
              </div>
              <p className="mt-1">
                Xin chào {currentUser.fullName}. Bạn có thể tiếp tục chọn sách, tạo đơn thuê/mua và theo dõi trong Sách của tôi.
              </p>
              <Link href="/books" className="mt-2 inline-flex text-sm font-bold text-emerald-800 hover:text-emerald-950">
                Tiếp tục chọn sách
              </Link>
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
            <span className="text-slate-500">{isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}</span>
            <Link href={isLogin ? "/register" : "/login"} className="font-bold text-blue-700 hover:text-blue-800">
              {isLogin ? "Đăng ký ngay" : "Đăng nhập"}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function ValueItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-emerald-900/10 bg-white/70 p-4">
      <h3 className="font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
