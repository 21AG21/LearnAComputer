"use client";

import { useState } from "react";
import SimulatorFrame from "./SimulatorFrame";

export type GuidedAppStoreStep = {
  say: string;
  action:
    | "search" | "select-app" | "install" | "allow-permission" | "deny-permission"
    | "go-to-installed" | "go-to-store" | "update-app" | "delete-app" | "open-app"
    | "go-to-category";
  target?: string;
  value?: string;
};

interface GuidedAppStoreTaskProps {
  goal: string;
  steps: GuidedAppStoreStep[];
  onResult: (success: boolean) => void;
}

interface App {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  permissions: string[];
  price: string;
  rating: number;
  hasUpdate?: boolean;
  preInstalled?: boolean;
}

const STORE_APPS: App[] = [
  { id: "notemaster", name: "NoteMaster", icon: "📝", category: "Productivity", description: "A simple, beautiful note-taking app. Sync across all your devices.", permissions: ["Storage"], price: "Free", rating: 4.8 },
  { id: "photofun", name: "PhotoFun", icon: "📷", category: "Social", description: "Share photos with friends and family. Filters, stickers, and more.", permissions: ["Camera", "Photos", "Location"], price: "$1.99", rating: 4.2 },
  { id: "puzzlequest", name: "Puzzle Quest", icon: "🎮", category: "Games", description: "A relaxing puzzle game with hundreds of levels. Great for all ages.", permissions: [], price: "Free", rating: 4.6 },
  { id: "weathernow", name: "WeatherNow", icon: "☁️", category: "Utilities", description: "Accurate hourly and 7-day weather forecasts for your location.", permissions: ["Location"], price: "Free", rating: 4.7, hasUpdate: true },
  { id: "chatbuddy", name: "ChatBuddy", icon: "💬", category: "Social", description: "Message your friends instantly. Voice and video calling included.", permissions: ["Contacts", "Camera", "Microphone"], price: "Free", rating: 4.5 },
  { id: "calculatorpro", name: "Calculator Pro", icon: "🧮", category: "Utilities", description: "Advanced scientific calculator with history and unit conversion.", permissions: [], price: "Free", rating: 4.9 },
];

const PRE_INSTALLED: App[] = [
  { id: "browser", name: "Browser", icon: "🌐", category: "Utilities", description: "Your built-in web browser.", permissions: [], price: "Built-in", rating: 5, preInstalled: true },
  { id: "files", name: "Files", icon: "📁", category: "Utilities", description: "Manage your files and folders.", permissions: [], price: "Built-in", rating: 5, preInstalled: true },
  { id: "mail", name: "Mail", icon: "📧", category: "Utilities", description: "Send and receive email.", permissions: [], price: "Built-in", rating: 5, preInstalled: true },
];

const CATEGORIES = ["All", "Productivity", "Social", "Games", "Utilities"];

