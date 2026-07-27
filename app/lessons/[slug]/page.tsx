import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getModuleRouteBySlug, getNextModuleSlug, getPreviousModuleSlug } from "@/lib/lessons";
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

  return (
    <Suspense>
      <LessonModuleRunner route={route} nextModuleSlug={nextModuleSlug} previousModuleSlug={previousModuleSlug} />
    </Suspense>
  );
}
