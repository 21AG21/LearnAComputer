"use client";

import AppWindow from "./AppWindow";
import { FolderIcon } from "../Icons";
import FileManager from "./FileManager";
import type { FileManagerHighlight, FileManagerEnabled } from "./FileManager";

interface FilesAppProps {
  onClose: () => void;
  onMinimize: () => void;
  /** Called when the learner double-clicks a file (forwarded for task validation). */
  onFileOpened?: (name: string) => void;
  /** Yellow-highlighted hint — only pass from the specific lesson that needs it. */
  hint?: string;
  showHeader?: boolean;
  /** Pulse highlight forwarded to FileManager. */
  highlight?: FileManagerHighlight | null;
  /** Which toolbar buttons to render — absent = all buttons visible. */
  enabled?: FileManagerEnabled;
}

export default function FilesApp({ onClose, onMinimize, onFileOpened, hint, showHeader = true, highlight, enabled }: FilesAppProps) {
  return (
    <AppWindow title="Files" icon={<FolderIcon size={18} />} onClose={onClose} onMinimize={onMinimize} showHeader={showHeader}>
      <div className="h-full flex flex-col">
        {hint && (
          <p className="shrink-0 text-base border-b-2 border-yellow-400 bg-yellow-100 px-4 py-2 font-semibold">{hint}</p>
        )}
        <div className="flex-1 min-h-0">
          <FileManager
            highlight={highlight}
            enabled={enabled}
            onItemDoubleClick={(item) => { if (item.kind === "file") onFileOpened?.(item.name); }}
          />
        </div>
      </div>
    </AppWindow>
  );
}
