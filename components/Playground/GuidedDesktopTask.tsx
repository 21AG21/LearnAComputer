"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import WindowControls from "./WindowControls";
import Dock from "./Dock";
import { DesktopMenuBar, wallpaper } from "./DesktopChrome";
import { NoteIcon, GlobeIcon, FolderIcon, ChatIcon, FileDocIcon, MailIcon, GearIcon, CameraIcon, CalendarIcon, BellIcon, CartIcon } from "./Icons";
import { BUILT_IN_APPS, APP_TITLES, type DesktopAppId } from "./FakeDesktop";
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

// The same ten apps, in the same order, as FakeDesktop's dock. A learner who counts
// four apps here and ten in the next lesson is looking at two different computers.
const DOCK_APPS: { id: DesktopAppId; label: string }[] = BUILT_IN_APPS.map((id) => ({
  id,
  label: APP_TITLES[id],
}));

const APP_GLYPH: Record<string, ReactNode> = {
  notes: <NoteIcon size={16} />,
  browser: <GlobeIcon size={16} />,
  files: <FolderIcon size={16} />,
  messages: <ChatIcon size={16} />,
  mail: <MailIcon size={16} />,
  settings: <GearIcon size={16} />,
  photos: <CameraIcon size={16} />,
  calendar: <CalendarIcon size={16} />,
  reminders: <BellIcon size={16} />,
  "app-market": <CartIcon size={16} />,
};

/** A plausible glimpse of each app. These lessons teach the window, so the app itself
 *  stays read-only — but it has to be recognisably the app the learner clicked. */
