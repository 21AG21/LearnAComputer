"use client";

import { useState } from "react";
import { checkTypeText } from "./TaskChecker";

interface TypeTextTaskProps {
  instructions?: string;
  targetText: string;
  exact?: boolean;
  onResult: (success: boolean) => void;
}

export default function TypeTextTask({ instructions, targetText, exact = false, onResult }: TypeTextTaskProps) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    onResult(checkTypeText(targetText, value, exact));
  }

  return (
    <div className="h-full flex flex-col items-center bg-white px-8 py-6 gap-4">
      {instructions && <p className="text-lg text-gray-700 max-w-2xl text-center">{instructions}</p>}
      <div className="w-full max-w-2xl border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-4 text-center">
        <p className="text-xs font-bold uppercase text-gray-400 mb-1">Type this:</p>
        <p className="text-2xl font-mono tracking-wide">{targetText}</p>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Start typing here…"
        className="w-full max-w-2xl border-2 border-black rounded p-4 text-lg"
      />
      <button onClick={handleSubmit} className="border-2 border-black rounded px-6 py-2 text-lg font-bold bg-white">
        Check my work
      </button>
    </div>
  );
}
