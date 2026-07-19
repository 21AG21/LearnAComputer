"use client";

import Image from "next/image";
import { useState } from "react";
import AppWindow from "./AppWindow";
import MusicNoteIcon from "../MusicNoteIcon";
import { FILLER_FILES as FILES, FileEntry } from "./filesData";

interface FilesAppProps {
  onClose: () => void;
  onMinimize: () => void;
  onFileOpened?: (name: string) => void;
  /** Yellow-highlighted Dr. Digital-style tip — only pass this from the specific lesson that needs it. */
  hint?: string;
  showHeader?: boolean;
}

export default function FilesApp({ onClose, onMinimize, onFileOpened, hint, showHeader = true }: FilesAppProps) {
  const [selected, setSelected] = useState<FileEntry | null>(null);

  function handleDoubleClick(file: FileEntry) {
    setSelected(file);
    onFileOpened?.(file.name);
  }

  return (
    <AppWindow title="Files" icon="📁" onClose={onClose} onMinimize={onMinimize} showHeader={showHeader}>
      <div className="h-full bg-white flex flex-col gap-3 p-4">
        {hint && (
          <p className="text-lg border-2 border-yellow-400 bg-yellow-100 rounded px-4 py-2">{hint}</p>
        )}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* File list */}
          <div className="w-1/2">
            <ul className="border-2 border-gray-300 rounded-lg divide-y divide-gray-200 bg-white overflow-hidden">
              {FILES.map((file) => (
                <li
                  key={file.name}
                  onDoubleClick={() => handleDoubleClick(file)}
                  className={`px-3 py-3 text-2xl font-bold cursor-pointer select-none transition-colors ${
                    selected?.name === file.name ? "bg-blue-500 text-white" : "hover:bg-gray-100 text-gray-800"
                  }`}
                >
                  {file.name}
                </li>
              ))}
            </ul>
          </div>

          {/* Preview pane */}
          <div className="relative flex-1 bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
            {selected?.image && (
              <Image src={selected.image} alt={selected.name} fill sizes="50vw" className="object-contain p-2" />
            )}
            {selected?.icon === "music" && (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <MusicNoteIcon className="h-full" />
              </div>
            )}
            {selected?.contents && (
              <p className="whitespace-pre-wrap text-2xl font-semibold text-gray-800">{selected.contents}</p>
            )}
            {!selected && (
              <p className="text-gray-400 text-center mt-8 text-lg">Double-click a file on the left to open it.</p>
            )}
          </div>
        </div>
      </div>
    </AppWindow>
  );
}
