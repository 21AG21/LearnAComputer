"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { WifiIcon, BatteryIcon, type StatusPanelId } from "./DesktopChrome";

/**
 * The three bars a phone actually has, as three separate things.
 *
 * ## Why this file exists
 *
 * The phone was drawing `DesktopMenuBar compact` at the top of the screen and
 * hanging a back arrow and the app's name off it. That is one control strip
 * doing the job of two, and it is the single most visible way the simulated
 * phone read as a laptop: **no phone has ever put a back button in the status
 * bar**, and none puts the name of the app there either. A learner who has held
 * a phone knows the shape of the top of the screen better than they know
 * anything else about it, and this got it wrong on every screen of the course.
 *
 * A phone has, top to bottom:
 *
 * 1. **A status bar** — the time on the left, the radio and the battery on the
 *    right, and *nothing else, ever*. It belongs to the system, not to the app,
 *    and it carries no navigation.
 * 2. **A nav bar** — the app's. A back chevron on the left, labeled with the
 *    place it goes back *to*; the title of the screen you are on, centered; and
 *    at most one action on the right.
 * 3. **A tab bar** at the bottom, for apps with two or more top-level sections —
 *    which is what a phone has instead of a sidebar.
 *
 * Getting these apart is what makes push-and-pop navigation expressible at all.
 * With one merged bar there is nowhere to say "back to Mailboxes" as distinct
 * from "back to the home screen", so every app could only ever be one screen
 * deep and the sidebar had to stay on screen forever.
 *
 * ## The status bar carries buttons, and that is a deliberate divergence
 *
 * On a real phone the panels behind the clock and the battery are reached by
 * *swiping down* from the top edge. This course teaches "tap it, then tap it
 * again to close", because a learner who cannot yet reliably tap cannot
 * reliably swipe from a screen edge, and because a swipe that opens something
 * has no visible affordance to teach from. The buttons keep their 44px hit
 * areas out of their own padding, so the strip itself stays 32px.
 */

/**
 * The highlight ring for a row that runs the full width of a scrolling list.
 *
 * `animate-ring-pulse` is an **outer** box-shadow. A row that fills its
 * container's width has its left and right shadow clipped away by that
 * container's `overflow`, and what reaches the learner is two yellow horizontal
 * rules — which does not read as "this one", it reads as a rendering fault.
 * Measured on Files' places list, Mail's folders and messages, Photos' albums
 * and Messages' conversations: every list in the course.
 *
 * The inset keyframe draws the same yellow-on-navy edge *inside* the box, so
 * nothing can clip it. Same rule, same reason, as the phone's home bar.
 */
export const ROW_RING = "animate-ring-pulse-inset";

interface StatusBarProps {
  dark?: boolean;
  time: string;
  batteryPercent: number | null;
  openPanel: StatusPanelId | null;
  onTogglePanel: (panel: StatusPanelId) => void;
  /** The pulsing ring a guided step uses to point at one of the status buttons. */
  highlight?: StatusPanelId | null;
  /** A Do Not Disturb indicator, say. Sits before the radio glyph. */
  trailing?: ReactNode;
  /**
   * Paint nothing behind it, so whatever is underneath shows through.
   *
   * This is how a real phone's status bar behaves on the home screen: the
   * wallpaper runs up under it. Inside an app it takes the nav bar's color
   * instead, so the two read as one block of chrome the way they do on a
   * handset.
   */
  transparent?: boolean;
}