export default function GuidedAppStoreTask({ goal, steps, onResult }: GuidedAppStoreTaskProps) {
  const [tab, setTab] = useState<"store" | "installed">("store");
  const [category, setCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [installedIds, setInstalledIds] = useState<string[]>([]);
  const [updatedIds, setUpdatedIds] = useState<string[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [installQueue, setInstallQueue] = useState<{ app: App; permIdx: number } | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);

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
      case "search": return kind === "search-bar";
      case "select-app": return kind === "app-card" && name === step.target;
      case "install": return kind === "install-btn";
      case "allow-permission": return kind === "perm-allow" && name === step.value;
      case "deny-permission": return kind === "perm-deny" && name === step.value;
      case "go-to-installed": return kind === "tab-installed";
      case "go-to-store": return kind === "tab-store";
      case "update-app": return kind === "update-btn" && name === step.target;
      case "delete-app": return kind === "delete-btn" && name === step.target;
      case "open-app": return kind === "open-btn" && name === step.target;
      case "go-to-category": return kind === "category-btn" && name === step.target;
      default: return false;
    }
  }

  const pulse = "ring-4 ring-yellow-400 animate-pulse";

  const installedApps = [
    ...PRE_INSTALLED,
    ...STORE_APPS.filter((a) => installedIds.includes(a.id) && !deletedIds.includes(a.id)),
  ];

  const storeApps = STORE_APPS.filter((a) => {
    if (searchQuery) return a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (category !== "All") return a.category === category;
    return true;
  });

  function handleSearch(val: string) {
    setSearchQuery(val);
    setCategory("All");
    setSelectedApp(null);
    if (step?.action === "search" && val.toLowerCase().includes((step.value ?? "").toLowerCase()) && val.length >= (step.value ?? "").length) {
      completeStep();
    }
  }

  function handleSelectApp(app: App) {
    setSelectedApp(app);
    if (step?.action === "select-app" && step.target === app.name) completeStep();
  }

  function handleInstall() {
    if (!selectedApp) return;
    if (selectedApp.permissions.length > 0) {
      setInstallQueue({ app: selectedApp, permIdx: 0 });
    } else {
      setInstalledIds((prev) => [...prev, selectedApp.id]);
      setSelectedApp(null);
    }
    if (step?.action === "install") completeStep();
  }

  function handleAllowPermission(perm: string) {
    if (!installQueue) return;
    const { app, permIdx } = installQueue;
    const nextIdx = permIdx + 1;
    if (nextIdx >= app.permissions.length) {
      setInstalledIds((prev) => [...prev, app.id]);
      setInstallQueue(null);
      setSelectedApp(null);
    } else {
      setInstallQueue({ app, permIdx: nextIdx });
    }
    if (step?.action === "allow-permission" && step.value === perm) completeStep();
  }

  function handleDenyPermission(perm: string) {
    if (!installQueue) return;
    const { app, permIdx } = installQueue;
    const nextIdx = permIdx + 1;
    if (nextIdx >= app.permissions.length) {
      setInstalledIds((prev) => [...prev, app.id]);
      setInstallQueue(null);
      setSelectedApp(null);
    } else {
      setInstallQueue({ app, permIdx: nextIdx });
    }
    if (step?.action === "deny-permission" && step.value === perm) completeStep();
  }

  function handleUpdate(appName: string) {
    const app = STORE_APPS.find((a) => a.name === appName);
    if (app) setUpdatedIds((prev) => [...prev, app.id]);
    if (step?.action === "update-app" && step.target === appName) completeStep();
  }

  function handleDelete(appName: string) {
    const app = STORE_APPS.find((a) => a.name === appName);
    if (app) setDeletedIds((prev) => [...prev, app.id]);
    if (step?.action === "delete-app" && step.target === appName) completeStep();
  }

  // Permission dialog overlay
  if (installQueue) {
    const perm = installQueue.app.permissions[installQueue.permIdx];
    return (
      <SimulatorFrame
        appName="App Store"
        appIcon="🛍️"
        instruction={step?.say}
        stepIndex={stepIndex}
        totalSteps={steps.length}
        done={done}
        goal={goal}
        flash={flash}
      >
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border-2 rounded-2xl shadow-xl p-6 w-full max-w-xs text-center">
            <p className="text-4xl mb-3">{installQueue.app.icon}</p>
            <h3 className="font-bold text-base mb-1">{installQueue.app.name} wants to access:</h3>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-2xl mb-1">{perm === "Camera" ? "📷" : perm === "Location" ? "📍" : perm === "Contacts" ? "👤" : perm === "Microphone" ? "🎤" : perm === "Photos" ? "🖼️" : "💾"}</p>
              <p className="font-semibold text-sm">{perm}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleDenyPermission(perm)}
                className={`flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200 ${hl("perm-deny", perm) ? pulse : ""}`}
              >
                Don&apos;t Allow
              </button>
              <button
                onClick={() => handleAllowPermission(perm)}
                className={`flex-1 py-2.5 rounded-xl bg-blue-500 text-white font-medium text-sm hover:bg-blue-600 ${hl("perm-allow", perm) ? pulse : ""}`}
              >
                Allow
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">{installQueue.permIdx + 1} of {installQueue.app.permissions.length} permissions</p>
          </div>
        </div>
      </SimulatorFrame>
    );
  }

  return (
    <SimulatorFrame
      appName="App Store"
      appIcon="🛍️"
      instruction={step?.say}
      stepIndex={stepIndex}
      totalSteps={steps.length}
      done={done}
      goal={goal}
      flash={flash}
    >
      {/* Tab bar */}
      <div className="flex border-b flex-shrink-0">
        <button
          onClick={() => { setTab("store"); setSelectedApp(null); if (step?.action === "go-to-store") completeStep(); }}
          className={`flex-1 py-2.5 text-sm font-medium transition-all ${tab === "store" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"} ${hl("tab-store") ? pulse : ""}`}
        >
          🏪 App Store
        </button>
        <button
          onClick={() => { setTab("installed"); setSelectedApp(null); if (step?.action === "go-to-installed") completeStep(); }}
          className={`flex-1 py-2.5 text-sm font-medium transition-all ${tab === "installed" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"} ${hl("tab-installed") ? pulse : ""}`}
        >
          📱 My Apps
        </button>
      </div>

      {tab === "store" && !selectedApp && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b">
            <input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search apps..."
              className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-blue-400 ${hl("search-bar") ? pulse : ""}`}
            />
          </div>
          {/* Category tabs */}
          <div className="flex gap-1.5 px-3 py-2 border-b overflow-x-auto flex-shrink-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setSearchQuery(""); if (step?.action === "go-to-category" && step.target === cat) completeStep(); }}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all ${category === cat ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"} ${hl("category-btn", cat) ? pulse : ""}`}
              >
                {cat}
              </button>
            ))}
          </div>
          {/* App grid */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {storeApps.map((app) => (
              <button
                key={app.id}
                onClick={() => handleSelectApp(app)}
                className={`flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 text-left transition-all ${hl("app-card", app.name) ? pulse : ""}`}
              >
                <span className="text-3xl">{app.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{app.name}</p>
                  <p className="text-xs text-gray-500 truncate">{app.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-yellow-500">{"★".repeat(Math.round(app.rating))}</span>
                    <span className="text-xs text-gray-400">{app.price}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "store" && selectedApp && (
        <div className="flex-1 overflow-y-auto p-4">
          <button onClick={() => setSelectedApp(null)} className="text-blue-500 text-sm mb-3">← Back</button>
          <div className="flex items-start gap-4 mb-4">
            <span className="text-5xl">{selectedApp.icon}</span>
            <div>
              <h2 className="font-bold text-lg">{selectedApp.name}</h2>
              <p className="text-sm text-gray-500">{selectedApp.category}</p>
              <p className="text-sm text-yellow-500 mt-0.5">{"★".repeat(Math.round(selectedApp.rating))} {selectedApp.rating}</p>
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-4">{selectedApp.description}</p>
          {selectedApp.permissions.length > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs font-semibold text-gray-500 mb-2">Requires access to:</p>
              <div className="flex flex-wrap gap-2">
                {selectedApp.permissions.map((p) => (
                  <span key={p} className="text-xs bg-white border rounded-full px-2 py-0.5">{p}</span>
                ))}
              </div>
            </div>
          )}
          {installedIds.includes(selectedApp.id) ? (
            <button className="w-full py-3 bg-gray-200 text-gray-600 font-semibold rounded-xl">Installed ✓</button>
          ) : (
            <button
              onClick={handleInstall}
              className={`w-full py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all ${hl("install-btn") ? pulse : ""}`}
            >
              {selectedApp.price === "Free" ? "Get (Free)" : `Buy — ${selectedApp.price}`}
            </button>
          )}
        </div>
      )}

      {tab === "installed" && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {installedApps.map((app) => (
            <div key={app.id} className="flex items-center gap-3 p-3 border rounded-xl">
              <span className="text-3xl">{app.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{app.name}</p>
                <p className="text-xs text-gray-500">{app.preInstalled ? "Built-in" : "Installed"}</p>
                {app.hasUpdate && !updatedIds.includes(app.id) && (
                  <span className="text-xs text-orange-500 font-medium">Update available</span>
                )}
                {updatedIds.includes(app.id) && (
                  <span className="text-xs text-green-600 font-medium">Up to date ✓</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {app.hasUpdate && !updatedIds.includes(app.id) && !app.preInstalled && (
                  <button
                    onClick={() => handleUpdate(app.name)}
                    className={`px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 ${hl("update-btn", app.name) ? pulse : ""}`}
                  >
                    Update
                  </button>
                )}
                {!app.preInstalled && !deletedIds.includes(app.id) && (
                  <button
                    onClick={() => handleDelete(app.name)}
                    className={`px-3 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 ${hl("delete-btn", app.name) ? pulse : ""}`}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          {installedApps.length === 0 && (
            <div className="flex items-center justify-center h-24 text-gray-400 text-sm">No apps installed yet</div>
          )}
        </div>
      )}
    </SimulatorFrame>
  );
}
