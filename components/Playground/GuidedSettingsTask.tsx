"use client";

import SimulatorFrame from "./SimulatorFrame";
import { useStepRunner, type SimMode } from "./useStepRunner";
import FakeDesktop from "./FakeDesktop";

export type SettingsStep = {
  say: string;
  action: "open-section" | "toggle" | "slider" | "delete-item" | "empty-trash" | "select-device" | "disconnect-device";
  target?: string;
  min?: number;
  max?: number;
};

interface GuidedSettingsTaskProps {
  goal: string;
  steps: SettingsStep[];
  mode?: SimMode;
  hint?: string;
  onResult: (success: boolean) => void;
}

export default function GuidedSettingsTask({ goal, steps, mode, hint, onResult }: GuidedSettingsTaskProps) {
  const { step, stepIndex, flash, done, tryStep, objectives, isAssessment } = useStepRunner({ steps, mode, onResult });

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

  function highlightDeviceConnect(): string | undefined {
    if (!step || step.action !== "select-device") return undefined;
    return step.target;
  }

  function highlightDeviceDisconnect(): string | undefined {
    if (!step || step.action !== "disconnect-device") return undefined;
    return step.target;
  }

  function handleDeviceSelect(device: string) {
    tryStep((s) => s.action === "select-device" && device === s.target);
  }

  function handleDeviceDisconnect(device: string) {
    tryStep((s) => s.action === "disconnect-device" && device === s.target);
  }

  function handleSectionOpen(section: string) {
    tryStep((s) => s.action === "open-section" && section === s.target);
  }

  function handleToggle(target: string) {
    tryStep((s) => s.action === "toggle" && target === s.target);
  }

  function handleSlider(target: string, value: number) {
    tryStep((s) => s.action === "slider" && target === s.target && value >= (s.min ?? 0) && value <= (s.max ?? 200));
  }

  function handleDeleteItem(target: string) {
    tryStep((s) => s.action === "delete-item" && target === s.target);
  }

  function handleEmptyTrash() {
    tryStep((s) => s.action === "empty-trash");
  }

  return (
    <SimulatorFrame
      phoneChrome={false}
      appName="Settings"
      stepIndex={stepIndex}
      totalSteps={steps.length}
      instruction={step?.say}
      done={done}
      goal={goal}
      flash={flash}
      objectives={objectives}
      hint={hint}
      chrome={false}
    >
      <FakeDesktop
        autoOpenApp="settings"
        settingsProps={{
          keepBothPanes: isAssessment,
          highlightSection: highlightSection(),
          highlightToggle: highlightToggle(),
          highlightSlider: highlightSlider(),
          highlightItem: highlightItem(),
          highlightDeviceConnect: highlightDeviceConnect(),
          highlightDeviceDisconnect: highlightDeviceDisconnect(),
          onSectionOpen: handleSectionOpen,
          onToggle: handleToggle,
          onSlider: handleSlider,
          onDeleteItem: handleDeleteItem,
          onEmptyTrash: handleEmptyTrash,
          onDeviceSelect: handleDeviceSelect,
          onDeviceDisconnect: handleDeviceDisconnect,
        }}
      />
    </SimulatorFrame>
  );
}
