"use client";

import { useState } from "react";
import DrDigital from "@/components/DrDigital";
import VideoPlayer from "@/components/VideoPlayer";
import CopyPasteTask from "@/components/Playground/CopyPasteTask";
import TypeTextTask from "@/components/Playground/TypeTextTask";
import ShapeClickGame from "@/components/Playground/ShapeClickGame";
import FakeFileExplorerTask from "@/components/Playground/FakeFileExplorer";
import { FakeBrowserRightClickTask, FakeBrowserScrollCodeTask } from "@/components/Playground/FakeBrowser";
import { PinchZoomTask } from "@/components/Playground/PinchZoomTask";
import MessagingApp from "@/components/Playground/Desktop/MessagingApp";
import MatchPartsTask from "@/components/Playground/MatchPartsTask";
import OpenAllAppsTask from "@/components/Playground/OpenAllAppsTask";
import FullscreenPlayground from "@/components/Playground/FullscreenPlayground";
import type { Lesson } from "@/lib/lessons";

type AttemptState = "unattempted" | "failed" | "success";

const FULLSCREEN_TASK_TYPES = [
  "shape-click-game",
  "file-explorer-open",
  "browser-right-click",
  "browser-scroll-code",
  "pinch-zoom",
  "message-reply",
  "match-parts",
  "open-all-apps",
];

// These activities draw their own red X (in the mockup image, BrowserSimulator, or AppWindow chrome).
const OWN_EXIT_TASK_TYPES = ["browser-right-click", "browser-scroll-code", "pinch-zoom", "message-reply"];

export default function LessonRunner({ lesson }: { lesson: Lesson }) {
  const [attemptState, setAttemptState] = useState<AttemptState>("unattempted");
  const [playgroundOpen, setPlaygroundOpen] = useState(false);

  function handleResult(success: boolean) {
    setAttemptState(success ? "success" : "failed");
    if (success) setPlaygroundOpen(false);
  }

  const drDigitalMessage =
    attemptState === "success"
      ? lesson.drDigitalSuccess
      : attemptState === "failed"
      ? lesson.drDigitalHint
      : lesson.drDigitalIntro;

  const drDigitalMood = attemptState === "success" ? "success" : attemptState === "failed" ? "hint" : "neutral";

  const task = lesson.playgroundTask;
  const isFullscreenTask = FULLSCREEN_TASK_TYPES.includes(task.type);

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">{lesson.title}</h1>
      <DrDigital message={drDigitalMessage} mood={drDigitalMood} />
      <VideoPlayer videoUrl={lesson.videoUrl} title={lesson.title} />

      {attemptState === "success" ? (
        <p className="font-semibold">Lesson complete!</p>
      ) : (
        <>
          {task.type === "none" && (
            <button onClick={() => handleResult(true)} className="border rounded px-4 py-2">
              Continue
            </button>
          )}
          {task.type === "placeholder" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 border rounded p-3 bg-gray-50">This activity is coming soon.</p>
              <button onClick={() => handleResult(true)} className="border rounded px-4 py-2">
                Continue
              </button>
            </div>
          )}
          {task.type === "keyboard-shortcut" && (
            <CopyPasteTask instructions={task.instructions} sourceText={task.sourceText} onResult={handleResult} />
          )}
          {task.type === "type-text" && (
            <TypeTextTask
              instructions={task.instructions}
              targetText={task.targetText}
              exact={task.exact}
              onResult={handleResult}
            />
          )}
          {isFullscreenTask && (
            <button onClick={() => setPlaygroundOpen(true)} className="border rounded px-4 py-2">
              Start activity
            </button>
          )}
        </>
      )}

      {playgroundOpen && (
        <FullscreenPlayground
          onExit={() => setPlaygroundOpen(false)}
          showExitButton={!OWN_EXIT_TASK_TYPES.includes(task.type)}
        >
          {task.type === "shape-click-game" && (
            <ShapeClickGame instructions={task.instructions} targetScore={task.targetScore} onResult={handleResult} />
          )}
          {task.type === "file-explorer-open" && (
            <FakeFileExplorerTask
              instructions={task.instructions}
              filesToOpen={task.filesToOpen}
              onResult={handleResult}
            />
          )}
          {task.type === "browser-right-click" && (
            <FakeBrowserRightClickTask
              instructions={task.instructions}
              onResult={handleResult}
              onExit={() => setPlaygroundOpen(false)}
            />
          )}
          {task.type === "browser-scroll-code" && (
            <FakeBrowserScrollCodeTask
              instructions={task.instructions}
              code={task.code}
              onResult={handleResult}
              onExit={() => setPlaygroundOpen(false)}
            />
          )}
          {task.type === "pinch-zoom" && (
            <PinchZoomTask
              instructions={task.instructions}
              onResult={handleResult}
              onExit={() => setPlaygroundOpen(false)}
            />
          )}
          {task.type === "message-reply" && (
            <MessagingApp
              contactName={task.contactName}
              initialMessages={[{ from: "contact", text: task.incomingMessage }]}
              onSendMessage={() => handleResult(true)}
              onClose={() => setPlaygroundOpen(false)}
              onMinimize={() => setPlaygroundOpen(false)}
            />
          )}
          {task.type === "match-parts" && (
            <MatchPartsTask instructions={task.instructions} onResult={handleResult} />
          )}
          {task.type === "open-all-apps" && (
            <OpenAllAppsTask instructions={task.instructions} onResult={handleResult} />
          )}
        </FullscreenPlayground>
      )}
    </div>
  );
}
