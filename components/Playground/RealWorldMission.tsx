"use client";

import { useCallback } from "react";
import SimulatorFrame from "./SimulatorFrame";
import { useStepRunner } from "./useStepRunner";
import { CheckIcon } from "./Icons";
import {
  AnswerCheck,
  ConfirmCheck,
  DownloadCheck,
  FileCheck,
  FolderCheck,
  KeysCheck,
  MediaQueryCheck,
  NetworkCheck,
  PasteCheck,
  WindowCheck,
  ZoomCheck,
  type CheckProps,
} from "./RealWorldChecks";
import type { RealWorldStep } from "@/lib/lessons";

interface RealWorldMissionProps {
  goal: string;
  download?: { file: string; label: string; note?: string };
  steps: RealWorldStep[];
  onResult: (success: boolean, failMessage?: string) => void;
}

const BODIES: Record<RealWorldStep["check"], (p: CheckProps) => React.ReactElement> = {
  confirm: ConfirmCheck,
  download: DownloadCheck,
  folder: FolderCheck,
  file: FileCheck,
  paste: PasteCheck,
  "window-max": WindowCheck,
  zoom: ZoomCheck,
  "dark-mode": MediaQueryCheck,
  "reduce-motion": MediaQueryCheck,
  offline: NetworkCheck,
  online: NetworkCheck,
  "type-answer": AnswerCheck,
  keys: KeysCheck,
};

/**
 * A mission the learner carries out on their own computer, one step at a time,
 * with the page checking each step for real wherever it can. This is the only
 * activity in the course that is not a simulation — there is nothing to reset
 * and no safety net, which is the point of putting it at the end of a unit.
 */
export default function RealWorldMission({ goal, download, steps, onResult }: RealWorldMissionProps) {
  const runner = useStepRunner<RealWorldStep>({ steps, onResult });
  const { step, stepIndex, done, flash, completeStep, completed } = runner;

  // Steps can settle into a passing state on their own (a window resize, the
  // network coming back), so passes are idempotent rather than event-driven.
  const onPass = useCallback(() => {
    if (!done && stepIndex < steps.length) completeStep();
  }, [completeStep, done, stepIndex, steps.length]);

  const Body = step ? BODIES[step.check] : null;

  return (
    <SimulatorFrame
      appName="Your own computer"
      instruction={step?.say}
      stepIndex={stepIndex}
      totalSteps={steps.length}
      done={done}
      goal={goal}
      flash={flash}
      chrome={false}
    >
      <div className="flex h-full min-h-0 overflow-hidden">
        {/* The list of what the mission asks for, so the shape of the whole job is visible. */}
        <ol className="hidden w-64 shrink-0 space-y-1 overflow-y-auto border-r border-gray-200 bg-gray-50 p-4 lg:block">
          {steps.map((s, i) => {
            const isDone = completed.has(i);
            const isNow = i === stepIndex && !done;
            return (
              <li
                key={i}
                className={`flex gap-2 rounded px-2 py-1.5 text-sm leading-snug ${
                  isNow ? "bg-white font-semibold text-gray-900 shadow-sm" : isDone ? "text-green-700" : "text-gray-500 sim-dark:text-gray-400"
                }`}
              >
                <span className="mt-0.5 w-4 shrink-0 text-center">
                  {isDone ? <CheckIcon size={14} /> : isNow ? "▸" : i + 1}
                </span>
                <span>{s.say}</span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6">
          {done ? (
            <div className="max-w-lg text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white">
                <CheckIcon size={28} />
              </div>
              <p className="text-xl font-bold">{goal}</p>
              <p className="mt-2 text-gray-600">
                That was your own computer, not a practice one. Nothing here was pretend.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-xl">
              <p className="mb-3 text-lg font-semibold leading-snug lg:hidden">{step?.say}</p>
              {Body && step && <Body step={step} download={download} onPass={onPass} />}
            </div>
          )}
        </div>
      </div>
    </SimulatorFrame>
  );
}
