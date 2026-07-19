"use client";

import { useMemo, useState } from "react";

/**
 * A hands-on, guided web browser (browser). The learner performs REAL
 * browsing actions — typing URLs, opening tabs and windows, bookmarking,
 * saving to a reading list, using history, downloading, checking the lock
 * icon, dismissing cookie banners and scam popups, reloading, and zooming —
 * one guided step at a time. Each step pulses the exact control to click next
 * and only advances when the correct action is done. No multiple choice.
 */

export type GuidedBrowserStep = {
  say: string;
  action:
    | "navigate"
    | "search"
    | "new-tab"
    | "close-tab"
    | "new-window"
    | "reload"
    | "bookmark"
    | "reading-list-add"
    | "history-visit"
    | "lock-click"
    | "cookie-decline"
    | "close-popup"
    | "zoom-in"
    | "download"
    | "open-downloads";
  url?: string;
  title?: string;
  query?: string;
  reveal?: string;
};

interface GuidedBrowserTaskProps {
  goal: string;
  steps: GuidedBrowserStep[];
  onResult: (success: boolean) => void;
}

type PageId = "newtab" | "shop" | "google" | "wikipedia" | "weather" | "news" | "recipes" | "freegames";

interface Page {
  title: string;
  url: string;
  secure: boolean;
  icon: string;
  kind: "newtab" | "site" | "search";
  body?: string;
  cookie?: boolean;
  popup?: boolean;
  download?: string;
}

const PAGES: Record<PageId, Page> = {
  newtab: { title: "New Tab", url: "", secure: true, icon: "➕", kind: "newtab" },
  shop: { title: "Shop", url: "shop.example", secure: true, icon: "🛒", kind: "site", body: "Laptops. Tablets. Phones. Headphones. The best deals, all in one place." },
  google: { title: "Google", url: "google.com", secure: true, icon: "🔍", kind: "search" },
  wikipedia: { title: "Wikipedia", url: "wikipedia.org", secure: true, icon: "📚", kind: "site", body: "Wikipedia, the free encyclopedia that anyone can edit. 6 million+ articles in English." },
  weather: { title: "Weather", url: "weather.com", secure: true, icon: "☀️", kind: "site", body: "Today: Sunny, 72°F. Tonight: Clear, 58°F. Tomorrow: Partly cloudy.", cookie: true },
  news: { title: "Daily News", url: "dailynews.example", secure: true, icon: "📰", kind: "site", body: "10 Easy Soup Recipes for a Cozy Winter — a warming article worth saving to read after dinner." },
  recipes: { title: "Recipe Box", url: "recipebox.example", secure: true, icon: "🥧", kind: "site", body: "Grandma's Classic Apple Pie — the flakiest crust you'll ever make.", download: "ApplePieRecipe.pdf" },
  freegames: { title: "Free Games!!!", url: "freegames.example", secure: false, icon: "🎮", kind: "site", body: "Play 1000s of FREE games now! No download needed!", popup: true },
};

const URL_TO_PAGE: Record<string, PageId> = Object.fromEntries(
  (Object.keys(PAGES) as PageId[]).filter((id) => PAGES[id].url).map((id) => [PAGES[id].url, id])
) as Record<string, PageId>;

const FAVORITES: PageId[] = ["shop", "google", "wikipedia", "weather", "news", "recipes"];

