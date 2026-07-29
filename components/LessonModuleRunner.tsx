"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DrDigital from "@/components/DrDigital";
import LessonPlaygroundPane from "@/components/LessonPlaygroundPane";
import ActivityErrorBoundary from "@/components/ActivityErrorBoundary";
import LessonMedia from "@/components/LessonMedia";
import { markComplete, getCompletedSlugs } from "@/lib/progress";
import type { ModuleRoute } from "@/lib/lessons";

type AttemptState = "unattempted" | "failed" | "success";
type FailInfo = { message: string } | null;

interface LessonModuleRunnerProps {
  route: ModuleRoute;
  nextModuleSlug: string | null;
  previousModuleSlug?: string | null;
}

export default function LessonModuleRunner({ route, nextModuleSlug, previousModuleSlug }: LessonModuleRunnerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [index, setIndex] = useState(0);
  const [attemptState, setAttemptState] = useState<AttemptState>("unattempted");
  const [failInfo, setFailInfo] = useState<FailInfo>(null);
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
    setFailInfo(null);
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
    const restart = searchParams.get("restart") === "1";
    const completed = getCompletedSlugs();
    const firstIncomplete = route.subLessons.findIndex((l) => !completed.includes(l.slug));
    if (firstIncomplete === -1) {
      if (restart) {
        setReviewing(true);
      } else {
        setAllModuleComplete(true);
      }
      setIndex(0);
    } else {
      setIndex(restart ? 0 : firstIncomplete);
    }
    setIndexResolved(true);
  // route.subLessons is intentionally excluded: it's a new array reference every render
  // but only has new *content* when route.moduleSlug changes (same navigation event).
  // Including it would re-run the effect every render due to array-reference instability.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.moduleSlug, searchParams]);

  /** When the lesson last moved on — see the guard in handleNext. */
  const lastAdvanceRef = useRef(0);

  function handleStart() {
    setStarted(true);
  }

  function handleResult(success: boolean, failMessage?: string) {
    setAttemptState(success ? "success" : "failed");
    if (success) {
      markComplete(subLesson.slug);
      setFailInfo(null);
    } else {
      setFailInfo({ message: failMessage || subLesson.drDigitalHint });
    }
  }

  function handleNext() {
    // This course teaches double-clicking, and its learners double-click
    // everything — including Next. Two presses used to advance two lessons, so
    // a page of teaching went by unseen and unread, with nothing on screen to
    // say it had. Nobody reads a lesson in a fifth of a second, so a second
    // press that fast is the tail of a double-click, not a second intention.
    const now = performance.now();
    if (now - lastAdvanceRef.current < 500) return;
    lastAdvanceRef.current = now;

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

  const navBtn = "min-w-[120px] justify-center inline-flex items-center gap-1 border-2 rounded-lg px-5 py-2.5 text-base font-semibold transition-all active:scale-95";
  const skipBtn = "rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700";

  const nextLabel = isLastSubLesson && !nextModuleSlug ? "Finish" : "Next →";
  const justSucceeded = attemptState === "success";

  if (!indexResolved) {
    return (
      <div className="h-full flex">
        <div className="w-full lg:max-w-xl shrink-0 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse dark:text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (allModuleComplete && !reviewing) {
    return (
      <div className="h-full flex">
        <div className="w-full lg:max-w-xl shrink-0 overflow-y-auto p-6 space-y-6">
          <Link href="/lessons" className="text-sm text-gray-500 underline dark:text-gray-400">
            ← All lessons
          </Link>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{route.unit} &middot; {route.module}</p>
            <h1 className="text-2xl font-bold">{route.module}</h1>
          </div>
          <div className="rounded-lg border-2 border-green-500 bg-green-50 p-6 text-center space-y-3">
            <p className="text-5xl">✓</p>
            <p className="text-xl font-bold text-green-700">Module complete!</p>
            <p className="text-gray-600 dark:text-gray-300">You&apos;ve finished every lesson in this module.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (nextModuleSlug) router.push(`/lessons/${nextModuleSlug}`);
                else router.push("/lessons");
              }}
              className={`${navBtn} border-gray-900 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-300 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800`}
            >
              {nextModuleSlug ? "Next module →" : "Finish"}
            </button>
            <button
              onClick={() => {
                setReviewing(true);
                setIndex(0);
              }}
              className={skipBtn}
            >
              Review this module
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div ref={leftPanelRef} className={`w-full shrink-0 overflow-y-auto p-6 space-y-6 ${hasGate ? "lg:max-w-xl" : subLesson.media ? "lg:max-w-2xl" : "lg:max-w-3xl mx-auto"}`}>
        <Link href="/lessons" className="text-sm text-gray-500 underline dark:text-gray-400">
          ← All lessons
        </Link>

        <div key={subLesson.slug} className="space-y-6 motion-reduce:animate-none animate-lesson-in">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {route.unit} &middot; {route.module} &middot; {index + 1} of {route.subLessons.length}
            </p>
            <h1 className="text-2xl font-bold">{subLesson.title}</h1>
          </div>

          {subLesson.warning && (
            <div className="rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-amber-900 font-medium text-sm">
              Warning: {subLesson.warning}
            </div>
          )}

          <DrDigital message={drDigitalMessage} mood={drDigitalMood} />

          {failInfo && attemptState === "failed" && (
            <div className="rounded-lg border-2 border-red-400 bg-red-50 p-4 space-y-3">
              <p className="font-bold text-red-700">Activity failed</p>
              <p className="text-sm text-red-900">{failInfo.message}</p>
              <button
                onClick={() => {
                  setActivityAttempt((n) => n + 1);
                  setAttemptState("unattempted");
                  setFailInfo(null);
                }}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded hover:bg-red-700 active:scale-95 transition-all text-sm"
              >
                Try again
              </button>
            </div>
          )}

          {subLesson.playgroundTask.type === "placeholder" && (
            <p className="text-sm text-gray-500 border border-gray-200 rounded p-3 bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">This activity is coming soon.</p>
          )}

          {hasGate && attemptState !== "success" && (
            <div className="flex items-center gap-4">
              {!started ? (
                <>
                  <button
                    onClick={handleStart}
                    className="border-2 border-black rounded px-4 py-2 font-semibold bg-white transition-all hover:bg-black hover:text-white active:scale-95 dark:border-gray-300 dark:bg-gray-900 dark:hover:bg-gray-100 dark:hover:text-gray-900"
                  >
                    Start activity
                  </button>
                  <button onClick={handleNext} className={skipBtn}>
                    Skip this activity
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setStarted(false)}
                    className="border-2 border-red-600 text-red-600 rounded px-4 py-2 font-semibold bg-white transition-all hover:bg-red-600 hover:text-white active:scale-95 dark:bg-gray-900 dark:text-red-400"
                  >
                    Exit activity
                  </button>
                  <button
                    onClick={() => {
                      setActivityAttempt((n) => n + 1);
                      setAttemptState("unattempted");
                    }}
                    className={skipBtn}
                  >
                    Restart activity
                  </button>
                  <button onClick={handleNext} className={skipBtn}>
                    Skip this activity
                  </button>
                </>
              )}
            </div>
          )}

          {alreadyDone && hasGate && attemptState !== "success" && (
            <div>
              <button
                onClick={() => {
                  setActivityAttempt((n) => n + 1);
                  setAttemptState("unattempted");
                  setAlreadyDone(false);
                  setStarted(true);
                }}
                className={skipBtn}
              >
                Redo this activity
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            {(index > 0 || previousModuleSlug) && (
              <button
                onClick={() => {
                  if (index > 0) {
                    setIndex((i) => i - 1);
                  } else if (previousModuleSlug) {
                    router.push(`/lessons/${previousModuleSlug}`);
                  }
                }}
                className={`${navBtn} border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800`}
              >
                {index === 0 && previousModuleSlug ? "← Previous module" : "← Back"}
              </button>
            )}
            {canAdvance && (
              <button
                onClick={handleNext}
                className={`${navBtn} ${
                  justSucceeded
                    ? "border-green-600 bg-green-500 text-white hover:bg-green-600 animate-pop-attention shadow-lg"
                    : alreadyDone
                    ? "border-green-600 bg-green-500 text-white hover:bg-green-600"
                    : "border-gray-900 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-300 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {nextLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      {subLesson.media ? (
        <div className="hidden lg:flex flex-1 min-w-0 bg-gray-50 border-l border-gray-200 dark:bg-[#0b1016] dark:border-gray-800">
          <LessonMedia src={subLesson.media.src} alt={subLesson.media.alt} caption={subLesson.media.caption} />
        </div>
      ) : hasGate ? (
        <div className="hidden lg:block flex-1 min-w-0 p-4">
          {/* One crashed sim must not blank the lesson page — the boundary keeps the
              left panel and its skip button alive, and Try again remounts the sim. */}
          <ActivityErrorBoundary onRetry={() => setActivityAttempt((n) => n + 1)}>
            <LessonPlaygroundPane
              key={activityAttempt}
              task={subLesson.playgroundTask}
              started={started}
              onResult={handleResult}
              onExit={() => setStarted(false)}
            />
          </ActivityErrorBoundary>
        </div>
      ) : null}
    </div>
  );
}
