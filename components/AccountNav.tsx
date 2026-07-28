"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

/**
 * The nav's account corner. Signed out it is a link; signed in it shows who you
 * are and whether your progress has reached the account yet — because "is it
 * saved?" is exactly the anxiety this audience has, and a silent sync answers it
 * for nobody.
 */
export default function AccountNav() {
  const { email, ready, syncState, signOut } = useAuth();

  if (!ready) return <span className="text-sm text-gray-500 dark:text-gray-400">&nbsp;</span>;

  if (!email) {
    return (
      <Link
        href="/login"
        className="inline-block text-sm text-gray-500 transition-colors hover:text-blue-600 active:scale-95 dark:text-gray-400 dark:hover:text-blue-400"
      >
        Sign in
      </Link>
    );
  }

  const status =
    syncState === "syncing" ? "Saving…" : syncState === "error" ? "Not saved" : "Saved to your account";

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-gray-500 sm:inline dark:text-gray-400" title={email}>
        {email}
      </span>
      <span
        className={`hidden text-xs md:inline ${syncState === "error" ? "text-red-600" : "text-gray-500 dark:text-gray-400"}`}
      >
        {status}
      </span>
      <button
        onClick={signOut}
        className="text-sm text-gray-500 underline underline-offset-2 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
      >
        Sign out
      </button>
    </div>
  );
}