export function PhoneStatusBar({
  dark = false,
  time,
  batteryPercent,
  openPanel,
  onTogglePanel,
  highlight = null,
  trailing,
  transparent = false,
}: StatusBarProps) {
  // `py-3 -my-3` grows the padding box — which is what a finger lands on — to
  // 44px without growing the 32px strip. `relative` so the grown box paints
  // over the app below rather than under it.
  const btn = (panel: StatusPanelId, extra = "") =>
    `relative -my-3 rounded px-2 py-3 transition-colors hover:bg-black/10 sim-dark:hover:bg-white/15 ${
      openPanel === panel ? "bg-black/10 sim-dark:bg-white/15" : ""
    } ${highlight === panel ? "animate-ring-pulse" : ""} ${extra}`;

  return (
    <div
      data-phone-statusbar
      className={`relative flex h-8 shrink-0 items-center justify-between px-3 text-sm font-semibold ${
        transparent ? "bg-transparent" : dark ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"
      } ${transparent ? (dark ? "text-gray-100" : "text-gray-900") : ""}`}
    >
      <button
        onClick={() => onTogglePanel("calendar")}
        aria-label="Open calendar"
        aria-expanded={openPanel === "calendar"}
        suppressHydrationWarning
        className={btn("calendar", "-ml-2 tabular-nums")}
      >
        {time}
      </button>
      <div className="flex shrink-0 items-center gap-1">
        {trailing}
        <button onClick={() => onTogglePanel("wifi")} aria-label="Wi-Fi status" aria-expanded={openPanel === "wifi"} className={btn("wifi")}>
          <WifiIcon className="h-4 w-5" />
        </button>
        <button
          onClick={() => onTogglePanel("battery")}
          aria-label="Battery status"
          aria-expanded={openPanel === "battery"}
          className={btn("battery", "-mr-2 flex items-center gap-1")}
        >
          {batteryPercent !== null && <span className="tabular-nums">{batteryPercent}%</span>}
          <BatteryIcon className="h-3 w-6" />
        </button>
      </div>
    </div>
  );
}

interface NavBarProps {
  dark?: boolean;
  /** The screen you are on. Centered, like every phone puts it. */
  title: string;
  /**
   * Where back goes *to* — "Home", "Mailboxes", "Albums".
   *
   * A phone labels its back chevron with the destination rather than drawing a
   * bare arrow, and for this audience that is not a nicety: an unlabeled arrow
   * asks the learner to remember where they came from, which is exactly the
   * thing a beginner has not built yet.
   */
  backLabel?: string;
  onBack?: () => void;
  /** At most one action, on the right. */
  trailing?: ReactNode;
  /**
   * Does back pop within the app, or leave it altogether?
   *
   * Published to the DOM as `data-phone-back`, and `lib/solve/solver.ts` reads
   * it. The solver's nav-hunt clicks anything whose text is a known navigation
   * label when its target is off screen, and this button's text is the place it
   * goes back *to* — so at the top of an app it reads "Home", which is in that
   * list. Left undistinguished, a hunt looking for Mail's Spam folder would
   * press it and walk out of Mail entirely. An in-app pop is exactly what the
   * hunt *should* be allowed to press; leaving the app never is.
   */
  backKind?: "home" | "app";
  /**
   * Ring the back chevron.
   *
   * Some guided steps genuinely point at back: Photos rings it when the step
   * wants a photo that is not the one currently open, because glowing a tile
   * that is off screen strands the learner. Moving back out of the app body
   * and into this bar has to bring the ring with it, or those steps point at
   * nothing at all.
   */
  highlightBack?: boolean;
}

export function PhoneNavBar({ dark = false, title, backLabel = "Home", onBack, trailing, backKind = "home", highlightBack }: NavBarProps) {
  return (
    <div
      data-phone-navbar
      className={`relative flex h-11 shrink-0 items-center border-b px-1 ${
        dark ? "border-gray-700 bg-gray-800 text-gray-100" : "border-gray-200 bg-white text-gray-900"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center">
        {onBack && (
          /**
           * `aria-label` plus an SVG plus a **bare text node** — never a `<span>`.
           *
           * `lib/solve/solver.ts` identifies a dock icon as
           * `button[aria-label]` containing an `img` or a `span`, so wrapping
           * this label in a span would enlist the back button in the list of
           * app icons the solver clicks through on every `open-app` step. That
           * exact mistake once cost `final-files` its entire step budget.
           */
          <button
            type="button"
            data-phone-back={backKind}
            aria-label={`Back to ${backLabel}`}
            onClick={onBack}
            className={`flex min-h-[44px] items-center gap-0.5 rounded px-2 text-[15px] font-semibold text-blue-700 hover:bg-black/5 sim-dark:text-blue-300 sim-dark:hover:bg-white/10 ${
              highlightBack ? "animate-ring-pulse" : ""
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5 8 12l7 7" />
            </svg>
            {backLabel}
          </button>
        )}
      </div>
      {/* Absolutely centered, so a long back label does not shove the title off
          center the way a flex row would. This is how a phone does it too. */}
      <p className="pointer-events-none absolute inset-x-0 mx-auto max-w-[55%] truncate text-center text-[17px] font-bold font-[var(--font-app-title)]">
        {title}
      </p>
      <div className="flex min-w-0 flex-1 items-center justify-end">{trailing}</div>
    </div>
  );
}

