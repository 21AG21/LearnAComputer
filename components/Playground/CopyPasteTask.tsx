"use client";

import { useState } from "react";
import { checkCopyPasteTask } from "./TaskChecker";

interface CopyPasteTaskProps {
  instructions: string;
  sourceText: string;
  onResult: (success: boolean) => void;
}

export default function CopyPasteTask({ instructions, sourceText, onResult }: CopyPasteTaskProps) {
  const [pasted, setPasted] = useState("");

  function handleSubmit() {
    const success = checkCopyPasteTask("pasted-matches-source", {
      source: sourceText,
      pasted,
    });
    onResult(success);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{instructions}</p>
      <div>
        <p className="text-sm text-gray-500 mb-1">Select and copy this text:</p>
        <p className="border rounded p-2 bg-gray-50 select-all">{sourceText}</p>
      </div>
      <div>
        <label htmlFor="paste-target" className="text-sm text-gray-500 mb-1 block">
          Paste it here:
        </label>
        <textarea
          id="paste-target"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          className="border rounded p-2 w-full"
          rows={3}
        />
      </div>
      <button onClick={handleSubmit} className="border rounded px-4 py-2">
        Check my work
      </button>
    </div>
  );
}
