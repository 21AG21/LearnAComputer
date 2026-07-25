"use client";

import { useState } from "react";
import AppWindow from "./AppWindow";

const FEATURED_APPS = [
  { id: "puzzlequest", name: "Puzzle Quest", icon: "🧩", color: "bg-purple-500", description: "Logic puzzles for all ages", category: "Games", rating: 4.7 },
  { id: "weathernow", name: "WeatherNow", icon: "🌤️", color: "bg-blue-400", description: "Simple, clear weather forecasts", category: "Utilities", rating: 4.5 },
  { id: "recipebox", name: "RecipeBox", icon: "🍳", color: "bg-red-500", description: "Save and discover recipes", category: "Food", rating: 4.6 },
  { id: "sketchpad", name: "SketchPad", icon: "🎨", color: "bg-indigo-500", description: "Draw and doodle with ease", category: "Creative", rating: 4.4 },
  { id: "zengarden", name: "Zen Garden", icon: "🌿", color: "bg-green-600", description: "A calming focus timer", category: "Productivity", rating: 4.8 },
  { id: "musicmaker", name: "MusicMaker", icon: "🎵", color: "bg-rose-500", description: "Make music, no experience needed", category: "Music", rating: 4.3 },
  { id: "chatbuddy", name: "ChatBuddy", icon: "💬", color: "bg-teal-500", description: "Stay in touch with everyone", category: "Social", rating: 4.2 },
  { id: "notemaster", name: "NoteMaster", icon: "📝", color: "bg-amber-500", description: "Organized notes and checklists", category: "Productivity", rating: 4.6 },
];

interface AppMarketAppProps {
  onClose?: () => void;
  onMinimize?: () => void;
  showHeader?: boolean;
}

export default function AppMarketApp({ onClose = () => {}, onMinimize = () => {}, showHeader }: AppMarketAppProps) {
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? FEATURED_APPS.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.category.toLowerCase().includes(search.toLowerCase())
      )
    : FEATURED_APPS;

  return (
    <AppWindow title="App Market" onClose={onClose} onMinimize={onMinimize} showHeader={showHeader}>
      {/* Search bar */}
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-1.5">
          <span className="text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search apps…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!search && (
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Featured</p>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-1">
            <span className="text-3xl">🔍</span>
            <p>No apps found for &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((app) => {
              const isInstalled = installed.has(app.id);
              return (
                <div key={app.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={`w-12 h-12 shrink-0 rounded-2xl ${app.color} flex items-center justify-center text-2xl`}>
                    {app.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{app.name}</p>
                    <p className="text-xs text-gray-500 truncate">{app.description}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-yellow-500">{"★".repeat(Math.round(app.rating))}</span>
                      <span className="text-[10px] text-gray-400">{app.rating}</span>
                      <span className="text-[10px] text-gray-300 mx-0.5">·</span>
                      <span className="text-[10px] text-gray-400">{app.category}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setInstalled((prev) => { const next = new Set(prev); isInstalled ? next.delete(app.id) : next.add(app.id); return next; })}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      isInstalled
                        ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {isInstalled ? "Installed" : "Get"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-4">Open an App Market lesson to practice installing apps.</p>
      </div>
    </AppWindow>
  );
}
