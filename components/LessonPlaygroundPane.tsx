"use client";

import { useEffect, useRef, useState } from "react";
import FakeDesktop from "@/components/Playground/FakeDesktop";
import CopyPasteTask from "@/components/Playground/CopyPasteTask";
import TypeTextTask from "@/components/Playground/TypeTextTask";
import ShapeClickGame from "@/components/Playground/ShapeClickGame";
import FakeFileExplorerTask from "@/components/Playground/FakeFileExplorer";
import { FakeBrowserRightClickTask, FakeBrowserScrollCodeTask } from "@/components/Playground/FakeBrowser";
import { PinchZoomTask } from "@/components/Playground/PinchZoomTask";
import MessagingApp from "@/components/Playground/Desktop/MessagingApp";
import MatchPartsTask from "@/components/Playground/MatchPartsTask";
import OpenAllAppsTask from "@/components/Playground/OpenAllAppsTask";
import type { PlaygroundTask } from "@/lib/lessons";

interface LessonPlaygroundPaneProps {
  task: PlaygroundTask;
  onResult: (success: boolean) => void;
}

// These activities draw their own red X (in the mockup image, BrowserSimulator, or AppWindow chrome),
// so the pane shouldn't draw a second one on top of it.
const OWN_EXIT_TASK_TYPES = ["browser-right-click", "browser-scroll-code", "pinch-zoom", "message-reply"];

/**
 * The right-hand playground pane on a lesson page. Idle, it's just the fake
 * desktop. When the current sub-lesson has an assessment, a "Start activity"
 * button appears over the desktop; starting it requests real browser
 * fullscreen on this pane (not just a CSS overlay) so the simulated OS can't
 * be confused with the learner's actual browser chrome.
 */
export default function LessonPlaygroundPane({ task, onResult }: LessonPlaygroundPaneProps) {
  const [activityOpen, setActivityOpen] = useState(false);
  const paneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) setActivityOpen(false);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function handleStart() {
    paneRef.current?.requestFullscreen?.().catch(() => {
      // Fullscreen can be denied (no user-gesture context, iframe restrictions, etc.) —
      // the activity still opens, just without taking over the whole screen.
    });
    setActivityOpen(true);
  }

  function exitActivity() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setActivityOpen(false);
  }

  function handleResult(success: boolean) {
    onResult(success);
    if (success) exitActivity();
  }

  const needsActivity = task.type !== "none" && task.type !== "placeholder";
  const showGenericExit = activityOpen && !OWN_EXIT_TASK_TYPES.includes(task.type);

  return (
    <div ref={paneRef} className="relative h-full w-full border-4 border-black bg-white overflow-hidden">
      {!activityOpen && (
        <>
          <FakeDesktop />
          {needsActivity && (
            <button
              onClick={handleStart}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 border-4 border-black bg-white px-6 py-3 text-lg font-bold shadow-lg"
            >
              Start activity
            </button>
          )}
        </>
      )}

      {activityOpen && (
        <div className="relative h-full w-full">
          {showGenericExit && (
            <button
              onClick={exitActivity}
              aria-label="Exit activity"
              className="absolute top-2 left-2 z-20 w-9 h-9 border-2 border-red-600 rounded flex items-center justify-center text-red-600 font-bold bg-white"
            >
              ✕
            </button>
          )}

          {task.type === "keyboard-shortcut" && (
            <div className="h-full flex items-center justify-center p-8">
              <div className="w-full max-w-lg">
                <CopyPasteTask instructions={task.instructions} sourceText={task.sourceText} onResult={handleResult} />
              </div>
            </div>
          )}
          {task.type === "type-text" && (
            <div className="h-full flex items-center justify-center p-8">
              <div className="w-full max-w-lg">
                <TypeTextTask
                  instructions={task.instructions}
                  targetText={task.targetText}
                  exact={task.exact}
                  onResult={handleResult}
                />
              </div>
            </div>
          )}
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
            <FakeBrowserRightClickTask instructions={task.instructions} onResult={handleResult} onExit={exitActivity} />
          )}
          {task.type === "browser-scroll-code" && (
            <FakeBrowserScrollCodeTask
              instructions={task.instructions}
              code={task.code}
              onResult={handleResult}
              onExit={exitActivity}
            />
          )}
          {task.type === "pinch-zoom" && (
            <PinchZoomTask instructions={task.instructions} onResult={handleResult} onExit={exitActivity} />
          )}
          {task.type === "message-reply" && (
            <MessagingApp
              contactName={task.contactName}
              avatarSrc={task.avatarSrc}
              initialMessages={[{ from: "contact", text: task.incomingMessage }]}
              onSendMessage={() => handleResult(true)}
              onClose={exitActivity}
              onMinimize={exitActivity}
            />
          )}
          {task.type === "match-parts" && <MatchPartsTask instructions={task.instructions} onResult={handleResult} />}
          {task.type === "open-all-apps" && (
            <OpenAllAppsTask instructions={task.instructions} onResult={handleResult} />
          )}
        </div>
      )}
    </div>
  );
}
