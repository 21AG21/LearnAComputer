"use client";

import { useEffect, useRef, useState } from "react";
import SimulatorFrame from "./SimulatorFrame";
import { FolderIcon } from "./Icons";
import FileManager, { SaveDialog } from "./Desktop/FileManager";
import type { Item, Loc } from "./Desktop/FileManager";
import { LOC_TITLE } from "./Desktop/filesData";
import { useStepRunner, type SimMode } from "./useStepRunner";

export type GuidedStep = {
  say: string;
  action:
    | "open-file" | "open-folder" | "go-to" | "new-folder" | "rename"
    | "move" | "search" | "delete" | "restore" | "save" | "arrow-select";
  target?: string;
  value?: string;
  into?: string;
  reveal?: string;
};

interface GuidedFilesTaskProps {
  goal: string;
  steps: GuidedStep[];
  mode?: SimMode;
  hint?: string;
  onResult: (success: boolean) => void;
  /** When true, FileManager blocks mouse clicks and only accepts keyboard/arrow input. */
  keyboardOnly?: boolean;
}

function computeHighlight(
  step: GuidedStep | undefined,
  phase: number,
  saveStage: "dialog" | null,
  finished: boolean,
): { kind: string; target?: string } | null {
  if (finished || !step) return null;
  switch (step.action) {
    case "open-file":
    case "open-folder":
    case "move":
    case "arrow-select":
      return { kind: "item", target: step.target };
    case "go-to":
      return { kind: "sidebar", target: step.target };
    case "search":
      return { kind: "search" };
    case "new-folder":
      return phase === 0 ? { kind: "toolbar-newfolder" } : null;
    case "rename":
      if (phase === 0) return { kind: "item", target: step.target };
      if (phase === 1) return { kind: "toolbar-rename" };
      return null;
    case "delete":
      if (phase === 0) return { kind: "item", target: step.target };
      if (phase === 1) return { kind: "toolbar-trash" };
      return null;
    case "restore":
      if (phase === 0) return { kind: "sidebar", target: "Trash" };
      if (phase === 1) return { kind: "item", target: step.target };
      if (phase === 2) return { kind: "toolbar-putback" };
      return null;
    case "save":
      return null; // save highlights live in SaveDialog
    default:
      return null;
  }
}

