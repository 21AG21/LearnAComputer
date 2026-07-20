"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import WindowControls from "./WindowControls";

export interface ObjectiveItem {
  label: string;
  done: boolean;
}

interface SimulatorFrameProps {
  appName: string;
  appIcon?: ReactNode;
  instruction?: string | null;
  stepIndex?: number;
  totalSteps?: number;
  done: boolean;
  goal: string;
  flash?: boolean;
  titleBarRight?: ReactNode;
  objectives?: ObjectiveItem[];
  onHint?: () => void;
  children: ReactNode;
}

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
  objectives,
  onHint,
  children,
}: SimulatorFrameProps) {
  const isAssessment = !!objectives;
  const doneCount = objectives?.filter((o) => o.done).length ?? 0;
  const objTotal = objectives?.length ?? 0;
  const pct = isAssessment
    ? objTotal > 0 ? (doneCount / objTotal) * 100 : 0
    : totalSteps ? (Math.min(stepIndex ?? 0, totalSteps) / totalSteps) * 100 : 0;

  const [expanded, setExpanded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCompleteBanner, setShowCompleteBanner] = useState(false);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDone = useRef(done);

  useEffect(() => {
    if (done && !prevDone.current) {
      setShowCelebration(true);
      celebrationTimer.current = setTimeout(() => {
        setShowCelebration(false);
        setShowCompleteBanner(true);
      }, 1600);
    }
    prevDone.current = done;
    return () => {
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    };
  }, [done]);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden select-none relative">
      {/* Guidance banner */}
      <div className="shrink-0 bg-[#1d2733] text-white px-5 py-3">
        <div className="flex items-center gap-3">
          {(done || isAssessment || totalSteps != null) && (
            <>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
                {done
                  ? "Done"
                  : isAssessment
                    ? `Objectives: ${doneCount} of ${objTotal} done`
                    : `Step ${(stepIndex ?? 0) + 1} of ${totalSteps ?? 0}`}
              </span>
              <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </>
          )}
        </div>
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <p className="text-lg font-semibold leading-snug">
            {done ? goal + " — all done!" : instruction ?? goal}
          </p>
          {isAssessment && !done && (
            <div className="flex items-center gap-2 shrink-0">
              {onHint && (
                <button
                  onClick={onHint}
                  className="px-3 py-1 bg-yellow-500 text-black font-bold rounded text-sm hover:bg-yellow-400 transition-colors"
                >
                  Hint
                </button>
              )}
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-white/70 hover:text-white text-lg leading-none px-1"
                aria-label={expanded ? "Collapse objectives" : "Expand objectives"}
              >
                {expanded ? "▲" : "▼"}
              </button>
            </div>
          )}
        </div>
        {isAssessment && expanded && objectives && (
          <div className="mt-2 border-t border-white/20 pt-2 space-y-1">
            {objectives.map((obj, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-sm ${obj.done ? "text-green-400" : "text-white/60"}`}
              >
                <span className="w-4 text-center">{obj.done ? "✓" : "○"}</span>
                <span>{obj.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slim completion banner — visible after celebration clears */}
      {showCompleteBanner && (
        <div className="shrink-0 bg-green-100 border-b border-green-300 px-4 py-1.5 flex items-center gap-2 text-green-800 text-sm font-medium">
          <span className="text-green-600">&#10003;</span>
          Lesson complete! You can keep practicing here.
        </div>
      )}

      {/* App window */}
      <div className="flex-1 min-h-0 p-3">
        <div className="h-full flex flex-col border-2 border-gray-800 rounded-lg overflow-hidden shadow-md bg-white">
          {/* Title bar */}
          <div className="shrink-0 bg-gray-100 border-b-2 border-gray-800 px-3 py-2 flex items-center gap-2">
            <span className="font-bold text-gray-700 flex items-center gap-1.5 font-[var(--font-app-title)]">
              {appIcon && <span aria-hidden="true">{appIcon}</span>}
              {appName}
            </span>
            <div className="flex-1 flex justify-end">{titleBarRight}</div>
            <WindowControls />
          </div>

          {/* App body */}
          <div className="flex-1 min-h-0 flex flex-col bg-white relative">{children}</div>
        </div>
      </div>

      {/* Celebration overlay — shows briefly then disappears */}
      {showCelebration && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/30 backdrop-blur-sm animate-pop-in pointer-events-none">
          <div className="bg-green-500 text-white text-5xl w-24 h-24 rounded-full flex items-center justify-center shadow-2xl animate-ping-once">
            &#10003;
          </div>
          <p className="text-xl font-bold text-white text-center px-6 drop-shadow-md">{goal}</p>
        </div>
      )}

      {/* Per-step flash */}
      {flash && !done && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <span className="text-green-400 text-6xl animate-ping-once drop-shadow-lg">&#10003;</span>
        </div>
      )}
    </div>
  );
}
