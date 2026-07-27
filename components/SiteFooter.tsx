import Link from "next/link";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/accessibility", label: "Accessibility" },
];

export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-gray-200 px-6 py-8 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>LearnAComputer — basic computer skills, taught step by step.</p>
        <nav className="flex flex-wrap gap-4">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="underline-offset-2 hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
