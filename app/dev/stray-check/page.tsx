import { notFound } from "next/navigation";
import { getAllLessons } from "@/lib/lessons";
import { PHONE_LESSON_SLUGS } from "@/lib/phoneCourse";
import { SimFormFactorProvider } from "@/components/Playground/SimFormFactor";
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
 * `?phone=1` mounts the same lessons in the phone shape — the subset that is in
 * the phone course, wrapped in `SimFormFactorProvider`, hosted at the full
 * viewport the way `PhoneCourse` hosts them. `sim-contrast-check` uses this to
 * measure the phone's surfaces; nothing else ever looks at their colors.
 *
 * Development only — there is nothing here for a learner.
 */
export default async function StrayCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const phone = (await searchParams).phone === "1";
  const lessons = getAllLessons()
    .filter((l) => {
      const t = l.playgroundTask as PlaygroundTaskWithSteps;
      return Array.isArray(t.steps) && t.steps.length > 0 && t.mode !== "assessment";
    })
    .filter((l) => !phone || PHONE_LESSON_SLUGS.includes(l.slug))
    .map((l) => ({ slug: l.slug, task: l.playgroundTask }));

  if (phone) {
    return (
      <SimFormFactorProvider value="phone">
        <StrayCheck lessons={lessons} phone />
      </SimFormFactorProvider>
    );
  }
  return <StrayCheck lessons={lessons} />;
}

/** Guided step lists live under different keys per sim; only the shape matters here. */
type PlaygroundTaskWithSteps = { steps?: unknown[]; mode?: string };
