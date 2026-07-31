"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FolderIcon, SaveIcon, SearchIcon } from "../Icons";
import { iconFor, Item, Loc, LOC_TITLE, makeItems, SIDEBAR } from "./filesData";
import FileViewer from "./FileViewer";

// ── Public types ─────────────────────────────────────────────────────────────

export type { Item, Loc };

export interface FileManagerHighlight {
  kind: string;
  target?: string;
}

export interface FileManagerProps {
  highlight?: FileManagerHighlight | null;
  nudge?: string | null;
  /** Increment to reset ephemeral UI state (selected, naming, search, preview) */
  resetKey?: number;
  /** Show "Got it — Close" button in the preview modal (for guided open-file step) */
  pendingPreviewClose?: boolean;
  // ── Callbacks ────────────────────────────────────────────────────────────
  onSidebarClick?: (loc: Loc, label: string) => void;
  onItemClick?: (item: Item) => void;
  onItemDoubleClick?: (item: Item) => void;
  onPreviewClose?: () => void;
  onRenameButtonClick?: () => void;
  onFolderCreated?: (name: string) => void;
  onRenamed?: (item: Item, newName: string) => void;
  onDeleteButtonClick?: (item: Item) => void;
  onRestoreButtonClick?: (item: Item) => void;
  /** destName is the folder display name (e.g. "Documents"), not the Loc id */
  onMoved?: (item: Item, destName: string) => void;
  onSearchChange?: (query: string) => void;
  /** Fires whenever items change — lets parents check preconditions for auto-complete. */
  onItemsChange?: (items: Item[]) => void;
  /** When true: arrow keys navigate, Enter opens, mouse clicks are blocked with a nudge. */
  keyboardNav?: boolean;
  /** Open file in a viewer window instead of the inline modal (used by FakeDesktop freePlay). */
  onFileOpen?: (item: Item) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FileManager({
  highlight,
  nudge,
  resetKey,
  pendingPreviewClose,
  onSidebarClick,
  onItemClick,
  onItemDoubleClick,
  onPreviewClose,
  onRenameButtonClick,
  onFolderCreated,
  onRenamed,
  onDeleteButtonClick,
  onRestoreButtonClick,
  onMoved,
  onSearchChange,
  onItemsChange,
  keyboardNav = false,
  onFileOpen,
}: FileManagerProps) {

  const [items, setItems]       = useState<Item[]>(makeItems);
  const [location, setLocation] = useState<Loc>("home");
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview]   = useState<Item | null>(null);
  const [search, setSearch]     = useState("");
  const [naming, setNaming]     = useState<{ id: string; draft: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [draggedFile, setDraggedFile] = useState<string | null>(null);
  const [kbNudge, setKbNudge]       = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!kbNudge) return;
    const t = setTimeout(() => setKbNudge(null), 2000);
    return () => clearTimeout(t);
  }, [kbNudge]);

  /**
   * In keyboard-only lessons the arrow keys have to land somewhere, and clicking
   * to focus the grid is exactly what those lessons forbid (a click gets the "use
   * the arrow keys" nudge). So the grid focuses itself on mount, otherwise a
   * learner presses Down, nothing happens, and the lesson looks broken. The solver
   * only ever passed because it calls `.focus()` itself; a human never got that.
   *
   * The refocus only fires when focus falls to *nothing* — `relatedTarget` null,
   * which is what happens when a blocked click lets focus drop to `<body>`. When
   * focus moves to a real control (the file-preview's Close button, a text box in
   * an opened file) it is left alone; yanking it back would make that dialog
   * impossible to use.
   *
   * `preventScroll` so grabbing focus does not jerk the lesson pane around.
   */
  useEffect(() => {
    if (!keyboardNav) return;
    const grid = gridRef.current;
    if (!grid) return;
    grid.focus({ preventScroll: true });
    const onFocusOut = (e: FocusEvent) => {
      if (e.relatedTarget === null) grid.focus({ preventScroll: true });
    };
    grid.addEventListener("focusout", onFocusOut);
    return () => grid.removeEventListener("focusout", onFocusOut);
  }, [keyboardNav]);

  // Notify parent whenever items change so it can auto-complete precondition-already-met steps.
  useEffect(() => { onItemsChange?.(items); }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset ephemeral state when the parent increments resetKey. Selection is NOT
  // ephemeral: the keyboard lesson says "arrow until GroceryList is highlighted"
  // (step ticks) and then "now press Enter to open it" — wiping the selection
  // between those steps made Enter do nothing and the lesson unfinishable by the
  // very method it teaches. Real file managers keep selection; so do we.
  useEffect(() => {
    if (resetKey === undefined) return;
    setNaming(null);
    setPreview(null);
    setSearch("");
    setDropTarget(null);
    setDraggedFile(null);
  }, [resetKey]);

  const inTrash = location === "trash";

  const visible = useMemo(() => {
    let list = items.filter((it) => it.loc === location);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((it) => it.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [items, location, search]);

  // ── Highlight helper ──────────────────────────────────────────────────────

  function hl(kind: string, target?: string): boolean {
    if (!highlight) return false;
    if (highlight.kind !== kind) return false;
    if (highlight.target !== undefined && highlight.target !== target) return false;
    return true;
  }

  const pulse = "ring-4 ring-yellow-400 animate-pulse";

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleSidebarClick(loc: Loc, label: string) {
    setLocation(loc);
    setSelected(null);
    setSearch("");
    onSidebarClick?.(loc, label);
  }

  function handleItemClick(item: Item) {
    if (keyboardNav) { setKbNudge("Use the arrow keys for this one — no clicking!"); return; }
    setSelected(item.id);
    onItemClick?.(item);
  }

  function handleGridKeyDown(e: React.KeyboardEvent) {
    if (!keyboardNav || visible.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      const idx = visible.findIndex((i) => i.id === selected);
      const next = visible[idx < visible.length - 1 ? idx + 1 : 0];
      setSelected(next.id);
      onItemClick?.(next);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      const idx = visible.findIndex((i) => i.id === selected);
      const prev = visible[idx > 0 ? idx - 1 : visible.length - 1];
      setSelected(prev.id);
      onItemClick?.(prev);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = visible.find((i) => i.id === selected);
      if (sel) handleItemDoubleClick(sel, true);
    }
  }

  function handleItemDoubleClick(item: Item, fromKeyboard = false) {
    if (keyboardNav && !fromKeyboard) { setKbNudge("Use the arrow keys for this one — no clicking!"); return; }
    if (item.kind === "folder") {
      setLocation(item.id as Loc);
      setSelected(null);
      setSearch("");
      onItemDoubleClick?.(item);
      return;
    }
    if (onFileOpen) {
      onFileOpen(item);
    } else {
      setPreview(item);
    }
    onItemDoubleClick?.(item);
  }

  function handlePreviewClose() {
    if (!pendingPreviewClose) setPreview(null);
    onPreviewClose?.();
  }

  function handleNewFolder() {
    if (naming) return;
    const id = "newfolder-" + Date.now();
    setItems((prev) => [...prev, { id, name: "", kind: "folder", loc: location }]);
    setNaming({ id, draft: "" });
  }

  function commitName() {
    if (!naming) return;
    const draft = naming.draft.trim();
    const namingId = naming.id;
    if (!draft) {
      setItems((prev) => prev.filter((it) => it.id !== namingId));
      setNaming(null);
      return;
    }
    const isNew = items.find((it) => it.id === namingId)?.name === "";
    setItems((prev) => prev.map((it) => it.id === namingId ? { ...it, name: draft } : it));
    setNaming(null);
    const item = items.find((it) => it.id === namingId);
    if (isNew) {
      onFolderCreated?.(draft);
    } else if (item) {
      onRenamed?.(item, draft);
    }
  }

  function handleRenameButtonClick() {
    if (!selected) return;
    const it = items.find((i) => i.id === selected);
    if (!it) return;
    onRenameButtonClick?.();
    setNaming({ id: it.id, draft: it.name });
  }

  function handleDeleteButtonClick() {
    if (!selected) return;
    const it = items.find((i) => i.id === selected);
    if (!it) return;
    setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, loc: "trash" } : x));
    setSelected(null);
    onDeleteButtonClick?.(it);
  }

  function handleRestoreButtonClick() {
    if (!selected) return;
    const it = items.find((i) => i.id === selected);
    if (!it) return;
    setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, loc: "home" } : x));
    setSelected(null);
    onRestoreButtonClick?.(it);
  }

  function handleSearchChange(v: string) {
    setSearch(v);
    onSearchChange?.(v);
  }

  function moveItemTo(fileName: string, destLoc: Loc) {
    const destName = LOC_TITLE[destLoc] ?? items.find((it) => it.id === destLoc && it.kind === "folder")?.name ?? destLoc;
    setItems((prev) => prev.map((it) => it.name === fileName ? { ...it, loc: destLoc } : it));
    setDraggedFile(null);
    setDropTarget(null);
    const item = items.find((it) => it.name === fileName);
    if (item) onMoved?.(item, destName);
  }

  function handleDrop(e: React.DragEvent, destLoc: Loc) {
    e.preventDefault();
    const dragName = e.dataTransfer.getData("text/plain");
    if (!dragName) return;
    moveItemTo(dragName, destLoc);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="shrink-0 bg-gray-100 sim-dark:bg-gray-800 border-b-2 border-gray-300 sim-dark:border-gray-700 px-3 py-2 flex items-center gap-2 flex-wrap">
        <span className="font-bold text-gray-600 sim-dark:text-gray-300 text-sm mr-1">{LOC_TITLE[location]}</span>

        {!inTrash && (
          <>
            <ToolbarBtn
              label="＋ New Folder"
              onClick={handleNewFolder}
              highlight={hl("toolbar-newfolder")}
            />
            <ToolbarBtn
              label="Rename"
              onClick={handleRenameButtonClick}
              disabled={!selected}
              highlight={hl("toolbar-rename")}
            />
            <ToolbarBtn
              label="Move to Trash"
              onClick={handleDeleteButtonClick}
              disabled={!selected}
              highlight={hl("toolbar-trash")}
            />
          </>
        )}

        {inTrash && (
          <ToolbarBtn
            label="Put Back"
            onClick={handleRestoreButtonClick}
            disabled={!selected}
            highlight={hl("toolbar-putback")}
          />
        )}

        <div
          className={`ml-auto flex items-center bg-white sim-dark:bg-gray-700 border-2 rounded-md px-2 py-1 ${
            hl("search") ? `border-yellow-400 ${pulse}` : "border-gray-400 sim-dark:border-gray-600"
          }`}
        >
          <span className="text-gray-500 sim-dark:text-gray-400 sim-dark:text-gray-300 mr-1"><SearchIcon size={16} /></span>
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search"
            className="w-28 outline-none text-sm bg-transparent rounded focus-visible:ring-2 focus-visible:ring-blue-500 sim-dark:text-gray-100 sim-dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Body: sidebar + file grid */}
      <div className="flex-1 min-h-0 flex">
        {/* Sidebar */}
        <div className="w-40 shrink-0 bg-[#eef1f5] sim-dark:bg-gray-800 border-r-2 border-gray-300 sim-dark:border-gray-700 py-2 overflow-auto">
          {SIDEBAR.map((s) => {
            const droppable = s.id !== "home" && s.id !== "trash";
            const isDropOver = dropTarget === `sidebar-${s.id}`;
            return (
              <button
                key={s.id}
                onClick={() => handleSidebarClick(s.id, s.label)}
                onDragOver={droppable ? (e) => { e.preventDefault(); setDropTarget(`sidebar-${s.id}`); } : undefined}
                onDragLeave={droppable ? () => { setDropTarget((p) => p === `sidebar-${s.id}` ? null : p); } : undefined}
                onDrop={droppable ? (e) => handleDrop(e, s.id) : undefined}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 font-semibold text-sm transition-all ${
                  location === s.id ? "bg-blue-600 text-white" : "hover:bg-blue-100 sim-dark:hover:bg-gray-700 text-gray-800 sim-dark:text-gray-200"
                } ${hl("sidebar", s.label) ? `ring-4 ring-inset ring-yellow-400 ${pulse}` : ""} ${
                  isDropOver ? "ring-4 ring-blue-400 bg-blue-100 scale-[1.02]" : ""
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* File grid */}
        <div
          ref={gridRef}
          className="flex-1 min-h-0 overflow-auto p-4 bg-white sim-dark:bg-gray-900 relative outline-none"
          tabIndex={keyboardNav ? 0 : undefined}
          onKeyDown={keyboardNav ? handleGridKeyDown : undefined}
        >
          {visible.length === 0 && (
            <p className="text-gray-500 sim-dark:text-gray-400 text-center mt-10 text-lg">
              {inTrash ? "The Trash is empty." : search ? "No files match your search." : "This folder is empty."}
            </p>
          )}
          <div className="grid grid-cols-3 gap-4 content-start">
            {visible.map((item) => {
              const isNaming = naming?.id === item.id;
              const canDrag = item.kind === "file" && !inTrash;
              const canDropFolder = item.kind === "folder";
              const isDropOver = dropTarget === item.id && item.kind === "folder";
              return (
                <div
                  key={item.id}
                  draggable={canDrag}
                  onDragStart={canDrag ? (e) => { e.dataTransfer.setData("text/plain", item.name); setDraggedFile(item.name); } : undefined}
                  onDragEnd={canDrag ? () => { setDraggedFile(null); setDropTarget(null); } : undefined}
                  onDragOver={canDropFolder ? (e) => { e.preventDefault(); setDropTarget(item.id); } : undefined}
                  onDragLeave={canDropFolder ? () => { setDropTarget((p) => p === item.id ? null : p); } : undefined}
                  onDrop={canDropFolder ? (e) => handleDrop(e, item.id as Loc) : undefined}
                  onClick={() => handleItemClick(item)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer border-2 transition-all ${
                    selected === item.id ? "bg-blue-100 sim-dark:bg-blue-900 border-blue-500 sim-dark:border-blue-400" : "border-transparent hover:bg-gray-100 sim-dark:hover:bg-gray-800"
                  } ${hl("item", item.name) ? `ring-4 ring-yellow-400 ${pulse} border-yellow-400` : ""} ${
                    isDropOver ? "ring-4 ring-blue-400 bg-blue-100 scale-[1.02]" : ""
                  } ${draggedFile === item.name ? "opacity-50" : ""}`}
                >
                  <span className="text-gray-500 sim-dark:text-gray-300">{iconFor(item)}</span>
                  {isNaming ? (
                    <input
                      autoFocus
                      value={naming!.draft}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNaming({ id: item.id, draft: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setNaming(null); setItems((p) => p.filter((x) => x.id !== item.id || x.name !== "")); } }}
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

          {(nudge || kbNudge) && (
            <div className="sticky bottom-0 left-0 right-0 bg-orange-100 border-2 border-orange-400 text-orange-800 px-4 py-2 rounded-lg font-semibold text-sm text-center mt-4">
              {kbNudge ?? nudge}
            </div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {preview && (
        <FileModal onClose={handlePreviewClose}>
          {/* Same viewer the desktop opens, so a file looks identical in every unit. */}
          <div className="flex h-[26rem] w-[34rem] max-w-full flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-gray-300 sim-dark:border-gray-700 bg-gray-100 sim-dark:bg-gray-800 px-3 py-2">
              <span className="flex items-center gap-2 text-sm font-bold text-gray-700 sim-dark:text-gray-200">
                <span className="text-gray-500 sim-dark:text-gray-300">{iconFor(preview, 18)}</span>
                {preview.name}
              </span>
              <button
                onClick={handlePreviewClose}
                aria-label={`Close ${preview.name}`}
                className={`flex h-7 w-7 items-center justify-center rounded-md border-2 border-black sim-dark:border-gray-500 bg-white sim-dark:bg-gray-700 sim-dark:text-gray-100 text-sm font-bold hover:bg-gray-200 sim-dark:hover:bg-gray-600 ${
                  pendingPreviewClose ? `ring-4 ring-yellow-400 ${pulse}` : ""
                }`}
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <FileViewer item={preview} />
            </div>
          </div>
        </FileModal>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ToolbarBtn({ label, onClick, disabled, highlight }: { label: string; onClick: () => void; disabled?: boolean; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-md border-2 border-black sim-dark:border-gray-500 font-semibold text-sm bg-white sim-dark:bg-gray-700 sim-dark:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed ${
        highlight ? "ring-4 ring-yellow-400 animate-pulse bg-yellow-50 text-gray-900" : "hover:bg-gray-100 sim-dark:hover:bg-gray-600"
      }`}
    >
      {label}
    </button>
  );
}

export function FileModal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white sim-dark:bg-gray-900 border-4 border-black sim-dark:border-gray-500 rounded-xl shadow-2xl animate-slide-down"
      >
        {children}
      </div>
    </div>
  );
}

// ── Save-as dialog (used by GuidedFilesTask for the "save" step) ────────────

interface SaveDialogProps {
  stage: "doc" | "dialog";
  highlight: ((kind: string, target?: string) => boolean) | null;
  saveName: string;
  saveFolder: Loc | null;
  onSaveClick: () => void;
  onNameChange: (v: string) => void;
  onFolderSelect: (loc: Loc) => void;
  onConfirm: () => void;
}

export function SaveDialog({ stage, highlight, saveName, saveFolder, onSaveClick, onNameChange, onFolderSelect, onConfirm }: SaveDialogProps) {
  const pulse = "ring-4 ring-yellow-400 animate-pulse";
  const hl = highlight ?? (() => false);

  if (stage === "doc") {
    return (
      <FileModal>
        <div className="flex flex-col gap-3 p-6 w-80">
          <p className="text-sm font-bold uppercase text-gray-500 sim-dark:text-gray-400">TextEdit — Untitled</p>
          <div className="border-2 border-gray-300 sim-dark:border-gray-700 rounded p-3 text-gray-700 sim-dark:text-gray-200 h-24">Milk, eggs, bread, apples…</div>
          <button
            onClick={onSaveClick}
            className={`self-end px-5 py-2 bg-blue-600 text-white font-bold rounded-lg border-2 border-black ${
              hl("save-open") ? pulse : ""
            }`}
          >
            <span className="inline-flex items-center gap-1"><SaveIcon size={16} /> Save</span>
          </button>
        </div>
      </FileModal>
    );
  }

  return (
    <FileModal>
      <div className="flex flex-col gap-3 p-6 w-96">
        <p className="text-lg font-black">Save As</p>
        <label className="text-sm font-semibold text-gray-600 sim-dark:text-gray-300">File name:</label>
        <input
          autoFocus
          value={saveName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Type a name"
          className={`border-2 rounded px-3 py-2 outline-none sim-dark:bg-gray-800 sim-dark:text-gray-100 sim-dark:placeholder-gray-400 ${
            hl("save-name") ? `border-yellow-400 ${pulse}` : "border-gray-400 sim-dark:border-gray-600"
          }`}
        />
        <label className="text-sm font-semibold text-gray-600 sim-dark:text-gray-300">Where:</label>
        <div className="flex gap-2">
          {(["documents", "pictures", "downloads"] as Loc[]).map((loc) => (
            <button
              key={loc}
              onClick={() => onFolderSelect(loc)}
              className={`flex-1 px-2 py-2 rounded border-2 font-semibold text-sm ${
                saveFolder === loc ? "bg-blue-600 text-white border-blue-700" : "bg-gray-100 sim-dark:bg-gray-700 sim-dark:text-gray-100 border-gray-400 sim-dark:border-gray-600"
              } ${hl("save-folder", LOC_TITLE[loc]) ? pulse : ""}`}
            >
              <span className="inline-flex items-center gap-1"><FolderIcon size={14} /> {LOC_TITLE[loc]}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onConfirm}
          className={`self-end mt-2 px-6 py-2 bg-green-600 text-white font-bold rounded-lg border-2 border-black ${
            hl("save-confirm") ? pulse : ""
          }`}
        >
          Save
        </button>
      </div>
    </FileModal>
  );
}
