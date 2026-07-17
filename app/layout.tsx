import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-app-title",
});

export const metadata: Metadata = {
  title: "LearnAComputer",
  description: "Basic computer literacy, taught step by step.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`h-screen flex flex-col ${roboto.variable}`}>
        <nav className="border-b p-4 flex gap-4 shrink-0">
          <Link href="/" className="transition-colors hover:text-blue-600 active:scale-95 inline-block">
            Home
          </Link>
          <Link href="/lessons" className="transition-colors hover:text-blue-600 active:scale-95 inline-block">
            Lessons
          </Link>
          <Link href="/dashboard" className="transition-colors hover:text-blue-600 active:scale-95 inline-block">
            Dashboard
          </Link>
          <Link href="/playground" className="transition-colors hover:text-blue-600 active:scale-95 inline-block">
            Playground
          </Link>
        </nav>
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
