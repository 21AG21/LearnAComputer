import Link from "next/link";
import type { ReactNode } from "react";
import SiteFooter from "@/components/SiteFooter";

interface LegalPageProps {
  title: string;
  updated: string;
  children: ReactNode;
}

/** Shared shell for the About and policy pages: one column, generous measure, a footer. */
export default function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <div className="h-full overflow-y-auto">
      <article className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/"
          className="text-sm text-gray-500 underline underline-offset-2 dark:text-gray-400"
        >
          ← Home
        </Link>
        <h1 className="mt-4 text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Last updated {updated}</p>
        <div
          className="
            mt-8 space-y-5 leading-relaxed
            [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold
            [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6
            [&_a]:underline [&_a]:underline-offset-2
            [&_strong]:font-semibold
          "
        >
          {children}
        </div>
      </article>
      <SiteFooter />
    </div>
  );
}
