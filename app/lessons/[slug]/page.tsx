import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getModuleRouteBySlug, getNextModuleSlug, getPreviousModuleSlug } from "@/lib/lessons";
import LessonModuleRunner from "@/components/LessonModuleRunner";

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
