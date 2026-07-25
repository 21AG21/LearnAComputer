"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCompletedSlugs, resetProgress } from "@/lib/progress";
import { CheckIcon } from "@/components/Playground/Icons";
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

  const units = Array.from(new Set(routes.map((r) => r.unit)));

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      {/* Overall progress */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold">Lessons</h1>
          <span className="text-sm text-gray-500">{totalCompleted} of {totalSubLessons} complete</span>
        </div>
        <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Continue / all-complete card */}
      {allComplete ? (
        <div className="rounded-xl border-2 border-green-500 bg-green-50 p-5 flex items-center gap-4">
          <div className="shrink-0 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
            <CheckIcon size={20} />
          </div>
          <div>
            <p className="font-bold text-green-700">Course complete!</p>
            <p className="text-sm text-green-700">You finished every lesson. Amazing work.</p>
          </div>
        </div>
      ) : continueRoute ? (
        <Link
          href={`/lessons/${continueRoute.moduleSlug}`}
          className="block rounded-xl border-2 border-black bg-white p-5 hover:bg-gray-50 transition-colors"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Continue where you left off</p>
          <p className="text-xs text-gray-500">{continueRoute.unit}</p>
          <p className="font-bold text-lg">{continueRoute.module}</p>
          {(() => {
            const doneInModule = continueRoute.subLessons.filter((l) => completedSlugs.includes(l.slug)).length;
            return (
              <p className="text-sm text-gray-500 mt-1">
                Lesson {doneInModule + 1} of {continueRoute.subLessons.length}
              </p>
            );
          })()}
        </Link>
      ) : null}

      {/* Units */}
      {units.map((unit) => {
        const unitRoutes = routes.filter((r) => r.unit === unit);
        return (
          <div key={unit} className="space-y-3">
            <h2 className="text-base font-bold text-gray-500 uppercase tracking-widest">{unit}</h2>
            <div className="space-y-2">
              {unitRoutes.map((route) => {
                const done = route.subLessons.filter((l) => completedSlugs.includes(l.slug)).length;
                const total = route.subLessons.length;
                const pct = total > 0 ? (done / total) * 100 : 0;
                const state: "complete" | "in-progress" | "not-started" =
                  done === total ? "complete" : done > 0 ? "in-progress" : "not-started";

                return (
                  <Link
                    key={route.moduleSlug}
                    href={`/lessons/${route.moduleSlug}`}
                    className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400 transition-colors"
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
                        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                          Not started
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${state === "complete" ? "bg-green-500" : "bg-blue-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{done}/{total}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="border-t pt-6 space-y-3">
        <p className="text-sm text-gray-500">
          Progress is saved on this device. Clearing your browser data or switching to a different device will reset it.
        </p>
        <button
          onClick={() => {
            if (window.confirm("Reset all progress? This can't be undone.")) {
              resetProgress();
              setCompletedSlugs([]);
            }
          }}
          className="text-sm text-red-600 underline hover:text-red-800"
        >
          Reset all progress
        </button>
      </div>
    </div>
  );
}
