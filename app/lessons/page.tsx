import { getModuleRoutes } from "@/lib/lessons";
import LessonCatalog from "@/components/LessonCatalog";

export default function LessonsPage() {
  const routes = getModuleRoutes();
  return <LessonCatalog routes={routes} />;
}
