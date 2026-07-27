"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCompletedSlugs } from "@/lib/progress";

export interface ModuleSummary {
  unit: string;
  module: string;
  moduleSlug: string;
  slugs: string[];
}

export default function HomeProgress({ modules }: { modules: ModuleSummary[] }) {
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    setCompleted(getCompletedSlugs());
  }, []);

  const total = modules.reduce((n, m) => n + m.slugs.length, 0);
  const done = modules.reduce((n, m) => n + m.slugs.filter((s) => completed.includes(s)).length, 0);
  const pct = total > 0 ? (done / total) * 100 : 0;
  const next = modules.find((m) => m.slugs.some((s) => !completed.includes(s)));

  return (
    <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        Where you are
      </h2>

      <p className="mt-3 text-3xl font-bold tabular-nums">
        {done}
        <span className="text-lg font-normal text-gray-400 dark:text-gray-500"> / {total}</span>
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">lessons finished</p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {next ? (
        <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-800">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Up next
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{next.unit}</p>
          <Link
            href={`/lessons/${next.moduleSlug}`}
            className="mt-0.5 block font-semibold underline-offset-2 hover:underline"
          >
            {next.module}
          </Link>
        </div>
      ) : (
        <p className="mt-5 border-t border-gray-200 pt-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          You have finished every lesson. Anything can be redone from the Lessons page.
        </p>
      )}
    </div>
  );
}
