"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { FileManagerHighlight } from "./Desktop/FileManager";
import AppBody from "./Desktop/AppBody";
import DraggableWindow from "./Desktop/DraggableWindow";
import FileViewer from "./Desktop/FileViewer";
import { iconFor, type Item } from "./Desktop/filesData";
import { SimThemeProvider, useSimTheme, themeFilter, themeCursor } from "./Desktop/SimThemeContext";
import Dock from "./Dock";
import { CalendarPanel, DesktopMenuBar, StatusPanel, wallpaper } from "./DesktopChrome";
import { useIsPhone } from "./SimFormFactor";
import { useSwipe } from "./touchGestures";
import { ArrowLeftIcon } from "./Icons";
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
  /** "Double-click to open" lessons: show an opened file briefly, then tuck it
      away so it never covers the next file the learner has to open. */
  autoDismissViewers?: boolean;
  /** Phone shape only: the learner slid the bar at the bottom upward. */
  onGoHome?: () => void;
  /** Phone shape only: which of the status-strip buttons a step is pointing at. */
  highlightPanel?: "wifi" | "battery" | "calendar" | null;
  /** Fires when a status panel opens or closes, so a gesture lesson can score it. */
  onPanelChange?: (panel: "wifi" | "battery" | "calendar" | null) => void;
  /** Draws a pulsing ring on the bar at the bottom. */
  highlightHomeBar?: boolean;
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

