"use client";

import { useCallback, useRef, useState } from "react";
import FakeDesktop, { type DesktopAppId } from "@/components/Playground/FakeDesktop";
import SimulatorFrame from "@/components/Playground/SimulatorFrame";
import { useStepRunner } from "@/components/Playground/useStepRunner";
import type { PhoneGestureLesson, PhoneStep } from "@/lib/phoneCourse";

/**
 * The only bespoke activity in the phone course.
 *
 * Unit 1 teaches the four things a phone does that a laptop cannot: tapping
 * instead of clicking, sliding a page instead of turning a wheel, going home by
 * pushing the screen upward, and reading the strip along the top. Every other
 * lesson in the course is a real lesson from `content/lessons/`, played on the
 * same simulator.
 *
 * Even this one is not a second computer. It renders the **actual** `FakeDesktop`
 * — same wallpaper, same ten dock icons, same apps behind them, same Wi-Fi and
 * battery panels — in its phone shape, and only adds the step engine on top. The
 * first version of this course drew its own phone with its own Messages and its
 * own Settings, and that is exactly the drift `docs/SAME_ICON_AUDIT.md` exists to
 * prevent: a learner who does Unit 1 on the phone and Unit 4 on the laptop has to
 * be looking at the same machine.
 */
export default function PhoneGestureTask({
  lesson,
  onResult,
}: {
  lesson: PhoneGestureLesson;
  onResult: (success: boolean, failMessage?: string) => void;
}) {
  const runner = useStepRunner<PhoneStep>({
    steps: lesson.steps,
    mode: lesson.mode ?? "guided",
    onResult,
  });
  const { step, stepIndex, tryStep, done, flash, objectives } = runner;

  const [hintOpen, setHintOpen] = useState(false);

  /**
   * Watches for the list having actually moved far enough to reveal the named
   * row. `scroll-to` is the one step here that is satisfied by a *result* rather
   * than by an action, so it is checked on every scroll event inside the frame
   * rather than by a handler the learner triggers.
   */
  const hostRef = useRef<HTMLDivElement>(null);
  const onScrollCapture = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    tryStep((s) => {
      if (s.action !== "scroll-to" || !s.target) return false;
      const hit = [...host.querySelectorAll<HTMLElement>("*")].find(
        (el) => el.children.length === 0 && (el.textContent ?? "").trim().startsWith(s.target!),
      );
      if (!hit) return false;
      const box = host.getBoundingClientRect();
      const r = hit.getBoundingClientRect();
      return r.top >= box.top && r.bottom <= box.bottom + 1 && r.height > 0;
    });
  }, [tryStep]);

  const wantsPanel = step?.action === "open-panel" ? (step.target as "wifi" | "battery" | "calendar") : null;

  return (
    <SimulatorFrame
      appName="Phone"
      instruction={step?.say ?? lesson.goal}
      stepIndex={stepIndex}
      totalSteps={lesson.steps.length}
      done={done}
      goal={lesson.goal}
      flash={flash}
      objectives={objectives}
      hint={lesson.hint}
      onHint={() => setHintOpen((v) => !v)}
      chrome={false}
      /* FakeDesktop below grows its own status strip and home bar. */
      phoneChrome={false}
      /* Already phone language — see `inPhoneWords`. */
      phoneWording={false}
    >
      <div ref={hostRef} onScrollCapture={onScrollCapture} className="h-full w-full">
        <FakeDesktop
          highlightApp={step?.action === "open-app" ? (step.target as DesktopAppId) : undefined}
          highlightPanel={wantsPanel}
          highlightHomeBar={step?.action === "go-home"}
          onAppOpened={(app) => tryStep((s) => s.action === "open-app" && s.target === app)}
          onGoHome={() => tryStep((s) => s.action === "go-home")}
          onPanelChange={(panel) =>
            tryStep((s) =>
              panel === null ? s.action === "close-panel" : s.action === "open-panel" && s.target === panel,
            )
          }
        />
      </div>
      {hintOpen && !done && (
        <p className="absolute inset-x-3 bottom-3 z-40 rounded-lg border-2 border-yellow-500 bg-yellow-50 px-3 py-2 text-sm text-gray-900 shadow-lg">
          {lesson.hint}
        </p>
      )}
    </SimulatorFrame>
  );
}
