"use client";

import { useState } from "react";

interface UrlNavigatorTaskProps {
  instructions: string;
  prompt: string;
  targetUrl: string;
  successTitle: string;
  onResult: (success: boolean) => void;
}

function normalizeUrl(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

export default function UrlNavigatorTask({
  instructions,
  prompt,
  targetUrl,
  successTitle,
  onResult,
}: UrlNavigatorTaskProps) {
  const [typed, setTyped] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  function handleNavigate() {
    const correct = normalizeUrl(typed) === normalizeUrl(targetUrl);
    if (correct) {
      setLoaded(true);
      setError(false);
      setTimeout(() => onResult(true), 1400);
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleNavigate();
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Instruction banner */}
      <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-3 shrink-0">
        <p className="text-lg font-semibold text-blue-900">{instructions}</p>
      </div>

      {/* Fake browser chrome */}
      <div className="bg-gray-100 border-b-4 border-black px-4 py-3 flex items-center gap-3 shrink-0">
        {/* Traffic lights */}
        <div className="flex gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-red-500 border border-red-700" />
          <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 border border-yellow-600" />
          <div className="w-3.5 h-3.5 rounded-full bg-green-500 border border-green-700" />
        </div>

        {/* Address bar */}
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 flex items-center bg-white border-4 border-black rounded-lg overflow-hidden">
            <span className="px-2 text-gray-400 text-lg select-none">🔍</span>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={prompt}
              disabled={loaded}
              className={`flex-1 py-2 pr-3 text-lg font-mono outline-none bg-transparent ${
                error ? "text-red-500" : "text-gray-900"
              }`}
            />
          </div>
          <button
            onClick={handleNavigate}
            disabled={loaded}
            className="px-4 py-2 bg-blue-600 text-white font-bold text-lg rounded-lg border-4 border-black disabled:opacity-40"
          >
            Go →
          </button>
        </div>
      </div>

      {/* Browser content area */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        {!loaded && !error && (
          <div className="text-center flex flex-col items-center gap-4">
            <p className="text-6xl">🌐</p>
            <p className="text-2xl font-bold text-gray-400">
              Type a web address above and press Enter or Go
            </p>
            <p className="text-lg text-gray-400 font-mono border-2 border-dashed border-gray-300 px-4 py-2 rounded-lg">
              Example: {targetUrl}
            </p>
          </div>
        )}
        {error && (
          <div className="text-center flex flex-col items-center gap-4">
            <p className="text-6xl">❌</p>
            <p className="text-2xl font-bold text-red-500">
              That address didn&apos;t work.
            </p>
            <p className="text-lg text-gray-600">
              Double-check the spelling and try again!
            </p>
          </div>
        )}
        {loaded && (
          <div className="text-center flex flex-col items-center gap-4">
            <p className="text-6xl">✅</p>
            <p className="text-4xl font-black text-gray-900">{successTitle}</p>
            <p className="text-xl text-gray-500 font-mono">
              {normalizeUrl(targetUrl)}
            </p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              Page loaded successfully!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
