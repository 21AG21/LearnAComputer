"use client";

import { useEffect, useState } from "react";
import MessagingApp from "./Desktop/MessagingApp";
import BrowserApp from "./Desktop/BrowserApp";
import FilesApp from "./Desktop/FilesApp";
import type { FileManagerHighlight, FileManagerEnabled } from "./Desktop/FileManager";
import MailApp from "./Desktop/MailApp";
import SettingsApp from "./Desktop/SettingsApp";
import NotesApp from "./Desktop/NotesApp";
import PhotosApp from "./Desktop/PhotosApp";
import CalendarApp from "./Desktop/CalendarApp";
import AppMarketApp from "./Desktop/AppMarketApp";
import { SimThemeProvider, useSimTheme } from "./Desktop/SimThemeContext";
import WindowControls from "./WindowControls";
import Dock from "./Dock";
import { DesktopMenuBar, wallpaper } from "./DesktopChrome";
import { BellOffIcon } from "./Icons";

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
  filesEnabled?: FileManagerEnabled;
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

const WIFI_NETWORKS = [{ name: "CoolKids Network" }, { name: "Neighbor's WiFi" }, { name: "Coffee shop" }, { name: "Backup" }];

// Battery Status API — non-standard, Chromium-only. Guarded and typed loosely on purpose.
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

