"use client";

import Image from "next/image";
import { useState } from "react";
import AppWindow from "./AppWindow";

interface FilesAppProps {
  onClose: () => void;
  onMinimize: () => void;
  onFileOpened?: (name: string) => void;
}

interface FileEntry {
  name: string;
  image?: string;
  contents?: string;
}

const FILES: FileEntry[] = [
  { name: "VacationPhoto.png", image: "/playgrounds/VacationPhoto.png" },
  { name: "GroceryList.txt", contents: "Milk\nEggs\nBread\nApples" },
  { name: "Budget.xlsx", image: "/playgrounds/Budget.png" },
  { name: "SecretRecipie.docx", contents: "Grandma's secret cookies:\nbutter, sugar, flour, love." },
  { name: "FavoriteSong.mp3", image: "/playgrounds/FavoriteSong.png" },
];

export default function FilesApp({ onClose, onMinimize, onFileOpened }: FilesAppProps) {
  const [selected, setSelected] = useState<(typeof FILES)[number] | null>(null);

  function handleDoubleClick(file: (typeof FILES)[number]) {
    setSelected(file);
    onFileOpened?.(file.name);
  }

  return (
    <AppWindow title="Files" onClose={onClose} onMinimize={onMinimize}>
      <div className="h-full bg-[#c9e4f7] flex gap-6 p-4">
        {/* File list */}
        <div className="w-1/2">
          <ul className="border-2 border-black divide-y-2 divide-black bg-white">
            {FILES.map((file) => (
              <li
                key={file.name}
                onDoubleClick={() => handleDoubleClick(file)}
                className="px-3 py-3 text-3xl font-bold cursor-pointer select-none"
              >
                {file.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Preview pane */}
        <div className="flex-1 flex flex-col">
          <p className="text-xl mb-2">Double click a file to see it&rsquo;s contents!</p>
          <div className="relative flex-1 bg-[#8fb4cb] border-2 border-black p-4">
            {selected?.image && (
              <Image src={selected.image} alt={selected.name} fill className="object-contain p-2" />
            )}
            {selected?.contents && (
              <p className="whitespace-pre-wrap text-2xl font-semibold text-white">{selected.contents}</p>
            )}
          </div>
        </div>
      </div>
    </AppWindow>
  );
}
