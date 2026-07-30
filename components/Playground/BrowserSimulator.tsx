"use client";

import { ReactNode, useState } from "react";
import WindowControls from "./WindowControls";
import { GlobeIcon, LockIcon, ReloadIcon, StarIcon, BookIcon, ClockIcon, DownloadIcon } from "./Icons";

interface ExtraTab {
  title: string;
  active?: boolean;
  onClick: () => void;
}

interface BrowserSimulatorProps {
  /** Text shown inside the tab. */
  tabTitle?: string;
  /** Text shown in the address bar. */
  url?: string;
  /** Called when the learner clicks the red X (and by default the tab's ✕ too). */
  onExit: () => void;
  /** When set, shows the orange minimize box next to the red X. */
  onMinimize?: () => void;
  /** Optional separate handler for the tab's dark ✕; falls back to onExit. */
  onTabClose?: () => void;
  /** Whether the main tab is the active one. When extraTabs are present and one is active, set false. */
  tabActive?: boolean;
  /** Called when the main tab is clicked (to switch back to it from an extra tab). */
  onTabClick?: () => void;
  /** Set false when the browser runs inside the fake desktop (no gray laptop bezel). */
  bezel?: boolean;
  /** False when opened from the fake desktop's dock — its shared menu bar hosts close/minimize instead. */
  showControls?: boolean;
  /** Additional tabs shown in the tab row (used by the right-click task). */
  extraTabs?: ExtraTab[];
  /** When set, adds a 3-dot menu in the toolbar with Zoom In / Zoom Out. */
  onZoomIn?: () => void;
  /** When set, adds a 3-dot menu in the toolbar with Zoom In / Zoom Out. */
  onZoomOut?: () => void;
  /** Percentage shown between the zoom buttons. */
  zoomLabel?: string;
  /** The simulated web page. */
  children?: ReactNode;
}

/**
 * The browser chrome for Unit 1's three single-purpose browser lessons.
 *
 * It deliberately matches `GuidedBrowserTask` pixel for pixel — same tab strip,
 * same toolbar, same address bar, same action bar — because the learner is meant
 * to meet one browser and keep using it. Only the plumbing differs: this one
 * takes a fixed URL and a page as children, where Unit 4's owns fifteen sites.
 */
