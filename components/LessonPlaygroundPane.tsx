"use client";

import { useEffect, useState } from "react";
import FakeDesktop from "@/components/Playground/FakeDesktop";
import CopyPasteTask from "@/components/Playground/CopyPasteTask";
import TypeTextTask from "@/components/Playground/TypeTextTask";
import ShapeClickGame from "@/components/Playground/ShapeClickGame";
import DesktopFileExplorerTask from "@/components/Playground/DesktopFileExplorerTask";
import DesktopBrowserRightClickTask from "@/components/Playground/DesktopBrowserRightClickTask";
import DesktopBrowserScrollTask from "@/components/Playground/DesktopBrowserScrollTask";
import DesktopBrowserZoomTask from "@/components/Playground/DesktopBrowserZoomTask";
import MatchPartsTask from "@/components/Playground/MatchPartsTask";
import OpenAllAppsTask from "@/components/Playground/OpenAllAppsTask";
import TextEditorTask from "@/components/Playground/TextEditorTask";
import EditFileTask from "@/components/Playground/EditFileTask";
import DragSortTask from "@/components/Playground/DragSortTask";
import SpotTheFakeTask from "@/components/Playground/SpotTheFakeTask";
import UrlNavigatorTask from "@/components/Playground/UrlNavigatorTask";
import SimulatorFrame from "@/components/Playground/SimulatorFrame";
import GuidedFilesTask from "@/components/Playground/GuidedFilesTask";
import GuidedBrowserTask from "@/components/Playground/GuidedBrowserTask";
import GuidedMessagingTask from "@/components/Playground/GuidedMessagingTask";
import GuidedEmailTask from "@/components/Playground/GuidedEmailTask";
import GuidedPhotosTask from "@/components/Playground/GuidedPhotosTask";
import GuidedAppStoreTask from "@/components/Playground/GuidedAppStoreTask";
import GuidedSettingsTask from "@/components/Playground/GuidedSettingsTask";
import GuidedSecurityTask from "@/components/Playground/GuidedSecurityTask";
import GuidedTroubleshootingTask from "@/components/Playground/GuidedTroubleshootingTask";
import GuidedCalendarTask from "@/components/Playground/GuidedCalendarTask";
import GuidedDesktopTask from "@/components/Playground/GuidedDesktopTask";
import KeyboardNavTask from "@/components/Playground/KeyboardNavTask";
import GuidedNotesTask from "@/components/Playground/GuidedNotesTask";
import DesktopLaunch from "@/components/Playground/DesktopLaunch";
import RealWorldMission from "@/components/Playground/RealWorldMission";
import { NoteIcon, GlobeIcon } from "@/components/Playground/Icons";
import type { PlaygroundTask } from "@/lib/lessons";

interface LessonPlaygroundPaneProps {
  task: PlaygroundTask;
  /** Whether the learner has started this sub-lesson's activity — owned by the parent so it survives moving between sub-lessons. */
  started: boolean;
  onResult: (success: boolean, failMessage?: string) => void;
  /**
   * Closes the activity and returns to the idle desktop. The pane does not use it
   * directly — the sims that need an exit take their own — but the runner passes
   * it, so it stays part of the contract.
   */
  onExit?: () => void;
}

/**
 * Every task type this pane knows how to render. A type in the union that is not
 * in here used to produce an empty white box behind a Start activity button —
 * silent, and impossible to tell from a broken activity.
 */
const HANDLED = new Set<PlaygroundTask["type"]>([
  "keyboard-shortcut", "type-text", "shape-click-game", "file-explorer-open",
  "browser-right-click", "browser-scroll-code", "pinch-zoom", "match-parts",
  "open-all-apps", "edit-text", "edit-file", "drag-sort-files", "spot-the-fake",
  "url-navigator", "guided-files", "guided-browser", "guided-messaging",
  "guided-email", "guided-photos", "guided-app-store", "guided-settings",
  "guided-security", "guided-troubleshooting", "guided-calendar", "guided-desktop",
  "keyboard-nav-game", "notes-shortcut", "real-world", "none", "placeholder",
]);

/**
 * The right-hand playground pane on a lesson page. Idle, it's just the fake
 * desktop. Once `started`, it shows the current sub-lesson's activity. Both
 * The "start" trigger lives one level up in LessonModuleRunner, so moving
 * between sub-lessons does not reset it.
 */
