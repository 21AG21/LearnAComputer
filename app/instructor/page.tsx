import type { Metadata } from "next";
import { getAllLessons } from "@/lib/lessons";
import InstructorView from "@/components/InstructorView";

export const metadata: Metadata = {
  title: "Instructors — LearnAComputer",
  description: "Make a class, share the code, and see how far each learner has got.",
};

export default function InstructorPage() {
  // The unit shape of the course, sent down once so the roster can be worked
  // out in the browser. No learner data is involved in this.
  const byUnit = new Map<string, string[]>();
  for (const lesson of getAllLessons()) {
    const slugs = byUnit.get(lesson.unit) ?? [];
    slugs.push(lesson.slug);
    byUnit.set(lesson.unit, slugs);
  }
  const units = [...byUnit].map(([name, slugs]) => ({ name, slugs }));

  return <InstructorView units={units} />;
}
