"use client";

import { useEffect, useRef, useState } from "react";
import SimulatorFrame from "./SimulatorFrame";
import { FolderIcon } from "./Icons";
import FileManager, { SaveDialog } from "./Desktop/FileManager";
import type { Item, Loc } from "./Desktop/FileManager";
import { LOC_TITLE } from "./Desktop/filesData";

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

export default function GuidedFilesTask({ goal, steps, onResult, keyboardOnly }: GuidedFilesTaskProps) {
  const [stepIndex, setStepIndex]             = useState(0);
  const [phase, setPhase]                     = useState(0);
  const [pendingComplete, setPendingComplete] = useState(false);
  const [saveStage, setSaveStage]             = useState<"dialog" | null>(null);
  const [saveName, setSaveName]               = useState("");
  const [saveFolder, setSaveFolder]           = useState<Loc | null>(null);
  const [flash, setFlash]                     = useState(false);
  const [done, setDone]                       = useState(false);
  const [nudge, setNudge]                     = useState<string | null>(null);
  const [resetKey, setResetKey]               = useState(0);

  const step = steps[stepIndex];
  const finished = stepIndex >= steps.length;

  // Track current file positions so we can auto-complete a move step when already satisfied.
  const itemsRef = useRef<Item[]>([]);

  useEffect(() => {
    if (!step || step.action !== "move" || !step.target || !step.into) return;
    const fileItem = itemsRef.current.find((x) => x.name === step.target);
    if (!fileItem) return;
    const locTitle = LOC_TITLE[fileItem.loc as Loc];
    if (locTitle === step.into) { completeStep(); return; }
    const destFolder = itemsRef.current.find((x) => x.kind === "folder" && x.name === step.into);
    if (destFolder && fileItem.loc === destFolder.id) completeStep();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  function completeStep() {
    setFlash(true);
    setNudge(null);
    setSaveStage(null);
    setSaveFolder(null);
    setSaveName("");
    setResetKey((k) => k + 1);
    setTimeout(() => setFlash(false), 900);
    if (stepIndex + 1 >= steps.length) {
      setDone(true);
      setTimeout(() => onResult(true), 1400);
    }
    setStepIndex((i) => i + 1);
    setPhase(0);
  }

  // hl() is used by SaveDialog for its internal highlights
  function hl(kind: string, target?: string): boolean {
    if (finished || !step || step.action !== "save") return false;
    if (!saveStage) return kind === "save-open";
    if (phase === 0) return kind === "save-name";
    if (phase === 1) return kind === "save-folder" && target === step.into;
    return kind === "save-confirm";
  }

  const showSave = step?.action === "save" && !done;

  return (
    <SimulatorFrame
      appName="Files"
      appIcon={<FolderIcon size={20} />}
      instruction={step?.say}
      stepIndex={stepIndex}
      totalSteps={steps.length}
      done={done}
      goal={goal}
      flash={flash}
    >
      <div className="h-full relative">
        <FileManager
          highlight={computeHighlight(step, phase, saveStage, finished)}
          nudge={nudge}
          resetKey={resetKey}
          pendingPreviewClose={pendingComplete}
          onSidebarClick={(loc, label) => {
            if (!step) return;
            if (step.action === "go-to" && label === step.target) { completeStep(); return; }
            if (step.action === "restore" && phase === 0 && loc === "trash") setPhase(1);
          }}
          onItemClick={(item) => {
            if (!step) return;
            if (step.action === "arrow-select" && item.name === step.target) { completeStep(); return; }
            if (step.action === "rename"  && phase === 0 && item.name === step.target) setPhase(1);
            if (step.action === "delete"  && phase === 0 && item.name === step.target) setPhase(1);
            if (step.action === "restore" && phase === 1 && item.name === step.target) setPhase(2);
          }}
          onItemDoubleClick={(item) => {
            if (!step) return;
            if (step.action === "open-file"   && item.name === step.target) setPendingComplete(true);
            if (step.action === "open-folder" && item.name === step.target) completeStep();
          }}
          onPreviewClose={() => {
            if (pendingComplete) { setPendingComplete(false); completeStep(); }
          }}
          onRenameButtonClick={() => {
            if (step?.action === "rename" && phase === 1) setPhase(2);
          }}
          onFolderCreated={(name) => {
            if (step?.action === "new-folder" && step.value && name.toLowerCase() === step.value.toLowerCase())
              completeStep();
          }}
          onRenamed={(_item, newName) => {
            if (step?.action === "rename" && step.value && newName.toLowerCase() === step.value.toLowerCase())
              completeStep();
          }}
          onDeleteButtonClick={(item) => {
            if (step?.action === "delete" && phase === 1 && item.name === step.target) completeStep();
          }}
          onRestoreButtonClick={(item) => {
            if (step?.action === "restore" && phase === 2 && item.name === step.target) completeStep();
          }}
          onMoved={(item, destName) => {
            if (step?.action !== "move" || item.name !== step.target) return;
            if (destName === step.into) { setNudge(null); completeStep(); }
            else setNudge(`Oops — drag it into ${step.into} instead`);
          }}
          keyboardNav={keyboardOnly}
          onItemsChange={(items) => { itemsRef.current = items; }}
          onSearchChange={(q) => {
            if (step?.action === "search" && step.reveal) {
              const trimmed = q.trim().toLowerCase();
              if (trimmed.length >= 3 && step.reveal.toLowerCase().includes(trimmed)) completeStep();
            }
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
              if (!step) return;
              if (saveName.trim().toLowerCase() !== (step.value ?? "").toLowerCase()) return;
              if (!saveFolder || LOC_TITLE[saveFolder] !== step.into) return;
              completeStep();
            }}
          />
        )}
      </div>
    </SimulatorFrame>
  );
}
