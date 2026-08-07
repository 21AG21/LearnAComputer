"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import LessonPlaygroundPane from "@/components/LessonPlaygroundPane";
import type { PlaygroundTask } from "@/lib/lessons";

interface Item {
  slug: string;
  task: PlaygroundTask;
}

/** One activity's throw must not take the harness down with it. */
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

/**
 * Mounts one activity at a time, **under script control**, so a harness can do
 * the wrong thing on purpose and see what the learner is left with.
 *
 * Deliberately not part of mount-check or solve-check: those walk their own
 * queue on a timer, and this one has to stop on a lesson while a script clicks
 * something the lesson did not ask for.
 *
 * Driven from `scripts/stray-check.mjs` through `window.__stray*`.
 */
export default function StrayCheck({ lessons, phone = false }: { lessons: Item[]; phone?: boolean }) {
  const [index, setIndex] = useState(-1);
  const [threw, setThrew] = useState<string | null>(null);

  useEffect(() => {
    const w = window as unknown as {
      __strayList?: string[];
      __strayShow?: (i: number) => void;
      __strayThrew?: string | null;
    };
    w.__strayList = lessons.map((l) => l.slug);
    w.__strayShow = (i: number) => {
      setThrew(null);
      setIndex(i);
    };
    return () => {
      delete w.__strayList;
      delete w.__strayShow;
    };
  }, [lessons]);

  useEffect(() => {
    (window as unknown as { __strayThrew?: string | null }).__strayThrew = threw;
  }, [threw]);

  const current = index >= 0 ? lessons[index] : undefined;

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="text-2xl font-bold">Stray-click check</h1>
      <p className="mt-1 max-w-3xl text-sm text-gray-500">
        Mounts one activity at a time under script control. `scripts/stray-check.mjs` then does
        the thing a learner does and the lesson never asked for — closing the window the step
        needs — and checks they are not left with no way forward. Development only.
      </p>
      <p className="mt-2 text-sm" id="stray-ready">
        {current ? `${current.slug}` : "idle"}
      </p>
      {current && (
        /* The phone host is the whole viewport, not a 520px box — the same
           wrong-geometry trap `SolveCheck` fell into: `PhoneCourse` hands the
           sim `min-h-0 flex-1` of the screen, and a measurement taken in a
           shorter box than any real phone reports fiction both ways. */
        <div data-stray-host="" className={phone ? "fixed inset-0 z-40 bg-white" : "mt-2 h-[520px] w-full"}>
          <Boundary key={current.slug} onError={(e) => setThrew(e.message)}>
            <LessonPlaygroundPane task={current.task} started onResult={() => {}} onExit={() => {}} />
          </Boundary>
        </div>
      )}
    </div>
  );
}
