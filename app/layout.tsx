import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearnAComputer",
  description: "Basic computer literacy, taught step by step.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen flex flex-col">
        <nav className="border-b p-4 flex gap-4 shrink-0">
          <Link href="/">Home</Link>
          <Link href="/lessons">Lessons</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/playground">Playground</Link>
        </nav>
        <main className="flex-1 min-h-0">{children}</main>
      </body>
    </html>
  );
}
