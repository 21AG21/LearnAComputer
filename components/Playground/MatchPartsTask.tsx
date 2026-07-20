"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

interface MatchPartsTaskProps {
  instructions?: string;
  onResult: (success: boolean) => void;
}

// Center of each part on laptop.png (% of the image box).
const PARTS = [
  { id: "screen", label: "Screen", left: 50, top: 16.4 },
  { id: "keyboard", label: "Keyboard", left: 50, top: 53.6 },
  { id: "trackpad", label: "Trackpad", left: 50, top: 83.1 },
] as const;

type PartId = (typeof PARTS)[number]["id"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MatchPartsTask({ instructions, onResult }: MatchPartsTaskProps) {
  const names = useMemo(() => shuffle(PARTS.map((p) => ({ id: p.id, label: p.label }))), []);
  const [selectedPart, setSelectedPart] = useState<PartId | null>(null);
  const [matched, setMatched] = useState<Record<string, boolean>>({});
  const [wrong, setWrong] = useState<PartId | null>(null);
  const finished = useRef(false);

  function tryMatch(nameId: PartId) {
    if (!selectedPart) return;
    if (selectedPart === nameId) {
      const next = { ...matched, [selectedPart]: true };
      setMatched(next);
      setSelectedPart(null);
      if (!finished.current && PARTS.every((p) => next[p.id])) {
        finished.current = true;
        onResult(true);
      }
    } else {
      setWrong(selectedPart);
      setTimeout(() => setWrong(null), 500);
      setSelectedPart(null);
    }
  }

  return (
    <div className="h-full flex flex-col items-center bg-white px-6 py-6" aria-label={instructions ?? "Match each part to its name"}>
      {instructions && (
        <>
          <h2 className="text-3xl font-bold mb-1 text-center">Match each part to its name</h2>
          <p className="text-lg text-gray-600 mb-6 text-center">
            Click a dot on the laptop, then click the name it belongs to.
          </p>
        </>
      )}

      <div className="flex-1 w-full flex items-center justify-center gap-8">
        {/* Laptop with a dot centered on each part */}
        <div className="relative shrink-0" style={{ width: "min(55%, 400px)", aspectRatio: "2342 / 1786" }}>
          <Image src="/playgrounds/laptop.png" alt="Laptop" fill sizes="400px" className="object-contain" />
          {PARTS.map((part) => {
            const isMatched = matched[part.id];
            const isSelected = selectedPart === part.id;
            const isWrong = wrong === part.id;
            return (
              <button
                key={part.id}
                onClick={() => !isMatched && setSelectedPart(part.id)}
                aria-label={`Part at ${part.label} position`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 ${
                  isMatched ? "cursor-default" : ""
                }`}
                style={{ left: `${part.left}%`, top: `${part.top}%` }}
              >
                <span
                  className={`w-8 h-8 rounded-full border-2 border-black transition-colors ${
                    isMatched
                      ? "bg-green-500"
                      : isWrong
                      ? "bg-red-500"
                      : isSelected
                      ? "bg-yellow-400"
                      : "bg-[#2b3a5b]/70"
                  }`}
                />
                {isMatched && (
                  <span className="text-lg font-semibold whitespace-nowrap bg-white/90 px-1 rounded">
                    {part.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Shuffled name choices */}
        <div className="flex flex-col gap-5">
          {names.map((name) => {
            const used = matched[name.id];
            return (
              <button
                key={name.id}
                onClick={() => tryMatch(name.id)}
                disabled={used}
                className={`flex items-center gap-3 text-2xl font-medium disabled:opacity-30`}
              >
                <span className="w-7 h-7 rounded-full border-2 border-black bg-[#2b3a5b]" />
                {name.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