function FakeDesktopInner({
  onAppOpened, filesHint, filesHighlight, onFileOpened, highlightApp, interceptApps,
  settingsProps, autoOpenApp, autoDismissViewers,
  onGoHome, highlightPanel = null, onPanelChange, highlightHomeBar,
}: FakeDesktopProps) {
  const theme = useSimTheme();
  const isPhone = useIsPhone();
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

  /** How far the finger has lifted the screen on the home bar. See PhoneShell. */
  const [lift, setLift] = useState(0);
  const [missedSwipe, setMissedSwipe] = useState(false);

  const homeBar = useSwipe(
    ({ dir }) => {
      setLift(0);
      if (dir === "up") goHome();
    },
    {
      axis: "y",
      threshold: 24,
      // Sideways wander forgiven: a tremor turns a straight slide into a
      // diagonal, and the dominant-axis test called those horizontal and did
      // nothing at all.
      tolerance: 2.5,
      onMove: (_dx, dy) => setLift(Math.max(-56, Math.min(0, dy))),
      onMissed: () => {
        setMissedSwipe(true);
        setTimeout(() => setMissedSwipe(false), 2600);
      },
    },
  );

  function windowAnim(id: DesktopAppId) {
    // A phone grows the app out of its icon and shrinks it back; a laptop opens
    // and minimizes a window. Same three states, the motion each machine uses.
    if (closingApp === id) return isPhone ? "animate-app-close" : "animate-window-close";
    if (minimizingApp === id) return isPhone ? "animate-app-close" : "animate-window-minimize";
    if (launchingApp === id) return isPhone ? "animate-app-open" : "animate-window-open";
    return "";
  }

  /**
   * Put every app away and show the home screen — the phone's version of the
   * gesture there is no laptop equivalent for.
   *
   * It minimizes rather than closes, which is the difference between a phone and
   * a laptop and is worth being exact about: on a phone, leaving an app does not
   * throw away what you were doing. A half-written message is still there when
   * you come back, the dock keeps its running dot, and Unit 1's promise that
   * "nothing is lost when you do that" stays true.
   */
  function goHome() {
    setOpenPanel(null);
    setClosingPanel(null);
    // Let the app shrink away before it is hidden. Without the delay the screen
    // simply blinked to the home screen, and a blink teaches nothing about where
    // the app went.
    const going = focusedApp;
    if (going) {
      setMinimizingApp(going);
      setTimeout(() => {
        setMinimizingApp(null);
        setMinimized(new Set(openApps));
      }, 200);
    } else {
      setMinimized(new Set(openApps));
    }
    onGoHome?.();
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
    // In the "double-click to open" lessons the point is to SEE the file open,
    // not to read it. Leaving the window up covers the next file the learner
    // must open next, behind a window they would never think to close — so it
    // shows for a moment, then tucks itself away and the next glowing tile
    // reappears on its own.
    if (autoDismissViewers) {
      setTimeout(() => closeFileViewer(uid), 2000);
    }
  }

  function closeFileViewer(uid: string) {
    setOpenFileViewers((prev) => prev.filter((v) => v.uid !== uid));
  }

  const isDark = theme.dark;

  return (
    /**
     * `sim-dark` is what carries this setting into the apps. Everything the learner
     * can open lives inside this element, so one class on the root reskins the
     * windows, their title bars and the apps themselves — see the variant's note in
     * `tailwind.config.ts` for why it is not Tailwind's `dark:`.
     *
     * The baseline `text-gray-900` matters as much as the dark half. Plenty of text
     * in these apps sets no color of its own and inherits one, and what it used to
     * inherit was the *page's* — so a learner reading the site in dark mode got the
     * site's near-white body color inside a light practice computer. `gray-900` is
     * the value `<body>` already resolves to in light mode, so this changes nothing
     * there; it just stops the sim borrowing a color from outside itself.
     */
    <div
      // Lets `simdark-check` scope to the desktop in *light* mode, where there is
      // no `.sim-dark` class to find. Without it the light pass had nothing to
      // anchor to, and the light pass is the only contrast measurement that reaches
      // inside the simulator at all.
      data-sim-desktop
      className={`h-full w-full flex flex-col overflow-hidden relative text-gray-900 sim-dark:text-gray-100 ${isDark ? "sim-dark bg-gray-900" : "bg-white"} ${theme.reduceMotion ? "reduce-motion" : ""}`}
      style={{
        // "Text Size" is supposed to enlarge the whole computer — the lesson
        // promises "every menu, label and message grows together". A percentage
        // font-size could not: the dock, the menu bar and every Tailwind `text-*`
        // class are rem-based (root-relative) and ignore an ancestor's font-size,
        // so they stayed put while only inherited text grew. CSS `zoom` scales the
        // rendered box, rem and all; width/height are pre-divided by the same
        // factor so the zoomed desktop still fills its frame exactly. At 100% both
        // are the identity (zoom 1, size 100%), so no other lesson is affected.
        zoom: theme.textScale / 100,
        width: `${1e4 / theme.textScale}%`,
        height: `${1e4 / theme.textScale}%`,
        fontWeight: theme.boldText ? 600 : 400,
        filter: themeFilter(theme),
        cursor: themeCursor(theme),
      }}
    >
      {/* Menu bar */}
      <div className="relative shrink-0">
        <DesktopMenuBar
          dark={isDark}
          compact={isPhone}
          leading={
            isPhone && focusedApp ? (
              <button
                type="button"
                data-phone-back
                aria-label="Back to the home screen"
                onClick={goHome}
                className="-ml-1 rounded p-1 hover:bg-black/10 sim-dark:hover:bg-white/15"
              >
                <ArrowLeftIcon size={18} />
              </button>
            ) : undefined
          }
          title={focusedApp ? APP_TITLES[focusedApp] : isPhone ? "Home" : "Desktop"}
          trailing={theme.notificationsMuted && <span title="Do Not Disturb is on"><BellOffIcon size={16} /></span>}
          time={time}
          batteryPercent={batteryPercent}
          openPanel={openPanel}
          highlight={highlightPanel}
          onTogglePanel={(panel) => {
            if (openPanel === panel) {
              dismissPanel();
              onPanelChange?.(null);
            } else {
              setOpenPanel(panel);
              onPanelChange?.(panel);
            }
          }}
        />

        {(openPanel === "wifi" || closingPanel === "wifi") && (
          <StatusPanel color="#2451e0" tint="#cfe3fb" darkTint="#1e3a8a" onClose={dismissPanel} title="WiFi Networks" closing={closingPanel === "wifi"}>
            {!connectedNetwork && !searchingNetwork && (
              <p className="px-3 py-2 text-center text-red-600 sim-dark:text-red-400 font-semibold text-sm">No WiFi connection. Pick a network below.</p>
            )}
            {WIFI_NETWORKS.map((network) => {
              const isConnected = network.name === connectedNetwork;
              const isSearching = network.name === searchingNetwork;
              return (
                <button
                  key={network.name}
                  onClick={() => handleNetworkClick(network)}
                  disabled={!!searchingNetwork}
                  className={`w-full text-left px-3 py-2 font-bold border-b last:border-b-0 border-blue-200 sim-dark:border-gray-700 ${
                    isConnected
                      ? "bg-green-400 text-gray-900 cursor-default"
                      : isSearching
                        ? "bg-yellow-100 text-gray-900 animate-pulse"
                        : "bg-white hover:bg-blue-50 sim-dark:bg-gray-800 sim-dark:hover:bg-gray-700"
                  }`}
                >
                  {isSearching ? `Connecting to ${network.name}…` : isConnected ? `${network.name} ✓` : network.name}
                </button>
              );
            })}
          </StatusPanel>
        )}
        {(openPanel === "battery" || closingPanel === "battery") && (
          <StatusPanel color="#0f9b6c" tint="#c3f3dd" darkTint="#12603f" onClose={dismissPanel} title="Your Battery" closing={closingPanel === "battery"}>
            <p className="border-2 border-green-400 sim-dark:border-green-700 p-3 text-center">
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
        style={isPhone && lift ? { transform: `translateY(${lift * 0.35}px)` } : undefined}
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

        {/**
          * Apps on a phone fill the screen; apps on a laptop are windows.
          *
          * Every open app stays mounted either way and the ones behind are
          * merely hidden, so leaving an app and coming back finds the
          * half-written message still there. That is not a detail — Unit 1
          * tells the learner "nothing is lost when you do that", and a phone
          * that unmounted the app would make the lesson a lie.
          */}
        {isPhone
          ? openApps.map((id) => (
              <div
                key={`${id}-${appKeys[id]}`}
                data-phone-app-surface={id}
                aria-hidden={focusedApp !== id}
                /**
                 * `hidden` as a **class**, not as the HTML attribute.
                 *
                 * The attribute's `display: none` comes from the UA stylesheet,
                 * and any author `display` beats it — so `hidden` alongside
                 * Tailwind's `flex` does nothing at all. The app you had just
                 * left stayed sitting on top of the home screen, invisible as a
                 * bug because it looked like a perfectly normal open app: going
                 * home appeared to work, and then every icon underneath was
                 * unclickable.
                 */
                className={`absolute inset-0 z-20 overflow-hidden bg-white sim-dark:bg-gray-900 ${
                  focusedApp === id ? "flex flex-col" : "hidden"
                } ${windowAnim(id)}`}
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
                      onClose: goHome,
                      onMinimize: goHome,
                    },
                  }}
                />
              </div>
            ))
          : null}

        {/* Apps as draggable windows, back to front */}
        {!isPhone && openApps.map((id) => (
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

        {/* A file the learner opened. Full screen on a phone, a window on a laptop. */}
        {isPhone
          ? openFileViewers.map((fv) => (
              <div key={fv.uid} className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-white sim-dark:bg-gray-900 animate-window-open">
                <div className="flex shrink-0 items-center gap-2 border-b bg-gray-100 px-2 py-2 sim-dark:bg-gray-800">
                  <button
                    type="button"
                    aria-label="Close this file"
                    onClick={() => closeFileViewer(fv.uid)}
                    className="rounded p-1 hover:bg-black/10 sim-dark:hover:bg-white/15"
                  >
                    <ArrowLeftIcon size={18} />
                  </button>
                  {iconFor(fv.item, 16)}
                  <p className="truncate font-semibold">{fv.item.name}</p>
                </div>
                <div className="min-h-0 flex-1"><FileViewer item={fv.item} /></div>
              </div>
            ))
          : null}

        {/* File viewer windows */}
        {!isPhone && openFileViewers.map((fv, i) => (
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

        {/* A swipe that did not qualify says so, rather than nothing happening —
            which is what makes a learner conclude the gesture is broken. */}
        {isPhone && missedSwipe && (
          <p className="pointer-events-none absolute inset-x-3 bottom-4 z-40 animate-slide-up rounded-xl bg-[#101820] px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">
            Keep your finger on the bar and slide it upward.
          </p>
        )}

        {/**
          * The dock. Same ten icons, same artwork, same order, in the place each
          * machine keeps them: a floating tray along the bottom of a laptop, and
          * the home screen itself on a phone, where it sits under everything and
          * the open app covers it.
          */}
        <div
          className={
            isPhone
              ? // Centered, not top-aligned. A real phone tops out its icons because
                // it has six pages of them; this one has ten apps and no wallpaper
                // art, and hugging the top left two thirds of the screen looking
                // like something had failed to load.
                "absolute inset-0 z-10 flex flex-col justify-center overflow-y-auto px-3 py-5"
              : "absolute bottom-4 inset-x-2 flex justify-center z-30"
          }
        >
          <Dock
            wrap={isPhone}
            tray={!isPhone}
            size={isPhone ? "lg" : "md"}
            showLabels
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
      {/**
        * The bar you slide upward to go home.
        *
        * Outside the wallpaper area, like the status strip, so it is present in
        * every app and an app's own scrolling never swallows the gesture.
        * `touch-action: none` is load-bearing: without it the browser reads the
        * upward drag as a scroll and takes the gesture before this code sees it.
        */}
      {isPhone && (
        <div
          {...homeBar.props}
          data-phone-homebar
          // Swipe only, and not focusable: as a button it swallowed the Enter a
          // learner pressed to name a new folder and sent them home instead. The
          // keyboard route home is the back arrow in the strip above.
          aria-hidden="true"
          /* py-3 gives the 44px touch area the accessibility floor asks for
             behind a 6px visible bar — this is the only way out of an app, and
             it used to be the smallest target on the screen. */
          className={`flex min-h-[44px] shrink-0 touch-none select-none items-center justify-center ${
            isDark ? "bg-gray-800" : "bg-white"
          } ${highlightHomeBar ? "animate-ring-pulse" : ""}`}
        >
          <span
            className={`h-1.5 rounded-full transition-all duration-150 ${
              lift < -8 ? "w-32 bg-blue-600" : `w-28 ${isDark ? "bg-white/70" : "bg-gray-500"}`
            }`}
          />
        </div>
      )}

      {theme.spokenDescriptions && <SpokenDescriptionBar />}
    </div>
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
