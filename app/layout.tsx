import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import ThemeToggle, { THEME_INIT_SCRIPT } from "@/components/ThemeToggle";
import StorageNotice from "@/components/StorageNotice";
import CookieNotice from "@/components/CookieNotice";
import SmallScreenGuard from "@/components/SmallScreenGuard";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-app-title",
});

export const metadata: Metadata = {
  // Says what the site is, not just what it is called: this is the fallback
  // title for any page that does not set its own, and the one a search result
  // shows. Pages that export their own title still win.
  title: "LearnAComputer — learn to use a computer, step by step",
  description:
    "Hands-on computer lessons for complete beginners. Practice clicking, typing, email, video calls and staying safe online inside a computer you cannot break.",
};

const NAV = [
  { href: "/", label: "Home" },
  { href: "/lessons", label: "Lessons" },
  { href: "/playground", label: "Playground" },
  { href: "/certificate", label: "Certificates" },
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
          </div>
        </nav>
        <StorageNotice />
        <CookieNotice />
        <SmallScreenGuard />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
