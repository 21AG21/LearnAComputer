"use client";

import { useEffect, useState } from "react";

/**
 * The course teaches laptop and desktop computers — the sims need a keyboard
 * and a pointer, and the lesson layout needs width. On a phone it silently
 * breaks, and this audience *will* be sent the link by text message. Rather
 * than let a first impression be a squashed sliver, say so kindly, show the
 * address big enough to retype, and still allow continuing (small tablets in
 * landscape can be workable).
 *
 * Renders nothing until measured, nothing on adequate screens, and never again
 * in this tab once dismissed.
 */
export default function SmallScreenGuard() {
  const [tooSmall, setTooSmall] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // The live host, not a hardcoded one — always right on any deployment.
  const [host, setHost] = useState("");

  useEffect(() => {
    setHost(window.location.host);
    const check = () => setTooSmall(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!tooSmall || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white p-6 dark:bg-[#10151b]">
      <div className="max-w-md text-center">
        <p className="text-2xl font-bold">This course needs a bigger screen</p>
        <p className="mt-3 text-lg leading-relaxed text-gray-600 dark:text-gray-300">
          LearnAComputer teaches laptop and desktop computers, so the practice
          activities need a keyboard and a mouse or trackpad. Open this address
          on a computer:
        </p>
        <p className="mt-4 rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 text-xl font-bold tracking-wide dark:border-gray-700 dark:bg-gray-900">
          {host}
        </p>
        <p className="mt-3 text-gray-500 dark:text-gray-400">
          Nothing to install — it works in the computer&apos;s web browser.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="mt-6 text-sm text-gray-400 underline hover:text-gray-600 dark:hover:text-gray-300"
        >
          Continue here anyway
        </button>
      </div>
    </div>
  );
}