function normUrl(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

interface Tab {
  id: string;
  pageId: PageId;
  zoom: number;
}

export default function GuidedBrowserTask({ goal, steps, onResult }: GuidedBrowserTaskProps) {
  const [tabs, setTabs] = useState<Tab[]>([{ id: "t1", pageId: "newtab", zoom: 100 }]);
  const [activeId, setActiveId] = useState("t1");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [bookmarks, setBookmarks] = useState<PageId[]>([]);
  const [readingList, setReadingList] = useState<PageId[]>([]);
  const [history, setHistory] = useState<PageId[]>([]);
  const [downloads, setDownloads] = useState<string[]>([]);
  const [menu, setMenu] = useState<null | "history" | "downloads" | "readinglist">(null);
  const [lockInfo, setLockInfo] = useState(false);
  const [bookmarkSheet, setBookmarkSheet] = useState(false);
  const [newWindow, setNewWindow] = useState(false);
  const [cookieOpen, setCookieOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<string[] | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState(0);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);

  const step = steps[stepIndex];
  const finished = stepIndex >= steps.length;
  const activeTab = tabs.find((t) => t.id === activeId)!;
  const activePage = PAGES[activeTab.pageId];

  const uniqueHistory = useMemo(() => {
    const seen = new Set<PageId>();
    const out: PageId[] = [];
    for (let i = history.length - 1; i >= 0; i--) {
      if (!seen.has(history[i]) && PAGES[history[i]].url) {
        seen.add(history[i]);
        out.push(history[i]);
      }
    }
    return out;
  }, [history]);

  function completeStep() {
    setFlash(true);
    setEditing(false);
    setBookmarkSheet(false);
    setSearchInput("");
    setTimeout(() => setFlash(false), 850);
    if (stepIndex + 1 >= steps.length) {
      setDone(true);
      setTimeout(() => onResult(true), 1500);
    }
    setStepIndex((i) => i + 1);
    setPhase(0);
  }

  // ---- highlight logic ----
  function hl(kind: string, name?: string): boolean {
    if (finished || !step) return false;
    switch (step.action) {
      case "navigate":
        return kind === "address";
      case "search":
        return kind === "searchbox";
      case "new-tab":
        return kind === "newtab-btn";
      case "close-tab":
        return kind === "tab-close" && name === step.title;
      case "new-window":
        return kind === "newwindow-btn";
      case "reload":
        return kind === "reload-btn";
      case "bookmark":
        return phase === 0 ? kind === "bookmark-btn" : kind === "bookmark-add";
      case "reading-list-add":
        return kind === "readinglist-btn";
      case "history-visit":
        if (phase === 0) return kind === "history-btn";
        return kind === "history-item" && name === step.title;
      case "lock-click":
        return kind === "lock-btn";
      case "cookie-decline":
        return kind === "cookie-decline";
      case "close-popup":
        return kind === "popup-close";
      case "zoom-in":
        return kind === "zoomin-btn";
      case "download":
        return kind === "download-btn";
      case "open-downloads":
        return kind === "downloads-btn";
      default:
        return false;
    }
  }

  // ---- navigation ----
  function navigate(pageId: PageId) {
    setTabs((prev) => prev.map((t) => (t.id === activeId ? { ...t, pageId, zoom: 100 } : t)));
    setHistory((prev) => [...prev, pageId]);
    setEditing(false);
    setLockInfo(false);
    setMenu(null);
    setSearchResults(null);
    setSearchInput("");
    setCookieOpen(!!PAGES[pageId].cookie);
    setPopupOpen(!!PAGES[pageId].popup);
    if (step?.action === "navigate" && step.url && normUrl(PAGES[pageId].url) === normUrl(step.url)) {
      completeStep();
    } else if (step?.action === "history-visit" && phase === 1 && PAGES[pageId].title === step.title) {
      completeStep();
    }
  }

  function submitAddress() {
    const pageId = URL_TO_PAGE[normUrl(draft)];
    if (pageId) navigate(pageId);
    else {
      // unknown address — briefly show the draft cleared so the learner retries
      setDraft("");
    }
  }

  // ---- handlers ----
  function newTab() {
    const id = "t" + Date.now();
    setTabs((prev) => [...prev, { id, pageId: "newtab", zoom: 100 }]);
    setActiveId(id);
    setMenu(null);
    if (step?.action === "new-tab") completeStep();
  }

  function closeTab(id: string) {
    const closing = tabs.find((t) => t.id === id);
    const title = closing ? PAGES[closing.pageId].title : "";
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) return prev; // never close the last tab
      if (id === activeId) setActiveId(next[next.length - 1].id);
      return next;
    });
    if (step?.action === "close-tab" && title === step.title) completeStep();
  }

  function reload() {
    if (step?.action === "reload") completeStep();
  }

  function clickBookmarkStar() {
    setBookmarkSheet(true);
    if (step?.action === "bookmark" && phase === 0) setPhase(1);
  }
  function confirmBookmark() {
    setBookmarks((prev) => (prev.includes(activeTab.pageId) ? prev : [...prev, activeTab.pageId]));
    setBookmarkSheet(false);
    if (step?.action === "bookmark" && phase === 1) completeStep();
  }

  function addReadingList() {
    setReadingList((prev) => (prev.includes(activeTab.pageId) ? prev : [...prev, activeTab.pageId]));
    setMenu("readinglist");
    if (step?.action === "reading-list-add") completeStep();
  }

  function clickHistoryBtn() {
    setMenu(menu === "history" ? null : "history");
    if (step?.action === "history-visit" && phase === 0) setPhase(1);
  }

  function clickDownloadsBtn() {
    setMenu(menu === "downloads" ? null : "downloads");
    if (step?.action === "open-downloads") completeStep();
  }

  function clickDownloadLink() {
    if (!activePage.download) return;
    setDownloads((prev) => (prev.includes(activePage.download!) ? prev : [...prev, activePage.download!]));
    if (step?.action === "download") completeStep();
  }

  function clickLock() {
    setLockInfo(true);
    if (step?.action === "lock-click") completeStep();
  }

  function declineCookies() {
    setCookieOpen(false);
    if (step?.action === "cookie-decline") completeStep();
  }

  function closePopup() {
    setPopupOpen(false);
    if (step?.action === "close-popup") completeStep();
  }

  function zoomIn() {
    const z = Math.min(activeTab.zoom + 25, 200);
    setTabs((prev) => prev.map((t) => (t.id === activeId ? { ...t, zoom: z } : t)));
    if (z >= 150 && step?.action === "zoom-in") completeStep();
  }

  function submitSearch() {
    if (!searchInput.trim()) return;
    const q = searchInput.trim();
    setSearchResults([
      `${step?.reveal ?? "Recipe Box"} — top result for "${q}"`,
      `Wikipedia — ${q}`,
      `YouTube — ${q} (video)`,
    ]);
    if (step?.action === "search") completeStep();
  }

  const showBookmarksBar = bookmarks.length > 0;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden select-none">
      {/* Guidance banner */}
      <div className="shrink-0 bg-[#1d2733] text-white px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
            {finished ? "Done" : `Step ${stepIndex + 1} of ${steps.length}`}
          </span>
          <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${(Math.min(stepIndex, steps.length) / steps.length) * 100}%` }} />
          </div>
        </div>
        <p className="mt-1.5 text-lg font-semibold leading-snug">{done ? "🎉 " + goal + " — all done!" : step?.say}</p>
      </div>

      {/* Browser */}
      <div className="flex-1 min-h-0 p-3">
        <div className="relative h-full flex flex-col border-4 border-black rounded-lg overflow-hidden shadow-lg bg-white">
          {/* Tab strip */}
          <div className="shrink-0 bg-gray-200 border-b-2 border-black flex items-stretch gap-1 px-2 pt-2">
            {tabs.map((t) => {
              const p = PAGES[t.pageId];
              const active = t.id === activeId;
              return (
                <div
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-2 border-b-0 cursor-pointer max-w-44 ${
                    active ? "bg-white border-black" : "bg-gray-100 border-gray-400"
                  }`}
                >
                  <span>{p.icon}</span>
                  <span className="text-sm font-semibold truncate flex-1">{p.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                    aria-label={`Close ${p.title} tab`}
                    className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-gray-600 hover:bg-gray-300 ${
                      hl("tab-close", p.title) ? "ring-4 ring-yellow-400 animate-pulse" : ""
                    }`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            <button
              onClick={newTab}
              aria-label="New tab"
              className={`px-3 py-1.5 text-lg font-bold text-gray-600 hover:bg-gray-100 rounded-t-lg ${
                hl("newtab-btn") ? "ring-4 ring-yellow-400 animate-pulse" : ""
              }`}
            >
              +
            </button>
          </div>

          {/* Toolbar */}
          <div className="shrink-0 bg-gray-100 border-b-2 border-black flex items-center gap-2 px-3 py-2">
            <span className="text-xl text-gray-400">‹</span>
            <span className="text-xl text-gray-400">›</span>
            <button
              onClick={reload}
              aria-label="Reload"
              className={`text-lg px-1 rounded hover:bg-gray-200 ${hl("reload-btn") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}
            >
              ⟳
            </button>
            {/* Address bar */}
            <div
              onClick={() => { if (activePage.kind !== "newtab" || true) { setEditing(true); setDraft(activePage.url); } }}
              className={`flex-1 flex items-center gap-2 bg-white border-2 rounded-lg px-3 py-1.5 cursor-text ${
                hl("address") ? "border-yellow-400 ring-4 ring-yellow-300 animate-pulse" : "border-gray-400"
              }`}
            >
              <button
                onClick={(e) => { e.stopPropagation(); if (activePage.url) clickLock(); }}
                aria-label="Site security"
                className={`shrink-0 ${hl("lock-btn") ? "ring-4 ring-yellow-400 animate-pulse rounded" : ""}`}
              >
                {activePage.url ? (activePage.secure ? "🔒" : "⚠️") : ""}
              </button>
              {editing ? (
                <>
                  <input
                    autoFocus
                    value={draft}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitAddress(); }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Type a website address"
                    className="flex-1 outline-none text-base"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); submitAddress(); }}
                    className="shrink-0 px-3 py-0.5 bg-blue-600 text-white text-sm font-bold rounded-md border border-black"
                  >
                    Go →
                  </button>
                </>
              ) : (
                <span className={`flex-1 text-base ${activePage.url ? "" : "text-gray-400"}`}>
                  {activePage.url || "Type a website address"}
                  {!activePage.secure && activePage.url && <span className="text-red-600 font-semibold text-sm ml-2">Not Secure</span>}
                </span>
              )}
            </div>
            <button
              onClick={clickBookmarkStar}
              aria-label="Bookmark this page"
              className={`text-lg px-1 rounded hover:bg-gray-200 ${hl("bookmark-btn") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}
            >
              {bookmarks.includes(activeTab.pageId) ? "⭐" : "☆"}
            </button>
          </div>

          {/* Action bar */}
          <div className="shrink-0 bg-gray-50 border-b-2 border-gray-300 flex items-center flex-wrap gap-1.5 px-3 py-1.5 text-sm">
            <ActionBtn label="📖 Reading List" onClick={addReadingList} highlight={hl("readinglist-btn")} />
            <ActionBtn label="🕐 History" onClick={clickHistoryBtn} highlight={hl("history-btn")} />
            <ActionBtn label="⬇️ Downloads" onClick={clickDownloadsBtn} highlight={hl("downloads-btn")} />
            <ActionBtn label="🪟 New Window" onClick={() => { setNewWindow(true); if (step?.action === "new-window") completeStep(); }} highlight={hl("newwindow-btn")} />
            <div className="flex-1" />
            <div className="flex items-center border-2 border-gray-400 rounded-lg overflow-hidden">
              <span className="px-2 text-gray-500">−</span>
              <span className="px-2 border-x-2 border-gray-300 font-semibold tabular-nums">{activeTab.zoom}%</span>
              <button
                onClick={zoomIn}
                aria-label="Zoom in"
                className={`px-2 font-bold hover:bg-gray-200 ${hl("zoomin-btn") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}
              >
                +
              </button>
            </div>
          </div>

          {/* Bookmarks bar */}
          {showBookmarksBar && (
            <div className="shrink-0 bg-white border-b border-gray-200 flex items-center gap-3 px-3 py-1 text-sm overflow-x-auto">
              {bookmarks.map((b) => (
                <button key={b} onClick={() => navigate(b)} className="flex items-center gap-1 whitespace-nowrap hover:underline">
                  <span>{PAGES[b].icon}</span>
                  <span className="font-medium">{PAGES[b].title}</span>
                </button>
              ))}
            </div>
          )}

          {/* Page content */}
          <div className="flex-1 min-h-0 overflow-auto bg-white relative">
            <div style={{ fontSize: `${activeTab.zoom}%` }} className="p-6">
              {activePage.kind === "newtab" && (
                <div>
                  <p className="text-gray-500 font-semibold mb-3">Favorites</p>
                  <div className="grid grid-cols-3 gap-3 max-w-md">
                    {FAVORITES.map((f) => (
                      <button
                        key={f}
                        onClick={() => navigate(f)}
                        className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-gray-200 hover:bg-gray-50"
                      >
                        <span className="text-3xl">{PAGES[f].icon}</span>
                        <span className="text-xs font-semibold">{PAGES[f].title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activePage.kind === "search" && (
                <div className="flex flex-col items-center gap-4 pt-6">
                  <p className="text-5xl font-black tracking-tight">
                    <span className="text-blue-500">G</span><span className="text-red-500">o</span>
                    <span className="text-yellow-500">o</span><span className="text-blue-500">g</span>
                    <span className="text-green-500">l</span><span className="text-red-500">e</span>
                  </p>
                  <div className={`flex items-center gap-2 w-full max-w-md bg-white border-2 rounded-full px-4 py-2 ${hl("searchbox") ? "border-yellow-400 ring-4 ring-yellow-300 animate-pulse" : "border-gray-400"}`}>
                    <span className="text-gray-400">🔍</span>
                    <input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") submitSearch(); }}
                      placeholder="Search Google"
                      className="flex-1 outline-none"
                    />
                  </div>
                  <button onClick={submitSearch} className="px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-200">
                    Google Search
                  </button>
                  {searchResults && (
                    <div className="w-full max-w-md flex flex-col gap-3 mt-2 text-left">
                      {searchResults.map((r, i) => (
                        <div key={i} className="border-b border-gray-200 pb-2">
                          <p className="text-blue-700 font-semibold">{r}</p>
                          <p className="text-green-700 text-xs">https://www.example.com</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activePage.kind === "site" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{activePage.icon}</span>
                    <h1 className="text-3xl font-black">{activePage.title}</h1>
                  </div>
                  <p className="text-lg text-gray-700 leading-relaxed max-w-lg">{activePage.body}</p>
                  {activePage.download && (
                    <button
                      onClick={clickDownloadLink}
                      className={`self-start px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg border-2 border-black ${hl("download-btn") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}
                    >
                      ⬇️ Download {activePage.download}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Cookie banner */}
            {cookieOpen && (
              <div className="absolute bottom-0 left-0 right-0 bg-gray-900 text-white p-4 flex flex-wrap items-center gap-3 animate-slide-up">
                <p className="flex-1 text-sm min-w-48">🍪 This site uses cookies to remember your preferences. Do you accept?</p>
                <button className="px-4 py-2 bg-gray-600 rounded-lg font-semibold text-sm">Accept</button>
                <button
                  onClick={declineCookies}
                  className={`px-4 py-2 bg-white text-gray-900 rounded-lg font-bold text-sm ${hl("cookie-decline") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}
                >
                  Decline
                </button>
              </div>
            )}

            {/* Scam popup */}
            {popupOpen && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30">
                <div className="bg-white border-4 border-red-500 rounded-xl shadow-2xl p-6 max-w-xs text-center relative animate-pop-in">
                  <button
                    onClick={closePopup}
                    aria-label="Close popup"
                    className={`absolute -top-3 -right-3 w-8 h-8 bg-white border-2 border-black rounded-full font-bold ${hl("popup-close") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}
                  >
                    ✕
                  </button>
                  <p className="text-4xl mb-2">⚠️</p>
                  <p className="font-black text-red-600 text-lg">VIRUS DETECTED!!!</p>
                  <p className="text-sm text-gray-700 my-2">Your computer is infected! Click below to clean it NOW!</p>
                  <button className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg w-full">CLEAN NOW</button>
                </div>
              </div>
            )}

            {/* Lock info popover */}
            {lockInfo && (
              <div className="absolute top-2 left-2 z-20 w-72 bg-white border-2 border-black rounded-lg shadow-xl p-4 animate-slide-down">
                <p className="font-bold">🔒 Connection is secure</p>
                <p className="text-sm text-gray-600 mt-1">Your connection to <b>{activePage.url}</b> is encrypted. It&apos;s safe to type passwords or card numbers here.</p>
                <button onClick={() => setLockInfo(false)} className="mt-3 px-4 py-1.5 bg-gray-100 border-2 border-gray-300 rounded-lg font-semibold text-sm">Got it</button>
              </div>
            )}

            {/* History / Downloads / Reading List menus */}
            {menu && (
              <div className="absolute top-2 right-2 z-20 w-64 bg-white border-2 border-black rounded-lg shadow-xl overflow-hidden animate-slide-down">
                <p className="px-3 py-2 bg-gray-100 font-bold text-sm border-b border-gray-200">
                  {menu === "history" ? "🕐 History" : menu === "downloads" ? "⬇️ Downloads" : "📖 Reading List"}
                </p>
                <div className="max-h-56 overflow-auto">
                  {menu === "history" && (uniqueHistory.length === 0
                    ? <p className="px-3 py-3 text-gray-400 text-sm">No history yet.</p>
                    : uniqueHistory.map((h) => (
                        <button
                          key={h}
                          onClick={() => navigate(h)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm hover:bg-blue-50 border-b border-gray-100 ${hl("history-item", PAGES[h].title) ? "ring-4 ring-inset ring-yellow-400 animate-pulse" : ""}`}
                        >
                          <span>{PAGES[h].icon}</span><span className="font-medium">{PAGES[h].title}</span>
                          <span className="text-gray-400 ml-auto">{PAGES[h].url}</span>
                        </button>
                      )))}
                  {menu === "downloads" && (downloads.length === 0
                    ? <p className="px-3 py-3 text-gray-400 text-sm">No downloads yet.</p>
                    : downloads.map((d) => (
                        <div key={d} className="px-3 py-2 flex items-center gap-2 text-sm border-b border-gray-100">
                          <span>📄</span><span className="font-medium">{d}</span>
                        </div>
                      )))}
                  {menu === "readinglist" && (readingList.length === 0
                    ? <p className="px-3 py-3 text-gray-400 text-sm">Nothing saved yet.</p>
                    : readingList.map((r) => (
                        <div key={r} className="px-3 py-2 flex items-center gap-2 text-sm border-b border-gray-100">
                          <span>{PAGES[r].icon}</span><span className="font-medium">{PAGES[r].title}</span>
                        </div>
                      )))}
                </div>
              </div>
            )}
          </div>

          {/* Add Bookmark sheet */}
          {bookmarkSheet && (
            <div className="absolute inset-0 z-30 flex items-start justify-center pt-4 bg-black/20">
              <div className="bg-white border-4 border-black rounded-xl shadow-2xl p-5 w-80 animate-slide-down">
                <p className="font-black text-lg mb-1">Add Bookmark</p>
                <p className="text-sm text-gray-600 mb-3">Save this page to your favorites?</p>
                <div className="flex items-center gap-2 border-2 border-gray-300 rounded-lg px-3 py-2 mb-4">
                  <span className="text-xl">{activePage.icon}</span>
                  <span className="font-semibold">{activePage.title}</span>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setBookmarkSheet(false)} className="px-4 py-1.5 border-2 border-gray-300 rounded-lg font-semibold text-sm">Cancel</button>
                  <button
                    onClick={confirmBookmark}
                    className={`px-5 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-sm border-2 border-black ${hl("bookmark-add") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}
                  >
                    Add Bookmark
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Second window */}
          {newWindow && (
            <div className="absolute inset-6 z-30 bg-white border-4 border-black rounded-lg shadow-2xl flex flex-col animate-pop-in">
              <div className="bg-gray-200 border-b-2 border-black px-3 py-2 flex items-center gap-2">
                <button onClick={() => setNewWindow(false)} aria-label="Close window" className="w-3.5 h-3.5 rounded-full bg-red-500 border border-red-700" />
                <span className="w-3.5 h-3.5 rounded-full bg-yellow-400 border border-yellow-600" />
                <span className="w-3.5 h-3.5 rounded-full bg-green-500 border border-green-700" />
                <span className="font-bold text-sm ml-2">New Window</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-4">
                <span className="text-5xl">🪟</span>
                <p className="font-bold text-lg">A brand-new browser window!</p>
                <p className="text-sm text-gray-600 max-w-xs">This window is completely separate — it can have its own tabs. Great for keeping work and shopping apart.</p>
              </div>
            </div>
          )}

          {/* Completion tick */}
          {flash && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
              <div className="bg-green-500 text-white text-5xl w-24 h-24 rounded-full flex items-center justify-center shadow-2xl animate-ping-once">✓</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ label, onClick, highlight }: { label: string; onClick: () => void; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md border-2 border-gray-300 bg-white font-semibold whitespace-nowrap hover:bg-gray-100 ${
        highlight ? "ring-4 ring-yellow-400 animate-pulse border-yellow-400" : ""
      }`}
    >
      {label}
    </button>
  );
}
