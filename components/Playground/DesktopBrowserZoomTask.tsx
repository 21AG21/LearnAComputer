"use client";

import { useRef, useState } from "react";
import FakeDesktop from "./FakeDesktop";
import BrowserSimulator from "./BrowserSimulator";
import { checkTypeText } from "./TaskChecker";

interface DesktopBrowserZoomTaskProps {
  onResult: (success: boolean) => void;
}

// The hidden digit sits at 5px — only readable when zoomed way in.
const HIDDEN_DIGIT = "7";
const SECRET_CODE = `Z${HIDDEN_DIGIT}Q`;

const MIN_ZOOM = 10;
const MAX_ZOOM = 28;
const STEP = 4;
const READABLE_ZOOM = 20; // digit is clearly visible at this zoom level and above

export default function DesktopBrowserZoomTask({ onResult }: DesktopBrowserZoomTaskProps) {
  const [phase, setPhase] = useState<"desktop" | "browser">("desktop");
  const [zoom, setZoom] = useState(14);
  const [typed, setTyped] = useState("");
  const finished = useRef(false);

  function handleType(value: string) {
    setTyped(value);
    if (!finished.current && checkTypeText(SECRET_CODE, value, false)) {
      finished.current = true;
      onResult(true);
    }
  }

  const digitStyle = {
    fontSize: zoom >= READABLE_ZOOM ? "inherit" : "5px",
    display: "inline",
  };

  if (phase === "browser") {
    return (
      <BrowserSimulator
        tabTitle="Animal Facts"
        url="animals.learna.computer"
        onExit={() => setPhase("desktop")}
        bezel={false}
        showControls={false}
        onZoomIn={() => setZoom((z) => Math.min(z + STEP, MAX_ZOOM))}
        onZoomOut={() => setZoom((z) => Math.max(z - STEP, MIN_ZOOM))}
      >
        <div className="h-full overflow-y-auto p-6 space-y-4" style={{ fontSize: `${zoom}px` }}>
          <h1 className="font-bold" style={{ fontSize: `${zoom * 1.4}px` }}>Amazing Animal Facts</h1>
          <p>
            A group of flamingos is called a <em>flamboyance</em>. Flamingos get their pink color from the
            shrimp and algae they eat — baby flamingos are actually born grey!
          </p>
          <p>
            Octopuses have three hearts and blue blood. Two hearts pump blood to the gills, and one pumps it to the
            rest of the body. When an octopus swims, the heart that delivers blood to the body actually stops beating.
          </p>
          <p>
            A day on Venus is longer than a year on Venus. It takes longer to spin once on its axis (243 Earth days)
            than it takes to orbit the Sun (225 Earth days).
          </p>
          <p>
            Sloths move so slowly that algae actually grows on their fur! The algae gives them a greenish tint that
            helps them blend into the rainforest.
          </p>
          <div className="border-4 border-black p-4 bg-gray-50 space-y-3 mt-4">
            <p className="font-bold">Find the secret code by zooming in with the ⋮ menu!</p>
            <p>
              The code is: Z<span style={digitStyle}>{HIDDEN_DIGIT}</span>Q
            </p>
            <p className="text-gray-500" style={{ fontSize: `${Math.max(zoom - 2, 10)}px` }}>
              (Use the three-dot menu ⋮ next to the search icon to zoom in.)
            </p>
            <input
              value={typed}
              onChange={(e) => handleType(e.target.value)}
              aria-label="Enter the code"
              className="w-full border-2 border-black px-3 py-2 outline-none"
              placeholder={`Type the code here…`}
              style={{ fontSize: `${zoom}px` }}
            />
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
