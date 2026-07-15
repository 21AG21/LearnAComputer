"use client";

import { useRef, useState } from "react";
import BrowserSimulator from "./BrowserSimulator";
import MockupPlayground, { Hotspot } from "./MockupPlayground";
import { checkScrollCode } from "./TaskChecker";

interface FakeBrowserRightClickTaskProps {
  instructions: string;
  onResult: (success: boolean) => void;
  onExit: () => void;
}

export function FakeBrowserRightClickTask({ instructions, onResult, onExit }: FakeBrowserRightClickTaskProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    }
    setMenuOpen(true);
  }

  function handleOpenInNewTab() {
    setMenuOpen(false);
    window.open("/funny-cat-video", "_blank");
    onResult(true);
  }

  return (
    <div ref={wrapperRef} className="h-full w-full" onClick={() => setMenuOpen(false)}>
      <MockupPlayground imageSrc="/playgrounds/right-click.png" imageAlt={instructions}>
        <Hotspot left={0.4} top={0.5} width={7.5} height={11.5} label="Exit activity" onClick={onExit} />
        <Hotspot
          left={3}
          top={69.5}
          width={31}
          height={9}
          label="Funny Cat Video link — right-click to open the menu"
          onContextMenu={handleContextMenu}
        />
        {menuOpen && (
          <div
            className="absolute bg-white border-2 border-black rounded shadow-lg z-10"
            style={{ left: `${menuPos.x}%`, top: `${menuPos.y}%` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleOpenInNewTab}
              className="block w-full text-left px-4 py-2 text-lg hover:bg-gray-100 whitespace-nowrap"
            >
              Open link in new tab
            </button>
          </div>
        )}
      </MockupPlayground>
    </div>
  );
}

interface FakeBrowserScrollCodeTaskProps {
  instructions: string;
  code: string;
  onResult: (success: boolean) => void;
  onExit: () => void;
}

export function FakeBrowserScrollCodeTask({ instructions, code, onResult, onExit }: FakeBrowserScrollCodeTaskProps) {
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
    <BrowserSimulator tabTitle="Fun Facts" url="examplefunfacts.com" onExit={onExit}>
      <div ref={scrollRef} onScroll={handleScroll} aria-label={instructions} className="h-full overflow-y-scroll px-8 py-6">
        <div className="max-w-2xl mx-auto space-y-10 text-2xl">
          <div className="flex gap-3 items-center sticky top-0 bg-white py-2">
            <input
              value={typedCode}
              onChange={(e) => setTypedCode(e.target.value)}
              placeholder="Type the code here"
              className="border-4 border-black p-2 flex-1 text-2xl"
            />
            <button onClick={handleSubmit} className="border-4 border-black px-6 py-2 font-bold">
              Go
            </button>
          </div>
          <h1 className="text-4xl font-bold">Welcome to Fun Facts About Computers!</h1>
          <p>Computers have come a long way since the 1940s.</p>
          {Array.from({ length: 10 }).map((_, i) => (
            <p key={i}>This is paragraph {i + 1}. Keep scrolling with two fingers to find your code.</p>
          ))}
          <p className="font-bold text-4xl">Your code is: {code}</p>
          <p>Great job finding it! Now scroll back up and type it in the box at the top.</p>
        </div>
      </div>
    </BrowserSimulator>
  );
}
