"use client";

import { ReactNode } from "react";

interface FullscreenPlaygroundProps {
  children: ReactNode;
  onExit: () => void;
}

export default function FullscreenPlayground({ children, onExit }: FullscreenPlaygroundProps) {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <button
        onClick={onExit}
        aria-label="Exit activity"
        className="absolute top-2 left-2 z-10 w-9 h-9 border-2 border-red-600 rounded flex items-center justify-center text-red-600 font-bold bg-white"
      >
        ✕
      </button>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
