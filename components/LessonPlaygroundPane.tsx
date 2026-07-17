"use client";

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
import TextEditorTask from "@/components/Playground/TextEditorTask";
import EditFileTask from "@/components/Playground/EditFileTask";
import ComposeEmailTask from "@/components/Playground/ComposeEmailTask";
import { checkTypeText } from "@/components/Playground/TaskChecker";
import type { PlaygroundTask } from "@/lib/lessons";

interface LessonPlaygroundPaneProps {
  task: PlaygroundTask;
  /** Whether the learner has started this sub-lesson's activity — owned by the parent so it can survive across the module's shared fullscreen session. */
  started: boolean;
  onResult: (success: boolean) => void;
  /** Closes the activity and returns to the idle desktop, without leaving fullscreen or advancing lessons. */
  onExit: () => void;
}

// These activities draw their own red X (in the mockup image, BrowserSimulator, or AppWindow chrome),
// so the pane shouldn't draw a second one on top of it.
const OWN_EXIT_TASK_TYPES = ["browser-right-click", "browser-scroll-code", "pinch-zoom", "message-reply", "compose-email"];

/**
 * The right-hand playground pane on a lesson page. Idle, it's just the fake
 * desktop. Once `started`, it shows the current sub-lesson's activity. Both
 * the "start" trigger and the site's fullscreen session live one level up in
 * LessonModuleRunner, so switching between sub-lessons doesn't toggle fullscreen.
 */
export default function LessonPlaygroundPane({ task, started, onResult, onExit }: LessonPlaygroundPaneProps) {
  const showGenericExit = started && !OWN_EXIT_TASK_TYPES.includes(task.type);

  return (
    <div className="relative h-full w-full border-4 border-black bg-white overflow-hidden">
      {!started && <FakeDesktop />}

      {started && (
        <div className="relative h-full w-full">
          {showGenericExit && (
            <button
              onClick={onExit}
              aria-label="Exit activity"
              className="absolute top-2 left-2 z-20 w-9 h-9 border-2 border-red-600 rounded flex items-center justify-center text-red-600 font-bold bg-white"
            >
              ✕
            </button>
          )}

          {task.type === "keyboard-shortcut" && (
            <div className="h-full flex items-center justify-center p-8">
              <div className="w-full max-w-lg">
                <CopyPasteTask instructions={task.instructions} sourceText={task.sourceText} onResult={onResult} />
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
                  onResult={onResult}
                />
              </div>
            </div>
          )}
          {task.type === "shape-click-game" && (
            <ShapeClickGame instructions={task.instructions} targetScore={task.targetScore} onResult={onResult} />
          )}
          {task.type === "file-explorer-open" && (
            <FakeFileExplorerTask instructions={task.instructions} filesToOpen={task.filesToOpen} onResult={onResult} />
          )}
          {task.type === "browser-right-click" && (
            <FakeBrowserRightClickTask instructions={task.instructions} onResult={onResult} onExit={onExit} />
          )}
          {task.type === "browser-scroll-code" && (
            <FakeBrowserScrollCodeTask instructions={task.instructions} code={task.code} onResult={onResult} onExit={onExit} />
          )}
          {task.type === "pinch-zoom" && <PinchZoomTask instructions={task.instructions} onResult={onResult} onExit={onExit} />}
          {task.type === "message-reply" && (
            <MessagingApp
              contactName={task.contactName}
              avatarSrc={task.avatarSrc}
              initialMessages={[{ from: "contact", text: task.incomingMessage }]}
              instructionBanner={`Looks like my hands are tied. Can you type out this response for me? "${task.requiredResponse}"`}
              onSendMessage={(text) => onResult(checkTypeText(task.requiredResponse, text, true))}
              onClose={onExit}
              onMinimize={onExit}
            />
          )}
          {task.type === "match-parts" && <MatchPartsTask instructions={task.instructions} onResult={onResult} />}
          {task.type === "open-all-apps" && <OpenAllAppsTask instructions={task.instructions} onResult={onResult} />}
          {task.type === "edit-text" && (
            <TextEditorTask
              instructions={task.instructions}
              startingText={task.startingText}
              mustInclude={task.mustInclude}
              mustNotInclude={task.mustNotInclude}
              onResult={onResult}
            />
          )}
          {task.type === "edit-file" && (
            <EditFileTask
              instructions={task.instructions}
              fileName={task.fileName}
              startingText={task.startingText}
              mustInclude={task.mustInclude}
              mustNotInclude={task.mustNotInclude}
              onResult={onResult}
            />
          )}
          {task.type === "compose-email" && (
            <ComposeEmailTask to={task.to} subject={task.subject} requiredBody={task.requiredBody} onResult={onResult} onExit={onExit} />
          )}
        </div>
      )}
    </div>
  );
}
