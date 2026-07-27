"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getCompletedSlugs, resetProgress } from "@/lib/progress";
import { useAuth } from "@/components/AuthProvider";
import { unitArt } from "@/lib/unitArt";
import SiteFooter from "@/components/SiteFooter";
import { CheckIcon } from "@/components/Playground/Icons";
import type { ModuleRoute } from "@/lib/lessons";

interface LessonCatalogProps {
  routes: ModuleRoute[];
}

export default function LessonCatalog({ routes }: LessonCatalogProps) {
  const [completedSlugs, setCompletedSlugs] = useState<string[] | null>(null);
  const { email, forgetAccountProgress } = useAuth();

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
    <div className="mx-auto w-full max-w-5xl px-6 py-8 space-y-8">
      {/* Overall progress */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold">Lessons</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">{totalCompleted} of {totalSubLessons} complete</span>
        </div>
        <div className="h-3 rounded-full bg-gray-200 overflow-hidden dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Continue / all-complete card */}
      {allComplete ? (
        <div className="rounded-xl border-2 border-green-500 bg-green-50 p-5 flex items-center gap-4 dark:bg-green-950/40">
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
          className="block rounded-xl border-2 border-black bg-white p-5 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1 dark:text-gray-500">Continue where you left off</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{continueRoute.unit}</p>
          <p className="font-bold text-lg">{continueRoute.module}</p>
          {(() => {
            const doneInModule = continueRoute.subLessons.filter((l) => completedSlugs.includes(l.slug)).length;
            return (
              <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
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
                        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          Not started
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden dark:bg-gray-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${state === "complete" ? "bg-green-500" : "bg-blue-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 dark:text-gray-500">{done}/{total}</span>
                    </div>
                  </Link>
                  {state === "complete" && (
                    <div className="flex justify-end pr-1">
                      <Link
                        href={`/lessons/${route.moduleSlug}?restart=1`}
                        className="text-xs text-gray-400 hover:text-gray-600 underline dark:text-gray-500 dark:hover:text-gray-300"
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
          {email ? (
            <>
              Progress is saved to <strong>{email}</strong> as well as on this device, so it follows you to any computer
              you sign in on.
            </>
          ) : (
            <>
              Progress is saved on this device. Clearing your browser data or switching to a different device will reset
              it — <Link href="/login" className="underline">add your email</Link> to keep it.
            </>
          )}
        </p>
        <button
          onClick={async () => {
            const scope = email
              ? "Reset all progress? This clears it on this device and in your account, and can't be undone."
              : "Reset all progress? This can't be undone.";
            if (window.confirm(scope)) {
              resetProgress();
              setCompletedSlugs([]);
              // Without this the next sign-in would pull it all straight back.
              await forgetAccountProgress();
            }
          }}
          className="text-sm text-red-600 underline hover:text-red-800"
        >
          Reset all progress
        </button>
      </div>

      <SiteFooter />
    </div>
  );
}
