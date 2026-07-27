"use client";

import { useRef, useState } from "react";
import FakeDesktop, { DesktopAppId } from "./FakeDesktop";
import SimulatorFrame from "./SimulatorFrame";

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

  const done = opened.size >= targetCount;

  return (
    <SimulatorFrame
      appName="Desktop"
      instruction={done ? instructions : `Open any ${targetCount} apps from the dock.`}
      stepIndex={Math.min(opened.size, targetCount)}
      totalSteps={targetCount}
      done={done}
      goal={`You opened ${targetCount} apps`}
      chrome={false}
    >
      <FakeDesktop onAppOpened={handleAppOpened} />
    </SimulatorFrame>
  );
}
