"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderIcon, SaveIcon, SearchIcon } from "../Icons";
import { iconFor, Item, Loc, LOC_TITLE, makeItems, SIDEBAR } from "./filesData";

// ── Public types ─────────────────────────────────────────────────────────────

export type { Item, Loc };

export interface FileManagerHighlight {
  kind: string;
  target?: string;
}

export interface FileManagerEnabled {
  open?: boolean;
  newFolder?: boolean;
  rename?: boolean;
  move?: boolean;
  search?: boolean;
  delete?: boolean;
  restore?: boolean;
}

export interface FileManagerProps {
  highlight?: FileManagerHighlight | null;
  nudge?: string | null;
  /** Increment to reset ephemeral UI state (selected, naming, search, preview) */
  resetKey?: number;
  /** Show "Got it — Close" button in the preview modal (for guided open-file step) */
  pendingPreviewClose?: boolean;
  enabled?: FileManagerEnabled;
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
}

// ── Component ─────────────────────────────────────────────────────────────────

const ALL_ENABLED: FileManagerEnabled = {
  open: true, newFolder: true, rename: true,
  move: true, search: true, delete: true, restore: true,
};

export default function FileManager({
  highlight,
  nudge,
  resetKey,
  pendingPreviewClose,
  enabled: enabledProp,
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
}: FileManagerProps) {
  const enabled: FileManagerEnabled = enabledProp ?? ALL_ENABLED;

  const [items, setItems]       = useState<Item[]>(makeItems);
  const [location, setLocation] = useState<Loc>("home");
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview]   = useState<Item | null>(null);
  const [search, setSearch]     = useState("");
  const [naming, setNaming]     = useState<{ id: string; draft: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [draggedFile, setDraggedFile] = useState<string | null>(null);

  // Reset ephemeral state when the parent increments resetKey
  useEffect(() => {
    if (resetKey === undefined) return;
    setSelected(null);
    setNaming(null);
    setPreview(null);
    setSearch("");
    setDropTarget(null);
    setDraggedFile(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setSelected(item.id);
    onItemClick?.(item);
  }

  function handleItemDoubleClick(item: Item) {
    if (item.kind === "folder") {
      setLocation(item.id as Loc);
      setSelected(null);
      setSearch("");
      onItemDoubleClick?.(item);
      return;
    }
    setPreview(item);
    onItemDoubleClick?.(item);
  }

  function handlePreviewClose() {
    if (!pendingPreviewClose) setPreview(null);
    onPreviewClose?.();
  }

  function handleNewFolder() {
    if (naming || !enabled.newFolder) return;
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
    if (!selected || !enabled.rename) return;
    const it = items.find((i) => i.id === selected);
    if (!it) return;
    onRenameButtonClick?.();
    setNaming({ id: it.id, draft: it.name });
  }

  function handleDeleteButtonClick() {
    if (!selected || !enabled.delete) return;
    const it = items.find((i) => i.id === selected);
    if (!it) return;
    setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, loc: "trash" } : x));
    setSelected(null);
    onDeleteButtonClick?.(it);
  }

  function handleRestoreButtonClick() {
    if (!selected || !enabled.restore) return;
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
    if (!dragName || !enabled.move) return;
    moveItemTo(dragName, destLoc);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="shrink-0 bg-gray-100 border-b-2 border-gray-300 px-3 py-2 flex items-center gap-2 flex-wrap">
        <span className="font-bold text-gray-600 text-sm mr-1">{LOC_TITLE[location]}</span>

        {!inTrash && (
          <>
            {enabled.newFolder && (
              <ToolbarBtn
                label="＋ New Folder"
                onClick={handleNewFolder}
                highlight={hl("toolbar-newfolder")}
              />
            )}
            {enabled.rename && (
              <ToolbarBtn
                label="Rename"
                onClick={handleRenameButtonClick}
                disabled={!selected}
                highlight={hl("toolbar-rename")}
              />
            )}
            {enabled.delete && (
              <ToolbarBtn
                label="Move to Trash"
                onClick={handleDeleteButtonClick}
                disabled={!selected}
                highlight={hl("toolbar-trash")}
              />
            )}
          </>
        )}

        {inTrash && enabled.restore && (
          <ToolbarBtn
            label="Put Back"
            onClick={handleRestoreButtonClick}
            disabled={!selected}
            highlight={hl("toolbar-putback")}
          />
        )}

        {enabled.search !== false && (
          <div
            className={`ml-auto flex items-center bg-white border-2 rounded-md px-2 py-1 ${
              hl("search") ? `border-yellow-400 ${pulse}` : "border-gray-400"
            }`}
          >
            <span className="text-gray-400 mr-1"><SearchIcon size={16} /></span>
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search"
              className="w-28 outline-none text-sm bg-transparent"
            />
          </div>
        )}
      </div>

      {/* Body: sidebar + file grid */}
      <div className="flex-1 min-h-0 flex">
        {/* Sidebar */}
        <div className="w-40 shrink-0 bg-[#eef1f5] border-r-2 border-gray-300 py-2 overflow-auto">
          {SIDEBAR.map((s) => {
            const droppable = enabled.move && s.id !== "home" && s.id !== "trash";
            const isDropOver = dropTarget === `sidebar-${s.id}`;
            return (
              <button
                key={s.id}
                onClick={() => handleSidebarClick(s.id, s.label)}
                onDragOver={droppable ? (e) => { e.preventDefault(); setDropTarget(`sidebar-${s.id}`); } : undefined}
                onDragLeave={droppable ? () => { setDropTarget((p) => p === `sidebar-${s.id}` ? null : p); } : undefined}
                onDrop={droppable ? (e) => handleDrop(e, s.id) : undefined}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 font-semibold text-sm transition-all ${
                  location === s.id ? "bg-blue-500 text-white" : "hover:bg-blue-100 text-gray-800"
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
        <div className="flex-1 min-h-0 overflow-auto p-4 bg-white relative">
          {visible.length === 0 && (
            <p className="text-gray-400 text-center mt-10 text-lg">
              {inTrash ? "The Trash is empty." : search ? "No files match your search." : "This folder is empty."}
            </p>
          )}
          <div className="grid grid-cols-3 gap-4 content-start">
            {visible.map((item) => {
              const isNaming = naming?.id === item.id;
              const canDrag = item.kind === "file" && !inTrash && (enabled.move || enabled.delete);
              const canDropFolder = item.kind === "folder" && enabled.move;
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
                    selected === item.id ? "bg-blue-100 border-blue-500" : "border-transparent hover:bg-gray-100"
                  } ${hl("item", item.name) ? `ring-4 ring-yellow-400 ${pulse} border-yellow-400` : ""} ${
                    isDropOver ? "ring-4 ring-blue-400 bg-blue-100 scale-[1.02]" : ""
                  } ${draggedFile === item.name ? "opacity-50" : ""}`}
                >
                  <span className="text-gray-500">{iconFor(item)}</span>
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

          {nudge && (
            <div className="sticky bottom-0 left-0 right-0 bg-orange-100 border-2 border-orange-400 text-orange-800 px-4 py-2 rounded-lg font-semibold text-sm text-center mt-4">
              {nudge}
            </div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {preview && (
        <FileModal onClose={handlePreviewClose}>
          <div className="flex flex-col items-center gap-3 p-6">
            <span className="text-gray-500">{iconFor(preview, 56)}</span>
            <p className="text-xl font-black">{preview.name}</p>
            <p className="whitespace-pre-wrap text-center text-gray-700 text-lg">{preview.body}</p>
            <button
              onClick={handlePreviewClose}
              className={`mt-2 px-5 py-2 bg-blue-600 text-white font-bold rounded-lg border-2 border-black ${
                pendingPreviewClose ? `ring-4 ring-yellow-400 ${pulse}` : ""
              }`}
            >
              {pendingPreviewClose ? "Got it — Close" : "Close"}
            </button>
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
      className={`px-3 py-1.5 rounded-md border-2 border-black font-semibold text-sm bg-white disabled:opacity-30 disabled:cursor-not-allowed ${
        highlight ? "ring-4 ring-yellow-400 animate-pulse bg-yellow-50" : "hover:bg-gray-100"
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
        className="bg-white border-4 border-black rounded-xl shadow-2xl animate-slide-down"
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
          <p className="text-sm font-bold uppercase text-gray-400">TextEdit — Untitled</p>
          <div className="border-2 border-gray-300 rounded p-3 text-gray-700 h-24">Milk, eggs, bread, apples…</div>
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
        <label className="text-sm font-semibold text-gray-600">File name:</label>
        <input
          autoFocus
          value={saveName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Type a name"
          className={`border-2 rounded px-3 py-2 outline-none ${
            hl("save-name") ? `border-yellow-400 ${pulse}` : "border-gray-400"
          }`}
        />
        <label className="text-sm font-semibold text-gray-600">Where:</label>
        <div className="flex gap-2">
          {(["documents", "pictures", "downloads"] as Loc[]).map((loc) => (
            <button
              key={loc}
              onClick={() => onFolderSelect(loc)}
              className={`flex-1 px-2 py-2 rounded border-2 font-semibold text-sm ${
                saveFolder === loc ? "bg-blue-500 text-white border-blue-700" : "bg-gray-100 border-gray-400"
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
