"use client";

import BrowserSimulator from "../BrowserSimulator";

interface BrowserAppProps {
  onClose: () => void;
  onMinimize: () => void;
  noWifi?: boolean;
}

export default function BrowserApp({ onClose, onMinimize, noWifi = false }: BrowserAppProps) {
  return (
    <BrowserSimulator onExit={onClose} onMinimize={onMinimize} bezel={false} showControls={false}>
      {noWifi ? (
        <div className="h-full flex flex-col items-center justify-center gap-2 bg-gray-50">
          <p className="text-4xl">📵</p>
          <p className="text-xl font-bold text-red-600">No WiFi</p>
          <p className="text-gray-500 text-sm">Connect to a network to browse.</p>
        </div>
      ) : (
        <div className="h-full bg-white" />
      )}
    </BrowserSimulator>
  );
}
