"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import MessagingApp from "./Desktop/MessagingApp";
import BrowserApp from "./Desktop/BrowserApp";
import FilesApp from "./Desktop/FilesApp";
import MailApp from "./Desktop/MailApp";
import { RedX, OrangeDash } from "./BrowserSimulator";

export type DesktopAppId = "messages" | "browser" | "files" | "mail";

interface FakeDesktopProps {
  /** Notified whenever the learner opens an app — lets lessons set goals like "open the mail app". */
  onAppOpened?: (app: DesktopAppId) => void;
  /** Yellow-highlighted Dr. Digital-style tip shown inside the Files app — only set this from the lesson that needs it. */
  filesHint?: string;
  /** Called when the learner double-clicks a file in the Files app. */
  onFileOpened?: (name: string) => void;
}

const APPS: { id: DesktopAppId; label: string; icon: string }[] = [
  { id: "messages", label: "Open the Messaging App", icon: "/playgrounds/icon-chat.png" },
  { id: "browser", label: "Open the Browser", icon: "/playgrounds/icon-globe.png" },
  { id: "files", label: "Open Files", icon: "/playgrounds/icon-folder.png" },
  { id: "mail", label: "Open the Mail App", icon: "/playgrounds/icon-mail.png" },
];

const APP_TITLES: Record<DesktopAppId, string> = {
  messages: "Messaging App",
  browser: "Browser",
  files: "Files",
  mail: "Mail App",
};

const WIFI_NETWORKS = [
  { name: "CoolKids Network", connected: true },
  { name: "Neighbor's WiFi", connected: false },
  { name: "Coffee shop", connected: false },
  { name: "Backup", connected: false },
];

// Battery Status API — non-standard, Chromium-only. Guarded and typed loosely on purpose.
interface BatteryManagerLike {
  level: number;
  addEventListener: (type: "levelchange", listener: () => void) => void;
  removeEventListener: (type: "levelchange", listener: () => void) => void;
}

