import Link from "next/link";
import { getModuleRoutes } from "@/lib/lessons";

export default function LessonsPage() {
  const routes = getModuleRoutes();
  const units = Array.from(new Set(routes.map((r) => r.unit)));

  return (
    <div className="h-full overflow-y-auto p-6 space-y-10 max-w-xl">
      <h1 className="text-2xl font-bold">Lessons</h1>
      {units.map((unit) => (
        <div key={unit} className="space-y-3">
          <h2 className="text-xl font-bold">{unit}</h2>
          <ul className="space-y-2">
            {routes
              .filter((r) => r.unit === unit)
              .map((route) => (
                <li key={route.moduleSlug}>
                  <Link href={`/lessons/${route.moduleSlug}`} className="underline">
                    {route.module}
                  </Link>
                  <span className="text-sm text-gray-500">
                    {" "}
                    — {route.subLessons.length} {route.subLessons.length === 1 ? "lesson" : "lessons"}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
