"use client";

import { useState } from "react";
import { checkTypeText, firstMismatchWord } from "./TaskChecker";

interface TypeTextTaskProps {
  instructions?: string;
  targetText: string;
  exact?: boolean;
  onResult: (success: boolean) => void;
}

export default function TypeTextTask({ instructions, targetText, exact = false, onResult }: TypeTextTaskProps) {
  const [value, setValue] = useState("");
  /** Index of the first wrong word after a failed check, so the target can point at it. */
  const [mismatch, setMismatch] = useState<number | null>(null);

  function handleSubmit() {
    const ok = checkTypeText(targetText, value, exact);
    setMismatch(ok ? null : firstMismatchWord(targetText, value, exact));
    onResult(ok);
  }

  const multiline = targetText.includes("\n");
  const words = targetText.split(/\s+/);

  /** The target text with the first wrong word marked, so "look here" needs no reading. */
  const markedTarget =
    mismatch === null ? null : (
      <>
        {words.map((w, i) => (
          <span key={i}>
            {i === mismatch ? <mark className="bg-amber-200 rounded px-0.5">{w}</mark> : w}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </>
    );

  return (
    <div className="h-full flex flex-col items-center bg-white px-8 py-6 gap-4">
      {instructions && <p className="text-lg text-gray-700 max-w-2xl text-center">{instructions}</p>}
      <div className="w-full max-w-2xl rounded-xl border-2 border-blue-600 bg-blue-50 p-5 text-center shadow-sm">
        <p className="mb-2 text-sm font-bold uppercase tracking-widest text-blue-700">Type this — exactly</p>
        {multiline ? (
          <pre className="whitespace-pre-wrap text-left font-mono text-2xl font-bold tracking-wide text-gray-900">{markedTarget ?? targetText}</pre>
        ) : (
          <p className="font-mono text-3xl font-bold tracking-wide text-gray-900">{markedTarget ?? targetText}</p>
        )}
      </div>
      {mismatch !== null && (
        <p className="text-amber-700 font-semibold text-sm -mt-2">
          Almost — check the highlighted word, then try again.
        </p>
      )}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Type the text here"
          placeholder="Start typing here… press Return to start a new line."
          rows={4}
          className="w-full max-w-2xl border-2 border-black rounded p-4 text-xl resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Type the text here"
          placeholder="Start typing here…"
          className="w-full max-w-2xl border-2 border-black rounded p-4 text-xl"
        />
      )}
      <button onClick={handleSubmit} className="border-2 border-black rounded px-6 py-2 text-lg font-bold bg-white">
        Check my work
      </button>
    </div>
  );
}
