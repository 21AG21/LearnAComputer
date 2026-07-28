import { notFound } from "next/navigation";
import { getAllLessons } from "@/lib/lessons";
import SolveCheck from "@/components/SolveCheck";

/**
 * A maintenance page, not part of the course: it plays every guided activity to
 * the end and reports the ones that cannot be finished.
 *
 * `/dev/mount-check` proves an activity renders; this proves a learner can get
 * through it. Two lessons once shipped that nobody could complete — a WiFi
 * network the simulator did not have, and a weekday name compared against a date
 * number — and both were invisible to the type checker, the linter, the lesson
 * validator and the mount harness.
 *
 * Development only. There is nothing here for a learner.
 */
export default function SolveCheckPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const lessons = getAllLessons()
    .filter((l) => l.playgroundTask.type !== "none" && l.playgroundTask.type !== "placeholder")
    .map((l) => ({ slug: l.slug, unit: l.unit, title: l.title, task: l.playgroundTask }));

  return <SolveCheck lessons={lessons} />;
}
