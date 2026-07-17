"use client";

import Image from "next/image";
import { useState } from "react";
import TextEditorTask from "./TextEditorTask";
import MusicNoteIcon from "./MusicNoteIcon";
import { FILLER_FILES, FileEntry } from "./Desktop/filesData";

interface EditFileTaskProps {
  instructions: string;
  fileName: string;
  startingText: string;
  correctText?: string;
  mustInclude: string[];
  mustNotInclude: string[];
  onResult: (success: boolean) => void;
}

export default function EditFileTask({
  instructions,
  fileName,
  startingText,
  correctText,
  mustInclude,
  mustNotInclude,
  onResult,
}: EditFileTaskProps) {
  const [editing, setEditing] = useState(false);
  const targetFile: FileEntry = { name: fileName, contents: startingText };
  const allFiles = [...FILLER_FILES, targetFile];
  const [selected, setSelected] = useState<FileEntry>(targetFile);

  if (editing) {
    return (
      <TextEditorTask
        instructions={instructions}
        startingText={startingText}
        correctText={correctText}
        mustInclude={mustInclude}
        mustNotInclude={mustNotInclude}
        onResult={onResult}
      />
    );
  }

  return (
    <div className="h-full bg-[#c9e4f7] flex flex-col gap-3 p-4">
      <p className="text-lg border-2 border-yellow-400 bg-yellow-100 rounded px-4 py-2">
        A new file showed up in your Files app: <span className="font-bold">{fileName}</span>. Open it below to take a
        look.
      </p>
      <div className="flex-1 flex gap-6 min-h-0">
        {/* File list — identical markup to the standalone Files app, plus this one file */}
        <div className="w-1/2">
          <ul className="border-2 border-black divide-y-2 divide-black bg-white">
            {allFiles.map((file) => (
              <li
                key={file.name}
                onDoubleClick={() => setSelected(file)}
                className={`px-3 py-3 text-3xl font-bold cursor-pointer select-none ${
                  selected.name === file.name ? "bg-blue-900 text-white" : ""
                }`}
              >
                {file.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Preview pane */}
        <div className="relative flex-1 bg-[#8fb4cb] border-2 border-black p-4">
          {selected.name === fileName && (
            <button
              onClick={() => setEditing(true)}
              className="sticky top-0 z-10 flex items-center gap-2 border-2 border-black bg-yellow-100 px-3 py-1.5 rounded font-bold mb-3"
            >
              <ExpandIcon className="w-5 h-5" />
              Click here to edit
            </button>
          )}
          {selected.image && (
            <Image src={selected.image} alt={selected.name} fill sizes="50vw" className="object-contain p-2" />
          )}
          {selected.icon === "music" && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <MusicNoteIcon className="h-full" />
            </div>
          )}
          {selected.contents && (
            <p className="whitespace-pre-wrap text-2xl font-semibold text-white">{selected.contents}</p>
          )}
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
