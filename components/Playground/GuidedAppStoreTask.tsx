"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import SimulatorFrame from "./SimulatorFrame";
import { CartIcon, SmartphoneIcon, CameraIcon, MicIcon, LockIcon } from "./Icons";

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
  onResult: (success: boolean, failMessage?: string) => void;
}

interface Review {
  name: string;
  stars: number;
  text: string;
}

interface App {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  description: string;
  permissions: string[];
  price: string;
  rating: number;
  downloads: string;
  tags?: string[];
  reviews: Review[];
  hasUpdate?: boolean;
  preInstalled?: boolean;
}

const STORE_APPS: App[] = [
  {
    id: "puzzlequest", name: "Puzzle Quest", icon: "🧩", color: "bg-purple-500",
    category: "Games", description: "A relaxing puzzle game with hundreds of levels. Great for all ages. Solve mazes, match colors, and unlock new worlds.",
    permissions: ["Camera", "Microphone"], price: "Free", rating: 4.6, downloads: "500K+", tags: [],
    reviews: [
      { name: "Maya S.", stars: 5, text: "So relaxing! Perfect for winding down." },
      { name: "Leo T.", stars: 4, text: "Great puzzles. Wish there were more levels." },
    ],
  },
  {
    id: "bubblepop", name: "Bubble Pop", icon: "🫧", color: "bg-pink-400",
    category: "Games", description: "Pop colorful bubbles in this addictive arcade game! Beat your high score and compete with friends.",
    permissions: [], price: "Free", rating: 3.8, downloads: "1M+", tags: ["Contains ads", "In-app purchases"],
    reviews: [
      { name: "Olivia R.", stars: 3, text: "Fun but too many ads between levels." },
      { name: "Noah K.", stars: 4, text: "Addictive! The power-ups cost real money though." },
      { name: "Emma B.", stars: 4, text: "Kids love it. Just watch the in-app purchases." },
    ],
  },
  {
    id: "zengarden", name: "Zen Garden", icon: "🌿", color: "bg-green-600",
    category: "Games", description: "Design peaceful gardens with rocks, sand, and plants. A calm, beautiful experience with no ads and no interruptions.",
    permissions: [], price: "$4.99", rating: 4.9, downloads: "50K+", tags: ["No ads"],
    reviews: [
      { name: "Sophia L.", stars: 5, text: "Worth every penny. So peaceful and beautiful." },
      { name: "James W.", stars: 5, text: "No ads, no nagging. Just pure relaxation." },
    ],
  },
  {
    id: "calculatorpro", name: "Calculator Pro", icon: "🔢", color: "bg-gray-700",
    category: "Tools", description: "Advanced scientific calculator with history, unit conversion, and tip calculator built in.",
    permissions: [], price: "Free", rating: 4.9, downloads: "2M+", tags: [],
    reviews: [
      { name: "Aiden M.", stars: 5, text: "Best calculator app. The history feature is clutch." },
      { name: "Grace P.", stars: 5, text: "Simple and does everything I need." },
    ],
  },
  {
    id: "weathernow", name: "WeatherNow", icon: "🌤️", color: "bg-blue-400",
    category: "Tools", description: "Accurate hourly and 7-day weather forecasts for your location. Beautiful weather animations.",
    permissions: [], price: "Free", rating: 4.7, downloads: "800K+", tags: [], hasUpdate: true,
    reviews: [
      { name: "Mia C.", stars: 5, text: "Most accurate weather app I've used." },
      { name: "Ethan D.", stars: 4, text: "Love the animations. Sometimes slow to load." },
    ],
  },
  {
    id: "flashlight", name: "FlashLight", icon: "🔦", color: "bg-yellow-500",
    category: "Tools", description: "Turn your screen into a bright flashlight. Adjustable brightness and SOS mode.",
    permissions: [], price: "Free", rating: 4.3, downloads: "300K+", tags: [],
    reviews: [
      { name: "Liam J.", stars: 4, text: "Does exactly what it says. Simple and useful." },
      { name: "Ava N.", stars: 5, text: "The SOS mode saved me on a camping trip!" },
    ],
  },
  {
    id: "chatbuddy", name: "ChatBuddy", icon: "💬", color: "bg-teal-500",
    category: "Social", description: "Message your friends instantly. Voice and video calling included. End-to-end encrypted.",
    permissions: ["Camera", "Microphone"], price: "Free", rating: 4.5, downloads: "5M+", tags: [],
    reviews: [
      { name: "Harper G.", stars: 5, text: "Best messaging app. Video calls are crystal clear." },
      { name: "Jack F.", stars: 4, text: "Good for groups. Needs better stickers." },
      { name: "Ella V.", stars: 5, text: "Love the encryption. Feels safe." },
    ],
  },
  {
    id: "photofun", name: "PhotoFun", icon: "📸", color: "bg-orange-500",
    category: "Social", description: "Share photos with friends and family. Hundreds of filters, stickers, and editing tools.",
    permissions: ["Camera"], price: "$1.99", rating: 4.2, downloads: "200K+", tags: [],
    reviews: [
      { name: "Isabella H.", stars: 4, text: "Great filters. Worth the $1.99." },
      { name: "Lucas Q.", stars: 4, text: "Easy to use. Kids make great collages." },
    ],
  },
  {
    id: "notemaster", name: "NoteMaster", icon: "📝", color: "bg-amber-500",
    category: "Creativity", description: "A simple, beautiful note-taking app. Sync across all your devices. Supports checklists and sketches.",
    permissions: [], price: "Free", rating: 4.8, downloads: "1M+", tags: [],
    reviews: [
      { name: "Charlotte S.", stars: 5, text: "Replaced my paper notebooks entirely." },
      { name: "Henry R.", stars: 5, text: "Syncs perfectly between my phone and laptop." },
    ],
  },
  {
    id: "sketchpad", name: "SketchPad", icon: "🎨", color: "bg-indigo-500",
    category: "Creativity", description: "Draw and paint with digital brushes. Layers, color picker, and export to PNG.",
    permissions: [], price: "Free", rating: 4.4, downloads: "400K+", tags: [],
    reviews: [
      { name: "Amelia B.", stars: 5, text: "Amazing for a free drawing app!" },
      { name: "Ben T.", stars: 4, text: "Good brushes but needs an undo button." },
    ],
  },
  {
    id: "musicmaker", name: "MusicMaker", icon: "🎵", color: "bg-rose-500",
    category: "Creativity", description: "Create beats and melodies with a simple interface. Dozens of instruments and loops.",
    permissions: ["Microphone"], price: "$2.99", rating: 4.1, downloads: "100K+", tags: [],
    reviews: [
      { name: "Daniel K.", stars: 4, text: "Fun to play with. Great for beginners." },
      { name: "Zoe M.", stars: 4, text: "My kids love making their own songs." },
    ],
  },
  {
    id: "recipebox", name: "RecipeBox", icon: "🍳", color: "bg-red-500",
    category: "Tools", description: "Thousands of recipes with step-by-step instructions. Save your favorites and make shopping lists.",
    permissions: [], price: "Free", rating: 4.6, downloads: "600K+", tags: [],
    reviews: [
      { name: "Lily A.", stars: 5, text: "Found so many great dinner ideas!" },
      { name: "Owen P.", stars: 4, text: "The shopping list feature is a lifesaver." },
    ],
  },
];

