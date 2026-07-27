"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import LessonPlaygroundPane from "@/components/LessonPlaygroundPane";
import type { PlaygroundTask } from "@/lib/lessons";

interface Item {
  slug: string;
  unit: string;
  title: string;
  task: PlaygroundTask;
}

/** Catches a render throw so one broken activity does not take the page down. */
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

const MOUNT_MS = 350;

export default function MountCheck({ lessons }: { lessons: Item[] }) {
  const [index, setIndex] = useState(0);
  const [failures, setFailures] = useState<Array<{ slug: string; type: string; message: string }>>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || index >= lessons.length) return;
    const t = setTimeout(() => setIndex((i) => i + 1), MOUNT_MS);
    return () => clearTimeout(t);
  }, [running, index, lessons.length]);

  const current = lessons[index];
  const done = index >= lessons.length;

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="text-2xl font-bold">Activity mount check</h1>
      <p className="mt-1 text-sm text-gray-500">
        Mounts all {lessons.length} activities in order and lists the ones that throw. Development only.
      </p>

      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={() => {
            setFailures([]);
            setIndex(0);
            setRunning(true);
          }}
          className="rounded bg-gray-900 px-4 py-2 font-semibold text-white"
        >
          {running ? "Restart" : "Run"}
        </button>
        <span className="tabular-nums">
          {Math.min(index, lessons.length)} / {lessons.length}
        </span>
        <span className={failures.length ? "font-semibold text-red-600" : "text-green-600"}>
          {failures.length} failed
        </span>
      </div>

      {done && running && (
        <div id="mount-check-result" className="mt-4 rounded border border-gray-300 p-4">
          <p className="font-semibold">
            {failures.length === 0 ? "Every activity mounted." : `${failures.length} activities threw on mount:`}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {failures.map((f) => (
              <li key={f.slug} className="text-red-700">
                <strong>{f.slug}</strong> ({f.type}) — {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {running && !done && current && (
        <div className="mt-4">
          <p className="text-sm text-gray-500">
            {current.slug} — {current.task.type}
          </p>
          <div className="mt-2 h-[520px] w-full">
            <Boundary
              key={current.slug}
              onError={(e) =>
                setFailures((prev) => [...prev, { slug: current.slug, type: current.task.type, message: e.message }])
              }
            >
              <LessonPlaygroundPane task={current.task} started onResult={() => {}} onExit={() => {}} />
            </Boundary>
          </div>
        </div>
      )}
    </div>
  );
}
