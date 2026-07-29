"use client";

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import LessonPlaygroundPane from "@/components/LessonPlaygroundPane";
import { EXEMPT, solve, type AnyStep, type SolveOutcome } from "@/lib/solve/solver";
import type { PlaygroundTask } from "@/lib/lessons";

interface Item {
  slug: string;
  unit: string;
  title: string;
  task: PlaygroundTask;
}

interface Row extends SolveOutcome {
  slug: string;
  unit: string;
  type: string;
  exempt?: string;
  threw?: string;
}

/** Keeps one broken activity from taking the run down with it. */
class Boundary extends Component<{ onError: (e: Error) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function stepsOf(task: PlaygroundTask): AnyStep[] | null {
  const t = task as PlaygroundTask & { steps?: AnyStep[] };
  return Array.isArray(t.steps) && t.steps.length > 0 ? t.steps : null;
}

export default function SolveCheck({ lessons }: { lessons: Item[] }) {
  const [index, setIndex] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [only, setOnly] = useState("");
  /** Slugs being replayed after the first pass — flaky-environment insurance. */
  const [retryIds, setRetryIds] = useState<string[] | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const threwRef = useRef<string | undefined>(undefined);

  /**
   * The list this run is walking, frozen when Run was pressed.
   *
   * It used to be derived live from the filter box, so anything that changed
   * the filter after the run started swapped the queue out from under the
   * walk. A script that typed a slug and pressed Run in the same tick began on
   * one lesson and then wandered through the rest of the course, reporting a
   * total that matched neither the filter nor the full run — a harness quietly
   * proving something other than what it was asked to prove.
   */
  const [frozen, setFrozen] = useState<Item[] | null>(null);

  const filtered = only ? lessons.filter((l) => l.slug.includes(only) || l.unit.includes(only)) : lessons;
  const base = frozen ?? filtered;
  const queue = retryIds ? base.filter((l) => retryIds.includes(l.slug)) : base;
  const current = running ? queue[index] : undefined;
  const passDone = running && index >= queue.length;

  // The harness lives in an embedded pane that hides (and throttles the sims'
  // timers) whenever it is off screen, so a single pass can fail lessons that
  // were merely paused. Every first-pass failure gets exactly one replay; only
  // a lesson that fails twice is reported.
  const firstPassFailures = rows.filter((r) => !r.ok).map((r) => r.slug);
  const done = passDone && (retryIds !== null || firstPassFailures.length === 0);

  useEffect(() => {
    if (!passDone || retryIds !== null || firstPassFailures.length === 0) return;
    setRetryIds(firstPassFailures);
    setIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passDone]);

  const record = useCallback((row: Row) => {
    setRows((prev) => {
      const i = prev.findIndex((r) => r.slug === row.slug);
      if (i === -1) return [...prev, row];
      // Retry pass: the replay's verdict replaces the first attempt's.
      const next = [...prev];
      next[i] = row;
      return next;
    });
    setIndex((i) => i + 1);
  }, []);

  useEffect(() => {
    if (!running || !current) return;
    let cancelled = false;
    // Aborts the loop itself on unmount/restart — a cancelled flag alone left the
    // old solver's hands alive inside the next lesson's pane.
    const aborter = new AbortController();
    threwRef.current = undefined;

    (async () => {
      const base = { slug: current.slug, unit: current.unit, type: current.task.type };
      const exempt = EXEMPT[current.task.type];
      const steps = stepsOf(current.task);

      if (exempt || !steps) {
        record({
          ...base,
          exempt: exempt ?? "No step list to play.",
          ok: true,
          progress: 0,
          total: 0,
          elapsedMs: 0,
        });
        return;
      }

      // Which lesson a clipped-ring report belongs to. SimulatorFrame records the
      // report itself (it is the thing that tries to reveal the ring), and has no
      // other way to know what it is showing.
      (window as unknown as { __ringLesson?: string }).__ringLesson = current.slug;

      const assessment = (current.task as { mode?: string }).mode === "assessment";
      const root = hostRef.current;
      if (!root) return;

      // A throw inside the solver used to leave the run parked on one lesson with
      // nothing on screen to say why. Whatever happens, this lesson produces a row.
      const outcome = await solve(root, { steps, assessment, signal: aborter.signal }).catch(
        (e: unknown): SolveOutcome => ({
          ok: false,
          progress: 0,
          total: steps.length,
          reason: `Solver threw: ${e instanceof Error ? e.message : String(e)}`,
          elapsedMs: 0,
        }),
      );
      if (cancelled) return;
      record({
        ...base,
        ...outcome,
        ok: outcome.ok && !threwRef.current,
        threw: threwRef.current,
        reason: threwRef.current ? `Threw while running: ${threwRef.current}` : outcome.reason,
      });
    })();

    return () => {
      cancelled = true;
      aborter.abort();
    };
    // Re-runs per lesson: `index` identifies which one is mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, index]);

  const failures = rows.filter((r) => !r.ok);
  const played = rows.filter((r) => !r.exempt);
  const exempted = rows.filter((r) => r.exempt);

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="text-2xl font-bold">Activity solve check</h1>
      <p className="mt-1 max-w-3xl text-sm text-gray-500">
        Plays every guided lesson to the end by following the highlight ring, the way a learner
        would. A step that highlights nothing, highlights something unreachable, or ignores the
        control it highlights, fails here. Development only.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          onClick={() => {
            setRows([]);
            setRetryIds(null);
            setIndex(0);
            setFrozen(filtered);
            setRunning(true);
          }}
          className="rounded bg-gray-900 px-4 py-2 font-semibold text-white"
        >
          {running ? "Restart" : "Run"}
        </button>
        <input
          value={only}
          onChange={(e) => setOnly(e.target.value)}
          placeholder="Filter by slug or unit"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <span className="tabular-nums">
          {retryIds ? "retry " : ""}
          {Math.min(index, queue.length)} / {queue.length}
        </span>
        <span className={failures.length ? "font-semibold text-red-600" : "text-green-600"}>
          {failures.length} failed
        </span>
        <span className="text-gray-500">
          {played.length} played, {exempted.length} exempt
        </span>
      </div>

      {done && (
        <div id="solve-check-result" className="mt-4 rounded border border-gray-300 p-4">
          <p className="font-semibold">
            {failures.length === 0
              ? `Every one of the ${played.length} playable activities can be finished.`
              : `${failures.length} activities cannot be finished:`}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {failures.map((f) => (
              <li key={f.slug} className="text-red-700">
                <strong>{f.slug}</strong> ({f.type}) — stopped at {f.progress + 1}/{f.total}: {f.reason}
                {f.stuckSay && <em className="block pl-4 text-red-500">&ldquo;{f.stuckSay}&rdquo;</em>}
                {f.debug && <code className="block pl-4 text-[10px] text-gray-500">{f.debug}</code>}
              </li>
            ))}
          </ul>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-gray-500">
              Exempt ({exempted.length}) — not played, and why
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-gray-500">
              {Object.entries(EXEMPT).map(([type, why]) => (
                <li key={type}>
                  <strong>{type}</strong> — {why}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {running && !done && current && (
        <div className="mt-4">
          <p className="text-sm text-gray-500">
            {current.slug} — {current.task.type}
          </p>
          {/* 520px tall and full width: a real pane, so a control that only falls below
              the fold at this size fails here rather than in front of a learner. */}
          <div ref={hostRef} className="mt-2 h-[520px] w-full">
            <Boundary
              key={current.slug}
              onError={(e) => {
                threwRef.current = e.message;
              }}
            >
              <LessonPlaygroundPane task={current.task} started onResult={() => {}} onExit={() => {}} />
            </Boundary>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <table className="mt-6 w-full text-left text-xs">
          <thead className="text-gray-500">
            <tr>
              <th className="py-1">Lesson</th>
              <th>Type</th>
              <th>Steps</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-t border-gray-100">
                <td className="py-1 pr-3 font-mono">{r.slug}</td>
                <td className="pr-3 text-gray-500">{r.type}</td>
                <td className="pr-3 tabular-nums">{r.exempt ? "—" : `${r.progress}/${r.total}`}</td>
                <td className={r.exempt ? "text-gray-400" : r.ok ? "text-green-600" : "text-red-600"}>
                  {r.exempt ? "exempt" : r.ok ? `finished in ${(r.elapsedMs / 1000).toFixed(1)}s` : r.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
