"use client";

import { useRef, useState } from "react";
import { checkScrollCode } from "./TaskChecker";
import CatIllustration from "./CatIllustration";

interface FakeBrowserRightClickTaskProps {
  instructions: string;
  onResult: (success: boolean) => void;
}

export function FakeBrowserRightClickTask({ instructions, onResult }: FakeBrowserRightClickTaskProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [tabs, setTabs] = useState<string[]>(["Cats Blog"]);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  }

  function handleOpenInNewTab() {
    setMenuOpen(false);
    setTabs((prev) => [...prev, "Funny Cat Video"]);
    onResult(true);
  }

  return (
    <div className="h-full flex flex-col bg-white" onClick={() => setMenuOpen(false)}>
      <p className="text-sm text-gray-500 px-4 pt-3">{instructions}</p>

      <div className="flex items-center gap-2 px-3 pt-3 pl-14">
        {tabs.map((tab, i) => (
          <div key={i} className="border rounded px-3 py-1 flex items-center gap-2 text-sm">
            {tab}
            <span className="text-gray-400">✕</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 border-y px-3 py-2 text-lg mt-3">
        <span aria-hidden="true">←</span>
        <span aria-hidden="true">→</span>
        <span aria-hidden="true">⟳</span>
        <span aria-hidden="true">🔒</span>
        <div className="flex-1 border rounded px-3 py-1 text-center text-base">examplecatsblog.com</div>
        <span aria-hidden="true">🔍</span>
      </div>

      <div className="flex-1 flex items-center gap-8 px-10 py-8 relative">
        <div className="flex-1">
          <h1 className="text-5xl font-bold mb-4">My Cat</h1>
          <p className="text-lg mb-4 max-w-xl">
            This is my cat, his name is DJ! Instead of clicking the link directly, which will open the link
            on this page, right click on the link and click open in a new tab so you can still see this page!
          </p>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            onContextMenu={handleContextMenu}
            className="underline text-blue-600 text-2xl"
          >
            Funny Cat Video
          </a>
          {menuOpen && (
            <div
              className="absolute bg-white border rounded shadow z-10"
              style={{ left: menuPos.x, top: menuPos.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={handleOpenInNewTab} className="block w-full text-left px-4 py-2 hover:bg-gray-100">
                Open link in new tab
              </button>
            </div>
          )}
        </div>
        <CatIllustration className="w-56 h-56 shrink-0" />
      </div>
    </div>
  );
}

interface FakeBrowserScrollCodeTaskProps {
  instructions: string;
  code: string;
  onResult: (success: boolean) => void;
}

export function FakeBrowserScrollCodeTask({ instructions, code, onResult }: FakeBrowserScrollCodeTaskProps) {
  const [reachedBottom, setReachedBottom] = useState(false);
  const [reachedTopAgain, setReachedTopAgain] = useState(false);
  const [typedCode, setTypedCode] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    const atTop = el.scrollTop <= 4;
    if (atBottom) setReachedBottom(true);
    if (atTop && reachedBottom) setReachedTopAgain(true);
  }

  function handleSubmit() {
    onResult(checkScrollCode(typedCode, code, reachedBottom, reachedTopAgain));
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">{instructions}</p>
      <div className="flex gap-2 items-center">
        <input
          value={typedCode}
          onChange={(e) => setTypedCode(e.target.value)}
          placeholder="Type the code here"
          className="border rounded p-2 flex-1"
        />
        <button onClick={handleSubmit} className="border rounded px-4 py-2">
          Go
        </button>
      </div>
      <div ref={scrollRef} onScroll={handleScroll} className="border rounded h-64 overflow-y-scroll p-4 space-y-4">
        <p>Welcome to Fun Facts About Computers!</p>
        <p>Computers have come a long way since the 1940s.</p>
        {Array.from({ length: 10 }).map((_, i) => (
          <p key={i}>This is paragraph {i + 1}. Keep scrolling to find your code.</p>
        ))}
        <p className="font-bold text-lg">Your code is: {code}</p>
        <p>Great job finding it! Now scroll back up and type it in the box above.</p>
      </div>
    </div>
  );
}
