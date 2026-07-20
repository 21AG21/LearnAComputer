"use client";

import { useState, useRef } from "react";
import SimulatorFrame from "./SimulatorFrame";
import FakeDesktop from "./FakeDesktop";
import type { DesktopAppId } from "./FakeDesktop";

export type SettingsStep = {
  say: string;
  action: "open-section" | "toggle" | "slider" | "delete-item" | "empty-trash";
  target?: string;
  min?: number;
  max?: number;
};

interface GuidedSettingsTaskProps {
  goal: string;
  steps: SettingsStep[];
  onResult: (success: boolean) => void;
}

export default function GuidedSettingsTask({ goal, steps, onResult }: GuidedSettingsTaskProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);
  const initRef = useRef(false);

  const step = steps[stepIndex];
  const finished = stepIndex >= steps.length;

  function completeStep() {
    setFlash(true);
    setTimeout(() => setFlash(false), 850);
    if (stepIndex + 1 >= steps.length) {
      setDone(true);
      setTimeout(() => onResult(true), 1500);
    }
    setStepIndex((i) => i + 1);
  }

  function highlightSection(): string | undefined {
    if (!step || step.action !== "open-section") return undefined;
    return step.target;
  }

  function highlightToggle(): string | undefined {
    if (!step || step.action !== "toggle") return undefined;
    return step.target;
  }

  function highlightSlider(): string | undefined {
    if (!step || step.action !== "slider") return undefined;
    return step.target;
  }

  function highlightItem(): string | undefined {
    if (!step) return undefined;
    if (step.action === "delete-item") return step.target;
    if (step.action === "empty-trash") return "empty-trash";
    return undefined;
  }

  function handleSectionOpen(section: string) {
    if (step?.action === "open-section" && section === step.target) {
      completeStep();
    }
  }

  function handleToggle(target: string, value: boolean) {
    if (step?.action === "toggle" && target === step.target) {
      completeStep();
    }
  }

  function handleSlider(target: string, value: number) {
    if (step?.action !== "slider" || target !== step.target) return;
    const min = step.min ?? 0;
    const max = step.max ?? 200;
    if (value >= min && value <= max) {
      completeStep();
    }
  }

  function handleDeleteItem(target: string) {
    if (step?.action === "delete-item" && target === step.target) {
      completeStep();
    }
  }

  function handleEmptyTrash() {
    if (step?.action === "empty-trash") {
      completeStep();
    }
  }

  return (
    <SimulatorFrame
      appName="Settings"
      stepIndex={stepIndex}
      totalSteps={steps.length}
      instruction={step?.say ?? ""}
      done={done}
      goal={goal}
      flash={flash}
    >
      <FakeDesktop
        autoOpenApp="settings"
        settingsProps={{
          highlightSection: highlightSection(),
          highlightToggle: highlightToggle(),
          highlightSlider: highlightSlider(),
          highlightItem: highlightItem(),
          onSectionOpen: handleSectionOpen,
          onToggle: handleToggle,
          onSlider: handleSlider,
          onDeleteItem: handleDeleteItem,
          onEmptyTrash: handleEmptyTrash,
        }}
      />
    </SimulatorFrame>
  );
}