const APP_CONTENT: Record<string, ReactNode> = {
  notes: (
    <>
      <p className="font-semibold mb-2 text-gray-800">Shopping List</p>
      <ul className="list-disc list-inside space-y-1">
        <li>Milk</li>
        <li>Eggs</li>
        <li>Bread</li>
        <li>Apples</li>
      </ul>
    </>
  ),
  browser: (
    <>
      <div className="mb-3 rounded border border-gray-300 bg-gray-50 px-2 py-1 font-mono text-xs text-gray-500">
        gardeningtips.example
      </div>
      <p className="font-semibold mb-1 text-gray-800">When to plant tomatoes</p>
      <p className="text-xs leading-relaxed">
        Wait until the last frost has passed and the soil has warmed. In most gardens that means late
        spring — tomatoes set outside too early simply sit and sulk.
      </p>
    </>
  ),
  files: (
    <>
      <p className="font-semibold mb-2 text-gray-800">Documents</p>
      <ul className="space-y-1 text-xs">
        <li className="flex items-center gap-2"><FolderIcon size={14} /> Taxes</li>
        <li className="flex items-center gap-2"><FileDocIcon size={14} /> GroceryList.txt</li>
        <li className="flex items-center gap-2"><FileDocIcon size={14} /> Budget.xlsx</li>
      </ul>
    </>
  ),
  messages: (
    <>
      <p className="font-semibold mb-2 text-gray-800">Alex</p>
      <div className="space-y-1.5 text-xs">
        <p className="w-fit rounded-2xl bg-gray-100 px-3 py-1.5">Are we still on for Saturday?</p>
        <p className="ml-auto w-fit rounded-2xl bg-blue-500 px-3 py-1.5 text-white">Yes! See you at 2.</p>
      </div>
    </>
  ),
  mail: (
    <>
      <p className="font-semibold mb-2 text-gray-800">Inbox</p>
      <ul className="space-y-1.5 text-xs">
        <li><span className="font-semibold text-gray-700">Mom</span> — Sunday lunch?</li>
        <li><span className="font-semibold text-gray-700">City Library</span> — Your hold is ready</li>
        <li><span className="font-semibold text-gray-700">Newsletter</span> — This week in gardening</li>
      </ul>
    </>
  ),
  settings: (
    <>
      <p className="font-semibold mb-2 text-gray-800">Settings</p>
      <ul className="space-y-1 text-xs">
        <li>Appearance</li>
        <li>Display</li>
        <li>Accessibility</li>
        <li>Storage</li>
      </ul>
    </>
  ),
  photos: (
    <>
      <p className="font-semibold mb-2 text-gray-800">Recents</p>
      <div className="grid grid-cols-3 gap-1">
        {["#cfe3fb", "#dcf2e3", "#fde0e4", "#fdf1cb", "#e8e1fb", "#fdeccd"].map((c) => (
          <div key={c} className="aspect-square rounded" style={{ background: c }} />
        ))}
      </div>
    </>
  ),
  calendar: (
    <>
      <p className="font-semibold mb-2 text-gray-800">This week</p>
      <ul className="space-y-1.5 text-xs">
        <li><span className="font-semibold text-gray-700">Wed 2:00 pm</span> — Dentist</li>
        <li><span className="font-semibold text-gray-700">Fri 10:00 am</span> — Book club</li>
      </ul>
    </>
  ),
  reminders: (
    <>
      <p className="font-semibold mb-2 text-gray-800">Reminders</p>
      <ul className="space-y-1.5 text-xs">
        <li>Buy groceries</li>
        <li>Call the pharmacy</li>
        <li>Water the plants</li>
      </ul>
    </>
  ),
  "app-market": (
    <>
      <p className="font-semibold mb-2 text-gray-800">App Market</p>
      <ul className="space-y-1.5 text-xs">
        <li>WeatherNow — Free</li>
        <li>Puzzle Quest — Free</li>
        <li>Recipe Keeper — Free</li>
      </ul>
    </>
  ),
};

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
    // Lowercased to match FakeDesktop's clock — same computer, same clock.
    const fmt = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();
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
      <div className="flex-1 min-h-0 relative overflow-hidden" style={{ background: wallpaper(false) }}>
        {/* Menu bar — the same one FakeDesktop shows, so Unit 1 teaches the computer
            the rest of the course goes on using. */}
        <div className="absolute inset-x-0 top-0 z-10">
          <DesktopMenuBar
            title={windowVisible && !minimized && !isClosed ? openedAppLabel : "Desktop"}
            time={time}
            batteryPercent={batteryPct}
            openPanel={menuPanel === "clock" ? "calendar" : menuPanel}
            onTogglePanel={(panel) => handleMenuBarClick(panel === "calendar" ? "clock" : panel)}
            highlight={
              step?.action === "open-wifi-panel" ? "wifi"
              : step?.action === "open-battery-panel" ? "battery"
              : step?.action === "open-clock" ? "calendar"
              : null
            }
          />
        </div>

        {/* Menu panels */}
        {menuPanel && (
          <div className="absolute top-10 right-2 z-20 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-slide-down">
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
              <span className="font-bold text-gray-700 text-sm font-[var(--font-app-title)] inline-flex items-center gap-1">
                {APP_GLYPH[openedAppId] ?? <NoteIcon size={16} />} {openedAppLabel}
              </span>
              <div className="flex-1" />
              <WindowControls
                onMinimize={onMinimize}
                onMaximize={onMaximize}
                onClose={onClose}
                highlight={hlControl}
              />
            </div>

            {/* Window content — the lesson is about the window, not the app, but the app
                still has to be the one the learner opened. A browser showing a shopping
                list teaches them the wrong thing about what a browser is. */}
            <div className="flex-1 p-3 text-gray-600 text-sm overflow-auto pointer-events-none">
              {APP_CONTENT[openedAppId] ?? APP_CONTENT.notes}
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

      {/* Dock — on the wallpaper, where FakeDesktop puts it, not on a strip below it */}
      <div className="absolute bottom-4 inset-x-2 flex justify-center">
        <Dock
          size="sm"
          items={DOCK_APPS.map((app) => ({
            id: app.id,
            label: app.label,
            running: minimized && app.id === openedAppId,
            highlighted:
              (step?.action === "open-app" && step.target === app.id) ||
              (minimized && step?.action === "restore" && app.id === openedAppId),
          }))}
          onOpen={(id) => {
            if (minimized && id === openedAppId && allow((s) => s.action === "restore")) { onRestore(); return; }
            onDockClick(id);
          }}
        />
      </div>
      </div>
      </div>
    </SimulatorFrame>
  );
}
