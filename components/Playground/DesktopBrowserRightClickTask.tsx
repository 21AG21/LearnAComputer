"use client";

import Image from "next/image";
import { useState } from "react";
import BrowserSimulator from "./BrowserSimulator";

interface DesktopBrowserRightClickTaskProps {
  /** Returns the learner to the desktop when they close the browser window. */
  onExit: () => void;
  onResult: (success: boolean) => void;
}

type BrowserPhase = "article" | "newTabPrompt" | "catPhoto";

export default function DesktopBrowserRightClickTask({ onExit, onResult }: DesktopBrowserRightClickTaskProps) {
  const [browserPhase, setBrowserPhase] = useState<BrowserPhase>("article");
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  function handleLinkRightClick(e: React.MouseEvent) {
    e.preventDefault();
    setMenuPos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
  }

  // A plain left-click can't invent the right-click gesture a confused or
  // one-button user has never heard of, so open the same menu — the lesson still
  // shows what right-click does, and everyone can still reach "Open in new tab".
  function handleLinkClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
  }

  function handleOpenInNewTab() {
    setMenuPos(null);
    setBrowserPhase("newTabPrompt");
  }

  function handleCatTabClick() {
    setBrowserPhase("catPhoto");
    onResult(true);
  }

  function handlePetNewsTabClick() {
    if (browserPhase === "catPhoto") setBrowserPhase("newTabPrompt");
  }

    const catTabVisible = browserPhase === "newTabPrompt" || browserPhase === "catPhoto";
    const extraTabs = catTabVisible
      ? [
          {
            title: "Judgmental Cat — Pet News",
            active: browserPhase === "catPhoto",
            onClick: handleCatTabClick,
          },
        ]
      : undefined;

    return (
      <BrowserSimulator
        tabTitle="Pet News"
        tabActive={browserPhase !== "catPhoto"}
        onTabClick={handlePetNewsTabClick}
        url={
          browserPhase === "catPhoto"
            ? "petnews.example/judgementalcat"
            : "petnews.example"
        }
        onExit={onExit}
        bezel={false}
        showControls={true}
        extraTabs={extraTabs}
      >
        {/* Dismiss context menu on page click */}
        <div
          className="relative h-full"
          onClick={() => setMenuPos(null)}
        >
          {browserPhase === "catPhoto" ? (
            <div className="h-full overflow-y-auto bg-white">
              <div className="max-w-xl mx-auto px-6 py-8 space-y-4">
                <div className="border-b-2 border-gray-800 pb-2">
                  <p className="text-xs font-semibold text-gray-500">PET NEWS DAILY · CATS</p>
                </div>
                <h1 className="text-2xl font-black leading-tight">Local Cat Judges Neighbor Without Comment</h1>
                <p className="text-sm text-gray-500">By Staff Correspondent, Cat Desk · Updated 4 minutes ago</p>
                <div className="flex justify-center my-4">
                  <div className="relative w-44 h-72">
                    <Image src="/playgrounds/Cat2.png" alt="Judgmental cat" fill sizes="176px" className="object-contain rounded-lg" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 sim-dark:text-gray-400 italic -mt-2">Pictured: the cat in question. No comment was forthcoming.</p>
                <p className="text-sm text-gray-700 leading-relaxed">A local cat, known only as &quot;Whiskers&quot; by neighbors who have not been formally introduced, spent approximately forty-five minutes on a windowsill yesterday, studying a passing cyclist with an expression that implied serious reservations.</p>
                <p className="text-sm text-gray-700 leading-relaxed">&quot;I waved,&quot; confirmed the cyclist, who asked to remain anonymous. &quot;The cat did not wave back. The cat has never waved back.&quot;</p>
                <p className="text-sm text-gray-700 leading-relaxed">The incident follows a series of similar events spanning three years, including the Great Staring Episode of 2023 and what sources describe as &quot;a very pointed tail-flick&quot; directed at a delivery driver in February.</p>
                <div className="border-t pt-4 mt-2">
                  <p className="font-semibold text-sm mb-3">1 Comment</p>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center shrink-0 font-bold text-sm">D</div>
                    <div>
                      <p className="text-sm font-semibold">GoodDog1 <span className="text-gray-500 sim-dark:text-gray-400 font-normal text-xs">· 2 hours ago</span></p>
                      <p className="text-sm text-gray-700">I also waved and was also ignored. I choose to believe the cat is simply very busy.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : browserPhase === "newTabPrompt" ? (
            <div className="p-6 space-y-4">
              <div className="border-b-2 border-gray-800 pb-2">
                <h1 className="text-2xl font-black">Pet News Daily</h1>
                <p className="text-xs text-gray-500 mt-0.5">petnews.example</p>
              </div>
              <p className="text-base text-gray-700">
                A new tab called <strong>Judgmental Cat</strong> just appeared at the top. Click it to see the full story.
              </p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              <div className="border-b-2 border-gray-800 pb-2">
                <h1 className="text-2xl font-black">Pet News Daily</h1>
                <nav className="flex gap-4 text-xs font-semibold text-gray-500 mt-1">
                  {["Home","Dogs","Cats","Birds","Local"].map((n) => (
                    <span key={n} className={n === "Home" ? "text-orange-600 underline" : "cursor-pointer hover:underline"}>{n}</span>
                  ))}
                </nav>
              </div>
              <div>
                <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-1.5 py-0.5 rounded">TOP STORY</span>
                <h2 className="text-lg font-bold mt-1 leading-tight">Dog Wins National Frisbee Championship for Third Year Running</h2>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">Biscuit, a four-year-old Golden Retriever, leapt twenty feet and caught the disc before it cleared the fence. The crowd erupted.</p>
              </div>
              <p className="text-sm text-gray-700">
                Also in the news: scientists confirm that cats are, in fact, plotting something. To open the story in a new tab,{" "}
                <strong>right-click the link</strong> and choose <em>Open in new tab</em>.
              </p>
              {/* The right-clickable link */}
              <div className="relative inline-block">
                <button
                  onContextMenu={handleLinkRightClick}
                  onClick={handleLinkClick}
                  className={`text-blue-600 underline text-base font-semibold cursor-pointer select-none rounded px-1 ${menuPos ? "" : "bg-yellow-50 animate-ring-pulse"}`}
                >
                  Local Cat Judges Neighbor Without Comment →
                </button>
                {/* Context menu */}
                {menuPos && (
                  <div
                    className="absolute z-30 bg-white border-2 border-gray-300 rounded-lg shadow-xl animate-pop-in overflow-hidden min-w-[240px]"
                    style={{ left: menuPos.x, top: menuPos.y }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={handleOpenInNewTab}
                      className="block w-full text-left px-4 py-2.5 text-base font-semibold bg-yellow-50 hover:bg-yellow-100 border-b border-gray-200 whitespace-nowrap"
                    >
                      Open link in new tab
                    </button>
                    <button className="block w-full text-left px-4 py-2.5 text-base text-gray-500 sim-dark:text-gray-400 border-b border-gray-200 whitespace-nowrap">
                      Open link in new window
                    </button>
                    <button className="block w-full text-left px-4 py-2.5 text-base text-gray-500 sim-dark:text-gray-400 whitespace-nowrap">
                      Copy link address
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </BrowserSimulator>
    );

}
