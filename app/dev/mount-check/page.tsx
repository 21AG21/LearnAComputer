import { notFound } from "next/navigation";
import { getAllLessons } from "@/lib/lessons";
import MountCheck from "@/components/MountCheck";

/**
 * A maintenance page, not part of the course: it mounts every lesson's activity
 * one after another and reports the ones that throw. Sampling a few playgrounds
 * by hand has missed real breakage before, and 198 lessons is more than anyone
 * is going to click through.
 *
 * Development only — there is nothing here for a learner.
 */
export default function MountCheckPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const lessons = getAllLessons()
    .filter((l) => l.playgroundTask.type !== "none" && l.playgroundTask.type !== "placeholder")
    .map((l) => ({ slug: l.slug, unit: l.unit, title: l.title, task: l.playgroundTask }));

  return <MountCheck lessons={lessons} />;
}
