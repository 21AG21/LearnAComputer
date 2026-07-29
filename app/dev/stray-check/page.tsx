import { notFound } from "next/navigation";
import { getAllLessons } from "@/lib/lessons";
import StrayCheck from "@/components/StrayCheck";

/**
 * A maintenance page, not part of the course.
 *
 * Every other harness here does the moderate, correct thing — solve-check
 * performs exactly the current step's action and nothing else. That blind spot
 * shipped a real bug: on Unit 1's window lesson, clicking the red X at step 1
 * left an empty desktop under a banner naming a window that was gone.
 *
 * This page exists so a script can do the wrong thing on purpose, one lesson at
 * a time, and check what the learner is left with.
 *
 * Development only — there is nothing here for a learner.
 */
export default function StrayCheckPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const lessons = getAllLessons()
    .filter((l) => {
      const t = l.playgroundTask as PlaygroundTaskWithSteps;
      return Array.isArray(t.steps) && t.steps.length > 0 && t.mode !== "assessment";
    })
    .map((l) => ({ slug: l.slug, task: l.playgroundTask }));

  return <StrayCheck lessons={lessons} />;
}

/** Guided step lists live under different keys per sim; only the shape matters here. */
type PlaygroundTaskWithSteps = { steps?: unknown[]; mode?: string };
