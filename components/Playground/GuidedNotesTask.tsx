"use client";

import { useEffect, useRef, useState } from "react";
import SimulatorFrame from "./SimulatorFrame";
import AppWindow from "./Desktop/AppWindow";
import { NoteIcon } from "./Icons";
import { checkNotesShortcut } from "./TaskChecker";
import { useStepRunner, type SimMode } from "./useStepRunner";

type StepAction = "type" | "select-all" | "bold" | "italic" | "underline" | "copy" | "cut" | "paste" | "undo" | "redo";

interface NotesStep {
  say: string;
  action: StepAction;
  value?: string;
}

interface GuidedNotesTaskProps {
  goal: string;
  steps: NotesStep[];
  mode?: SimMode;
  hint?: string;
  freePlay?: boolean;
  /** Starting contents, for the practice desktop. Never set during a lesson. */
  initialHtml?: string;
  /**
   * Puts the learner back on the desktop, where the dock icon glows again.
   *
   * Without it the window's ✕ and − were wired to `() => {}`: drawn, clickable,
   * and doing nothing at all. This course's audience reads "nothing happened" as
   * "I broke it" — the same reason the dead dock icons were fixed.
   */
  onExit?: () => void;
  onResult: (success: boolean) => void;
}

export default function GuidedNotesTask({
  goal,
  steps,
  mode,
  hint,
  freePlay,
  initialHtml,
  onExit,
  onResult,
}: GuidedNotesTaskProps) {
  const [toolbarNudge, setToolbarNudge] = useState<string | null>(null);
  const [empty, setEmpty] = useState(!initialHtml);
  const editorRef = useRef<HTMLDivElement>(null);

  // Seeded straight into the DOM rather than as children: this is a
  // contentEditable, so React must not own what is inside it. Writing it here
  // also means no input event fires, which keeps a seeded note from satisfying
  // a lesson's "type something" step on mount.
  useEffect(() => {
    if (initialHtml && editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = initialHtml;
    }
  }, [initialHtml]);

  const { step, stepIndex, finished, done, flash, tryStep, wanted, wants, objectives } =
    useStepRunner({ steps, mode, onResult, flashMs: 900, finishDelayMs: 1400 });

  // Auto-focus editor on step change
  useEffect(() => {
    if (!finished) editorRef.current?.focus();
  }, [stepIndex, finished]);

  // Clear toolbar nudge after 2s
  useEffect(() => {
    if (!toolbarNudge) return;
    const t = setTimeout(() => setToolbarNudge(null), 2000);
    return () => clearTimeout(t);
  }, [toolbarNudge]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Guided mode only recognizes the current shortcut; assessment mode accepts any one still open.
    const hit = wanted((s) => s.action !== "type" && checkNotesShortcut(s.action, e));
    if (!hit) return;
    // Formatting commands need execCommand so the effect is visible; select-all/copy/cut/paste
    // and undo/redo are left to the browser and merely detected.
    if (hit.action === "bold")           { e.preventDefault(); document.execCommand("bold"); }
    else if (hit.action === "italic")    { e.preventDefault(); document.execCommand("italic"); }
    else if (hit.action === "underline") { e.preventDefault(); document.execCommand("underline"); }
    else if (hit.action === "undo")      { e.preventDefault(); document.execCommand("undo"); }
    else if (hit.action === "redo")      { e.preventDefault(); document.execCommand("redo"); }
    tryStep((s) => s.action === hit.action);
  }

  function handleInput() {
    const text = editorRef.current?.textContent ?? "";
    setEmpty(text.trim().length === 0);
    tryStep((s) => s.action === "type" && !!s.value && (s.value === "any" ? text.trim().length > 0 : text.includes(s.value)));
  }

  const formatNudge = (fmt: "bold" | "italic" | "underline") => wants((s) => s.action === fmt);

  return (
    <SimulatorFrame
      appName="Notes"
      appIcon={<NoteIcon size={20} />}
      instruction={step?.say}
      stepIndex={stepIndex}
      totalSteps={steps.length}
      done={done}
      goal={goal}
      flash={flash}
      objectives={objectives}
      hint={hint}
      freePlay={freePlay}
    >
      <AppWindow
        title="Notes"
        icon={<NoteIcon size={18} />}
        // Minimize does what close does: this sim has no taskbar to restore
        // from, and the honest behavior is "the window goes away, the glowing
        // dock icon brings it back" — which is what both buttons now do.
        onClose={() => onExit?.()}
        onMinimize={() => onExit?.()}
        showHeader={!freePlay}
      >
        <div className="h-full flex flex-col">
          {/* Formatting toolbar */}
          <div className="shrink-0 border-b-2 border-gray-200 sim-dark:border-gray-700 px-3 py-2 flex items-center gap-1 bg-gray-50 sim-dark:bg-gray-800">
            {(["bold", "italic", "underline"] as const).map((fmt) => (
              <button
                key={fmt}
                onMouseDown={(e) => {
                  e.preventDefault(); // don't steal focus from editor
                  if (formatNudge(fmt)) {
                    setToolbarNudge("Nice — that works! For this lesson, try the keyboard shortcut.");
                  } else {
                    document.execCommand(fmt);
                    editorRef.current?.focus();
                  }
                }}
                className={`w-8 h-8 rounded border-2 border-gray-500 sim-dark:border-gray-400 sim-dark:text-gray-100 font-semibold text-sm hover:bg-gray-200 sim-dark:hover:bg-gray-700 ${
                  fmt === "bold" ? "font-black" : fmt === "italic" ? "italic" : "underline"
                } ${step?.action === fmt ? "animate-ring-pulse" : ""}`}
                aria-label={fmt}
              >
                {fmt === "bold" ? "B" : fmt === "italic" ? "I" : "U"}
              </button>
            ))}
            {toolbarNudge && (
              <span className="ml-3 text-xs text-orange-700 sim-dark:text-orange-300 font-semibold">{toolbarNudge}</span>
            )}
          </div>

          {/* Editor. An empty white rectangle tells a beginner nothing, so it
              says what it is until there is something in it. */}
          <div className="relative flex-1 min-h-0">
            {empty && (
              <p className="pointer-events-none absolute left-4 top-4 select-none text-base text-gray-500 sim-dark:text-gray-400">
                Start typing your note here.
              </p>
            )}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              className="h-full p-4 text-base leading-relaxed outline-none overflow-y-auto focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sim-dark:text-gray-100"
              aria-label="Notes editor"
            />
          </div>
        </div>
      </AppWindow>
    </SimulatorFrame>
  );
}