function FakeDesktopInner({ onAppOpened, filesHint, filesHighlight, filesEnabled, onFileOpened, highlightApp, interceptApps, settingsProps, autoOpenApp }: FakeDesktopProps) {
  const theme = useSimTheme();
  const [activeApp, setActiveApp] = useState<DesktopAppId | null>(null);
  // Apps that are open-but-minimized (still running, not quit) — these show a green dot on the desktop.
  const [minimized, setMinimized] = useState<Set<DesktopAppId>>(new Set());
  // Bumping a key remounts (resets) an app after it's closed; minimizing keeps its state.
  const [appKeys, setAppKeys] = useState<Record<DesktopAppId, number>>({
    messages: 0, browser: 0, files: 0, mail: 0,
    settings: 0, photos: 0, "app-market": 0, calendar: 0, reminders: 0, notes: 0,
  });
  const [time, setTime] = useState("1:35 pm");
  const [batteryPercent, setBatteryPercent] = useState<number | null>(null);
  const [openPanel, setOpenPanel] = useState<"wifi" | "battery" | "calendar" | null>(null);
  const [connectedNetwork, setConnectedNetwork] = useState<string | null>("CoolKids Network");
  const [searchingNetwork, setSearchingNetwork] = useState<string | null>(null);
  // Transient visual states: an app plays its close/minimize animation here before
  // actually unmounting/hiding, since CSS can't animate a jump straight to display:none.
  const [closingApp, setClosingApp] = useState<DesktopAppId | null>(null);
  const [minimizingApp, setMinimizingApp] = useState<DesktopAppId | null>(null);
  const [launchingApp, setLaunchingApp] = useState<DesktopAppId | null>(null);
  const [closingPanel, setClosingPanel] = useState<"wifi" | "battery" | "calendar" | null>(null);

  useEffect(() => {
    if (autoOpenApp) setActiveApp(autoOpenApp);
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
    setLaunchingApp(app);
    setTimeout(() => setLaunchingApp(null), 550);
    setActiveApp(app);
    setOpenPanel(null);
    setClosingPanel(null);
    setMinimized((prev) => {
      if (!prev.has(app)) return prev;
      const next = new Set(prev);
      next.delete(app);
      return next;
    });
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
      setActiveApp(null);
      setClosingApp(null);
    }, 150);
  }

  function minimizeApp() {
    if (!activeApp) return;
    const app = activeApp;
    setMinimizingApp(app);
    setTimeout(() => {
      setMinimized((prev) => new Set(prev).add(app));
      setActiveApp(null);
      setMinimizingApp(null);
    }, 220);
  }

  function handleNetworkClick(network: (typeof WIFI_NETWORKS)[number]) {
    if (network.name === connectedNetwork || searchingNetwork) return;
    setSearchingNetwork(network.name);
    setTimeout(() => {
      // Only the learner's own network is known-good; the others are neighbors'/public
      // networks that need a password we don't have, so connecting to them fails —
      // but the list stays visible so they can always click back to CoolKids Network.
      setConnectedNetwork(network.name === "CoolKids Network" ? network.name : null);
      setSearchingNetwork(null);
    }, 2000);
  }

  const isDark = theme.dark;

  return (
    <div className={`h-full w-full flex flex-col overflow-hidden relative ${isDark ? "bg-gray-900" : "bg-white"}`} style={{ fontSize: `${theme.textScale / 100}em`, fontWeight: theme.boldText ? 600 : 400 }}>
      {/* Menu bar */}
      <div className="relative shrink-0">
        <DesktopMenuBar
          dark={isDark}
          title={activeApp ? APP_TITLES[activeApp] : "Desktop"}
          leading={
            activeApp && (
              <WindowControls onClose={() => closeApp(activeApp)} onMinimize={minimizeApp} showMaximize={false} />
            )
          }
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
      <div className="relative flex-1" onClick={() => openPanel ? dismissPanel() : undefined}>
        <div
          className="absolute inset-0"
          style={{ background: wallpaper(isDark) }}
        />
        <div className="absolute bottom-4 inset-x-2 flex justify-center">
          <Dock
            tone={isDark ? "dark" : "light"}
            items={BUILT_IN_APPS.map((id) => ({
              id,
              label: APP_TITLES[id],
              // "When an app is open, a small green dot appears on its icon" — so it has
              // to show while the app is in front too, not only once it is minimized.
              running: minimized.has(id) || activeApp === id,
              highlighted: highlightApp === id,
              bouncing: launchingApp === id,
            }))}
            onOpen={(id) => openApp(id as DesktopAppId)}
          />
        </div>

        {/* Apps — kept mounted while minimized so their state survives. Each wrapper's own
            key never changes; only the inner app's key (bumped on real close) resets it. */}
        <div
          className={`absolute inset-0 ${
            closingApp === "messages" ? "animate-window-close" : minimizingApp === "messages" ? "animate-window-minimize" : activeApp === "messages" ? "animate-window-open" : "hidden"
          }`}
        >
          <MessagingApp
            key={appKeys.messages}
            onClose={() => closeApp("messages")}
            onMinimize={minimizeApp}
            showHeader={false}
            noWifi={!connectedNetwork}
          />
        </div>
        <div
          className={`absolute inset-0 ${
            closingApp === "browser" ? "animate-window-close" : minimizingApp === "browser" ? "animate-window-minimize" : activeApp === "browser" ? "animate-window-open" : "hidden"
          }`}
        >
          <BrowserApp
            key={appKeys.browser}
            onClose={() => closeApp("browser")}
            onMinimize={minimizeApp}
            noWifi={!connectedNetwork}
          />
        </div>
        <div
          className={`absolute inset-0 ${
            closingApp === "files" ? "animate-window-close" : minimizingApp === "files" ? "animate-window-minimize" : activeApp === "files" ? "animate-window-open" : "hidden"
          }`}
        >
          <FilesApp
            key={appKeys.files}
            onClose={() => closeApp("files")}
            onMinimize={minimizeApp}
            hint={filesHint}
            highlight={filesHighlight}
            enabled={filesEnabled}
            showHeader={false}
            onFileOpened={onFileOpened}
          />
        </div>
        <div
          className={`absolute inset-0 ${
            closingApp === "mail" ? "animate-window-close" : minimizingApp === "mail" ? "animate-window-minimize" : activeApp === "mail" ? "animate-window-open" : "hidden"
          }`}
        >
          <MailApp
            key={appKeys.mail}
            onClose={() => closeApp("mail")}
            onMinimize={minimizeApp}
            showHeader={false}
            noWifi={!connectedNetwork}
          />
        </div>
        <div
          className={`absolute inset-0 ${
            closingApp === "settings" ? "animate-window-close" : minimizingApp === "settings" ? "animate-window-minimize" : activeApp === "settings" ? "animate-window-open" : "hidden"
          }`}
        >
          <SettingsApp key={appKeys.settings} {...settingsProps} />
        </div>
        <div
          className={`absolute inset-0 ${
            closingApp === "notes" ? "animate-window-close" : minimizingApp === "notes" ? "animate-window-minimize" : activeApp === "notes" ? "animate-window-open" : "hidden"
          }`}
        >
          <NotesApp key={appKeys.notes} onClose={() => closeApp("notes")} onMinimize={minimizeApp} showHeader={false} />
        </div>
        <div
          className={`absolute inset-0 ${
            closingApp === "photos" ? "animate-window-close" : minimizingApp === "photos" ? "animate-window-minimize" : activeApp === "photos" ? "animate-window-open" : "hidden"
          }`}
        >
          <PhotosApp key={appKeys.photos} onClose={() => closeApp("photos")} onMinimize={minimizeApp} showHeader={false} />
        </div>
        <div
          className={`absolute inset-0 ${
            closingApp === "app-market" ? "animate-window-close" : minimizingApp === "app-market" ? "animate-window-minimize" : activeApp === "app-market" ? "animate-window-open" : "hidden"
          }`}
        >
          <AppMarketApp key={appKeys["app-market"]} onClose={() => closeApp("app-market")} onMinimize={minimizeApp} showHeader={false} />
        </div>
        <div
          className={`absolute inset-0 ${
            closingApp === "calendar" ? "animate-window-close" : minimizingApp === "calendar" ? "animate-window-minimize" : activeApp === "calendar" ? "animate-window-open" : "hidden"
          }`}
        >
          <CalendarApp key={appKeys.calendar} onClose={() => closeApp("calendar")} onMinimize={minimizeApp} showHeader={false} initialView="calendar" />
        </div>
        <div
          className={`absolute inset-0 ${
            closingApp === "reminders" ? "animate-window-close" : minimizingApp === "reminders" ? "animate-window-minimize" : activeApp === "reminders" ? "animate-window-open" : "hidden"
          }`}
        >
          <CalendarApp key={appKeys.reminders} onClose={() => closeApp("reminders")} onMinimize={minimizeApp} showHeader={false} initialView="reminders" />
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
      className={`absolute top-10 right-2 z-30 w-72 border-4 border-black bg-white shadow-lg overflow-hidden ${closing ? "animate-slide-up-out" : "animate-slide-down"}`}
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


