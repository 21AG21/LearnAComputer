"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import WindowControls from "./WindowControls";
import { NoteIcon } from "./Icons";
import SimulatorFrame from "./SimulatorFrame";
import { useStepRunner, type SimMode } from "./useStepRunner";

type MenuPanel = "clock" | "wifi" | "battery" | null;

/**
 * A guided window-management activity. The learner moves, resizes, minimizes,
 * restores, maximizes, and closes a simulated desktop window — one step at a time,
 * each with a pulsing yellow highlight on exactly what to click or drag next.
 */

type StepAction = "move" | "resize" | "minimize" | "restore" | "maximize" | "restore-max" | "close" | "open-app" | "close-app" | "open-clock" | "open-wifi-panel" | "open-battery-panel" | "close-panel";

export interface DesktopStep {
  say: string;
  action: StepAction;
  target?: string;
}

const HIDE_WINDOW_ACTIONS: StepAction[] = ["open-app", "open-clock", "open-wifi-panel", "open-battery-panel"];

const DOCK_APPS = [
  { id: "notes",    label: "Notes",    icon: "/playgrounds/dock-notes.png" },
  { id: "browser",  label: "Browser",  icon: "/playgrounds/dock-browser.png" },
  { id: "files",    label: "Files",    icon: "/playgrounds/dock-files.png" },
  { id: "messages", label: "Messages", icon: "/playgrounds/dock-messages.png" },
] as const;

interface GuidedDesktopTaskProps {
  goal: string;
  steps: DesktopStep[];
  mode?: SimMode;
  hint?: string;
  onResult: (success: boolean) => void;
}

const INIT = { x: 55, y: 55, w: 280, h: 180 };
const MOVE_THRESH = 25; // px
const RESIZE_THRESH = 20; // px

