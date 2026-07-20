"use client";

import { useRef, useState } from "react";
import FakeDesktop, { DesktopAppId } from "./FakeDesktop";

interface OpenAllAppsTaskProps {
  instructions: string;
  onResult: (success: boolean) => void;
}

const ALL_APPS: DesktopAppId[] = ["messages", "browser", "files", "mail"];

export default function OpenAllAppsTask({ instructions, onResult }: OpenAllAppsTaskProps) {
  const [opened, setOpened] = useState<Set<DesktopAppId>>(new Set());
  const finished = useRef(false);

  function handleAppOpened(app: DesktopAppId) {
    if (opened.has(app)) return;
    const next = new Set(opened);
    next.add(app);
    setOpened(next);
    if (!finished.current && ALL_APPS.every((a) => next.has(a))) {
      finished.current = true;
      onResult(true);
    }
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="shrink-0 bg-[#1d2733] text-white px-4 py-3 text-center font-semibold text-lg">
        <span aria-live="polite">
          {instructions} ({opened.size} / {ALL_APPS.length} opened)
        </span>
      </div>
      <div className="flex-1 min-h-0 relative">
        <FakeDesktop onAppOpened={handleAppOpened} />
      </div>
    </div>
  );
}
