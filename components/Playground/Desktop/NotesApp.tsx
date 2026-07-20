"use client";

import { useState } from "react";
import AppWindow from "./AppWindow";
import { NoteIcon, TrashIcon } from "../Icons";

interface NotesAppProps {
  onClose: () => void;
  onMinimize: () => void;
  showHeader?: boolean;
}

interface Note {
  id: string;
  title: string;
  body: string;
}

const PRESET_NOTES: Note[] = [
  { id: "n1", title: "Grocery List", body: "Milk\nEggs\nBread\nButter\nApples" },
  { id: "n2", title: "Meeting Notes", body: "Discussed project timeline.\nNext review: Friday.\nAction items:\n- Send report\n- Update slides" },
  { id: "n3", title: "Recipe", body: "Pasta Sauce\n\n1. Dice tomatoes and garlic\n2. Sauté in olive oil\n3. Simmer 20 minutes\n4. Season with salt and basil" },
];

let nextId = 4;

export default function NotesApp({ onClose, onMinimize, showHeader }: NotesAppProps) {
  const [notes, setNotes] = useState<Note[]>(PRESET_NOTES);
  const [selectedId, setSelectedId] = useState<string>(PRESET_NOTES[0].id);

  const selected = notes.find((n) => n.id === selectedId) ?? notes[0];

  function handleNew() {
    const id = `n${nextId++}`;
    const note: Note = { id, title: "Untitled Note", body: "" };
    setNotes((prev) => [note, ...prev]);
    setSelectedId(id);
  }

  function handleUpdateTitle(title: string) {
    setNotes((prev) => prev.map((n) => (n.id === selectedId ? { ...n, title } : n)));
  }

  function handleUpdateBody(body: string) {
    setNotes((prev) => prev.map((n) => (n.id === selectedId ? { ...n, body } : n)));
  }

  function handleDelete() {
    if (notes.length <= 1) return;
    const remaining = notes.filter((n) => n.id !== selectedId);
    setNotes(remaining);
    setSelectedId(remaining[0].id);
  }

  return (
    <AppWindow title="Notes" icon={<NoteIcon size={18} />} onClose={onClose} onMinimize={onMinimize} showHeader={showHeader}>
      <div className="flex flex-1 min-h-0">
        {/* Note list sidebar */}
        <div className="w-44 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
          <div className="p-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</span>
            <button
              onClick={handleNew}
              className="w-6 h-6 rounded-md bg-yellow-400 hover:bg-yellow-500 text-white font-bold text-sm flex items-center justify-center"
              aria-label="New note"
            >
              +
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className={`w-full text-left px-3 py-2 border-b border-gray-100 ${
                  note.id === selectedId ? "bg-yellow-100 border-l-2 border-l-yellow-400" : "hover:bg-gray-100"
                }`}
              >
                <div className="text-sm font-medium text-gray-800 truncate">{note.title || "Untitled"}</div>
                <div className="text-xs text-gray-400 truncate">{note.body.split("\n")[0] || "No content"}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor pane */}
        {selected && (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 pt-3 pb-1 flex items-center justify-between">
              <input
                value={selected.title}
                onChange={(e) => handleUpdateTitle(e.target.value)}
                className="text-lg font-bold text-gray-800 bg-transparent border-none outline-none w-full"
                placeholder="Note title"
              />
              <button
                onClick={handleDelete}
                className="shrink-0 text-xs text-gray-400 hover:text-red-500 px-2 py-1"
                aria-label="Delete note"
              >
                <TrashIcon size={14} />
              </button>
            </div>
            <textarea
              value={selected.body}
              onChange={(e) => handleUpdateBody(e.target.value)}
              className="flex-1 px-4 py-2 text-sm text-gray-700 bg-transparent border-none outline-none resize-none leading-relaxed"
              placeholder="Start typing..."
            />
          </div>
        )}
      </div>
    </AppWindow>
  );
}
