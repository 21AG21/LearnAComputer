"use client";

import { useState } from "react";

interface DragSortItem {
  label: string;
  category: string;
}

interface DragSortTaskProps {
  instructions: string;
  categories: string[];
  items: DragSortItem[];
  onResult: (success: boolean) => void;
}

const BUCKET_COLORS = [
  "border-blue-400 bg-blue-50",
  "border-green-400 bg-green-50",
  "border-orange-400 bg-orange-50",
  "border-purple-400 bg-purple-50",
];

export default function DragSortTask({ instructions, categories, items, onResult }: DragSortTaskProps) {
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);

  const unplaced = items.filter((i) => !placements[i.label]);

  function handleItemClick(label: string) {
    setSelected(selected === label ? null : label);
  }

  function handleCategoryClick(category: string) {
    if (!selected) return;
    const newPlacements = { ...placements, [selected]: category };
    setPlacements(newPlacements);
    setSelected(null);

    if (items.every((i) => newPlacements[i.label])) {
      const allCorrect = items.every((i) => newPlacements[i.label] === i.category);
      setTimeout(() => onResult(allCorrect), 600);
    }
  }

  return (
    <div className="h-full flex flex-col p-6 bg-white gap-4 overflow-hidden">
      <p className="text-xl font-bold text-center">{instructions}</p>

      {selected ? (
        <p className="text-lg text-blue-700 font-semibold text-center">
          Now click the bucket where <strong>{selected}</strong> belongs →
        </p>
      ) : unplaced.length > 0 ? (
        <p className="text-lg text-gray-500 text-center">Click an item to pick it up.</p>
      ) : null}

      {/* Unplaced items tray */}
      <div className="flex flex-wrap gap-3 justify-center min-h-[56px] px-3 py-3 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
        {unplaced.map((item) => (
          <button
            key={item.label}
            onClick={() => handleItemClick(item.label)}
            className={`px-5 py-2 rounded-xl text-lg font-bold border-4 transition-all ${
              selected === item.label
                ? "bg-blue-200 border-blue-600 scale-110 shadow-lg"
                : "bg-white border-gray-400 hover:border-blue-400 hover:bg-blue-50"
            }`}
          >
            {item.label}
          </button>
        ))}
        {unplaced.length === 0 && (
          <p className="text-gray-400 italic text-base self-center">All items placed!</p>
        )}
      </div>

      {/* Category buckets */}
      <div className="flex gap-4 flex-1 min-h-0">
        {categories.map((cat, ci) => {
          const catItems = items.filter((i) => placements[i.label] === cat);
          const isActive = !!selected;

          return (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`flex-1 rounded-2xl border-4 p-4 flex flex-col gap-2 text-left transition-all
                ${BUCKET_COLORS[ci % BUCKET_COLORS.length]}
                ${isActive ? "ring-4 ring-blue-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer" : "cursor-default"}
              `}
            >
              <p className="text-2xl font-black text-center">{cat}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {catItems.map((item) => {
                  const correct = item.category === cat;
                  return (
                    <span
                      key={item.label}
                      className={`px-3 py-1 rounded-lg text-sm font-bold border-2 ${
                        correct
                          ? "bg-green-200 border-green-500 text-green-800"
                          : "bg-red-200 border-red-500 text-red-800"
                      }`}
                    >
                      {item.label} {correct ? "✓" : "✗"}
                    </span>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