export default function GuidedFilesTask({ goal, steps, mode, hint, onResult, keyboardOnly }: GuidedFilesTaskProps) {
  /** Name of a file opened for an `open-file` step, held until its preview is closed. */
  const [pendingOpen, setPendingOpen]         = useState<string | null>(null);
  const [saveStage, setSaveStage]             = useState<"dialog" | null>(null);
  const [saveName, setSaveName]               = useState("");
  const [saveFolder, setSaveFolder]           = useState<Loc | null>(null);
  const [nudge, setNudge]                     = useState<string | null>(null);
  const [resetKey, setResetKey]               = useState(0);

  const { step, stepIndex, finished, done, flash, phase, setPhase, tryStep, wanted, wants, objectives } =
    useStepRunner({
      steps,
      mode,
      onResult,
      flashMs: 900,
      finishDelayMs: 1400,
      onStepComplete: () => {
        setNudge(null);
        setSaveStage(null);
        setSaveFolder(null);
        setSaveName("");
        setResetKey((k) => k + 1);
      },
    });

  // Track current file positions so we can auto-complete a move step when already satisfied.
  const itemsRef = useRef<Item[]>([]);

  // A move step whose file already sits in the destination is satisfied on arrival.
  useEffect(() => {
    const move = wanted((s) => s.action === "move" && !!s.target && !!s.into);
    if (!move) return;
    const fileItem = itemsRef.current.find((x) => x.name === move.target);
    if (!fileItem) return;
    const destFolder = itemsRef.current.find((x) => x.kind === "folder" && x.name === move.into);
    const settled = LOC_TITLE[fileItem.loc as Loc] === move.into || (destFolder && fileItem.loc === destFolder.id);
    if (settled) tryStep((s) => s.action === "move" && s.target === move.target && s.into === move.into);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, done]);

  // hl() is used by SaveDialog for its internal highlights
  function hl(kind: string, target?: string): boolean {
    if (finished || !step || step.action !== "save") return false;
    if (!saveStage) return kind === "save-open";
    if (phase === 0) return kind === "save-name";
    if (phase === 1) return kind === "save-folder" && target === step.into;
    return kind === "save-confirm";
  }

  const saveStep = wanted((s) => s.action === "save");
  const showSave = !!saveStep && !done;

  return (
    <SimulatorFrame
      appName="Files"
      appIcon={<FolderIcon size={20} />}
      instruction={step?.say} currentStep={step}
      stepIndex={stepIndex}
      totalSteps={steps.length}
      done={done}
      goal={goal}
      flash={flash}
      objectives={objectives}
      hint={hint}
    >
      <div className="h-full relative">
        <FileManager
          highlight={computeHighlight(step, phase, saveStage, finished)}
          nudge={nudge}
          resetKey={resetKey}
          pendingPreviewClose={!!pendingOpen}
          onSidebarClick={(loc, label) => {
            tryStep((s) => s.action === "go-to" && label === s.target);
            if (step?.action === "restore" && phase === 0 && loc === "trash") setPhase(1);
          }}
          onItemClick={(item) => {
            tryStep((s) => s.action === "arrow-select" && item.name === s.target);
            if (!step) return;
            if (step.action === "rename"  && phase === 0 && item.name === step.target) setPhase(1);
            if (step.action === "delete"  && phase === 0 && item.name === step.target) setPhase(1);
            if (step.action === "restore" && phase === 1 && item.name === step.target) setPhase(2);
          }}
          onItemDoubleClick={(item) => {
            // Opening a file only counts once the learner has read it and closed the preview.
            if (wants((s) => s.action === "open-file" && item.name === s.target)) setPendingOpen(item.name);
            tryStep((s) => s.action === "open-folder" && item.name === s.target);
          }}
          onPreviewClose={() => {
            const opened = pendingOpen;
            if (!opened) return;
            setPendingOpen(null);
            tryStep((s) => s.action === "open-file" && s.target === opened);
          }}
          onRenameButtonClick={() => {
            if (step?.action === "rename" && phase === 1) setPhase(2);
          }}
          onFolderCreated={(name) => {
            tryStep((s) => s.action === "new-folder" && !!s.value && name.toLowerCase() === s.value.toLowerCase());
          }}
          onRenamed={(_item, newName) => {
            tryStep((s) => s.action === "rename" && !!s.value && newName.toLowerCase() === s.value.toLowerCase());
          }}
          onDeleteButtonClick={(item) => {
            tryStep((s) => s.action === "delete" && item.name === s.target, phase === 1);
          }}
          onRestoreButtonClick={(item) => {
            tryStep((s) => s.action === "restore" && item.name === s.target, phase === 2);
          }}
          onMoved={(item, destName) => {
            const move = wanted((s) => s.action === "move" && item.name === s.target);
            if (!move) return;
            if (destName === move.into) tryStep((s) => s.action === "move" && s.target === move.target && s.into === move.into);
            else setNudge(`Oops — drag it into ${move.into} instead`);
          }}
          keyboardNav={keyboardOnly}
          onItemsChange={(items) => { itemsRef.current = items; }}
          onSearchChange={(q) => {
            const trimmed = q.trim().toLowerCase();
            if (trimmed.length < 3) return;
            tryStep((s) => s.action === "search" && !!s.reveal && s.reveal.toLowerCase().includes(trimmed));
          }}
        />

        {showSave && (
          <SaveDialog
            stage={saveStage ?? "doc"}
            highlight={hl}
            saveName={saveName}
            saveFolder={saveFolder}
            onSaveClick={() => { setSaveStage("dialog"); setPhase(0); }}
            onNameChange={(v) => {
              setSaveName(v);
              if (step?.value && v.trim().toLowerCase() === step.value.toLowerCase() && phase === 0) setPhase(1);
            }}
            onFolderSelect={(loc) => {
              setSaveFolder(loc);
              if (step?.into === LOC_TITLE[loc] && phase === 1) setPhase(2);
            }}
            onConfirm={() => {
              if (!saveFolder) return;
              const name = saveName.trim().toLowerCase();
              tryStep((s) => s.action === "save" && name === (s.value ?? "").toLowerCase() && LOC_TITLE[saveFolder] === s.into);
            }}
          />
        )}
      </div>
    </SimulatorFrame>
  );
}