const BUILT_IN_APPS: App[] = [
  { id: "messages", name: "Messages", icon: "💬", color: "bg-green-500", category: "Built-in", description: "Send and receive text messages.", permissions: [], price: "Built-in", rating: 5, downloads: "", reviews: [], preInstalled: true },
  { id: "mail", name: "Mail", icon: "✉️", color: "bg-blue-500", category: "Built-in", description: "Send and receive email.", permissions: [], price: "Built-in", rating: 5, downloads: "", reviews: [], preInstalled: true },
  { id: "files", name: "Files", icon: "📁", color: "bg-sky-400", category: "Built-in", description: "Manage your files and folders.", permissions: [], price: "Built-in", rating: 5, downloads: "", reviews: [], preInstalled: true },
  { id: "browser", name: "Browser", icon: "🌐", color: "bg-blue-600", category: "Built-in", description: "Browse the web.", permissions: [], price: "Built-in", rating: 5, downloads: "", reviews: [], preInstalled: true },
  { id: "photos", name: "Photos", icon: "🖼️", color: "bg-gradient-to-br from-pink-400 to-blue-400", category: "Built-in", description: "View and edit your photos.", permissions: [], price: "Built-in", rating: 5, downloads: "", reviews: [], preInstalled: true },
  { id: "calendar", name: "Calendar", icon: "📅", color: "bg-red-500", category: "Built-in", description: "Keep track of events and appointments.", permissions: [], price: "Built-in", rating: 5, downloads: "", reviews: [], preInstalled: true },
  { id: "notes", name: "Notes", icon: "📒", color: "bg-yellow-400", category: "Built-in", description: "Quick notes and checklists.", permissions: [], price: "Built-in", rating: 5, downloads: "", reviews: [], preInstalled: true },
];

