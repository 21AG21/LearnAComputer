"use client";

import { useState, type ReactNode } from "react";
import { useIsPhone } from "../SimFormFactor";
import { useSimTheme, type ColorFilter } from "./SimThemeContext";
import {
  PaletteIcon, DisplayIcon, AccessibilityIcon, WifiIcon,
  BellIcon, SaveIcon, InfoIcon, ShieldIcon, SmartphoneIcon,
} from "../Icons";

type Section = "appearance" | "display" | "accessibility" | "wifi" | "bluetooth" | "notifications" | "storage" | "privacy" | "about";

const SECTIONS: { id: Section; label: string; icon: ReactNode }[] = [
  { id: "appearance", label: "Appearance", icon: <PaletteIcon size={16} /> },
  { id: "display", label: "Display", icon: <DisplayIcon size={16} /> },
  { id: "accessibility", label: "Accessibility", icon: <AccessibilityIcon size={16} /> },
  { id: "wifi", label: "WiFi", icon: <WifiIcon size={16} /> },
  { id: "bluetooth", label: "Bluetooth", icon: <SmartphoneIcon size={16} /> },
  { id: "notifications", label: "Notifications", icon: <BellIcon size={16} /> },
  { id: "storage", label: "Storage", icon: <SaveIcon size={16} /> },
  { id: "privacy", label: "Privacy", icon: <ShieldIcon size={16} /> },
  { id: "about", label: "About", icon: <InfoIcon size={16} /> },
];

interface SettingsAppProps {
  /** Which panel is showing when the app opens. Defaults to Appearance. */
  initialSection?: Section;
  /**
   * Phone: keep the section list and the panel on screen together.
   *
   * Set for assessments, where nothing is highlighted and a learner cannot be
   * told which screen to be on. See `showSectionList`.
   */
  keepBothPanes?: boolean;
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
  /**
   * Only the troubleshooting lessons pass this. Without it there is no Restart row —
   * a beginner browsing Settings should not find a button that reboots the computer.
   */
  onRestart?: () => void;
  highlightRestart?: boolean;
}

interface StorageItem {
  name: string;
  size: string;
  sizeGb: number;
  category: "photos" | "apps" | "files" | "system";
  deleted?: boolean;
}

const INITIAL_STORAGE: StorageItem[] = [
  { name: "Old Videos", size: "4 GB", sizeGb: 4, category: "files" },
  { name: "Downloads", size: "2.1 GB", sizeGb: 2.1, category: "files" },
  { name: "Photo Library", size: "8 GB", sizeGb: 8, category: "photos" },
  { name: "Installed Apps", size: "6 GB", sizeGb: 6, category: "apps" },
  { name: "System Files", size: "12 GB", sizeGb: 12, category: "system" },
];

