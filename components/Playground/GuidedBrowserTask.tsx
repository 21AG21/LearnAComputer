"use client";

import { useMemo, useState, type ReactNode } from "react";
import SimulatorFrame from "./SimulatorFrame";
import WindowControls from "./WindowControls";
import {
  PlusIcon, SearchIcon, CartIcon, BookIcon, ClockIcon,
  DownloadIcon, WindowIcon, LockIcon, WarningIcon, StarIcon,
  StarFilledIcon, GlobeIcon, FileDocIcon, TrashIcon, CookieIcon,
  ImageIcon, ReloadIcon,
} from "./Icons";

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
    | "open-downloads"
    | "open-result"
    | "delete-download";
  url?: string;
  title?: string;
  query?: string;
  reveal?: string;
  file?: string;
};

interface GuidedBrowserTaskProps {
  goal: string;
  steps: GuidedBrowserStep[];
  initialDownloads?: string[];
  onResult: (success: boolean, failMessage?: string) => void;
}

type PageId = "newtab" | "shop" | "google" | "wikipedia" | "weather" | "news" | "recipes" | "freegames";

interface Page {
  title: string;
  url: string;
  secure: boolean;
  icon: ReactNode;
  kind: "newtab" | "site" | "search";
  body?: string;
  cookie?: boolean;
  popup?: boolean;
  download?: string;
  ads?: boolean;
}

const PAGES: Record<PageId, Page> = {
  newtab: { title: "New Tab", url: "", secure: true, icon: <PlusIcon size={16} />, kind: "newtab" },
  shop: { title: "Shop", url: "shop.example", secure: true, icon: <CartIcon size={16} />, kind: "site", body: "Laptops. Tablets. Phones. Headphones. The best deals, all in one place.", ads: true },
  google: { title: "Google", url: "google.com", secure: true, icon: <SearchIcon size={16} />, kind: "search" },
  wikipedia: { title: "Wikipedia", url: "wikipedia.org", secure: true, icon: <BookIcon size={16} />, kind: "site", body: "Wikipedia, the free encyclopedia that anyone can edit. 6 million+ articles in English." },
  weather: { title: "Weather", url: "weather.com", secure: true, icon: <GlobeIcon size={16} />, kind: "site", body: "Today: Sunny, 72°F. Tonight: Clear, 58°F. Tomorrow: Partly cloudy.", cookie: true },
  news: { title: "Daily News", url: "dailynews.example", secure: true, icon: <FileDocIcon size={16} />, kind: "site", body: "10 Easy Soup Recipes for a Cozy Winter — a warming article worth saving to read after dinner." },
  recipes: { title: "Recipe Box", url: "recipebox.example", secure: true, icon: <BookIcon size={16} />, kind: "site", body: "Grandma's Classic Apple Pie — the flakiest crust you'll ever make.", download: "ApplePieRecipe.pdf" },
  freegames: { title: "Free Games!!!", url: "freegames.example", secure: false, icon: <GlobeIcon size={16} />, kind: "site", body: "Play 1000s of FREE games now! No download needed!", popup: true, ads: true },
};

const URL_TO_PAGE: Record<string, PageId> = Object.fromEntries(
  (Object.keys(PAGES) as PageId[]).filter((id) => PAGES[id].url).map((id) => [PAGES[id].url, id])
) as Record<string, PageId>;

const TITLE_TO_PAGE: Partial<Record<string, PageId>> = {};
for (const id of Object.keys(PAGES) as PageId[]) {
  TITLE_TO_PAGE[PAGES[id].title] = id;
}

const FAVORITES: PageId[] = ["shop", "google", "wikipedia", "weather", "news", "recipes"];

