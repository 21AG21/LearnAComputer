"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getCompletedSlugs, resetProgress } from "@/lib/progress";
import { unitArt } from "@/lib/unitArt";
import SiteFooter from "@/components/SiteFooter";
import { CheckIcon } from "@/components/Playground/Icons";
import {
  COURSE_EVALUATION_URL,
  EVALUATION_THRESHOLD,
  OPENS_GOOGLE_FORMS,
} from "@/lib/feedbackLinks";
import type { ModuleRoute } from "@/lib/lessons";

interface LessonCatalogProps {
  routes: ModuleRoute[];
}

export default function LessonCatalog({ routes }: LessonCatalogProps) {
  const [completedSlugs, setCompletedSlugs] = useState<string[] | null>(null);

  useEffect(() => {
    setCompletedSlugs(getCompletedSlugs());
  }, []);

  if (completedSlugs === null) return null;

  const totalSubLessons = routes.reduce((sum, r) => sum + r.subLessons.length, 0);
  const totalCompleted = routes.reduce(
    (sum, r) => sum + r.subLessons.filter((l) => completedSlugs.includes(l.slug)).length,
    0
  );
  const overallPct = totalSubLessons > 0 ? (totalCompleted / totalSubLessons) * 100 : 0;

  const continueRoute = routes.find((r) => r.subLessons.some((l) => !completedSlugs.includes(l.slug)));
  const allComplete = totalCompleted === totalSubLessons && totalSubLessons > 0;
  /**
   * Far enough through to have an opinion worth hearing. Asking at 100% only
   * ever reaches finishers, who are the least representative group there is.
   */
  const farEnoughToAsk = totalSubLessons > 0 && totalCompleted / totalSubLessons >= EVALUATION_THRESHOLD;

  const units = Array.from(new Set(routes.map((r) => r.unit)));

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 space-y-8">
      {/* Overall progress */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-bold">Lessons</h1>
          <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">
            {totalCompleted === 0 ? `${totalSubLessons} lessons` : `${totalCompleted} of ${totalSubLessons} complete`}
          </span>
        </div>
        <p className="max-w-2xl text-gray-600 dark:text-gray-400">
          {totalCompleted === 0
            ? "Fourteen units, from holding a mouse to spotting a scam. Every lesson is something you do, not something you watch, and each unit ends with a task on your own computer. Free, and nothing to sign up for."
            : "Pick up anywhere. Your place is saved on this device and does not expire."}
        </p>
        {/* An empty bar is a picture of nothing. Show it once there is
            something to show. */}
        {totalCompleted > 0 && (
          <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Course evaluation, offered once the learner is most of the way through.
          Deliberately a quiet card and not a modal: it sits below the progress
          they just earned, it never interrupts a lesson, and it says plainly
          that it is optional and where the link goes. Nothing is sent anywhere
          unless they click — it is a link, not an embedded form, which is also
          what keeps `hostile-check` green. */}
      {farEnoughToAsk && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/40">
          <p className="font-bold text-blue-900 dark:text-blue-200">
            You are {Math.round(overallPct)}% through the course.
          </p>
          <p className="mt-1 text-sm text-blue-900/80 dark:text-blue-200/80">
            If you have a few minutes, we would like to know how it has gone — what helped, what
            was confusing, what you would change. It is anonymous and completely optional.
          </p>
          <a
            href={COURSE_EVALUATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-lg bg-blue-600 px-5 py-2.5 font-bold text-white hover:bg-blue-700"
          >
            Share your feedback
          </a>
          <p className="mt-2 text-xs text-blue-900/60 dark:text-blue-200/60">{OPENS_GOOGLE_FORMS}</p>
        </div>
      )}

      {/* Continue / all-complete card */}
      {allComplete ? (
        <div className="rounded-xl border-2 border-green-500 bg-green-50 p-5 flex items-center gap-4 dark:bg-green-950/40">
          <div className="shrink-0 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
            <CheckIcon size={20} />
          </div>
          <div>
            <p className="font-bold text-green-700">Course complete</p>
            <p className="text-sm text-green-700">
              All {totalSubLessons} lessons, all {units.length} units. Come back to any of them
              whenever you want the practice.
            </p>
          </div>
        </div>
      ) : continueRoute ? (
        <Link
          href={`/lessons/${continueRoute.moduleSlug}`}
          className="flex items-center justify-between gap-4 rounded-xl border-2 border-black bg-white p-5 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              {totalCompleted === 0 ? "Start here" : "Continue where you left off"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{continueRoute.unit}</p>
            <p className="font-bold text-lg">{continueRoute.module}</p>
            {(() => {
              const doneInModule = continueRoute.subLessons.filter((l) => completedSlugs.includes(l.slug)).length;
              return (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {doneInModule === 0
                    ? `${continueRoute.subLessons.length} short lessons`
                    : `Lesson ${doneInModule + 1} of ${continueRoute.subLessons.length}`}
                </p>
              );
            })()}
          </div>
          <span className="shrink-0 rounded-lg bg-black px-5 py-3 text-base font-bold text-white dark:bg-gray-100 dark:text-gray-900">
            {totalCompleted === 0 ? "Start" : "Continue"} →
          </span>
        </Link>
      ) : null}

      {/* Units */}
      {units.map((unit) => {
        const unitRoutes = routes.filter((r) => r.unit === unit);
        return (
          <div key={unit} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                <Image src={unitArt(unit)} alt="" fill sizes="80px" className="object-cover" />
              </div>
              <h2 className="text-base font-bold text-gray-500 uppercase tracking-widest dark:text-gray-400">{unit}</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {unitRoutes.map((route) => {
                const done = route.subLessons.filter((l) => completedSlugs.includes(l.slug)).length;
                const total = route.subLessons.length;
                const pct = total > 0 ? (done / total) * 100 : 0;
                const state: "complete" | "in-progress" | "not-started" =
                  done === total ? "complete" : done > 0 ? "in-progress" : "not-started";

                return (
                  <div key={route.moduleSlug} className="space-y-1">
                  <Link
                    href={`/lessons/${route.moduleSlug}`}
                    className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400 transition-colors dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-600"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{route.module}</p>
                      {state === "complete" && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          <CheckIcon size={12} /> Complete
                        </span>
                      )}
                      {state === "in-progress" && (
                        <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          In progress
                        </span>
                      )}
                      {state === "not-started" && (
                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                          {total} {total === 1 ? "lesson" : "lessons"}
                        </span>
                      )}
                    </div>
                    {state !== "not-started" && (
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${state === "complete" ? "bg-green-500" : "bg-blue-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{done}/{total}</span>
                      </div>
                    )}
                  </Link>
                  {state === "complete" && (
                    <div className="flex justify-end pr-1">
                      <Link
                        href={`/lessons/${route.moduleSlug}?restart=1`}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-600 underline dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        Redo
                      </Link>
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="border-t border-gray-200 pt-6 space-y-3 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your progress is saved on this device and does not expire, so you can close the page and pick up
          where you left off whenever you like. There is no account and nothing to sign in to. Clearing your
          browser data, or using a different computer, starts you fresh.
        </p>
        <button
          onClick={() => {
            if (window.confirm("Reset all progress? This can't be undone.")) {
              resetProgress();
              setCompletedSlugs([]);
            }
          }}
          className="text-sm text-red-600 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
        >
          Reset all progress
        </button>
      </div>

      <SiteFooter />
    </div>
  );
}
