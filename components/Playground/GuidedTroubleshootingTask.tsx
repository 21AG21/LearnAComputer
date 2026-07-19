"use client";

import { useState } from "react";

export type GuidedTroubleshootingStep = {
  say: string;
  action:
    | "read-error" | "open-task-manager" | "force-quit" | "restart-app"
    | "open-wifi-settings" | "toggle-wifi" | "reconnect-wifi" | "forget-network"
    | "restart-computer" | "check-storage" | "clear-storage" | "update-system"
    | "search-help" | "check-cable" | "change-input";
  target?: string;
  value?: string;
};

interface GuidedTroubleshootingTaskProps {
  goal: string;
  scenario: string;
  steps: GuidedTroubleshootingStep[];
  onResult: (success: boolean) => void;
}

interface RunningApp {
  name: string;
  icon: string;
  frozen: boolean;
}

const INITIAL_APPS: RunningApp[] = [
  { name: "Browser", icon: "🌐", frozen: false },
  { name: "Mail", icon: "📧", frozen: false },
  { name: "Files", icon: "📁", frozen: false },
  { name: "Video Editor", icon: "🎬", frozen: false },
  { name: "Music Player", icon: "🎵", frozen: false },
];

const NETWORKS = ["Home WiFi", "Neighbor's WiFi", "CoffeeShop_5G"];

