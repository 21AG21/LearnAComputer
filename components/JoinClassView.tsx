"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  classesEnabled,
  ClassesNotSetUpError,
  joinClass,
  leaveClass,
  myMemberships,
  type Membership,
} from "@/lib/classes";

export default function JoinClassView() {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [mine, setMine] = useState<Membership[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setMine(await myMemberships());
    } catch {
      /* the page still works without the list */
    }
  }, []);

  useEffect(() => {
    if (userId) void refresh();
  }, [userId, refresh]);

  if (!classesEnabled()) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-bold">Join a class</h1>
        <p className="mt-4 text-lg">Classes are not set up on this copy of the site.</p>
      </main>
    );
  }

  if (!ready) {
    return <main className="mx-auto max-w-2xl px-6 py-16 text-gray-600">One moment…</main>;
  }

  if (!userId) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-bold">Join a class</h1>
        <p className="mt-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
          If somebody gave you a class code, sign in first and then come back here. Signing in is an
          email address and a six-digit code — there is no password to remember.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
        >
          Sign in
        </Link>
      </main>
    );
  }

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      const cls = await joinClass(code, name);
      setJoined(cls.name);
      setCode("");
      await refresh();
    } catch (err) {
      // A database that has not been migrated is not the learner's fault, and
      // "relation does not exist" means nothing to them.
      setProblem(
        err instanceof ClassesNotSetUpError
          ? "Classes are not switched on for this site yet. Ask whoever gave you the code."
          : err instanceof Error
            ? err.message
            : "That did not work. Check the code and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold">Join a class</h1>
      <p className="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">
        Type the code your teacher or helper gave you, and the name you would like them to see. They will
        be able to see which lessons you have finished — nothing else, and never what you type inside a
        lesson.
      </p>

      {joined && (
        <p className="mt-6 rounded-lg border-2 border-green-300 bg-green-50 p-4 font-semibold text-green-800 dark:bg-green-950/40">
          You are in — {joined}.
        </p>
      )}
      {problem && (
        <p className="mt-6 rounded-lg border-2 border-red-300 bg-red-50 p-4 text-red-800 dark:bg-red-950/40">
          {problem}
        </p>
      )}

      <form onSubmit={onJoin} className="mt-8 space-y-5">
        <div>
          <label htmlFor="join-code" className="block font-semibold">
            Class code
          </label>
          <input
            id="join-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            autoComplete="off"
            className="mt-2 w-full rounded-lg border-2 border-gray-300 px-4 py-3 font-mono text-2xl tracking-[0.2em] dark:border-gray-600 dark:bg-gray-900"
            maxLength={10}
          />
        </div>
        <div>
          <label htmlFor="join-name" className="block font-semibold">
            The name they will see
          </label>
          <input
            id="join-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Betty R."
            className="mt-2 w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-lg dark:border-gray-600 dark:bg-gray-900"
            maxLength={60}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !code.trim() || !name.trim()}
          className="rounded-lg bg-blue-700 px-6 py-3 text-lg font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          Join
        </button>
      </form>

      {mine.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Classes you are in</h2>
          <ul className="mt-3 space-y-2">
            {mine.map((m) => (
              <li
                key={m.classId}
                className="flex items-center justify-between rounded-lg border-2 border-gray-200 px-4 py-3 dark:border-gray-700"
              >
                <span>
                  <span className="font-semibold">{m.className}</span>
                  <span className="text-gray-500"> — shown as {m.displayName}</span>
                </span>
                <button
                  onClick={async () => {
                    if (!confirm(`Leave ${m.className}? Your own progress is not affected.`)) return;
                    await leaveClass(m.classId);
                    await refresh();
                  }}
                  className="text-sm font-semibold text-gray-500 hover:text-red-700"
                >
                  Leave
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
