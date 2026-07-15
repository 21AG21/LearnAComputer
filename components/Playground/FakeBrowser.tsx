"use client";

import { useRef, useState } from "react";
import { checkScrollCode } from "./TaskChecker";

interface FakeBrowserRightClickTaskProps {
  instructions: string;
  onResult: (success: boolean) => void;
}

export function FakeBrowserRightClickTask({ instructions, onResult }: FakeBrowserRightClickTaskProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tabs, setTabs] = useState<string[]>(["Home"]);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setMenuOpen(true);
  }

  function handleOpenInNewTab() {
    setMenuOpen(false);
    setTabs((prev) => [...prev, "Fun Facts About Cats"]);
    onResult(true);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">{instructions}</p>
      <div className="border rounded">
        <div className="flex gap-2 border-b p-2 bg-gray-50 text-sm">
          {tabs.map((tab, i) => (
            <div key={i} className="border rounded px-2 py-1">
              {tab}
            </div>
          ))}
        </div>
        <div className="p-4 relative">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            onContextMenu={handleContextMenu}
            className="underline text-blue-600"
          >
            Fun Facts About Cats
          </a>
          {menuOpen && (
            <div className="absolute mt-1 bg-white border rounded shadow text-sm z-10">
              <button onClick={handleOpenInNewTab} className="block w-full text-left px-3 py-2 hover:bg-gray-100">
                Open link in new tab
              </button>
            </div>
          )}
        </div>
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
