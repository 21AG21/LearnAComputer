import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import ThemeToggle, { THEME_INIT_SCRIPT } from "@/components/ThemeToggle";
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

const NAV = [
  { href: "/", label: "Home" },
  { href: "/lessons", label: "Lessons" },
  { href: "/playground", label: "Playground" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs before paint. Without it the page renders light and then flips. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`flex h-screen flex-col bg-white text-gray-900 dark:bg-[#10151b] dark:text-gray-100 ${roboto.variable}`}
      >
        <nav className="flex shrink-0 items-center gap-4 border-b border-gray-200 p-4 dark:border-gray-800">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-block transition-colors hover:text-blue-600 active:scale-95 dark:hover:text-blue-400"
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-block text-sm text-gray-500 transition-colors hover:text-blue-600 active:scale-95 dark:text-gray-400 dark:hover:text-blue-400"
            >
              Sign in
            </Link>
          </div>
        </nav>
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
