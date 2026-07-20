"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import MessagingApp from "./Desktop/MessagingApp";
import BrowserApp from "./Desktop/BrowserApp";
import FilesApp from "./Desktop/FilesApp";
import MailApp from "./Desktop/MailApp";
import SettingsApp from "./Desktop/SettingsApp";
import NotesApp from "./Desktop/NotesApp";
import { SimThemeProvider, useSimTheme } from "./Desktop/SimThemeContext";
import WindowControls from "./WindowControls";
import { BellOffIcon } from "./Icons";

export type DesktopAppId = "messages" | "browser" | "files" | "mail" | "settings" | "photos" | "app-market" | "calendar" | "reminders" | "notes";

const BUILT_IN_APPS: DesktopAppId[] = ["messages", "browser", "files", "mail", "settings", "notes"];

interface SettingsCallbacks {
  highlightSection?: string;
  highlightToggle?: string;
  highlightSlider?: string;
  highlightItem?: string;
  onSectionOpen?: (section: string) => void;
  onToggle?: (target: string, value: boolean) => void;
  onSlider?: (target: string, value: number) => void;
  onDeleteItem?: (target: string) => void;
  onEmptyTrash?: () => void;
}

interface FakeDesktopProps {
  onAppOpened?: (app: DesktopAppId) => void;
  filesHint?: string;
  onFileOpened?: (name: string) => void;
  highlightApp?: DesktopAppId;
  interceptApps?: DesktopAppId[];
  settingsProps?: SettingsCallbacks;
  autoOpenApp?: DesktopAppId;
}

const APPS: { id: DesktopAppId; label: string; icon?: string }[] = [
  { id: "messages", label: "Messages", icon: "/playgrounds/icon-chat.png" },
  { id: "browser", label: "Browser", icon: "/playgrounds/icon-globe.png" },
  { id: "files", label: "Files", icon: "/playgrounds/icon-folder.png" },
  { id: "mail", label: "Mail", icon: "/playgrounds/icon-mail.png" },
  { id: "settings", label: "Settings" },
  { id: "photos", label: "Photos" },
  { id: "app-market", label: "App Market" },
  { id: "calendar", label: "Calendar" },
  { id: "reminders", label: "Reminders" },
  { id: "notes", label: "Notes" },
];

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

