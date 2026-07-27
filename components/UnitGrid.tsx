"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getCompletedSlugs } from "@/lib/progress";
import { unitArt } from "@/lib/unitArt";
import { CheckIcon } from "@/components/Playground/Icons";

export interface UnitCard {
  unit: string;
  href: string;
  moduleCount: number;
  slugs: string[];
}

export default function UnitGrid({ units }: { units: UnitCard[] }) {
  // Starts empty so the server render and the first client render agree; the real
  // numbers arrive after mount and only change the pill, never the layout.
  const [completed, setCompleted] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCompleted(getCompletedSlugs());
    setMounted(true);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {units.map((u) => {
        const done = u.slugs.filter((s) => completed.includes(s)).length;
        const total = u.slugs.length;
        const isDone = mounted && done === total;
        const started = mounted && done > 0;

        return (
          <Link
            key={u.unit}
            href={u.href}
            className="group relative block h-36 overflow-hidden rounded-xl border border-gray-200 transition-shadow hover:shadow-lg dark:border-gray-800"
          >
            <Image
              src={unitArt(u.unit)}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />

            {isDone && (
              <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                <CheckIcon size={11} /> Complete
              </span>
            )}
            {started && !isDone && (
              <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-gray-800">
                {done} of {total}
              </span>
            )}

            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="text-sm font-semibold leading-tight text-white">{u.unit}</p>
              <p className="mt-0.5 text-[11px] text-white/70">
                {u.moduleCount} {u.moduleCount === 1 ? "module" : "modules"} &middot; {total} lessons
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