function normUrl(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

interface Tab {
  id: string;
  pageId: PageId;
  zoom: number;
  back: PageId[];
  fwd: PageId[];
}

export default function GuidedBrowserTask({ goal, steps, initialDownloads, onResult }: GuidedBrowserTaskProps) {
  const [tabs, setTabs] = useState<Tab[]>([{ id: "t1", pageId: "newtab", zoom: 100, back: [], fwd: [] }]);
  const [activeId, setActiveId] = useState("t1");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [bookmarks, setBookmarks] = useState<PageId[]>([]);
  const [readingList, setReadingList] = useState<PageId[]>([]);
  const [history, setHistory] = useState<PageId[]>([]);
  const [downloads, setDownloads] = useState<string[]>(initialDownloads ?? []);
  const [menu, setMenu] = useState<null | "history" | "downloads" | "readinglist">(null);
  const [lockInfo, setLockInfo] = useState(false);
  const [bookmarkSheet, setBookmarkSheet] = useState(false);
  const [newWindow, setNewWindow] = useState(false);
  const [cookieOpen, setCookieOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ title: string; snippet: string }> | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState(0);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);
  const [brokenPages, setBrokenPages] = useState<Set<PageId>>(() => {
    const broken = new Set<PageId>();
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].action === "reload" && i > 0) {
        const prev = steps[i - 1];
        if (prev.action === "navigate" && prev.url) {
          const pid = URL_TO_PAGE[normUrl(prev.url)];
          if (pid) broken.add(pid);
        }
      }
    }
    return broken;
  });
  const [cookieNudge, setCookieNudge] = useState(false);
  const [reloading, setReloading] = useState(false);

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
    setCookieNudge(false);
    setTimeout(() => setFlash(false), 850);
    if (stepIndex + 1 >= steps.length) {
      setDone(true);
      setTimeout(() => onResult(true), 1500);
    }
    setStepIndex((i) => i + 1);
    setPhase(0);
  }

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
        return lockInfo ? kind === "lock-gotit" : kind === "lock-btn";
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
      case "open-result":
        return kind === "search-result" && name === step.title;
      case "delete-download":
        return kind === "download-delete" && name === step.file;
      default:
        return false;
    }
  }

  function navigate(pageId: PageId) {
    setTabs((prev) => prev.map((t) => (t.id === activeId ? { ...t, pageId, zoom: 100, back: [...t.back, t.pageId], fwd: [] } : t)));
    setHistory((prev) => [...prev, pageId]);
    setEditing(false);
    setLockInfo(false);
    setMenu(null);
    setSearchResults(null);
    setSearchInput("");
    const pageIsBroken = brokenPages.has(pageId);
    setCookieOpen(!pageIsBroken && !!PAGES[pageId].cookie);
    setPopupOpen(!pageIsBroken && !!PAGES[pageId].popup);
    if (step?.action === "navigate" && step.url && normUrl(PAGES[pageId].url) === normUrl(step.url)) {
      completeStep();
    } else if (step?.action === "history-visit" && phase === 1 && PAGES[pageId].title === step.title) {
      completeStep();
    }
  }

  function submitAddress() {
    const pageId = URL_TO_PAGE[normUrl(draft)];
    if (pageId) navigate(pageId);
    else setDraft("");
  }

  function newTab() {
    const id = "t" + Date.now();
    setTabs((prev) => [...prev, { id, pageId: "newtab", zoom: 100, back: [], fwd: [] }]);
    setActiveId(id);
    setMenu(null);
    if (step?.action === "new-tab") completeStep();
  }

  function closeTab(id: string) {
    const closing = tabs.find((t) => t.id === id);
    const title = closing ? PAGES[closing.pageId].title : "";
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) return prev;
      if (id === activeId) setActiveId(next[next.length - 1].id);
      return next;
    });
    if (step?.action === "close-tab" && title === step.title) completeStep();
  }

  function reload() {
    const currentPageId = activeTab.pageId;
    if (brokenPages.has(currentPageId)) {
      setReloading(true);
      setTimeout(() => {
        setBrokenPages((prev) => {
          const next = new Set(prev);
          next.delete(currentPageId);
          return next;
        });
        setReloading(false);
        setCookieOpen(!!PAGES[currentPageId].cookie);
        setPopupOpen(!!PAGES[currentPageId].popup);
        if (step?.action === "reload") completeStep();
      }, 400);
      return;
    }
    if (step?.action === "reload") completeStep();
  }

  function goBack() {
    const t = activeTab;
    if (t.back.length === 0) return;
    const prevPage = t.back[t.back.length - 1];
    setTabs((prev) => prev.map((x) => (x.id === activeId ? { ...x, pageId: prevPage, back: x.back.slice(0, -1), fwd: [x.pageId, ...x.fwd], zoom: 100 } : x)));
    afterHop(prevPage);
  }

  function goForward() {
    const t = activeTab;
    if (t.fwd.length === 0) return;
    const nextPage = t.fwd[0];
    setTabs((prev) => prev.map((x) => (x.id === activeId ? { ...x, pageId: nextPage, back: [...x.back, x.pageId], fwd: x.fwd.slice(1), zoom: 100 } : x)));
    afterHop(nextPage);
  }

  function afterHop(pageId: PageId) {
    setEditing(false);
    setLockInfo(false);
    setMenu(null);
    setSearchResults(null);
    setSearchInput("");
    const pageIsBroken = brokenPages.has(pageId);
    setCookieOpen(!pageIsBroken && !!PAGES[pageId].cookie);
    setPopupOpen(!pageIsBroken && !!PAGES[pageId].popup);
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
  }

  function closeLockGotIt() {
    setLockInfo(false);
    if (step?.action === "lock-click") completeStep();
  }

  function acceptCookies() {
    setCookieOpen(false);
    if (step?.action === "cookie-decline") {
      setCookieNudge(true);
      setTimeout(() => {
        setCookieNudge(false);
        setCookieOpen(true);
      }, 2500);
    }
  }

  function declineCookies() {
    setCookieOpen(false);
    setCookieNudge(false);
    if (step?.action === "cookie-decline") completeStep();
  }

  function closePopup() {
    setPopupOpen(false);
    if (step?.action === "close-popup") completeStep();
  }

  function clickCleanNow() {
    setDownloads((prev) => [...prev, "SystemCleaner.exe"]);
    setPopupOpen(false);
    onResult(false, "That button was the scam! It downloaded a fake ‘cleaner’ program. On the next try, close the popup with the ✕ instead — and remember: if you ever click one by accident, delete the download immediately and never open it.");
  }

  function deleteDownload(file: string) {
    setDownloads((prev) => prev.filter((d) => d !== file));
    if (step?.action === "delete-download" && step.file === file) completeStep();
  }

  function zoomIn() {
    const z = Math.min(activeTab.zoom + 25, 200);
    setTabs((prev) => prev.map((t) => (t.id === activeId ? { ...t, zoom: z } : t)));
    if (z >= 150 && step?.action === "zoom-in") completeStep();
  }

  function zoomOut() {
    const z = Math.max(activeTab.zoom - 25, 50);
    setTabs((prev) => prev.map((t) => (t.id === activeId ? { ...t, zoom: z } : t)));
  }

  function submitSearch() {
    if (!searchInput.trim()) return;
    const q = searchInput.trim();
    const revealTitle = step?.reveal ?? "Recipe Box";
    setSearchResults([
      { title: revealTitle, snippet: `Top result for “${q}”` },
      { title: "Wikipedia", snippet: `${q} — encyclopedia article` },
    ]);
    if (step?.action === "search") completeStep();
  }

  function openSearchResult(title: string) {
    const pageId = TITLE_TO_PAGE[title];
    if (pageId) {
      navigate(pageId);
      setSearchResults(null);
    }
    if (step?.action === "open-result" && step.title === title) completeStep();
  }

  function clickAd() {
    onResult(false, "That was an ad pretending to be a download button — real download links are in the page content, not in flashy boxes.");
  }

  const showBookmarksBar = bookmarks.length > 0;
  const isBroken = brokenPages.has(activeTab.pageId);

  return (
    <SimulatorFrame
      appName="Browser"
      appIcon={<GlobeIcon size={20} />}
      instruction={step?.say}
      stepIndex={stepIndex}
      totalSteps={steps.length}
      done={done}
      goal={goal}
      flash={flash}
    >
      {/* Tab strip */}
      <div className="shrink-0 bg-gray-200 border-b-2 border-gray-300 flex items-stretch gap-1 px-2 pt-2">
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
                <span className="text-xs font-bold">&times;</span>
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
        <button onClick={goBack} disabled={activeTab.back.length === 0} aria-label="Go back" className={`text-xl px-1 rounded ${activeTab.back.length === 0 ? "text-gray-300 cursor-default" : "text-gray-700 hover:bg-gray-200"}`}>‹</button>
        <button onClick={goForward} disabled={activeTab.fwd.length === 0} aria-label="Go forward" className={`text-xl px-1 rounded ${activeTab.fwd.length === 0 ? "text-gray-300 cursor-default" : "text-gray-700 hover:bg-gray-200"}`}>›</button>
        <button onClick={reload} aria-label="Reload" className={`px-1 rounded hover:bg-gray-200 ${hl("reload-btn") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}><ReloadIcon size={18} /></button>
        {/* Address bar */}
        <div
          onClick={() => { setEditing(true); setDraft(activePage.url); }}
          className={`flex-1 flex items-center gap-2 bg-white border-2 rounded-lg px-3 py-1.5 cursor-text ${
            hl("address") ? "border-yellow-400 ring-4 ring-yellow-300 animate-pulse" : "border-gray-400"
          }`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); if (activePage.url) clickLock(); }}
            aria-label="Site security"
            className={`shrink-0 ${hl("lock-btn") ? "ring-4 ring-yellow-400 animate-pulse rounded" : ""}`}
          >
            {activePage.url ? (activePage.secure ? <LockIcon size={16} /> : <WarningIcon size={16} className="text-red-500" />) : null}
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
              <button onClick={(e) => { e.stopPropagation(); submitAddress(); }} className="shrink-0 px-3 py-0.5 bg-blue-600 text-white text-sm font-bold rounded-md border border-black">Go →</button>
            </>
          ) : (
            <span className={`flex-1 text-base ${activePage.url ? "" : "text-gray-400"}`}>
              {activePage.url || "Type a website address"}
              {!activePage.secure && activePage.url && <span className="text-red-600 font-semibold text-sm ml-2">Not Secure</span>}
            </span>
          )}
        </div>
        <button onClick={clickBookmarkStar} aria-label="Bookmark this page" className={`text-lg px-1 rounded hover:bg-gray-200 ${hl("bookmark-btn") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}>
          {bookmarks.includes(activeTab.pageId) ? <StarFilledIcon size={18} className="text-yellow-500" /> : <StarIcon size={18} />}
        </button>
      </div>

      {/* Action bar */}
      <div className="shrink-0 bg-gray-50 border-b-2 border-gray-300 flex items-center flex-wrap gap-1.5 px-3 py-1.5 text-sm">
        <ActionBtn label="Reading List" icon={<BookIcon size={14} />} onClick={addReadingList} highlight={hl("readinglist-btn")} />
        <ActionBtn label="History" icon={<ClockIcon size={14} />} onClick={clickHistoryBtn} highlight={hl("history-btn")} />
        <ActionBtn label="Downloads" icon={<DownloadIcon size={14} />} onClick={clickDownloadsBtn} highlight={hl("downloads-btn")} />
        <ActionBtn label="New Window" icon={<WindowIcon size={14} />} onClick={() => { setNewWindow(true); if (step?.action === "new-window") completeStep(); }} highlight={hl("newwindow-btn")} />
        <div className="flex-1" />
        <div className="flex items-center border-2 border-gray-400 rounded-lg overflow-hidden">
          <button onClick={zoomOut} aria-label="Zoom out" className="px-2 text-gray-600 hover:bg-gray-200">−</button>
          <span className="px-2 border-x-2 border-gray-300 font-semibold tabular-nums">{activeTab.zoom}%</span>
          <button onClick={zoomIn} aria-label="Zoom in" className={`px-2 font-bold hover:bg-gray-200 ${hl("zoomin-btn") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}>+</button>
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
        {reloading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm font-medium">Loading...</p>
          </div>
        ) : (
          <div style={{ fontSize: `${activeTab.zoom}%` }} className="p-6">
            {activePage.kind === "newtab" && (
              <div>
                <p className="text-gray-500 font-semibold mb-3">Favorites</p>
                <div className="grid grid-cols-3 gap-3 max-w-md">
                  {FAVORITES.map((f) => (
                    <button key={f} onClick={() => navigate(f)} className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-gray-200 hover:bg-gray-50">
                      <span className="text-gray-600">{PAGES[f].icon}</span>
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
                  <span className="text-gray-400"><SearchIcon size={16} /></span>
                  <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitSearch(); }} placeholder="Search Google" className="flex-1 outline-none" />
                </div>
                <button onClick={submitSearch} className="px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-200">Google Search</button>
                {searchResults && (
                  <div className="w-full max-w-md flex flex-col gap-3 mt-2 text-left">
                    {searchResults.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => openSearchResult(r.title)}
                        className={`text-left border-b border-gray-200 pb-2 hover:bg-blue-50 rounded px-2 py-1 transition-colors ${
                          hl("search-result", r.title) ? "ring-4 ring-yellow-400 animate-pulse" : ""
                        }`}
                      >
                        <p className="text-blue-700 font-semibold underline">{r.title}</p>
                        <p className="text-green-700 text-xs">{r.snippet}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activePage.kind === "site" && !isBroken && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">{activePage.icon}</span>
                  <h1 className="text-3xl font-black">{activePage.title}</h1>
                </div>
                <p className="text-lg text-gray-700 leading-relaxed max-w-lg">{activePage.body}</p>
                {activePage.download && (
                  <button onClick={clickDownloadLink} className={`self-start px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg border-2 border-black inline-flex items-center gap-2 ${hl("download-btn") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}>
                    <DownloadIcon size={16} /> Download {activePage.download}
                  </button>
                )}
                {activeTab.pageId === "news" && (
                  <div className="mt-6 border-t border-gray-200 pt-3">
                    <p style={{ fontSize: "8px" }} className="text-gray-400 leading-tight max-w-md">
                      Special offer details: Subscribe today and get 50% off your first 3 months. Use code NEWREADER at checkout. Offer valid for new subscribers only. Terms and conditions apply. See full details at dailynews.example/terms.
                      {activeTab.zoom >= 150 && <span className="text-green-600 font-bold"> Now you can read this!</span>}
                    </p>
                  </div>
                )}
                {activePage.ads && (
                  <div className="mt-4 flex flex-col gap-3">
                    <button onClick={clickAd} className="w-full bg-green-500 text-white font-black text-center py-3 rounded-lg border-2 border-green-700 hover:bg-green-600 animate-pulse">
                      ▶ DOWNLOAD NOW — FREE!!!
                    </button>
                    <button onClick={clickAd} className="w-full bg-yellow-400 text-black font-black text-center py-2 rounded-lg border-2 border-yellow-600 hover:bg-yellow-300">
                      You are visitor 1,000,000! Click to claim your prize!
                    </button>
                  </div>
                )}
              </div>
            )}

            {activePage.kind === "site" && isBroken && (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-xl flex items-center justify-center">
                  <span className="text-gray-400"><ImageIcon size={40} /></span>
                </div>
                <p className="text-gray-400 font-bold text-lg">This page didn&apos;t load correctly.</p>
                <p className="text-gray-400 text-sm max-w-xs">Try clicking the reload button in the toolbar.</p>
              </div>
            )}
          </div>
        )}

        {/* Cookie banner */}
        {cookieOpen && (
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 text-white p-4 flex flex-wrap items-center gap-3 animate-slide-up">
            <p className="flex-1 text-sm min-w-48 flex items-center gap-2"><CookieIcon size={18} className="shrink-0" /> This site uses cookies to remember your preferences. Do you accept?</p>
            <button onClick={acceptCookies} className="px-4 py-2 bg-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-500">Accept</button>
            <button onClick={declineCookies} className={`px-4 py-2 bg-white text-gray-900 rounded-lg font-bold text-sm ${hl("cookie-decline") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}>Decline</button>
          </div>
        )}

        {/* Cookie nudge */}
        {cookieNudge && (
          <div className="absolute bottom-0 left-0 right-0 bg-orange-100 border-t-2 border-orange-400 text-orange-800 px-4 py-3 text-center font-semibold text-sm animate-slide-up">
            You accepted! For this lesson, click Decline instead.
          </div>
        )}

        {/* Scam popup */}
        {popupOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30">
            <div className="bg-white border-4 border-red-500 rounded-xl shadow-2xl p-6 max-w-xs text-center relative animate-pop-in">
              <button onClick={closePopup} aria-label="Close popup" className={`absolute -top-3 -right-3 w-8 h-8 bg-white border-2 border-black rounded-full font-bold flex items-center justify-center ${hl("popup-close") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}>&times;</button>
              <p className="text-red-500 mb-2"><WarningIcon size={40} /></p>
              <p className="font-black text-red-600 text-lg">VIRUS DETECTED!!!</p>
              <p className="text-sm text-gray-700 my-2">Your computer is infected! Click below to clean it NOW!</p>
              <button onClick={clickCleanNow} className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg w-full hover:bg-red-600">CLEAN NOW</button>
            </div>
          </div>
        )}

        {/* Lock info popover */}
        {lockInfo && (
          <div className="absolute top-2 left-2 z-20 w-80 bg-white border-2 border-black rounded-lg shadow-xl p-4 animate-slide-down">
            {activePage.secure ? (
              <>
                <p className="font-bold text-green-700 flex items-center gap-2"><LockIcon size={18} /> This connection is encrypted.</p>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                  Nobody between you and <b>{activePage.url}</b> can read what you type — not the coffee-shop WiFi, not your internet provider.
                </p>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                  <b>But the lock does NOT mean the site itself is trustworthy</b> — the website still sees everything you enter. A scam site can have a lock too.
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-red-600 flex items-center gap-2"><WarningIcon size={18} /> This connection is NOT secure.</p>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                  Anything you type here could be read by others on the network. <b>Never enter passwords or card numbers on a page without the lock.</b>
                </p>
              </>
            )}
            <button onClick={closeLockGotIt} className={`mt-3 px-4 py-1.5 bg-gray-100 border-2 border-gray-300 rounded-lg font-semibold text-sm ${hl("lock-gotit") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}>Got it</button>
          </div>
        )}

        {/* History / Downloads / Reading List menus */}
        {menu && (
          <div className="absolute top-2 right-2 z-20 w-64 bg-white border-2 border-black rounded-lg shadow-xl overflow-hidden animate-slide-down">
            <p className="px-3 py-2 bg-gray-100 font-bold text-sm border-b border-gray-200">
              <span className="inline-flex items-center gap-1.5">{menu === "history" ? <><ClockIcon size={14} /> History</> : menu === "downloads" ? <><DownloadIcon size={14} /> Downloads</> : <><BookIcon size={14} /> Reading List</>}</span>
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
                      <span><FileDocIcon size={14} /></span>
                      <span className="font-medium flex-1">{d}</span>
                      <button
                        onClick={() => deleteDownload(d)}
                        aria-label={`Delete ${d}`}
                        className={`shrink-0 w-6 h-6 rounded flex items-center justify-center hover:bg-red-100 text-gray-500 hover:text-red-600 ${
                          hl("download-delete", d) ? "ring-4 ring-yellow-400 animate-pulse" : ""
                        }`}
                      >
                        <TrashIcon size={14} />
                      </button>
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
              <button onClick={confirmBookmark} className={`px-5 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-sm border-2 border-black ${hl("bookmark-add") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}>Add Bookmark</button>
            </div>
          </div>
        </div>
      )}

      {/* Second window */}
      {newWindow && (
        <div className="absolute inset-6 z-30 bg-white border-2 border-gray-800 rounded-lg shadow-2xl flex flex-col animate-pop-in">
          <div className="bg-gray-100 border-b-2 border-gray-800 px-3 py-2 flex items-center gap-2">
            <span className="font-bold text-sm flex items-center gap-1.5"><GlobeIcon size={16} />New Window</span>
            <div className="flex-1" />
            <WindowControls onClose={() => setNewWindow(false)} />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-4">
            <span className="text-gray-500"><WindowIcon size={48} /></span>
            <p className="font-bold text-lg">A brand-new browser window!</p>
            <p className="text-sm text-gray-600 max-w-xs">This window is completely separate — it can have its own tabs. Great for keeping work and shopping apart.</p>
          </div>
        </div>
      )}
    </SimulatorFrame>
  );
}

function ActionBtn({ label, icon, onClick, highlight }: { label: string; icon?: ReactNode; onClick: () => void; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md border-2 border-gray-300 bg-white font-semibold whitespace-nowrap hover:bg-gray-100 inline-flex items-center gap-1.5 ${
        highlight ? "ring-4 ring-yellow-400 animate-pulse border-yellow-400" : ""
      }`}
    >
      {icon}{label}
    </button>
  );
}
