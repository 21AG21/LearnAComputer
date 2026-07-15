import { notFound } from "next/navigation";
import { getLessonBySlug } from "@/lib/lessons";
import LessonRunner from "@/components/LessonRunner";
import FakeDesktop from "@/components/Playground/FakeDesktop";

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getLessonBySlug(slug);

  if (!lesson) {
    notFound();
  }

  return (
    <div className="h-full flex">
      <div className="w-full lg:max-w-xl shrink-0 overflow-y-auto p-6">
        <LessonRunner lesson={lesson} />
      </div>
      <div className="hidden lg:block flex-1 min-w-0 border-l">
        <FakeDesktop />
      </div>
    </div>
  );
}
