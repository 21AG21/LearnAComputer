import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAllLessons } from "@/lib/lessons";
import MissionCheck from "@/components/MissionCheck";

/**
 * A maintenance page, not part of the course: it mounts one real-world mission
 * so `scripts/mission-check.mjs` can play it from outside the browser.
 *
 * Development only. There is nothing here for a learner.
 */
export default async function MissionCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ only?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { only } = await searchParams;
  const missions = getAllLessons()
    .filter((l) => l.playgroundTask.type === "real-world")
    .map((l) => ({ slug: l.slug, unit: l.unit, title: l.title, task: l.playgroundTask }));

  return (
    <Suspense>
      <MissionCheck missions={missions} only={only} />
    </Suspense>
  );
}
