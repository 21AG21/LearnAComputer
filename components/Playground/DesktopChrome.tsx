"use client";

import type { ReactNode } from "react";
import { useSimTheme } from "./Desktop/SimThemeContext";
import { useIsPhone } from "./SimFormFactor";

/**
 * The parts that make a simulated desktop recognizable: the wallpaper, the menu bar,
 * and the WiFi / battery / clock cluster at its right end.
 *
 * FakeDesktop and GuidedDesktopTask used to draw these separately — different
 * wallpaper, different bar height, one calling itself "Desktop" and the other
 * "PlaygroundOS" — so Unit 1 taught a computer the rest of the course never showed
 * again. Both render from here now.
 */

export type StatusPanelId = "wifi" | "battery" | "calendar";

export function wallpaper(dark: boolean): string {
  return dark
    ? "linear-gradient(115deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%)"
    : "linear-gradient(115deg, #f5b9b9 0%, #fadcdc 20%, #d9f1d9 38%, #c2e9c2 50%, #daf2da 62%, #ccd3f3 82%, #bdc7ef 100%)";
}

export function WifiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 26" className={className} aria-hidden="true">
      <path d="M2 9 A20 20 0 0 1 30 9" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M7 14.5 A13 13 0 0 1 25 14.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M12 20 A7 7 0 0 1 20 20" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="16" cy="24" r="2.2" fill="currentColor" />
    </svg>
  );
}

export function BatteryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 20" className={className} aria-hidden="true">
      <rect x="1" y="1.5" width="33" height="17" rx="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <rect x="35" y="6.5" width="4" height="7" rx="2" fill="currentColor" />
    </svg>
  );
}

interface MenuBarProps {
  dark?: boolean;
  /** Left end: the name of whatever is in front, or "Desktop" when nothing is. */
  title: string;
  /** Window controls or anything else that belongs before the title. */
  leading?: ReactNode;
  /** Between the title and the status cluster (a Do Not Disturb indicator, say). */
  trailing?: ReactNode;
  time: string;
  batteryPercent: number | null;
  openPanel: StatusPanelId | null;
  onTogglePanel: (panel: StatusPanelId) => void;
  /** Draws the pulsing ring a guided step uses to point at one of the status buttons. */
  highlight?: StatusPanelId | null;
  /**
   * The phone's version of the same bar: shorter and a size down.
   *
   * On a laptop this bar is 36px of a 620px pane. On a phone it is 36px of an
   * 844px screen that also has to hold the lesson line, the app and the home
   * bar — and a status strip is the one thing on a phone that is meant to be
   * glanceable rather than read. Same buttons, same panels, same order; less
   * height.
   */
  compact?: boolean;
}

