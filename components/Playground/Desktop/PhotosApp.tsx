"use client";

import { useState } from "react";
import Image from "next/image";
import AppWindow from "./AppWindow";

const PHOTOS = [
  { id: "vacation", label: "Beach Vacation", src: "/playgrounds/VacationPhoto.png" },
  { id: "dog", label: "Dog at the Park", src: "/playgrounds/Dog.png" },
  { id: "bird", label: "Bird in Garden", src: "/playgrounds/Bird.png" },
  { id: "cow", label: "Cow on the Farm", src: "/playgrounds/Cow.png" },
  { id: "snake", label: "Snake in the Sun", src: "/playgrounds/Snake.png" },
  { id: "orange-cat", label: "Orange Cat", src: "/playgrounds/Cat1.png" },
  { id: "grumpy-cat", label: "Grumpy Cat", src: "/playgrounds/Cat2.png" },
  { id: "dog-walk", label: "Dog Walk", src: "/playgrounds/animal-dog.png" },
  { id: "bird-flight", label: "Bird in Flight", src: "/playgrounds/animal-bird.png" },
  { id: "cow-field", label: "Cow in Field", src: "/playgrounds/animal-cow.png" },
  { id: "snake-coil", label: "Coiled Snake", src: "/playgrounds/animal-snake.png" },
];

interface PhotosAppProps {
  onClose?: () => void;
  onMinimize?: () => void;
  showHeader?: boolean;
}

export default function PhotosApp({ onClose = () => {}, onMinimize = () => {}, showHeader }: PhotosAppProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "favorites" | "albums">("all");

  const selectedPhoto = PHOTOS.find((p) => p.id === selected);

  return (
    <AppWindow title="Photos" onClose={onClose} onMinimize={onMinimize} showHeader={showHeader}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
        {(["all", "favorites", "albums"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 text-sm rounded-md font-medium capitalize transition-colors ${
              tab === t ? "bg-blue-500 text-white" : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t === "all" ? "All Photos" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Photo grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {tab === "albums" ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2">
              <span className="text-4xl">🗂️</span>
              <p>No albums yet.</p>
              <p className="text-xs">Open a Photos lesson to create one.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">
                {tab === "favorites" ? "Favorites" : "All Photos"} · {PHOTOS.length} photos
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {PHOTOS.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelected(selected === photo.id ? null : photo.id)}
                    className={`relative aspect-square rounded-md overflow-hidden focus-visible:outline-2 focus-visible:outline-blue-500 transition-transform ${
                      selected === photo.id ? "ring-2 ring-blue-500 scale-[0.97]" : "hover:opacity-90"
                    }`}
                  >
                    <Image src={photo.src} alt={photo.label} fill sizes="120px" className="object-cover" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Detail panel */}
        {selectedPhoto && (
          <div className="w-52 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
            <div className="relative flex-1 bg-gray-900">
              <Image src={selectedPhoto.src} alt={selectedPhoto.label} fill sizes="208px" className="object-contain" />
            </div>
            <div className="p-3 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-800 truncate">{selectedPhoto.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">Open a Photos lesson to edit.</p>
            </div>
          </div>
        )}
      </div>
    </AppWindow>
  );
}
