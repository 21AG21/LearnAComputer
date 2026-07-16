import fs from "fs";
import path from "path";

export type PlaygroundTask =
  | { type: "none" }
  | { type: "placeholder" }
  | {
      type: "keyboard-shortcut";
      instructions: string;
      sourceText: string;
      successCondition: "pasted-matches-source";
    }
  | { type: "type-text"; instructions: string; targetText: string }
  | { type: "shape-click-game"; instructions: string; targetScore: number }
  | { type: "file-explorer-open"; instructions: string; filesToOpen: string[] }
  | { type: "browser-right-click"; instructions: string }
  | { type: "browser-scroll-code"; instructions: string; code: string }
  | { type: "pinch-zoom"; instructions: string }
  | { type: "message-reply"; instructions: string; contactName: string; incomingMessage: string }
  | { type: "match-parts"; instructions: string }
  | { type: "open-all-apps"; instructions: string };

export interface Lesson {
  slug: string;
  unit: string;
  module: string;
  order: number;
  title: string;
  videoUrl: string;
  drDigitalIntro: string;
  playgroundTask: PlaygroundTask;
  drDigitalSuccess: string;
  drDigitalHint: string;
}

export interface ModuleGroup {
  module: string;
  lessons: Lesson[];
}

export interface UnitGroup {
  unit: string;
  modules: ModuleGroup[];
}

const lessonsDirectory = path.join(process.cwd(), "content", "lessons");

export function getAllLessons(): Lesson[] {
  const files = fs.readdirSync(lessonsDirectory).filter((file) => file.endsWith(".json"));
  const lessons = files.map((file) => {
    const raw = fs.readFileSync(path.join(lessonsDirectory, file), "utf-8");
    return JSON.parse(raw) as Lesson;
  });
  return lessons.sort((a, b) => a.order - b.order);
}

export function getLessonBySlug(slug: string): Lesson | undefined {
  return getAllLessons().find((lesson) => lesson.slug === slug);
}

export function getLessonsGrouped(): UnitGroup[] {
  const lessons = getAllLessons();
  const unitGroups: UnitGroup[] = [];

  for (const lesson of lessons) {
    let unitGroup = unitGroups.find((u) => u.unit === lesson.unit);
    if (!unitGroup) {
      unitGroup = { unit: lesson.unit, modules: [] };
      unitGroups.push(unitGroup);
    }

    let moduleGroup = unitGroup.modules.find((m) => m.module === lesson.module);
    if (!moduleGroup) {
      moduleGroup = { module: lesson.module, lessons: [] };
      unitGroup.modules.push(moduleGroup);
    }

    moduleGroup.lessons.push(lesson);
  }

  return unitGroups;
}
