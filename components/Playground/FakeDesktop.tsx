"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { FileManagerHighlight } from "./Desktop/FileManager";
import AppBody from "./Desktop/AppBody";
import DraggableWindow from "./Desktop/DraggableWindow";
import FileViewer from "./Desktop/FileViewer";
import { iconFor, type Item } from "./Desktop/filesData";
import { SimThemeProvider, useSimTheme, themeFilter, themeCursor } from "./Desktop/SimThemeContext";
import Dock from "./Dock";
import { DesktopMenuBar, wallpaper } from "./DesktopChrome";
import {
  BellOffIcon, ChatIcon, GlobeIcon, FolderIcon, MailIcon,
  GearIcon, CameraIcon, CalendarIcon, BellIcon, CartIcon, NoteIcon,
} from "./Icons";

export type DesktopAppId = "messages" | "browser" | "files" | "mail" | "settings" | "photos" | "app-market" | "calendar" | "reminders" | "notes";

export const BUILT_IN_APPS: DesktopAppId[] = ["messages", "browser", "files", "mail", "settings", "photos", "app-market", "calendar", "reminders", "notes"];

interface SettingsCallbacks {
  highlightSection?: string;
  highlightToggle?: string;
  highlightSlider?: string;
  highlightItem?: string;
  highlightDeviceConnect?: string;
  highlightDeviceDisconnect?: string;
  onSectionOpen?: (section: string) => void;
  onToggle?: (target: string, value: boolean) => void;
  onSlider?: (target: string, value: number) => void;
  onDeleteItem?: (target: string) => void;
  onEmptyTrash?: () => void;
  onDeviceSelect?: (device: string) => void;
  onDeviceDisconnect?: (device: string) => void;
}

interface FakeDesktopProps {
  onAppOpened?: (app: DesktopAppId) => void;
  filesHint?: string;
  filesHighlight?: FileManagerHighlight | null;
  onFileOpened?: (name: string) => void;
  highlightApp?: DesktopAppId;
  interceptApps?: DesktopAppId[];
  settingsProps?: SettingsCallbacks;
  autoOpenApp?: DesktopAppId;
}

export const APP_TITLES: Record<DesktopAppId, string> = {
  messages: "Messages",
  browser: "Browser",
  files: "Files",
  mail: "Mail",
  settings: "Settings",
  photos: "Photos",
  "app-market": "App Market",
  calendar: "Calendar",
  reminders: "Reminders",
  notes: "Notes",
};

const APP_GLYPH: Record<DesktopAppId, ReactNode> = {
  messages: <ChatIcon size={16} />,
  browser: <GlobeIcon size={16} />,
  files: <FolderIcon size={16} />,
  mail: <MailIcon size={16} />,
  settings: <GearIcon size={16} />,
  photos: <CameraIcon size={16} />,
  "app-market": <CartIcon size={16} />,
  calendar: <CalendarIcon size={16} />,
  reminders: <BellIcon size={16} />,
  notes: <NoteIcon size={16} />,
};

const WIFI_NETWORKS = [{ name: "CoolKids Network" }, { name: "Neighbor's WiFi" }, { name: "Coffee shop" }, { name: "Backup" }];

interface BatteryManagerLike {
  level: number;
  addEventListener: (type: "levelchange", listener: () => void) => void;
  removeEventListener: (type: "levelchange", listener: () => void) => void;
}

export default function FakeDesktop(props: FakeDesktopProps) {
  return (
    <SimThemeProvider>
      <FakeDesktopInner {...props} />
    </SimThemeProvider>
  );
}

