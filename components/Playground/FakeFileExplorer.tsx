"use client";

import { useEffect, useRef, useState } from "react";
import { checkFilesOpened } from "./TaskChecker";

interface FakeFileExplorerTaskProps {
  instructions: string;
  filesToOpen: string[];
  onResult: (success: boolean) => void;
}

const ALL_FILES = ["Vacation Photo.png", "Grocery List.txt", "Budget.xlsx", "Recipe.docx", "Song.mp3"];

export default function FakeFileExplorerTask({ instructions, filesToOpen, onResult }: FakeFileExplorerTaskProps) {
  const [opened, setOpened] = useState<string[]>([]);
  const finished = useRef(false);

  useEffect(() => {
    if (!finished.current && checkFilesOpened(opened, filesToOpen)) {
      finished.current = true;
      onResult(true);
    }
  }, [opened, filesToOpen, onResult]);

  function handleDoubleClick(name: string) {
    setOpened((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">{instructions}</p>
      <ul className="border rounded divide-y">
        {ALL_FILES.map((file) => (
          <li
            key={file}
            onDoubleClick={() => handleDoubleClick(file)}
            className={`p-2 cursor-pointer select-none ${opened.includes(file) ? "bg-green-50" : ""}`}
          >
            {file}
            {opened.includes(file) && " (opened)"}
          </li>
        ))}
      </ul>
    </div>
  );
}
