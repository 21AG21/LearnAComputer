"use client";

import { useEffect, useRef, useState } from "react";
import SimulatorFrame from "./SimulatorFrame";
import { FolderIcon } from "./Icons";
import FakeDesktop from "./FakeDesktop";
import { checkFilesOpened } from "./TaskChecker";

interface DesktopFileExplorerTaskProps {
  filesToOpen: string[];
  onResult: (success: boolean) => void;
}

export default function DesktopFileExplorerTask({ filesToOpen, onResult }: DesktopFileExplorerTaskProps) {
  const [opened, setOpened] = useState<string[]>([]);
  const [phase, setPhase] = useState<"desktop" | "files">("desktop");
  const [done, setDone] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    if (!finished.current && checkFilesOpened(opened, filesToOpen)) {
      finished.current = true;
      setDone(true);
      setTimeout(() => onResult(true), 1400);
    }
  }, [opened, filesToOpen, onResult]);

  const nextFile = filesToOpen.find((f) => !opened.includes(f));
  const stepIndex = phase === "desktop" ? 0 : opened.length + 1;
  const totalSteps = filesToOpen.length + 1;

  const instruction =
    phase === "desktop"
      ? "Open Files — click the glowing icon in the dock."
      : nextFile
        ? `Double-click ${nextFile} to open it.`
        : undefined;

  return (
    <SimulatorFrame
      appName="Files"
      appIcon={<FolderIcon size={20} />}
      instruction={instruction}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      done={done}
      goal={`Open ${filesToOpen.join(" and ")}`}
    >
      <FakeDesktop
        highlightApp={phase === "desktop" ? "files" : undefined}
        onAppOpened={(app) => { if (app === "files") setPhase("files"); }}
        filesHighlight={phase === "files" && nextFile ? { kind: "item", target: nextFile } : null}
        filesEnabled={{ open: true }}
        onFileOpened={(name) =>
          setOpened((prev) => (prev.includes(name) ? prev : [...prev, name]))
        }
      />
    </SimulatorFrame>
  );
}
