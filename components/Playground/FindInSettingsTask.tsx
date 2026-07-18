"use client";

import { useState } from "react";

interface FindInSettingsTaskProps {
  instructions: string;
  targetPanel: string;
  toggleLabel: string;
  targetValue: boolean;
  onResult: (success: boolean) => void;
}

interface SettingItem {
  label: string;
  value: boolean;
}

interface Panel {
  name: string;
  icon: string;
  items: SettingItem[];
}

const ALL_PANELS: Panel[] = [
  {
    name: "Appearance",
    icon: "🎨",
    items: [
      { label: "Dark Mode", value: false },
      { label: "Night Shift", value: false },
      { label: "Auto-Adjust Brightness", value: true },
    ],
  },
  {
    name: "Accessibility",
    icon: "♿",
    items: [
      { label: "Zoom", value: false },
      { label: "VoiceOver", value: false },
      { label: "Larger Text", value: false },
      { label: "Pointer Size", value: false },
    ],
  },
  {
    name: "Notifications",
    icon: "🔔",
    items: [
      { label: "Do Not Disturb", value: false },
      { label: "Mail Notifications", value: true },
      { label: "App Store Notifications", value: true },
    ],
  },
  {
    name: "Trackpad",
    icon: "🖱️",
    items: [
      { label: "Tap to Click", value: false },
      { label: "Three-Finger Drag", value: false },
      { label: "Natural Scrolling", value: true },
    ],
  },
  {
    name: "Battery",
    icon: "🔋",
    items: [
      { label: "Low Power Mode", value: false },
      { label: "Show Battery Percentage", value: true },
      { label: "Optimized Charging", value: true },
    ],
  },
  {
    name: "Privacy & Security",
    icon: "🔒",
    items: [
      { label: "Location Services", value: true },
      { label: "Camera Access", value: true },
      { label: "Microphone Access", value: true },
    ],
  },
  {
    name: "Software Update",
    icon: "⬆️",
    items: [
      { label: "Automatic Updates", value: false },
      { label: "Download Updates Automatically", value: false },
    ],
  },
];

export default function FindInSettingsTask({
  instructions,
  targetPanel,
  toggleLabel,
  targetValue,
  onResult,
}: FindInSettingsTaskProps) {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    ALL_PANELS.forEach((p) =>
      p.items.forEach((i) => {
        init[`${p.name}:${i.label}`] = i.value;
      })
    );
    return init;
  });
  const [solved, setSolved] = useState(false);

  const currentPanel = ALL_PANELS.find((p) => p.name === activePanel);

  function handleToggle(panelName: string, label: string) {
    const key = `${panelName}:${label}`;
    const newValue = !toggles[key];
    setToggles((prev) => ({ ...prev, [key]: newValue }));
    const isTarget = panelName === targetPanel && label === toggleLabel;
    if (isTarget && newValue === targetValue && !solved) {
      setSolved(true);
      setTimeout(() => onResult(true), 700);
    }
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Top bar */}
      <div className="bg-gray-100 border-b-2 border-gray-300 px-5 py-3 shrink-0">
        <p className="text-lg font-bold text-gray-800">{instructions}</p>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-56 border-r-2 border-gray-200 bg-[#F2F2F7] flex flex-col py-3 gap-1 overflow-auto shrink-0">
          <p className="text-xs font-bold uppercase text-gray-400 px-4 mb-1 tracking-widest">
            System Settings
          </p>
          {ALL_PANELS.map((panel) => (
            <button
              key={panel.name}
              onClick={() => setActivePanel(panel.name)}
              className={`flex items-center gap-3 px-4 py-2.5 text-left text-lg font-medium transition-all ${
                activePanel === panel.name
                  ? "bg-blue-500 text-white"
                  : "hover:bg-gray-200 text-gray-800"
              } ${panel.name === targetPanel ? "font-bold" : ""}`}
            >
              <span className="text-xl w-7 text-center">{panel.icon}</span>
              <span>{panel.name}</span>
            </button>
          ))}
        </div>

        {/* Right panel */}
        <div className="flex-1 p-8 overflow-auto">
          {!currentPanel ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-2xl text-gray-400 text-center">
                ← Click a category on the left to open it
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <h2 className="text-4xl font-black">{currentPanel.name}</h2>
              {currentPanel.items.map((item) => {
                const key = `${currentPanel.name}:${item.label}`;
                const isOn = toggles[key];
                const isTarget =
                  currentPanel.name === targetPanel && item.label === toggleLabel;

                return (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between p-5 rounded-2xl border-4 ${
                      isTarget
                        ? "border-yellow-400 bg-yellow-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div>
                      <p className="text-2xl font-bold">{item.label}</p>
                      {isTarget && (
                        <p className="text-sm text-yellow-700 font-semibold mt-1">
                          ← This is the one to change
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggle(currentPanel.name, item.label)}
                      aria-label={`Toggle ${item.label}`}
                      className={`relative w-16 h-9 rounded-full border-4 border-black transition-all shrink-0 ${
                        isOn ? "bg-green-400" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-6 h-6 rounded-full bg-white border-2 border-black transition-all ${
                          isOn ? "left-8" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
