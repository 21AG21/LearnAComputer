import { notFound } from "next/navigation";
import { getLessonBySlug } from "@/lib/lessons";
import LessonRunner from "@/components/LessonRunner";

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getLessonBySlug(slug);

  if (!lesson) {
    notFound();
  }

  return <LessonRunner lesson={lesson} />;
}
