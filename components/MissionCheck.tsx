"use client";

import { useState } from "react";
import LessonPlaygroundPane from "@/components/LessonPlaygroundPane";
import type { PlaygroundTask } from "@/lib/lessons";

export interface MissionItem {
  slug: string;
  unit: string;
  title: string;
  task: PlaygroundTask;
}

/**
 * Mounts one real-world mission so a driver can play it.
 *
 * Real-world missions are the only activities solve-check cannot touch: their
 * steps are satisfied by things outside the page — a folder the learner picks,
 * a real key combination, the system's dark-mode setting — so the in-page
 * solver has nothing to click. That left eighteen missions, including the
 * course capstone, as the one part of the course no harness had ever proven.
 *
 * `scripts/mission-check.mjs` drives this page from outside the browser, where
 * those things can be supplied for real: a generated PDF handed to the file
 * input, a paste event carrying real text, Emulation changing the device pixel
 * ratio. The page itself is unmodified — every check runs its production code.
 *
 * Development only. There is nothing here for a learner.
 */
export default function MissionCheck({ missions, only }: { missions: MissionItem[]; only?: string }) {
  const [result, setResult] = useState<string>("");
  const mission = only ? missions.find((m) => m.slug === only) : undefined;

  if (only && !mission) {
    return <p data-mission-missing="">No mission with slug {only}.</p>;
  }

  if (!mission) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">Mission check</h1>
        <p className="mt-2 text-gray-600">
          Every unit ends with a task on the learner&apos;s own computer. Solve-check cannot play these — pick one to
          drive by hand, or run <code className="rounded bg-gray-100 px-1">npm run mission-check</code>.
        </p>
        <ul className="mt-6 space-y-1">
          {missions.map((m) => (
            <li key={m.slug}>
              <a className="text-blue-700 underline" href={`/dev/mission-check?only=${m.slug}`}>
                {m.slug}
              </a>{" "}
              <span className="text-gray-500">— {m.unit}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col" data-mission-slug={mission.slug} data-mission-result={result}>
      <div className="min-h-0 flex-1">
        <LessonPlaygroundPane
          task={mission.task}
          started
          onResult={(ok, msg) => setResult(ok ? "pass" : `fail: ${msg ?? ""}`)}
        />
      </div>
    </div>
  );
}
