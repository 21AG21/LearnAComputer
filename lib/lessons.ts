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
  | { type: "match-parts"; instructions: string }
  | { type: "open-all-apps"; instructions: string; targetCount?: number }
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
      type: "url-navigator";
      instructions: string;
      prompt: string;
      targetUrl: string;
      successTitle: string;
    }
  | {
      type: "guided-files";
      goal: string;
      mode?: "guided" | "assessment";
      /** Assessment nudge revealed by the Hint button. Points at where to look, never gives the answer. */
      hint?: string;
      /** When true, FileManager blocks mouse clicks and only accepts keyboard input. */
      keyboardOnly?: boolean;
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
          | "save"
          | "arrow-select";
        target?: string;
        value?: string;
        into?: string;
        reveal?: string;
      }>;
    }
  | {
      type: "notes-shortcut";
      goal: string;
      mode?: "guided" | "assessment";
      /** Assessment nudge revealed by the Hint button. Points at where to look, never gives the answer. */
      hint?: string;
      steps: Array<{
        say: string;
        action: "type" | "select-all" | "bold" | "italic" | "underline" | "copy" | "cut" | "paste" | "undo" | "redo";
        value?: string;
      }>;
    }
  | {
      type: "guided-browser";
      goal: string;
      mode?: "guided" | "assessment";
      /** Assessment nudge revealed by the Hint button. Points at where to look, never gives the answer. */
      hint?: string;
      initialDownloads?: string[];
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
          | "open-downloads"
          | "open-result"
          | "delete-download"
          | "open-download"
          | "tab-sequence";
        url?: string;
        title?: string;
        query?: string;
        reveal?: string;
        file?: string;
        page?: string;
      }>;
    }
  | {
      type: "guided-messaging";
      goal: string;
      mode?: "guided" | "assessment";
      /** Assessment nudge revealed by the Hint button. Points at where to look, never gives the answer. */
      hint?: string;
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
          | "end-call"
          | "create-group"
          | "add-to-group"
          | "send-group-message"
          | "pick-emoji";
        target?: string;
        value?: string;
      }>;
    }
  | {
      type: "guided-email";
      goal: string;
      mode?: "guided" | "assessment";
      /** Assessment nudge revealed by the Hint button. Points at where to look, never gives the answer. */
      hint?: string;
      /** Optional pre-filled draft — opens a Drafts folder entry on mount that the learner can open to edit and send. */
      seedDraft?: { to: string; subject: string; body: string };
      steps: Array<{
        say: string;
        action:
          | "open-email" | "compose" | "set-to" | "set-cc" | "set-bcc"
          | "set-subject" | "set-body" | "attach" | "send" | "reply"
          | "forward" | "delete" | "mark-spam" | "archive" | "go-to-folder"
          | "unspam" | "move-to-inbox";
        target?: string;
        value?: string;
      }>;
    }
  | {
      type: "guided-photos";
      goal: string;
      mode?: "guided" | "assessment";
      /** Assessment nudge revealed by the Hint button. Points at where to look, never gives the answer. */
      hint?: string;
      steps: Array<{
        say: string;
        action:
          | "select-photo" | "favorite" | "unfavorite" | "delete" | "recover"
          | "create-album" | "add-to-album" | "go-to-album" | "crop" | "rotate"
          | "adjust-brightness" | "adjust-contrast" | "apply-filter" | "revert"
          | "share" | "search";
        via?: "mail" | "messages";
        to?: string;
        target?: string;
        value?: string;
      }>;
    }
  | {
      type: "guided-app-store";
      goal: string;
      mode?: "guided" | "assessment";
      /** Assessment nudge revealed by the Hint button. Points at where to look, never gives the answer. */
      hint?: string;
      steps: Array<{
        say: string;
        action:
          | "search" | "select-app" | "install" | "allow-permission" | "deny-permission"
          // "open-app" was removed: the App Market could never satisfy it.
          | "go-to-installed" | "go-to-store" | "update-app" | "delete-app"
          | "go-to-category";
        target?: string;
        value?: string;
      }>;
    }
  | {
      type: "guided-settings";
      goal: string;
      mode?: "guided" | "assessment";
      /** Assessment nudge revealed by the Hint button. Points at where to look, never gives the answer. */
      hint?: string;
      steps: Array<{
        say: string;
        action:
          | "open-section" | "toggle" | "slider" | "delete-item" | "empty-trash"
          | "select-device" | "disconnect-device";
        target?: string;
        min?: number;
        max?: number;
      }>;
    }
  | {
      type: "guided-security";
      goal: string;
      mode?: "guided" | "assessment";
      /** Assessment nudge revealed by the Hint button. Points at where to look, never gives the answer. */
      hint?: string;
      /** Which desktop chrome wraps the task. Defaults to "browser" for backward compatibility. */
      chrome?: "browser" | "settings" | "mail" | "messages" | "bare";
      steps: Array<{
        say: string;
        action:
          | "type-password" | "type-username" | "type-login-password"
          | "login" | "use-passkey" | "forgot-link" | "open-reset-email" | "click-reset-link"
          | "enter-2fa-code" | "verify-2fa" | "inspect-link" | "mark-safe"
          | "mark-dangerous" | "toggle-setting" | "go-to-section";
        target?: string;
        value?: string;
        minStrength?: number;
      }>;
    }
  | {
      type: "guided-troubleshooting";
      goal: string;
      scenario: string;
      mode?: "guided" | "assessment";
      /** Assessment nudge revealed by the Hint button. Points at where to look, never gives the answer. */
      hint?: string;
      steps: Array<{
        say: string;
        action:
          | "read-error" | "click-frozen" | "open-force-quit" | "force-quit" | "restart-app"
          | "open-wifi-panel" | "toggle-wifi" | "reconnect-wifi" | "forget-network"
          | "copy-code" | "open-browser" | "paste-code" | "submit-support"
          | "dismiss-error" | "open-settings" | "click-restart" | "confirm-restart"
          | "type-in-app"
          | "open-app-market" | "go-to-my-apps" | "delete-broken-app" | "go-to-store-tab" | "reinstall-app"
          | "join-network" | "captive-portal-continue" | "open-settings-privacy" | "toggle-privacy-tracking"
          | "click-forgot-link" | "open-mail-from-dock" | "open-reset-email" | "click-reset-link"
          | "type-new-password" | "confirm-login";
        target?: string;
        value?: string;
      }>;
    }
  | {
      type: "guided-calendar";
      goal: string;
      mode?: "guided" | "assessment";
      /** Assessment nudge revealed by the Hint button. Points at where to look, never gives the answer. */
      hint?: string;
      launchApp?: "calendar" | "reminders";
      steps: Array<{
        say: string;
        action:
          | "select-day" | "create-event" | "set-title" | "set-time" | "set-repeat"
          | "save-event" | "create-reminder" | "set-reminder-text" | "save-reminder"
          | "complete-reminder" | "switch-view" | "select-calendar";
        target?: string;
        value?: string;
      }>;
    }
  | {
      type: "guided-desktop";
      goal: string;
      mode?: "guided" | "assessment";
      /** Assessment nudge revealed by the Hint button. Points at where to look, never gives the answer. */
      hint?: string;
      steps: Array<{
        say: string;
        action: "move" | "resize" | "minimize" | "restore" | "maximize" | "restore-max" | "close" | "open-app" | "close-app" | "open-clock" | "open-wifi-panel" | "open-battery-panel" | "close-panel";
        target?: string;
      }>;
    }
  | { type: "keyboard-nav-game" }
  | {
      /**
       * A mission carried out on the learner's OWN computer, checked by the page.
       * Every check reads something real — a folder they organized, a file they
       * picked, a setting they changed, their network going down — and every read
       * happens in the browser. Nothing is uploaded anywhere.
       */
      type: "real-world";
      goal: string;
      /** Optional file served from /public that the mission starts by downloading. */
      download?: { file: string; label: string; note?: string };
      steps: RealWorldStep[];
    };

