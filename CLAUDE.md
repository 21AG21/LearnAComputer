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

content/lessons/           # 150+ lesson JSON files (see Lesson schema below)

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
  order: number;          // global sort order (see ranges below)
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

## Adding New Units and Lessons

No code changes are needed to add lessons. Create JSON files in `content/lessons/` and the site picks them up automatically.

### Step 1: Plan the unit structure

Decide the unit name, modules, and sub-lessons. A **unit** is a top-level grouping (e.g. "Unit 3: The Internet"). A **module** groups related sub-lessons onto one page. A sub-lesson is a single JSON file.

### Step 2: Pick `order` numbers

`order` controls the global sort order of all lessons. Existing ranges:
- Unit 1: `1`–`26`
- Unit 2: `200`–`290`
- Unit 3 (Files & Finder): `300`–`390`
- Unit 4 (Internet & Safari): `400`–`496`
- Unit 5 (Messages & FaceTime): `500`–`570`
- Unit 6 (Email): `600`–`680`
- Unit 7 (Photos): `700`–`780`
- Unit 8 (Apps): `800`–`870`
- Unit 9 (Settings): `900`–`960`
- Unit 10 (Online Safety): `1000`–`1100`
- Unit 11 (Troubleshooting): `1110`–`1190`
- Unit 12 (Everyday Life): `1200`–`1290`
- Final Capstone: `1300`

Within a module, use consecutive integers (`300`, `301`, `302`). Between modules, leave a gap of 10 (`300`-series, `310`-series, `320`-series) so lessons can be inserted later.

### Step 3: Create one JSON file per sub-lesson

Save as `content/lessons/{slug}.json`. The `slug` must be unique across all lessons and match the filename (without `.json`). Use lowercase kebab-case (e.g. `internet-what-is-wifi`).

Every file must have this exact shape:

```json
{
  "slug": "internet-what-is-wifi",
  "unit": "Unit 3: The Internet",
  "module": "What is the Internet?",
  "order": 300,
  "title": "What is WiFi?",
  "videoUrl": "",
  "drDigitalIntro": "WiFi is how your laptop connects to the internet without any wires...",
  "playgroundTask": { "type": "none" },
  "drDigitalSuccess": "Now you know what WiFi is!",
  "drDigitalHint": "Just read along and click Continue when you're ready."
}
```

**Rules:**
- `unit` must be identical across every lesson in the same unit (exact string match, including capitalization and colon)
- `module` must be identical across every lesson in the same module
- `videoUrl` is always `""` (reserved for future use)
- `drDigitalIntro` is the teaching content — Dr. Digital explains the concept in friendly, simple language for absolute beginners
- `drDigitalSuccess` congratulates the learner after they complete the activity (or auto-advances if `type: "none"`)
- `drDigitalHint` gives a nudge if they're stuck on the activity

### Step 4: Choose a playground activity

Use `{ "type": "none" }` for lessons that are explanation-only (no interactive activity). For lessons that should have an activity, pick from the types below. **Do not create new playground types** — only use the ones listed here.

#### `none` — No activity, auto-advances
```json
"playgroundTask": { "type": "none" }
```

#### `type-text` — Type exact text
The learner types the target text into an input box. Set `exact: true` for case-sensitive matching (capitals, punctuation must match). Without `exact`, comparison is case-insensitive.
```json
"playgroundTask": {
  "type": "type-text",
  "instructions": "Type the words below — don't worry about capitals.",
  "targetText": "hello dr digital",
  "exact": false
}
```
```json
"playgroundTask": {
  "type": "type-text",
  "instructions": "Type this sentence exactly as shown, including capitals and punctuation.",
  "targetText": "Dr. Digital says: WOW!",
  "exact": true
}
```

#### `edit-text` — Fix mistakes in pre-filled text
The learner edits text in a textarea. Validation uses `mustInclude` (strings that must be present) and `mustNotInclude` (strings that must be gone). `correctText` is optional — shown as a "Show example" reference.
```json
"playgroundTask": {
  "type": "edit-text",
  "instructions": "This sentence has extra letters — use Delete to fix them.",
  "startingText": "Helllo, my namme is Dr. Diggital!",
  "correctText": "Hello, my name is Dr. Digital!",
  "mustInclude": ["Hello, my name is Dr. Digital!"],
  "mustNotInclude": ["Helllo", "namme", "Diggital"]
}
```

