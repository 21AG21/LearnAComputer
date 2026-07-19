"use client";

import { useEffect, useRef, useState } from "react";
import FakeDesktop from "./FakeDesktop";
import BrowserSimulator from "./BrowserSimulator";
import { checkTypeText } from "./TaskChecker";

interface DesktopBrowserZoomTaskProps {
  onResult: (success: boolean) => void;
}

// Random each attempt so replaying is a fresh challenge. Skips look-alike characters.
function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const STEP = 0.25;

function clamp(z: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));
}

export default function DesktopBrowserZoomTask({ onResult }: DesktopBrowserZoomTaskProps) {
  const [phase, setPhase] = useState<"desktop" | "browser">("desktop");
  const [code] = useState(randomCode);
  const [zoom, setZoom] = useState(1);
  const [typed, setTyped] = useState("");
  const finished = useRef(false);
  const areaRef = useRef<HTMLDivElement>(null);

  // A real trackpad pinch fires a wheel event with the Ctrl (or ⌘) key held. We
  // attach a NON-passive listener so we can preventDefault and zoom the poster
  // instead of letting the whole page zoom underneath the lesson.
  useEffect(() => {
    const el = areaRef.current;
    if (!el || phase !== "browser") return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom((z) => clamp(z + (e.deltaY < 0 ? STEP : -STEP)));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [phase]);

  function changeZoom(delta: number) {
    setZoom((z) => clamp(z + delta));
  }

  function handleType(value: string) {
    setTyped(value);
    if (!finished.current && checkTypeText(code, value, false)) {
      finished.current = true;
      onResult(true);
    }
  }

  const readable = zoom >= 2;

  if (phase === "browser") {
    return (
      <BrowserSimulator
        tabTitle="Concert Tickets"
        url="tickets.example"
        onExit={() => setPhase("desktop")}
        bezel={false}
        showControls={false}
      >
        <div className="h-full flex flex-col bg-white">
          {/* Zoom toolbar */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600 flex-1">
              Pinch two fingers <b>apart</b> on the trackpad to zoom in — or use the buttons. The promo code is in tiny print.
            </p>
            <button
              onClick={() => changeZoom(-STEP)}
              aria-label="Zoom out"
              className="w-9 h-9 rounded-lg border-2 border-gray-300 bg-white text-xl font-bold hover:bg-gray-100 active:scale-95"
            >
              −
            </button>
            <span className="w-14 text-center font-semibold tabular-nums">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => changeZoom(STEP)}
              aria-label="Zoom in"
              className="w-9 h-9 rounded-lg border-2 border-gray-300 bg-white text-xl font-bold hover:bg-gray-100 active:scale-95"
            >
              +
            </button>
          </div>

          {/* Zoomable poster */}
          <div ref={areaRef} className="flex-1 overflow-auto bg-gray-100 p-4">
            <div
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
              className="mx-auto w-80 transition-transform duration-100"
            >
              <div className="bg-gradient-to-b from-indigo-600 to-purple-700 text-white rounded-xl p-5 shadow-lg text-center">
                <p className="text-xs uppercase tracking-widest text-indigo-200">Live in concert</p>
                <p className="text-2xl font-black mt-1">THE NIGHT OWLS</p>
                <p className="text-sm mt-1">Saturday · 8 PM · City Arena</p>
                <div className="mt-4 border-t border-white/30 pt-3">
                  <p className="text-[7px] leading-tight text-indigo-100">
                    Doors open one hour early. No refunds or exchanges. Present this page at the box office.
                    Use promo code <span className="font-black tracking-widest text-white">{code}</span> for 10% off your tickets.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Answer box */}
          <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
            <label className="font-semibold text-gray-700 shrink-0">Promo code:</label>
            <input
              value={typed}
              onChange={(e) => handleType(e.target.value)}
              aria-label="Enter the code"
              placeholder="Type the tiny code…"
              className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
            />
            {readable && <span className="text-green-600 text-sm font-semibold shrink-0">Now you can read it! 🔍</span>}
          </div>
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
