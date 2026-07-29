import Link from "next/link";
import { REPORT_PROBLEM_URL, OPENS_GOOGLE_FORMS } from "@/lib/feedbackLinks";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/accessibility", label: "Accessibility" },
];

export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-gray-200 px-6 py-8 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
      {/* Wider than any page it sits in, so it inherits each page's own width
          instead of pinching to a different one. */}
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>LearnAComputer — basic computer skills, taught step by step.</p>
        <nav className="flex flex-wrap gap-4">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="underline-offset-2 hover:underline">
              {l.label}
            </Link>
          ))}
          {/* An ordinary link, not an embed: nothing is sent anywhere until the
              learner clicks, and the title says where it goes. */}
          <a
            href={REPORT_PROBLEM_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={OPENS_GOOGLE_FORMS}
            className="underline-offset-2 hover:underline"
          >
            Report a problem
          </a>
        </nav>
      </div>
    </footer>
  );
}