export default function GuidedTroubleshootingTask({ goal, scenario, steps, onResult }: GuidedTroubleshootingTaskProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);

  // Desktop state — initialise based on scenario keywords
  const [errorVisible, setErrorVisible] = useState(true);
  const [taskManagerOpen, setTaskManagerOpen] = useState(false);
  const [wifiSettingsOpen, setWifiSettingsOpen] = useState(false);
  const [systemPanelOpen, setSystemPanelOpen] = useState(false);
  const [wifiOn, setWifiOn] = useState(true);
  const [wifiConnected, setWifiConnected] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [restarted, setRestarted] = useState(false);
  const [apps, setApps] = useState<RunningApp[]>(() => {
    if (scenario.toLowerCase().includes("frozen")) {
      return INITIAL_APPS.map((a) => a.name === "Browser" ? { ...a, frozen: true } : a);
    }
    if (scenario.toLowerCase().includes("video")) {
      return INITIAL_APPS.map((a) => a.name === "Video Editor" ? { ...a, frozen: true } : a);
    }
    return INITIAL_APPS;
  });
  const [storagePercent] = useState(() => scenario.toLowerCase().includes("storage") ? 95 : 65);
  const [storageCleared, setStorageCleared] = useState(false);
  const [updateInstalled, setUpdateInstalled] = useState(false);
  const [cableChecked, setCableChecked] = useState<string[]>([]);
  const [inputChanged, setInputChanged] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDone, setSearchDone] = useState(false);
  const [forgottenNetworks, setForgottenNetworks] = useState<string[]>([]);

  const step = steps[stepIndex];
  const finished = stepIndex >= steps.length;

  function completeStep() {
    setFlash(true);
    setTimeout(() => setFlash(false), 850);
    if (stepIndex + 1 >= steps.length) {
      setDone(true);
      setTimeout(() => onResult(true), 1500);
    }
    setStepIndex((i) => i + 1);
  }

  function hl(kind: string, name?: string): boolean {
    if (finished || !step) return false;
    switch (step.action) {
      case "read-error": return kind === "error-dismiss";
      case "open-task-manager": return kind === "task-mgr-btn";
      case "force-quit": return kind === "force-quit-btn" && name === step.target;
      case "restart-app": return kind === "restart-app-btn" && name === step.target;
      case "open-wifi-settings": return kind === "wifi-settings-btn";
      case "toggle-wifi": return kind === "wifi-toggle";
      case "reconnect-wifi": return kind === "reconnect-btn";
      case "forget-network": return kind === "forget-btn" && name === step.target;
      case "restart-computer": return kind === "restart-btn";
      case "check-storage": return kind === "storage-btn";
      case "clear-storage": return kind === "clear-btn";
      case "update-system": return kind === "update-btn";
      case "search-help": return kind === "search-bar";
      case "check-cable": return kind === "cable-btn" && name === step.target;
      case "change-input": return kind === "input-btn" && name === step.target;
      default: return false;
    }
  }

  const pulse = "ring-4 ring-yellow-400 animate-pulse";

  function handleReadError() {
    setErrorVisible(false);
    if (step?.action === "read-error") completeStep();
  }

  function handleOpenTaskManager() {
    setTaskManagerOpen(true);
    setWifiSettingsOpen(false);
    setSystemPanelOpen(false);
    if (step?.action === "open-task-manager") completeStep();
  }

  function handleForceQuit(appName: string) {
    setApps((prev) => prev.filter((a) => a.name !== appName));
    if (step?.action === "force-quit" && step.target === appName) completeStep();
  }

  function handleRestartApp(appName: string) {
    setApps((prev) => [...prev, { name: appName, icon: INITIAL_APPS.find((a) => a.name === appName)?.icon ?? "📱", frozen: false }]);
    if (step?.action === "restart-app" && step.target === appName) completeStep();
  }

  function handleOpenWifi() {
    setWifiSettingsOpen(true);
    setTaskManagerOpen(false);
    setSystemPanelOpen(false);
    if (step?.action === "open-wifi-settings") completeStep();
  }

  function handleToggleWifi() {
    setWifiOn((v) => !v);
    setWifiConnected(false);
    if (step?.action === "toggle-wifi") completeStep();
  }

  function handleReconnect() {
    setWifiConnected(true);
    if (step?.action === "reconnect-wifi") completeStep();
  }

  function handleForgetNetwork(name: string) {
    setForgottenNetworks((prev) => [...prev, name]);
    setWifiConnected(false);
    if (step?.action === "forget-network" && step.target === name) completeStep();
  }

  function handleRestart() {
    setRestarting(true);
    setTimeout(() => {
      setRestarting(false);
      setRestarted(true);
      setApps(INITIAL_APPS.map((a) => ({ ...a, frozen: false })));
      setTaskManagerOpen(false);
      setWifiSettingsOpen(false);
      setSystemPanelOpen(false);
      setErrorVisible(false);
      if (step?.action === "restart-computer") completeStep();
    }, 1200);
  }

  function handleCheckStorage() {
    setSystemPanelOpen(true);
    setTaskManagerOpen(false);
    setWifiSettingsOpen(false);
    if (step?.action === "check-storage") completeStep();
  }

  function handleClearStorage() {
    setStorageCleared(true);
    if (step?.action === "clear-storage") completeStep();
  }

  function handleUpdateSystem() {
    setUpdateInstalled(true);
    if (step?.action === "update-system") completeStep();
  }

  function handleSearchSubmit() {
    setSearchDone(true);
    if (step?.action === "search-help") completeStep();
  }

  function handleCheckCable(device: string) {
    setCableChecked((prev) => [...prev, device]);
    if (step?.action === "check-cable" && step.target === device) completeStep();
  }

  function handleChangeInput(source: string) {
    setInputChanged(source);
    if (step?.action === "change-input" && step.target === source) completeStep();
  }

  const frozenApps = apps.filter((a) => a.frozen);
  const runningApps = apps.filter((a) => !a.frozen);

  if (restarting) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="text-5xl mb-4 animate-spin">⟳</div>
        <p className="text-lg font-medium">Restarting...</p>
        <p className="text-sm text-gray-400 mt-1">Please wait</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white relative">
      {!finished && step && (
        <div className="bg-gray-900 text-white px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs text-gray-400">Step {stepIndex + 1} of {steps.length}</span>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${(stepIndex / steps.length) * 100}%` }} />
            </div>
          </div>
          <p className="text-sm text-gray-200">{step.say}</p>
        </div>
      )}

      {done && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/95">
          <p className="text-5xl mb-3">✅</p>
          <p className="text-xl font-bold text-green-700 text-center px-4">DONE — {goal}</p>
        </div>
      )}

      {/* Error popup overlay */}
      {errorVisible && (
        <div className="absolute inset-0 z-30 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-xs">
            <p className="text-3xl text-center mb-3">⚠️</p>
            <h3 className="font-bold text-base text-center mb-2">Problem Detected</h3>
            <p className="text-sm text-gray-600 text-center mb-4">{scenario}</p>
            <button
              onClick={handleReadError}
              className={`w-full py-2.5 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-all ${hl("error-dismiss") ? pulse : ""}`}
            >
              OK, I&apos;ll Fix It
            </button>
          </div>
        </div>
      )}

      {/* Desktop area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Scenario bar */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-3 py-2 flex-shrink-0">
          <p className="text-xs text-yellow-800 font-medium">🔧 Problem: {scenario}</p>
          {restarted && <p className="text-xs text-green-700 mt-0.5">✓ Computer restarted successfully</p>}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-gray-50 flex-shrink-0 flex-wrap">
          <button onClick={handleOpenTaskManager} className={`px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-all ${hl("task-mgr-btn") ? pulse : ""}`}>📊 Task Manager</button>
          <button onClick={handleOpenWifi} className={`px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-all ${hl("wifi-settings-btn") ? pulse : ""}`}>
            {wifiOn && wifiConnected ? "📶" : "📵"} WiFi Settings
          </button>
          <button onClick={handleCheckStorage} className={`px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-all ${hl("storage-btn") ? pulse : ""}`}>💾 Storage</button>
          <button onClick={handleRestart} className={`px-3 py-1.5 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg transition-all ${hl("restart-btn") ? pulse : ""}`}>🔄 Restart</button>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Task Manager panel */}
          {taskManagerOpen && (
            <div className="border rounded-xl overflow-hidden mb-3">
              <div className="bg-gray-800 text-white px-3 py-2 flex items-center justify-between">
                <span className="text-sm font-medium">📊 Task Manager</span>
                <button onClick={() => setTaskManagerOpen(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              {frozenApps.length > 0 && (
                <div className="bg-red-50 border-b border-red-200 px-3 py-2">
                  <p className="text-xs font-semibold text-red-700 mb-1">Not Responding:</p>
                  {frozenApps.map((app) => (
                    <div key={app.name} className="flex items-center justify-between py-1.5">
                      <span className="text-sm">{app.icon} {app.name} <span className="text-xs text-red-500">(frozen)</span></span>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleForceQuit(app.name)} className={`px-2 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 ${hl("force-quit-btn", app.name) ? pulse : ""}`}>Force Quit</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="divide-y">
                {runningApps.map((app) => (
                  <div key={app.name} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm">{app.icon} {app.name}</span>
                    <div className="flex gap-1.5">
                      {!apps.find((a) => a.name === app.name && !a.frozen) && (
                        <button onClick={() => handleRestartApp(app.name)} className={`px-2 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 ${hl("restart-app-btn", app.name) ? pulse : ""}`}>Reopen</button>
                      )}
                      <button onClick={() => handleForceQuit(app.name)} className={`px-2 py-1 text-xs bg-red-100 text-red-600 rounded-lg hover:bg-red-200 ${hl("force-quit-btn", app.name) ? pulse : ""}`}>Force Quit</button>
                    </div>
                  </div>
                ))}
                {/* Show restart buttons for quit apps */}
                {INITIAL_APPS.filter((a) => !apps.find((r) => r.name === a.name)).map((app) => (
                  <div key={app.name} className="flex items-center justify-between px-3 py-2 bg-gray-50">
                    <span className="text-sm text-gray-400">{app.icon} {app.name} (closed)</span>
                    <button onClick={() => handleRestartApp(app.name)} className={`px-2 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 ${hl("restart-app-btn", app.name) ? pulse : ""}`}>Reopen</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WiFi Settings panel */}
          {wifiSettingsOpen && (
            <div className="border rounded-xl overflow-hidden mb-3">
              <div className="bg-gray-800 text-white px-3 py-2 flex items-center justify-between">
                <span className="text-sm font-medium">📶 WiFi Settings</span>
                <button onClick={() => setWifiSettingsOpen(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">WiFi</span>
                  <button
                    onClick={handleToggleWifi}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${wifiOn ? "bg-blue-500" : "bg-gray-300"} ${hl("wifi-toggle") ? pulse : ""}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${wifiOn ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                {wifiOn && (
                  <div className="flex flex-col gap-2">
                    {NETWORKS.filter((n) => !forgottenNetworks.includes(n)).map((network) => (
                      <div key={network} className={`flex items-center justify-between p-2.5 border rounded-lg ${network === "Home WiFi" && wifiConnected ? "border-blue-300 bg-blue-50" : ""}`}>
                        <span className="text-sm">{wifiConnected && network === "Home WiFi" ? "✓ " : ""}{network}</span>
                        <div className="flex gap-1.5">
                          {!wifiConnected && network === "Home WiFi" && (
                            <button onClick={handleReconnect} className={`px-2 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 ${hl("reconnect-btn") ? pulse : ""}`}>Connect</button>
                          )}
                          <button onClick={() => handleForgetNetwork(network)} className={`px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 ${hl("forget-btn", network) ? pulse : ""}`}>Forget</button>
                        </div>
                      </div>
                    ))}
                    {forgottenNetworks.includes("Home WiFi") && (
                      <button onClick={handleReconnect} className={`w-full py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 ${hl("reconnect-btn") ? pulse : ""}`}>Reconnect to Home WiFi</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* System / Storage panel */}
          {systemPanelOpen && (
            <div className="border rounded-xl overflow-hidden mb-3">
              <div className="bg-gray-800 text-white px-3 py-2 flex items-center justify-between">
                <span className="text-sm font-medium">💾 System Storage</span>
                <button onClick={() => setSystemPanelOpen(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <div className="p-3">
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Storage used</span>
                    <span>{storageCleared ? Math.max(30, storagePercent - 40) : storagePercent}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${storagePercent >= 90 && !storageCleared ? "bg-red-500" : "bg-blue-500"}`}
                      style={{ width: `${storageCleared ? Math.max(30, storagePercent - 40) : storagePercent}%` }}
                    />
                  </div>
                  {storageCleared && <p className="text-xs text-green-600 mt-1">✓ Storage cleared — freed 40%</p>}
                </div>
                <button onClick={handleClearStorage} className={`w-full py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 mb-2 ${hl("clear-btn") ? pulse : ""}`}>🧹 Clear Storage</button>
                {updateInstalled ? (
                  <p className="text-xs text-green-600 text-center">✓ System is up to date</p>
                ) : (
                  <button onClick={handleUpdateSystem} className={`w-full py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 ${hl("update-btn") ? pulse : ""}`}>⬆️ Check for Updates</button>
                )}
              </div>
            </div>
          )}

          {/* Cable check results */}
          {cableChecked.length > 0 && (
            <div className="border rounded-xl p-3 mb-3 bg-green-50 border-green-200">
              {cableChecked.map((device) => (
                <p key={device} className="text-xs text-green-700">✓ {device} cable checked and reseated</p>
              ))}
              {inputChanged && <p className="text-xs text-green-700">✓ Display input changed to {inputChanged}</p>}
            </div>
          )}

          {/* Cable/input buttons */}
          {steps.some((s) => s.action === "check-cable") && (
            <div className="flex flex-wrap gap-2 mb-3">
              {steps.filter((s) => s.action === "check-cable" && s.target).map((s) => (
                <button
                  key={s.target}
                  onClick={() => handleCheckCable(s.target!)}
                  className={`px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 ${hl("cable-btn", s.target) ? pulse : ""}`}
                >
                  🔌 Check {s.target} Cable
                </button>
              ))}
              {steps.filter((s) => s.action === "change-input" && s.target).map((s) => (
                <button
                  key={s.target}
                  onClick={() => handleChangeInput(s.target!)}
                  className={`px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 ${hl("input-btn", s.target) ? pulse : ""}`}
                >
                  📺 Change to {s.target}
                </button>
              ))}
            </div>
          )}

          {/* Search help */}
          {steps.some((s) => s.action === "search-help") && (
            <div className="border rounded-xl p-3 mb-3">
              <p className="text-xs font-medium text-gray-600 mb-2">🔍 Search Online for Help</p>
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={step?.action === "search-help" ? (step.value ?? "Type your search...") : "Type your search..."}
                  className={`flex-1 px-3 py-2 text-sm border rounded-lg outline-none focus:border-blue-400 ${hl("search-bar") ? pulse : ""}`}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                />
                <button onClick={handleSearchSubmit} className="px-3 py-2 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600">Search</button>
              </div>
              {searchDone && (
                <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">🔎 Results found — many users have solved this issue!</p>
                </div>
              )}
            </div>
          )}

          {/* Desktop apps view */}
          {!taskManagerOpen && !wifiSettingsOpen && !systemPanelOpen && (
            <div className="grid grid-cols-4 gap-3">
              {apps.map((app) => (
                <div key={app.name} className={`flex flex-col items-center gap-1 p-2 rounded-xl ${app.frozen ? "opacity-50" : ""}`}>
                  <div className="text-3xl">{app.icon}</div>
                  <p className="text-xs text-center text-gray-600">{app.name}</p>
                  {app.frozen && <p className="text-xs text-red-500">frozen</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {flash && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <span className="text-green-400 text-5xl animate-ping-once">✓</span>
        </div>
      )}
    </div>
  );
}
