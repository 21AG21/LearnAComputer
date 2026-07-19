"use client";

import Image from "next/image";
import { useState } from "react";
import FakeDesktop from "./FakeDesktop";
import BrowserSimulator from "./BrowserSimulator";

interface DesktopBrowserRightClickTaskProps {
  onResult: (success: boolean) => void;
}

type BrowserPhase = "article" | "newTabPrompt" | "catPhoto";

export default function DesktopBrowserRightClickTask({ onResult }: DesktopBrowserRightClickTaskProps) {
  const [phase, setPhase] = useState<"desktop" | "browser">("desktop");
  const [browserPhase, setBrowserPhase] = useState<BrowserPhase>("article");
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  function handleLinkRightClick(e: React.MouseEvent) {
    e.preventDefault();
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

  if (phase === "browser") {
    const extraTabs =
      browserPhase === "newTabPrompt" || browserPhase === "catPhoto"
        ? [
            {
              title: "Cat Photo",
              active: browserPhase === "catPhoto",
              onClick: handleCatTabClick,
            },
          ]
        : undefined;

    return (
      <BrowserSimulator
        tabTitle="Pet News"
        tabActive={browserPhase !== "catPhoto"}
        url={
          browserPhase === "catPhoto"
            ? "funny-cats.example"
            : "petnews.example"
        }
        onExit={() => setPhase("desktop")}
        bezel={false}
        showControls={false}
        extraTabs={extraTabs}
      >
        {/* Dismiss context menu on page click */}
        <div
          className="relative h-full"
          onClick={() => setMenuPos(null)}
        >
          {browserPhase === "catPhoto" ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-yellow-50 p-6">
              <p className="text-2xl font-bold text-center">You opened a new tab! Great job! 🎉</p>
              <div className="relative w-48 h-48">
                <Image src="/playgrounds/Cat2.png" alt="Funny cat" fill sizes="192px" className="object-contain" />
              </div>
              <p className="text-lg text-center text-gray-600">That&apos;s one judgmental cat.</p>
            </div>
          ) : browserPhase === "newTabPrompt" ? (
            <div className="p-6 space-y-4 text-lg">
              <h1 className="text-2xl font-bold">Pet News Daily</h1>
              <p>
                A new tab called <strong>Cat Photo</strong> just appeared at the top! Click it to see the photo.
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-4 text-lg">
              <h1 className="text-2xl font-bold">Pet News Daily</h1>
              <p>
                Welcome to Pet News Daily — your source for the latest in adorable animal stories. Today&apos;s top
                story: scientists confirm that cats are, in fact, plotting something.
              </p>
              <p>
                Want proof? Check out the photo below. To open it in a new tab,{" "}
                <strong>right-click the link</strong> and choose <em>Open in new tab</em>.
              </p>
              {/* The right-clickable link */}
              <div className="relative inline-block">
                <button
                  onContextMenu={handleLinkRightClick}
                  className="text-blue-600 underline text-xl font-semibold cursor-context-menu select-none"
                  onClick={(e) => e.preventDefault()}
                >
                  See a funny cat photo →
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
                      className="block w-full text-left px-4 py-2.5 text-base font-semibold hover:bg-blue-50 border-b border-gray-200 whitespace-nowrap"
                    >
                      Open link in new tab
                    </button>
                    <button className="block w-full text-left px-4 py-2.5 text-base text-gray-400 border-b border-gray-200 whitespace-nowrap">
                      Open link in new window
                    </button>
                    <button className="block w-full text-left px-4 py-2.5 text-base text-gray-400 whitespace-nowrap">
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

  return (
    <div className="h-full flex flex-col">
      <p className="shrink-0 text-base border-2 border-yellow-400 bg-yellow-100 px-4 py-2 mx-4 mt-3 rounded animate-slide-down">
        Click the Browser icon at the bottom of the desktop to open it.
      </p>
      <div className="flex-1 min-h-0 p-3 pt-2">
        <FakeDesktop onAppOpened={(app) => { if (app === "browser") setPhase("browser"); }} />
      </div>
    </div>
  );
}
