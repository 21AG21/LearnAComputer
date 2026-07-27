"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Where the link in the sign-in email lands. Two shapes have to be handled: the
 * newer flow puts a `code` in the query string to exchange for a session, and
 * the older one puts the tokens in the URL fragment, which the client picks up
 * on its own. Either way the learner should end up in the lessons without having
 * to understand any of that.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError("Accounts are not switched on for this copy of the site.");
      return;
    }
    let cancelled = false;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const described = params.get("error_description");

      if (described) {
        setError(described);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setError("That link has already been used, or it expired. Ask for a new one.");
          return;
        }
      } else {
        // Fragment flow: the client reads the tokens itself, so just wait for it.
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!data.session) {
          setError("That link did not sign you in. Ask for a new one.");
          return;
        }
      }
      router.replace("/lessons");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-full items-center justify-center p-6">
      <div className="max-w-sm text-center">
        {error ? (
          <>
            <h1 className="text-xl font-bold">That did not work</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{error}</p>
            <Link href="/login" className="mt-4 inline-block font-semibold text-blue-600 underline">
              Try signing in again
            </Link>
          </>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">Signing you in…</p>
        )}
      </div>
    </main>
  );
}