export default function LessonPlaygroundPane({ task, started, onResult }: LessonPlaygroundPaneProps) {
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!started) setCompleted(false);
  }, [started]);

  const wrappedOnResult = (success: boolean, failMessage?: string) => {
    if (success) setCompleted(true);
    onResult(success, failMessage);
  };

  // text-gray-900 is not decorative: the simulated computer keeps its own light
  // appearance in dark mode, so it must not inherit the site's light text color.
  return (
    <div className="playground-root relative h-full w-full border-4 border-gray-300 bg-white text-gray-900 overflow-hidden">
      {!started && <FakeDesktop />}

      {started && (
        <div className="relative h-full w-full">
          {task.type === "keyboard-shortcut" && (
            <SimulatorFrame appName="Notes" appIcon={<NoteIcon size={18} />} instruction={task.instructions} done={completed} goal="Copy and paste complete">
              <div className="h-full flex items-center justify-center p-8">
                <div className="w-full max-w-lg">
                  <CopyPasteTask sourceText={task.sourceText} onResult={wrappedOnResult} />
                </div>
              </div>
            </SimulatorFrame>
          )}
          {task.type === "type-text" && (
            <SimulatorFrame appName="Notes" appIcon={<NoteIcon size={18} />} instruction={task.instructions} done={completed} goal="Typing practice complete">
              <div className="h-full flex items-center justify-center p-8">
                <div className="w-full max-w-lg">
                  <TypeTextTask
                    targetText={task.targetText}
                    exact={task.exact}
                    onResult={wrappedOnResult}
                  />
                </div>
              </div>
            </SimulatorFrame>
          )}
          {task.type === "shape-click-game" && (
            <SimulatorFrame appName="Practice" instruction={task.instructions} done={completed} goal="Target score reached" chrome={false}>
              <ShapeClickGame targetScore={task.targetScore} onResult={wrappedOnResult} />
            </SimulatorFrame>
          )}
          {task.type === "file-explorer-open" && (
            <DesktopFileExplorerTask filesToOpen={task.filesToOpen} onResult={wrappedOnResult} />
          )}
          {task.type === "browser-right-click" && (
            <DesktopLaunch app="browser">
              {(exit) => (
                <SimulatorFrame appName="Browser" appIcon={<GlobeIcon size={18} />} instruction={task.instructions} done={completed} goal="Link opened in a new tab" chrome={false}>
                  <DesktopBrowserRightClickTask onExit={exit} onResult={wrappedOnResult} />
                </SimulatorFrame>
              )}
            </DesktopLaunch>
          )}
          {task.type === "browser-scroll-code" && (
            <DesktopLaunch app="browser">
              {(exit) => (
                <SimulatorFrame appName="Browser" appIcon={<GlobeIcon size={18} />} instruction={task.instructions} done={completed} goal="Hidden code found" chrome={false}>
                  <DesktopBrowserScrollTask onExit={exit} code={task.code} onResult={wrappedOnResult} />
                </SimulatorFrame>
              )}
            </DesktopLaunch>
          )}
          {task.type === "pinch-zoom" && (
            <DesktopLaunch app="browser">
              {(exit) => (
                <SimulatorFrame appName="Browser" appIcon={<GlobeIcon size={18} />} instruction={task.instructions} done={completed} goal="Tiny print read" chrome={false}>
                  <DesktopBrowserZoomTask onExit={exit} onResult={wrappedOnResult} />
                </SimulatorFrame>
              )}
            </DesktopLaunch>
          )}
          {task.type === "match-parts" && (
            <SimulatorFrame appName="Practice" instruction={task.instructions} done={completed} goal="All parts matched" chrome={false}>
              <MatchPartsTask onResult={wrappedOnResult} />
            </SimulatorFrame>
          )}
          {task.type === "open-all-apps" && <OpenAllAppsTask instructions={task.instructions} targetCount={task.targetCount} onResult={wrappedOnResult} />}
          {task.type === "edit-text" && (
            <SimulatorFrame appName="Notes" appIcon={<NoteIcon size={18} />} instruction={task.instructions} done={completed} goal="Text editing complete">
              <TextEditorTask
                startingText={task.startingText}
                correctText={task.correctText}
                mustInclude={task.mustInclude}
                mustNotInclude={task.mustNotInclude}
                onResult={wrappedOnResult}
              />
            </SimulatorFrame>
          )}
          {task.type === "edit-file" && (
            <EditFileTask
              instructions={task.instructions}
              fileName={task.fileName}
              startingText={task.startingText}
              correctText={task.correctText}
              mustInclude={task.mustInclude}
              mustNotInclude={task.mustNotInclude}
              onResult={wrappedOnResult}
            />
          )}
          {task.type === "drag-sort-files" && (
            <SimulatorFrame appName="Practice" instruction={task.instructions} done={completed} goal="All sorted" chrome={false}>
              <DragSortTask instructions="" categories={task.categories} items={task.items} onResult={wrappedOnResult} />
            </SimulatorFrame>
          )}
          {task.type === "spot-the-fake" && (
            <SimulatorFrame appName="Practice" instruction={task.instructions} done={completed} goal="Fake spotted" chrome={false}>
              <SpotTheFakeTask instructions="" items={task.items} fakeExplanation={task.fakeExplanation} onResult={wrappedOnResult} />
            </SimulatorFrame>
          )}
          {task.type === "guided-settings" && (
            <GuidedSettingsTask goal={task.goal} steps={task.steps} mode={task.mode} hint={task.hint} onResult={onResult} />
          )}
          {task.type === "url-navigator" && (
            <SimulatorFrame appName="Browser" instruction={task.instructions} done={completed} goal="Correct address entered" chrome={false}>
              <UrlNavigatorTask instructions="" prompt={task.prompt} targetUrl={task.targetUrl} successTitle={task.successTitle} onResult={wrappedOnResult} />
            </SimulatorFrame>
          )}
          {task.type === "guided-files" && (
            <DesktopLaunch app="files">
              <GuidedFilesTask goal={task.goal} steps={task.steps} keyboardOnly={task.keyboardOnly} mode={task.mode} hint={task.hint} onResult={onResult} />
            </DesktopLaunch>
          )}
          {task.type === "guided-browser" && (
            <DesktopLaunch app="browser">
              <GuidedBrowserTask goal={task.goal} steps={task.steps} initialDownloads={task.initialDownloads} mode={task.mode} hint={task.hint} onResult={onResult} />
            </DesktopLaunch>
          )}
          {task.type === "guided-messaging" && (
            <DesktopLaunch app="messages">
              <GuidedMessagingTask goal={task.goal} steps={task.steps} mode={task.mode} hint={task.hint} onResult={onResult} />
            </DesktopLaunch>
          )}
          {task.type === "guided-email" && (
            <DesktopLaunch app="mail">
              <GuidedEmailTask goal={task.goal} steps={task.steps} seedDraft={task.seedDraft} mode={task.mode} hint={task.hint} onResult={onResult} />
            </DesktopLaunch>
          )}
          {task.type === "guided-photos" && (
            <DesktopLaunch app="photos">
              <GuidedPhotosTask goal={task.goal} steps={task.steps} mode={task.mode} hint={task.hint} onResult={onResult} />
            </DesktopLaunch>
          )}
          {task.type === "guided-app-store" && (
            <DesktopLaunch app="app-market">
              <GuidedAppStoreTask goal={task.goal} steps={task.steps} mode={task.mode} hint={task.hint} onResult={onResult} />
            </DesktopLaunch>
          )}
          {task.type === "guided-security" && (() => {
            const chrome = task.chrome ?? "browser";
            const inner = <GuidedSecurityTask goal={task.goal} steps={task.steps} mode={task.mode} hint={task.hint} chrome={chrome} onResult={onResult} />;
            if (chrome === "settings") return <DesktopLaunch app="settings">{inner}</DesktopLaunch>;
            if (chrome === "mail")     return <DesktopLaunch app="mail">{inner}</DesktopLaunch>;
            if (chrome === "messages") return <DesktopLaunch app="messages">{inner}</DesktopLaunch>;
            if (chrome === "bare")     return inner;
            return <DesktopLaunch app="browser">{inner}</DesktopLaunch>;
          })()}
          {task.type === "guided-troubleshooting" && (
            <GuidedTroubleshootingTask goal={task.goal} scenario={task.scenario} steps={task.steps} mode={task.mode} hint={task.hint} onResult={onResult} />
          )}
          {task.type === "guided-calendar" && (
            <DesktopLaunch app={task.launchApp ?? "calendar"}>
              <GuidedCalendarTask goal={task.goal} steps={task.steps} initialView={task.launchApp === "reminders" ? "reminders" : undefined} mode={task.mode} hint={task.hint} onResult={onResult} />
            </DesktopLaunch>
          )}
          {task.type === "guided-desktop" && (
            <GuidedDesktopTask goal={task.goal} steps={task.steps} mode={task.mode} hint={task.hint} onResult={onResult} />
          )}
          {task.type === "keyboard-nav-game" && <KeyboardNavTask onResult={onResult} />}
          {task.type === "real-world" && (
            <RealWorldMission goal={task.goal} download={task.download} steps={task.steps} onResult={onResult} />
          )}
          {!HANDLED.has(task.type) && (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <p className="max-w-sm text-gray-600">
                This activity type ({task.type}) has no playground wired up yet. Use Skip this activity to carry on —
                nothing is wrong with your computer.
              </p>
            </div>
          )}
          {task.type === "notes-shortcut" && (
            <DesktopLaunch app="notes">
              {(exit) => (
                <GuidedNotesTask
                  goal={task.goal}
                  steps={task.steps}
                  mode={task.mode}
                  hint={task.hint}
                  onExit={exit}
                  onResult={onResult}
                />
              )}
            </DesktopLaunch>
          )}
        </div>
      )}
    </div>
  );
}
