"use client";

import { useState } from "react";
import TextEditorTask from "./TextEditorTask";

interface EditFileTaskProps {
  instructions: string;
  fileName: string;
  startingText: string;
  mustInclude: string[];
  mustNotInclude: string[];
  onResult: (success: boolean) => void;
}

const FILLER_FILES = ["VacationPhoto.png", "GroceryList.txt", "Budget.xlsx", "SecretRecipie.docx", "FavoriteSong.mp3"];

export default function EditFileTask({
  instructions,
  fileName,
  startingText,
  mustInclude,
  mustNotInclude,
  onResult,
}: EditFileTaskProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <TextEditorTask
        instructions={instructions}
        startingText={startingText}
        mustInclude={mustInclude}
        mustNotInclude={mustNotInclude}
        onResult={onResult}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#c9e4f7] p-4 gap-3">
      <p className="text-lg border-2 border-yellow-400 bg-yellow-100 rounded px-4 py-2">
        A new file showed up in your Files app: <span className="font-bold">{fileName}</span>. Open it below to take a
        look.
      </p>
      <div className="flex-1 flex gap-6 min-h-0">
        <div className="w-1/3 shrink-0">
          <ul className="border-2 border-black divide-y-2 divide-black bg-white">
            {FILLER_FILES.map((name) => (
              <li key={name} className="px-3 py-3 text-lg font-bold text-gray-400 select-none">
                {name}
              </li>
            ))}
            <li className="px-3 py-3 text-lg font-bold bg-[#2451e0] text-white select-none">{fileName}</li>
          </ul>
        </div>
        <div className="relative flex-1 bg-[#8fb4cb] border-2 border-black p-4 overflow-y-auto">
          <button
            onClick={() => setEditing(true)}
            className="sticky top-0 z-10 flex items-center gap-2 border-2 border-black bg-yellow-100 px-3 py-1.5 rounded font-bold mb-3"
          >
            <ExpandIcon className="w-5 h-5" />
            Click here to edit
          </button>
          <p className="whitespace-pre-wrap text-lg font-semibold text-white">{startingText}</p>
        </div>
      </div>
    </div>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