function FakeDesktopInner({ onAppOpened, filesHint, filesHighlight, onFileOpened, highlightApp, interceptApps, settingsProps, autoOpenApp }: FakeDesktopProps) {
  const theme = useSimTheme();
  const desktopRef = useRef<HTMLDivElement>(null);
  /**
   * Which apps have a window, in the order they were opened. A real desktop lets
   * you keep Mail open while you look something up in the Browser, and the
   * course teaches exactly that, so one open app at a time was never right.
   *
   * This list fixes the DOM order and is deliberately never re-sorted: moving a
   * window's element between mousedown and mouseup cancels the click, so
   * raising a background window by clicking its Close button used to raise it
   * and swallow the click. Stacking lives in `stack` and moves only z-index.
   */
  const [openApps, setOpenApps] = useState<DesktopAppId[]>([]);
  /** The same windows ordered back to front — last entry is on top. */
  const [stack, setStack] = useState<DesktopAppId[]>([]);
  const [minimized, setMinimized] = useState<Set<DesktopAppId>>(new Set());
  const [appKeys, setAppKeys] = useState<Record<DesktopAppId, number>>({
    messages: 0, browser: 0, files: 0, mail: 0,
    settings: 0, photos: 0, "app-market": 0, calendar: 0, reminders: 0, notes: 0,
  });
  const [time, setTime] = useState("1:35 pm");
  const [batteryPercent, setBatteryPercent] = useState<number | null>(null);
  const [openPanel, setOpenPanel] = useState<"wifi" | "battery" | "calendar" | null>(null);
  const [connectedNetwork, setConnectedNetwork] = useState<string | null>("CoolKids Network");
  const [searchingNetwork, setSearchingNetwork] = useState<string | null>(null);
  const [closingApp, setClosingApp] = useState<DesktopAppId | null>(null);
  const [minimizingApp, setMinimizingApp] = useState<DesktopAppId | null>(null);
  const [launchingApp, setLaunchingApp] = useState<DesktopAppId | null>(null);
  const [closingPanel, setClosingPanel] = useState<"wifi" | "battery" | "calendar" | null>(null);
  const [openFileViewers, setOpenFileViewers] = useState<{ uid: string; item: Item }[]>([]);

  useEffect(() => {
    if (!autoOpenApp) return;
    setOpenApps((prev) => (prev.includes(autoOpenApp) ? prev : [...prev, autoOpenApp]));
    setStack((prev) => (prev.includes(autoOpenApp) ? prev : [...prev, autoOpenApp]));
  }, [autoOpenApp]);

  useEffect(() => {
    function update() {
      setTime(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase());
    }
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (!nav.getBattery) return;
    let battery: BatteryManagerLike | null = null;
    const handleChange = () => {
      if (battery) setBatteryPercent(Math.round(battery.level * 100));
    };
    nav.getBattery().then((b) => {
      battery = b;
      handleChange();
      b.addEventListener("levelchange", handleChange);
    });
    return () => battery?.removeEventListener("levelchange", handleChange);
  }, []);

  /**
   * Where a window lands when it opens. Each new one steps down and right so a
   * second window never hides the first — the whole point of having two.
   * Remembered per app so closing one does not shuffle the others.
   */
  const rectsRef = useRef<Partial<Record<DesktopAppId, { x: number; y: number; w: number; h: number }>>>({});

  function rectFor(app: DesktopAppId) {
    const cached = rectsRef.current[app];
    if (cached) return cached;
    const el = desktopRef.current;
    const width = el?.offsetWidth ?? 900;
    const height = el?.offsetHeight ?? 620;
    const w = Math.min(760, Math.max(440, Math.round(width * 0.66)));
    const h = Math.min(560, Math.max(330, Math.round(height * 0.7)));
    const step = 28;
    // Cascade only as far as the desktop can hold, then start over.
    const room = Math.max(1, Math.floor(Math.min(width - w - 24, height - h - 72) / step));
    const k = Object.keys(rectsRef.current).length % room;
    const rect = { x: 20 + k * step, y: 16 + k * step, w, h };
    rectsRef.current[app] = rect;
    return rect;
  }

  function windowAnim(id: DesktopAppId) {
    if (closingApp === id) return "animate-window-close";
    if (minimizingApp === id) return "animate-window-minimize";
    if (launchingApp === id) return "animate-window-open";
    return "";
  }

  /** The window on top: the last-raised one that is not minimized. */
  const focusedApp = [...stack].reverse().find((id) => !minimized.has(id)) ?? null;

  /** Raise a window to the top without disturbing the others' order. */
  function focusApp(app: DesktopAppId) {
    setStack((prev) => (prev[prev.length - 1] === app ? prev : [...prev.filter((a) => a !== app), app]));
  }

  function dismissPanel() {
    const current = openPanel;
    if (!current) return;
    setClosingPanel(current);
    setTimeout(() => {
      setOpenPanel(null);
      setClosingPanel(null);
    }, 160);
  }

  function openApp(app: DesktopAppId) {
    onAppOpened?.(app);
    if (interceptApps?.includes(app)) return;
    if (!BUILT_IN_APPS.includes(app)) return;
    // Clicking the dock icon of an app that is already open just brings it
    // forward — the same thing every real dock does.
    if (!openApps.includes(app)) {
      setLaunchingApp(app);
      setTimeout(() => setLaunchingApp(null), 550);
    }
    setOpenPanel(null);
    setClosingPanel(null);
    setMinimized((prev) => {
      if (!prev.has(app)) return prev;
      const next = new Set(prev);
      next.delete(app);
      return next;
    });
    setOpenApps((prev) => (prev.includes(app) ? prev : [...prev, app]));
    focusApp(app);
  }

  function closeApp(app: DesktopAppId) {
    setClosingApp(app);
    setTimeout(() => {
      setAppKeys((prev) => ({ ...prev, [app]: prev[app] + 1 }));
      setMinimized((prev) => {
        if (!prev.has(app)) return prev;
        const next = new Set(prev);
        next.delete(app);
        return next;
      });
      setOpenApps((prev) => prev.filter((a) => a !== app));
      setStack((prev) => prev.filter((a) => a !== app));
      // Forget the position so a reopened window cascades fresh.
      delete rectsRef.current[app];
      setClosingApp(null);
    }, 150);
  }

  /**
   * Minimizing keeps the app in the stack: the window hides, the dock keeps its
   * running dot, and the app's state survives until the learner clicks it back.
   */
  function minimizeApp(app: DesktopAppId) {
    setMinimizingApp(app);
    setTimeout(() => {
      setMinimized((prev) => new Set(prev).add(app));
      setMinimizingApp(null);
    }, 220);
  }

  function handleNetworkClick(network: (typeof WIFI_NETWORKS)[number]) {
    if (network.name === connectedNetwork || searchingNetwork) return;
    setSearchingNetwork(network.name);
    setTimeout(() => {
      setConnectedNetwork(network.name === "CoolKids Network" ? network.name : null);
      setSearchingNetwork(null);
    }, 2000);
  }

  function openFileViewer(item: Item) {
    const uid = `fv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setOpenFileViewers((prev) => [...prev, { uid, item }]);
  }

  function closeFileViewer(uid: string) {
    setOpenFileViewers((prev) => prev.filter((v) => v.uid !== uid));
  }

  const isDark = theme.dark;

  return (
    <div
      className={`h-full w-full flex flex-col overflow-hidden relative ${isDark ? "bg-gray-900" : "bg-white"} ${theme.reduceMotion ? "reduce-motion" : ""}`}
      style={{
        fontSize: `${theme.textScale / 100}em`,
        fontWeight: theme.boldText ? 600 : 400,
        filter: themeFilter(theme),
        cursor: themeCursor(theme),
      }}
    >
      {/* Menu bar */}
      <div className="relative shrink-0">
        <DesktopMenuBar
          dark={isDark}
          title={focusedApp ? APP_TITLES[focusedApp] : "Desktop"}
          trailing={theme.notificationsMuted && <span title="Do Not Disturb is on"><BellOffIcon size={16} /></span>}
          time={time}
          batteryPercent={batteryPercent}
          openPanel={openPanel}
          onTogglePanel={(panel) => (openPanel === panel ? dismissPanel() : setOpenPanel(panel))}
        />

        {(openPanel === "wifi" || closingPanel === "wifi") && (
          <StatusPanel color="#2451e0" tint="#cfe3fb" onClose={dismissPanel} title="WiFi Networks" closing={closingPanel === "wifi"}>
            {!connectedNetwork && !searchingNetwork && (
              <p className="px-3 py-2 text-center text-red-600 font-semibold text-sm">No WiFi connection. Pick a network below.</p>
            )}
            {WIFI_NETWORKS.map((network) => {
              const isConnected = network.name === connectedNetwork;
              const isSearching = network.name === searchingNetwork;
              return (
                <button
                  key={network.name}
                  onClick={() => handleNetworkClick(network)}
                  disabled={!!searchingNetwork}
                  className={`w-full text-left px-3 py-2 font-bold border-b last:border-b-0 border-blue-200 ${
                    isConnected ? "bg-green-400 cursor-default" : isSearching ? "bg-yellow-100 animate-pulse" : "bg-white hover:bg-blue-50"
                  }`}
                >
                  {isSearching ? `Connecting to ${network.name}…` : isConnected ? `${network.name} ✓` : network.name}
                </button>
              );
            })}
          </StatusPanel>
        )}
        {(openPanel === "battery" || closingPanel === "battery") && (
          <StatusPanel color="#0f9b6c" tint="#c3f3dd" onClose={dismissPanel} title="Your Battery" closing={closingPanel === "battery"}>
            <p className="border-2 border-green-400 p-3 text-center">
              {batteryPercent !== null
                ? `You have ${batteryPercent}% battery left.`
                : "Your browser won't share the real battery level, but you can check it in your computer's own status bar."}
            </p>
          </StatusPanel>
        )}
        {(openPanel === "calendar" || closingPanel === "calendar") && (
          <CalendarPanel onClose={dismissPanel} closing={closingPanel === "calendar"} />
        )}
      </div>

      {/* Desktop */}
      <div
        ref={desktopRef}
        className="relative flex-1 overflow-hidden"
        onClick={() => openPanel ? dismissPanel() : undefined}
      >
        <div className="absolute inset-0" style={{ background: wallpaper(isDark) }} />

        {/* The lesson's app, closed.
            A learner closing the window a guided lesson is talking about is a
            reasonable thing to try, and it used to leave a bare desktop: no
            glow, no words, and a banner still naming the app. That shipped in
            all ten of Unit 13's accessibility lessons, whose learners are the
            least well served by a screen that goes blank. The dock reopens it
            — this says so, and the icon below glows. */}
        {autoOpenApp && !openApps.includes(autoOpenApp) && (
          <div className="absolute inset-x-0 top-1/3 px-6 text-center z-20">
            <p className={`text-sm font-semibold ${isDark ? "text-gray-100" : "text-gray-700"}`}>
              You closed {APP_TITLES[autoOpenApp]}.
            </p>
            <p className={`mt-1 text-xs ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Nothing is broken — click <strong>{APP_TITLES[autoOpenApp]}</strong> in the row of icons
              at the bottom to open it again.
            </p>
          </div>
        )}

        {/* Apps as draggable windows, back to front */}
        {openApps.map((id) => (
          <DraggableWindow
            key={`${id}-${appKeys[id]}`}
            title={APP_TITLES[id]}
            icon={APP_GLYPH[id]}
            initial={rectFor(id)}
            minimized={minimized.has(id)}
            z={stack.indexOf(id) + 1}
            focused={focusedApp === id}
            onFocus={() => focusApp(id)}
            onClose={() => closeApp(id)}
            onMinimize={() => minimizeApp(id)}
            className={windowAnim(id)}
          >
            <AppBody
              id={id}
              extras={{
                browser: { noWifi: !connectedNetwork },
                settings: settingsProps,
                files: {
                  hint: filesHint,
                  highlight: filesHighlight,
                  onFileOpened,
                  onFileOpen: openFileViewer,
                  onClose: () => closeApp("files"),
                  onMinimize: () => minimizeApp("files"),
                },
              }}
            />
          </DraggableWindow>
        ))}

        {/* File viewer windows */}
        {openFileViewers.map((fv, i) => (
          <DraggableWindow
            key={fv.uid}
            title={fv.item.name}
            icon={iconFor(fv.item, 16)}
            initial={{ x: 80 + i * 28, y: 60 + i * 28, w: 460, h: 380 }}
            z={BUILT_IN_APPS.length + i + 1}
            onClose={() => closeFileViewer(fv.uid)}
            // A file viewer has nothing to minimize into; putting it away and
            // reopening from the file list is the honest behavior.
            onMinimize={() => closeFileViewer(fv.uid)}
            className="animate-window-open"
          >
            <FileViewer item={fv.item} />
          </DraggableWindow>
        ))}

        {/* Dock — rendered after apps so it stays clickable when windows overlap it */}
        <div className="absolute bottom-4 inset-x-2 flex justify-center z-30">
          <Dock
            tone={isDark ? "dark" : "light"}
            items={BUILT_IN_APPS.map((id) => ({
              id,
              label: APP_TITLES[id],
              running: openApps.includes(id),
              // The way back, when the lesson's own app has been closed.
              highlighted: highlightApp === id || (!!autoOpenApp && id === autoOpenApp && !openApps.includes(autoOpenApp)),
              bouncing: launchingApp === id,
            }))}
            onOpen={(id) => openApp(id as DesktopAppId)}
          />
        </div>
      </div>

      {/* Brightness overlay */}
      {theme.brightness < 100 && (
        <div className="absolute inset-0 pointer-events-none bg-black transition-opacity" style={{ opacity: ((100 - theme.brightness) / 100) * 0.8 }} />
      )}
      {/* Night Shift overlay */}
      {theme.nightShift && (
        <div className="absolute inset-0 pointer-events-none bg-orange-500/15 transition-opacity" style={{ filter: "sepia(0.15)" }} />
      )}
      {theme.spokenDescriptions && <SpokenDescriptionBar />}
    </div>
  );
}


