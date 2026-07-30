"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import SimulatorFrame from "./SimulatorFrame";
import { useStepRunner, type SimMode } from "./useStepRunner";
import WindowControls from "./WindowControls";
import {
  PlusIcon, SearchIcon, CartIcon, BookIcon, BookClosedIcon, ClockIcon,
  DownloadIcon, WindowIcon, LockIcon, WarningIcon, StarIcon,
  StarFilledIcon, GlobeIcon, FileDocIcon, TrashIcon,
  ImageIcon, ReloadIcon, HeartIcon,
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
    | "delete-download"
    | "open-download";
  url?: string;
  title?: string;
  query?: string;
  reveal?: string;
  file?: string;
  page?: string;
};

interface GuidedBrowserTaskProps {
  goal: string;
  steps: GuidedBrowserStep[];
  initialDownloads?: string[];
  mode?: SimMode;
  hint?: string;
  freePlay?: boolean;
  onResult: (success: boolean, failMessage?: string) => void;
}

type PageId = "newtab" | "shop" | "google" | "wikipedia" | "weather" | "news" | "recipes" | "freegames"
  | "library" | "transit" | "garden" | "petnews" | "bank" | "bookshop" | "support";

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
  library: { title: "City Library", url: "citylibrary.example", secure: true, icon: <BookClosedIcon size={16} />, kind: "site", body: "Search our catalog, reserve books, renew loans, and find upcoming events. Open Monday–Saturday, 9 am–6 pm. Over 80,000 titles available online." },
  transit: { title: "City Transit", url: "citytransit.example", secure: true, icon: <ClockIcon size={16} />, kind: "site", body: "Route 12 — Downtown to Airport: 7:00 am · 8:15 am · 9:30 am · 10:45 am · 12:00 pm · 1:15 pm · 2:30 pm · 3:45 pm · 5:00 pm · Last bus 10:00 pm. Tickets: Adult $2.50 · Senior/Student $1.25 · Children under 5 free." },
  garden: { title: "Gardening Tips", url: "gardeningtips.example", secure: true, icon: <GlobeIcon size={16} />, kind: "site", body: "How to Grow Tomatoes at Home — plant in full sun, water deeply twice a week, and stake tall varieties. Most common mistake: overwatering in cool weather. Check back daily for seasonal guides." },
  petnews: { title: "Pet News Daily", url: "petnews.example", secure: true, icon: <HeartIcon size={16} />, kind: "site", body: "Dog Wins National Frisbee Championship · Scientists Confirm Cats Nap 16 Hours a Day · Local Shelter Adopts Out 200 Animals This Month. Subscribe for daily updates." },
  bank: { title: "First National Bank", url: "firstbank.example", secure: true, icon: <LockIcon size={16} />, kind: "site", body: "Online banking — check your balance, pay bills, and transfer funds securely. Your data is protected with 256-bit encryption. Never share your password." },
  bookshop: { title: "Book Shop", url: "bookshop.example", secure: true, icon: <BookClosedIcon size={16} />, kind: "site", body: "Best-selling novels, cookbooks, children's books and more. New arrivals every week. Free shipping on orders over $35.", ads: true },
  support: { title: "Computer Support", url: "support.example", secure: true, icon: <GlobeIcon size={16} />, kind: "site", body: "Search for your error code below to find a solution. Common fixes: restart the app, check for updates, or reinstall. For hardware issues, contact your manufacturer." },
};

const URL_TO_PAGE: Record<string, PageId> = Object.fromEntries(
  (Object.keys(PAGES) as PageId[]).filter((id) => PAGES[id].url).map((id) => [PAGES[id].url, id])
) as Record<string, PageId>;

const TITLE_TO_PAGE: Partial<Record<string, PageId>> = {};
for (const id of Object.keys(PAGES) as PageId[]) {
  TITLE_TO_PAGE[PAGES[id].title] = id;
}

// Every legitimate site is reachable from the new-tab page. A learner asked to put
// "the bus timetable on screen" must be able to FIND citytransit.example, not recall
// it — an assessment that hides a fictional domain tests memory, not browsing.
// freegames (the scam site) stays off deliberately: lessons navigate to it on
// purpose, and it does not belong in a list of favorites.
const FAVORITES: PageId[] = [
  "shop", "google", "wikipedia", "weather", "news", "recipes",
  "library", "bookshop", "transit", "garden", "petnews", "bank", "support",
];

/**
 * A picture on a practice web page.
 *
 * Every site in here used to be a heading and a paragraph, with the occasional
 * icon in a pastel box standing in for a photograph. Real sites are mostly
 * pictures, and a learner practicing "read the address, not the design" should
 * be looking at something that resembles what they will actually meet.
 *
 * All of it is drawn by `scripts/generate-photos.mjs` and served from this
 * origin — nothing here reaches out to another host, which is the claim
 * `hostile-check` exists to defend.
 */
function SiteImg({
  src, alt = "", w, h, fit = "cover", className = "",
}: { src: string; alt?: string; w: number; h: number; fit?: "cover" | "contain"; className?: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={w}
      height={h}
      className={`${fit === "cover" ? "object-cover" : "object-contain"} ${className}`}
      // Decorative page furniture: it must never delay the control the step
      // is asking the learner to click.
      loading="lazy"
    />
  );
}

