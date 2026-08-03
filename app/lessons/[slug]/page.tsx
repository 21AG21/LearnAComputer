import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getModuleRouteBySlug, getNextModuleSlug, getPreviousModuleSlug } from "@/lib/lessons";
import { moduleArtMarkup } from "@/lib/lessonArtMarkup";
import LessonModuleRunner from "@/components/LessonModuleRunner";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const route = getModuleRouteBySlug(slug);
  if (!route) return { title: "Lesson not found — LearnAComputer" };
  return {
    title: `${route.module} — LearnAComputer`,
    description: `${route.unit}: ${route.subLessons.length} step${route.subLessons.length === 1 ? "" : "s"}.`,
  };
}

export default async function LessonModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const route = getModuleRouteBySlug(slug);

  if (!route) {
    notFound();
  }

  const nextModuleSlug = getNextModuleSlug(slug);
  const previousModuleSlug = getPreviousModuleSlug(slug);

  // Read the art here rather than letting the client fetch it: inlined SVG is
  // the only way the animation reliably runs (see lib/lessonArtMarkup.ts), and
  // the learner steps between sub-lessons without another round trip, so the
  // whole module's art has to travel with the page.
  const artMarkup = moduleArtMarkup(route.subLessons.map((l) => l.slug));

  return (
    <Suspense>
      <LessonModuleRunner
        route={route}
        artMarkup={artMarkup}
        nextModuleSlug={nextModuleSlug}
        previousModuleSlug={previousModuleSlug}
      />
    </Suspense>
  );
}