/** What a picked folder has to look like for the sort to count as done. */
export interface FolderExpect {
  /** Folder names the learner was told to create, matched case-insensitively. */
  folders: string[];
  /** Every file that must end up in a named folder. */
  placements: Array<{ file: string; in: string }>;
  /** Files that were junk — they must not survive anywhere in the tree. */
  absent?: string[];
  /** A file whose name said nothing and had to be renamed after reading it. */
  renamed?: { was: string; in: string; rejectPattern?: string };
  /** When true, no file may be left loose at the top level. */
  noLooseFiles?: boolean;
}

/** What a picked file has to be. */
export interface FileExpect {
  kind?: "image" | "pdf" | "any";
  /** The exact file they were sent — proves they found their own Downloads folder. */
  nameIs?: string;
  /** Must have been created/modified within this many minutes — proves they did it just now. */
  recentMinutes?: number;
  minBytes?: number;
  orientation?: "landscape" | "portrait";
  /** Reject names the learner clearly did not choose (IMG_1234, Screenshot …). */
  rejectPattern?: string;
}

export interface RealWorldStep {
  say: string;
  /** Extra explanation shown under the control. */
  detail?: string;
  check:
    | "confirm"
    | "download"
    | "folder"
    | "file"
    | "paste"
    | "window-max"
    | "zoom"
    | "dark-mode"
    | "reduce-motion"
    | "offline"
    | "online"
    | "type-answer"
    | "keys";
  expect?: FolderExpect;
  file?: FileExpect;
  /** type-answer: what counts as right. `match` compares against something the page can measure. */
  answers?: string[];
  match?: "battery" | "hostname" | "browser" | "text";
  tolerance?: number;
  /** paste: how much text, and text it must NOT be (so pasting our own words back fails). */
  minChars?: number;
  notText?: string;
  /** keys: a combination like "ctrl+shift+t" (ctrl also accepts the Command key). */
  keys?: string;
}

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
  /** Warning shown above the Dr. Digital bubble — for keys/actions the learner must NOT press during this lesson. */
  warning?: string;
  /** Optional still image shown in the right pane instead of the PlaygroundOS desktop. */
  media?: { src: string; alt: string; caption?: string };
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

export function getPreviousModuleSlug(moduleSlug: string): string | null {
  const routes = getModuleRoutes();
  const index = routes.findIndex((route) => route.moduleSlug === moduleSlug);
  if (index <= 0) return null;
  return routes[index - 1].moduleSlug;
}
