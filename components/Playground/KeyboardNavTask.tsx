"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Keyboard navigation game: the learner uses Tab, Shift+Tab, and Enter to
 * move through a simulated form — no mouse allowed. The outer container
 * intercepts Tab key presses so real browser focus never escapes the activity.
 */

interface KeyboardNavTaskProps {
  onResult: (success: boolean) => void;
}

// Simulated form items
const ITEMS = [
  { id: "name",   label: "Name",   kind: "input"  },
  { id: "email",  label: "Email",  kind: "input"  },
  { id: "age",    label: "Age",    kind: "input"  },
  { id: "submit", label: "Submit", kind: "button" },
  { id: "cancel", label: "Cancel", kind: "button" },
] as const;

type ItemId = (typeof ITEMS)[number]["id"];

interface Step {
  instruction: string;
  key: "Tab" | "Shift+Tab" | "Enter" | "Space";
  expectedFocus?: ItemId;   // where focus lands after Tab/Shift+Tab
  activates?: ItemId;       // which button Enter/Space activates
}

const STEPS: Step[] = [
  {
    instruction: "Press Tab to move focus to the Email field.",
    key: "Tab",
    expectedFocus: "email",
  },
  {
    instruction: "Press Tab again to move to the Age field.",
    key: "Tab",
    expectedFocus: "age",
  },
  {
    instruction: "Press Shift+Tab to go back to the Email field.",
    key: "Shift+Tab",
    expectedFocus: "email",
  },
  {
    instruction: "Press Tab twice to jump to the Submit button.",
    key: "Tab",
    expectedFocus: "age",
  },
  {
    instruction: "Press Tab once more to land on Submit.",
    key: "Tab",
    expectedFocus: "submit",
  },
  {
    instruction: "Press Enter to click the Submit button.",
    key: "Enter",
    activates: "submit",
  },
];

const START_FOCUS: ItemId = "name";

