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
        <div className="shrink-0 bg-[#1d2733] text-white px-4 py-3 text-center font-semibold text-lg">
          Open <span className="text-yellow-300">Files</span> — click the glowing icon in the dock
        </div>
      )}
      <div className="flex-1 min-h-0 relative">
        <FakeDesktop
          highlightApp={phase === "desktop" ? "files" : undefined}
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
