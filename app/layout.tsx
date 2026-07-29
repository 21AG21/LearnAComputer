import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import ThemeToggle, { THEME_INIT_SCRIPT } from "@/components/ThemeToggle";
import AuthProvider from "@/components/AuthProvider";
import StorageNotice from "@/components/StorageNotice";
import SmallScreenGuard from "@/components/SmallScreenGuard";
import AccountNav from "@/components/AccountNav";
import { Analytics } from "@vercel/analytics/next";
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
        <AuthProvider>
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
              <AccountNav />
            </div>
          </nav>
          <StorageNotice />
          <SmallScreenGuard />
          <PageTransition>{children}</PageTransition>
        </AuthProvider>
        {/*
          Page-view counts from the host we already deploy to: cookieless, no
          cross-site identifier, and it never sees lesson progress — that stays
          in localStorage and (for signed-in learners) our own Supabase project.
        */}
        <Analytics />
      </body>
    </html>
  );
}
