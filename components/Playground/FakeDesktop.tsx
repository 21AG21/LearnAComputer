"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import MessagingApp from "./Desktop/MessagingApp";
import BrowserApp from "./Desktop/BrowserApp";
import FilesApp from "./Desktop/FilesApp";
import type { FileManagerHighlight } from "./Desktop/FileManager";
import MailApp from "./Desktop/MailApp";
import SettingsApp from "./Desktop/SettingsApp";
import NotesApp from "./Desktop/NotesApp";
import PhotosApp from "./Desktop/PhotosApp";
import CalendarApp from "./Desktop/CalendarApp";
import AppMarketApp from "./Desktop/AppMarketApp";
import DraggableWindow from "./Desktop/DraggableWindow";
import FileViewer from "./Desktop/FileViewer";
import { iconFor, type Item } from "./Desktop/filesData";
import { SimThemeProvider, useSimTheme } from "./Desktop/SimThemeContext";
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
  const [activeApp, setActiveApp] = useState<DesktopAppId | null>(null);
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

  function getDefaultRect(): { x: number; y: number; w: number; h: number } {
    const el = desktopRef.current;
    if (!el) return { x: 24, y: 24, w: 520, h: 400 };
    return {
      x: 24,
      y: 24,
      w: Math.max(480, Math.floor(el.offsetWidth * 0.76)),
      h: Math.max(360, Math.floor(el.offsetHeight * 0.78)),
    };
  }

  function shouldRender(id: DesktopAppId) {
    return activeApp === id || minimized.has(id) || closingApp === id || minimizingApp === id || launchingApp === id;
  }

  function windowAnim(id: DesktopAppId) {
    if (closingApp === id) return "animate-window-close";
    if (minimizingApp === id) return "animate-window-minimize";
    if (activeApp === id || launchingApp === id) return "animate-window-open";
    return "";
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
    <div className={`h-full w-full flex flex-col overflow-hidden relative ${isDark ? "bg-gray-900" : "bg-white"}`} style={{ fontSize: `${theme.textScale / 100}em`, fontWeight: theme.boldText ? 600 : 400 }}>
      {/* Menu bar */}
      <div className="relative shrink-0">
        <DesktopMenuBar
          dark={isDark}
          title={activeApp ? APP_TITLES[activeApp] : "Desktop"}
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

        {/* Apps as draggable windows */}
        {shouldRender("messages") && (
          <DraggableWindow
            key={appKeys.messages}
            title="Messages"
            icon={APP_GLYPH.messages}
            initial={getDefaultRect()}
            minimized={minimized.has("messages")}
            onClose={() => closeApp("messages")}
            onMinimize={minimizeApp}
            className={windowAnim("messages")}
          >
            <MessagingApp />
          </DraggableWindow>
        )}
        {shouldRender("browser") && (
          <DraggableWindow
            key={appKeys.browser}
            title="Browser"
            icon={APP_GLYPH.browser}
            initial={getDefaultRect()}
            minimized={minimized.has("browser")}
            onClose={() => closeApp("browser")}
            onMinimize={minimizeApp}
            className={windowAnim("browser")}
          >
            <BrowserApp noWifi={!connectedNetwork} />
          </DraggableWindow>
        )}
        {shouldRender("files") && (
          <DraggableWindow
            key={appKeys.files}
            title="Files"
            icon={APP_GLYPH.files}
            initial={getDefaultRect()}
            minimized={minimized.has("files")}
            onClose={() => closeApp("files")}
            onMinimize={minimizeApp}
            className={windowAnim("files")}
          >
            <FilesApp
              onClose={() => closeApp("files")}
              onMinimize={minimizeApp}
              hint={filesHint}
              highlight={filesHighlight}
              showHeader={false}
              onFileOpened={onFileOpened}
              onFileOpen={openFileViewer}
            />
          </DraggableWindow>
        )}
        {shouldRender("mail") && (
          <DraggableWindow
            key={appKeys.mail}
            title="Mail"
            icon={APP_GLYPH.mail}
            initial={getDefaultRect()}
            minimized={minimized.has("mail")}
            onClose={() => closeApp("mail")}
            onMinimize={minimizeApp}
            className={windowAnim("mail")}
          >
            <MailApp />
          </DraggableWindow>
        )}
        {shouldRender("settings") && (
          <DraggableWindow
            key={appKeys.settings}
            title="Settings"
            icon={APP_GLYPH.settings}
            initial={getDefaultRect()}
            minimized={minimized.has("settings")}
            onClose={() => closeApp("settings")}
            onMinimize={minimizeApp}
            className={windowAnim("settings")}
          >
            <SettingsApp key={appKeys.settings} {...settingsProps} />
          </DraggableWindow>
        )}
        {shouldRender("notes") && (
          <DraggableWindow
            key={appKeys.notes}
            title="Notes"
            icon={APP_GLYPH.notes}
            initial={getDefaultRect()}
            minimized={minimized.has("notes")}
            onClose={() => closeApp("notes")}
            onMinimize={minimizeApp}
            className={windowAnim("notes")}
          >
            <NotesApp />
          </DraggableWindow>
        )}
        {shouldRender("photos") && (
          <DraggableWindow
            key={appKeys.photos}
            title="Photos"
            icon={APP_GLYPH.photos}
            initial={getDefaultRect()}
            minimized={minimized.has("photos")}
            onClose={() => closeApp("photos")}
            onMinimize={minimizeApp}
            className={windowAnim("photos")}
          >
            <PhotosApp />
          </DraggableWindow>
        )}
        {shouldRender("app-market") && (
          <DraggableWindow
            key={appKeys["app-market"]}
            title="App Market"
            icon={APP_GLYPH["app-market"]}
            initial={getDefaultRect()}
            minimized={minimized.has("app-market")}
            onClose={() => closeApp("app-market")}
            onMinimize={minimizeApp}
            className={windowAnim("app-market")}
          >
            <AppMarketApp />
          </DraggableWindow>
        )}
        {shouldRender("calendar") && (
          <DraggableWindow
            key={appKeys.calendar}
            title="Calendar"
            icon={APP_GLYPH.calendar}
            initial={getDefaultRect()}
            minimized={minimized.has("calendar")}
            onClose={() => closeApp("calendar")}
            onMinimize={minimizeApp}
            className={windowAnim("calendar")}
          >
            <CalendarApp initialView="calendar" />
          </DraggableWindow>
        )}
        {shouldRender("reminders") && (
          <DraggableWindow
            key={appKeys.reminders}
            title="Reminders"
            icon={APP_GLYPH.reminders}
            initial={getDefaultRect()}
            minimized={minimized.has("reminders")}
            onClose={() => closeApp("reminders")}
            onMinimize={minimizeApp}
            className={windowAnim("reminders")}
          >
            <CalendarApp key={appKeys.reminders} initialView="reminders" />
          </DraggableWindow>
        )}

        {/* File viewer windows */}
        {openFileViewers.map((fv, i) => (
          <DraggableWindow
            key={fv.uid}
            title={fv.item.name}
            icon={iconFor(fv.item, 16)}
            initial={{ x: 80 + i * 28, y: 60 + i * 28, w: 460, h: 380 }}
            onClose={() => closeFileViewer(fv.uid)}
            onMinimize={() => {}}
            className="animate-window-open"
          >
            <FileViewer item={fv.item} />
          </DraggableWindow>
        ))}

        {/* Dock — rendered after apps so it stays clickable when windows overlap it */}
        <div className="absolute bottom-4 inset-x-2 flex justify-center z-10">
          <Dock
            tone={isDark ? "dark" : "light"}
            items={BUILT_IN_APPS.map((id) => ({
              id,
              label: APP_TITLES[id],
              running: minimized.has(id) || activeApp === id,
              highlighted: highlightApp === id,
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
