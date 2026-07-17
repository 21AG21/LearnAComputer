"use client";

import { useState } from "react";
import { checkTextEdit } from "./TaskChecker";

interface TextEditorTaskProps {
  instructions: string;
  startingText: string;
  mustInclude: string[];
  mustNotInclude: string[];
  onResult: (success: boolean) => void;
}

export default function TextEditorTask({
  instructions,
  startingText,
  mustInclude,
  mustNotInclude,
  onResult,
}: TextEditorTaskProps) {
  const [value, setValue] = useState(startingText);
  const [wrong, setWrong] = useState(false);

  function handleSubmit() {
    const success = checkTextEdit(value, mustInclude, mustNotInclude);
    setWrong(!success);
    onResult(success);
  }

  return (
    <div className="h-full flex flex-col items-center bg-white px-8 py-6 gap-4">
      <p className="text-lg text-gray-700 max-w-2xl text-center">{instructions}</p>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setWrong(false);
        }}
        aria-label="Text to edit"
        rows={10}
        className="w-full max-w-2xl flex-1 border-2 border-black rounded p-4 text-lg leading-relaxed resize-none"
      />
      <div className="flex items-center gap-4">
        <button onClick={handleSubmit} className="border-2 border-black rounded px-6 py-2 text-lg font-bold bg-white">
          Check my work
        </button>
        {wrong && <p className="text-red-600 font-semibold">Not quite yet — keep editing and try again.</p>}
      </div>
    </div>
  );
}
