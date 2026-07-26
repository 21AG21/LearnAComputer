"use client";

import { useCallback, useMemo, useState } from "react";
import type { ObjectiveItem } from "./SimulatorFrame";

export type SimMode = "guided" | "assessment";

/** Every guided step carries the sentence shown in the banner. In assessment mode it becomes the objective label. */
export interface RunnerStep {
  say: string;
}

interface RunnerOptions<S extends RunnerStep> {
  steps: S[];
  mode?: SimMode;
  onResult: (success: boolean, failMessage?: string) => void;
  /** Extra cleanup the sim runs each time a step is satisfied (closing sheets, clearing drafts, ...). */
  onStepComplete?: () => void;
  flashMs?: number;
  finishDelayMs?: number;
}

/**
 * Drives step completion for every guided simulator.
 *
 * Guided mode walks the steps in order: only the current step can be satisfied, and the banner
 * counts "Step N of M". Assessment mode drops the ordering — any unmet objective that matches
 * the learner's action is marked done, nothing is highlighted, and the banner counts objectives.
 */
export function useStepRunner<S extends RunnerStep>({
  steps,
  mode = "guided",
  onResult,
  onStepComplete,
  flashMs = 850,
  finishDelayMs = 1500,
}: RunnerOptions<S>) {
  const isAssessment = mode === "assessment";
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(() => new Set());
  const [phase, setPhase] = useState(0);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);

  /** The step the guided banner is on. Always undefined in assessment mode — no step is "current". */
  const step: S | undefined = isAssessment ? undefined : steps[stepIndex];
  const finished = isAssessment ? done : stepIndex >= steps.length;

  const ding = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), flashMs);
    setPhase(0);
    onStepComplete?.();
  }, [flashMs, onStepComplete]);

  const finish = useCallback(() => {
    setDone(true);
    setTimeout(() => onResult(true), finishDelayMs);
  }, [finishDelayMs, onResult]);

  /** Guided: satisfy the current step and advance. */
  const completeStep = useCallback(() => {
    ding();
    setCompleted((prev) => new Set(prev).add(stepIndex));
    if (stepIndex + 1 >= steps.length) finish();
    setStepIndex((i) => i + 1);
  }, [ding, finish, stepIndex, steps.length]);

  /** Assessment: satisfy one specific objective, whatever order it came in. */
  const markComplete = useCallback(
    (index: number) => {
      if (completed.has(index)) return;
      const next = new Set(completed).add(index);
      setCompleted(next);
      ding();
      if (next.size >= steps.length) finish();
    },
    [completed, ding, finish, steps.length],
  );

  /**
   * Satisfy whichever step `pred` matches.
   *
   * Guided mode checks only the current step, and `guidedGate` carries any extra condition a
   * multi-phase step needs (e.g. "the rename dialog is already open"). Assessment mode ignores
   * the gate and scans every unmet objective, so skills can be demonstrated in any order.
   */
  const tryStep = useCallback(
    (pred: (s: S) => boolean, guidedGate = true) => {
      if (isAssessment) {
        if (done) return;
        const i = steps.findIndex((s, idx) => !completed.has(idx) && pred(s));
        if (i !== -1) markComplete(i);
        return;
      }
      if (step && guidedGate && pred(step)) completeStep();
    },
    [completed, completeStep, done, isAssessment, markComplete, step, steps],
  );

  const openSteps = useMemo(() => steps.filter((_, i) => !completed.has(i)), [steps, completed]);

  /**
   * The step a render-gate should read — "is there still a save to do?", "which page reveals the
   * search result?". Guided mode answers with the current step; assessment mode with the first
   * unmet objective that matches.
   */
  const wanted = useCallback(
    (pred: (s: S) => boolean): S | undefined =>
      isAssessment ? openSteps.find(pred) : step && pred(step) ? step : undefined,
    [isAssessment, openSteps, step],
  );

  const wants = useCallback((pred: (s: S) => boolean) => !!wanted(pred), [wanted]);

  const objectives: ObjectiveItem[] | undefined = useMemo(
    () => (isAssessment ? steps.map((s, i) => ({ label: s.say, done: completed.has(i) })) : undefined),
    [isAssessment, steps, completed],
  );

  return {
    isAssessment,
    step,
    stepIndex,
    finished,
    done,
    flash,
    phase,
    setPhase,
    completeStep,
    markComplete,
    tryStep,
    wanted,
    wants,
    objectives,
    completed,
  };
}
