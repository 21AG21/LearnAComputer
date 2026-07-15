"use client";

import BrowserSimulator from "../BrowserSimulator";

interface BrowserAppProps {
  onClose: () => void;
  onMinimize: () => void;
}

export default function BrowserApp({ onClose, onMinimize }: BrowserAppProps) {
  return (
    <BrowserSimulator onExit={onClose} onMinimize={onMinimize} bezel={false}>
      <div className="h-full bg-white" />
    </BrowserSimulator>
  );
}