export function DesktopMenuBar({
  dark = false,
  title,
  leading,
  trailing,
  time,
  batteryPercent,
  openPanel,
  onTogglePanel,
  highlight = null,
  compact = false,
}: MenuBarProps) {
  // `sim-dark:`, not `dark:` — these follow the practice computer's own Dark Mode
  // setting, not the learner's site theme. As `dark:` they lit up white-on-white
  // whenever someone read the site in dark mode with the sim still light.
  /**
   * On a phone every one of these gets a 44px hit area out of its own padding.
   *
   * `py-3 -my-3` grows the *padding box* — which is what a finger lands on —
   * without growing the strip, so the lesson keeps its vertical space. Measured
   * before this: Wi-Fi 32x24, the clock 69x28, the battery 79x28, all of them
   * pressed in three Unit 1 lessons by people chosen for having unsteady hands.
   * `relative` so the grown box paints over the app below rather than under it.
   */
  const btn = (panel: StatusPanelId, extra = "") =>
    `rounded transition-colors hover:bg-black/10 sim-dark:hover:bg-white/15 ${
      compact ? "relative -my-3 px-2 py-3" : "px-1.5 py-1"
    } ${
      openPanel === panel ? "bg-black/10 sim-dark:bg-white/15" : ""
    } ${highlight === panel ? "animate-ring-pulse" : ""} ${extra}`;

  return (
    <div
      className={`relative shrink-0 flex items-center justify-between border-b ${
        compact ? "h-8 px-2 text-sm font-semibold" : "h-9 px-2 text-lg font-semibold"
      } ${dark ? "bg-gray-800 text-gray-100 border-gray-700" : "bg-white text-gray-900 border-gray-200"}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {leading}
        {/* Clock on the LEFT in the phone's compact strip, which is where every
            phone puts it; a laptop menu bar puts it on the right with the rest of
            the status cluster. Same button, same panel, the side each machine
            actually uses. */}
        {compact && (
          <button
            onClick={() => onTogglePanel("calendar")}
            aria-label="Open calendar"
            aria-expanded={openPanel === "calendar"}
            suppressHydrationWarning
            className={btn("calendar", "tabular-nums")}
          >
            {time}
          </button>
        )}
        <span className="truncate font-[var(--font-app-title)]">{title}</span>
      </div>
      <div className={`flex shrink-0 items-center ${compact ? "gap-2" : "gap-3"}`}>
        {trailing}
        <button
          onClick={() => onTogglePanel("wifi")}
          aria-label="Wi-Fi status"
          aria-expanded={openPanel === "wifi"}
          className={btn("wifi")}
        >
          <WifiIcon className={compact ? "w-7 h-5" : "w-6 h-5"} />
        </button>
        <button
          onClick={() => onTogglePanel("battery")}
          aria-label="Battery status"
          aria-expanded={openPanel === "battery"}
          className={btn("battery", "flex items-center gap-1")}
        >
          <BatteryIcon className={compact ? "w-6 h-3" : "w-8 h-4"} />
          {batteryPercent !== null && <span>{batteryPercent}%</span>}
        </button>
        {!compact && (
          <button
            onClick={() => onTogglePanel("calendar")}
            aria-label="Open calendar"
            aria-expanded={openPanel === "calendar"}
            suppressHydrationWarning
            className={btn("calendar")}
          >
            {time}
          </button>
        )}
      </div>
    </div>
  );
}


/**
 * The drop-down panels behind the status cluster.
 *
 * They lived inside `FakeDesktop` until the phone needed them too: on a phone
 * these three buttons are the *whole* status bar, and they are present in every
 * app rather than only on the desktop. One definition, so the Wi-Fi panel a
 * learner meets in Unit 1 is the Wi-Fi panel they meet inside Mail.
 */
export function StatusPanel({
  color,
  tint,
  darkTint,
  title,
  onClose,
  closing,
  children,
}: {
  color: string;
  tint: string;
  /**
   * The header tint for the practice computer's dark mode. The light tints are pale
   * washes meant to carry black text; on a dark panel they read as a bright strip
   * pasted onto it. Each one is the same hue taken down to a shade that carries
   * white text instead, so the panel stays recognizably the WiFi / battery /
   * calendar panel either way.
   */
  darkTint: string;
  title: string;
  onClose: () => void;
  closing?: boolean;
  children: React.ReactNode;
}) {
  const { dark } = useSimTheme();
  const isPhone = useIsPhone();
  return (
    /**
     * A dropdown on a laptop; the panel a phone slides down from its status bar.
     *
     * Anchored `top-10 right-2 w-72`, on a 390px screen this hung 288px of box
     * off a 32px icon, overflowed toward the right edge and left the thing it
     * described half covered. Every phone answers a tap on the status bar with a
     * panel the full width of the screen — Control Center, the notification
     * shade — because at this size there is no room for anything to be "beside"
     * anything else.
     *
     * The laptop path is untouched, which matters: this is the same panel the
     * whole of Unit 1's menu-bar lesson points at.
     */
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-50 overflow-hidden border-black bg-white shadow-lg sim-dark:border-gray-500 sim-dark:bg-gray-900 sim-dark:text-gray-100 ${
        isPhone
          ? "inset-x-2 top-2 rounded-2xl border-2"
          : "right-2 top-10 w-72 border-4"
      } ${closing ? "animate-slide-up-out" : "animate-slide-down"}`}
    >
      <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: dark ? darkTint : tint }}>
        <p className="text-lg font-bold">{title}</p>
        <button
          onClick={onClose}
          aria-label={`Close ${title}`}
          /* A phone's dismiss control is a finger's width. This was 28x28. */
          className={`flex items-center justify-center rounded-full font-bold text-white hover:opacity-80 transition-opacity ${
            isPhone ? "min-h-[44px] w-11 text-lg" : "h-7 w-7 text-sm"
          }`}
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

export function CalendarPanel({ onClose, closing }: { onClose: () => void; closing?: boolean }) {
  const now = new Date();
  const dayName = DAY_NAMES[now.getDay()];
  const monthName = MONTH_NAMES[now.getMonth()];
  const dateOrdinal = ordinal(now.getDate());
  return (
    <StatusPanel color="#c0392b" tint="#fde8e6" darkTint="#7f2019" onClose={onClose} title="Calendar" closing={closing}>
      <p className="px-2 py-1 font-semibold text-sm text-gray-700 sim-dark:text-gray-200">
        Today is {dayName}, {monthName} {dateOrdinal}
      </p>
      <div className="mt-1 space-y-1">
        {CALENDAR_EVENTS.map((ev) => (
          <div key={ev.label} className="flex gap-2 items-baseline px-2 py-1 border-t border-red-100 sim-dark:border-gray-700">
            <span className="text-xs text-gray-500 sim-dark:text-gray-400 w-16 shrink-0">{ev.time}</span>
            <span className="text-sm font-medium">{ev.label}</span>
          </div>
        ))}
      </div>
    </StatusPanel>
  );
}
