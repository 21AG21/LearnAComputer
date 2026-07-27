"use client";

import { useEffect } from "react";
import Link from "next/link";
import DrDigitalAvatar from "@/components/DrDigitalAvatar";

/**
 * Without this, an unexpected error in any client component leaves a blank white
 * page — the single most frightening thing that can happen to somebody who is
 * still deciding whether computers can be trusted.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[LearnAComputer] Unhandled error:", error);
  }, [error]);

  return (
    <main className="flex h-full items-center justify-center overflow-y-auto p-6">
      <div className="max-w-md text-center">
        <DrDigitalAvatar className="mx-auto h-16 w-16" />
        <h1 className="mt-4 text-2xl font-bold">Something went wrong on our end</h1>
        <p className="mt-2 leading-relaxed text-gray-600 dark:text-gray-400">
          This is a fault in the website, not in your computer, and you have not lost anything. Your finished lessons
          are saved.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Try that again
          </button>
          <Link
            href="/lessons"
            className="rounded-lg border-2 border-gray-300 px-5 py-2.5 font-semibold transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Back to the lessons
          </Link>
        </div>
        {error.digest && <p className="mt-6 font-mono text-xs text-gray-400">Reference: {error.digest}</p>}
      </div>
    </main>
  );
}
