"use client";

import { useMemo, useState } from "react";
import SimulatorFrame from "./SimulatorFrame";

/**
 * A hands-on, guided file manager. The learner performs REAL file operations —
 * opening, creating folders, renaming, moving, searching, deleting, restoring,
 * saving — one guided step at a time. Each step pulses the exact thing to click
 * next and only advances when the correct action is done, so an absolute
 * beginner is walked through every click. No multiple choice.
 */

export type GuidedStep = {
  say: string;
  action:
    | "open-file"
    | "open-folder"
    | "go-to"
    | "new-folder"
    | "rename"
    | "move"
    | "search"
    | "delete"
    | "restore"
    | "save";
  target?: string; // file/folder/sidebar name the action operates on
  value?: string; // typed text (new name, search query, saved filename)
  into?: string; // destination folder for "move" and "save"
  reveal?: string; // for "search": the file that must become visible
};

interface GuidedFilesTaskProps {
  goal: string;
  steps: GuidedStep[];
  onResult: (success: boolean) => void;
}

type Loc = "home" | "documents" | "pictures" | "downloads" | "trash";

interface Item {
  id: string;
  name: string;
  kind: "file" | "folder";
  loc: Loc;
  ext?: string;
  body?: string;
}

const SIDEBAR: { id: Loc; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "documents", label: "Documents", icon: "📁" },
  { id: "pictures", label: "Pictures", icon: "📁" },
  { id: "downloads", label: "Downloads", icon: "📁" },
  { id: "trash", label: "Trash", icon: "🗑️" },
];

function makeItems(): Item[] {
  return [
    { id: "documents", name: "Documents", kind: "folder", loc: "home" },
    { id: "pictures", name: "Pictures", kind: "folder", loc: "home" },
    { id: "downloads", name: "Downloads", kind: "folder", loc: "home" },
    { id: "budget", name: "Budget.xlsx", kind: "file", loc: "home", ext: "xlsx", body: "A spreadsheet of this month's income and expenses." },
    { id: "grocery", name: "GroceryList.txt", kind: "file", loc: "home", ext: "txt", body: "Milk\nEggs\nBread\nApples" },
    { id: "vacation", name: "VacationPhoto.png", kind: "file", loc: "home", ext: "png", body: "A photo from the beach 🏖️" },
    { id: "song", name: "FavoriteSong.mp3", kind: "file", loc: "home", ext: "mp3", body: "♫ 3 minutes 24 seconds of music" },
    { id: "taxreturn", name: "TaxReturn.pdf", kind: "file", loc: "home", ext: "pdf", body: "Your 2025 tax return document." },
    { id: "resume", name: "Resume.pdf", kind: "file", loc: "documents", ext: "pdf", body: "Your work history and skills." },
    { id: "letter", name: "Letter.docx", kind: "file", loc: "documents", ext: "docx", body: "Dear Sir or Madam..." },
    { id: "sunset", name: "Sunset.png", kind: "file", loc: "pictures", ext: "png", body: "An orange sunset 🌅" },
    { id: "messy", name: "img_20250104_FINAL(2).jpg", kind: "file", loc: "downloads", ext: "jpg", body: "A blurry photo with a confusing name." },
  ];
}

function iconFor(item: Item): string {
  if (item.kind === "folder") return "📁";
  switch (item.ext) {
    case "png":
    case "jpg":
      return "🖼️";
    case "txt":
      return "📄";
    case "docx":
      return "📝";
    case "xlsx":
      return "📊";
    case "pdf":
      return "📕";
    case "mp3":
      return "🎵";
    default:
      return "📄";
  }
}

const LOC_TITLE: Record<Loc, string> = {
  home: "Home",
  documents: "Documents",
  pictures: "Pictures",
  downloads: "Downloads",
  trash: "Trash",
};

