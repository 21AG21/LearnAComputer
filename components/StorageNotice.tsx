"use client";

import { useEffect, useState } from "react";
import { isStorageDegraded, STORAGE_DEGRADED_EVENT } from "@/lib/safeStorage";

/**
 * One calm banner for the one storage problem worth telling the learner about:
 * this browser cannot save, so progress lasts only as long as the tab.
 *
 * Shown only when a write has actually fallen back to memory (private browsing,
 * a full quota, a locked-down library machine). Never an error tone — the course
 * still works, and the fix is stated in one sentence.
 */
export default function StorageNotice() {
  const [degraded, setDegraded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // A write may already have failed before this mounted.
    if (isStorageDegraded()) setDegraded(true);
    const onDegraded = () => setDegraded(true);
    window.addEventListener(STORAGE_DEGRADED_EVENT, onDegraded);
    return () => window.removeEventListener(STORAGE_DEGRADED_EVENT, onDegraded);
  }, []);

  if (!degraded || dismissed) return null;

  return (
    <div
      role="status"
      className="flex items-start justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <p>
        <strong>Heads up:</strong> this browser is not saving your progress. Everything you finish
        still counts while this window is open — it just will not be here tomorrow. Signing in
        saves it for good.
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 rounded px-2 py-0.5 font-bold hover:bg-amber-100 dark:hover:bg-amber-900"
      >
        &#10005;
      </button>
    </div>
  );
}