export interface PhoneTab {
  id: string;
  label: string;
  icon: ReactNode;
}

/**
 * The bottom tab bar — a phone's answer to a sidebar.
 *
 * Six of the eight simulated apps had a macOS source list (Inbox / Sent /
 * Drafts, All Photos / Favorites / Albums) stacked *above* their content and
 * left there forever, so a 390px screen was split between a navigation list
 * nobody needed after the first tap and the thing the learner actually came
 * for. A phone moves those to the bottom edge, where they cost 49px once and
 * are reachable by the thumb.
 */
export function PhoneTabBar({
  tabs,
  active,
  onSelect,
  dark = false,
  highlight,
}: {
  tabs: PhoneTab[];
  active: string;
  onSelect: (id: string) => void;
  dark?: boolean;
  /** Tab id a guided step is pointing at. */
  highlight?: string | null;
}) {
  return (
    <div
      data-phone-tabbar
      className={`flex shrink-0 items-stretch border-t ${
        dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"
      }`}
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            data-phone-tab={t.id}
            aria-current={on ? "page" : undefined}
            onClick={() => onSelect(t.id)}
            className={`flex min-h-[49px] flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-semibold ${
              on
                ? "text-blue-700 sim-dark:text-blue-300"
                : "text-gray-600 sim-dark:text-gray-400"
            } ${highlight === t.id ? "animate-ring-pulse-inset" : ""}`}
          >
            <span aria-hidden className="flex h-6 items-center">{t.icon}</span>
            {/* 13px is this project's reading floor everywhere else; a tab label
                is the one place a phone genuinely sets smaller type, and
                `phone-touch-check` treats 11px labels as advisory for exactly
                this reason. The 49px target is what has to hold. */}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * What the nav bar should say, published by whichever app is in front.
 *
 * The bar is drawn once — by `FakeDesktop` or by `PhoneShell` — and the app
 * inside it is the only thing that knows it has pushed a second screen. Rather
 * than every app drawing its own bar (ten chances to get the height, the tint
 * and the back-chevron wrong), an app *declares* where it is and the shell
 * renders it.
 *
 * `null` means "nothing to add" and the shell falls back to the app's name with
 * a back chevron pointing home.
 */
export interface PhoneNavEntry {
  title: string;
  backLabel?: string;
  /** Omit to pop all the way out of the app. */
  onBack?: () => void;
  trailing?: ReactNode;
  /** Ring the chevron, for the steps that genuinely point at back. */
  highlightBack?: boolean;
}

const NavSetterCtx = createContext<(entry: PhoneNavEntry | null) => void>(() => {});

export function PhoneNavProvider({ value, children }: { value: (entry: PhoneNavEntry | null) => void; children: ReactNode }) {
  return <NavSetterCtx.Provider value={value}>{children}</NavSetterCtx.Provider>;
}

/**
 * Declare the screen the learner is looking at.
 *
 * Call it with `null` to hand the bar back to the shell. `deps` are the
 * primitive bits of state the entry is derived from — the callback closes over
 * current state, so re-running the effect whenever the screen changes is what
 * keeps `onBack` pointing at the right place.
 *
 * The setter is **scoped per app** by the shell, because every open app stays
 * mounted on a phone (leaving Mail and coming back must find the half-written
 * message still there). A single global setter would let a backgrounded app's
 * effect overwrite the nav bar of the app in front.
 */
export function usePhoneScreen(entry: PhoneNavEntry | null, deps: readonly unknown[]) {
  const setNav = useContext(NavSetterCtx);
  useEffect(() => {
    setNav(entry);
    return () => setNav(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
