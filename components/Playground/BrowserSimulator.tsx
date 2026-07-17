"use client";

import { ReactNode, useState } from "react";

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
  /** The simulated web page. */
  children?: ReactNode;
}

/**
 * A reusable fake browser matching the course's designed template: a gray
 * laptop bezel, a boxed red X to leave the activity, one tab, and a toolbar
 * with back/forward/reload/lock and a search magnifier. Playgrounds supply
 * the page content as children.
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
  extraTabs,
  onZoomIn,
  onZoomOut,
  children,
}: BrowserSimulatorProps) {
  const [dotMenuOpen, setDotMenuOpen] = useState(false);
  const hasZoom = !!(onZoomIn || onZoomOut);
  return (
    <div className={`h-full w-full ${bezel ? "bg-gray-200 p-3 sm:p-5" : ""}`}>
      <div
        className={`h-full w-full bg-white overflow-hidden flex flex-col ${bezel ? "rounded-lg shadow" : ""}`}
      >
        {/* Tab row */}
        <div className="flex items-stretch gap-3 px-2 pt-2">
          {showControls && (
            <div className="flex shrink-0">
              <button
                onClick={onExit}
                aria-label="Exit activity"
                className="w-16 h-14 border-4 border-black bg-white flex items-center justify-center"
              >
                <RedX className="w-9 h-9" />
              </button>
              {onMinimize && (
                <button
                  onClick={onMinimize}
                  aria-label="Minimize"
                  className="w-16 h-14 border-4 border-l-0 border-black bg-white flex items-center justify-center"
                >
                  <OrangeDash className="w-9 h-5" />
                </button>
              )}
            </div>
          )}
          {/* Tab group — no gap so borders share */}
          <div className="flex items-stretch">
            <div className={`h-14 border-4 border-black flex items-center gap-3 px-4 min-w-40 ${tabActive ? "bg-white" : "bg-gray-100"}`}>
              <span className="text-xl font-semibold flex-1 font-[var(--font-app-title)]">{tabTitle}</span>
              <button
                onClick={onTabClose ?? onExit}
                aria-label="Close tab"
                className="shrink-0 flex items-center justify-center"
              >
                <DarkX className="w-6 h-6" />
              </button>
            </div>
            {extraTabs?.map((tab, i) => (
              <button
                key={i}
                onClick={tab.onClick}
                className={`h-14 border-4 border-l-0 border-black flex items-center px-4 min-w-36 ${
                  tab.active ? "bg-white" : "bg-gray-100"
                }`}
              >
                <span className="text-lg font-semibold font-[var(--font-app-title)]">{tab.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="mx-2 mt-2 border-4 border-black flex items-center gap-3 px-3 py-2">
          <BackArrow className="w-9 h-7 shrink-0" />
          <ForwardArrow className="w-9 h-7 shrink-0" />
          <ReloadIcon className="w-7 h-7 shrink-0" />
          <LockIcon className="w-6 h-8 shrink-0" />
          <span className="flex-1 text-center text-2xl">{url}</span>
          {hasZoom && (
            <div className="relative shrink-0">
              <button
                onClick={() => setDotMenuOpen((o) => !o)}
                aria-label="Browser menu"
                className="flex flex-col items-center justify-center gap-1 w-8 h-8"
              >
                {[0,1,2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-700 block" />)}
              </button>
              {dotMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 z-30 bg-white border-2 border-black shadow-lg min-w-36 animate-slide-down"
                  onClick={() => setDotMenuOpen(false)}
                >
                  <button
                    onClick={onZoomIn}
                    className="w-full text-left px-4 py-2 text-lg font-semibold hover:bg-gray-100 border-b border-gray-200"
                  >
                    + Zoom In
                  </button>
                  <button
                    onClick={onZoomOut}
                    className="w-full text-left px-4 py-2 text-lg font-semibold hover:bg-gray-100"
                  >
                    − Zoom Out
                  </button>
                </div>
              )}
            </div>
          )}
          <MagnifierIcon className="w-8 h-8 shrink-0" />
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-hidden">{children}</div>
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

function DarkX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M8 8 L32 32 M32 8 L8 32" stroke="#333" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function BackArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} aria-hidden="true">
      <path
        d="M20 4 L4 16 L20 28 L20 21 L44 21 L44 11 L20 11 Z"
        fill="#fff"
        stroke="#111"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ForwardArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} aria-hidden="true">
      <path
        d="M28 4 L44 16 L28 28 L28 21 L4 21 L4 11 L28 11 Z"
        fill="#fff"
        stroke="#111"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReloadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M33 20 A13 13 0 1 1 27 9" fill="none" stroke="#111" strokeWidth="5" strokeLinecap="round" />
      <path d="M22 2 L33 9 L24 16 Z" fill="#111" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 40" className={className} aria-hidden="true">
      <rect x="4" y="17" width="24" height="19" rx="2" fill="#fff" stroke="#111" strokeWidth="3" />
      <path d="M9 17 V11 A7 7 0 0 1 23 11 V17" fill="none" stroke="#111" strokeWidth="3" />
      <circle cx="16" cy="25" r="2.5" fill="#111" />
      <path d="M16 27 L16 31" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function MagnifierIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="17" cy="17" r="11" fill="none" stroke="#111" strokeWidth="4" />
      <path d="M25 25 L36 36" stroke="#111" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