export default function BrowserSimulator({
  tabTitle,
  url,
  onExit,
  onMinimize,
  onTabClose,
  bezel = true,
  showControls = true,
  tabActive = true,
  onTabClick,
  extraTabs,
  onZoomIn,
  onZoomOut,
  zoomLabel,
  children,
}: BrowserSimulatorProps) {
  const [showLockInfo, setShowLockInfo] = useState(false);
  const hasZoom = !!(onZoomIn || onZoomOut);
  return (
    <div className={`h-full w-full ${bezel ? "bg-gray-200 sim-dark:bg-gray-900 p-3 sm:p-5" : ""}`} onClick={() => setShowLockInfo(false)}>
      <div
        /**
         * No `sim-dark:` on this white — deliberately. Everything above the page
         * slot is browser chrome and follows the practice computer's Dark Mode;
         * the page area does not, because a real browser in dark mode does not
         * repaint the websites you visit. This white is the paper a page that
         * paints no background of its own sits on.
         */
        className={`relative h-full w-full bg-white overflow-hidden flex flex-col ${bezel ? "rounded-lg shadow" : ""}`}
      >
        {/* Tab strip */}
        <div className="shrink-0 flex items-stretch gap-1 px-2 pt-2 bg-gray-200 sim-dark:bg-gray-900 border-b-2 border-gray-300 sim-dark:border-gray-700">
          <div className="flex items-stretch gap-1">
            <div
              role={onTabClick ? "button" : undefined}
              onClick={!tabActive && onTabClick ? onTabClick : undefined}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-2 border-b-0 max-w-44 min-w-36 ${
                tabActive ? "bg-white border-black sim-dark:bg-gray-800 sim-dark:border-gray-400" : "bg-gray-100 sim-dark:bg-gray-900 border-gray-400 sim-dark:border-gray-600 cursor-pointer"
              }`}
            >
              <GlobeIcon size={14} className="shrink-0 text-gray-600 sim-dark:text-gray-300" />
              <span className="text-sm font-semibold truncate flex-1">{tabTitle}</span>
              <button
                onClick={onTabClose ?? onExit}
                aria-label="Close tab"
                className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-gray-600 sim-dark:text-gray-300 hover:bg-gray-300 sim-dark:hover:bg-gray-700"
              >
                <span className="text-xs font-bold">&times;</span>
              </button>
            </div>
            {extraTabs?.map((tab, i) => (
              <button
                key={i}
                onClick={tab.onClick}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-2 border-b-0 max-w-44 animate-slide-down ${
                  tab.active ? "bg-white border-black sim-dark:bg-gray-800 sim-dark:border-gray-400" : "bg-gray-100 sim-dark:bg-gray-900 border-gray-400 sim-dark:border-gray-600"
                }`}
              >
                <GlobeIcon size={14} className="shrink-0 text-gray-600 sim-dark:text-gray-300" />
                <span className="text-sm font-semibold truncate">{tab.title}</span>
              </button>
            ))}
          </div>
          <div className="flex-1" />
          {showControls && (
            <div className="flex items-center pb-1">
              <WindowControls onMinimize={onMinimize} onClose={onExit} showMaximize={false} />
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="shrink-0 bg-gray-100 sim-dark:bg-gray-800 border-b-2 border-black sim-dark:border-gray-600 flex items-center gap-2 px-3 py-2">
          <span aria-hidden className="text-xl px-1 text-gray-300 sim-dark:text-gray-600">‹</span>
          <span aria-hidden className="text-xl px-1 text-gray-300 sim-dark:text-gray-600">›</span>
          <span aria-hidden className="px-1 text-gray-500 sim-dark:text-gray-400"><ReloadIcon size={18} /></span>
          <div className="flex-1 flex items-center gap-2 bg-white sim-dark:bg-gray-900 border-2 border-gray-400 sim-dark:border-gray-600 rounded-lg px-3 py-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); setShowLockInfo((s) => !s); }}
              aria-label="Site security"
              className="shrink-0 relative"
            >
              <LockIcon size={16} />
            </button>
            <span className="flex-1 text-base truncate">{url}</span>
          </div>
          <span aria-hidden className="px-1 text-gray-500 sim-dark:text-gray-400"><StarIcon size={18} /></span>
        </div>
        {showLockInfo && (
          <div
            className="absolute left-6 top-28 z-30 w-64 border-2 border-black sim-dark:border-gray-500 bg-white sim-dark:bg-gray-800 shadow-lg p-3 animate-slide-down"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold">This site is secure</p>
            <p className="text-xs text-gray-600 sim-dark:text-gray-300 mt-1">
              The lock means your connection to this page is private. Look for it before typing anything personal into a website.
            </p>
          </div>
        )}

        {/* Action bar — the same row Unit 4 uses, with only the zoom control live here. */}
        <div className="shrink-0 bg-gray-50 sim-dark:bg-gray-800 border-b-2 border-gray-300 sim-dark:border-gray-700 flex items-center flex-wrap gap-1.5 px-3 py-1.5 text-sm">
          <DeadActionBtn label="Reading List" icon={<BookIcon size={14} />} />
          <DeadActionBtn label="History" icon={<ClockIcon size={14} />} />
          <DeadActionBtn label="Downloads" icon={<DownloadIcon size={14} />} />
          <div className="flex-1" />
          {hasZoom && (
            <div className="flex items-center border-2 border-gray-400 sim-dark:border-gray-600 rounded-lg overflow-hidden">
              <button onClick={onZoomOut} aria-label="Zoom out" className="px-2 text-gray-600 sim-dark:text-gray-300 hover:bg-gray-200 sim-dark:hover:bg-gray-700">−</button>
              <span className="px-2 border-x-2 border-gray-300 sim-dark:border-gray-600 font-semibold tabular-nums">{zoomLabel ?? "100%"}</span>
              <button onClick={onZoomIn} aria-label="Zoom in" className="px-2 font-bold hover:bg-gray-200 sim-dark:hover:bg-gray-700">+</button>
            </div>
          )}
        </div>

        {/* Page content */}
        <div data-sim-paper className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

export function RedX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M6 6 L34 34 M34 6 L6 34" stroke="#e02020" strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}

export function OrangeDash({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 20" className={className} aria-hidden="true">
      <rect x="2" y="4" width="36" height="12" rx="3" fill="#f2a93b" stroke="#c9882a" strokeWidth="1.5" />
    </svg>
  );
}







/** A control that exists in the real browser but does nothing in these focused lessons. */
function DeadActionBtn({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 px-2 py-1 rounded-md border-2 border-gray-300 sim-dark:border-gray-700 bg-white sim-dark:bg-gray-800 font-medium text-gray-500 sim-dark:text-gray-400 select-none">
      {icon} {label}
    </span>
  );
}
