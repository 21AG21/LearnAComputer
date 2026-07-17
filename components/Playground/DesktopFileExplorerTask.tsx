"use client";

import { useEffect, useRef, useState } from "react";
import FakeDesktop from "./FakeDesktop";
import { checkFilesOpened } from "./TaskChecker";

interface DesktopFileExplorerTaskProps {
  filesToOpen: string[];
  onResult: (success: boolean) => void;
}

export default function DesktopFileExplorerTask({ filesToOpen, onResult }: DesktopFileExplorerTaskProps) {
  const [opened, setOpened] = useState<string[]>([]);
  const [phase, setPhase] = useState<"desktop" | "files">("desktop");
  const finished = useRef(false);

  useEffect(() => {
    if (!finished.current && checkFilesOpened(opened, filesToOpen)) {
      finished.current = true;
      onResult(true);
    }
  }, [opened, filesToOpen, onResult]);

  return (
    <div className="h-full flex flex-col">
      {phase === "desktop" && (
        <p className="shrink-0 text-base border-2 border-yellow-400 bg-yellow-100 px-4 py-2 mx-4 mt-3 rounded animate-slide-down">
          Click the Files folder icon at the bottom of the desktop to open the Files app.
        </p>
      )}
      <div className="flex-1 min-h-0 p-3 pt-2">
        <FakeDesktop
          onAppOpened={(app) => { if (app === "files") setPhase("files"); }}
          filesHint={`Double-click each file to open it: ${filesToOpen.join(", ")}`}
          onFileOpened={(name) =>
            setOpened((prev) => (prev.includes(name) ? prev : [...prev, name]))
          }
        />
      </div>
    </div>
  );
}