function StatusPanel({
  color,
  tint,
  title,
  onClose,
  closing,
  children,
}: {
  color: string;
  tint: string;
  title: string;
  onClose: () => void;
  closing?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute top-10 right-2 z-50 w-72 border-4 border-black bg-white shadow-lg overflow-hidden ${closing ? "animate-slide-up-out" : "animate-slide-down"}`}
    >
      <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: tint }}>
        <p className="text-lg font-bold">{title}</p>
        <button
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-sm hover:opacity-80 transition-opacity"
          style={{ backgroundColor: color }}
        >
          &times;
        </button>
      </div>
      <div className="h-1" style={{ backgroundColor: color }} />
      <div className="p-2">{children}</div>
      <div className="h-3" style={{ backgroundColor: color }} />
    </div>
  );
}

const CALENDAR_EVENTS = [
  { time: "9:00 am", label: "School" },
  { time: "12:00 pm", label: "Lunch" },
  { time: "4:00 pm", label: "Soccer practice" },
  { time: "7:00 pm", label: "Homework time" },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
function ordinal(n: number) {
  if (n === 1 || n === 21 || n === 31) return `${n}st`;
  if (n === 2 || n === 22) return `${n}nd`;
  if (n === 3 || n === 23) return `${n}rd`;
  return `${n}th`;
}

function CalendarPanel({ onClose, closing }: { onClose: () => void; closing?: boolean }) {
  const now = new Date();
  const dayName = DAY_NAMES[now.getDay()];
  const monthName = MONTH_NAMES[now.getMonth()];
  const dateOrdinal = ordinal(now.getDate());
  return (
    <StatusPanel color="#c0392b" tint="#fde8e6" onClose={onClose} title="Calendar" closing={closing}>
      <p className="px-2 py-1 font-semibold text-sm text-gray-700">
        Today is {dayName}, {monthName} {dateOrdinal}
      </p>
      <div className="mt-1 space-y-1">
        {CALENDAR_EVENTS.map((ev) => (
          <div key={ev.label} className="flex gap-2 items-baseline px-2 py-1 border-t border-red-100">
            <span className="text-xs text-gray-500 w-16 shrink-0">{ev.time}</span>
            <span className="text-sm font-medium">{ev.label}</span>
          </div>
        ))}
      </div>
    </StatusPanel>
  );
}

/**
 * Stands in for a screen reader. A real one speaks; this one prints, because a
 * learner needs to see that pointing at a control announces its name.
 */
function SpokenDescriptionBar() {
  const [spoken, setSpoken] = useState("Desktop");

  useEffect(() => {
    function announce(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest("[aria-label],button,a,input") as HTMLElement | null;
      const name = el?.getAttribute("aria-label") || el?.textContent?.trim();
      setSpoken(name && name.length <= 60 ? name : "Desktop");
    }
    document.addEventListener("mouseover", announce);
    return () => document.removeEventListener("mouseover", announce);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-black/85 px-4 py-2 text-center text-sm font-semibold text-white">
      <span className="mr-2 rounded bg-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-widest">Speaking</span>
      {spoken}
    </div>
  );
}
