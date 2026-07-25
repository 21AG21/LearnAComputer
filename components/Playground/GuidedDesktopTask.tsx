"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import WindowControls from "./WindowControls";
import { NoteIcon } from "./Icons";
import { CELEBRATION_MS } from "./SimulatorFrame";

/**
 * A guided window-management activity. The learner moves, resizes, minimizes,
 * restores, maximizes, and closes a simulated desktop window — one step at a time,
 * each with a pulsing yellow highlight on exactly what to click or drag next.
 */

type StepAction = "move" | "resize" | "minimize" | "restore" | "maximize" | "restore-max" | "close" | "open-app" | "close-app";

export interface DesktopStep {
  say: string;
  action: StepAction;
  target?: string;
}

const DOCK_APPS = [
  { id: "notes",    label: "Notes",    icon: "/playgrounds/dock-notes.png" },
  { id: "browser",  label: "Browser",  icon: "/playgrounds/dock-browser.png" },
  { id: "files",    label: "Files",    icon: "/playgrounds/dock-files.png" },
  { id: "messages", label: "Messages", icon: "/playgrounds/dock-messages.png" },
] as const;

interface GuidedDesktopTaskProps {
  goal: string;
  steps: DesktopStep[];
  onResult: (success: boolean) => void;
}

const INIT = { x: 55, y: 55, w: 280, h: 180 };
const MOVE_THRESH = 25; // px
const RESIZE_THRESH = 20; // px

