"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DrDigital from "@/components/DrDigital";
import LessonPlaygroundPane from "@/components/LessonPlaygroundPane";
import { markComplete, getCompletedSlugs } from "@/lib/progress";
import type { ModuleRoute } from "@/lib/lessons";

type AttemptState = "unattempted" | "failed" | "success";

interface LessonModuleRunnerProps {
  route: ModuleRoute;
  nextModuleSlug: string | null;
}

export default function LessonModuleRunner({ route, nextModuleSlug }: LessonModuleRunnerProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [attemptState, setAttemptState] = useState<AttemptState>("unattempted");
  const [started, setStarted] = useState(false);
  const [indexResolved, setIndexResolved] = useState(false);
  const [allModuleComplete, setAllModuleComplete] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [activityAttempt, setActivityAttempt] = useState(0);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  const subLesson = route.subLessons[index];
  const isLastSubLesson = index === route.subLessons.length - 1;
  // "none"/"placeholder" sub-lessons have nothing to pass — advancing is never gated on them.
  const hasGate = subLesson.playgroundTask.type !== "none" && subLesson.playgroundTask.type !== "placeholder";
  const canAdvance = !hasGate || attemptState === "success" || alreadyDone;

  useEffect(() => {
    setAttemptState("unattempted");
    setStarted(false);
    setActivityAttempt(0);
    setAlreadyDone(getCompletedSlugs().includes(subLesson.slug));
    if (leftPanelRef.current) leftPanelRef.current.scrollTop = 0;
  }, [subLesson.slug]);

  // On every module change, resume at the first incomplete sub-lesson (or show the
  // module-complete state if all are done). Keyed on route.moduleSlug rather than mount
  // because App Router reuses this component instance across /lessons/a → /lessons/b —
  // useState(0) does not re-initialize on navigation, so without this effect `index`
  // would carry into the next module and index out of range.
  useEffect(() => {
    setIndexResolved(false);
    setAllModuleComplete(false);
    setReviewing(false);
    const completed = getCompletedSlugs();
    const firstIncomplete = route.subLessons.findIndex((l) => !completed.includes(l.slug));
    if (firstIncomplete === -1) {
      setAllModuleComplete(true);
      setIndex(0);
    } else {
      setIndex(firstIncomplete);
    }
    setIndexResolved(true);
  // route.subLessons is intentionally excluded: it's a new array reference every render
  // but only has new *content* when route.moduleSlug changes (same navigation event).
  // Including it would re-run the effect every render due to array-reference instability.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.moduleSlug]);

  function handleStart() {
    setStarted(true);
  }

  function handleResult(success: boolean) {
    setAttemptState(success ? "success" : "failed");
    if (success) markComplete(subLesson.slug);
  }

  function handleNext() {
    if (!hasGate) markComplete(subLesson.slug);
    if (!isLastSubLesson) {
      setIndex((i) => i + 1);
    } else if (reviewing) {
      setReviewing(false);
      setAllModuleComplete(true);
    } else if (nextModuleSlug) {
      router.push(`/lessons/${nextModuleSlug}`);
    } else {
      router.push("/lessons");
    }
  }

  const drDigitalMessage =
    attemptState === "success"
      ? subLesson.drDigitalSuccess
      : attemptState === "failed"
      ? subLesson.drDigitalHint
      : subLesson.drDigitalIntro;

  const drDigitalMood = attemptState === "success" ? "success" : attemptState === "failed" ? "hint" : "neutral";

  if (!indexResolved) {
    return (
      <div className="h-full flex">
        <div className="w-full lg:max-w-xl shrink-0 p-6">
          <p className="text-sm text-gray-400 animate-pulse">Loading…</p>
        </div>
      </div>
    );
  }

  if (allModuleComplete && !reviewing) {
    return (
      <div className="h-full flex">
        <div className="w-full lg:max-w-xl shrink-0 overflow-y-auto p-6 space-y-6">
          <Link href="/lessons" className="text-sm text-gray-500 underline">
            ← All lessons
          </Link>
          <div>
            <p className="text-sm text-gray-500">{route.unit} &middot; {route.module}</p>
            <h1 className="text-2xl font-bold">{route.module}</h1>
          </div>
          <div className="rounded-lg border-2 border-green-500 bg-green-50 p-6 text-center space-y-3">
            <p className="text-5xl">✓</p>
            <p className="text-xl font-bold text-green-700">Module complete!</p>
            <p className="text-gray-600">You&apos;ve finished every lesson in this module.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (nextModuleSlug) router.push(`/lessons/${nextModuleSlug}`);
                else router.push("/lessons");
              }}
              className="border rounded px-4 py-2 font-semibold"
            >
              {nextModuleSlug ? "Next module →" : "Finish"}
            </button>
            <button
              onClick={() => {
                setReviewing(true);
                setIndex(0);
              }}
              className="border rounded px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100"
            >
              Review this module
            </button>
          </div>
        </div>
        <div className="hidden lg:block flex-1 min-w-0 p-4">
          <LessonPlaygroundPane task={{ type: "none" }} started={false} onResult={() => {}} onExit={() => {}} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div ref={leftPanelRef} className="w-full lg:max-w-xl shrink-0 overflow-y-auto p-6 space-y-6">
        <Link href="/lessons" className="text-sm text-gray-500 underline">
          ← All lessons
        </Link>
        <div>
          <p className="text-sm text-gray-500">
            {route.unit} &middot; {route.module} &middot; {index + 1} of {route.subLessons.length}
          </p>
          <h1 className="text-2xl font-bold">{subLesson.title}</h1>
        </div>

        <DrDigital message={drDigitalMessage} mood={drDigitalMood} />

        {subLesson.playgroundTask.type === "placeholder" && (
          <p className="text-sm text-gray-500 border rounded p-3 bg-gray-50">This activity is coming soon.</p>
        )}

        {hasGate && attemptState !== "success" && (
          <div className="flex items-center gap-4">
            {!started ? (
              <>
                <button
                  onClick={handleStart}
                  className="border-2 border-black rounded px-4 py-2 font-semibold bg-white transition-all hover:bg-black hover:text-white active:scale-95"
                >
                  Start activity
                </button>
                <button onClick={handleNext} className="text-sm text-gray-500 underline transition-colors hover:text-gray-800">
                  Skip this activity
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStarted(false)}
                  className="border-2 border-red-600 text-red-600 rounded px-4 py-2 font-semibold bg-white transition-all hover:bg-red-600 hover:text-white active:scale-95"
                >
                  Exit activity
                </button>
                <button
                  onClick={() => {
                    setActivityAttempt((n) => n + 1);
                    setAttemptState("unattempted");
                  }}
                  className="text-sm text-gray-500 underline transition-colors hover:text-gray-800"
                >
                  Restart activity
                </button>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          {index > 0 && (
            <button onClick={() => setIndex((i) => i - 1)} className="border rounded px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100">
              ← Back
            </button>
          )}
          {canAdvance && (
            <button onClick={handleNext} className="border rounded px-4 py-2 font-semibold animate-slide-up transition-colors hover:bg-gray-50 active:bg-gray-100">
              {isLastSubLesson && !nextModuleSlug ? "Finish" : "Next"}
            </button>
          )}
        </div>
      </div>

      <div className="hidden lg:block flex-1 min-w-0 p-4">
        <LessonPlaygroundPane
          key={activityAttempt}
          task={subLesson.playgroundTask}
          started={started}
          onResult={handleResult}
          onExit={() => setStarted(false)}
        />
      </div>
    </div>
  );
}
