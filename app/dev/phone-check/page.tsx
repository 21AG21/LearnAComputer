import { notFound } from "next/navigation";
import { getLessonBySlug } from "@/lib/lessons";
import { PHONE_LESSON_SLUGS } from "@/lib/phoneCourse";
import { SimFormFactorProvider } from "@/components/Playground/SimFormFactor";
import SolveCheck from "@/components/SolveCheck";

/**
 * Plays the phone course's borrowed lessons **in the phone shape**.
 *
 * It is deliberately the same `SolveCheck` harness and the same `lib/solve`
 * solver the laptop course uses, wrapped in `SimFormFactorProvider` and given a
 * narrow viewport by `scripts/phone-check.mjs`. Writing a second solver would
 * have meant a second definition of "finished", and the answer to "can a learner
 * complete this?" must not depend on which harness asked.
 *
 * What this proves that `solve-check` cannot: the phone renders the same
 * activities through different layout branches — stacked panes, no window
 * chrome, a full-bleed app instead of a draggable window, Settings as a list you
 * go into. A pane collapsed to zero width or a control pushed off a 390px screen
 * is invisible to a harness running at 1440px, and the first run of this page
 * found exactly that in Mail and Photos.
 *
 * Development only. There is nothing here for a learner.
 */
export default function PhoneCheckPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const lessons = PHONE_LESSON_SLUGS.map((slug) => getLessonBySlug(slug))
    .filter((l): l is NonNullable<typeof l> => !!l)
    .filter((l) => l.playgroundTask.type !== "none" && l.playgroundTask.type !== "placeholder")
    .map((l) => ({ slug: l.slug, unit: l.unit, title: l.title, task: l.playgroundTask }));

  return (
    <SimFormFactorProvider value="phone">
      <SolveCheck lessons={lessons} />
    </SimFormFactorProvider>
  );
}
