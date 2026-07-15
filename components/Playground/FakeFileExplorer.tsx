"use client";

import { useEffect, useRef, useState } from "react";
import { checkFilesOpened } from "./TaskChecker";

interface FakeFileExplorerTaskProps {
  instructions: string;
  filesToOpen: string[];
  onResult: (success: boolean) => void;
}

interface FileEntry {
  name: string;
  contents: string;
}

const ALL_FILES: FileEntry[] = [
  { name: "VacationPhoto.png", contents: "A photo from the beach." },
  { name: "GroceryList.txt", contents: "Milk\nEggs\nBread\nApples" },
  { name: "Budget.xlsx", contents: "Rent: $1200\nGroceries: $300\nSavings: $200" },
  { name: "SecretRecipie.docx", contents: "Grandma's cookies: butter, sugar, flour, love." },
  { name: "FavoriteSong.mp3", contents: "Now playing your favorite song." },
];

export default function FakeFileExplorerTask({ instructions, filesToOpen, onResult }: FakeFileExplorerTaskProps) {
  const [opened, setOpened] = useState<string[]>([]);
  const [selected, setSelected] = useState<FileEntry | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    if (!finished.current && checkFilesOpened(opened, filesToOpen)) {
      finished.current = true;
      onResult(true);
    }
  }, [opened, filesToOpen, onResult]);

  function handleDoubleClick(file: FileEntry) {
    setSelected(file);
    setOpened((prev) => (prev.includes(file.name) ? prev : [...prev, file.name]));
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <p className="text-sm text-gray-500 px-6 pt-4">{instructions}</p>
      <div className="flex-1 flex gap-4 px-6 pb-6 pt-2">
        <div className="w-1/2 bg-sky-200 rounded p-4 flex flex-col">
          <h2 className="text-4xl font-bold mb-4">Files</h2>
          <ul className="bg-white rounded divide-y overflow-hidden">
            {ALL_FILES.map((file) => (
              <li
                key={file.name}
                onDoubleClick={() => handleDoubleClick(file)}
                className={`p-3 text-lg font-bold cursor-pointer select-none ${
                  opened.includes(file.name) ? "bg-green-50" : ""
                }`}
              >
                {file.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="w-1/2 bg-sky-200 rounded p-4 flex flex-col">
          <h2 className="text-xl mb-4">Double click a file to see it&rsquo;s contents!</h2>
          <div className="flex-1 bg-slate-400 rounded p-4 whitespace-pre-wrap text-white">
            {selected ? selected.contents : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
