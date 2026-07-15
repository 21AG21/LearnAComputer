"use client";

import { useState } from "react";
import { checkTypeText } from "./TaskChecker";

interface TypeTextTaskProps {
  instructions: string;
  targetText: string;
  onResult: (success: boolean) => void;
}

export default function TypeTextTask({ instructions, targetText, onResult }: TypeTextTaskProps) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    onResult(checkTypeText(targetText, value));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{instructions}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="border rounded p-2 w-full"
      />
      <button onClick={handleSubmit} className="border rounded px-4 py-2">
        Check my work
      </button>
    </div>
  );
}
