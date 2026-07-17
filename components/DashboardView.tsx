"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCompletedSlugs } from "@/lib/progress";
import type { ModuleRoute } from "@/lib/lessons";

interface DashboardViewProps {
  routes: ModuleRoute[];
}

export default function DashboardView({ routes }: DashboardViewProps) {
  const [completedSlugs, setCompletedSlugs] = useState<string[] | null>(null);

  useEffect(() => {
    setCompletedSlugs(getCompletedSlugs());
  }, []);

  if (completedSlugs === null) {
    return null;
  }

  const totalSubLessons = routes.reduce((sum, r) => sum + r.subLessons.length, 0);
  const totalCompleted = completedSlugs.length;

  return (
    <div className="space-y-6">
      <p className="text-lg font-semibold">
        {totalCompleted} of {totalSubLessons} lessons completed
      </p>

      <div className="space-y-4">
        {routes.map((route) => {
          const doneInModule = route.subLessons.filter((l) => completedSlugs.includes(l.slug)).length;
          const allDone = doneInModule === route.subLessons.length;
          return (
            <div key={route.moduleSlug} className="border rounded p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">{route.unit}</p>
                <Link href={`/lessons/${route.moduleSlug}`} className="font-semibold underline">
                  {route.module}
                </Link>
              </div>
              <span className={`text-sm font-semibold ${allDone ? "text-green-600" : "text-gray-500"}`}>
                {doneInModule} / {route.subLessons.length}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-gray-500 border-t pt-4">
        Progress is saved on this device — closing the tab or coming back another day won&rsquo;t lose it.
        Clearing your browser data or switching to a different device will reset it.
        A future version will let a parent or teacher check in on progress here too.
      </p>
    </div>
  );
}