export default function SettingsApp({
  keepBothPanes,
  initialSection = "appearance",
  highlightSection,
  highlightToggle,
  highlightSlider,
  highlightItem,
  highlightDeviceConnect,
  highlightDeviceDisconnect,
  onSectionOpen,
  onToggle,
  onSlider,
  onDeleteItem,
  onEmptyTrash,
  onDeviceSelect,
  onDeviceDisconnect,
  onRestart,
  highlightRestart,
}: SettingsAppProps) {
  const theme = useSimTheme();
  const isPhone = useIsPhone();
  const [active, setActive] = useState<Section>(initialSection);
  /**
   * Phone only: has the learner gone *into* a section?
   *
   * A phone's Settings is two screens, not two panes. You see one full-screen
   * list of rows, you tap one, it pushes in, and a back chevron brings you out.
   * Separate from `active` because `active` also decides which panel to render
   * on a laptop, where both are on screen at once and "entered" is meaningless.
   */
  const [entered, setEntered] = useState(false);

  /**
   * A guided step pointing at a section pops the learner back to the list.
   *
   * Without this, "Open Storage" would ring a row on a screen the learner is
   * not looking at — the exact class of bug `ring-check` exists to catch, and
   * the reason the first attempt at this navigation was reverted.
   *
   * `keepBothPanes` is the assessment carve-out, and it is the same one Mail,
   * Messages and Photos carry: an assessment points at nothing, so nothing can
   * know which screen the learner needs next, and a push with no signposting is
   * how "turn on Dark Mode" ends up behind a screen they have to guess at.
   */
  const showSectionList = isPhone && !keepBothPanes && (!entered || !!highlightSection);
  const [storageItems, setStorageItems] = useState<StorageItem[]>(INITIAL_STORAGE);
  const [trashSize, setTrashSize] = useState(0);

  const dark = theme.dark;
  const bg = dark ? "bg-gray-900" : "bg-gray-50";
  const text = dark ? "text-gray-100" : "text-gray-900";
  const sidebar = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  // gray-400 is only safe down to a gray-800 ground; these descriptions sit on
  // gray-700 panels, where it is 4.06:1. gray-300 is 7:1 there.
  const muted = dark ? "text-gray-300" : "text-gray-500";

  function selectSection(s: Section) {
    setActive(s);
    setEntered(true);
    onSectionOpen?.(s);
  }


  function totalUsedGb() {
    return storageItems.filter((i) => !i.deleted).reduce((sum, i) => sum + i.sizeGb, 0) + trashSize;
  }

  function deleteStorageItem(name: string) {
    setStorageItems((prev) =>
      prev.map((i) => (i.name === name ? { ...i, deleted: true } : i))
    );
    const item = storageItems.find((i) => i.name === name);
    if (item) setTrashSize((prev) => prev + item.sizeGb);
    onDeleteItem?.(name);
  }

  function emptyTrash() {
    setTrashSize(0);
    onEmptyTrash?.();
  }

  // Text Size and Bold Text are applied once, on the FakeDesktop root that wraps this
  // app (via CSS zoom). Re-applying them here as an `em` font-size stacked a second
  // scale on top — 140% rendered Settings at ~196% while the rest of the computer was
  // at 140%.
  return (
    <div
      data-phone-stacked={isPhone || undefined}
      className={`h-full ${isPhone ? "flex flex-col" : "flex"} ${bg} ${text} text-sm`}
    >
      {/**
        * Sections: a sidebar on a laptop, its own **screen** on a phone.
        *
        * The stacked version capped this list at 30% of the screen — measured
        * 390x173 holding 420px of rows, so four of the nine sections were
        * visible and Storage, Privacy and About lived behind a scroll inside a
        * strip that did not look scrollable. Every phone's Settings is a
        * full-screen list of rows with chevrons that you push into.
        *
        * An earlier attempt at this broke every assessment and was reverted; the
        * reason is worth recording, because it was not the layout. It had **no
        * way back**. An assessment highlights nothing, so a learner who tapped
        * into Display and then needed Storage was stranded. The back chevron is
        * what makes the push safe — and `wantsList` pops it automatically when a
        * guided step is pointing at a section the learner is not looking at.
        */}
      <div
        className={`${
          isPhone
            ? keepBothPanes
              ? "max-h-[30%] w-full shrink-0 border-b"
              : showSectionList
                ? "min-h-0 w-full flex-1"
                : "hidden"
            : "w-44 shrink-0"
        } border-r ${sidebar} overflow-y-auto`}
      >
        <div className={`p-3 font-semibold text-base ${muted} select-none`} aria-hidden="true" />
        {SECTIONS.map((s) => {
          const isActive = active === s.id;
          const hl = highlightSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => selectSection(s.id)}
              className={`w-full text-left flex items-center gap-2 transition-colors ${
                isPhone && !keepBothPanes ? "min-h-[48px] px-4 py-2 text-[15px]" : "px-3 py-2"
              } ${
                // On a phone the row you last opened is not "selected" — you are
                // not looking at it any more. A permanent blue tint on a list
                // row is a macOS sidebar habit.
                isActive && (!isPhone || keepBothPanes)
                  ? dark ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-800"
                  : dark ? "hover:bg-gray-700" : "hover:bg-gray-100"
              } ${hl ? "animate-ring-pulse rounded" : ""}`}
            >
              <span>{s.icon}</span>
              <span className="flex-1">{s.label}</span>
              {isPhone && !keepBothPanes && <span aria-hidden className={`text-lg ${muted}`}>›</span>}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div
        className={`min-h-0 overflow-y-auto ${
          isPhone
            ? keepBothPanes
              ? "w-full flex-1 p-3"
              : showSectionList
                ? "hidden"
                : "w-full flex-1 p-3"
            : "flex-1 p-4"
        }`}
      >
        {isPhone && !keepBothPanes && (
          <button
            type="button"
            onClick={() => setEntered(false)}
            className={`-mx-3 -mt-3 mb-2 flex min-h-[44px] w-[calc(100%+1.5rem)] items-center gap-1 border-b px-3 text-[15px] font-semibold ${
              dark ? "border-gray-700 text-blue-300" : "border-gray-200 text-blue-700"
            }`}
          >
            <span aria-hidden className="text-lg leading-none">‹</span> Settings
          </button>
        )}
        {active === "appearance" && (
          <AppearancePanel
            dark={dark}
            nightShift={theme.nightShift}
            onDarkToggle={(v) => { theme.set({ dark: v }); onToggle?.("dark-mode", v); }}
            onNightShiftToggle={(v) => { theme.set({ nightShift: v }); onToggle?.("night-shift", v); }}
            highlightToggle={highlightToggle}
            mutedClass={muted}
            isDark={dark}
          />
        )}
        {active === "display" && (
          <DisplayPanel
            brightness={theme.brightness}
            onBrightness={(v) => { theme.set({ brightness: v }); onSlider?.("brightness", v); }}
            highlightSlider={highlightSlider}
            mutedClass={muted}
            isDark={dark}
          />
        )}
        {active === "accessibility" && (
          <AccessibilityPanel
            theme={theme}
            onSlider={onSlider}
            onToggle={onToggle}
            highlightToggle={highlightToggle}
            highlightSlider={highlightSlider}
            mutedClass={muted}
            isDark={dark}
          />
        )}
        {active === "wifi" && (
          <WifiPanel mutedClass={muted} isDark={dark} highlightToggle={highlightToggle} onToggle={onToggle} />
        )}
        {active === "bluetooth" && (
          <BluetoothPanel
            highlightDeviceConnect={highlightDeviceConnect}
            highlightDeviceDisconnect={highlightDeviceDisconnect}
            onDeviceSelect={onDeviceSelect}
            onDeviceDisconnect={onDeviceDisconnect}
            mutedClass={muted}
            isDark={dark}
          />
        )}
        {active === "notifications" && (
          <NotificationsPanel
            muted_={theme.notificationsMuted}
            onToggle_={(v) => { theme.set({ notificationsMuted: v }); onToggle?.("do-not-disturb", v); }}
            highlightToggle={highlightToggle}
            mutedClass={muted}
            isDark={dark}
          />
        )}
        {active === "storage" && (
          <StoragePanel
            items={storageItems}
            trashSize={trashSize}
            totalGb={100}
            usedGb={totalUsedGb()}
            onDelete={deleteStorageItem}
            onEmptyTrash={emptyTrash}
            highlightItem={highlightItem}
            highlightToggle={highlightToggle}
            onToggle={onToggle}
            mutedClass={muted}
            isDark={dark}
          />
        )}
        {active === "privacy" && (
          <PrivacyPanel
            highlightToggle={highlightToggle}
            onToggle={onToggle}
            mutedClass={muted}
            isDark={dark}
          />
        )}
        {active === "about" && (
          <AboutPanel mutedClass={muted} isDark={dark} onRestart={onRestart} highlightRestart={highlightRestart} />
        )}
      </div>
    </div>
  );
}

function Toggle({ on, onToggle, label, highlight, isDark }: { on: boolean; onToggle: (v: boolean) => void; label: string; highlight: boolean; isDark: boolean }) {
  return (
    <button
      onClick={() => onToggle(!on)}
      role="switch"
      aria-checked={on}
      className={`flex items-center justify-between w-full py-2 ${highlight ? "animate-ring-pulse rounded px-2" : ""}`}
    >
      <span>{label}</span>
      <div className={`w-10 h-6 rounded-full relative transition-colors ${on ? "bg-green-500" : isDark ? "bg-gray-600" : "bg-gray-300"}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </div>
    </button>
  );
}

function Slider({ value, min, max, label, highlight, onChange, isDark }: { value: number; min: number; max: number; label: string; highlight: boolean; onChange: (v: number) => void; isDark: boolean }) {
  return (
    <div className={`py-2 ${highlight ? "animate-ring-pulse rounded px-2" : ""}`}>
      <div className="flex items-center justify-between mb-1">
        <span>{label}</span>
        <span className={isDark ? "text-gray-500 sim-dark:text-gray-400" : "text-gray-500"}>{value}{label.includes("Text") ? "%" : ""}</span>
      </div>
      {/* +/- buttons are the no-drag path — a shaky hand or a tap-only user can
          still reach any value without dragging the thumb. */}
      <div className="flex items-center gap-2">
        <button
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - Math.max(1, Math.round((max - min) / 20))))}
          className="h-9 w-9 shrink-0 rounded-md border-2 border-gray-500 text-lg font-bold leading-none text-gray-700 hover:bg-gray-100 sim-dark:text-gray-200 sim-dark:hover:bg-gray-700"
        >−</button>
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <button
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(max, value + Math.max(1, Math.round((max - min) / 20))))}
          className="h-9 w-9 shrink-0 rounded-md border-2 border-gray-500 text-lg font-bold leading-none text-gray-700 hover:bg-gray-100 sim-dark:text-gray-200 sim-dark:hover:bg-gray-700"
        >+</button>
      </div>
    </div>
  );
}

function Card({ children, className = "", isDark }: { children: React.ReactNode; className?: string; isDark: boolean }) {
  return (
    <div className={`rounded-lg p-4 mb-3 ${isDark ? "bg-gray-700" : "bg-white"} shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function AppearancePanel({ dark, nightShift, onDarkToggle, onNightShiftToggle, highlightToggle, mutedClass, isDark }: {
  dark: boolean; nightShift: boolean; onDarkToggle: (v: boolean) => void; onNightShiftToggle: (v: boolean) => void; highlightToggle?: string; mutedClass: string; isDark: boolean;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Appearance</h2>
      <Card isDark={isDark}>
        <Toggle on={dark} onToggle={onDarkToggle} label="Dark Mode" highlight={highlightToggle === "dark-mode"} isDark={isDark} />
        <div className={`text-xs ${mutedClass} mt-1 mb-3`}>Switch between light and dark colors for your screen</div>
        <Toggle on={nightShift} onToggle={onNightShiftToggle} label="Night Shift" highlight={highlightToggle === "night-shift"} isDark={isDark} />
        <div className={`text-xs ${mutedClass} mt-1`}>Warms your screen colors to reduce eye strain at night</div>
      </Card>
    </div>
  );
}

function DisplayPanel({ brightness, onBrightness, highlightSlider, mutedClass, isDark }: {
  brightness: number; onBrightness: (v: number) => void; highlightSlider?: string; mutedClass: string; isDark: boolean;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Display</h2>
      <Card isDark={isDark}>
        <Slider value={brightness} min={20} max={100} label="Brightness" highlight={highlightSlider === "brightness"} onChange={onBrightness} isDark={isDark} />
        <div className={`text-xs ${mutedClass} mt-1`}>Adjust how bright your screen is</div>
      </Card>
    </div>
  );
}

function AccessibilityPanel({ theme, onSlider, onToggle, highlightToggle, highlightSlider, mutedClass, isDark }: {
  theme: ReturnType<typeof useSimTheme>;
  onSlider?: (target: string, value: number) => void;
  onToggle?: (target: string, value: boolean) => void;
  highlightToggle?: string; highlightSlider?: string; mutedClass: string; isDark: boolean;
}) {
  const filters: { id: ColorFilter; label: string }[] = [
    { id: "none", label: "Off" },
    { id: "grayscale", label: "Grayscale" },
    { id: "warm", label: "Warm" },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Accessibility</h2>

      <Card isDark={isDark}>
        <p className={`text-xs font-bold uppercase tracking-widest ${mutedClass} mb-2`}>Text</p>
        <Slider
          value={theme.textScale} min={100} max={140} label="Text Size"
          highlight={highlightSlider === "text-size"} isDark={isDark}
          onChange={(v) => { theme.set({ textScale: v }); onSlider?.("text-size", v); }}
        />
        <div className={`text-xs ${mutedClass} mt-1 mb-3`}>Make text larger across your computer</div>
        <Toggle
          on={theme.boldText} label="Bold Text" isDark={isDark}
          highlight={highlightToggle === "bold-text"}
          onToggle={(v) => { theme.set({ boldText: v }); onToggle?.("bold-text", v); }}
        />
        <div className={`text-xs ${mutedClass} mt-1`}>Make all text heavier for easier reading</div>
      </Card>

      <Card isDark={isDark}>
        <p className={`text-xs font-bold uppercase tracking-widest ${mutedClass} mb-2`}>Color and contrast</p>
        <Toggle
          on={theme.invert} label="Invert Colors" isDark={isDark}
          highlight={highlightToggle === "invert-colors"}
          onToggle={(v) => { theme.set({ invert: v }); onToggle?.("invert-colors", v); }}
        />
        <div className={`text-xs ${mutedClass} mt-1 mb-3`}>Flip light and dark — white pages become black</div>
        <Toggle
          on={theme.highContrast} label="Increase Contrast" isDark={isDark}
          highlight={highlightToggle === "increase-contrast"}
          onToggle={(v) => { theme.set({ highContrast: v }); onToggle?.("increase-contrast", v); }}
        />
        <div className={`text-xs ${mutedClass} mt-1 mb-3`}>Push light colors lighter and dark colors darker</div>
        <p className="text-sm font-semibold mb-1.5">Color Filters</p>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => { theme.set({ colorFilter: f.id }); onToggle?.(`color-filter-${f.id}`, true); }}
              className={`px-3 py-1.5 rounded-lg border-2 text-sm font-semibold ${
                theme.colorFilter === f.id
                  ? "border-blue-600 bg-blue-600 text-white"
                  : isDark ? "border-gray-600 text-gray-200" : "border-gray-500 text-gray-700"
              } ${highlightToggle === `color-filter-${f.id}` ? "animate-ring-pulse" : ""}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className={`text-xs ${mutedClass} mt-1`}>Helps if some colors are hard to tell apart</div>
      </Card>

      <Card isDark={isDark}>
        <p className={`text-xs font-bold uppercase tracking-widest ${mutedClass} mb-2`}>Pointer and motion</p>
        <Toggle
          on={theme.largeCursor} label="Larger Pointer" isDark={isDark}
          highlight={highlightToggle === "larger-pointer"}
          onToggle={(v) => { theme.set({ largeCursor: v }); onToggle?.("larger-pointer", v); }}
        />
        <div className={`text-xs ${mutedClass} mt-1 mb-3`}>Make the arrow bigger so it is easier to find</div>
        <Toggle
          on={theme.reduceMotion} label="Reduce Motion" isDark={isDark}
          highlight={highlightToggle === "reduce-motion"}
          onToggle={(v) => { theme.set({ reduceMotion: v }); onToggle?.("reduce-motion", v); }}
        />
        <div className={`text-xs ${mutedClass} mt-1 mb-3`}>Stop windows sliding and fading when they open</div>
        <Toggle
          on={theme.spokenDescriptions} label="Spoken Descriptions" isDark={isDark}
          highlight={highlightToggle === "spoken-descriptions"}
          onToggle={(v) => { theme.set({ spokenDescriptions: v }); onToggle?.("spoken-descriptions", v); }}
        />
        <div className={`text-xs ${mutedClass} mt-1`}>Read out the name of whatever you point at</div>
      </Card>
    </div>
  );
}

function WifiPanel({ mutedClass, isDark, highlightToggle, onToggle }: {
  mutedClass: string; isDark: boolean; highlightToggle?: string; onToggle?: (target: string, value: boolean) => void;
}) {
  const [wifiOn, setWifiOn] = useState(true);
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">WiFi</h2>
      <Card isDark={isDark}>
        <Toggle on={wifiOn} onToggle={(v) => { setWifiOn(v); onToggle?.("wifi", v); }} label="WiFi" highlight={highlightToggle === "wifi"} isDark={isDark} />
        {wifiOn && (
          <div className="mt-3 space-y-1">
            <div className={`flex items-center justify-between py-1.5 px-2 rounded ${isDark ? "bg-green-900/40" : "bg-green-50"}`}>
              <span>CoolKids Network</span>
              <span className="text-green-700 sim-dark:text-green-400 text-xs font-medium">Connected ✓</span>
            </div>
            <div className={`py-1.5 px-2 ${mutedClass}`}>Neighbor&apos;s WiFi</div>
            <div className={`py-1.5 px-2 ${mutedClass}`}>Coffee shop</div>
          </div>
        )}
      </Card>
    </div>
  );
}

function BluetoothPanel({ highlightDeviceConnect, highlightDeviceDisconnect, onDeviceSelect, onDeviceDisconnect, mutedClass, isDark }: {
  highlightDeviceConnect?: string;
  highlightDeviceDisconnect?: string;
  onDeviceSelect?: (device: string) => void;
  onDeviceDisconnect?: (device: string) => void;
  mutedClass: string;
  isDark: boolean;
}) {
  const [btOn, setBtOn] = useState(true);
  const [connected, setConnected] = useState<string[]>(["My Phone"]);

  const DEVICES = [
    { name: "Wireless Headphones" },
    { name: "My Phone" },
    { name: "Keyboard" },
  ];

  function connectDevice(name: string) {
    setConnected((prev) => [...prev, name]);
    onDeviceSelect?.(name);
  }

  function disconnectDevice(name: string) {
    setConnected((prev) => prev.filter((d) => d !== name));
    onDeviceDisconnect?.(name);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Bluetooth</h2>
      <Card isDark={isDark}>
        <Toggle on={btOn} onToggle={setBtOn} label="Bluetooth" highlight={false} isDark={isDark} />
        {btOn && (
          <div className="mt-3 space-y-1">
            {DEVICES.map((d) => {
              const isConnected = connected.includes(d.name);
              const hlConnect = highlightDeviceConnect === d.name;
              const hlDisconnect = highlightDeviceDisconnect === d.name;
              return (
                <div key={d.name} className={`flex items-center justify-between py-1.5 px-2 rounded ${isConnected ? (isDark ? "bg-blue-900/40" : "bg-blue-50") : ""}`}>
                  <div>
                    <div>{d.name}</div>
                    {/* A connected row is tinted, and the standard muted gray is
                        4.44:1 on that blue-50 — just under AA. One step darker on
                        the tinted row only; the untinted rows keep the normal
                        muted color so the hierarchy still reads. */}
                    <div className={`text-xs ${isConnected ? (isDark ? "text-gray-200" : "text-gray-600") : mutedClass}`}>
                      {isConnected ? "Connected" : "Available"}
                    </div>
                  </div>
                  {isConnected ? (
                    <button
                      onClick={() => disconnectDevice(d.name)}
                      className={`text-xs px-2 py-1 rounded ${isDark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300"} ${hlDisconnect ? "animate-ring-pulse" : ""}`}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => connectDevice(d.name)}
                      className={`text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white ${hlConnect ? "animate-ring-pulse" : ""}`}
                    >
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function NotificationsPanel({ muted_, onToggle_, highlightToggle, mutedClass, isDark }: {
  muted_: boolean; onToggle_: (v: boolean) => void; highlightToggle?: string; mutedClass: string; isDark: boolean;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Notifications</h2>
      <Card isDark={isDark}>
        <Toggle on={muted_} onToggle={onToggle_} label="Do Not Disturb" highlight={highlightToggle === "do-not-disturb"} isDark={isDark} />
        <div className={`text-xs ${mutedClass} mt-1`}>Silence all notifications and alerts</div>
      </Card>
    </div>
  );
}

function StoragePanel({ items, trashSize, totalGb, usedGb, onDelete, onEmptyTrash, highlightItem, highlightToggle, onToggle, mutedClass, isDark }: {
  items: StorageItem[]; trashSize: number; totalGb: number; usedGb: number; onDelete: (name: string) => void; onEmptyTrash: () => void; highlightItem?: string; highlightToggle?: string; onToggle?: (name: string, val: boolean) => void; mutedClass: string; isDark: boolean;
}) {
  const [autoBackup, setAutoBackup] = useState(false);
  const [backupTime, setBackupTime] = useState<string | null>(null);
  const segments = [
    { label: "Photos", color: "bg-pink-400", gb: items.filter((i) => !i.deleted && i.category === "photos").reduce((s, i) => s + i.sizeGb, 0) },
    { label: "Apps", color: "bg-blue-400", gb: items.filter((i) => !i.deleted && i.category === "apps").reduce((s, i) => s + i.sizeGb, 0) },
    { label: "Files", color: "bg-yellow-400", gb: items.filter((i) => !i.deleted && i.category === "files").reduce((s, i) => s + i.sizeGb, 0) },
    { label: "System", color: "bg-gray-400", gb: items.filter((i) => !i.deleted && i.category === "system").reduce((s, i) => s + i.sizeGb, 0) },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Storage</h2>
      <SimulatedDataBanner />
      <Card isDark={isDark}>
        <div className="mb-2 font-medium">{usedGb.toFixed(1)} GB of {totalGb} GB used</div>
        <div className={`h-5 rounded-full overflow-hidden flex ${isDark ? "bg-gray-600" : "bg-gray-200"}`}>
          {segments.map((seg) => (
            <div key={seg.label} className={`${seg.color} transition-all`} style={{ width: `${(seg.gb / totalGb) * 100}%` }} title={`${seg.label}: ${seg.gb.toFixed(1)} GB`} />
          ))}
          {trashSize > 0 && <div className="bg-red-400 transition-all" style={{ width: `${(trashSize / totalGb) * 100}%` }} title={`Trash: ${trashSize.toFixed(1)} GB`} />}
        </div>
        <div className="flex gap-3 mt-2 text-xs flex-wrap">
          {segments.map((seg) => (
            <span key={seg.label} className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-sm ${seg.color}`} />
              {seg.label}
            </span>
          ))}
          {trashSize > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-400" />
              Trash
            </span>
          )}
        </div>
      </Card>
      <Card isDark={isDark}>
        <div className="font-medium mb-2">Largest Items</div>
        {items.map((item) => (
          <div key={item.name} className={`flex items-center justify-between py-1.5 border-b last:border-b-0 ${isDark ? "border-gray-600" : "border-gray-100"} ${item.deleted ? "opacity-40 line-through" : ""}`}>
            <div>
              <span>{item.name}</span>
              <span className={`ml-2 text-xs ${mutedClass}`}>{item.size}</span>
            </div>
            {!item.deleted && item.category !== "system" && (
              <button
                onClick={() => onDelete(item.name)}
                className={`text-xs px-2 py-0.5 rounded ${isDark ? "bg-red-900/50 text-red-300 hover:bg-red-800" : "bg-red-50 text-red-700 sim-dark:text-red-400 hover:bg-red-100"} ${highlightItem === item.name ? "animate-ring-pulse" : ""}`}
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </Card>
      {trashSize > 0 && (
        <button
          onClick={onEmptyTrash}
          className={`w-full py-2 rounded-lg font-medium ${isDark ? "bg-red-900/50 text-red-300 hover:bg-red-800" : "bg-red-50 text-red-700 sim-dark:text-red-400 hover:bg-red-100"} ${highlightItem === "empty-trash" ? "animate-ring-pulse" : ""}`}
        >
          Empty Trash ({trashSize.toFixed(1)} GB)
        </button>
      )}
      <Card isDark={isDark}>
        <div className="font-medium mb-2">Backups</div>
        <Toggle
          on={autoBackup}
          onToggle={(v) => {
            setAutoBackup(v);
            if (v) setBackupTime("just now");
            onToggle?.("auto-backups", v);
          }}
          label="Automatic Backups"
          highlight={highlightToggle === "auto-backups"}
          isDark={isDark}
        />
        {autoBackup && backupTime && (
          <p className={`text-xs mt-1 ${mutedClass}`}>Last backup: {backupTime}</p>
        )}
      </Card>
    </div>
  );
}

function PrivacyPanel({ highlightToggle, onToggle, mutedClass, isDark }: {
  highlightToggle?: string; onToggle?: (target: string, value: boolean) => void; mutedClass: string; isDark: boolean;
}) {
  const [crossSite, setCrossSite] = useState(true);
  const [location, setLocation] = useState(true);
  const [popups, setPopups] = useState(false);
  const [cleared, setCleared] = useState(false);
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Privacy</h2>
      <Card isDark={isDark}>
        <Toggle on={crossSite} onToggle={(v) => { setCrossSite(v); onToggle?.("cross-site-tracking", v); }} label="Cross-Site Tracking" highlight={highlightToggle === "cross-site-tracking"} isDark={isDark} />
        <div className={`text-xs ${mutedClass} mt-1 mb-3`}>Allow websites to follow you across different sites</div>
        <Toggle on={location} onToggle={(v) => { setLocation(v); onToggle?.("location-sharing", v); }} label="Location Sharing" highlight={highlightToggle === "location-sharing"} isDark={isDark} />
        <div className={`text-xs ${mutedClass} mt-1 mb-3`}>Allow websites and apps to see where you are</div>
        <Toggle on={popups} onToggle={(v) => { setPopups(v); onToggle?.("block-popups", v); }} label="Block Pop-ups" highlight={highlightToggle === "block-popups"} isDark={isDark} />
        <div className={`text-xs ${mutedClass} mt-1`}>Stop new windows opening without your permission</div>
      </Card>
      <Card isDark={isDark}>
        <div className="font-medium mb-2">Browsing Data</div>
        <p className={`text-xs ${mutedClass} mb-3`}>Clears your history, cookies, and cached files.</p>
        {cleared ? (
          <div className={`text-xs font-medium py-2 text-center ${isDark ? "text-green-400" : "text-green-700"}`}>Browsing data cleared.</div>
        ) : (
          <button
            onClick={() => { setCleared(true); onToggle?.("clear-browsing-data", true); }}
            className={`w-full py-2 rounded-lg text-sm font-medium ${isDark ? "bg-red-900/50 text-red-300 hover:bg-red-800" : "bg-red-50 text-red-700 sim-dark:text-red-400 hover:bg-red-100"} ${highlightToggle === "clear-browsing-data" ? "animate-ring-pulse" : ""}`}
          >
            Clear Browsing Data
          </button>
        )}
      </Card>
    </div>
  );
}

function SimulatedDataBanner() {
  return (
    <div className="bg-purple-100 border-2 border-purple-400 text-purple-900 rounded-lg px-4 py-3 text-xs font-medium mb-3">
      These are made-up numbers for practice. Your real computer will show different information.
    </div>
  );
}

function AboutPanel({ mutedClass, isDark, onRestart, highlightRestart }: {
  mutedClass: string; isDark: boolean; onRestart?: () => void; highlightRestart?: boolean;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">About</h2>
      {/* Restart goes first when it is the reason the learner opened this panel — below
          the specifications it fell under the fold of a small window. */}
      {onRestart && (
        <Card isDark={isDark}>
          <div className="font-medium mb-2">System</div>
          <button
            onClick={onRestart}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium ${
              isDark ? "bg-amber-900/40 text-amber-300 hover:bg-amber-900/60" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            } ${highlightRestart ? "animate-ring-pulse" : ""}`}
          >
            <span>Restart</span>
            <span aria-hidden="true">&rsaquo;</span>
          </button>
          <p className={`text-xs ${mutedClass} mt-2`}>Restarting closes all open apps and starts your computer again.</p>
        </Card>
      )}
      <SimulatedDataBanner />
      <Card isDark={isDark}>
        <div className="space-y-2">
          <div className="flex justify-between"><span className={mutedClass}>Computer Name</span><span>My Computer</span></div>
          <div className="flex justify-between"><span className={mutedClass}>Software Version</span><span>14.2.1</span></div>
          <div className="flex justify-between"><span className={mutedClass}>Processor</span><span>QuadCore 3.2 GHz</span></div>
          <div className="flex justify-between"><span className={mutedClass}>Memory</span><span>8 GB</span></div>
          <div className="flex justify-between"><span className={mutedClass}>Storage</span><span>100 GB</span></div>
        </div>
      </Card>
    </div>
  );
}