export default function KeyboardNavTask({ onResult }: KeyboardNavTaskProps) {
  const [active, setActive] = useState(false); // has the learner clicked into the game area
  const [focusId, setFocusId] = useState<ItemId>(START_FOCUS);
  const [stepIdx, setStepIdx] = useState(0);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);
  const [wrongKey, setWrongKey] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const finished = useRef(false);

  const step = done ? null : STEPS[stepIdx];

  // Focus the container when the learner clicks "Start"
  useEffect(() => {
    if (active) containerRef.current?.focus();
  }, [active]);

  function advance(nextFocus: ItemId) {
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
    setFocusId(nextFocus);
    const nextStep = stepIdx + 1;
    setStepIdx(nextStep);
    if (nextStep >= STEPS.length) {
      setDone(true);
      if (!finished.current) {
        finished.current = true;
        onResult(true);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!active || done || !step) return;

    const isTab = e.key === "Tab" && !e.shiftKey;
    const isShiftTab = e.key === "Tab" && e.shiftKey;
    const isEnter = e.key === "Enter";
    const isSpace = e.key === " ";

    // Always prevent Tab from escaping the container
    if (e.key === "Tab") e.preventDefault();

    const currentIdx = ITEMS.findIndex((i) => i.id === focusId);

    if (step.key === "Tab" && isTab) {
      const nextIdx = (currentIdx + 1) % ITEMS.length;
      const nextId = ITEMS[nextIdx].id;
      if (nextId === step.expectedFocus) {
        advance(nextId);
      } else {
        // Let them Tab anyway; just don't advance the lesson step
        setFocusId(nextId);
      }
    } else if (step.key === "Shift+Tab" && isShiftTab) {
      const prevIdx = (currentIdx - 1 + ITEMS.length) % ITEMS.length;
      const prevId = ITEMS[prevIdx].id;
      if (prevId === step.expectedFocus) {
        advance(prevId);
      } else {
        setFocusId(prevId);
      }
    } else if ((step.key === "Enter" || step.key === "Space") && (isEnter || isSpace)) {
      if (focusId === step.activates) {
        advance(focusId);
      } else {
        // Wrong button or no button focused
        setWrongKey(true);
        setTimeout(() => setWrongKey(false), 600);
      }
    } else if (e.key === "Tab") {
      // Tab pressed when Shift+Tab or Enter expected — move focus but warn
      const nextIdx = (currentIdx + 1) % ITEMS.length;
      setFocusId(ITEMS[nextIdx].id);
      setWrongKey(true);
      setTimeout(() => setWrongKey(false), 600);
    }
  }

  const pct = (Math.min(stepIdx, STEPS.length) / STEPS.length) * 100;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden relative select-none">
      {/* Guidance banner */}
      <div className="shrink-0 bg-[#1d2733] text-white px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
            {done ? "Done" : `Step ${stepIdx + 1} of ${STEPS.length}`}
          </span>
          <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <p className="mt-1.5 text-lg font-semibold leading-snug">
          {done ? "🎉 You navigated the whole form without touching the mouse!" : step?.instruction}
        </p>
      </div>

      {/* Game area */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 bg-gray-50">
        {!active ? (
          <div className="text-center space-y-4">
            <p className="text-lg text-gray-600">
              Click the button below to start, then use only your keyboard — no mouse!
            </p>
            <button
              onClick={() => setActive(true)}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all text-lg"
            >
              Start keyboard navigation
            </button>
          </div>
        ) : (
          <div
            ref={containerRef}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className="w-full max-w-sm outline-none"
          >
            {/* Key legend */}
            <div className="mb-4 flex gap-4 justify-center text-sm text-gray-500">
              <span>
                <kbd className="bg-gray-200 border border-gray-400 rounded px-1.5 py-0.5 text-xs font-mono">Tab</kbd>
                {" "}next field
              </span>
              <span>
                <kbd className="bg-gray-200 border border-gray-400 rounded px-1.5 py-0.5 text-xs font-mono">Shift+Tab</kbd>
                {" "}previous field
              </span>
              <span>
                <kbd className="bg-gray-200 border border-gray-400 rounded px-1.5 py-0.5 text-xs font-mono">Enter</kbd>
                {" "}click button
              </span>
            </div>

            {/* Simulated form */}
            <div className={`border-2 rounded-xl p-5 space-y-3 bg-white shadow-md transition-all ${
              wrongKey ? "border-red-400 animate-shake" : "border-gray-300"
            }`}>
              <p className="font-bold text-gray-800 mb-1">Contact Form</p>

              {ITEMS.map((item) => {
                const isFocused = focusId === item.id;
                const isTarget = step && (step.expectedFocus === item.id || step.activates === item.id);
                return (
                  <div key={item.id}>
                    {item.kind === "input" ? (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">{item.label}</label>
                        <div
                          className={`w-full border-2 rounded-lg px-3 py-2 text-sm transition-all ${
                            isFocused
                              ? "border-blue-500 ring-4 ring-blue-200 bg-blue-50"
                              : "border-gray-300 bg-white"
                          } ${isTarget && !isFocused ? "border-yellow-400 animate-pulse" : ""}`}
                        >
                          {isFocused ? (
                            <span className="text-blue-700 font-medium">▶ Focused</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={`w-full rounded-lg px-4 py-2 font-semibold text-sm transition-all ${
                          item.id === "submit"
                            ? isFocused
                              ? "bg-blue-600 text-white ring-4 ring-blue-300 scale-105"
                              : "bg-blue-500 text-white hover:bg-blue-600"
                            : isFocused
                              ? "bg-gray-200 text-gray-800 ring-4 ring-gray-300 scale-105"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        } ${isTarget && !isFocused ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}
                        tabIndex={-1}
                      >
                        {item.label}
                        {isFocused && " ▶"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {wrongKey && (
              <p className="text-center text-red-600 text-sm mt-3 font-semibold animate-slide-down">
                Not quite — check the instruction above!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Completion overlay */}
      {done && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/30 backdrop-blur-sm animate-pop-in">
          <div className="bg-green-500 text-white text-5xl w-24 h-24 rounded-full flex items-center justify-center shadow-2xl animate-ping-once">
            ✓
          </div>
          <p className="text-xl font-bold text-white text-center px-6 drop-shadow-md">
            You navigated the whole form without touching the mouse!
          </p>
        </div>
      )}

      {/* Per-step flash */}
      {flash && !done && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <span className="text-green-400 text-6xl animate-ping-once drop-shadow-lg">✓</span>
        </div>
      )}
    </div>
  );
}
