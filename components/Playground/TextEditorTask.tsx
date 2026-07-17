"use client";

import { useState } from "react";
import { checkTextEdit } from "./TaskChecker";

interface TextEditorTaskProps {
  instructions: string;
  startingText: string;
  correctText?: string;
  mustInclude: string[];
  mustNotInclude: string[];
  onResult: (success: boolean) => void;
}

export default function TextEditorTask({
  instructions,
  startingText,
  correctText,
  mustInclude,
  mustNotInclude,
  onResult,
}: TextEditorTaskProps) {
  const [value, setValue] = useState(startingText);
  const [wrong, setWrong] = useState(false);
  const [showExample, setShowExample] = useState(false);

  function handleSubmit() {
    const success = checkTextEdit(value, mustInclude, mustNotInclude);
    setWrong(!success);
    onResult(success);
  }

  return (
    <div className="h-full flex flex-col items-center bg-white px-8 py-6 gap-4">
      <p className="text-lg text-gray-700 max-w-2xl text-center">{instructions}</p>
      <div className="w-full max-w-2xl flex-1 flex gap-4 min-h-0">
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setWrong(false);
          }}
          aria-label="Text to edit"
          className={`border-2 border-black rounded p-4 text-lg leading-relaxed resize-none min-h-[200px] ${
            showExample ? "w-1/2" : "w-full"
          }`}
        />
        {showExample && correctText && (
          <div className="w-1/2 border-2 border-green-500 bg-green-50 rounded p-4 overflow-y-auto">
            <p className="text-xs font-bold uppercase text-green-700 mb-2">Correct version</p>
            <p className="whitespace-pre-wrap text-lg leading-relaxed">{correctText}</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button onClick={handleSubmit} className="border-2 border-black rounded px-6 py-2 text-lg font-bold bg-white">
          Check my work
        </button>
        {correctText && (
          <button onClick={() => setShowExample((s) => !s)} className="text-sm text-gray-600 underline">
            {showExample ? "Hide example" : "Show me an example"}
          </button>
        )}
        {wrong && <p className="text-red-600 font-semibold">Not quite yet — keep editing and try again.</p>}
      </div>
    </div>
  );
}
