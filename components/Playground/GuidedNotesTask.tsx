"use client";

import { useEffect, useRef, useState } from "react";
import SimulatorFrame from "./SimulatorFrame";
import AppWindow from "./Desktop/AppWindow";
import { NoteIcon } from "./Icons";
import { checkNotesShortcut } from "./TaskChecker";

type StepAction = "type" | "select-all" | "bold" | "italic" | "underline" | "copy" | "cut" | "paste" | "undo" | "redo";

interface NotesStep {
  say: string;
  action: StepAction;
  value?: string;
}

interface GuidedNotesTaskProps {
  goal: string;
  steps: NotesStep[];
  onResult: (success: boolean) => void;
}

export default function GuidedNotesTask({ goal, steps, onResult }: GuidedNotesTaskProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [flash, setFlash] = useState(false);
  const [toolbarNudge, setToolbarNudge] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const step = steps[stepIndex];
  const finished = stepIndex >= steps.length;

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

  function completeStep() {
    setFlash(true);
    setTimeout(() => setFlash(false), 900);
    if (stepIndex + 1 >= steps.length) {
      setDone(true);
      setTimeout(() => onResult(true), 1400);
    }
    setStepIndex((i) => i + 1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!step || step.action === "type") return;
    if (checkNotesShortcut(step.action, e)) {
      // For formatting commands: call execCommand so the effect is visible
      if (step.action === "bold")      { e.preventDefault(); document.execCommand("bold"); }
      else if (step.action === "italic")    { e.preventDefault(); document.execCommand("italic"); }
      else if (step.action === "underline") { e.preventDefault(); document.execCommand("underline"); }
      // For undo/redo: let execCommand handle it naturally (or let browser do it)
      else if (step.action === "undo") { e.preventDefault(); document.execCommand("undo"); }
      else if (step.action === "redo") { e.preventDefault(); document.execCommand("redo"); }
      // For select-all/copy/cut/paste: let browser handle, just detect
      completeStep();
    }
  }

  function handleInput() {
    if (!step || step.action !== "type" || !step.value) return;
    const text = editorRef.current?.textContent ?? "";
    if (text.includes(step.value)) completeStep();
  }

  const isFormatStep = step && (step.action === "bold" || step.action === "italic" || step.action === "underline");

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
    >
      <AppWindow
        title="Notes"
        icon={<NoteIcon size={18} />}
        onClose={() => {}}
        onMinimize={() => {}}
      >
        <div className="h-full flex flex-col">
          {/* Formatting toolbar */}
          <div className="shrink-0 border-b-2 border-gray-200 px-3 py-2 flex items-center gap-1 bg-gray-50">
            {(["bold", "italic", "underline"] as const).map((fmt) => (
              <button
                key={fmt}
                onMouseDown={(e) => {
                  e.preventDefault(); // don't steal focus from editor
                  if (isFormatStep && step?.action === fmt) {
                    setToolbarNudge("Nice — that works! For this lesson, try the keyboard shortcut.");
                  } else {
                    document.execCommand(fmt);
                    editorRef.current?.focus();
                  }
                }}
                className={`w-8 h-8 rounded border-2 border-gray-300 font-semibold text-sm hover:bg-gray-200 ${
                  fmt === "bold" ? "font-black" : fmt === "italic" ? "italic" : "underline"
                } ${isFormatStep && step?.action === fmt ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}
                aria-label={fmt}
              >
                {fmt === "bold" ? "B" : fmt === "italic" ? "I" : "U"}
              </button>
            ))}
            {toolbarNudge && (
              <span className="ml-3 text-xs text-orange-700 font-semibold">{toolbarNudge}</span>
            )}
          </div>

          {/* Editor */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            className="flex-1 p-4 text-base leading-relaxed outline-none overflow-y-auto"
            aria-label="Notes editor"
          />
        </div>
      </AppWindow>
    </SimulatorFrame>
  );
}
