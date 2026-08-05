"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { storageGet, storageSet } from "@/lib/safeStorage";

const SEEN_KEY = "lac-notice-seen";

/**
 * The storage notice.
 *
 * There is nothing to consent to here, which is the point: this site sets no
 * cookies at all, and the only thing it keeps is a list of the lessons finished
 * on this device. So this is a disclosure, not a consent gate — no "accept all"
 * button, nothing blocked until it is dismissed, and no second banner asking
 * again later. Once acknowledged it never comes back, because the acknowledgement
 * itself is stored the same way everything else is: locally, with no expiry.
 *
 * Dismissal is remembered through safeStorage, so on a locked-down machine
 * where writing fails the banner simply shows again rather than breaking.
 */
export default function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // After mount only: reading storage during render would mismatch the
    // server-rendered HTML and flash the banner on every page.
    setShow(storageGet(SEEN_KEY) !== "1");
  }, []);

  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="How this site stores your progress"
      // Tighter on a phone. The full text stays — this is a disclosure and
      // shortening it would make it a less honest one — but at the roomy desktop
      // size it took 430px off an 844px screen, which on the phone course is half
      // the simulated phone gone until somebody finds the button.
      className="shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs sm:py-3 sm:text-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="leading-snug text-gray-700 sm:leading-relaxed dark:text-gray-300">
          <strong>This site uses no cookies and no accounts.</strong> It remembers which lessons you
          have finished, on this device only, so you can pick up where you left off — and that never
          leaves your browser. We count anonymous page views to see which lessons get used.{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            What is stored
          </Link>
        </p>
        <button
          onClick={() => {
            storageSet(SEEN_KEY, "1");
            setShow(false);
          }}
          className="shrink-0 self-start rounded-lg border-2 border-gray-500 px-4 py-2 text-sm font-semibold hover:bg-gray-100 sm:self-auto dark:border-gray-600 dark:hover:bg-gray-800"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