#### `edit-file` — Edit a file inside the Files app
Same validation as `edit-text`, but the learner edits inside a simulated file manager. `fileName` must match a file in `filesData.ts`.
```json
"playgroundTask": {
  "type": "edit-file",
  "instructions": "Open the invitation file and fix the date.",
  "fileName": "PartyInvitation.txt",
  "startingText": "You're invited to my party on Janurary 15!",
  "correctText": "You're invited to my party on January 15!",
  "mustInclude": ["January 15"],
  "mustNotInclude": ["Janurary"]
}
```

#### `keyboard-shortcut` — Copy and paste text
The learner copies source text with Cmd+C and pastes it with Cmd+V.
```json
"playgroundTask": {
  "type": "keyboard-shortcut",
  "instructions": "Select the text, press Command+C to copy, click the box below, then Command+V to paste.",
  "sourceText": "The quick brown fox jumps over the lazy dog.",
  "successCondition": "pasted-matches-source"
}
```

#### `compose-email` — Write and send an email
The learner opens the Mail app, composes, and sends. Validation checks `to`, `subject`, and `requiredBody`.
```json
"playgroundTask": {
  "type": "compose-email",
  "instructions": "Open Mail, click the pencil to compose, and type this message exactly...",
  "to": "doctordigital@example.com",
  "subject": "THANKS DOCTOR DIGITAL",
  "requiredBody": "Hi Doctor Digital! Thanks for teaching me!"
}
```

#### `message-reply` — Reply in the Messaging app
The learner types a reply to an incoming message. `requiredResponse` must be typed exactly (case-insensitive).
```json
"playgroundTask": {
  "type": "message-reply",
  "instructions": "Doggo sent a message — type Dr. Digital's reply exactly as shown.",
  "contactName": "Doggo",
  "incomingMessage": "I'm hungry. Can you give me food?",
  "requiredResponse": "Sure Doggo, I will give you 32 pebbles and 6 bones."
}
```

#### Other types (use only where appropriate)
These types have hardcoded UI — the JSON fields configure them but the visual experience is fixed:

| Type | What it does | Required fields |
|------|-------------|----------------|
| `shape-click-game` | Click falling shapes to reach a score | `instructions`, `targetScore` (number) |
| `file-explorer-open` | Double-click files to open them | `instructions`, `filesToOpen` (string array of filenames) |
| `browser-right-click` | Right-click a link to open in new tab | `instructions` |
| `browser-scroll-code` | Scroll to find a hidden code | `instructions`, `code` (string) |
| `pinch-zoom` | Ctrl+scroll to zoom and read digits | `instructions` |
| `match-parts` | Drag laptop part labels to positions | `instructions` |
| `open-all-apps` | Open every dock app | `instructions` |

### Step 5: Verify

After creating the JSON files, run:
```sh
npm run build
```
If it builds without errors, the lessons are valid. Visit `/lessons` to see them in the catalog.

### Example: Adding a 3-lesson module

Three files create a module called "What is the Internet?" inside "Unit 3: The Internet":

**`content/lessons/internet-intro.json`** — order 300, `type: "none"` (explanation only)
**`content/lessons/internet-wifi.json`** — order 301, `type: "none"` (explanation only)
**`content/lessons/internet-practice.json`** — order 302, `type: "type-text"` (type "wifi" to practice)

All three share `"unit": "Unit 3: The Internet"` and `"module": "What is the Internet?"`. They'll appear as a 3-step module at `/lessons/what-is-the-internet`.

## Adding a New Playground Type

This requires code changes — do not attempt with Haiku.

1. Add to the `PlaygroundTask` union in `lib/lessons.ts`
2. Create a component in `components/Playground/`
3. Add a checker in `TaskChecker.ts`
4. Wire it into `LessonPlaygroundPane.tsx`
