"use client";

import { useEffect, useState, type ReactNode } from "react";
import DraggableWindow from "./Desktop/DraggableWindow";
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
 *
 * All window actions are freely available; the step tracker advances when the
 * learner does the right thing, and the sim stays usable if they do something else first.
 */

type StepAction = "move" | "resize" | "minimize" | "restore" | "maximize" | "restore-max" | "close" | "open-app" | "close-app" | "open-clock" | "open-wifi-panel" | "open-battery-panel" | "close-panel" | "disconnect-wifi" | "reconnect-wifi";

export interface DesktopStep {
  say: string;
  action: StepAction;
  target?: string;
}

const HIDE_WINDOW_ACTIONS: StepAction[] = ["open-app", "open-clock", "open-wifi-panel", "open-battery-panel"];

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

/** A plausible glimpse of each app shown in the window content area. */
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

const INIT = { x: 50, y: 50, w: 400, h: 280 };

export default function GuidedDesktopTask({ goal, steps, mode, hint, onResult }: GuidedDesktopTaskProps) {
  const [minimized, setMinimized] = useState(false);
  const [windowVisible, setWindowVisible] = useState(() => !HIDE_WINDOW_ACTIONS.includes(steps[0]?.action as StepAction));
  const [menuPanel, setMenuPanel] = useState<MenuPanel>(null);
  const [connectedNetwork, setConnectedNetwork] = useState<string | null>("CoolKids Network");
  const NETWORKS = ["CoolKids Network", "Neighbor's WiFi", "Coffee Shop"];
  const [time, setTime] = useState("");
  const [batteryPct, setBatteryPct] = useState(72);
  const firstOpenStep = steps.find((s) => s.action === "open-app");
  const defaultAppId = firstOpenStep?.target ?? (steps[0]?.action !== "open-app" ? "notes" : "notes");
  const [openedAppId, setOpenedAppId] = useState(defaultAppId);
  const openedAppLabel = DOCK_APPS.find((a) => a.id === openedAppId)?.label ?? "Notes";

  const { step, stepIndex: stepIdx, done, flash, tryStep, objectives } =
    useStepRunner({ steps, mode, onResult, flashMs: 600, finishDelayMs: 0 });

  useEffect(() => {
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
    const action = actionMap[panel];
    if (menuPanel === panel) {
      setMenuPanel(null);
      tryStep((s) => s.action === action);
      tryStep((s) => s.action === "close-panel");
      return;
    }
    setMenuPanel(panel);
    tryStep((s) => s.action === action);
  }

  function handleClosePanel() {
    setMenuPanel(null);
    tryStep((s) => s.action === "close-panel");
  }

  const isClosed = done;

  // highlight prop for DraggableWindow
  const highlight =
    step?.action === "minimize" ? "minimize" as const :
    (step?.action === "maximize" || step?.action === "restore-max") ? "maximize" as const :
    (step?.action === "close" || step?.action === "close-app") ? "close" as const :
    step?.action === "move" ? "titlebar" as const :
    step?.action === "resize" ? "resize" as const :
    null;

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
        {/* Menu bar — own shrink-0 row so maximized windows don't overlap it */}
        <div className="relative shrink-0">
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

          {/* Menu panels — positioned relative to menu bar row */}
          {menuPanel && (
            <div className="absolute top-full right-2 z-20 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-slide-down">
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
                  {NETWORKS.map((net) => {
                    const isConnected = net === connectedNetwork;
                    const pulse2 = "ring-2 ring-yellow-400 animate-pulse rounded";
                    return (
                      <div
                        key={net}
                        className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg ${
                          isConnected ? "bg-blue-50 border border-blue-200" : "text-gray-400 hover:bg-gray-50 cursor-pointer"
                        }`}
                      >
                        <button
                          className={`font-medium text-left flex-1 ${isConnected ? "text-gray-700 cursor-default" : "text-gray-400"} ${
                            !isConnected && step?.action === "reconnect-wifi" && net === "CoolKids Network" ? pulse2 : ""
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isConnected) {
                              setConnectedNetwork(net);
                              tryStep((s) => s.action === "reconnect-wifi");
                            }
                          }}
                        >
                          {net}
                        </button>
                        {isConnected ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConnectedNetwork(null);
                              tryStep((s) => s.action === "disconnect-wifi");
                            }}
                            className={`ml-2 text-xs text-red-500 font-semibold hover:text-red-700 ${
                              step?.action === "disconnect-wifi" ? pulse2 : ""
                            }`}
                          >
                            Disconnect
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
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
        </div>

        {/* Desktop area */}
        <div
          className="flex-1 min-h-0 relative overflow-hidden"
          style={{ background: wallpaper(false) }}
          onClick={() => { if (menuPanel) handleClosePanel(); }}
        >

          {/* Draggable window */}
          {windowVisible && !isClosed && (
            <DraggableWindow
              title={openedAppLabel}
              icon={APP_GLYPH[openedAppId] ?? <NoteIcon size={16} />}
              initial={INIT}
              minimized={minimized}
              onClose={() => {
                setWindowVisible(false);
                tryStep((s) => s.action === "close" || s.action === "close-app");
              }}
              onMinimize={() => {
                setMinimized(true);
                tryStep((s) => s.action === "minimize");
              }}
              onMaximize={(isNowMaximized) => {
                tryStep((s) => isNowMaximized ? s.action === "maximize" : s.action === "restore-max");
              }}
              highlight={highlight}
              onMoved={() => tryStep((s) => s.action === "move")}
              onResized={() => tryStep((s) => s.action === "resize")}
            >
              <div className="flex-1 p-3 text-gray-600 text-sm overflow-auto pointer-events-none">
                {APP_CONTENT[openedAppId] ?? APP_CONTENT.notes}
              </div>
            </DraggableWindow>
          )}

          {/* Dock */}
          <div className="absolute bottom-4 inset-x-2 flex justify-center z-10">
            <Dock
              size="sm"
              items={DOCK_APPS.map((app) => ({
                id: app.id,
                label: app.label,
                running: app.id === openedAppId && (minimized || (windowVisible && !isClosed)),
                highlighted:
                  (step?.action === "open-app" && step.target === app.id) ||
                  (minimized && step?.action === "restore" && app.id === openedAppId),
              }))}
              onOpen={(id) => {
                if (minimized && id === openedAppId) {
                  setMinimized(false);
                  tryStep((s) => s.action === "restore");
                  return;
                }
                setOpenedAppId(id);
                setWindowVisible(true);
                setMinimized(false);
                tryStep((s) => s.action === "open-app" && (s.target ?? "notes") === id);
              }}
            />
          </div>
        </div>
      </div>
    </SimulatorFrame>

  );
}

