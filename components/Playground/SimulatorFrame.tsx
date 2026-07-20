"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import WindowControls from "./WindowControls";

interface SimulatorFrameProps {
  appName: string;
  appIcon?: string;
  instruction?: string | null;
  stepIndex: number;
  totalSteps: number;
  done: boolean;
  goal: string;
  flash?: boolean;
  titleBarRight?: ReactNode;
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
  children,
}: SimulatorFrameProps) {
  const finished = stepIndex >= totalSteps;
  const pct = (Math.min(stepIndex, totalSteps) / totalSteps) * 100;

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
          <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
            {finished ? "Done" : `Step ${stepIndex + 1} of ${totalSteps}`}
          </span>
          <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <p className="mt-1.5 text-lg font-semibold leading-snug">
          {done ? goal + " — all done!" : instruction}
        </p>
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
