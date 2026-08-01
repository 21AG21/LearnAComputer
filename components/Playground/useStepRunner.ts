"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  // Assessment safety net (see the stall effect below): once a stuck learner has
  // been stalled long enough, the rings switch on and guide them the rest of the way.
  const [revealed, setRevealed] = useState(false);

  /**
   * The step the guided banner/highlights read. Guided mode: the current step.
   * Assessment mode: nothing is highlighted — the learner decides where to click —
   * UNLESS they have been stuck long enough that `revealed` turned on, in which
   * case it points at the first unmet objective so the yellow ring can lead them.
   */
  const step: S | undefined = isAssessment
    ? revealed
      ? steps.find((_, i) => !completed.has(i))
      : undefined
    : steps[stepIndex];
  const finished = isAssessment ? done : stepIndex >= steps.length;

  const ding = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), flashMs);
    setPhase(0);
    onStepComplete?.();
  }, [flashMs, onStepComplete]);

  // Idempotent, and via a ref rather than `done`, because two completions in one
  // tick both read the same `done`. Announcing success twice fired the lesson's
  // completion twice.
  const finishedRef = useRef(false);
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setDone(true);
    setTimeout(() => onResult(true), finishDelayMs);
  }, [finishDelayMs, onResult]);

  /**
   * Which index last ticked, and when. Several handlers can fire from one
   * gesture — the address bar's Enter, the Go button, the loading timer — and
   * inside one React tick they all read the *same* current step, so without
   * this guard a single navigation advanced the lesson three steps and
   * silently skipped two. The guard is time-boxed: it blocks the same-tick
   * double-fire, never an honest retry — dev StrictMode can replay a render
   * (discarding the state update but keeping the ref), and a forever-guard
   * turned that replay into a lesson that could never tick again.
   */
  const lastCompleted = useRef<{ idx: number; t: number } | null>(null);

  /** Guided: satisfy the current step and advance. */
  const completeStep = useCallback(() => {
    const now = performance.now();
    const last = lastCompleted.current;
    if (last && last.idx === stepIndex && now - last.t < 150) return;
    lastCompleted.current = { idx: stepIndex, t: now };
    ding();
    setCompleted((prev) => new Set(prev).add(stepIndex));
    setStepIndex((i) => i + 1);
  }, [ding, stepIndex]);

  /**
   * Finishing is decided by where the walk ended up, not by the handler that
   * happened to run last. Two completions in the same tick — a double-click whose
   * click and dblclick handlers both satisfy the step — used to read the same
   * stale `stepIndex`, so the index jumped over the last step and the "is this the
   * final one?" test never came true. The activity stayed silently unfinished with
   * every step done. Found by /dev/solve-check on the very first lesson it played.
   */
  useEffect(() => {
    if (!isAssessment && steps.length > 0 && stepIndex >= steps.length) finish();
  }, [isAssessment, stepIndex, steps.length, finish]);

  /**
   * Nobody gets permanently stranded on an unguided assessment. If the learner
   * makes no progress for a stretch, the yellow rings switch on and lead them
   * through the rest — the one cue a non-reader can always follow. The timer
   * resets on every completed objective (`completed` in the deps), so it only
   * fires when someone is genuinely stuck, and never during the automated harness
   * runs, which finish an assessment in a few seconds.
   */
  useEffect(() => {
    if (!isAssessment || done || revealed) return;
    const t = setTimeout(() => setRevealed(true), 20000);
    return () => clearTimeout(t);
  }, [isAssessment, done, revealed, completed]);

  /** Assessment: satisfy one specific objective, whatever order it came in. */
  // Ref mirror, not the state closure: two same-tick completions (one handler
  // proving two objectives at once) each rebuilt `next` from the same stale
  // `completed` and the second silently erased the first.
  const assessDone = useRef<Set<number>>(new Set());
  const markComplete = useCallback(
    (index: number) => {
      if (assessDone.current.has(index)) return;
      assessDone.current.add(index);
      const next = new Set(assessDone.current);
      setCompleted(next);
      ding();
      if (next.size >= steps.length) finish();
    },
    [ding, finish, steps.length],
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
    revealed,
  };
}