export default function GuidedDesktopTask({ goal, steps, mode, hint, onResult }: GuidedDesktopTaskProps) {
  const [pos, setPos] = useState({ x: INIT.x, y: INIT.y });
  const [size, setSize] = useState({ w: INIT.w, h: INIT.h });
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [windowVisible, setWindowVisible] = useState(() => !HIDE_WINDOW_ACTIONS.includes(steps[0]?.action as StepAction));
  const [menuPanel, setMenuPanel] = useState<MenuPanel>(null);
  const [time, setTime] = useState("");
  const [batteryPct, setBatteryPct] = useState(72);
  const firstOpenStep = steps.find((s) => s.action === "open-app");
  const defaultAppId = firstOpenStep?.target ?? (steps[0]?.action !== "open-app" ? "notes" : "notes");
  const [openedAppId, setOpenedAppId] = useState(defaultAppId);
  const openedAppLabel = DOCK_APPS.find((a) => a.id === openedAppId)?.label ?? "Notes";


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

  const { step, stepIndex: stepIdx, done, flash, isAssessment, tryStep, wants, objectives } =
    useStepRunner({ steps, mode, onResult, flashMs: 600, finishDelayMs: 0 });

  /** Always-fresh ref so the global mouseup handlers can complete a drag or resize. */
  const tryStepRef = useRef(tryStep);
  tryStepRef.current = tryStep;

  /**
   * Whether a control is live. Guided mode only unlocks the control the current step calls for,
   * so the learner cannot wander off-script; an assessment leaves the whole desktop usable and
   * simply ticks objectives off as they happen.
   */
  const allow = (pred: (s: DesktopStep) => boolean) => isAssessment || wants(pred);

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
        if (moved) tryStepRef.current((s) => s.action === "move");
      }
      if (resizeRef.current) {
        const resized =
          Math.abs(resizeRef.current.lastW - resizeStartRef.current.w) >= RESIZE_THRESH ||
          Math.abs(resizeRef.current.lastH - resizeStartRef.current.h) >= RESIZE_THRESH;
        resizeRef.current = null;
        if (resized) tryStepRef.current((s) => s.action === "resize");
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!("getBattery" in navigator)) return;
    (navigator as unknown as { getBattery: () => Promise<{ level: number }> }).getBattery().then((b) => {
      setBatteryPct(Math.round(b.level * 100));
    }).catch(() => {});
  }, []);

  function handleMenuBarClick(panel: "clock" | "wifi" | "battery") {
    const actionMap = { clock: "open-clock", wifi: "open-wifi-panel", battery: "open-battery-panel" } as const;
    if (menuPanel === panel) {
      setMenuPanel(null);
      return;
    }
    setMenuPanel(panel);
    tryStep((s) => s.action === actionMap[panel]);
  }

  function handleClosePanel() {
    setMenuPanel(null);
    tryStep((s) => s.action === "close-panel");
  }

  function onTitleDown(e: React.MouseEvent) {
    if (maximized || !allow((s) => s.action === "move")) return;
    e.preventDefault();
    dragStartRef.current = { ...pos };
    dragRef.current = { cx: e.clientX, cy: e.clientY, ix: pos.x, iy: pos.y, lastX: pos.x, lastY: pos.y };
  }

  function onResizeDown(e: React.MouseEvent) {
    if (maximized || !allow((s) => s.action === "resize")) return;
    e.preventDefault();
    e.stopPropagation();
    resizeStartRef.current = { ...size };
    resizeRef.current = { cx: e.clientX, cy: e.clientY, iw: size.w, ih: size.h, lastW: size.w, lastH: size.h };
  }

  function onMinimize() {
    if (!allow((s) => s.action === "minimize")) return;
    setMinimized(true);
    tryStep((s) => s.action === "minimize");
  }

  function onRestore() {
    if (!allow((s) => s.action === "restore")) return;
    setMinimized(false);
    tryStep((s) => s.action === "restore");
  }

  function onMaximize() {
    if (!maximized && allow((s) => s.action === "maximize")) {
      savedRef.current = { x: pos.x, y: pos.y, w: size.w, h: size.h };
      setMaximized(true);
      tryStep((s) => s.action === "maximize");
    } else if (maximized && allow((s) => s.action === "restore-max")) {
      setMaximized(false);
      const saved = savedRef.current;
      setPos({ x: saved.x, y: saved.y });
      setSize({ w: saved.w, h: saved.h });
      tryStep((s) => s.action === "restore-max");
    }
  }

  function onClose() {
    if (!allow((s) => s.action === "close" || s.action === "close-app")) return;
    setWindowVisible(false);
    tryStep((s) => s.action === "close" || s.action === "close-app");
  }

  function onDockClick(appId: string) {
    if (!allow((s) => s.action === "open-app" && (s.target ?? "notes") === appId)) return;
    setOpenedAppId(appId);
    setWindowVisible(true);
    setMinimized(false);
    tryStep((s) => s.action === "open-app" && (s.target ?? "notes") === appId);
  }

  const hlControl: "minimize" | "maximize" | "close" | null =
    step?.action === "minimize" ? "minimize" :
    step?.action === "maximize" || step?.action === "restore-max" ? "maximize" :
    step?.action === "close" || step?.action === "close-app" ? "close" :
    null;

  const isClosed = done;

  return (
    <SimulatorFrame
      appName="Desktop"
      instruction={step?.say}
      stepIndex={stepIdx}
      totalSteps={steps.length}
      done={done}
      goal={goal}
      flash={flash}
      objectives={objectives}
      hint={hint}
      chrome={false}
    >
      <div className="h-full flex flex-col select-none">
      {/* Desktop area */}
      <div className="flex-1 min-h-0 relative bg-[#3b6ea5] overflow-hidden">
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />

        {/* Menu bar */}
        <div className="absolute inset-x-0 top-0 h-6 z-10 flex items-center justify-between px-3 text-white text-[11px]" style={{ background: "rgba(20,30,45,0.88)" }}>
          <span className="text-gray-400 font-semibold tracking-wide text-[10px] uppercase">PlaygroundOS</span>
          <div className="flex items-center gap-3">
            {/* WiFi */}
            <button
              onClick={() => handleMenuBarClick("wifi")}
              className={`rounded px-1 py-0.5 transition-colors hover:bg-white/15 ${menuPanel === "wifi" ? "bg-white/20" : ""} ${step?.action === "open-wifi-panel" ? "ring-2 ring-yellow-400 animate-pulse" : ""}`}
              aria-label="WiFi"
            >
              <svg viewBox="0 0 20 16" className="w-4 h-3.5" fill="currentColor"><path d="M10 14a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-3.5-4.3a5 5 0 017 0l-1 1.1a3.3 3.3 0 00-5 0l-1-1.1zm-2.8-2.8a8.3 8.3 0 0112.6 0l-1 1a7 7 0 00-10.6 0l-1-1z"/></svg>
            </button>
            {/* Battery */}
            <button
              onClick={() => handleMenuBarClick("battery")}
              className={`rounded px-1 py-0.5 transition-colors hover:bg-white/15 ${menuPanel === "battery" ? "bg-white/20" : ""} ${step?.action === "open-battery-panel" ? "ring-2 ring-yellow-400 animate-pulse" : ""}`}
              aria-label="Battery"
            >
              <svg viewBox="0 0 24 12" className="w-5 h-3" fill="currentColor">
                <rect x="0.5" y="0.5" width="19" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="20" y="3.5" width="3" height="5" rx="1"/>
                <rect x="2" y="2" width={Math.round(15 * batteryPct / 100)} height="8" rx="1.5"/>
              </svg>
            </button>
            {/* Clock */}
            <button
              onClick={() => handleMenuBarClick("clock")}
              className={`rounded px-1 py-0.5 transition-colors hover:bg-white/15 ${menuPanel === "clock" ? "bg-white/20" : ""} ${step?.action === "open-clock" ? "ring-2 ring-yellow-400 animate-pulse" : ""}`}
              aria-label="Clock"
            >
              {time}
            </button>
          </div>
        </div>

        {/* Menu panels */}
        {menuPanel && (
          <div className="absolute top-6 right-2 z-20 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-slide-down">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
              <span className="text-xs font-semibold text-gray-700">
                {menuPanel === "clock" ? "Date & Time" : menuPanel === "wifi" ? "WiFi" : "Battery"}
              </span>
              <button
                onClick={handleClosePanel}
                className={`text-gray-400 hover:text-gray-600 text-sm leading-none ${step?.action === "close-panel" ? "ring-2 ring-yellow-400 rounded animate-pulse" : ""}`}
                aria-label="Close panel"
              >
                &times;
              </button>
            </div>
            {menuPanel === "clock" && (
              <div className="p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{time}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
            )}
            {menuPanel === "wifi" && (
              <div className="p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs px-2 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="font-medium text-gray-700">CoolKids Network</span>
                  <span className="text-blue-600 font-bold">&#10003;</span>
                </div>
                <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg text-gray-400">
                  <span>Neighbor&apos;s WiFi</span>
                </div>
                <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg text-gray-400">
                  <span>Coffee Shop</span>
                </div>
              </div>
            )}
            {menuPanel === "battery" && (
              <div className="p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{batteryPct}%</p>
                <p className="text-xs text-gray-500 mt-1">{batteryPct > 20 ? "Battery is charged" : "Low battery — plug in soon"}</p>
              </div>
            )}
          </div>
        )}

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
                  if (minimized && app.id === openedAppId && allow((s) => s.action === "restore")) { onRestore(); return; }
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
      </div>
    </SimulatorFrame>
  );
}