const CATEGORIES = ["All", "Games", "Tools", "Social", "Creativity"];

const SIM_KEY = "lac-sim-apps";

function loadInstalledIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SIM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveInstalledIds(ids: string[]) {
  try { localStorage.setItem(SIM_KEY, JSON.stringify(ids)); } catch {}
}

export default function GuidedAppStoreTask({ goal, steps, onResult }: GuidedAppStoreTaskProps) {
  const [tab, setTab] = useState<"store" | "installed">("store");
  const [category, setCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [installedIds, setInstalledIds] = useState<string[]>([]);
  const [updatedIds, setUpdatedIds] = useState<string[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [permDialog, setPermDialog] = useState<{ app: App; permIdx: number } | null>(null);
  const [denied, setDenied] = useState<{ app: App } | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const saved = loadInstalledIds();
    const needed = new Set<string>();
    const installedDuringLesson = new Set<string>();
    for (const s of steps) {
      if (s.action === "install" && s.target) {
        const app = STORE_APPS.find((a) => a.name === s.target);
        if (app) installedDuringLesson.add(app.id);
      }
      if (s.action === "delete-app" || s.action === "update-app" || s.action === "open-app") {
        const app = STORE_APPS.find((a) => a.name === s.target);
        if (app && !saved.includes(app.id) && !installedDuringLesson.has(app.id)) needed.add(app.id);
      }
    }
    const merged = [...new Set([...saved, ...needed])];
    setInstalledIds(merged);
    if (needed.size > 0) saveInstalledIds(merged);
  }, [steps]);

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
      case "allow-permission": return kind === "perm-allow";
      case "deny-permission": return kind === "perm-deny";
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
    ...BUILT_IN_APPS,
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
    if (step?.action === "search" && val.toLowerCase().includes((step.value ?? step.target ?? "").toLowerCase()) && val.length >= (step.value ?? step.target ?? "").length) {
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
      setPermDialog({ app: selectedApp, permIdx: 0 });
    } else {
      const next = [...new Set([...installedIds, selectedApp.id])];
      setInstalledIds(next);
      saveInstalledIds(next);
      setSelectedApp(null);
    }
    if (step?.action === "install") completeStep();
  }

  function handleAllowPermission() {
    if (!permDialog) return;
    const { app, permIdx } = permDialog;
    if (step?.action === "allow-permission") completeStep();
    const nextIdx = permIdx + 1;
    if (nextIdx >= app.permissions.length) {
      const next = [...new Set([...installedIds, app.id])];
      setInstalledIds(next);
      saveInstalledIds(next);
      setPermDialog(null);
      setSelectedApp(null);
    } else {
      setPermDialog({ app, permIdx: nextIdx });
    }
  }

  function handleDenyPermission() {
    if (!permDialog) return;
    if (step?.action === "deny-permission") completeStep();
    setDenied({ app: permDialog.app });
    setPermDialog(null);
  }

  function handleDismissDenied() {
    setDenied(null);
  }

  function handleUpdate(appName: string) {
    const app = STORE_APPS.find((a) => a.name === appName);
    if (app) setUpdatedIds((prev) => [...prev, app.id]);
    if (step?.action === "update-app" && step.target === appName) completeStep();
  }

  function handleDelete(appName: string) {
    const app = STORE_APPS.find((a) => a.name === appName);
    if (app) {
      setDeletedIds((prev) => [...prev, app.id]);
      const next = installedIds.filter((id) => id !== app.id);
      setInstalledIds(next);
      saveInstalledIds(next);
    }
    if (step?.action === "delete-app" && step.target === appName) completeStep();
  }

  function starDisplay(rating: number) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.3;
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
  }

  function permIcon(perm: string): ReactNode {
    if (perm === "Camera") return <CameraIcon size={20} />;
    if (perm === "Microphone") return <MicIcon size={20} />;
    return <LockIcon size={20} />;
  }

  if (denied) {
    return (
      <SimulatorFrame appName="App Market" appIcon={<CartIcon size={18} />} instruction={step?.say} stepIndex={stepIndex} totalSteps={steps.length} done={done} goal={goal} flash={flash}>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border-2 rounded-2xl shadow-xl p-6 w-full max-w-xs text-center">
            <div className={`w-16 h-16 ${denied.app.color} rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3`}>{denied.app.icon}</div>
            <h3 className="font-bold text-base mb-2">{denied.app.name}</h3>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-700 font-medium mb-1">Installation canceled</p>
              <p className="text-xs text-red-600">{denied.app.name} needs these permissions to work.</p>
            </div>
            <button onClick={handleDismissDenied} className="w-full py-2.5 bg-gray-100 text-gray-700 font-medium text-sm rounded-xl hover:bg-gray-200">Back to Store</button>
          </div>
        </div>
      </SimulatorFrame>
    );
  }

  if (permDialog) {
    const perm = permDialog.app.permissions[permDialog.permIdx];
    return (
      <SimulatorFrame appName="App Market" appIcon={<CartIcon size={18} />} instruction={step?.say} stepIndex={stepIndex} totalSteps={steps.length} done={done} goal={goal} flash={flash}>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border-2 rounded-2xl shadow-xl p-6 w-full max-w-xs text-center">
            <div className={`w-14 h-14 ${permDialog.app.color} rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3`}>{permDialog.app.icon}</div>
            <h3 className="font-bold text-sm mb-1">&ldquo;{permDialog.app.name}&rdquo; would like to access your:</h3>
            <div className="bg-gray-50 rounded-xl p-4 my-3">
              <div className="flex justify-center mb-1 text-gray-600">{permIcon(perm)}</div>
              <p className="font-semibold text-sm">{perm}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDenyPermission}
                className={`flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200 transition-all ${hl("perm-deny") ? pulse : ""}`}
              >
                Don&apos;t Allow
              </button>
              <button
                onClick={handleAllowPermission}
                className={`flex-1 py-2.5 rounded-xl bg-blue-500 text-white font-medium text-sm hover:bg-blue-600 transition-all ${hl("perm-allow") ? pulse : ""}`}
              >
                Allow
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">{permDialog.permIdx + 1} of {permDialog.app.permissions.length} permissions</p>
          </div>
        </div>
      </SimulatorFrame>
    );
  }

  return (
    <SimulatorFrame appName="App Market" appIcon={<CartIcon size={18} />} instruction={step?.say} stepIndex={stepIndex} totalSteps={steps.length} done={done} goal={goal} flash={flash}>
      {/* Tab bar */}
      <div className="flex border-b flex-shrink-0">
        <button
          onClick={() => { setTab("store"); setSelectedApp(null); if (step?.action === "go-to-store") completeStep(); }}
          className={`flex-1 py-2.5 text-sm font-medium transition-all ${tab === "store" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"} ${hl("tab-store") ? pulse : ""}`}
        >
          <span className="inline-flex items-center gap-1"><CartIcon size={14} /> App Market</span>
        </button>
        <button
          onClick={() => { setTab("installed"); setSelectedApp(null); if (step?.action === "go-to-installed") completeStep(); }}
          className={`flex-1 py-2.5 text-sm font-medium transition-all ${tab === "installed" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"} ${hl("tab-installed") ? pulse : ""}`}
        >
          <span className="inline-flex items-center gap-1"><SmartphoneIcon size={14} /> My Apps</span>
        </button>
      </div>

      {tab === "store" && !selectedApp && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b">
            <input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search apps..."
              className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-blue-400 ${hl("search-bar") ? pulse : ""}`}
            />
          </div>
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
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {storeApps.map((app) => (
              <button
                key={app.id}
                onClick={() => handleSelectApp(app)}
                className={`flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 text-left transition-all ${hl("app-card", app.name) ? pulse : ""}`}
              >
                <div className={`w-11 h-11 ${app.color} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>{app.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{app.name}</p>
                  <p className="text-xs text-gray-500 truncate">{app.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-yellow-500">{starDisplay(app.rating)}</span>
                    <span className="text-xs text-gray-400">{app.price}</span>
                    {app.tags?.includes("Contains ads") && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 rounded">Ads</span>}
                  </div>
                </div>
              </button>
            ))}
            {storeApps.length === 0 && (
              <div className="flex items-center justify-center h-20 text-gray-400 text-sm">No apps found</div>
            )}
          </div>
        </div>
      )}

      {tab === "store" && selectedApp && (
        <div className="flex-1 overflow-y-auto p-4">
          <button onClick={() => setSelectedApp(null)} className="text-blue-500 text-sm mb-3 hover:underline">← Back</button>
          <div className="flex items-start gap-3 mb-3">
            <div className={`w-16 h-16 ${selectedApp.color} rounded-2xl flex items-center justify-center text-3xl flex-shrink-0`}>{selectedApp.icon}</div>
            <div className="min-w-0">
              <h2 className="font-bold text-base leading-tight">{selectedApp.name}</h2>
              <p className="text-xs text-gray-500">{selectedApp.category}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-yellow-500">{starDisplay(selectedApp.rating)}</span>
                <span className="text-xs text-gray-600 font-medium">{selectedApp.rating}</span>
                <span className="text-xs text-gray-400">· {selectedApp.downloads} downloads</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {selectedApp.tags && selectedApp.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedApp.tags.map((tag) => (
                <span key={tag} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tag === "No ads" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{tag}</span>
              ))}
            </div>
          )}

          <p className="text-sm text-gray-700 mb-3 leading-relaxed">{selectedApp.description}</p>

          {/* Permissions preview */}
          {selectedApp.permissions.length > 0 && (
            <div className="mb-3 p-2.5 bg-gray-50 rounded-xl">
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Requires access to</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedApp.permissions.map((p) => (
                  <span key={p} className="text-xs bg-white border rounded-full px-2 py-0.5 flex items-center gap-1">{permIcon(p)} {p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Install button */}
          {installedIds.includes(selectedApp.id) ? (
            <button className="w-full py-2.5 bg-gray-200 text-gray-600 font-semibold rounded-xl text-sm">Installed ✓</button>
          ) : (
            <button
              onClick={handleInstall}
              className={`w-full py-2.5 bg-blue-500 text-white font-semibold rounded-xl text-sm hover:bg-blue-600 transition-all ${hl("install-btn") ? pulse : ""}`}
            >
              {selectedApp.price === "Free" ? "Get (Free)" : `Buy — ${selectedApp.price}`}
            </button>
          )}

          {/* Screenshots placeholder */}
          <div className="mt-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Screenshots</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-20 h-36 bg-gray-100 rounded-lg border flex-shrink-0 flex items-center justify-center">
                  <span className="text-2xl opacity-30">{selectedApp.icon}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          {selectedApp.reviews.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Reviews</p>
              <div className="flex flex-col gap-2">
                {selectedApp.reviews.map((r, i) => (
                  <div key={i} className="p-2.5 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-gray-700">{r.name}</span>
                      <span className="text-[10px] text-yellow-500">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span>
                    </div>
                    <p className="text-xs text-gray-600">{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "installed" && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {installedApps.map((app) => (
            <div key={app.id} className="flex items-center gap-3 p-2.5 border rounded-xl">
              <div className={`w-10 h-10 ${app.color} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>{app.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">{app.name}</p>
                {app.preInstalled && <span className="text-[10px] text-gray-400 font-medium">Built-in</span>}
                {!app.preInstalled && !app.hasUpdate && <span className="text-[10px] text-gray-400">Installed</span>}
                {app.hasUpdate && !updatedIds.includes(app.id) && (
                  <span className="text-[10px] text-orange-500 font-medium">Update available</span>
                )}
                {updatedIds.includes(app.id) && (
                  <span className="text-[10px] text-green-600 font-medium">Up to date ✓</span>
                )}
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                {app.hasUpdate && !updatedIds.includes(app.id) && !app.preInstalled && (
                  <button
                    onClick={() => handleUpdate(app.name)}
                    className={`px-2.5 py-1 text-[11px] bg-blue-500 text-white rounded-lg hover:bg-blue-600 ${hl("update-btn", app.name) ? pulse : ""}`}
                  >
                    Update
                  </button>
                )}
                {!app.preInstalled && !deletedIds.includes(app.id) && (
                  <button
                    onClick={() => handleDelete(app.name)}
                    className={`px-2.5 py-1 text-[11px] bg-red-50 text-red-600 rounded-lg hover:bg-red-100 ${hl("delete-btn", app.name) ? pulse : ""}`}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </SimulatorFrame>
  );
}
