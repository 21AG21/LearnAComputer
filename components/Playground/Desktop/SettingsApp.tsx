"use client";

import { useState, type ReactNode } from "react";
import { useSimTheme } from "./SimThemeContext";
import {
  PaletteIcon, DisplayIcon, AccessibilityIcon, WifiIcon,
  BellIcon, SaveIcon, InfoIcon,
} from "../Icons";

type Section = "appearance" | "display" | "accessibility" | "wifi" | "notifications" | "storage" | "about";

const SECTIONS: { id: Section; label: string; icon: ReactNode }[] = [
  { id: "appearance", label: "Appearance", icon: <PaletteIcon size={16} /> },
  { id: "display", label: "Display", icon: <DisplayIcon size={16} /> },
  { id: "accessibility", label: "Accessibility", icon: <AccessibilityIcon size={16} /> },
  { id: "wifi", label: "WiFi", icon: <WifiIcon size={16} /> },
  { id: "notifications", label: "Notifications", icon: <BellIcon size={16} /> },
  { id: "storage", label: "Storage", icon: <SaveIcon size={16} /> },
  { id: "about", label: "About", icon: <InfoIcon size={16} /> },
];

interface SettingsAppProps {
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
  highlightSection,
  highlightToggle,
  highlightSlider,
  highlightItem,
  onSectionOpen,
  onToggle,
  onSlider,
  onDeleteItem,
  onEmptyTrash,
}: SettingsAppProps) {
  const theme = useSimTheme();
  const [active, setActive] = useState<Section>("appearance");
  const [storageItems, setStorageItems] = useState<StorageItem[]>(INITIAL_STORAGE);
  const [trashSize, setTrashSize] = useState(0);

  const dark = theme.dark;
  const bg = dark ? "bg-gray-900" : "bg-gray-50";
  const text = dark ? "text-gray-100" : "text-gray-900";
  const sidebar = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const panel = dark ? "bg-gray-800" : "bg-white";
  const muted = dark ? "text-gray-400" : "text-gray-500";

  function selectSection(s: Section) {
    setActive(s);
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

  return (
    <div className={`h-full flex ${bg} ${text} text-sm`} style={{ fontSize: `${theme.textScale / 100}em`, fontWeight: theme.boldText ? 600 : 400 }}>
      {/* Sidebar */}
      <div className={`w-44 shrink-0 border-r ${sidebar} overflow-y-auto`}>
        <div className={`p-3 font-semibold text-base ${muted}`}>Settings</div>
        {SECTIONS.map((s) => {
          const isActive = active === s.id;
          const hl = highlightSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => selectSection(s.id)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                isActive ? (dark ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-800") : dark ? "hover:bg-gray-700" : "hover:bg-gray-100"
              } ${hl ? "ring-2 ring-yellow-400 animate-pulse rounded" : ""}`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div className="flex-1 overflow-y-auto p-4">
        {active === "appearance" && (
          <AppearancePanel
            dark={dark}
            nightShift={theme.nightShift}
            onDarkToggle={(v) => { theme.set({ dark: v }); onToggle?.("dark-mode", v); }}
            onNightShiftToggle={(v) => { theme.set({ nightShift: v }); onToggle?.("night-shift", v); }}
            highlightToggle={highlightToggle}
            panelClass={panel}
            mutedClass={muted}
            isDark={dark}
          />
        )}
        {active === "display" && (
          <DisplayPanel
            brightness={theme.brightness}
            onBrightness={(v) => { theme.set({ brightness: v }); onSlider?.("brightness", v); }}
            highlightSlider={highlightSlider}
            panelClass={panel}
            mutedClass={muted}
            isDark={dark}
          />
        )}
        {active === "accessibility" && (
          <AccessibilityPanel
            textScale={theme.textScale}
            boldText={theme.boldText}
            onTextScale={(v) => { theme.set({ textScale: v }); onSlider?.("text-size", v); }}
            onBoldToggle={(v) => { theme.set({ boldText: v }); onToggle?.("bold-text", v); }}
            highlightToggle={highlightToggle}
            highlightSlider={highlightSlider}
            panelClass={panel}
            mutedClass={muted}
            isDark={dark}
          />
        )}
        {active === "wifi" && (
          <WifiPanel panelClass={panel} mutedClass={muted} isDark={dark} highlightToggle={highlightToggle} onToggle={onToggle} />
        )}
        {active === "notifications" && (
          <NotificationsPanel
            muted_={theme.notificationsMuted}
            onToggle_={(v) => { theme.set({ notificationsMuted: v }); onToggle?.("do-not-disturb", v); }}
            highlightToggle={highlightToggle}
            panelClass={panel}
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
            panelClass={panel}
            mutedClass={muted}
            isDark={dark}
          />
        )}
        {active === "about" && <AboutPanel panelClass={panel} mutedClass={muted} isDark={dark} />}
      </div>
    </div>
  );
}

function Toggle({ on, onToggle, label, highlight, isDark }: { on: boolean; onToggle: (v: boolean) => void; label: string; highlight: boolean; isDark: boolean }) {
  return (
    <button
      onClick={() => onToggle(!on)}
      className={`flex items-center justify-between w-full py-2 ${highlight ? "ring-2 ring-yellow-400 animate-pulse rounded px-2" : ""}`}
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
    <div className={`py-2 ${highlight ? "ring-2 ring-yellow-400 animate-pulse rounded px-2" : ""}`}>
      <div className="flex items-center justify-between mb-1">
        <span>{label}</span>
        <span className={isDark ? "text-gray-400" : "text-gray-500"}>{value}{label.includes("Text") ? "%" : ""}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
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

function AppearancePanel({ dark, nightShift, onDarkToggle, onNightShiftToggle, highlightToggle, panelClass, mutedClass, isDark }: {
  dark: boolean; nightShift: boolean; onDarkToggle: (v: boolean) => void; onNightShiftToggle: (v: boolean) => void; highlightToggle?: string; panelClass: string; mutedClass: string; isDark: boolean;
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

function DisplayPanel({ brightness, onBrightness, highlightSlider, panelClass, mutedClass, isDark }: {
  brightness: number; onBrightness: (v: number) => void; highlightSlider?: string; panelClass: string; mutedClass: string; isDark: boolean;
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

function AccessibilityPanel({ textScale, boldText, onTextScale, onBoldToggle, highlightToggle, highlightSlider, panelClass, mutedClass, isDark }: {
  textScale: number; boldText: boolean; onTextScale: (v: number) => void; onBoldToggle: (v: boolean) => void; highlightToggle?: string; highlightSlider?: string; panelClass: string; mutedClass: string; isDark: boolean;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Accessibility</h2>
      <Card isDark={isDark}>
        <Slider value={textScale} min={100} max={140} label="Text Size" highlight={highlightSlider === "text-size"} onChange={onTextScale} isDark={isDark} />
        <div className={`text-xs ${mutedClass} mt-1 mb-3`}>Make text larger across your computer</div>
        <Toggle on={boldText} onToggle={onBoldToggle} label="Bold Text" highlight={highlightToggle === "bold-text"} isDark={isDark} />
        <div className={`text-xs ${mutedClass} mt-1`}>Make all text heavier for easier reading</div>
      </Card>
    </div>
  );
}

function WifiPanel({ panelClass, mutedClass, isDark, highlightToggle, onToggle }: {
  panelClass: string; mutedClass: string; isDark: boolean; highlightToggle?: string; onToggle?: (target: string, value: boolean) => void;
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
              <span className="text-green-600 text-xs font-medium">Connected ✓</span>
            </div>
            <div className={`py-1.5 px-2 ${mutedClass}`}>Neighbor&apos;s WiFi</div>
            <div className={`py-1.5 px-2 ${mutedClass}`}>Coffee shop</div>
          </div>
        )}
      </Card>
    </div>
  );
}

function NotificationsPanel({ muted_, onToggle_, highlightToggle, panelClass, mutedClass, isDark }: {
  muted_: boolean; onToggle_: (v: boolean) => void; highlightToggle?: string; panelClass: string; mutedClass: string; isDark: boolean;
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

function StoragePanel({ items, trashSize, totalGb, usedGb, onDelete, onEmptyTrash, highlightItem, highlightToggle, onToggle, panelClass, mutedClass, isDark }: {
  items: StorageItem[]; trashSize: number; totalGb: number; usedGb: number; onDelete: (name: string) => void; onEmptyTrash: () => void; highlightItem?: string; highlightToggle?: string; onToggle?: (name: string, val: boolean) => void; panelClass: string; mutedClass: string; isDark: boolean;
}) {
  const [autoBackup, setAutoBackup] = useState(false);
  const [backupTime, setBackupTime] = useState<string | null>(null);
  const usedPct = (usedGb / totalGb) * 100;
  const segments = [
    { label: "Photos", color: "bg-pink-400", gb: items.filter((i) => !i.deleted && i.category === "photos").reduce((s, i) => s + i.sizeGb, 0) },
    { label: "Apps", color: "bg-blue-400", gb: items.filter((i) => !i.deleted && i.category === "apps").reduce((s, i) => s + i.sizeGb, 0) },
    { label: "Files", color: "bg-yellow-400", gb: items.filter((i) => !i.deleted && i.category === "files").reduce((s, i) => s + i.sizeGb, 0) },
    { label: "System", color: "bg-gray-400", gb: items.filter((i) => !i.deleted && i.category === "system").reduce((s, i) => s + i.sizeGb, 0) },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Storage</h2>
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
                className={`text-xs px-2 py-0.5 rounded ${isDark ? "bg-red-900/50 text-red-300 hover:bg-red-800" : "bg-red-50 text-red-600 hover:bg-red-100"} ${highlightItem === item.name ? "ring-2 ring-yellow-400 animate-pulse" : ""}`}
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
          className={`w-full py-2 rounded-lg font-medium ${isDark ? "bg-red-900/50 text-red-300 hover:bg-red-800" : "bg-red-50 text-red-600 hover:bg-red-100"} ${highlightItem === "empty-trash" ? "ring-2 ring-yellow-400 animate-pulse" : ""}`}
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

function AboutPanel({ panelClass, mutedClass, isDark }: { panelClass: string; mutedClass: string; isDark: boolean }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">About</h2>
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
