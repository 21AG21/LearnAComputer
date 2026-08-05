"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * The bar across the top of every page.
 *
 * ## Why it is one row that scrolls, and not a row that wraps
 *
 * Six links do not fit across a 390px phone. Wrapping them was the previous
 * answer and it cost a whole second row — 44px of a screen where the thing
 * underneath is a simulated computer that needs every pixel it can get. A single
 * row that scrolls sideways *inside its own box* keeps every link reachable, and
 * `overflow-x` on the strip rather than the page means `hostile-check`'s "nothing
 * scrolls sideways" rule still holds for the document.
 *
 * The links are wide targets with generous spacing, so scrolling them with a
 * thumb does not fire one by accident: `touch-action: pan-x` hands horizontal
 * drags to the browser as scrolling rather than letting them land as taps.
 *
 * ## It steps out of the way of the phone course
 *
 * `/phone` runs a full-viewport activity layer over the top of this. The nav is
 * still here — the course list needs it — but the activity covers it entirely,
 * so a lesson on a phone gets the whole screen. Nothing here needs to know that;
 * it is just worth knowing why this bar is never seen mid-lesson.
 */
const NAV = [
  { href: "/", label: "Home" },
  { href: "/lessons", label: "Lessons" },
  { href: "/playground", label: "Playground" },
  { href: "/certificate", label: "Certificates" },
  { href: "/phone", label: "On Your Phone" },
  { href: "/feedback", label: "Feedback" },
];

export default function SiteNav() {
  const pathname = usePathname();
  const strip = useRef<HTMLDivElement>(null);

  /**
   * Scroll the current page's own link into view.
   *
   * At 390px the strip shows about four of the six links, so on `/phone` — the
   * page furthest right — the blue "you are here" pill sat 168px off screen and
   * what the learner saw instead was "Certifica" sliced mid-word against the
   * theme toggle. That reads as a rendering fault, not as "there is more this
   * way".
   */
  useEffect(() => {
    strip.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  return (
    <nav className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-800 print:hidden">
      {/* The fade is the affordance: a link cut off by a hard edge looks broken,
          and the same link fading out looks like there is more to the right. */}
      <div
        ref={strip}
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [mask-image:linear-gradient(to_right,black_0,black_calc(100%-24px),transparent_100%)] [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
        aria-label="Site sections"
      >
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 transition-colors active:scale-95 ${
                active
                  ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "hover:text-blue-600 dark:hover:text-blue-400"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="shrink-0">
        <ThemeToggle />
      </div>
    </nav>
  );
}
