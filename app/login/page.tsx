"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DrDigitalAvatar from "@/components/DrDigitalAvatar";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type Stage = "email" | "verify" | "done";

/**
 * No passwords. A learner types their email, we send them one message, and they
 * either type the code in it or click the link in it — whichever their email
 * shows them. A password is one more thing to invent, forget and be locked out
 * by, which is exactly the experience this course exists to prevent.
 */
export default function LoginPage() {
  const router = useRouter();
  const { session, email: signedInAs, signOut } = useAuth();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resentAt, setResentAt] = useState<number | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session && stage !== "done") setStage("done");
  }, [session, stage]);

  useEffect(() => {
    if (stage === "verify") codeRef.current?.focus();
  }, [stage]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!supabase) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setResentAt(Date.now());
    setStage("verify");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.replace(/\D/g, ""),
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes("expired")
          ? "That code has expired. Send yourself a new one."
          : "That code did not match. Check the email again — it is six digits.",
      );
      return;
    }
    setStage("done");
    router.push("/lessons");
  }

  const field =
    "w-full rounded-lg border-2 border-gray-300 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950";
  const primary =
    "w-full rounded-lg bg-blue-600 py-2.5 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60";

  return (
    <main className="flex min-h-full items-center justify-center overflow-y-auto p-4">
      <div className="w-full max-w-sm py-8">
        <div className="rounded-2xl border-2 border-black bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-6 flex flex-col items-center gap-3">
            <DrDigitalAvatar className="h-16 w-16" />
            <h1 className="text-center text-2xl font-bold">
              {stage === "done" ? "You are signed in" : stage === "verify" ? "Check your email" : "Save your progress"}
            </h1>
          </div>

          {!supabase && (
            <div className="mb-5 rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              Accounts are not switched on for this copy of the site. Everything still works — your progress is saved on
              this device.
            </div>
          )}

          {stage === "email" && supabase && (
            <form onSubmit={sendCode} className="flex flex-col gap-4">
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                Progress is kept on this device. Add your email and it follows you to any computer you sign in on. There
                is no password to invent or forget.
              </p>
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium">
                  Your email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={field}
                  placeholder="you@example.com"
                />
              </div>
              {error && <Problem>{error}</Problem>}
              <button type="submit" disabled={loading || !email.trim()} className={primary}>
                {loading ? "Sending…" : "Email me a code"}
              </button>
            </form>
          )}

          {stage === "verify" && supabase && (
            <form onSubmit={verify} className="flex flex-col gap-4">
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                We sent a message to <strong className="text-gray-900 dark:text-gray-100">{email}</strong>. Open it and
                type the six-digit code below. If the email shows a button or a link instead, clicking that signs you in
                just the same.
              </p>
              <div className="flex flex-col gap-1">
                <label htmlFor="code" className="text-sm font-medium">
                  Six-digit code
                </label>
                <input
                  ref={codeRef}
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={`${field} text-center font-mono text-2xl tracking-[0.4em]`}
                  placeholder="000000"
                />
              </div>
              {error && <Problem>{error}</Problem>}
              <button type="submit" disabled={loading || code.replace(/\D/g, "").length < 6} className={primary}>
                {loading ? "Checking…" : "Sign in"}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStage("email");
                    setCode("");
                    setError(null);
                  }}
                  className="text-gray-500 underline hover:text-gray-700 dark:text-gray-400"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={() => sendCode()}
                  disabled={loading || (resentAt != null && Date.now() - resentAt < 30000)}
                  className="text-gray-500 underline hover:text-gray-700 disabled:opacity-40 dark:text-gray-400"
                >
                  Send it again
                </button>
              </div>
              <p className="text-xs leading-relaxed text-gray-500">
                Nothing arrived? It can take a minute, and it sometimes lands in the junk folder.
              </p>
            </form>
          )}

          {stage === "done" && (
            <div className="flex flex-col gap-4">
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                Signed in as <strong className="text-gray-900 dark:text-gray-100">{signedInAs}</strong>. Finished
                lessons are saved to this account from now on, and anything you had already done on this device has been
                kept.
              </p>
              <Link href="/lessons" className={`${primary} block text-center`}>
                Back to the lessons
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  setStage("email");
                  setCode("");
                }}
                className="text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400"
              >
                Sign out
              </button>
            </div>
          )}

          <div className="my-5 border-t border-gray-200 dark:border-gray-800" />

          <Link
            href="/lessons"
            className="block w-full rounded-lg border-2 border-gray-300 bg-gray-50 px-4 py-2.5 text-center text-base font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {stage === "done" ? "Keep going" : "Carry on without an account"}
          </Link>
        </div>
      </div>
    </main>
  );
}

function Problem({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {children}
    </p>
  );
}
