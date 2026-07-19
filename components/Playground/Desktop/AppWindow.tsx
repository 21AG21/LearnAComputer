"use client";

import { ReactNode } from "react";
import WindowControls from "../WindowControls";

interface AppWindowProps {
  title: string;
  /** Optional emoji shown before the title, e.g. "📁". */
  icon?: string;
  onClose: () => void;
  onMinimize: () => void;
  /** False when opened from the fake desktop's dock — its shared menu bar hosts close/minimize instead. */
  showHeader?: boolean;
  children: ReactNode;
}

/** Shared chrome for desktop apps: a neutral title bar with the app name and the
 *  generalized minimize/close controls on the right (matching every guided simulator). */
export default function AppWindow({ title, icon, onClose, onMinimize, showHeader = true, children }: AppWindowProps) {
  return (
    <div className="h-full w-full bg-white flex flex-col">
      {showHeader && (
        <div className="shrink-0 bg-gray-100 border-b-2 border-gray-800 px-3 py-2 flex items-center gap-2">
          <span className="text-xl font-bold text-gray-700 flex items-center gap-1.5 font-[var(--font-app-title)]">
            {icon && <span aria-hidden="true">{icon}</span>}
            {title}
          </span>
          <div className="flex-1" />
          <WindowControls onMinimize={onMinimize} onClose={onClose} showMaximize={false} />
        </div>
      )}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