export default function FakeDesktop({ onAppOpened, filesHint, onFileOpened }: FakeDesktopProps) {
  const [activeApp, setActiveApp] = useState<DesktopAppId | null>(null);
  // Apps that are open-but-minimized (still running, not quit) — these show a green dot on the desktop.
  const [minimized, setMinimized] = useState<Set<DesktopAppId>>(new Set());
  // Bumping a key remounts (resets) an app after it's closed; minimizing keeps its state.
  const [appKeys, setAppKeys] = useState<Record<DesktopAppId, number>>({
    messages: 0,
    browser: 0,
    files: 0,
    mail: 0,
  });
  const [time, setTime] = useState("1:35 pm");
  const [batteryPercent, setBatteryPercent] = useState<number | null>(null);
  const [openPanel, setOpenPanel] = useState<"wifi" | "battery" | "calendar" | null>(null);
  const [wifiConnected, setWifiConnected] = useState(true);
  const [wifiSearching, setWifiSearching] = useState(false);

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
    setActiveApp(app);
    setOpenPanel(null);
    setMinimized((prev) => {
      if (!prev.has(app)) return prev;
      const next = new Set(prev);
      next.delete(app);
      return next;
    });
    onAppOpened?.(app);
  }

  function closeApp(app: DesktopAppId) {
    setAppKeys((prev) => ({ ...prev, [app]: prev[app] + 1 }));
    setMinimized((prev) => {
      if (!prev.has(app)) return prev;
      const next = new Set(prev);
      next.delete(app);
      return next;
    });
    setActiveApp(null);
  }

  function minimizeApp() {
    if (activeApp) setMinimized((prev) => new Set(prev).add(activeApp));
    setActiveApp(null);
  }

  function handleNetworkClick(network: (typeof WIFI_NETWORKS)[number]) {
    if (network.connected || wifiSearching) return;
    setWifiSearching(true);
    setTimeout(() => {
      setWifiConnected(false);
      setWifiSearching(false);
    }, 2500);
  }

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden">
      {/* Menu bar */}
      <div className="relative h-9 shrink-0 bg-white flex items-center justify-between px-2 text-lg font-semibold border-b">
        <div className="flex items-center gap-2">
          {activeApp && (
            <div className="flex shrink-0 border-2 border-black">
              <button
                onClick={() => closeApp(activeApp)}
                aria-label={`Close ${APP_TITLES[activeApp]}`}
                className="w-6 h-6 bg-white flex items-center justify-center border-r-2 border-black"
              >
                <RedX className="w-4 h-4" />
              </button>
              <button
                onClick={minimizeApp}
                aria-label={`Minimize ${APP_TITLES[activeApp]}`}
                className="w-6 h-6 bg-white flex items-center justify-center"
              >
                <OrangeDash className="w-4 h-2.5" />
              </button>
            </div>
          )}
          <span className="font-[var(--font-app-title)]">{activeApp ? APP_TITLES[activeApp] : "Desktop"}</span>
        </div>
        <div className="flex items-center gap-3">
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
            {wifiSearching ? (
              <p className="px-3 py-3 text-center text-blue-700 font-semibold animate-pulse">Searching…</p>
            ) : !wifiConnected ? (
              <p className="px-3 py-3 text-center text-red-600 font-semibold">No WiFi connection.</p>
            ) : (
              WIFI_NETWORKS.map((network) => (
                <button
                  key={network.name}
                  onClick={() => handleNetworkClick(network)}
                  className={`w-full text-left px-3 py-2 font-bold border-b last:border-b-0 border-blue-200 ${
                    network.connected ? "bg-green-400 cursor-default" : "bg-white hover:bg-blue-50"
                  }`}
                >
                  {network.name}
                </button>
              ))
            )}
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
            background:
              "linear-gradient(115deg, #f5b9b9 0%, #fadcdc 20%, #d9f1d9 38%, #c2e9c2 50%, #daf2da 62%, #ccd3f3 82%, #bdc7ef 100%)",
          }}
        />
        <div className="absolute bottom-8 left-8 flex gap-6">
          {APPS.map(({ id, label, icon }) => (
            <button key={id} onClick={() => openApp(id)} aria-label={label} className="relative w-20 h-20 transition-transform hover:scale-110 active:scale-95">
              <Image src={icon} alt="" fill sizes="80px" className="object-contain" />
              {minimized.has(id) && (
                <span
                  aria-label={`${APP_TITLES[id]} is still open`}
                  className="absolute top-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white"
                />
              )}
            </button>
          ))}
        </div>

        {/* Apps — kept mounted while minimized so their state survives */}
        <div key={activeApp === "messages" ? appKeys.messages : undefined} className={`absolute inset-0 ${activeApp === "messages" ? "animate-fade-in" : "hidden"}`}>
          <MessagingApp
            key={appKeys.messages}
            onClose={() => closeApp("messages")}
            onMinimize={minimizeApp}
            showHeader={false}
            noWifi={!wifiConnected}
          />
        </div>
        <div key={activeApp === "browser" ? appKeys.browser : undefined} className={`absolute inset-0 ${activeApp === "browser" ? "animate-fade-in" : "hidden"}`}>
          <BrowserApp
            key={appKeys.browser}
            onClose={() => closeApp("browser")}
            onMinimize={minimizeApp}
            noWifi={!wifiConnected}
          />
        </div>
        <div key={activeApp === "files" ? appKeys.files : undefined} className={`absolute inset-0 ${activeApp === "files" ? "animate-fade-in" : "hidden"}`}>
          <FilesApp
            key={appKeys.files}
            onClose={() => closeApp("files")}
            onMinimize={minimizeApp}
            hint={filesHint}
            showHeader={false}
            onFileOpened={onFileOpened}
          />
        </div>
        <div key={activeApp === "mail" ? appKeys.mail : undefined} className={`absolute inset-0 ${activeApp === "mail" ? "animate-fade-in" : "hidden"}`}>
          <MailApp
            key={appKeys.mail}
            onClose={() => closeApp("mail")}
            onMinimize={minimizeApp}
            showHeader={false}
            noWifi={!wifiConnected}
          />
        </div>
      </div>
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
          ✕
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
