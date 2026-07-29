"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  classesEnabled,
  createClass,
  deleteClass,
  getRoster,
  listClasses,
  removeMember,
  type ClassRow,
  type RosterEntry,
} from "@/lib/classes";

interface Unit {
  name: string;
  slugs: string[];
}

const shortUnit = (name: string) => name.replace(/^Unit\s+(\d+):\s*/, "$1. ");

function Bar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 w-32 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full rounded-full ${pct === 100 ? "bg-green-600" : "bg-blue-600"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums text-sm text-gray-600 dark:text-gray-400">
        {done}/{total}
      </span>
    </div>
  );
}

export default function InstructorView({ units }: { units: Unit[] }) {
  const { session, ready } = useAuth();
  const userId = session?.user.id ?? null;
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const totalLessons = units.reduce((n, u) => n + u.slugs.length, 0);

  const refreshClasses = useCallback(async () => {
    try {
      const rows = await listClasses();
      setClasses(rows);
      setActiveId((id) => id ?? rows[0]?.id ?? null);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not load your classes.");
    }
  }, []);

  useEffect(() => {
    if (userId) void refreshClasses();
  }, [userId, refreshClasses]);

  useEffect(() => {
    if (!activeId) {
      setRoster([]);
      return;
    }
    let live = true;
    getRoster(activeId)
      .then((r) => live && setRoster(r))
      .catch((e) => live && setProblem(e instanceof Error ? e.message : "Could not load the roster."));
    return () => {
      live = false;
    };
  }, [activeId]);

  if (!classesEnabled()) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-bold">Instructors</h1>
        <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">
          Classes need accounts, and accounts are not set up on this copy of the site.
        </p>
      </main>
    );
  }

  if (!ready) {
    return <main className="mx-auto max-w-2xl px-6 py-16 text-gray-600">Checking your account…</main>;
  }

  if (!userId) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-bold">Instructors</h1>
        <p className="mt-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
          Make a class, read out the code, and watch the room fill in. You will need to sign in first —
          it is an email address and a six-digit code, no password to forget.
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

  const active = classes.find((c) => c.id === activeId) ?? null;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !userId) return;
    setBusy(true);
    setProblem(null);
    try {
      const row = await createClass(newName, userId);
      setNewName("");
      setClasses((prev) => [...prev, row]);
      setActiveId(row.id);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Could not make that class.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold">Your classes</h1>
      <p className="mt-2 max-w-2xl leading-relaxed text-gray-700 dark:text-gray-300">
        Give your learners the class code. Once they type it in, you will see how far each of them has
        got — the lessons they have finished, and nothing else.
      </p>

      {problem && (
        <p className="mt-4 rounded-lg border-2 border-red-300 bg-red-50 p-3 text-red-800 dark:bg-red-950/40">
          {problem}
        </p>
      )}

      <form onSubmit={onCreate} className="mt-8 flex flex-wrap items-center gap-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name a new class — e.g. Tuesday morning group"
          className="min-w-0 flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
          maxLength={80}
        />
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          Make the class
        </button>
      </form>

      {classes.length === 0 ? (
        <p className="mt-10 text-gray-600 dark:text-gray-400">
          No classes yet. Make one above, and the code to share appears here.
        </p>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap gap-2">
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold ${
                  c.id === activeId
                    ? "border-blue-700 bg-blue-700 text-white"
                    : "border-gray-300 text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {active && (
            <section className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-gray-200 p-5 dark:border-gray-700">
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Class code</p>
                  <p className="mt-1 font-mono text-4xl font-bold tracking-[0.2em]">{active.join_code}</p>
                  <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
                    Learners sign in, open <span className="font-semibold">Join a class</span>, and type this.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete "${active.name}"? Learners keep all their own progress.`)) return;
                    await deleteClass(active.id);
                    setClasses((prev) => prev.filter((c) => c.id !== active.id));
                    setActiveId(null);
                  }}
                  className="rounded-lg border-2 border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-red-400 hover:text-red-700 dark:border-gray-600 dark:text-gray-300"
                >
                  Delete class
                </button>
              </div>

              {roster.length === 0 ? (
                <p className="mt-8 text-gray-600 dark:text-gray-400">
                  Nobody has joined yet. The room fills in as learners type the code.
                </p>
              ) : (
                <div className="mt-8 overflow-x-auto">
                  <table className="w-full min-w-[42rem] border-collapse text-left">
                    <thead>
                      <tr className="border-b-2 border-gray-200 text-sm uppercase tracking-wide text-gray-500 dark:border-gray-700">
                        <th className="py-2 pr-4">Learner</th>
                        <th className="py-2 pr-4">Whole course</th>
                        <th className="py-2 pr-4">Furthest unit</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((r) => {
                        const done = new Set(r.completedSlugs);
                        const perUnit = units.map((u) => ({
                          name: u.name,
                          done: u.slugs.filter((s) => done.has(s)).length,
                          total: u.slugs.length,
                        }));
                        const furthest = [...perUnit].reverse().find((u) => u.done > 0);
                        return (
                          <tr key={r.learnerId} className="border-b border-gray-100 align-middle dark:border-gray-800">
                            <td className="py-3 pr-4 font-semibold">{r.displayName}</td>
                            <td className="py-3 pr-4">
                              <Bar done={r.completedSlugs.length} total={totalLessons} />
                            </td>
                            <td className="py-3 pr-4 text-sm text-gray-700 dark:text-gray-300">
                              {furthest ? (
                                <>
                                  {shortUnit(furthest.name)}{" "}
                                  <span className="text-gray-500">
                                    ({furthest.done} of {furthest.total})
                                  </span>
                                </>
                              ) : (
                                <span className="text-gray-500">Not started</span>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={async () => {
                                  if (!confirm(`Remove ${r.displayName} from this class?`)) return;
                                  await removeMember(active.id, r.learnerId);
                                  setRoster((prev) => prev.filter((x) => x.learnerId !== r.learnerId));
                                }}
                                className="text-sm font-semibold text-gray-500 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-8 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                This page shows finished lessons and nothing else. There is no record of how long anybody
                took, what they typed, or what they got wrong — none of that is collected. Learners can
                leave a class whenever they like, and their progress stays theirs.
              </p>
            </section>
          )}
        </>
      )}
    </main>
  );
}
