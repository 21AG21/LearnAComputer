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
      <body>
        <nav className="border-b p-4 flex gap-4">
          <Link href="/">Home</Link>
          <Link href="/lessons">Lessons</Link>
          <Link href="/dashboard">Dashboard</Link>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
