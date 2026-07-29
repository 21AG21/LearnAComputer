"use client";

import type { ReactNode } from "react";

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
}: MenuBarProps) {
  const btn = (panel: StatusPanelId, extra = "") =>
    `rounded px-1.5 py-1 transition-colors hover:bg-black/10 dark:hover:bg-white/15 ${
      openPanel === panel ? "bg-black/10 dark:bg-white/15" : ""
    } ${highlight === panel ? "animate-ring-pulse" : ""} ${extra}`;

  return (
    <div
      className={`relative h-9 shrink-0 flex items-center justify-between px-2 text-lg font-semibold border-b ${
        dark ? "bg-gray-800 text-gray-100 border-gray-700" : "bg-white text-gray-900 border-gray-200"
      }`}
    >
      <div className="flex items-center gap-2">
        {leading}
        <span className="font-[var(--font-app-title)]">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        {trailing}
        <button
          onClick={() => onTogglePanel("wifi")}
          aria-label="Wi-Fi status"
          aria-expanded={openPanel === "wifi"}
          className={btn("wifi")}
        >
          <WifiIcon className="w-6 h-5" />
        </button>
        <button
          onClick={() => onTogglePanel("battery")}
          aria-label="Battery status"
          aria-expanded={openPanel === "battery"}
          className={btn("battery", "flex items-center gap-1")}
        >
          <BatteryIcon className="w-8 h-4" />
          {batteryPercent !== null && <span>{batteryPercent}%</span>}
        </button>
        <button
          onClick={() => onTogglePanel("calendar")}
          aria-label="Open calendar"
          aria-expanded={openPanel === "calendar"}
          suppressHydrationWarning
          className={btn("calendar")}
        >
          {time}
        </button>
      </div>
    </div>
  );
}
