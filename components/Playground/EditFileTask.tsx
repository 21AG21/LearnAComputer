"use client";

import { useState } from "react";
import SimulatorFrame from "./SimulatorFrame";
import FakeDesktop from "./FakeDesktop";
import AppWindow from "./Desktop/AppWindow";
import { FileDocIcon } from "./Icons";
import { checkTextEditDetailed, type TextEditFeedback } from "./TaskChecker";

interface EditFileTaskProps {
  instructions: string;
  fileName: string;
  startingText: string;
  correctText?: string;
  mustInclude: string[];
  mustNotInclude: string[];
  onResult: (success: boolean) => void;
}

export default function EditFileTask({
  instructions,
  fileName,
  startingText,
  correctText,
  mustInclude,
  mustNotInclude,
  onResult,
}: EditFileTaskProps) {
  const [phase, setPhase] = useState<"desktop" | "files" | "editing">("desktop");
  const [text, setText] = useState(startingText);
  const [feedback, setFeedback] = useState<TextEditFeedback | null>(null);
  const [showExample, setShowExample] = useState(false);
  const [done, setDone] = useState(false);

  function handleSave() {
    const result = checkTextEditDetailed(text, mustInclude, mustNotInclude);
    if (result.pass) {
      setFeedback(null);
      setDone(true);
      setTimeout(() => onResult(true), 1400);
    } else {
      setFeedback(result);
    }
  }

  const instruction =
    phase === "desktop" ? "Open Files — click the glowing icon in the dock." :
    phase === "files"   ? `Go to Documents in the sidebar, then double-click ${fileName} to open it.` :
                          instructions;

  if (phase === "editing" || done) {
    return (
      <SimulatorFrame
      phoneChrome={false}
        appName={fileName}
        appIcon={<FileDocIcon size={20} />}
        instruction={instruction}
        done={done}
        goal="Fix the invitation and save it"
      >
        <AppWindow
          title={fileName}
          icon={<FileDocIcon size={18} />}
          onClose={() => setPhase("files")}
          // No taskbar here either: minimize puts the file away, and the file
          // list is the way back. A button that did nothing read as breakage.
          onMinimize={() => setPhase("files")}
        >
          <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 flex min-h-0 gap-0">
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setFeedback(null); }}
                aria-label="File contents"
                className={`flex-1 resize-none p-6 text-base leading-relaxed border-0 focus:outline-none font-sans ${
                  showExample ? "border-r-2 border-gray-200" : ""
                }`}
              />
              {showExample && correctText && (
                <div className="w-1/2 border-l-2 border-green-400 bg-green-50 p-6 overflow-y-auto">
                  <p className="text-xs font-bold uppercase tracking-wide text-green-700 mb-3">Correct version</p>
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-800">{correctText}</p>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t-2 border-gray-200 px-6 py-3 flex items-center gap-4 bg-gray-50">
              <button
                onClick={handleSave}
                className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg border-2 border-black hover:bg-blue-700"
              >
                Save
              </button>
              {correctText && (
                <button
                  onClick={() => setShowExample((s) => !s)}
                  className="text-sm text-gray-600 underline"
                >
                  {showExample ? "Hide example" : "Show me an example"}
                </button>
              )}
              {feedback && (
                <div className="text-red-700 sim-dark:text-red-400 text-sm font-medium space-y-0.5">
                  {feedback.presentBadWords.length > 0 && (
                    <p>Misspellings to fix: {feedback.presentBadWords.map((w) => `"${w}"`).join(", ")}</p>
                  )}
                  {feedback.missingRules.length > 0 && (
                    <p>
                      {feedback.missingRules.length === 1 ? "1 required line" : `${feedback.missingRules.length} required lines`} still{" "}
                      {feedback.missingRules.length === 1 ? "needs" : "need"} work — try Show&nbsp;me&nbsp;an&nbsp;example.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </AppWindow>
      </SimulatorFrame>
    );
  }

  return (
    <SimulatorFrame
      appName="Files"
      appIcon={<FileDocIcon size={20} />}
      instruction={instruction}
      stepIndex={phase === "desktop" ? 0 : 1}
      totalSteps={2}
      done={false}
      goal={`Open and fix ${fileName}`}
      chrome={false}
    >
      <FakeDesktop
        highlightApp={phase === "desktop" ? "files" : undefined}
        onAppOpened={(app) => { if (app === "files") setPhase("files"); }}
        filesHighlight={phase === "files" ? { kind: "item", target: fileName } : null}
        onFileOpened={(name) => { if (name === fileName) setPhase("editing"); }}
      />
    </SimulatorFrame>
  );
}
