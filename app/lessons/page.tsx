import type { Metadata } from "next";
import { getModuleRoutes } from "@/lib/lessons";
import LessonCatalog from "@/components/LessonCatalog";

export const metadata: Metadata = {
  title: "Lessons — LearnAComputer",
  description: "Every unit and module in the course, and how far through them you are.",
};

export default function LessonsPage() {
  const routes = getModuleRoutes();
  return <LessonCatalog routes={routes} />;
}
