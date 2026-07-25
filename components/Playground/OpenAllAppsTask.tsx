"use client";

import { useRef, useState } from "react";
import FakeDesktop, { DesktopAppId } from "./FakeDesktop";

interface OpenAllAppsTaskProps {
  instructions: string;
  targetCount?: number;
  onResult: (success: boolean) => void;
}

export default function OpenAllAppsTask({ instructions, targetCount = 4, onResult }: OpenAllAppsTaskProps) {
  const [opened, setOpened] = useState<Set<DesktopAppId>>(new Set());
  const finished = useRef(false);

  function handleAppOpened(app: DesktopAppId) {
    if (opened.has(app)) return;
    const next = new Set(opened);
    next.add(app);
    setOpened(next);
    if (!finished.current && next.size >= targetCount) {
      finished.current = true;
      onResult(true);
    }
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="shrink-0 bg-[#1d2733] text-white px-4 py-3 text-center font-semibold text-lg">
        <span aria-live="polite">
          {opened.size < targetCount
            ? `Open any ${targetCount} apps — ${opened.size} of ${targetCount} opened`
            : instructions}
        </span>
      </div>
      <div className="flex-1 min-h-0 relative">
        <FakeDesktop onAppOpened={handleAppOpened} />
      </div>
    </div>
  );
}
