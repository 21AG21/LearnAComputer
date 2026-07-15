import Link from "next/link";
import { getLessonsGrouped } from "@/lib/lessons";

export default function LessonsPage() {
  const unitGroups = getLessonsGrouped();

  return (
    <div className="space-y-10 max-w-xl">
      <h1 className="text-2xl font-bold">Lessons</h1>
      {unitGroups.map((unitGroup) => (
        <div key={unitGroup.unit} className="space-y-6">
          <h2 className="text-xl font-bold">{unitGroup.unit}</h2>
          {unitGroup.modules.map((moduleGroup) => (
            <div key={moduleGroup.module}>
              <h3 className="text-lg font-semibold mb-2">{moduleGroup.module}</h3>
              <ul className="space-y-2">
                {moduleGroup.lessons.map((lesson) => (
                  <li key={lesson.slug}>
                    <Link href={`/lessons/${lesson.slug}`} className="underline">
                      {lesson.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
