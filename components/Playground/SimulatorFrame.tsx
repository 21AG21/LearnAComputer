"use client";

import type { ReactNode } from "react";

interface SimulatorFrameProps {
  /** App/window name shown in the title bar, e.g. "Mail", "Photos". */
  appName: string;
  /** Optional emoji shown before the app name. */
  appIcon?: string;
  /** The current instruction (step.say). Pass null/undefined when finished. */
  instruction?: string | null;
  /** 0-based index of the current step. */
  stepIndex: number;
  /** Total number of steps. */
  totalSteps: number;
  /** True once all steps are complete — shows the DONE overlay. */
  done: boolean;
  /** Short summary shown in the DONE overlay. */
  goal: string;
  /** True briefly after each step to flash a green check. */
  flash?: boolean;
  /** Optional content pinned to the right of the title bar (e.g. a search box). */
  titleBarRight?: ReactNode;
  /** The app UI. Rendered in a flex column that fills the window body. */
  children: ReactNode;
}

/**
 * The shared chrome every guided simulator lives inside, so the whole course
 * feels like one generalized desktop computer rather than a set of unrelated
 * apps. Provides: the dark guidance banner (Step N of M + progress + the current
 * instruction), a neutral window shell with a title bar, and the completion /
 * per-step feedback overlays. Each simulator only supplies its own app body.
 */
export default function SimulatorFrame({
  appName,
  appIcon,
  instruction,
  stepIndex,
  totalSteps,
  done,
  goal,
  flash,
  titleBarRight,
  children,
}: SimulatorFrameProps) {
  const finished = stepIndex >= totalSteps;
  const pct = (Math.min(stepIndex, totalSteps) / totalSteps) * 100;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden select-none relative">
      {/* Guidance banner */}
      <div className="shrink-0 bg-[#1d2733] text-white px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
            {finished ? "Done" : `Step ${stepIndex + 1} of ${totalSteps}`}
          </span>
          <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <p className="mt-1.5 text-lg font-semibold leading-snug">
          {done ? "🎉 " + goal + " — all done!" : instruction}
        </p>
      </div>

      {/* App window */}
      <div className="flex-1 min-h-0 p-3">
        <div className="h-full flex flex-col border-2 border-gray-800 rounded-lg overflow-hidden shadow-md bg-white">
          {/* Title bar */}
          <div className="shrink-0 bg-gray-100 border-b-2 border-gray-800 px-3 py-2 flex items-center gap-3">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="w-3 h-3 rounded-full bg-gray-300 border border-gray-400" />
              <span className="w-3 h-3 rounded-full bg-gray-300 border border-gray-400" />
              <span className="w-3 h-3 rounded-full bg-gray-300 border border-gray-400" />
            </div>
            <span className="font-bold text-gray-700 flex items-center gap-1.5 font-[var(--font-app-title)]">
              {appIcon && <span aria-hidden="true">{appIcon}</span>}
              {appName}
            </span>
            {titleBarRight && <div className="flex-1 flex justify-end">{titleBarRight}</div>}
          </div>

          {/* App body */}
          <div className="flex-1 min-h-0 flex flex-col bg-white relative">{children}</div>
        </div>
      </div>

      {/* Completion overlay */}
      {done && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/30 backdrop-blur-sm animate-pop-in">
          <div className="bg-green-500 text-white text-5xl w-24 h-24 rounded-full flex items-center justify-center shadow-2xl animate-ping-once">
            ✓
          </div>
          <p className="text-xl font-bold text-white text-center px-6 drop-shadow-md">{goal}</p>
        </div>
      )}

      {/* Per-step flash */}
      {flash && !done && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <span className="text-green-400 text-6xl animate-ping-once drop-shadow-lg">✓</span>
        </div>
      )}
    </div>
  );
}
