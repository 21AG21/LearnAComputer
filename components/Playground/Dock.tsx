"use client";

import Image from "next/image";

/**
 * The one dock. Three simulators used to draw their own — FakeDesktop floated bare
 * icons on the wallpaper, GuidedDesktopTask used a dark strip, GuidedTroubleshootingTask
 * a white strip with different artwork entirely — so "the dock" looked like a different
 * thing in each lesson. This renders the tray for all of them.
 */

const ICONS: Record<string, string> = {
  messages: "/playgrounds/dock-messages.png",
  browser: "/playgrounds/dock-browser.png",
  files: "/playgrounds/dock-files.png",
  mail: "/playgrounds/dock-mail.png",
  settings: "/playgrounds/dock-settings.png",
  photos: "/playgrounds/dock-photos.png",
  "app-market": "/playgrounds/dock-app-market.png",
  calendar: "/playgrounds/dock-calendar.png",
  reminders: "/playgrounds/dock-reminders.png",
  notes: "/playgrounds/dock-notes.png",
};

/** Soft tile colors, so ten black-line drawings still read as ten different apps. */
const TINTS: Record<string, string> = {
  messages: "#dcf2e3",
  browser: "#dbeafe",
  files: "#fdeccd",
  mail: "#d9edfb",
  settings: "#e5e8ee",
  photos: "#fde0e4",
  "app-market": "#e8e1fb",
  calendar: "#fde5dd",
  reminders: "#fdf1cb",
  notes: "#ecf3d2",
};

const FALLBACK_TINT = "#e5e8ee";

/** Dock-only abbreviations. The full name stays in aria-label, title bars and lesson copy. */
const SHORT_LABELS: Record<string, string> = {
  "app-market": "Market",
};

/** Call sites key apps by id ("app-market") or by label ("App Market"). Accept both. */
function normalize(key: string) {
  return key.trim().toLowerCase().replace(/\s+/g, "-");
}

export function dockIcon(key: string): string | undefined {
  return ICONS[normalize(key)];
}

export interface DockItem {
  id: string;
  label: string;
  /** Open but minimized — draws the green dot the closing-vs-quitting lesson refers to. */
  running?: boolean;
  /** Pulsing yellow ring for the step the learner is on. */
  highlighted?: boolean;
  /** Plays the launch bounce once. */
  bouncing?: boolean;
}

interface DockProps {
  items: DockItem[];
  onOpen: (id: string) => void;
  /** Tray color. Match it to whatever sits behind the dock. */
  tone?: "light" | "dark";
  size?: "md" | "sm" | "lg";
  showLabels?: boolean;
  className?: string;
  /**
   * Wrap onto as many rows as it takes, instead of one scrolling row.
   *
   * The phone course's home screen is this same dock, four tiles to a row. Ten
   * tiles in a single row need about 640px and a phone has 390, so without this
   * the row either overflows the screen or shrinks the tiles to something a
   * finger cannot hit. It is a second layout for one dock, deliberately, rather
   * than a second dock: "the same icon opens the same app" is only true while
   * there is one place the icons come from.
   */
  wrap?: boolean;
  /** The frosted tray behind the icons. Off on the phone's home screen, where the
   *  icons sit straight on the wallpaper exactly as they do on a real phone. */
  tray?: boolean;
}

export default function Dock({
  items,
  onOpen,
  tone = "light",
  size = "md",
  showLabels = true,
  className = "",
  wrap = false,
  tray = true,
}: DockProps) {
  // The column is exactly the tile's width. Ten of these plus gaps fit the lesson pane,
  // where a wider column did not — a long label wraps to a second line instead.
  const tile = size === "lg" ? "w-16 h-16" : size === "md" ? "w-14 h-14" : "w-12 h-12";
  const col = size === "lg" ? "w-16" : size === "md" ? "w-14" : "w-12";
  const pad = size === "lg" ? "p-3" : size === "md" ? "p-2.5" : "p-2";
  const px = size === "lg" ? 64 : size === "md" ? 56 : 48;

  return (
    // items-start, so a label that wraps to two lines grows downward instead of
    // shoving its own tile out of line with the rest of the row.
    <div
      /**
       * Four to a row on a phone, and a grid rather than a wrapping flex row:
       * flex-wrap packs by width, so ten icons landed 5 + 5 with a ragged gap,
       * while a grid gives the even column rhythm a home screen is supposed to
       * have and keeps the labels lined up under each other.
       */
      className={`max-w-full rounded-2xl px-2 py-2 ${
        wrap ? "grid grid-cols-4 gap-x-2 gap-y-7 justify-items-center" : "flex items-start gap-1"
      } ${tray ? "backdrop-blur-md" : ""} ${className}`}
      style={
        tray
          ? {
              background: tone === "dark" ? "rgba(17,24,39,0.55)" : "rgba(255,255,255,0.55)",
              border: tone === "dark" ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.85)",
              boxShadow: tone === "dark" ? "0 8px 24px rgba(0,0,0,0.42)" : "0 8px 24px rgba(15,23,42,0.16)",
            }
          : undefined
      }
    >
      {items.map(({ id, label, running, highlighted, bouncing }) => {
        const icon = dockIcon(id) ?? dockIcon(label);
        return (
          <button
            key={id}
            onClick={() => onOpen(id)}
            aria-label={label}
            /* A stable hook for the harnesses. `aria-label` is the accessible
               name and belongs to the learner; a test selector that rides on it
               breaks the day the label is reworded. */
            data-dock-app={normalize(id)}
            className={`group flex shrink-0 flex-col items-center gap-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${col} ${
              bouncing ? "animate-dock-bounce" : ""
            }`}
          >
            <span
              /**
               * `data-sim-paper` because an app icon is artwork, not a surface:
               * these pastel tiles are how ten black-line drawings stay
               * distinguishable, and no real desktop recolors its app icons when
               * you turn on dark mode. Without the marker, simdark-check counts
               * all ten as light surfaces left unpainted, in every app.
               */
              data-sim-paper
              className={`relative block ${tile} ${pad} rounded-2xl transition-transform group-hover:-translate-y-1 group-active:scale-95 ${
                highlighted ? "animate-ring-pulse" : ""
              }`}
              style={{
                background: TINTS[normalize(id)] ?? TINTS[normalize(label)] ?? FALLBACK_TINT,
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 1px 2px rgba(15,23,42,0.14)",
              }}
            >
              {icon ? (
                <Image src={icon} alt="" fill sizes={`${px}px`} className={`object-contain ${pad}`} />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-600">
                  {label.charAt(0)}
                </span>
              )}
              {running && (
                <span
                  aria-label={`${label} is still open`}
                  className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white"
                />
              )}
            </span>
            {showLabels && (
              <span
                className={`w-full select-none text-center font-medium leading-tight ${
                  size === "lg" ? "text-[11px]" : "text-[10px]"
                } ${
                  tone === "dark" ? "text-slate-200" : "text-slate-700"
                }`}
              >
                {SHORT_LABELS[normalize(id)] ?? SHORT_LABELS[normalize(label)] ?? label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
