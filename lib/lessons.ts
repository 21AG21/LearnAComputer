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
  | { type: "type-text"; instructions: string; targetText: string; exact?: boolean }
  | { type: "shape-click-game"; instructions: string; targetScore: number }
  | { type: "file-explorer-open"; instructions: string; filesToOpen: string[] }
  | { type: "browser-right-click"; instructions: string }
  | { type: "browser-scroll-code"; instructions: string; code: string }
  | { type: "pinch-zoom"; instructions: string }
  | {
      type: "message-reply";
      instructions: string;
      contactName: string;
      incomingMessage: string;
      requiredResponse: string;
      avatarSrc?: string;
    }
  | { type: "match-parts"; instructions: string }
  | { type: "open-all-apps"; instructions: string }
  | {
      type: "edit-text";
      instructions: string;
      startingText: string;
      correctText?: string;
      mustInclude: string[];
      mustNotInclude: string[];
    }
  | {
      type: "edit-file";
      instructions: string;
      fileName: string;
      startingText: string;
      correctText?: string;
      mustInclude: string[];
      mustNotInclude: string[];
    }
  | {
      type: "compose-email";
      instructions: string;
      to: string;
      subject: string;
      requiredBody: string;
    }
  | {
      type: "multiple-choice";
      question: string;
      options: Array<{ text: string; correct: boolean }>;
    }
  | {
      type: "drag-sort-files";
      instructions: string;
      categories: string[];
      items: Array<{ label: string; category: string }>;
    }
  | {
      type: "spot-the-fake";
      instructions: string;
      items: Array<{ label: string; preview: string; isFake: boolean }>;
      fakeExplanation: string;
    }
  | {
      type: "find-in-settings";
      instructions: string;
      targetPanel: string;
      toggleLabel: string;
      targetValue: boolean;
    }
  | {
      type: "url-navigator";
      instructions: string;
      prompt: string;
      targetUrl: string;
      successTitle: string;
    }
  | {
      type: "guided-files";
      goal: string;
      steps: Array<{
        say: string;
        action:
          | "open-file"
          | "open-folder"
          | "go-to"
          | "new-folder"
          | "rename"
          | "move"
          | "search"
          | "delete"
          | "restore"
          | "save";
        target?: string;
        value?: string;
        into?: string;
        reveal?: string;
      }>;
    }
  | {
      type: "guided-browser";
      goal: string;
      steps: Array<{
        say: string;
        action:
          | "navigate"
          | "search"
          | "new-tab"
          | "close-tab"
          | "new-window"
          | "reload"
          | "bookmark"
          | "reading-list-add"
          | "history-visit"
          | "lock-click"
          | "cookie-decline"
          | "close-popup"
          | "zoom-in"
          | "download"
          | "open-downloads";
        url?: string;
        title?: string;
        query?: string;
        reveal?: string;
      }>;
    }
  | {
      type: "guided-messaging";
      goal: string;
      steps: Array<{
        say: string;
        action:
          | "select-contact"
          | "send-message"
          | "add-reaction"
          | "attach-photo"
          | "start-call"
          | "mute"
          | "camera-off"
          | "end-call";
        target?: string;
        value?: string;
      }>;
    };

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

/** One routable page: a module and every sub-lesson inside it, in order. */
export interface ModuleRoute {
  unit: string;
  module: string;
  moduleSlug: string;
  subLessons: Lesson[];
}

export function slugifyModule(module: string): string {
  return module
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

/** Flat, ordered list of every module — each one is a single route. */
export function getModuleRoutes(): ModuleRoute[] {
  const routes: ModuleRoute[] = [];
  for (const unitGroup of getLessonsGrouped()) {
    for (const moduleGroup of unitGroup.modules) {
      routes.push({
        unit: unitGroup.unit,
        module: moduleGroup.module,
        moduleSlug: slugifyModule(moduleGroup.module),
        subLessons: moduleGroup.lessons,
      });
    }
  }
  return routes;
}

export function getModuleRouteBySlug(moduleSlug: string): ModuleRoute | undefined {
  return getModuleRoutes().find((route) => route.moduleSlug === moduleSlug);
}

/** The next module's slug in course order, or null if this is the last one. */
export function getNextModuleSlug(moduleSlug: string): string | null {
  const routes = getModuleRoutes();
  const index = routes.findIndex((route) => route.moduleSlug === moduleSlug);
  if (index === -1 || index === routes.length - 1) return null;
  return routes[index + 1].moduleSlug;
}
