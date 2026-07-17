"use client";

import { ReactNode } from "react";
import { RedX, OrangeDash } from "../BrowserSimulator";

interface AppWindowProps {
  title: string;
  onClose: () => void;
  onMinimize: () => void;
  /** False when opened from the fake desktop's dock — its shared menu bar hosts close/minimize instead. */
  showHeader?: boolean;
  children: ReactNode;
}

/** Shared chrome for desktop apps: a boxed red X (close) + orange dash (minimize) and a big bold title. */
export default function AppWindow({ title, onClose, onMinimize, showHeader = true, children }: AppWindowProps) {
  return (
    <div className="h-full w-full bg-white flex flex-col">
      {showHeader && (
        <div className="flex items-center gap-4 px-2 pt-2 pb-1">
          <div className="flex shrink-0 border-4 border-black">
            <button
              onClick={onClose}
              aria-label={`Close ${title}`}
              className="w-14 h-12 bg-white flex items-center justify-center border-r-4 border-black"
            >
              <RedX className="w-8 h-8" />
            </button>
            <button
              onClick={onMinimize}
              aria-label={`Minimize ${title}`}
              className="w-14 h-12 bg-white flex items-center justify-center"
            >
              <OrangeDash className="w-8 h-4" />
            </button>
          </div>
          <h1 className="text-4xl font-bold font-[var(--font-app-title)]">{title}</h1>
        </div>
      )}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