function FakeDesktopInner({ onAppOpened, filesHint, onFileOpened, highlightApp, interceptApps, settingsProps, autoOpenApp }: FakeDesktopProps) {
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

  function openApp(app: DesktopAppId) {
    onAppOpened?.(app);
    if (interceptApps?.includes(app)) return;
    if (!BUILT_IN_APPS.includes(app)) return;
    setActiveApp(app);
    setOpenPanel(null);
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
      <div className={`relative h-9 shrink-0 flex items-center justify-between px-2 text-lg font-semibold border-b ${isDark ? "bg-gray-800 text-gray-100 border-gray-700" : "bg-white text-gray-900 border-gray-200"}`}>
        <div className="flex items-center gap-2">
          {activeApp && (
            <WindowControls onClose={() => closeApp(activeApp)} onMinimize={minimizeApp} showMaximize={false} />
          )}
          <span className="font-[var(--font-app-title)]">{activeApp ? APP_TITLES[activeApp] : "Desktop"}</span>
        </div>
        <div className="flex items-center gap-3">
          {theme.notificationsMuted && <span title="Do Not Disturb is on"><BellOffIcon size={16} /></span>}
          <button onClick={() => setOpenPanel((p) => (p === "wifi" ? null : "wifi"))} aria-label="Wi-Fi status">
            <WifiIcon className="w-6 h-5" />
          </button>
          <button
            onClick={() => setOpenPanel((p) => (p === "battery" ? null : "battery"))}
            aria-label="Battery status"
            className="flex items-center gap-1"
          >
            <BatteryIcon className="w-8 h-4" />
            {batteryPercent !== null && <span>{batteryPercent}%</span>}
          </button>
          <button
            onClick={() => setOpenPanel((p) => (p === "calendar" ? null : "calendar"))}
            aria-label="Open calendar"
            suppressHydrationWarning
            className="hover:underline"
          >
            {time}
          </button>
        </div>

        {openPanel === "wifi" && (
          <StatusPanel color="#2451e0" tint="#cfe3fb" onClose={() => setOpenPanel(null)} title="WiFi Networks">
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
        {openPanel === "battery" && (
          <StatusPanel color="#0f9b6c" tint="#c3f3dd" onClose={() => setOpenPanel(null)} title="Your Battery">
            <p className="border-2 border-green-400 p-3 text-center">
              {batteryPercent !== null
                ? `You have ${batteryPercent}% battery left.`
                : "Your browser won't share the real battery level, but you can check it in your computer's own status bar."}
            </p>
          </StatusPanel>
        )}
        {openPanel === "calendar" && <CalendarPanel onClose={() => setOpenPanel(null)} />}
      </div>

      {/* Desktop */}
      <div className="relative flex-1" onClick={() => setOpenPanel(null)}>
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? "linear-gradient(115deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%)"
              : "linear-gradient(115deg, #f5b9b9 0%, #fadcdc 20%, #d9f1d9 38%, #c2e9c2 50%, #daf2da 62%, #ccd3f3 82%, #bdc7ef 100%)",
          }}
        />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 items-end">
          {APPS.map(({ id, label, icon }) => (
            <div key={id} className="flex flex-col items-center gap-0.5">
              <button
                onClick={() => openApp(id)}
                aria-label={label}
                className={`relative w-14 h-14 transition-transform hover:scale-110 active:scale-95 rounded-2xl ${
                  highlightApp === id ? "ring-4 ring-yellow-400 animate-pulse" : ""
                }`}
              >
                {icon ? (
                  <Image src={icon} alt="" fill sizes="56px" className="object-contain" />
                ) : (
                  <DockIconSvg app={id} />
                )}
                {minimized.has(id) && (
                  <span
                    aria-label={`${APP_TITLES[id]} is still open`}
                    className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white"
                  />
                )}
              </button>
              <span className={`text-[9px] font-medium leading-none select-none ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {APP_TITLES[id]}
              </span>
            </div>
          ))}
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

const DOCK_ICON_STYLES: Partial<Record<DesktopAppId, { bg: string }>> = {
  settings: { bg: "#6B7280" },
  photos: { bg: "#10B981" },
  "app-market": { bg: "#3B82F6" },
  calendar: { bg: "#EF4444" },
  reminders: { bg: "#F59E0B" },
  notes: { bg: "#FBBF24" },
};

function DockIconSvg({ app }: { app: DesktopAppId }) {
  const style = DOCK_ICON_STYLES[app];
  if (!style) return null;
  return (
    <div className="w-full h-full rounded-2xl flex items-center justify-center shadow-md" style={{ backgroundColor: style.bg }}>
      {app === "settings" && (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8l2.8-2.8M17 7l2.8-2.8" />
        </svg>
      )}
      {app === "photos" && (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="white" stroke="none">
          <circle cx="17" cy="7" r="3" />
          <path d="M2 20l7-10 4 5 3-4 6 9H2z" />
        </svg>
      )}
      {app === "app-market" && (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 7h12l1.5 13H4.5z" />
          <path d="M9 7V5a3 3 0 0 1 6 0v2" />
        </svg>
      )}
      {app === "calendar" && (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="5" width="18" height="17" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 2v4M16 2v4" />
          <text x="12" y="20" textAnchor="middle" fontSize="9" fill="white" stroke="none" fontWeight="bold">
            {new Date().getDate()}
          </text>
        </svg>
      )}
      {app === "reminders" && (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7l2.5 2.5L11 5" />
          <path d="M14 7h6" />
          <path d="M4 15l2.5 2.5L11 13" />
          <path d="M14 15h6" />
        </svg>
      )}
      {app === "notes" && (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M8 7h8M8 11h8M8 15h5" />
        </svg>
      )}
    </div>
  );
}

function StatusPanel({
  color,
  tint,
  title,
  onClose,
  children,
}: {
  color: string;
  tint: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute top-10 right-2 z-30 w-72 border-4 border-black bg-white shadow-lg overflow-hidden animate-slide-down"
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

function CalendarPanel({ onClose }: { onClose: () => void }) {
  const now = new Date();
  const dayName = DAY_NAMES[now.getDay()];
  const monthName = MONTH_NAMES[now.getMonth()];
  const dateOrdinal = ordinal(now.getDate());
  return (
    <StatusPanel color="#c0392b" tint="#fde8e6" onClose={onClose} title="Calendar">
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

function WifiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 26" className={className} aria-hidden="true">
      <path d="M2 9 A20 20 0 0 1 30 9" fill="none" stroke="#111" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M7 14.5 A13 13 0 0 1 25 14.5" fill="none" stroke="#111" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M12 20 A7 7 0 0 1 20 20" fill="none" stroke="#111" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="16" cy="24" r="2.2" fill="#111" />
    </svg>
  );
}

function BatteryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 20" className={className} aria-hidden="true">
      <rect x="1" y="1.5" width="33" height="17" rx="6" fill="none" stroke="#111" strokeWidth="2.5" />
      <rect x="35" y="6.5" width="4" height="7" rx="2" fill="#111" />
    </svg>
  );
}