/** Rich page bodies — rendered instead of the plain {title + body} block. */
const PAGE_CONTENT: Partial<Record<PageId, ReactNode>> = {
  petnews: (
    <div className="space-y-3">
      <div className="border-b-2 border-gray-800 pb-2">
        <h1 className="text-2xl font-black tracking-tight">Pet News Daily</h1>
        <nav className="flex gap-4 text-xs font-semibold text-gray-500 mt-1">
          {["Home", "Dogs", "Cats", "Birds", "Local"].map((n) => (
            <span key={n} className={n === "Home" ? "text-orange-600 underline" : "cursor-pointer hover:underline"}>{n}</span>
          ))}
        </nav>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-3">
            {/* Width-capped, not height-cropped. The dog stands in the lower
                third of this photo: a letterbox band gives you an empty field,
                and anchoring it low gives you four legs. */}
            <SiteImg src="/photos/dog-field.webp" w={450} h={300} className="w-full max-w-[300px] h-auto rounded-lg mb-2" />
            <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-1.5 py-0.5 rounded">TOP STORY</span>
            <h2 className="text-base font-bold mt-1 leading-tight">Dog Wins National Frisbee Championship for Third Year Running</h2>
            <p className="text-xs text-gray-500 mt-1">By our Sports Correspondent · 2 hours ago</p>
            <p className="text-sm text-gray-700 mt-2 leading-relaxed">Biscuit, a four-year-old Golden Retriever from Maplewood, leapt twenty feet and caught the disc before it cleared the fence. The crowd erupted.</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <SiteImg src="/photos/cat-sleeping.webp" w={320} h={214} className="w-full h-20" />
            <div className="p-2">
              <h3 className="text-xs font-bold leading-tight">Scientists Confirm Cats Nap 16 Hours a Day</h3>
              <p className="text-xs text-gray-500 mt-0.5">4 hours ago</p>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-2">
            <h3 className="text-xs font-bold leading-tight">Local Shelter Adopts Out 200 Animals This Month</h3>
            <p className="text-xs text-gray-500 mt-0.5">Yesterday</p>
          </div>
          <div className="border border-gray-100 rounded-lg p-2 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 sim-dark:text-gray-400 mb-1">MOST READ</p>
            <ol className="text-xs text-blue-700 space-y-0.5 list-decimal list-inside">
              <li>Why dogs tilt their head</li>
              <li>Hamster wins obstacle course</li>
              <li>Cat refuses apology</li>
            </ol>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500 sim-dark:text-gray-400 border-t border-gray-100 pt-2">petnews.example · All content fictional · Subscribe for daily updates</p>
    </div>
  ),
  shop: (
    <div className="space-y-3">
      <div className="bg-blue-600 text-white rounded-lg p-3 text-center">
        <p className="font-black text-lg">Today&apos;s Deals</p>
        <p className="text-sm opacity-90">Laptops from $299 · Free shipping on orders over $50</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { name: "Laptops", sub: "Starting at $299", img: "/site/product-laptop.webp", border: "border-blue-100" },
          { name: "Tablets", sub: "Starting at $199", img: "/site/product-tablet.webp", border: "border-green-100" },
          { name: "Phones", sub: "Starting at $399", img: "/site/product-phone.webp", border: "border-pink-100" },
          { name: "Headphones", sub: "Starting at $49", img: "/site/product-headphones.webp", border: "border-yellow-100" },
        ].map((cat) => (
          <div key={cat.name} className={`flex items-center gap-2 border ${cat.border} rounded-lg p-2 cursor-pointer hover:brightness-95`}>
            <SiteImg src={cat.img} w={180} h={120} fit="contain" className="w-16 h-16 rounded shrink-0 bg-white/60" />
            <div className="min-w-0">
              <p className="font-bold text-sm">{cat.name}</p>
              <p className="text-xs text-gray-600">{cat.sub}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="border border-gray-200 rounded-lg p-3">
        <p className="text-xs font-semibold text-gray-500 sim-dark:text-gray-400 mb-2">FEATURED PRODUCT</p>
        <div className="flex gap-3 items-center">
          <SiteImg src="/site/product-laptop.webp" w={168} h={112} fit="contain" className="w-14 h-14 rounded-lg shrink-0 bg-gray-50" />
          <div className="min-w-0">
            <p className="font-bold text-sm">UltraBook Pro 14</p>
            <p className="text-xs text-gray-500">8 GB RAM · 256 GB SSD · All-day battery</p>
            <p className="font-black text-blue-600 text-sm mt-0.5">$349 <span className="line-through text-gray-500 sim-dark:text-gray-400 font-normal text-xs">$499</span></p>
          </div>
          <div className="shrink-0 bg-blue-600 text-white text-xs font-bold rounded-lg px-2 py-1">Add</div>
        </div>
      </div>
    </div>
  ),
  wikipedia: (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b pb-2">
        <span className="font-black text-lg italic">Wikipedia</span>
        <span className="text-xs text-gray-500">The Free Encyclopedia</span>
      </div>
      <h1 className="text-2xl font-bold">Computer</h1>
      <p className="text-xs text-gray-500 italic mb-1">From Wikipedia, the free encyclopedia</p>
      {/* The infobox picture, floated the way an encyclopedia article floats it. */}
      <figure className="float-right ml-3 mb-2 w-32 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
        <SiteImg src="/photos/desk.webp" w={256} h={170} className="w-full h-20" />
        <figcaption className="text-[10px] text-gray-500 px-1.5 py-1 leading-tight">A desktop computer in a home office</figcaption>
      </figure>
      <p className="text-sm text-gray-700 leading-relaxed">A <strong>computer</strong> is an electronic device that processes information according to a set of instructions called a program. Modern computers can perform billions of operations per second and are used in nearly every field of human activity.</p>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs">
        <p className="font-semibold mb-1">Contents</p>
        <ol className="list-decimal list-inside text-blue-700 space-y-0.5">
          <li>History</li>
          <li>How computers work</li>
          <li>Types of computers</li>
          <li>Uses in everyday life</li>
        </ol>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">The word &quot;computer&quot; originally referred to a person who performed calculations by hand. The first programmable electronic computer, ENIAC, was completed in 1945 and filled an entire room.</p>
      <p className="text-xs text-gray-500 sim-dark:text-gray-400 border-t pt-2">Content available under CC BY-SA 4.0 · wikipedia.org · 6,782,345 articles in English</p>
    </div>
  ),
  weather: (
    <div className="space-y-3">
      <div className="rounded-xl p-4 text-white" style={{ background: "linear-gradient(135deg,#3b82f6,#38bdf8)" }}>
        <p className="text-xs font-semibold opacity-80 uppercase tracking-wide">Your Location · Today</p>
        <div className="flex items-end gap-3 mt-1">
          <p className="text-5xl font-black leading-none">72°</p>
          <div>
            <p className="font-bold text-lg leading-tight">Sunny</p>
            <p className="text-sm opacity-80">Feels like 74° · UV: High</p>
          </div>
        </div>
        <p className="text-xs mt-2 opacity-70">H: 76° · L: 58° · Wind: 8 mph W · Humidity: 42%</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 sim-dark:text-gray-400 mb-1.5 uppercase tracking-wide">Hourly Forecast</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[["9 AM","70°"],["10 AM","72°"],["11 AM","74°"],["12 PM","76°"],["1 PM","75°"],["2 PM","73°"]].map(([h, t]) => (
            <div key={h} className="flex flex-col items-center shrink-0 text-xs bg-blue-50 border border-blue-100 rounded-lg px-2 py-1.5">
              <span className="text-gray-500">{h}</span>
              <span className="font-bold text-gray-800 mt-0.5">{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 sim-dark:text-gray-400 mb-1.5 uppercase tracking-wide">This Week</p>
        <div className="grid grid-cols-5 gap-1 text-xs text-center">
          {[["Mon","74°","58°"],["Tue","68°","55°"],["Wed","63°","52°"],["Thu","70°","57°"],["Fri","75°","60°"]].map(([d, h, l]) => (
            <div key={d} className="bg-gray-50 border border-gray-100 rounded-lg p-1.5">
              <p className="font-semibold text-gray-500">{d}</p>
              <p className="font-bold text-gray-800">{h}</p>
              <p className="text-gray-500 sim-dark:text-gray-400">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
  news: (
    <div className="space-y-3">
      <div className="border-b-2 border-gray-800 pb-2">
        <h1 className="text-xl font-black tracking-tight">Daily News</h1>
        <p className="text-xs text-gray-500 mt-0.5">dailynews.example · Your trusted local source</p>
      </div>
      <div>
        <span className="text-xs bg-red-100 text-red-700 font-semibold px-1.5 py-0.5 rounded">TOP STORY</span>
        <h2 className="text-lg font-bold mt-1 leading-tight">10 Easy Soup Recipes for a Cozy Winter</h2>
        <p className="text-xs text-gray-500 mt-0.5">By J. Andrews, Food Editor · Today</p>
        <SiteImg src="/site/soup-bowl.webp" w={450} h={300} className="w-full max-w-[260px] h-auto rounded-lg mt-2" />
        <p className="text-sm text-gray-700 mt-2 leading-relaxed">As temperatures drop, there is nothing more comforting than a bowl of homemade soup. We have tested dozens of recipes so you don&apos;t have to. From a classic tomato to a hearty minestrone, every one of these takes under an hour.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="border border-gray-200 rounded-lg p-2">
          <p className="font-bold text-sm leading-tight">Council Approves New Library Wing</p>
          <p className="text-gray-500 mt-0.5">Politics · 3 hours ago</p>
        </div>
        <div className="border border-gray-200 rounded-lg p-2">
          <p className="font-bold text-sm leading-tight">Local Artist Opens Garden Studio</p>
          <p className="text-gray-500 mt-0.5">Arts · Yesterday</p>
        </div>
      </div>
    </div>
  ),
  recipes: (
    <div className="space-y-3">
      <div className="border-b pb-2">
        <h1 className="text-xl font-black">Recipe Box</h1>
        <p className="text-xs text-gray-500">Home-tested recipes, every week</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">FEATURED RECIPE</span>
        <h2 className="text-lg font-bold mt-1">Grandma&apos;s Classic Apple Pie</h2>
        <p className="text-xs text-gray-500">By R. Thompson · Prep: 30 min · Bake: 55 min · Serves 8</p>
        <SiteImg src="/site/apple-pie.webp" w={450} h={300} className="w-full max-w-[260px] h-auto rounded-lg mt-2" />
        <p className="text-sm text-gray-700 mt-2 leading-relaxed">The flakiest crust you will ever make, filled with warm cinnamon apples. This recipe has been in the family for over sixty years.</p>
        <div className="mt-2 text-xs">
          <p className="font-semibold mb-1 text-gray-700">Ingredients (partial):</p>
          <ul className="list-disc list-inside text-gray-600 space-y-0.5">
            <li>6 medium apples, peeled and sliced</li>
            <li>1 cup sugar, 1 tsp cinnamon</li>
            <li>Butter pastry for two-crust pie</li>
          </ul>
        </div>
      </div>
      <p className="text-xs text-gray-500">Download the full recipe with step-by-step instructions:</p>
    </div>
  ),
  freegames: (
    <div className="space-y-2">
      <div className="rounded-xl p-3 text-center text-white" style={{ background: "linear-gradient(135deg,#eab308,#ef4444)" }}>
        <h1 className="text-2xl font-black">Free Games!!!</h1>
        <p className="text-sm opacity-90">Play 1000s of FREE games! No download needed!!!</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {["Bubble Pop Mania", "Super Clicker 3", "Money Rain", "Lucky Spinner"].map((g) => (
          <div key={g} className="border-2 border-dashed border-yellow-400 rounded-lg p-2 bg-yellow-50">
            <p className="font-bold text-sm">{g}</p>
            <p className="text-xs text-gray-500">Free · Rated 4.9 stars</p>
            <div className="mt-1.5 bg-green-700 text-white text-xs font-black text-center rounded py-0.5">PLAY NOW</div>
          </div>
        ))}
      </div>
    </div>
  ),
  library: (
    <div className="space-y-3">
      <div className="rounded-lg overflow-hidden">
        <div className="relative">
          <SiteImg src="/photos/bookshelf.webp" w={720} h={200} className="w-full h-20" />
          <div className="absolute inset-0 flex flex-col justify-center px-3" style={{ background: "linear-gradient(90deg,rgba(69,26,3,0.88),rgba(69,26,3,0.35))" }}>
            <h1 className="font-black text-lg text-white">City Library</h1>
            <p className="text-xs text-white/90">citylibrary.example</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 border border-gray-300 rounded-full px-3 py-1.5">
        <SearchIcon size={14} />
        <span className="text-sm text-gray-500 sim-dark:text-gray-400 flex-1">Search by title, author, or keyword…</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          <p className="font-bold text-amber-800 mb-1">New Arrivals</p>
          <ul className="text-gray-700 space-y-0.5">
            <li>The Maplewood Gardener</li>
            <li>Understanding Your Computer</li>
            <li>Soup Through the Ages</li>
          </ul>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5">
          <p className="font-bold text-blue-800 mb-1">Hours</p>
          <ul className="text-gray-700 space-y-0.5">
            <li>Mon–Fri: 9 am – 8 pm</li>
            <li>Saturday: 9 am – 6 pm</li>
            <li>Sunday: Closed</li>
          </ul>
        </div>
      </div>
      <p className="text-xs text-gray-500 sim-dark:text-gray-400 text-center">Over 80,000 titles · Free membership · citylibrary.example</p>
    </div>
  ),
  transit: (
    <div className="space-y-3">
      <div className="rounded-lg overflow-hidden">
        <div className="relative">
          <SiteImg src="/site/city-bus.webp" w={720} h={200} className="w-full h-20" />
          <div className="absolute inset-0 flex flex-col justify-center px-3" style={{ background: "linear-gradient(90deg,rgba(15,40,95,0.9),rgba(15,40,95,0.25))" }}>
            <h1 className="font-black text-lg text-white">City Transit</h1>
            <p className="text-xs text-white/90">citytransit.example · Live schedules</p>
          </div>
        </div>
      </div>
      <div>
        <h2 className="font-bold text-sm mb-1">Route 12 — Downtown to Airport</h2>
        <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
          <div className="grid grid-cols-3 bg-gray-100 px-3 py-1.5 font-semibold text-gray-600 text-xs">
            <span>Departs</span><span>Midtown</span><span>Airport</span>
          </div>
          {[["7:00 am","7:22 am","7:45 am"],["8:15 am","8:37 am","9:00 am"],["9:30 am","9:52 am","10:15 am"],["10:45 am","11:07 am","11:30 am"],["12:00 pm","12:22 pm","12:45 pm"],["1:15 pm","1:37 pm","2:00 pm"],["2:30 pm","2:52 pm","3:15 pm"],["3:45 pm","4:07 pm","4:30 pm"],["5:00 pm","5:22 pm","5:45 pm"],["10:00 pm","10:22 pm","10:45 pm"]].map(([dep, mid, arr]) => (
            <div key={dep} className="grid grid-cols-3 px-3 py-1.5 border-t border-gray-100 hover:bg-gray-50">
              <span className="font-medium">{dep}</span><span className="text-gray-500">{mid}</span><span>{arr}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs">
        <p className="font-semibold mb-0.5">Fares</p>
        <p className="text-gray-700">Adult: $2.50 · Senior/Student: $1.25 · Children under 5: Free</p>
        <p className="text-gray-500 sim-dark:text-gray-400 mt-1">Buy a 10-trip book and save 20%</p>
      </div>
    </div>
  ),
  garden: (
    <div className="space-y-3">
      <div className="rounded-lg p-3 text-white" style={{ background: "#166534" }}>
        <h1 className="font-black text-lg">Gardening Tips</h1>
        <p className="text-xs opacity-80">gardeningtips.example</p>
      </div>
      <article className="space-y-2.5">
        <h2 className="text-xl font-bold">When to Plant Tomatoes</h2>
        <p className="text-xs text-gray-500">By M. Chen, Gardening Editor · 15 min read</p>
        <SiteImg src="/site/tomato-plant.webp" w={450} h={300} className="w-full max-w-[260px] h-auto rounded-lg" />
        <p className="text-sm text-gray-700 leading-relaxed">Tomatoes are the most rewarding vegetables a home gardener can grow — but also the most common source of frustration when planted too early or in the wrong spot.</p>
        <p className="text-sm text-gray-700 leading-relaxed"><strong>Wait for the last frost.</strong> Do not put tomato seedlings outside until all risk of frost has passed and the soil is above 60°F. In most gardens this means late spring.</p>
        <p className="text-sm text-gray-700 leading-relaxed"><strong>Choose a sunny spot.</strong> Tomatoes need at least six hours of direct sun per day. Less than that and you will get leaves, not fruit.</p>
        <p className="text-sm text-gray-700 leading-relaxed"><strong>Water deeply, not often.</strong> Water twice a week and let the top inch of soil dry out between sessions. The most common mistake is overwatering in cool weather.</p>
        <p className="text-sm text-gray-700 leading-relaxed"><strong>Stake early.</strong> Put the stake in at planting time, before the roots establish, to avoid damaging them later.</p>
      </article>
      <p className="text-xs text-gray-500 sim-dark:text-gray-400 border-t pt-2">gardeningtips.example · Check back daily for seasonal guides</p>
    </div>
  ),
  bank: (
    <div className="space-y-3">
      <div className="rounded-lg p-3 text-white flex items-center gap-2" style={{ background: "#1e3a5f" }}>
        <LockIcon size={18} />
        <div>
          <h1 className="font-black text-base leading-tight">First National Bank</h1>
          <p className="text-xs opacity-80">Secure Online Banking</p>
        </div>
      </div>
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <h2 className="font-bold text-center text-gray-800 text-sm">Sign In to Your Account</h2>
        <div className="space-y-2">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-0.5">Username</p>
            <div className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 sim-dark:text-gray-400">Enter username</div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-0.5">Password</p>
            <div className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 sim-dark:text-gray-400">••••••••</div>
          </div>
          <div className="w-full bg-blue-700 text-white text-center rounded-lg py-2 font-bold text-sm cursor-pointer hover:bg-blue-800">Sign In</div>
        </div>
      </div>
      <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2 text-xs">
        <LockIcon size={12} />
        <p className="text-green-800">Your connection to firstbank.example is secure and encrypted.</p>
      </div>
    </div>
  ),
  bookshop: (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b pb-2">
        <BookClosedIcon size={20} />
        <h1 className="font-black text-lg">Book Shop</h1>
        <span className="ml-auto text-xs text-gray-500 sim-dark:text-gray-400">Free shipping over $35</span>
      </div>
      <p className="text-xs font-semibold text-gray-500 sim-dark:text-gray-400 uppercase tracking-wide">New Arrivals</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { title: "The Maplewood Gardener", author: "M. Chen", price: "$16.99", cover: "/site/cover-garden.webp" },
          { title: "Understanding Your Computer", author: "Dr. D.", price: "$24.99", cover: "/site/cover-computer.webp" },
          { title: "101 Soup Recipes", author: "J. Andrews", price: "$22.99", cover: "/site/cover-soup.webp" },
          { title: "Walks Around the World", author: "P. Rivera", price: "$19.99", cover: "/site/cover-walks.webp" },
        ].map((b) => (
          <div key={b.title} className="border border-gray-200 rounded-lg p-2 hover:bg-gray-50 cursor-pointer">
            <SiteImg src={b.cover} w={126} h={186} className="h-20 w-auto rounded shadow-sm mx-auto mb-2" />
            <p className="text-xs font-bold leading-tight">{b.title}</p>
            <p className="text-xs text-gray-500">{b.author}</p>
            <p className="text-xs font-black text-blue-700 mt-0.5">{b.price}</p>
          </div>
        ))}
      </div>
    </div>
  ),
  support: (
    <div className="space-y-3">
      <div className="rounded-lg p-3 text-white" style={{ background: "#374151" }}>
        <h1 className="font-bold">Computer Support</h1>
        <p className="text-xs opacity-70">Find solutions to common problems</p>
      </div>
      <div className="flex items-center gap-2 border-2 border-gray-300 rounded-full px-3 py-1.5 focus-within:border-blue-500">
        <SearchIcon size={14} />
        <span className="text-sm text-gray-500 sim-dark:text-gray-400 flex-1">Enter an error code or describe the problem…</span>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 sim-dark:text-gray-400 uppercase tracking-wide mb-1.5">Common Solutions</p>
        <div className="space-y-1.5">
          {[
            { code: "ERR_04", desc: "App not responding — force quit and reopen" },
            { code: "ERR_07", desc: "No internet connection — check WiFi settings" },
            { code: "ERR_12", desc: "Not enough storage — delete unused files" },
            { code: "ERR_19", desc: "Printer offline — restart the printer" },
          ].map((e) => (
            <div key={e.code} className="flex items-start gap-2 border border-gray-200 rounded-lg p-2 text-xs hover:bg-gray-50">
              <span className="font-black text-red-700 sim-dark:text-red-400 shrink-0">{e.code}</span>
              <span className="text-gray-700">{e.desc}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-center text-blue-800">
        <p className="font-semibold">Still stuck? Call support: 1-800-555-0100</p>
        <p className="text-blue-600">Mon–Fri, 9 am – 5 pm</p>
      </div>
    </div>
  ),
};

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

export default function GuidedBrowserTask({ goal, steps, initialDownloads, mode = "guided", hint, freePlay, onResult }: GuidedBrowserTaskProps) {
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
  const [loading, setLoading] = useState(false);
  const [pdfViewer, setPdfViewer] = useState<string | null>(null);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [adNudge, setAdNudge] = useState(false);
  const [unknownUrl, setUnknownUrl] = useState("");

  const { step, stepIndex, finished, done, flash, phase, setPhase, tryStep, wanted, objectives } =
    useStepRunner({
      steps,
      mode,
      onResult,
      onStepComplete: () => {
        setEditing(false);
        setBookmarkSheet(false);
        setSearchInput("");
        setCookieNudge(false);
      },
    });

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
        // The download rows only exist while the Downloads panel is open. With it
        // closed, the ring pointed at nothing and the learner had no glow at all —
        // the way forward is the Downloads button that opens the panel.
        if (menu !== "downloads") return kind === "downloads-btn";
        return kind === "download-delete" && name === step.file;
      case "open-download":
        if (menu !== "downloads") return kind === "downloads-btn";
        return kind === "download-open" && name === step.file;
      default:
        return false;
    }
  }

  function navigate(pageId: PageId, skipDelay?: boolean) {
    setLoading(true);
    const applyNav = () => {
      setLoading(false);
      setTabs((prev) => prev.map((t) => (t.id === activeId ? { ...t, pageId, zoom: 100, back: [...t.back, t.pageId], fwd: [] } : t)));
      setHistory((prev) => [...prev, pageId]);
      setEditing(false);
      setLockInfo(false);
      setMenu(null);
      setSearchResults(null);
      setSearchInput("");
      setUnknownUrl("");
      const pageIsBroken = brokenPages.has(pageId);
      setCookieOpen(!pageIsBroken && !!PAGES[pageId].cookie);
      setPopupOpen(!pageIsBroken && !!PAGES[pageId].popup);
      tryStep((s) => s.action === "navigate" && !!s.url && normUrl(PAGES[pageId].url) === normUrl(s.url));
      tryStep((s) => s.action === "history-visit" && PAGES[pageId].title === s.title, phase === 1);
    };
    if (skipDelay) { applyNav(); return; }
    setTimeout(applyNav, 250);
  }

  function submitAddress() {
    const pageId = URL_TO_PAGE[normUrl(draft)];
    if (pageId) {
      navigate(pageId);
    } else if (draft.trim()) {
      setUnknownUrl(normUrl(draft));
      setEditing(false);
      setMenu(null);
      setSearchResults(null);
    } else {
      setDraft("");
    }
  }

  function newTab() {
    const id = "t" + Date.now();
    setTabs((prev) => [...prev, { id, pageId: "newtab", zoom: 100, back: [], fwd: [] }]);
    setActiveId(id);
    setMenu(null);
    tryStep((s) => s.action === "new-tab");
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
    tryStep((s) => s.action === "close-tab" && title === s.title);
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
        tryStep((s) => s.action === "reload");
      }, 400);
      return;
    }
    tryStep((s) => s.action === "reload");
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
    tryStep((s) => s.action === "bookmark", phase === 1);
  }

  function addReadingList() {
    setReadingList((prev) => (prev.includes(activeTab.pageId) ? prev : [...prev, activeTab.pageId]));
    setMenu("readinglist");
    tryStep((s) => s.action === "reading-list-add");
  }

  function clickHistoryBtn() {
    setMenu(menu === "history" ? null : "history");
    if (step?.action === "history-visit" && phase === 0) setPhase(1);
  }

  function clickDownloadsBtn() {
    setMenu(menu === "downloads" ? null : "downloads");
    tryStep((s) => s.action === "open-downloads");
  }

  function clickDownloadLink() {
    if (!activePage.download) return;
    setDownloads((prev) => (prev.includes(activePage.download!) ? prev : [...prev, activePage.download!]));
    tryStep((s) => s.action === "download");
  }

  function clickLock() {
    setLockInfo(true);
  }

  function closeLockGotIt() {
    setLockInfo(false);
    tryStep((s) => s.action === "lock-click");
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
    tryStep((s) => s.action === "cookie-decline");
  }

  function closePopup() {
    setPopupOpen(false);
    tryStep((s) => s.action === "close-popup");
  }

  function clickCleanNow() {
    setDownloads((prev) => [...prev, "SystemCleaner.exe"]);
    setPopupOpen(false);
    onResult(false, "That button was the scam! It downloaded a fake ‘cleaner’ program. On the next try, close the popup with the ✕ instead — and remember: if you ever click one by accident, delete the download immediately and never open it.");
  }

  function deleteDownload(file: string) {
    setDownloads((prev) => prev.filter((d) => d !== file));
    tryStep((s) => s.action === "delete-download" && s.file === file);
  }

  function openDownload(file: string) {
    setPdfViewer(file);
    setPdfZoom(100);
    setMenu(null);
    tryStep((s) => s.action === "open-download" && s.file === file);
  }

  function zoomIn() {
    const z = Math.min(activeTab.zoom + 25, 200);
    setTabs((prev) => prev.map((t) => (t.id === activeId ? { ...t, zoom: z } : t)));
    if (z >= 150) tryStep((s) => s.action === "zoom-in");
  }

  function zoomOut() {
    const z = Math.max(activeTab.zoom - 25, 50);
    setTabs((prev) => prev.map((t) => (t.id === activeId ? { ...t, zoom: z } : t)));
  }

  function submitSearch() {
    if (!searchInput.trim()) return;
    const q = searchInput.trim();
    const revealTitle = wanted((s) => s.action === "search" && !!s.reveal)?.reveal ?? "Recipe Box";
    setSearchResults([
      { title: revealTitle, snippet: `Top result for “${q}”` },
      { title: "Wikipedia", snippet: `${q} — encyclopedia article` },
    ]);
    tryStep((s) => s.action === "search");
  }

  function openSearchResult(title: string) {
    const pageId = TITLE_TO_PAGE[title];
    if (pageId) {
      navigate(pageId);
      setSearchResults(null);
    }
    tryStep((s) => s.action === "open-result" && s.title === title);
  }

  function clickAd() {
    if (mode === "assessment") {
      onResult(false, "That was an ad pretending to be a download button — real download links are in the page content, not in flashy boxes.");
    } else {
      setAdNudge(true);
      setTimeout(() => setAdNudge(false), 3000);
    }
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
      objectives={objectives}
      hint={hint}
      freePlay={freePlay}
    >
      {/* Tab strip */}
      <div className="shrink-0 bg-gray-200 sim-dark:bg-gray-900 border-b-2 border-gray-300 sim-dark:border-gray-700 flex items-stretch gap-1 px-2 pt-2">
        {tabs.map((t) => {
          const p = PAGES[t.pageId];
          const active = t.id === activeId;
          return (
            <div
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-2 border-b-0 cursor-pointer max-w-44 ${
                active ? "bg-white sim-dark:bg-gray-800 border-black sim-dark:border-gray-400" : "bg-gray-100 sim-dark:bg-gray-900 border-gray-400 sim-dark:border-gray-600"
              }`}
            >
              <span>{p.icon}</span>
              <span className="text-sm font-semibold truncate flex-1">{p.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                aria-label={`Close ${p.title} tab`}
                className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-gray-600 sim-dark:text-gray-300 hover:bg-gray-300 sim-dark:hover:bg-gray-700 ${
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
          className={`px-3 py-1.5 text-lg font-bold text-gray-600 sim-dark:text-gray-300 hover:bg-gray-100 sim-dark:hover:bg-gray-800 rounded-t-lg ${
            hl("newtab-btn") ? "ring-4 ring-yellow-400 animate-pulse" : ""
          }`}
        >
          +
        </button>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 bg-gray-100 sim-dark:bg-gray-800 border-b-2 border-black sim-dark:border-gray-600 flex items-center gap-2 px-3 py-2">
        <button onClick={goBack} disabled={activeTab.back.length === 0} aria-label="Go back" className={`text-xl px-1 rounded ${activeTab.back.length === 0 ? "text-gray-300 sim-dark:text-gray-600 cursor-default" : "text-gray-700 sim-dark:text-gray-200 hover:bg-gray-200 sim-dark:hover:bg-gray-700"}`}>‹</button>
        <button onClick={goForward} disabled={activeTab.fwd.length === 0} aria-label="Go forward" className={`text-xl px-1 rounded ${activeTab.fwd.length === 0 ? "text-gray-300 sim-dark:text-gray-600 cursor-default" : "text-gray-700 sim-dark:text-gray-200 hover:bg-gray-200 sim-dark:hover:bg-gray-700"}`}>›</button>
        <button onClick={reload} aria-label="Reload" className={`px-1 rounded hover:bg-gray-200 sim-dark:hover:bg-gray-700 ${hl("reload-btn") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}><ReloadIcon size={18} /></button>
        {/* Address bar */}
        <div
          onClick={() => { setEditing(true); setDraft(activePage.url); }}
          className={`flex-1 flex items-center gap-2 bg-white sim-dark:bg-gray-900 border-2 rounded-lg px-3 py-1.5 cursor-text ${
            hl("address") ? "border-yellow-400 ring-4 ring-yellow-300 animate-pulse" : "border-gray-400 sim-dark:border-gray-600"
          }`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); if (activePage.url) clickLock(); }}
            aria-label="Site security"
            className={`shrink-0 ${hl("lock-btn") ? "ring-4 ring-yellow-400 animate-pulse rounded" : ""}`}
          >
            {activePage.url ? (activePage.secure ? <LockIcon size={16} /> : <WarningIcon size={16} className="text-red-700 sim-dark:text-red-400" />) : null}
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
                className="flex-1 outline-none text-base sim-dark:bg-gray-900 sim-dark:text-gray-100 sim-dark:placeholder-gray-400"
              />
              <button onClick={(e) => { e.stopPropagation(); submitAddress(); }} className="shrink-0 px-3 py-0.5 bg-blue-600 text-white text-sm font-bold rounded-md border border-black sim-dark:border-gray-500">Go →</button>
            </>
          ) : (
            <span className={`flex-1 text-base ${activePage.url ? "" : "text-gray-500 sim-dark:text-gray-400"}`}>
              {activePage.url || "Type a website address"}
              {!activePage.secure && activePage.url && <span className="text-red-700 sim-dark:text-red-400 font-semibold text-sm ml-2">Not Secure</span>}
            </span>
          )}
        </div>
        <button onClick={clickBookmarkStar} aria-label="Bookmark this page" className={`text-lg px-1 rounded hover:bg-gray-200 sim-dark:hover:bg-gray-700 ${hl("bookmark-btn") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}>
          {bookmarks.includes(activeTab.pageId) ? <StarFilledIcon size={18} className="text-amber-700 sim-dark:text-yellow-400" /> : <StarIcon size={18} />}
        </button>
      </div>

      {/* Action bar */}
      <div className="shrink-0 bg-gray-50 sim-dark:bg-gray-800 border-b-2 border-gray-300 sim-dark:border-gray-700 flex items-center flex-wrap gap-1.5 px-3 py-1.5 text-sm">
        <ActionBtn label="Reading List" icon={<BookIcon size={14} />} onClick={addReadingList} highlight={hl("readinglist-btn")} />
        <ActionBtn label="History" icon={<ClockIcon size={14} />} onClick={clickHistoryBtn} highlight={hl("history-btn")} />
        <ActionBtn label="Downloads" icon={<DownloadIcon size={14} />} onClick={clickDownloadsBtn} highlight={hl("downloads-btn")} />
        <ActionBtn label="New Window" icon={<WindowIcon size={14} />} onClick={() => { setNewWindow(true); tryStep((s) => s.action === "new-window"); }} highlight={hl("newwindow-btn")} />
        <div className="flex-1" />
        <div className="flex items-center border-2 border-gray-400 sim-dark:border-gray-600 rounded-lg overflow-hidden">
          <button onClick={zoomOut} aria-label="Zoom out" className="px-2 text-gray-600 sim-dark:text-gray-300 hover:bg-gray-200 sim-dark:hover:bg-gray-700">−</button>
          <span className="px-2 border-x-2 border-gray-300 sim-dark:border-gray-700 font-semibold tabular-nums">{activeTab.zoom}%</span>
          <button onClick={zoomIn} aria-label="Zoom in" className={`px-2 font-bold hover:bg-gray-200 sim-dark:hover:bg-gray-700 ${hl("zoomin-btn") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}>+</button>
        </div>
      </div>

      {/* Page-load progress bar */}
      {loading && (
        <div className="h-0.5 bg-gray-200 overflow-hidden shrink-0">
          <div className="h-full w-2/5 bg-blue-500 animate-loading-bar" />
        </div>
      )}

      {/* Bookmarks bar */}
      {showBookmarksBar && (
        <div className="shrink-0 bg-white sim-dark:bg-gray-800 border-b border-gray-200 sim-dark:border-gray-700 flex items-center gap-3 px-3 py-1 text-sm overflow-x-auto">
          {bookmarks.map((b) => (
            <button key={b} onClick={() => navigate(b)} className="flex items-center gap-1 whitespace-nowrap hover:underline">
              <span>{PAGES[b].icon}</span>
              <span className="font-medium">{PAGES[b].title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Page content.
          The dark-mode line runs *inside* here, not around it. Three of the things
          this area renders are the browser's own — the new-tab page, the "not in the
          practice browser" page, the reload spinner — and a real browser draws those
          in its own theme. Only a website is paper.

          The first version of this marked the whole area `data-sim-paper`, which was
          wrong twice over: the new-tab page kept a white ground while its text went
          light, so the Favorites tiles were white-on-white at 1.05:1 — and the marker
          told simdark-check to skip precisely that region, so the check reported the
          browser clean. A screenshot caught it. Keep the marker on the narrowest
          thing that is genuinely paper. */}
      <div className="flex-1 min-h-0 overflow-auto bg-white sim-dark:bg-gray-900 relative">
        {unknownUrl ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
            <div className="w-20 h-20 bg-gray-100 sim-dark:bg-gray-700 rounded-2xl flex items-center justify-center text-4xl">?</div>
            <p className="font-black text-xl text-gray-800 sim-dark:text-gray-200">This site isn&apos;t in the practice browser.</p>
            <p className="text-gray-500 sim-dark:text-gray-400 text-sm max-w-xs leading-relaxed">
              <span className="font-mono bg-gray-100 sim-dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 sim-dark:text-gray-200">{unknownUrl}</span> is not one of the practice websites for this lesson.
            </p>
            <p className="text-blue-700 text-sm font-semibold max-w-xs leading-relaxed">
              On your real computer, try typing this address in your own browser and see what you find!
            </p>
            <button onClick={() => { setUnknownUrl(""); setTabs(prev => prev.map(t => t.id === activeId ? { ...t, pageId: "newtab" } : t)); }} className="mt-2 px-5 py-2 bg-gray-100 sim-dark:bg-gray-700 border-2 border-gray-300 sim-dark:border-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 sim-dark:hover:bg-gray-600">
              ← Go back
            </button>
          </div>
        ) : reloading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-4 border-gray-300 sim-dark:border-gray-700 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-gray-500 sim-dark:text-gray-400 text-sm font-medium">Loading...</p>
          </div>
        ) : (
          /**
           * A website gets paper: a white ground and dark text pinned on, so the
           * hundreds of unpaired `text-gray-*` classes in the page bodies below keep
           * meaning what they say and nothing inherits the desktop's light text onto
           * white. The new-tab page is not a website, so it takes neither and shows
           * through to the dark page area above.
           */
          <div
            data-sim-paper={activePage.kind === "newtab" ? undefined : true}
            style={{ fontSize: `${activeTab.zoom}%` }}
            className={`p-6 ${activePage.kind === "newtab" ? "" : "min-h-full bg-white text-gray-900"}`}
          >
            {activePage.kind === "newtab" && (
              <div>
                <p className="text-gray-500 sim-dark:text-gray-400 font-semibold mb-3">Favorites</p>
                <div className="grid grid-cols-4 gap-3 max-w-2xl">
                  {FAVORITES.map((f) => (
                    <button key={f} onClick={() => navigate(f)} className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-gray-500 sim-dark:border-gray-400 hover:bg-gray-50">
                      <span className="text-gray-600 sim-dark:text-gray-300">{PAGES[f].icon}</span>
                      <span className="text-xs font-semibold text-center leading-tight">{PAGES[f].title}</span>
                      <span className="text-[10px] text-gray-500 sim-dark:text-gray-400 text-center leading-tight">{PAGES[f].url}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activePage.kind === "search" && (
              <div className="flex flex-col items-center gap-4 pt-6">
                <p className="text-5xl font-black tracking-tight">
                  <span className="text-blue-700 sim-dark:text-blue-400">G</span><span className="text-red-700 sim-dark:text-red-400">o</span>
                  <span className="text-amber-700 sim-dark:text-yellow-400">o</span><span className="text-blue-700 sim-dark:text-blue-400">g</span>
                  <span className="text-green-500">l</span><span className="text-red-700 sim-dark:text-red-400">e</span>
                </p>
                <div className={`flex items-center gap-2 w-full max-w-md bg-white border-2 rounded-full px-4 py-2 ${hl("searchbox") ? "border-yellow-400 ring-4 ring-yellow-300 animate-pulse" : "border-gray-400"}`}>
                  <span className="text-gray-500 sim-dark:text-gray-400"><SearchIcon size={16} /></span>
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
                {PAGE_CONTENT[activeTab.pageId] ?? (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600">{activePage.icon}</span>
                      <h1 className="text-3xl font-black">{activePage.title}</h1>
                    </div>
                    <p className="text-lg text-gray-700 leading-relaxed max-w-lg">{activePage.body}</p>
                  </>
                )}
                {activePage.download && (
                  <button onClick={clickDownloadLink} className={`self-start px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg border-2 border-black inline-flex items-center gap-2 ${hl("download-btn") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}>
                    <DownloadIcon size={16} /> Download {activePage.download}
                  </button>
                )}
                {activeTab.pageId === "news" && (
                  <div className="mt-6 border-t border-gray-200 pt-3">
                    <p style={{ fontSize: "8px" }} className="text-gray-500 sim-dark:text-gray-400 leading-tight max-w-md">
                      Special offer details: Subscribe today and get 50% off your first 3 months. Use code NEWREADER at checkout. Offer valid for new subscribers only. Terms and conditions apply. See full details at dailynews.example/terms.
                      {activeTab.zoom >= 150 && <span className="text-green-700 sim-dark:text-green-400 font-bold"> Now you can read this!</span>}
                    </p>
                  </div>
                )}
                {activePage.ads && (
                  <div className="mt-4 flex flex-col gap-3">
                    <button onClick={clickAd} className="w-full bg-green-700 text-white font-black text-center py-3 rounded-lg border-2 border-green-700 hover:bg-green-800 animate-pulse">
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
                  <span className="text-gray-500 sim-dark:text-gray-400"><ImageIcon size={40} /></span>
                </div>
                <p className="text-gray-500 sim-dark:text-gray-400 font-bold text-lg">This page didn&apos;t load correctly.</p>
                <p className="text-gray-500 sim-dark:text-gray-400 text-sm max-w-xs">Try clicking the reload button in the toolbar.</p>
              </div>
            )}
          </div>
        )}

        {/* Ad click nudge */}
        {adNudge && (
          <div className="absolute top-2 left-2 right-2 z-20 bg-amber-50 border-2 border-amber-400 rounded-lg px-4 py-3 text-sm font-semibold text-amber-900 animate-slide-down">
            That&apos;s an ad — they&apos;re designed to look like real buttons! Ignore them and keep going.
          </div>
        )}

        {/* Cookie banner */}
        {cookieOpen && (
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 text-white p-4 flex flex-wrap items-center gap-3 animate-slide-up">
            <p className="flex-1 text-sm min-w-48 flex items-center gap-2"><Image src="/playgrounds/cookie.png" alt="cookie" width={24} height={24} className="shrink-0 rounded" /> This site uses cookies to remember your preferences. Do you accept?</p>
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

        {/* Scam popup.
            The overlay is pinned to this page area's padding box — that div is
            both `relative` and `overflow-auto` — so anything hanging outside
            the dialog is clipped by it, and scrolling cannot bring it back,
            because the overlay does not move with the scroll. The ✕ used to sit
            at `-top-3 -right-3`, twelve pixels outside the corner: on a short
            pane the centered dialog's top edge approaches the container's, and
            the close button — the one control this entire lesson is about — was
            cut off with no way to reach it. It sits inside the corner now,
            where it cannot overflow at any pane size. Found by `ring-check`
            once that check was made stable enough to believe. */}
        {popupOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 p-2">
            <div className="bg-white border-4 border-red-500 rounded-xl shadow-2xl p-6 pt-8 max-w-xs text-center relative animate-pop-in">
              <button onClick={closePopup} aria-label="Close popup" className={`absolute top-1.5 right-1.5 w-8 h-8 bg-white border-2 border-black rounded-full font-bold flex items-center justify-center ${hl("popup-close") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}>&times;</button>
              <p className="text-red-700 sim-dark:text-red-400 mb-2"><WarningIcon size={40} /></p>
              <p className="font-black text-red-700 sim-dark:text-red-400 text-lg">VIRUS DETECTED!!!</p>
              <p className="text-sm text-gray-700 my-2">Your computer is infected! Click below to clean it NOW!</p>
              <button onClick={clickCleanNow} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg w-full hover:bg-red-700">CLEAN NOW</button>
            </div>
          </div>
        )}

        {/* Lock info popover */}
        {lockInfo && (
          <div className="absolute top-2 left-2 z-20 w-80 bg-white sim-dark:bg-gray-800 border-2 border-black sim-dark:border-gray-500 rounded-lg shadow-xl p-4 animate-slide-down">
            {activePage.secure ? (
              <>
                <p className="font-bold text-green-700 flex items-center gap-2"><LockIcon size={18} /> This connection is encrypted.</p>
                <p className="text-sm text-gray-700 sim-dark:text-gray-200 mt-2 leading-relaxed">
                  Nobody between you and <b>{activePage.url}</b> can read what you type — not the coffee-shop WiFi, not your internet provider.
                </p>
                <p className="text-sm text-gray-700 sim-dark:text-gray-200 mt-2 leading-relaxed">
                  <b>But the lock does NOT mean the site itself is trustworthy</b> — the website still sees everything you enter. A scam site can have a lock too.
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-red-700 sim-dark:text-red-400 flex items-center gap-2"><WarningIcon size={18} /> This connection is NOT secure.</p>
                <p className="text-sm text-gray-700 sim-dark:text-gray-200 mt-2 leading-relaxed">
                  Anything you type here could be read by others on the network. <b>Never enter passwords or card numbers on a page without the lock.</b>
                </p>
              </>
            )}
            <button onClick={closeLockGotIt} className={`mt-3 px-4 py-1.5 bg-gray-100 border-2 border-gray-300 sim-dark:border-gray-700 rounded-lg font-semibold text-sm ${hl("lock-gotit") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}>Got it</button>
          </div>
        )}

        {/* History / Downloads / Reading List menus */}
        {menu && (
          <div className="absolute top-2 right-2 z-20 w-64 bg-white sim-dark:bg-gray-800 border-2 border-black sim-dark:border-gray-500 rounded-lg shadow-xl overflow-hidden animate-slide-down">
            <p className="px-3 py-2 bg-gray-100 sim-dark:bg-gray-700 font-bold text-sm border-b border-gray-200 sim-dark:border-gray-700">
              <span className="inline-flex items-center gap-1.5">{menu === "history" ? <><ClockIcon size={14} /> History</> : menu === "downloads" ? <><DownloadIcon size={14} /> Downloads</> : <><BookIcon size={14} /> Reading List</>}</span>
            </p>
            <div className="max-h-56 overflow-auto">
              {menu === "history" && (uniqueHistory.length === 0
                ? <p className="px-3 py-3 text-gray-500 sim-dark:text-gray-400 text-sm">No history yet.</p>
                : uniqueHistory.map((h) => (
                    <button
                      key={h}
                      onClick={() => navigate(h)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm hover:bg-blue-50 border-b border-gray-100 ${hl("history-item", PAGES[h].title) ? "ring-4 ring-inset ring-yellow-400 animate-pulse" : ""}`}
                    >
                      <span>{PAGES[h].icon}</span><span className="font-medium">{PAGES[h].title}</span>
                      <span className="text-gray-500 sim-dark:text-gray-400 ml-auto">{PAGES[h].url}</span>
                    </button>
                  )))}
              {menu === "downloads" && (downloads.length === 0
                ? <p className="px-3 py-3 text-gray-500 sim-dark:text-gray-400 text-sm">No downloads yet.</p>
                : downloads.map((d) => (
                    <div key={d} className="px-3 py-2 flex items-center gap-2 text-sm border-b border-gray-100">
                      <span><FileDocIcon size={14} /></span>
                      <span className="font-medium flex-1">{d}</span>
                      {d.endsWith(".pdf") && (
                        <button
                          onClick={() => openDownload(d)}
                          aria-label={`Open ${d}`}
                          className={`shrink-0 px-2 h-6 rounded text-xs font-semibold border border-gray-300 sim-dark:border-gray-700 bg-white hover:bg-blue-50 hover:border-blue-400 text-gray-700 ${
                            hl("download-open", d) ? "ring-4 ring-yellow-400 animate-pulse border-yellow-400" : ""
                          }`}
                        >
                          Open
                        </button>
                      )}
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
                ? <p className="px-3 py-3 text-gray-500 sim-dark:text-gray-400 text-sm">Nothing saved yet.</p>
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
          <div className="bg-white sim-dark:bg-gray-800 border-4 border-black sim-dark:border-gray-500 rounded-xl shadow-2xl p-5 w-80 animate-slide-down">
            <p className="font-black text-lg mb-1">Add Bookmark</p>
            <p className="text-sm text-gray-600 sim-dark:text-gray-300 mb-3">Save this page to your favorites?</p>
            <div className="flex items-center gap-2 border-2 border-gray-300 sim-dark:border-gray-700 rounded-lg px-3 py-2 mb-4">
              <span className="text-xl">{activePage.icon}</span>
              <span className="font-semibold">{activePage.title}</span>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setBookmarkSheet(false)} className="px-4 py-1.5 border-2 border-gray-300 sim-dark:border-gray-700 rounded-lg font-semibold text-sm">Cancel</button>
              <button onClick={confirmBookmark} className={`px-5 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-sm border-2 border-black sim-dark:border-gray-500 ${hl("bookmark-add") ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}>Add Bookmark</button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer */}
      {pdfViewer && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="bg-white sim-dark:bg-gray-800 border-2 border-black sim-dark:border-gray-500 rounded-xl shadow-2xl flex flex-col w-[90%] max-w-lg max-h-[90%] overflow-hidden animate-pop-in">
            {/* Title bar */}
            <div className="shrink-0 bg-gray-800 text-white flex items-center gap-2 px-4 py-2">
              <FileDocIcon size={16} />
              <span className="font-semibold text-sm flex-1 truncate">{pdfViewer}</span>
              <button onClick={() => setPdfViewer(null)} aria-label="Close PDF" className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/20 font-bold text-lg leading-none">&times;</button>
            </div>
            {/* Toolbar */}
            <div className="shrink-0 bg-gray-100 sim-dark:bg-gray-800 border-b border-gray-300 sim-dark:border-gray-700 flex items-center justify-between px-4 py-1.5">
              <span className="text-xs font-semibold text-gray-600 sim-dark:text-gray-300">Page 1 of 2</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPdfZoom(z => Math.max(z - 25, 50))} className="w-7 h-7 border border-gray-300 sim-dark:border-gray-700 rounded bg-white sim-dark:bg-gray-700 sim-dark:text-gray-100 font-bold hover:bg-gray-200 sim-dark:hover:bg-gray-600 text-sm">−</button>
                <span className="text-xs font-semibold tabular-nums w-12 text-center">{pdfZoom}%</span>
                <button onClick={() => setPdfZoom(z => Math.min(z + 25, 200))} className="w-7 h-7 border border-gray-300 sim-dark:border-gray-700 rounded bg-white sim-dark:bg-gray-700 sim-dark:text-gray-100 font-bold hover:bg-gray-200 sim-dark:hover:bg-gray-600 text-sm">+</button>
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-auto bg-gray-200 sim-dark:bg-gray-900 p-4">
              {/* The page itself: paper, and paper does not follow Dark Mode. The frame,
                  toolbar and tray around it do — same split a real PDF viewer makes.
                  Do not add `sim-dark:` colors in here; the ground stays white. */}
              <div data-sim-paper className="bg-white shadow-md rounded p-6 mx-auto" style={{ fontSize: `${pdfZoom}%`, maxWidth: "520px" }}>
                <h1 className="text-xl font-black mb-0.5">Grandma&apos;s Classic Apple Pie</h1>
                <p className="text-xs text-gray-500 mb-4 border-b border-gray-200 pb-3">Recipe Box — recipebox.example</p>

                <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-2">Ingredients</h2>
                <ul className="text-sm space-y-1 mb-5 list-disc list-inside text-gray-800">
                  <li>2 cups all-purpose flour</li>
                  <li>1 tsp salt</li>
                  <li>2/3 cup cold butter, cubed</li>
                  <li>6–8 tbsp ice water</li>
                  <li>5 large Granny Smith apples</li>
                  <li>3/4 cup sugar</li>
                  <li>1 tsp ground cinnamon</li>
                  <li>1/4 tsp nutmeg</li>
                </ul>

                <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-2">Instructions</h2>
                <ol className="text-sm space-y-2 list-decimal list-inside text-gray-800">
                  <li>Mix flour and salt. Cut in cold butter until the mixture looks like coarse crumbs.</li>
                  <li>Add ice water one tablespoon at a time, stirring gently, until the dough just holds together.</li>
                  <li>Divide dough in half, flatten into discs, and refrigerate for 30 minutes.</li>
                  <li>Peel, core, and thinly slice the apples.</li>
                  <li>Toss apple slices with sugar, cinnamon, and nutmeg. Set aside.</li>
                  <li>Preheat oven to 425°F (220°C).</li>
                  <li>Roll out one dough disc on a floured surface and fit it into a 9-inch pie dish.</li>
                  <li>Fill with the apple mixture, mounding it in the center.</li>
                </ol>

                <p className="mt-5 text-xs text-gray-500 sim-dark:text-gray-400 border-t border-gray-200 pt-3 text-center">Page 1 of 2 — continued on next page</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Second window */}
      {newWindow && (
        <div className="absolute inset-6 z-30 bg-white sim-dark:bg-gray-900 border-2 border-gray-800 sim-dark:border-gray-600 rounded-lg shadow-2xl flex flex-col animate-pop-in">
          <div className="bg-gray-100 sim-dark:bg-gray-800 border-b-2 border-gray-800 sim-dark:border-gray-600 px-3 py-2 flex items-center gap-2">
            <span className="font-bold text-sm flex items-center gap-1.5"><GlobeIcon size={16} />New Window</span>
            <div className="flex-1" />
            <WindowControls onClose={() => setNewWindow(false)} />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-4">
            <span className="text-gray-500 sim-dark:text-gray-400"><WindowIcon size={48} /></span>
            <p className="font-bold text-lg">A brand-new browser window!</p>
            <p className="text-sm text-gray-600 sim-dark:text-gray-300 max-w-xs">This window is completely separate — it can have its own tabs. Great for keeping work and shopping apart.</p>
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
      className={`px-2.5 py-1 rounded-md border-2 border-gray-300 sim-dark:border-gray-700 bg-white sim-dark:bg-gray-700 sim-dark:text-gray-100 font-semibold whitespace-nowrap hover:bg-gray-100 sim-dark:hover:bg-gray-600 inline-flex items-center gap-1.5 ${
        highlight ? "ring-4 ring-yellow-400 animate-pulse border-yellow-400" : ""
      }`}
    >
      {icon}{label}
    </button>
  );
}
