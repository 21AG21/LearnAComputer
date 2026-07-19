"use client";

import FakeDesktop from "@/components/Playground/FakeDesktop";
import CopyPasteTask from "@/components/Playground/CopyPasteTask";
import TypeTextTask from "@/components/Playground/TypeTextTask";
import ShapeClickGame from "@/components/Playground/ShapeClickGame";
import DesktopFileExplorerTask from "@/components/Playground/DesktopFileExplorerTask";
import DesktopBrowserRightClickTask from "@/components/Playground/DesktopBrowserRightClickTask";
import DesktopBrowserScrollTask from "@/components/Playground/DesktopBrowserScrollTask";
import DesktopBrowserZoomTask from "@/components/Playground/DesktopBrowserZoomTask";
import MessagingApp from "@/components/Playground/Desktop/MessagingApp";
import MatchPartsTask from "@/components/Playground/MatchPartsTask";
import OpenAllAppsTask from "@/components/Playground/OpenAllAppsTask";
import TextEditorTask from "@/components/Playground/TextEditorTask";
import EditFileTask from "@/components/Playground/EditFileTask";
import ComposeEmailTask from "@/components/Playground/ComposeEmailTask";
import MultipleChoiceTask from "@/components/Playground/MultipleChoiceTask";
import DragSortTask from "@/components/Playground/DragSortTask";
import SpotTheFakeTask from "@/components/Playground/SpotTheFakeTask";
import FindInSettingsTask from "@/components/Playground/FindInSettingsTask";
import UrlNavigatorTask from "@/components/Playground/UrlNavigatorTask";
import GuidedFilesTask from "@/components/Playground/GuidedFilesTask";
import GuidedBrowserTask from "@/components/Playground/GuidedBrowserTask";
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

/**
 * The right-hand playground pane on a lesson page. Idle, it's just the fake
 * desktop. Once `started`, it shows the current sub-lesson's activity. Both
 * the "start" trigger and the site's fullscreen session live one level up in
 * LessonModuleRunner, so switching between sub-lessons doesn't toggle fullscreen.
 */
export default function LessonPlaygroundPane({ task, started, onResult, onExit }: LessonPlaygroundPaneProps) {
  return (
    <div className="relative h-full w-full border-4 border-gray-300 bg-white overflow-hidden">
      {!started && <FakeDesktop />}

      {started && (
        <div className="relative h-full w-full">
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
            <DesktopFileExplorerTask filesToOpen={task.filesToOpen} onResult={onResult} />
          )}
          {task.type === "browser-right-click" && (
            <DesktopBrowserRightClickTask onResult={onResult} />
          )}
          {task.type === "browser-scroll-code" && (
            <DesktopBrowserScrollTask code={task.code} onResult={onResult} />
          )}
          {task.type === "pinch-zoom" && <DesktopBrowserZoomTask onResult={onResult} />}
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
              correctText={task.correctText}
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
              correctText={task.correctText}
              mustInclude={task.mustInclude}
              mustNotInclude={task.mustNotInclude}
              onResult={onResult}
            />
          )}
          {task.type === "compose-email" && (
            <ComposeEmailTask to={task.to} subject={task.subject} requiredBody={task.requiredBody} onResult={onResult} onExit={onExit} />
          )}
          {task.type === "multiple-choice" && (
            <MultipleChoiceTask question={task.question} options={task.options} onResult={onResult} />
          )}
          {task.type === "drag-sort-files" && (
            <DragSortTask instructions={task.instructions} categories={task.categories} items={task.items} onResult={onResult} />
          )}
          {task.type === "spot-the-fake" && (
            <SpotTheFakeTask instructions={task.instructions} items={task.items} fakeExplanation={task.fakeExplanation} onResult={onResult} />
          )}
          {task.type === "find-in-settings" && (
            <FindInSettingsTask instructions={task.instructions} targetPanel={task.targetPanel} toggleLabel={task.toggleLabel} targetValue={task.targetValue} onResult={onResult} />
          )}
          {task.type === "url-navigator" && (
            <UrlNavigatorTask instructions={task.instructions} prompt={task.prompt} targetUrl={task.targetUrl} successTitle={task.successTitle} onResult={onResult} />
          )}
          {task.type === "guided-files" && (
            <GuidedFilesTask goal={task.goal} steps={task.steps} onResult={onResult} />
          )}
          {task.type === "guided-browser" && (
            <GuidedBrowserTask goal={task.goal} steps={task.steps} onResult={onResult} />
          )}
        </div>
      )}
    </div>
  );
}
