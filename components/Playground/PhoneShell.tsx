"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CalendarPanel, DesktopMenuBar, StatusPanel, type StatusPanelId } from "./DesktopChrome";
import { useSimTheme } from "./Desktop/SimThemeContext";
import { useSwipe } from "./touchGestures";
import { ArrowLeftIcon, WifiIcon } from "./Icons";

/**
 * The strip at the top and the bar at the bottom — the two things that make a
 * screen a phone.
 *
 * ## Why this exists
 *
 * `FakeDesktop` grows them itself in its phone shape, so Unit 1 and every
 * Settings lesson had them. But most guided lessons go through `DesktopLaunch`,
 * which hands over to the guided sim once the app is open and drops the desktop
 * entirely — correct on a laptop, where the sim is a window with its own frame,
 * and wrong on a phone, where it left the app floating with no status bar, no
 * clock, and no way home in 91 of the 118 lessons.
 *
 * The cost of that was not only fidelity. Unit 1 teaches "the strip is there on
 * every screen, in every app, and it never goes away" and "slide up to come
 * out", and both sentences were false the moment the learner reached Unit 2.
 *
 * ## Where it is rendered from
 *
 * `SimulatorFrame`, so the lesson's instruction banner stays **above** the phone
 * rather than inside it. That is the one ordering that reads correctly: the
 * banner is the course talking, the phone is the thing being talked about.
 * Simulators that render `FakeDesktop` themselves pass `phoneChrome={false}` —
 * they already have all of this and would otherwise draw two of everything.
 *
 * The Wi-Fi, battery and clock buttons open the *same* panels the desktop opens,
 * imported rather than reimplemented, so the panel a learner meets in Unit 1 is
 * the panel they meet inside Mail.
 */

/** The networks the practice computer can see. Same list the desktop shows. */
const WIFI_NETWORKS = [{ name: "CoolKids Network" }, { name: "Neighbor's WiFi" }, { name: "Coffee shop" }, { name: "Backup" }];

interface BatteryManagerLike {
  level: number;
  addEventListener: (type: "levelchange", listener: () => void) => void;
  removeEventListener: (type: "levelchange", listener: () => void) => void;
}

export default function PhoneShell({
  title,
  onHome,
  children,
}: {
  /** Shown at the left of the status strip — the app the learner is in. */
  title: string;
  /**
   * Where the bar at the bottom goes. Absent when there is nowhere to go — and
   * then the bar is drawn as a plain rule rather than as a control, because a
   * home bar that does nothing is worse than no home bar at all.
   */
  onHome?: () => void;
  children: ReactNode;
}) {
  const theme = useSimTheme();
  const isDark = theme.dark;
  const [time, setTime] = useState("1:35 pm");
  const [batteryPercent, setBatteryPercent] = useState<number | null>(null);
  const [openPanel, setOpenPanel] = useState<StatusPanelId | null>(null);
  const [closingPanel, setClosingPanel] = useState<StatusPanelId | null>(null);
  const [connected, setConnected] = useState<string | null>("CoolKids Network");

  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase());
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

  function dismissPanel() {
    const current = openPanel;
    if (!current) return;
    setClosingPanel(current);
    setTimeout(() => {
      setOpenPanel(null);
      setClosingPanel(null);
    }, 160);
  }

  const homeBar = useSwipe(
    ({ dir }) => {
      if (dir === "up") onHome?.();
    },
    { axis: "y", threshold: 24 },
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="relative shrink-0">
        <DesktopMenuBar
          dark={isDark}
          compact
          leading={
            onHome ? (
              <button
                type="button"
                data-phone-back
                aria-label="Back to the home screen"
                onClick={onHome}
                className="-ml-1 rounded p-1 hover:bg-black/10 sim-dark:hover:bg-white/15"
              >
                <ArrowLeftIcon size={18} />
              </button>
            ) : undefined
          }
          title={title}
          time={time}
          batteryPercent={batteryPercent}
          openPanel={openPanel}
          onTogglePanel={(panel) => (openPanel === panel ? dismissPanel() : setOpenPanel(panel))}
        />

        {(openPanel === "wifi" || closingPanel === "wifi") && (
          <StatusPanel
            color="#2451e0"
            tint="#cfe3fb"
            darkTint="#1e3a8a"
            onClose={dismissPanel}
            title="WiFi Networks"
            closing={closingPanel === "wifi"}
          >
            {WIFI_NETWORKS.map((n) => (
              <button
                key={n.name}
                onClick={() => setConnected(n.name)}
                className={`w-full border-b border-blue-200 px-3 py-2 text-left font-bold last:border-b-0 sim-dark:border-gray-700 ${
                  n.name === connected
                    ? "cursor-default bg-green-400 text-gray-900"
                    : "bg-white hover:bg-blue-50 sim-dark:bg-gray-800 sim-dark:hover:bg-gray-700"
                }`}
              >
                {n.name === connected ? `${n.name} ✓` : n.name}
              </button>
            ))}
          </StatusPanel>
        )}
        {(openPanel === "battery" || closingPanel === "battery") && (
          <StatusPanel
            color="#0f9b6c"
            tint="#c3f3dd"
            darkTint="#12603f"
            onClose={dismissPanel}
            title="Your Battery"
            closing={closingPanel === "battery"}
          >
            <p className="border-2 border-green-400 p-3 text-center sim-dark:border-green-700">
              {batteryPercent !== null
                ? `You have ${batteryPercent}% battery left.`
                : "Your browser won't share the real battery level, but you can check it in your phone's own status bar."}
            </p>
          </StatusPanel>
        )}
        {(openPanel === "calendar" || closingPanel === "calendar") && (
          <CalendarPanel onClose={dismissPanel} closing={closingPanel === "calendar"} />
        )}
      </div>

      <div className="relative min-h-0 flex-1" onClick={() => (openPanel ? dismissPanel() : undefined)}>
        {children}
      </div>

      {onHome ? (
        /**
         * Swipe only, and deliberately not focusable.
         *
         * It used to be a `tabIndex={0}` button that went home on Enter, which
         * quietly ate an Enter meant for the text field above it — a learner
         * naming a new folder pressed Enter and was thrown back to the home
         * screen. The keyboard route home is the back arrow in the strip above,
         * which is a real button and always has been.
         */
        <div
          {...homeBar.props}
          data-phone-homebar
          aria-hidden="true"
          className={`flex shrink-0 touch-none select-none items-center justify-center py-1.5 ${
            isDark ? "bg-gray-800" : "bg-white"
          }`}
        >
          <span className={`h-1.5 w-28 rounded-full ${isDark ? "bg-white/70" : "bg-gray-500"}`} />
        </div>
      ) : (
        <div className={`h-1.5 shrink-0 ${isDark ? "bg-gray-800" : "bg-white"}`} />
      )}
    </div>
  );
}

/** Re-exported so callers do not have to reach into `Icons` for the strip's glyph. */
export { WifiIcon };
