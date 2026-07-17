import { notFound } from "next/navigation";
import { getModuleRouteBySlug, getNextModuleSlug } from "@/lib/lessons";
import LessonModuleRunner from "@/components/LessonModuleRunner";

export default async function LessonModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const route = getModuleRouteBySlug(slug);

  if (!route) {
    notFound();
  }

  const nextModuleSlug = getNextModuleSlug(slug);

  return <LessonModuleRunner route={route} nextModuleSlug={nextModuleSlug} />;
}