export default function GuidedDesktopTask({ goal, steps, onResult }: GuidedDesktopTaskProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCompleteBanner, setShowCompleteBanner] = useState(false);
  const [pos, setPos] = useState({ x: INIT.x, y: INIT.y });
  const [size, setSize] = useState({ w: INIT.w, h: INIT.h });
  // window starts hidden if first step is open-app, otherwise visible
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [windowVisible, setWindowVisible] = useState(() => steps[0]?.action !== "open-app");
  const firstOpenStep = steps.find((s) => s.action === "open-app");
  const defaultAppId = firstOpenStep?.target ?? (steps[0]?.action !== "open-app" ? "notes" : "notes");
  const [openedAppId, setOpenedAppId] = useState(defaultAppId);
  const openedAppLabel = DOCK_APPS.find((a) => a.id === openedAppId)?.label ?? "Notes";

  // Always-fresh refs so global event handlers can read current values
  const stepIdxRef = useRef(stepIdx);
  stepIdxRef.current = stepIdx;
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // Drag ref: tracks the in-flight drag with the latest computed position so
  // the mouseup handler doesn't race against React rendering the last setPos.
  const dragRef = useRef<{
    cx: number; cy: number; ix: number; iy: number;
    lastX: number; lastY: number;
  } | null>(null);
  const resizeRef = useRef<{
    cx: number; cy: number; iw: number; ih: number;
    lastW: number; lastH: number;
  } | null>(null);
  const dragStartRef = useRef({ x: INIT.x, y: INIT.y });
  const resizeStartRef = useRef({ w: INIT.w, h: INIT.h });
  const savedRef = useRef({ x: INIT.x, y: INIT.y, w: INIT.w, h: INIT.h });

  const step = done ? null : steps[stepIdx];

  function advance() {
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
    const next = stepIdxRef.current + 1;
    setStepIdx(next);
    if (next >= steps.length) {
      setDone(true);
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        setShowCompleteBanner(true);
      }, CELEBRATION_MS);
      onResultRef.current(true);
    }
  }

  // One-time global listeners for drag/resize (reads only from refs, no stale closure)
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragRef.current) {
        const { cx, cy, ix, iy } = dragRef.current;
        const newX = ix + e.clientX - cx;
        const newY = iy + e.clientY - cy;
        dragRef.current.lastX = newX;
        dragRef.current.lastY = newY;
        setPos({ x: newX, y: newY });
      }
      if (resizeRef.current) {
        const { cx, cy, iw, ih } = resizeRef.current;
        const newW = Math.max(180, iw + e.clientX - cx);
        const newH = Math.max(120, ih + e.clientY - cy);
        resizeRef.current.lastW = newW;
        resizeRef.current.lastH = newH;
        setSize({ w: newW, h: newH });
      }
    }

    function onUp() {
      if (dragRef.current) {
        const moved =
          Math.abs(dragRef.current.lastX - dragStartRef.current.x) >= MOVE_THRESH ||
          Math.abs(dragRef.current.lastY - dragStartRef.current.y) >= MOVE_THRESH;
        dragRef.current = null;
        if (moved && steps[stepIdxRef.current]?.action === "move") advance();
      }
      if (resizeRef.current) {
        const resized =
          Math.abs(resizeRef.current.lastW - resizeStartRef.current.w) >= RESIZE_THRESH ||
          Math.abs(resizeRef.current.lastH - resizeStartRef.current.h) >= RESIZE_THRESH;
        resizeRef.current = null;
        if (resized && steps[stepIdxRef.current]?.action === "resize") advance();
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onTitleDown(e: React.MouseEvent) {
    if (maximized || step?.action !== "move") return;
    e.preventDefault();
    dragStartRef.current = { ...pos };
    dragRef.current = { cx: e.clientX, cy: e.clientY, ix: pos.x, iy: pos.y, lastX: pos.x, lastY: pos.y };
  }

  function onResizeDown(e: React.MouseEvent) {
    if (maximized || step?.action !== "resize") return;
    e.preventDefault();
    e.stopPropagation();
    resizeStartRef.current = { ...size };
    resizeRef.current = { cx: e.clientX, cy: e.clientY, iw: size.w, ih: size.h, lastW: size.w, lastH: size.h };
  }

  function onMinimize() {
    if (step?.action !== "minimize") return;
    setMinimized(true);
    advance();
  }

  function onRestore() {
    if (step?.action !== "restore") return;
    setMinimized(false);
    advance();
  }

  function onMaximize() {
    if (step?.action === "maximize" && !maximized) {
      savedRef.current = { x: pos.x, y: pos.y, w: size.w, h: size.h };
      setMaximized(true);
      advance();
    } else if (step?.action === "restore-max" && maximized) {
      setMaximized(false);
      const s = savedRef.current;
      setPos({ x: s.x, y: s.y });
      setSize({ w: s.w, h: s.h });
      advance();
    }
  }

  function onClose() {
    if (step?.action !== "close" && step?.action !== "close-app") return;
    setWindowVisible(false);
    advance();
  }

  function onDockClick(appId: string) {
    if (step?.action !== "open-app") return;
    const targetId = step.target ?? "notes";
    if (appId !== targetId) return;
    setOpenedAppId(appId);
    setWindowVisible(true);
    advance();
  }

  const hlControl: "minimize" | "maximize" | "close" | null =
    step?.action === "minimize" ? "minimize" :
    step?.action === "maximize" || step?.action === "restore-max" ? "maximize" :
    step?.action === "close" || step?.action === "close-app" ? "close" :
    null;

  const pct = (Math.min(stepIdx, steps.length) / steps.length) * 100;
  const isClosed = done;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden select-none relative">
      {/* Guidance banner */}
      <div className="shrink-0 bg-[#1d2733] text-white px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
            {done ? "Done" : `Step ${stepIdx + 1} of ${steps.length}`}
          </span>
          <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <p className="mt-1.5 text-lg font-semibold leading-snug">
          {done ? `${goal} — all done!` : step?.say}
        </p>
      </div>

      {showCompleteBanner && (
        <div className="shrink-0 bg-green-100 border-b border-green-300 px-4 py-1.5 flex items-center gap-2 text-green-800 text-sm font-medium">
          <span className="text-green-600">&#10003;</span>
          Lesson complete! You can keep practicing here.
        </div>
      )}

      {/* Desktop area */}
      <div className="flex-1 min-h-0 relative bg-[#3b6ea5] overflow-hidden">
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />

        {/* Window */}
        {windowVisible && !minimized && !isClosed && (
          <div
            className="absolute shadow-2xl border-2 border-gray-700 rounded-lg overflow-hidden flex flex-col bg-white"
            style={maximized ? { inset: 4 } : { left: pos.x, top: pos.y, width: size.w, height: size.h }}
          >
            {/* Title bar */}
            <div
              className={`shrink-0 bg-gray-100 border-b-2 border-gray-700 px-3 py-2 flex items-center gap-2 ${
                step?.action === "move" && !maximized
                  ? "cursor-grab ring-4 ring-yellow-400 ring-inset animate-pulse"
                  : maximized ? "cursor-default" : "cursor-default"
              }`}
              onMouseDown={onTitleDown}
            >
              <span className="font-bold text-gray-700 text-sm font-[var(--font-app-title)] inline-flex items-center gap-1"><NoteIcon size={16} /> {openedAppLabel}</span>
              <div className="flex-1" />
              <WindowControls
                onMinimize={onMinimize}
                onMaximize={onMaximize}
                onClose={onClose}
                highlight={hlControl}
              />
            </div>

            {/* Window content */}
            <div className="flex-1 p-3 text-gray-600 text-sm overflow-auto pointer-events-none">
              <p className="font-semibold mb-2 text-gray-800">Shopping List</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Milk</li>
                <li>Eggs</li>
                <li>Bread</li>
                <li>Apples</li>
              </ul>
            </div>

            {/* Resize handle (bottom-right corner) */}
            {!maximized && (
              <div
                className={`absolute bottom-0 right-0 w-8 h-8 cursor-se-resize rounded-tl-sm ${
                  step?.action === "resize" ? "ring-4 ring-yellow-400 animate-pulse" : ""
                }`}
                onMouseDown={onResizeDown}
                aria-label="Drag to resize"
                style={{
                  background:
                    "repeating-linear-gradient(135deg, transparent, transparent 3px, #999 3px, #999 4px)",
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Dock */}
      <div className="shrink-0 bg-white/10 border-t border-white/20 flex items-center justify-center gap-3 py-2 px-4 backdrop-blur-sm" style={{ background: "rgba(30,40,55,0.85)" }}>
        {DOCK_APPS.map((app) => {
          const isTarget = step?.action === "open-app" && step.target === app.id;
          const isMinimizedTarget = minimized && step?.action === "restore";
          return (
            <div key={app.id} className="flex flex-col items-center gap-0.5">
              <button
                onClick={() => {
                  if (minimized && app.id === openedAppId && step?.action === "restore") { onRestore(); return; }
                  onDockClick(app.id);
                }}
                className={`relative w-12 h-12 rounded-xl overflow-hidden transition-transform hover:scale-110 ${
                  isTarget || (isMinimizedTarget && app.id === openedAppId) ? "ring-4 ring-yellow-400 animate-pulse" : ""
                }`}
              >
                <Image src={app.icon} alt={app.label} fill sizes="48px" className="object-contain" />
                {minimized && app.id === openedAppId && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-400" />
                )}
              </button>
              <span className="text-[9px] font-medium text-gray-300 leading-none select-none">{app.label}</span>
            </div>
          );
        })}
      </div>

      {/* Celebration overlay — brief */}
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
