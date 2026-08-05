"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

/**
 * What a phone visitor sees.
 *
 * The main course teaches laptop and desktop computers — the sims need a
 * keyboard and a pointer, and the lesson layout needs width — and this audience
 * *will* be sent the link by text message. Rather than let a first impression be
 * a squashed sliver, say so kindly and show the address big enough to retype.
 *
 * **It no longer ends there.** For most of this page's life the only thing on
 * offer was "go and find a computer", which for a great many people is the end
 * of the conversation: plenty of the learners this course is for own a phone and
 * nothing else. There is now a course built for the device in their hand, so the
 * first and largest thing here is a way into it, and the laptop course is the
 * second option rather than the only one.
 *
 * Renders nothing until measured, nothing on adequate screens, nothing at all on
 * the phone course itself, and never again in this tab once dismissed.
 */
export default function SmallScreenGuard() {
  const pathname = usePathname();
  const [tooSmall, setTooSmall] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // The live host, not a hardcoded one — always right on any deployment.
  const [host, setHost] = useState("");

  useEffect(() => {
    setHost(window.location.host);
    // Gate on a genuinely small *touch* device, not on width alone. Browser zoom
    // shrinks `innerWidth`, so a `< 900` width check fired this warning on a fine
    // laptop that a low-vision learner had merely zoomed in on — telling someone who
    // just enlarged the text that their computer is too small. A phone/tablet reports
    // a coarse pointer; a zoomed laptop keeps its fine pointer, so it no longer trips.
    // (The activity now stacks responsively, so a zoomed laptop stays fully usable.)
    const check = () =>
      setTooSmall(window.innerWidth < 900 && window.matchMedia("(pointer: coarse)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // The phone course is *meant* to be played here. Covering it with a notice
  // saying phones are too small would be both wrong and slightly insulting.
  if (pathname?.startsWith("/phone")) return null;
  if (!tooSmall || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-white p-6 dark:bg-[#10151b]">
      <div className="mx-auto max-w-md py-6 text-center">
        <p className="text-2xl font-bold">You are on a phone</p>
        <p className="mt-3 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
          These lessons teach a laptop, so they need a keyboard and a mouse or trackpad. But there is a whole
          course built for the phone in your hand.
        </p>

        <Link
          href="/phone"
          onClick={() => setDismissed(true)}
          className="mt-6 block rounded-xl bg-blue-600 px-5 py-4 text-lg font-bold text-white"
        >
          Start the phone course
        </Link>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Tapping, holding, swiping, and the keyboard made of glass. Nothing to install.
        </p>

        <hr className="my-8 border-gray-300 dark:border-gray-700" />

        <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
          For the laptop course, open this address on a computer:
        </p>
        <p className="mt-3 rounded-xl border-2 border-gray-500 bg-gray-50 px-4 py-3 text-xl font-bold tracking-wide dark:border-gray-700 dark:bg-gray-900">
          {host}
        </p>
        <p className="mt-3 text-gray-700 dark:text-gray-300">
          Nothing to install there either — it works in the computer&apos;s web browser.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="mt-6 text-base font-medium text-gray-700 underline hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
        >
          Continue here anyway
        </button>
      </div>
    </div>
  );
}