export default function GuidedFilesTask({ goal, steps, onResult }: GuidedFilesTaskProps) {
  const [items, setItems] = useState<Item[]>(makeItems);
  const [location, setLocation] = useState<Loc>("home");
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<Item | null>(null);
  const [search, setSearch] = useState("");
  const [naming, setNaming] = useState<{ id: string; draft: string } | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState(0); // sub-step within a composite action
  const [pendingComplete, setPendingComplete] = useState(false); // open-file waits for the learner to read + close
  const [saveStage, setSaveStage] = useState<"doc" | "dialog" | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saveFolder, setSaveFolder] = useState<Loc | null>(null);
  const [flash, setFlash] = useState(false); // green tick after a step completes
  const [done, setDone] = useState(false);

  const step = steps[stepIndex];
  const finished = stepIndex >= steps.length;

  const visible = useMemo(() => {
    let list = items.filter((it) => it.loc === location);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((it) => it.name.toLowerCase().includes(q));
    }
    // folders first, then files, both alphabetical
    return list.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [items, location, search]);

  function completeStep() {
    setFlash(true);
    setSelected(null);
    setNaming(null);
    setPreview(null);
    setSaveStage(null);
    setSaveFolder(null);
    setSaveName("");
    setSearch("");
    setTimeout(() => setFlash(false), 900);
    if (stepIndex + 1 >= steps.length) {
      setDone(true);
      setTimeout(() => onResult(true), 1400);
    }
    setStepIndex((i) => i + 1);
    setPhase(0);
  }

  // ---- Highlight logic: what should pulse right now ----
  function hl(kind: string, name?: string): boolean {
    if (finished || !step) return false;
    const a = step.action;
    switch (a) {
      case "open-file":
      case "open-folder":
        return kind === "item" && name === step.target;
      case "go-to":
        return kind === "sidebar" && name === step.target;
      case "search":
        return kind === "search";
      case "new-folder":
        return phase === 0 ? kind === "toolbar-newfolder" : false;
      case "rename":
        if (phase === 0) return kind === "item" && name === step.target;
        if (phase === 1) return kind === "toolbar-rename";
        return false;
      case "delete":
        if (phase === 0) return kind === "item" && name === step.target;
        if (phase === 1) return kind === "toolbar-trash";
        return false;
      case "restore":
        if (phase === 0) return kind === "sidebar" && name === "Trash" && location !== "trash";
        if (phase === 1) return kind === "item" && name === step.target;
        if (phase === 2) return kind === "toolbar-putback";
        return false;
      case "move":
        return kind === "item" && (name === step.target || name === step.into);
      case "save":
        if (saveStage === null) return kind === "save-open";
        if (saveStage === "doc") return kind === "save-open";
        if (saveStage === "dialog") {
          if (phase === 0) return kind === "save-name";
          if (phase === 1) return kind === "save-folder" && name === LOC_TITLE[step.into as Loc];
          return kind === "save-confirm";
        }
        return false;
      default:
        return false;
    }
  }

  // ---- Handlers ----
  function onItemDouble(item: Item) {
    if (item.kind === "folder") {
      setLocation(item.id as Loc);
      setSelected(null);
      setSearch("");
      if (step?.action === "open-folder" && item.name === step.target) completeStep();
      return;
    }
    setPreview(item);
    // Let the learner actually read the file; advance only when they close it.
    if (step?.action === "open-file" && item.name === step.target) setPendingComplete(true);
  }

  function handlePreviewClose() {
    if (pendingComplete) {
      setPendingComplete(false);
      completeStep();
    } else {
      setPreview(null);
    }
  }

  function onItemClick(item: Item) {
    setSelected(item.id);
    if (!step) return;
    // A single click opens during an "open" step — double-clicking is fiddly for
    // beginners, so we don't make them do it just to look inside a file or folder.
    if ((step.action === "open-file" || step.action === "open-folder") && item.name === step.target) {
      onItemDouble(item);
      return;
    }
    if (step.action === "rename" && phase === 0 && item.name === step.target) setPhase(1);
    if (step.action === "delete" && phase === 0 && item.name === step.target) setPhase(1);
    if (step.action === "restore" && phase === 1 && item.name === step.target) setPhase(2);
    // click-to-move fallback: file already selected, click destination folder
    if (
      step.action === "move" &&
      item.kind === "folder" &&
      item.name === step.into &&
      selected === itemIdByName(step.target)
    ) {
      doMove(step.target!, item.id as Loc);
    }
  }

  function itemIdByName(name?: string): string | null {
    return items.find((it) => it.name === name)?.id ?? null;
  }

  function doMove(fileName: string, dest: Loc) {
    setItems((prev) => prev.map((it) => (it.name === fileName ? { ...it, loc: dest } : it)));
    completeStep();
  }

  function onDrop(e: React.DragEvent, destItem: Item) {
    const dragName = e.dataTransfer.getData("text/plain");
    if (step?.action === "move" && dragName === step.target && destItem.name === step.into) {
      doMove(dragName, destItem.id as Loc);
    }
  }

  function onSidebar(loc: Loc, label: string) {
    setLocation(loc);
    setSelected(null);
    setSearch("");
    if (step?.action === "go-to" && label === step.target) completeStep();
    if (step?.action === "restore" && phase === 0 && loc === "trash") setPhase(1);
  }

  function clickNewFolder() {
    if (naming) return;
    const id = "newfolder-" + Date.now();
    setItems((prev) => [...prev, { id, name: "", kind: "folder", loc: location }]);
    setNaming({ id, draft: "" });
    if (step?.action === "new-folder" && phase === 0) setPhase(1);
  }

  function commitName() {
    if (!naming) return;
    const draft = naming.draft.trim();
    if (!draft) return;
    setItems((prev) => prev.map((it) => (it.id === naming.id ? { ...it, name: draft } : it)));
    const finishedName = draft;
    setNaming(null);
    if (step?.action === "new-folder" && step.value && finishedName.toLowerCase() === step.value.toLowerCase()) {
      completeStep();
    } else if (step?.action === "rename" && step.value && finishedName.toLowerCase() === step.value.toLowerCase()) {
      completeStep();
    }
  }

  function clickRename() {
    if (!selected) return;
    if (step?.action === "rename" && phase === 1) {
      const it = items.find((i) => i.id === selected);
      if (it) {
        setNaming({ id: it.id, draft: it.name });
        setPhase(2);
      }
    }
  }

  function clickTrash() {
    if (!selected) return;
    const it = items.find((i) => i.id === selected);
    if (!it) return;
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, loc: "trash" } : x)));
    setSelected(null);
    if (step?.action === "delete" && phase === 1 && it.name === step.target) completeStep();
  }

  function clickPutBack() {
    if (!selected) return;
    const it = items.find((i) => i.id === selected);
    if (!it) return;
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, loc: "home" } : x)));
    setSelected(null);
    if (step?.action === "restore" && phase === 2 && it.name === step.target) completeStep();
  }

  function onSearchChange(v: string) {
    setSearch(v);
    if (step?.action === "search" && step.reveal) {
      const q = v.trim().toLowerCase();
      const revealItem = items.find((it) => it.name === step.reveal);
      if (q.length >= 3 && revealItem && revealItem.loc === location && revealItem.name.toLowerCase().includes(q)) {
        completeStep();
      }
    }
  }

  // Save flow
  function openSaveDoc() {
    if (step?.action !== "save") return;
    setSaveStage("dialog");
    setPhase(0);
  }
  function confirmSave() {
    if (step?.action !== "save") return;
    if (saveName.trim().toLowerCase() !== (step.value || "").toLowerCase()) return;
    if (!saveFolder || LOC_TITLE[saveFolder] !== step.into) return;
    const ext = "txt";
    setItems((prev) => [
      ...prev,
      { id: "saved-" + Date.now(), name: `${saveName.trim()}.${ext}`, kind: "file", loc: saveFolder, ext, body: "Your saved note." },
    ]);
    completeStep();
  }

  const inTrash = location === "trash";
  const showSaveDoc = step?.action === "save" && !done;

  return (
    <SimulatorFrame
      appName="Files"
      appIcon="📁"
      instruction={step?.say}
      stepIndex={stepIndex}
      totalSteps={steps.length}
      done={done}
      goal={goal}
      flash={flash}
      titleBarRight={
        <div
          className={`flex items-center bg-white border-2 rounded-md px-2 py-1 ${
            hl("search") ? "border-yellow-400 ring-4 ring-yellow-300 animate-pulse" : "border-gray-400"
          }`}
        >
          <span className="text-gray-400 mr-1">🔍</span>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            className="w-28 outline-none text-sm bg-transparent"
          />
        </div>
      }
    >
      {/* Toolbar */}
      <div className="shrink-0 bg-gray-100 border-b-2 border-gray-300 px-3 py-2 flex items-center gap-2">
        <span className="font-bold text-gray-600 text-sm mr-1">{LOC_TITLE[location]}</span>
            {!inTrash && (
              <>
                <ToolbarBtn label="＋ New Folder" onClick={clickNewFolder} highlight={hl("toolbar-newfolder")} />
                <ToolbarBtn
                  label="✏️ Rename"
                  onClick={clickRename}
                  disabled={!selected}
                  highlight={hl("toolbar-rename")}
                />
                <ToolbarBtn
                  label="🗑️ Move to Trash"
                  onClick={clickTrash}
                  disabled={!selected}
                  highlight={hl("toolbar-trash")}
                />
              </>
            )}
            {inTrash && (
              <ToolbarBtn
                label="↩️ Put Back"
                onClick={clickPutBack}
                disabled={!selected}
                highlight={hl("toolbar-putback")}
              />
            )}
          </div>

          {/* Body: sidebar + files */}
          <div className="flex-1 min-h-0 flex">
            {/* Sidebar */}
            <div className="w-40 shrink-0 bg-[#eef1f5] border-r-2 border-gray-300 py-2 overflow-auto">
              {SIDEBAR.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSidebar(s.id, s.label)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 font-semibold text-sm ${
                    location === s.id ? "bg-blue-500 text-white" : "hover:bg-blue-100 text-gray-800"
                  } ${hl("sidebar", s.label) ? "ring-4 ring-inset ring-yellow-400 animate-pulse" : ""}`}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>

            {/* File grid */}
            <div className="flex-1 min-h-0 overflow-auto p-4 bg-white">
              {visible.length === 0 && (
                <p className="text-gray-400 text-center mt-10 text-lg">
                  {inTrash ? "The Trash is empty." : search ? "No files match your search." : "This folder is empty."}
                </p>
              )}
              <div className="grid grid-cols-3 gap-4 content-start">
                {visible.map((item) => {
                  const isNaming = naming?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      draggable={item.kind === "file" && !inTrash}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", item.name)}
                      onDragOver={(e) => item.kind === "folder" && e.preventDefault()}
                      onDrop={(e) => item.kind === "folder" && onDrop(e, item)}
                      onClick={() => onItemClick(item)}
                      onDoubleClick={() => onItemDouble(item)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer border-2 ${
                        selected === item.id ? "bg-blue-100 border-blue-500" : "border-transparent hover:bg-gray-100"
                      } ${hl("item", item.name) ? "ring-4 ring-yellow-400 animate-pulse border-yellow-400" : ""}`}
                    >
                      <span className="text-5xl leading-none">{iconFor(item)}</span>
                      {isNaming ? (
                        <input
                          autoFocus
                          value={naming!.draft}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setNaming({ id: item.id, draft: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitName();
                          }}
                          onBlur={commitName}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-center text-xs border-2 border-blue-500 rounded outline-none px-1"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-center break-all leading-tight max-w-full">
                          {item.name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

      {/* Preview modal */}
      {preview && (
        <Modal onClose={handlePreviewClose}>
          <div className="flex flex-col items-center gap-3 p-6">
            <span className="text-6xl">{iconFor(preview)}</span>
            <p className="text-xl font-black">{preview.name}</p>
            <p className="whitespace-pre-wrap text-center text-gray-700 text-lg">{preview.body}</p>
            <button
              onClick={handlePreviewClose}
              className={`mt-2 px-5 py-2 bg-blue-600 text-white font-bold rounded-lg border-2 border-black ${
                pendingComplete ? "ring-4 ring-yellow-400 animate-pulse" : ""
              }`}
            >
              {pendingComplete ? "Got it — Close" : "Close"}
            </button>
          </div>
        </Modal>
      )}

      {/* Save flow overlay */}
      {showSaveDoc && saveStage === null && (
        <Modal>
          <div className="flex flex-col gap-3 p-6 w-80">
            <p className="text-sm font-bold uppercase text-gray-400">TextEdit — Untitled</p>
            <div className="border-2 border-gray-300 rounded p-3 text-gray-700 h-24">Milk, eggs, bread, apples…</div>
            <button
              onClick={openSaveDoc}
              className={`self-end px-5 py-2 bg-blue-600 text-white font-bold rounded-lg border-2 border-black ${
                hl("save-open") ? "ring-4 ring-yellow-400 animate-pulse" : ""
              }`}
            >
              💾 Save
            </button>
          </div>
        </Modal>
      )}
      {showSaveDoc && saveStage === "dialog" && (
        <Modal>
          <div className="flex flex-col gap-3 p-6 w-96">
            <p className="text-lg font-black">Save As</p>
            <label className="text-sm font-semibold text-gray-600">File name:</label>
            <input
              autoFocus
              value={saveName}
              onChange={(e) => {
                setSaveName(e.target.value);
                if (step?.value && e.target.value.trim().toLowerCase() === step.value.toLowerCase() && phase === 0)
                  setPhase(1);
              }}
              placeholder="Type a name"
              className={`border-2 rounded px-3 py-2 outline-none ${
                hl("save-name") ? "border-yellow-400 ring-4 ring-yellow-300 animate-pulse" : "border-gray-400"
              }`}
            />
            <label className="text-sm font-semibold text-gray-600">Where:</label>
            <div className="flex gap-2">
              {(["documents", "pictures", "downloads"] as Loc[]).map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    setSaveFolder(loc);
                    if (step?.into === LOC_TITLE[loc] && phase === 1) setPhase(2);
                  }}
                  className={`flex-1 px-2 py-2 rounded border-2 font-semibold text-sm ${
                    saveFolder === loc ? "bg-blue-500 text-white border-blue-700" : "bg-gray-100 border-gray-400"
                  } ${hl("save-folder", LOC_TITLE[loc]) ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}
                >
                  📁 {LOC_TITLE[loc]}
                </button>
              ))}
            </div>
            <button
              onClick={confirmSave}
              className={`self-end mt-2 px-6 py-2 bg-green-600 text-white font-bold rounded-lg border-2 border-black ${
                hl("save-confirm") ? "ring-4 ring-yellow-400 animate-pulse" : ""
              }`}
            >
              Save
            </button>
          </div>
        </Modal>
      )}

    </SimulatorFrame>
  );
}

function ToolbarBtn({
  label,
  onClick,
  disabled,
  highlight,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-md border-2 border-black font-semibold text-sm bg-white disabled:opacity-30 disabled:cursor-not-allowed ${
        highlight ? "ring-4 ring-yellow-400 animate-pulse bg-yellow-50" : "hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border-4 border-black rounded-xl shadow-2xl animate-slide-down"
      >
        {children}
      </div>
    </div>
  );
}
