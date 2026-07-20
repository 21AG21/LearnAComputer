"use client";

import { useState } from "react";
import { WarningIcon } from "./Icons";

interface FakeItem {
  label: string;
  preview: string;
  isFake: boolean;
}

interface SpotTheFakeTaskProps {
  instructions: string;
  items: FakeItem[];
  fakeExplanation: string;
  onResult: (success: boolean) => void;
}

export default function SpotTheFakeTask({
  instructions,
  items,
  fakeExplanation,
  onResult,
}: SpotTheFakeTaskProps) {
  const [clicked, setClicked] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);

  function handleClick(idx: number) {
    if (solved) return;
    setClicked(idx);
    if (items[idx].isFake) {
      setSolved(true);
      setTimeout(() => onResult(true), 2800);
    } else {
      setTimeout(() => setClicked(null), 900);
    }
  }

  return (
    <div className="h-full flex flex-col p-6 bg-white gap-5">
      <p className="text-2xl font-bold text-center">{instructions}</p>

      <div className="flex gap-4 flex-1 min-h-0">
        {items.map((item, i) => {
          const isClicked = clicked === i;
          const isFakeRevealed = solved && item.isFake;
          const isLegit = solved && !item.isFake;
          const isWrongClick = isClicked && !item.isFake && !solved;

          return (
            <button
              key={i}
              onClick={() => handleClick(i)}
              className={`flex-1 rounded-2xl border-4 p-6 text-left flex flex-col gap-3 transition-all ${
                isFakeRevealed
                  ? "border-red-500 bg-red-50"
                  : isWrongClick
                  ? "border-orange-400 bg-orange-50"
                  : isLegit
                  ? "border-green-400 bg-green-50"
                  : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
              }`}
            >
              <p className="text-xl font-black">{item.label}</p>
              <p className="text-base text-gray-700 flex-1 leading-relaxed">{item.preview}</p>
              {isFakeRevealed && (
                <p className="text-red-600 font-black text-2xl mt-2 inline-flex items-center gap-1"><WarningIcon size={24} /> SCAM!</p>
              )}
              {isLegit && (
                <p className="text-green-700 font-bold text-lg mt-2">✓ Looks legit</p>
              )}
              {isWrongClick && (
                <p className="text-orange-600 font-semibold mt-2">
                  This one looks okay — keep looking!
                </p>
              )}
            </button>
          );
        })}
      </div>

      {solved && (
        <div className="bg-green-100 border-4 border-green-500 rounded-2xl p-5 shrink-0">
          <p className="text-xl font-bold text-green-800">✓ You found it! {fakeExplanation}</p>
        </div>
      )}
    </div>
  );
}
