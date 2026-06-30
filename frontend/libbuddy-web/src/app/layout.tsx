import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Libbuddy",
  description: "AI-powered library discovery and management web app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">{children}</body>
    </html>
  );
}
