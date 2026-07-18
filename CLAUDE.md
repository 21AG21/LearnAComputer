# LearnAComputer

Basic computer literacy course for absolute beginners, taught step-by-step with interactive playgrounds.

## Stack

- **Next.js 15** App Router, React 19, TypeScript, Tailwind CSS 3
- No database — all progress in `localStorage`
- Deployed via Vercel

## Commands

```sh
npm run dev          # dev server on :3000
npm run build        # production build (rm -rf .next first if switching from dev)
npm run lint         # eslint
npx tsc --noEmit     # type-check without emitting
```

## Project Structure

```
app/
  layout.tsx              # Shell: nav bar, Roboto font, PageTransition wrapper
  page.tsx                # Homepage with progress-aware Dr. Digital greeting
  dashboard/page.tsx      # Progress dashboard (completed modules, reset button)
  lessons/page.tsx        # Course catalog grouped by unit → module
  lessons/[slug]/page.tsx # Dynamic route — renders one module (multiple sub-lessons)
  funny-cat-video/        # Easter-egg page opened by the right-click playground
  playground/page.tsx     # Standalone playground sandbox

components/
  DrDigital.tsx            # Speech-bubble mascot (intro / success / hint moods)
  DrDigitalAvatar.tsx      # Reusable avatar image
  HomeGreeting.tsx         # Client component for progress-aware homepage message
  DashboardView.tsx        # Client component for the dashboard
  PageTransition.tsx       # Fade/slide route transitions
  LessonModuleRunner.tsx   # Steps through sub-lessons, gates on playground completion
  LessonPlaygroundPane.tsx # Right pane — Start Activity / Skip / fullscreen toggle

  Playground/
    TaskChecker.ts         # Pure validation functions for every task type
    TypeTextTask.tsx        # "Type this text" activity
    TextEditorTask.tsx      # Edit pre-filled text (delete/fix mistakes)
    EditFileTask.tsx        # Edit a file inside FilesApp with save validation
    CopyPasteTask.tsx       # Copy-paste keyboard shortcut task
    ComposeEmailTask.tsx    # Write and send an email in MailApp
    ShapeClickGame.tsx      # Click falling shapes to reach a target score
    MatchPartsTask.tsx      # Drag-match laptop parts to labels
    OpenAllAppsTask.tsx     # Open all dock apps on FakeDesktop
    BrowserSimulator.tsx    # Shared browser chrome (tabs, address bar, lock icon)
    DesktopBrowserRightClickTask.tsx
    DesktopBrowserScrollTask.tsx
    DesktopBrowserZoomTask.tsx
    DesktopFileExplorerTask.tsx
    FakeDesktop.tsx         # macOS-like desktop: dock, menu bar, battery, wifi, clock
    MusicNoteIcon.tsx       # SVG music note for file previews

    Desktop/               # Apps that run inside FakeDesktop
      AppWindow.tsx         # Draggable/closeable window frame
      BrowserApp.tsx        # In-desktop web browser
      FilesApp.tsx          # File manager with sidebar + preview
      MailApp.tsx           # Email client
      MessagingApp.tsx      # Chat app (persistent threads via localStorage)
      filesData.ts          # Shared file/folder tree used by FilesApp and EditFileTask

content/lessons/           # 47 lesson JSON files (see Lesson schema below)

lib/
  lessons.ts               # Reads lesson JSON, groups by unit/module, module routing
  progress.ts              # localStorage read/write for completed slugs
  chat.ts                  # localStorage read/write for messaging threads

public/playgrounds/        # Static images used by playground components
```

## Data Model

### Lesson JSON (`content/lessons/*.json`)

Each file defines one sub-lesson:

```ts
{
  slug: string;           // unique, matches filename
  unit: string;           // "Unit 1: ..." or "Unit 2: ..."
  module: string;         // groups sub-lessons into one routable page
  order: number;          // global sort order (100-series = Unit 1, 200-series = Unit 2)
  title: string;
  videoUrl: string;       // unused for now, reserved
  drDigitalIntro: string;
  playgroundTask: PlaygroundTask;  // see union type in lib/lessons.ts
  drDigitalSuccess: string;
  drDigitalHint: string;
}
```

### PlaygroundTask types

| Type | Component | What it does |
|------|-----------|-------------|
| `none` | — | No activity, sub-lesson auto-advances |
| `placeholder` | — | Same as none, reserved for future |
| `type-text` | TypeTextTask | Type target text; `exact` flag for case-sensitive |
| `edit-text` | TextEditorTask | Fix pre-filled text; validated by `mustInclude`/`mustNotInclude` |
| `edit-file` | EditFileTask | Edit a file in FilesApp; same validation |
| `keyboard-shortcut` | CopyPasteTask | Copy source text and paste it |
| `shape-click-game` | ShapeClickGame | Click falling shapes to hit `targetScore` |
| `file-explorer-open` | DesktopFileExplorerTask | Double-click to open specific files |
| `browser-right-click` | DesktopBrowserRightClickTask | Right-click a link to open in new tab |
| `browser-scroll-code` | DesktopBrowserScrollTask | Scroll to find a code, type it back |
| `pinch-zoom` | DesktopBrowserZoomTask | Ctrl+scroll to zoom, read hidden digits |
| `message-reply` | MessagingApp (via FakeDesktop) | Reply to a message with required text |
| `match-parts` | MatchPartsTask | Drag laptop part labels to correct spots |
| `open-all-apps` | OpenAllAppsTask | Open every dock app |
| `compose-email` | ComposeEmailTask | Write an email with required to/subject/body |

### Progress

Stored in `localStorage` under key `"lac-progress"`:

```ts
{ version: 1, completedSlugs: string[] }
```

`LessonModuleRunner` calls `markComplete(slug)` when a sub-lesson's playground is finished.
Sub-lessons with `type: "none"` or `"placeholder"` auto-advance (no gate).

### Chat threads

Stored in `localStorage` under key `"lac-chats"`. Schema: `Record<string, ChatMessage[]>`.

## Routing

Lessons are grouped into **modules** (one URL each): `/lessons/[moduleSlug]`.
`slugifyModule()` in `lib/lessons.ts` converts module names to URL slugs.
`LessonModuleRunner` renders all sub-lessons in a module as a stepper.
After completing a module, the user can navigate to the next module or back to `/lessons`.

## Key Patterns

- **Server vs Client**: Lesson data loading (`getAllLessons`, etc.) is server-only (uses `fs`). Progress, chat, and all playground components are `"use client"`.
- **Fullscreen**: `LessonPlaygroundPane` uses the native Fullscreen API. Fullscreen state persists across sub-lesson navigation within a module.
- **FakeDesktop**: A self-contained macOS-like environment. Apps open in `AppWindow` frames. The menu bar has a working clock, battery indicator (real Battery API), and WiFi panel. The dock shows open-app indicators (green dots).
- **Validation**: All task validation lives in `TaskChecker.ts` as pure functions. Components call the appropriate checker and pass `onResult(boolean)` up to `LessonModuleRunner`.

## Adding a New Playground

1. Pick an existing `PlaygroundTask` type from the union in `lib/lessons.ts`
2. Set the `playgroundTask` field in the lesson's JSON file
3. Update `drDigitalSuccess` and `drDigitalHint` to reference the activity
4. If you need a new task type: add to the union in `lib/lessons.ts`, create a component, add a checker in `TaskChecker.ts`, wire it into `LessonPlaygroundPane.tsx`
