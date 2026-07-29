# LearnAComputer

Basic computer literacy course for absolute beginners, taught step-by-step with interactive playgrounds.

## Stack

- **Next.js 15** App Router, React 19, TypeScript, Tailwind CSS 3
- **No database, no accounts, no cookies, no analytics** — progress lives in `localStorage` only
- Deployed via Vercel

## Commands

```sh
npm run dev          # dev server on :3000
# /dev/mount-check   # dev-only page: mounts every lesson's activity and reports throws
# /dev/solve-check   # dev-only page: PLAYS every guided lesson to the end (see docs/SOLVE_CHECK.md)
npm run solve-check  # headless: PLAYS all 145 playable activities to the end (canonical)
npm run mission-check # headless: PLAYS all 18 real-world missions on a real machine
npm run desktop-check # proves the practice desktop holds several windows at once
npm run demo-check   # proves every page on the sales demo path loads clean
npm run hostile-check # the buyer with crossed arms: what a skeptic finds off the demo path
npm run recovery-check # deliberately FAILS a lesson, then proves the learner can carry on
npm run stray-check   # does the WRONG thing on purpose; proves nobody is left with no way forward
npm run build        # production build (rm -rf .next first if switching from dev)
npm run lint         # eslint
npx tsc --noEmit     # type-check without emitting
python3 scripts/check-lessons.py  # lesson validation (targets, capitalization, reading level)
python3 scripts/check-actions.py  # every action a sim advertises must be one a learner can finish
python3 scripts/spelling-check.py # one dialect: American English, plus a typo list
python3 scripts/pitch-check.py    # does the sales material describe the product that exists?
python3 scripts/audit-order.py    # curriculum-shape report: order, module size, dependencies
node scripts/contrast-check.mjs   # WCAG AA contrast over the pages learners read, both themes
npm run ring-check -- <slug>      # is the highlighted control actually ON SCREEN in that lesson?
```

All the browser checks need `npm run dev` running on :3000 first.

After touching any sim component or lesson steps, run **solve-check as well as
mount-check** — mounting proves an activity renders; solving proves a learner can
finish it, and the two unfinishable-lesson bugs were invisible to everything else.
`solve-check` is currently green at **145/145**; keep it there. It grew from 132 on
2026-07-29 when `solveStepless` taught it the nine activity types that have no
step list. **One** stepless type is left — `keyboard-shortcut`, which needs a
real clipboard — and it is named in `docs/GOAL_STATE.md`.

After touching `RealWorldMission`, `RealWorldChecks` or any `real-world` lesson,
run **mission-check** — solve-check exempts all 18 missions, so nothing else
looks at them. It plays the learner's *computer*: real PNGs with real
dimensions and real PDFs handed to the page's own file input, genuine paste
events and key combinations, and CDP driving the screen, the window and the
device pixel ratio apart from each other. Keep it green at **18/18**.

After touching `FakeDesktop`, `DraggableWindow` or `AppBody`, also run
**desktop-check** — no guided lesson opens two apps at once, so solve-check
cannot see a broken window stack, and multi-window is what Unit 1 teaches.

**Every harness here except one does the moderate, correct thing.** solve-check
performs exactly the current step's action and nothing else, so it has never
clicked a control the lesson did not ask for. That blind spot shipped a real
bug: on Unit 1's window lesson, a learner who clicked the red ✕ at step 1 got an
empty desktop, no glow, and a banner naming a window that was gone.

**`npm run stray-check` is the one that does the wrong thing.** Two modes:

- default — closes the window each guided step depends on, and checks *the
  learner still has a way forward*: a ring to follow, or words saying what
  happened. Never nothing, because nothing is where a beginner concludes they
  broke it and stops. Run after touching any sim's open/close/window state.
- `STRAY=double` — double-clicks its way through the lesson (Unit 1 **teaches**
  double-clicking, so learners double-click everything afterwards) and checks
  that one gesture never advances two steps. What protects this is the 150ms
  same-step guard in `useStepRunner.completeStep`; do not remove it.

It clicks through `DesktopLaunch`'s "open the app" gate first — without that it
silently skipped most of the course, reporting a coverage number that was not
true (see `docs/SAME_ICON_AUDIT.md` § *Round eleven*).

Both negative controls are in the file header and both have been watched to
fail — and re-watched after any change to what the check can *see*, because
widening its vision is exactly the edit that can blind it. Note the trap recorded in `docs/SAME_ICON_AUDIT.md` § *Round ten*: the
first draft of the double-click mode reported all-clear across 36 lessons while
only ever clicking each lesson's *first* control. **When a new check comes back
clean, go find what it should have caught before believing it.**

After touching the failure channel — `onResult(false, …)`, the Try again card,
or any sim that can report failure — run **recovery-check**. Solve-check only
ever does the right thing, so a broken recovery looks perfectly healthy to
every other harness while stranding the one learner who most needs help: the
one who just made the mistake the lesson is about.

After touching `SimulatorFrame`'s reveal, any window's `initial` height, or a
sim's scrolling layout, run **ring-check on the affected lesson**
(`npm run ring-check -- <slug>`). It asks the one question no other harness
can — *is the pulsing ring on screen?* — because the solver reaches controls
through the DOM and never has to see them. Two shipped bugs put a step's own
target just below the fold and every check stayed green.

**Its whole-course mode (`npm run ring-check`) is advisory and always exits 0.**
It gave 8, 6 and 10 findings on three consecutive runs of identical code: the
sims are almost never at rest during an automated run, so a ring is legitimately
out of view for a frame here and there. Treat those as leads and confirm each
one filtered to its own slug, which is repeatable. Do not add it to a gate list
and do not tune it until the number looks green — see `docs/SAME_ICON_AUDIT.md`
§ *Round four* for the four mechanisms already tried.

**Whenever a capability is removed, run `pitch-check` in the same hour.**
Deleting a feature is not done when the code is gone: accounts came out on
2026-07-28 and the sales material still told callers to promise sign-in in five
places — including the section headed *"never claim what isn't shipped"*, which
listed accounts under *Shipped and demo-safe* and contradicted itself eighteen
lines later. No other harness reads prose. This one fails when
`docs/SALES_PLAYBOOK.md`, `COLD_CALL_KIT.md`, `DEMO_PRIYA_ELDER_CARE.md` or
`IMPLEMENTATION_GUIDE.md` promises something the code no longer contains, points
at a deleted doc, or quotes a lesson/unit/mission count that does not match
`content/lessons/`. Those documents may still *say* a feature is gone — a
removal note is allowed and expected.

Before any demo, and after touching site chrome or any page outside a lesson,
run **hostile-check**. Every other harness proves the product works when it is
used correctly; this one asks what a buyer finds who is hunting for a reason to
say no — console errors, sideways scrolling, a page with no heading, a mistyped
URL, a keyboard user with no visible focus. See `docs/HOSTILE_BUYER_AUDIT.md`.

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
  error.tsx, not-found.tsx # Friendly failure pages — never a blank screen or a bare 404
  dev/mount-check/        # Dev-only activity mount harness
  dev/solve-check/        # Dev-only completability harness (auto-plays every guided lesson)
  dev/mission-check/      # Dev-only: mounts one real-world mission for scripts/mission-check.mjs
  dev/stray-check/        # Dev-only: mounts one activity under script control, for scripts/stray-check.mjs

components/
  MountCheck.tsx           # Dev-only harness behind /dev/mount-check
  SolveCheck.tsx           # Dev-only harness behind /dev/solve-check (drives lib/solve/)
  StrayCheck.tsx           # Dev-only harness behind /dev/stray-check — mounts one activity, script-driven
  ActivityErrorBoundary.tsx # One sim crash never blanks the lesson page
  StorageNotice.tsx        # One calm banner when localStorage cannot save
  CookieNotice.tsx         # Disclosure, not consent: no cookies exist, so there is nothing to accept
  DrDigital.tsx            # Speech-bubble mascot (intro / success / hint moods)
  DrDigitalAvatar.tsx      # Reusable avatar image
  HomeGreeting.tsx         # Client component for progress-aware homepage message
  DashboardView.tsx        # Client component for the dashboard
  PageTransition.tsx       # Fade/slide route transitions
  LessonModuleRunner.tsx   # Steps through sub-lessons, gates on playground completion
  LessonPlaygroundPane.tsx # Right pane — Start Activity / Skip

  Playground/
    TaskChecker.ts         # Pure validation functions for every task type
    useStepRunner.ts       # Step/objective state shared by every guided sim (guided + assessment modes)
    Icons.tsx              # Central SVG icon library (~70 icons, stroke style, currentColor)
    SimulatorFrame.tsx     # Shared frame: dark banner, progress bar, celebration overlay
    SimThemeContext.tsx     # Sim-wide theme state (dark mode, brightness, text scale, etc.)
    DesktopLaunch.tsx      # Desktop-first wrapper: shows FakeDesktop, highlights dock icon
    TypeTextTask.tsx        # "Type this text" activity
    TextEditorTask.tsx      # Edit pre-filled text (delete/fix mistakes)
    EditFileTask.tsx        # Edit a file inside FilesApp with save validation
    CopyPasteTask.tsx       # Copy-paste keyboard shortcut task
    ComposeEmailTask.tsx    # Write and send an email in MailApp
    ShapeClickGame.tsx      # Click falling shapes to reach a target score
    MatchPartsTask.tsx      # Drag-match laptop parts to labels
    OpenAllAppsTask.tsx     # Open all dock apps on FakeDesktop
    BrowserSimulator.tsx    # Shared browser chrome (tabs, address bar, lock icon)
    GuidedBrowserTask.tsx   # Guided browser sim (navigate, search, tabs, cookies, etc.)
    GuidedFilesTask.tsx     # Guided file manager sim (open, move, rename, etc.)
    GuidedMessagingTask.tsx # Guided messaging + video calls sim
    GuidedEmailTask.tsx     # Guided email sim (compose, reply, spam, attach, etc.)
    GuidedPhotosTask.tsx    # Guided photos sim (edit, share, albums, etc.)
    GuidedAppStoreTask.tsx  # Guided app store sim (search, install, permissions, etc.)
    GuidedSettingsTask.tsx  # Guided settings sim (toggles, sliders, storage, etc.)
    GuidedSecurityTask.tsx  # Guided security sim (passwords, 2FA, phishing, etc.)
    GuidedTroubleshootingTask.tsx # Guided troubleshooting (frozen apps, WiFi, errors)
    GuidedCalendarTask.tsx  # Guided calendar + reminders sim
    GuidedDesktopTask.tsx   # Guided window management (move, resize, minimize, etc.)
    KeyboardNavTask.tsx     # Keyboard navigation game (Tab, Enter, arrow keys)
    RealWorldMission.tsx    # Missions on the learner's own computer + RealWorldChecks.tsx
    DesktopBrowserRightClickTask.tsx
    DesktopBrowserScrollTask.tsx
    DesktopBrowserZoomTask.tsx
    DesktopFileExplorerTask.tsx
    FakeDesktop.tsx         # Desktop environment: 10-app dock, menu bar, battery, wifi, clock

    Desktop/               # Apps that run inside FakeDesktop
      AppWindow.tsx         # Draggable/closeable window frame
      AppBody.tsx           # dock app id -> the real app component (one answer, every dock)
      BrowserApp.tsx        # In-desktop web browser
      FilesApp.tsx          # File manager with sidebar + preview
      MailApp.tsx           # Email client
      MessagingApp.tsx      # Chat app (persistent threads via localStorage)
      NotesApp.tsx           # Two-pane notes editor
      SettingsApp.tsx        # Settings panels (appearance, display, accessibility, etc.)
      filesData.ts          # Shared file/folder tree used by FilesApp and EditFileTask

content/lessons/           # 150+ lesson JSON files (see Lesson schema below)

lib/
  lessons.ts               # Reads lesson JSON, groups by unit/module, module routing
  progress.ts              # localStorage read/write for completed slugs (fires lac-progress-changed)
  chat.ts                  # localStorage read/write for messaging threads
  simState.ts              # localStorage read/write for persistent sim state (lac-sim)
  safeStorage.ts           # localStorage wrapper all three stores go through: in-memory
                           # fallback when writes fail (private browsing, locked-down
                           # machines) + one lac-storage-degraded event for StorageNotice
  solve/                   # Dev-only auto-solver behind /dev/solve-check (gestures + loop)

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
  /** Warning shown above the Dr. Digital bubble — for keys/actions the learner must NOT press during this lesson. */
  warning?: string;
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
| `drag-sort-files` | DragSortTask | Click-to-place items into category buckets |
| `spot-the-fake` | SpotTheFakeTask | Click the scam/fake among 2–3 item cards |
| `url-navigator` | UrlNavigatorTask | Type a URL into a fake browser address bar |
| `guided-files` | GuidedFilesTask | Guided file manager: open/create/rename/move/search/delete/restore/save |
| `guided-browser` | GuidedBrowserTask | Guided browser: navigate/search/tabs/cookies/popups/reload/zoom/downloads |
| `guided-messaging` | GuidedMessagingTask | Guided messaging + video calls: contacts, messages, reactions, emoji picker, photos, calls, group chats |
| `guided-email` | GuidedEmailTask | Guided email: compose/reply/forward, spam, attach files, CC/BCC, unsend |
| `guided-photos` | GuidedPhotosTask | Guided photos: edit (crop/rotate/brightness/contrast/filters), share, albums |
| `guided-app-store` | GuidedAppStoreTask | Guided app store: search, install, permissions, update, delete |
| `guided-settings` | GuidedSettingsTask | Guided settings: toggle, slider, storage cleanup, section navigation, Bluetooth device connect/disconnect |
| `guided-security` | GuidedSecurityTask | Guided security: passwords, 2FA, phishing, passkeys, password reset |
| `guided-troubleshooting` | GuidedTroubleshootingTask | Guided troubleshooting: frozen apps, WiFi, error codes, support |
| `guided-calendar` | GuidedCalendarTask | Guided calendar + reminders: create events, set times, reminders |
| `guided-desktop` | GuidedDesktopTask | Guided window management (move, resize, minimize, maximize, close) + dock app open/close + menu-bar clock/WiFi/battery panels |
| `keyboard-nav-game` | KeyboardNavTask | Keyboard navigation game (Tab, Enter, arrow keys) |
| `notes-shortcut` | GuidedNotesTask | Notes editor with shortcut detection (bold, italic, underline, select-all, copy, cut, paste, undo, redo) |
| `real-world` | RealWorldMission | A mission on the learner's **own** computer, checked for real (see below) |

**Playground philosophy:** activities should be *hands-on and guided* — the learner clicks, types, and manipulates a realistic simulation with each step highlighted (pulsing yellow). **Never add a quiz type** — quizzes test recognition, not skill. The old `multiple-choice` type has been deleted along with its component. `guided-files` is the reference pattern for a guided simulator.

#### `guided-files` schema

A self-contained simulated file manager. The JSON provides a `goal` and an array of `steps`; each step highlights exactly what to click next and only advances when done. The virtual filesystem (Home + Documents/Pictures/Downloads/Trash, plus a standard set of files) is hardcoded in `GuidedFilesTask.tsx`.

```json
"playgroundTask": {
  "type": "guided-files",
  "goal": "Short summary shown when finished",
  "steps": [
    { "say": "Double-click GroceryList.txt to open it.", "action": "open-file", "target": "GroceryList.txt" },
    { "say": "Click Documents in the sidebar.", "action": "go-to", "target": "Documents" },
    { "say": "Click New Folder and name it Taxes.", "action": "new-folder", "value": "Taxes" },
    { "say": "Rename the messy file.", "action": "rename", "target": "old.jpg", "value": "Beach-2025.jpg" },
    { "say": "Drag Budget.xlsx into Documents.", "action": "move", "target": "Budget.xlsx", "into": "Documents" },
    { "say": "Search for budget.", "action": "search", "value": "budget", "reveal": "Budget.xlsx" },
    { "say": "Delete it.", "action": "delete", "target": "TaxReturn.pdf" },
    { "say": "Put it back.", "action": "restore", "target": "TaxReturn.pdf" },
    { "say": "Save your note in Documents.", "action": "save", "value": "shopping-list", "into": "Documents" }
  ]
}
```

Actions: `open-file`, `open-folder`, `go-to` (sidebar), `new-folder` (`value`), `rename` (`target`+`value`), `move` (`target`+`into`, drag or click-file-then-folder), `search` (`value`+`reveal`), `delete` (`target`), `restore` (`target`), `save` (`value`+`into`). Available folders for `move`/`save`/`go-to`: Documents, Pictures, Downloads (and Home/Trash for `go-to`).

#### `guided-browser` schema

A self-contained simulated browser. The JSON provides a `goal` and `steps`; each step highlights the exact control and only advances when the correct action is done. The available websites live hardcoded in `GuidedBrowserTask.tsx` — reference their `url` in `navigate` steps:

| id | url | Special flags | Purpose |
|---|---|---|---|
| `newtab` | (new tab page) | — | Default / new tab |
| `shop` | `shop.example` | ads | Online shop |
| `google` | `google.com` | — | Search engine |
| `wiki` | `wikipedia.org` | — | Encyclopedia |
| `weather` | `weather.com` | cookie, ads | Weather with cookie banner |
| `news` | `dailynews.example` | — | News site with fine print |
| `recipebox` | `recipebox.example` | download | Recipe site with PDF download |
| `freegames` | `freegames.example` | popup, insecure | Scam site with popup |
| `library` | `citylibrary.example` | — | Library catalog + hours |
| `transit` | `citytransit.example` | — | Bus timetable — good for zoom/scroll |
| `garden` | `gardeningtips.example` | — | Long article — reading list / scroll |
| `petnews` | `petnews.example` | — | Pet news |
| `bank` | `firstbank.example` | secure | Bank — secure-site lessons |
| `bookshop` | `bookshop.example` | ads | Second shop — history lessons |
| `pickacolor` | `pickacolor.example` | — | Tab/keyboard navigation activity |

Entering an unknown URL shows a friendly "not in the practice browser" fallback page. Clicking an ad in `mode: "guided"` shows a nudge banner; in `mode: "assessment"` it reports failure.

```json
"playgroundTask": {
  "type": "guided-browser",
  "goal": "Short summary shown when finished",
  "mode": "guided",
  "initialDownloads": ["SystemCleaner.exe"],
  "steps": [
    { "say": "Type shop.example and press Enter.", "action": "navigate", "url": "shop.example" },
    { "say": "Search for something.", "action": "search", "query": "apple pie", "reveal": "Recipe Box" },
    { "say": "Open Recipe Box from the results.", "action": "open-result", "title": "Recipe Box" },
    { "say": "Open a new tab.", "action": "new-tab" },
    { "say": "Close the Google tab.", "action": "close-tab", "title": "Google" },
    { "say": "Open a new window.", "action": "new-window" },
    { "say": "Bookmark this page.", "action": "bookmark" },
    { "say": "Save to reading list.", "action": "reading-list-add" },
    { "say": "Reopen Shop from History.", "action": "history-visit", "title": "Shop" },
    { "say": "Download the file.", "action": "download" },
    { "say": "Open the Downloads panel.", "action": "open-downloads" },
    { "say": "Delete the suspicious file.", "action": "delete-download", "file": "SystemCleaner.exe" },
    { "say": "Open the recipe PDF.", "action": "open-download", "file": "ApplePieRecipe.pdf" },
    { "say": "Check the lock icon.", "action": "lock-click" },
    { "say": "Decline the cookie banner.", "action": "cookie-decline" },
    { "say": "Close the scam popup.", "action": "close-popup" },
    { "say": "Reload the page.", "action": "reload" },
    { "say": "Zoom in twice.", "action": "zoom-in" },
    { "say": "Use Tab and Enter to complete the color sequence.", "action": "tab-sequence", "page": "pickacolor.example" }
  ]
}
```

`mode` defaults to `"guided"`. Set `"assessment"` for objectives-only (no step-by-step highlighting). `initialDownloads` seeds the Downloads list on mount. Pages with special behavior: `weather.com` shows a cookie banner and ads, `freegames.example` is "Not Secure" and throws a scam popup, `recipebox.example` has a download button, `news.example` has fine print for zoom lessons. Cookie/popup/download steps must be preceded by a `navigate` to the matching page. Clicking **CLEAN NOW** on the popup fails the lesson with a message (teaches consequences). The `reload` action only completes when it fixes a broken page (pages navigated before a reload step render broken).

**`open-download` action**: requires `file` field (filename string, e.g. `"ApplePieRecipe.pdf"`). Only PDF files show an Open button in the Downloads panel. Clicking it opens an in-browser PDF viewer window showing the Apple Pie Recipe (title, ingredients, numbered steps, page 1 of 2, working zoom controls). The step completes when the matching file is opened. Must be preceded by `download` and `open-downloads` steps.

**`tab-sequence` action**: requires the learner to navigate to `pickacolor.example` first (preceding `navigate` step). The page shows three focusable color circles (red, green, blue) and a 10-item sequence tracker. The learner uses Tab/Shift+Tab to move focus and Enter (or click) to select. Wrong picks show a nudge; completing all 10 items in order completes the step. Only `pickacolor.example` supports this action.

#### `guided-messaging` schema

A self-contained simulated messaging and video calling app. The JSON provides a `goal` and `steps`; each step highlights the exact control and only advances when the correct action is done. Five contacts are hardcoded: Alex, Jordan, Sam, Grandma, Doggo — each with preset conversation threads.

```json
"playgroundTask": {
  "type": "guided-messaging",
  "goal": "Short summary shown when finished",
  "steps": [
    { "say": "Click on Alex to open their conversation.", "action": "select-contact", "target": "alex" },
    { "say": "Type a message and send it.", "action": "send-message", "value": "Hello!" },
    { "say": "React to their message.", "action": "add-reaction" },
    { "say": "Click the smiley button to open the emoji picker.", "action": "pick-emoji" },
    { "say": "Send a photo.", "action": "attach-photo" },
    { "say": "Start a video call.", "action": "start-call" },
    { "say": "Mute your microphone.", "action": "mute" },
    { "say": "Turn off your camera.", "action": "camera-off" },
    { "say": "End the call.", "action": "end-call" },
    { "say": "Click the + button next to Contacts to start a group.", "action": "create-group" },
    { "say": "Check the box next to Alex.", "action": "add-to-group", "target": "alex" },
    { "say": "Click Start Chat then send a message.", "action": "send-group-message", "value": "Hey everyone" }
  ]
}
```

Actions: `select-contact` (`target`: lowercase contact name — alex/jordan/sam/grandma/doggo), `send-message` (2-phase: focus input then send; `value` is the required text), `add-reaction` (2-phase: double-click/long-press message then pick emoji), `pick-emoji` (2-phase: click smiley button then pick emoji from picker; inserts emoji into the draft), `attach-photo` (2-phase: click + button then pick photo from grid), `start-call`, `mute`, `camera-off`, `end-call`. Video call actions require an active call. Reactions require double-click or press-and-hold (never single click).

**Group chat actions**: `create-group` (click the + button in the contacts header → contact picker opens), `add-to-group` (`target`: lowercase contact id — checks that contact in the picker; can be used multiple times to add multiple people), `send-group-message` (2-phase: if group picker is still open, highlight "Start Chat" button first; after group is created, type + send; `value` is the required message text, empty string accepts anything). Group messages show each sender's avatar and name.

#### `guided-email` schema

A simulated email client with Inbox, Sent, Spam, Archive folders. The JSON provides a `goal` and `steps`.

**Optional `seedDraft`**: seed a pre-filled draft in the Drafts folder on mount. The learner navigates to Drafts, opens the draft (matched by subject), edits the body, and sends. Use this when the lesson scenario involves fixing or completing a draft rather than composing from scratch. The draft is removed from the list when opened (replaced by the compose view).

```json
"playgroundTask": {
  "type": "guided-email",
  "goal": "Fix the messy draft and send it",
  "mode": "guided",
  "seedDraft": {
    "to": "sarah@example.com",
    "subject": "Team meeting reminder",
    "body": "hey sarah\n\nthe meeting meeting is is on thursday..."
  },
  "steps": [
    { "say": "Click Drafts in the sidebar.", "action": "go-to-folder", "target": "Drafts" },
    { "say": "Click the draft to open it for editing.", "action": "open-email", "target": "Team meeting reminder" },
    { "say": "Fix the body and click outside when done.", "action": "set-body", "value": "meeting is on Thursday" },
    { "say": "Send it.", "action": "send" }
  ]
}
```

Without `seedDraft`, the task starts at the Inbox as normal:

```json
"playgroundTask": {
  "type": "guided-email",
  "goal": "Reply to Mom and archive the Amazon email",
  "mode": "guided",
  "steps": [
    { "say": "Open the email from Mom.", "action": "open-email", "target": "Mom" },
    { "say": "Click Reply.", "action": "reply" },
    { "say": "Type your reply.", "action": "set-body", "value": "Thanks Mom!" },
    { "say": "Send it.", "action": "send" },
    { "say": "Mark the scam as spam.", "action": "mark-spam", "target": "Prince" },
    { "say": "Go to Spam.", "action": "go-to-folder", "target": "Spam" },
    { "say": "That email was not spam — move it back.", "action": "unspam", "target": "Newsletter" },
    { "say": "Attach the vacation photo.", "action": "attach", "target": "VacationPhoto.png" },
    { "say": "Archive the Amazon email.", "action": "archive", "target": "Amazon" }
  ]
}
```

**Seeding an inbox from a host component** (not from lesson JSON): `GuidedEmailTask`
also takes `seedInbox` — extra Inbox messages, each optionally carrying an
`actionLabel` that renders as a button at the foot of the body, i.e. a link inside
an email. Pair it with `highlightEmail` (pulse a row by subject),
`highlightEmailAction` (pulse that link), and the `onOpenEmail` / `onEmailAction`
callbacks. This is how Unit 11's password-reset scenario puts a bank's reset email
in the **real** Mail app instead of drawing its own; use it rather than hand-rolling
an inbox anywhere else.

Actions: `open-email` (`target`: the email's **subject**, in every folder), `compose`, `set-to`/`set-cc`/`set-bcc`/`set-subject`/`set-body` (`value`), `attach` (2-phase: click paperclip then pick file from picker; `target` is filename), `send`, `reply`, `forward`, `delete`, `mark-spam`, `archive` (each takes an optional `target` subject — without one, any open email satisfies the step), `go-to-folder` (`target`: Inbox/Sent/Spam/Archive), `unspam` (in Spam folder), `move-to-inbox` (in Archive). After sending a reply, a "Sent — Undo" pill appears with a 30-second countdown.

#### `guided-photos` schema

A simulated photo library with real images, editing tools, albums, and sharing.

```json
"playgroundTask": {
  "type": "guided-photos",
  "goal": "Edit and share a photo",
  "steps": [
    { "say": "Select Bird in Garden.", "action": "select-photo", "target": "Bird in Garden" },
    { "say": "Increase brightness.", "action": "adjust-brightness", "value": "90-110" },
    { "say": "Adjust contrast.", "action": "adjust-contrast", "value": "90-110" },
    { "say": "Rotate the photo.", "action": "rotate" },
    { "say": "Crop to Square.", "action": "crop", "value": "Square" },
    { "say": "Undo all changes.", "action": "revert" },
    { "say": "Share via Messages to Alex.", "action": "share", "via": "messages", "to": "Alex" },
    { "say": "Create an album called Vacation.", "action": "create-album", "value": "Vacation" },
    { "say": "Add this photo to Vacation.", "action": "add-to-album", "value": "Vacation" },
    { "say": "Search for dog.", "action": "search", "value": "dog" },
    { "say": "Delete the cat photo.", "action": "delete", "target": "Orange Cat" },
    { "say": "Recover it.", "action": "recover", "target": "Orange Cat" }
  ]
}
```

Actions: `select-photo` (`target`), `favorite`, `unfavorite`, `delete` (`target`), `recover` (`target`, in Recently Deleted), `create-album` (`value`), `add-to-album` (`value`), `go-to-album` (`target`), `crop` (`value`: Original/Square/Wide), `rotate`, `adjust-brightness` (`value`: "min-max" range), `adjust-contrast` (`value`: range), `apply-filter` (`value`: filter name), `revert`, `share` (`via`: mail/messages, `to`: contact name), `search` (`value`).

#### `guided-app-store` schema

A simulated app marketplace with 12 apps across 4 categories, permissions, and persistence.

```json
"playgroundTask": {
  "type": "guided-app-store",
  "goal": "Install an app and manage permissions",
  "mode": "guided",
  "steps": [
    { "say": "Search for weather.", "action": "search", "value": "weather" },
    { "say": "Select WeatherNow.", "action": "select-app", "target": "WeatherNow" },
    { "say": "Install it.", "action": "install" },
    { "say": "Allow permissions.", "action": "allow-permission" },
    { "say": "Go to My Apps.", "action": "go-to-installed" },
    { "say": "Update the app.", "action": "update-app", "target": "WeatherNow" },
    { "say": "Delete Puzzle Quest.", "action": "delete-app", "target": "Puzzle Quest" }
  ]
}
```

Actions: `search` (`value`), `select-app` (`target`), `install`, `allow-permission`, `deny-permission` (cancels install), `go-to-installed`, `go-to-store`, `update-app` (`target`), `delete-app` (`target`), `go-to-category` (`target`). Installed apps persist across lessons under the `apps` sub-key of `lac-sim` (via `lib/simState.ts`), so Reset all progress uninstalls them.

#### `guided-settings` schema

Wraps `SettingsApp` inside `FakeDesktop`. Settings changes are live — dark mode reskins the desktop, brightness dims the screen, Night Shift tints orange, text scale grows the UI.

```json
"playgroundTask": {
  "type": "guided-settings",
  "goal": "Customize your display settings",
  "steps": [
    { "say": "Open the Appearance section.", "action": "open-section", "target": "Appearance" },
    { "say": "Turn on Dark Mode.", "action": "toggle", "target": "Dark Mode" },
    { "say": "Open Display.", "action": "open-section", "target": "Display" },
    { "say": "Set brightness between 40 and 60.", "action": "slider", "target": "Brightness", "min": 40, "max": 60 },
    { "say": "Open Storage.", "action": "open-section", "target": "Storage" },
    { "say": "Delete Old Videos.", "action": "delete-item", "target": "Old Videos" },
    { "say": "Empty the trash.", "action": "empty-trash" }
  ]
}
```

Actions: `open-section` (`target`: the **lowercase** section id — `appearance`, `display`, `accessibility`, `wifi`, `bluetooth`, `notifications`, `storage`, `privacy`, `about`), `toggle` (`target`: kebab-case setting id such as `dark-mode`, `night-shift`, `bold-text`, `do-not-disturb`), `slider` (`target`: `brightness` or `text-size`, plus a `min`/`max` range), `delete-item` (`target`), `empty-trash`, `select-device` (`target`: device name — connects the device), `disconnect-device` (`target`: device name — disconnects the device).

#### `guided-security` schema

Multi-section security simulator: passwords (live strength meter), login, 2FA, phishing verdict, passkeys.

**`chrome` field** — controls which desktop app wraps the task (default: `"browser"`):

| `chrome` | Wrapper | Use when |
|---|---|---|
| `"browser"` | `DesktopLaunch app="browser"` | Login flows, phishing in browser context |
| `"mail"` | `DesktopLaunch app="mail"` | Phishing links arriving via email |
| `"messages"` | `DesktopLaunch app="messages"` | Smishing links arriving via text |
| `"settings"` | `DesktopLaunch app="settings"` | Privacy / account settings |
| `"bare"` | No DesktopLaunch | Password tester, standalone tools |

After a successful `login`, `verify-2fa`, or `use-passkey`, the sim transitions to a `LoggedInPanel` showing the account name, plan, and security status. A Sign Out button returns to the login form.

The **phishing section follows `chrome`**: with `"mail"` it renders a real inbox (sender, subject, timestamp, reading pane); with `"messages"` a text thread. In both, `inspect-link` means *opening the message*, and the link sits inline in the body — clicking it reveals the true address in a preview bar before the Safe/Dangerous buttons appear. Any other `chrome` value keeps the same two-pane layout without subject lines.

```json
"playgroundTask": {
  "type": "guided-security",
  "chrome": "bare",
  "goal": "Create a strong password and log in securely",
  "mode": "guided",
  "steps": [
    { "say": "Type a strong password.", "action": "type-password", "minStrength": 4 },
    { "say": "Type your username.", "action": "type-username", "value": "drdigital" },
    { "say": "Log in.", "action": "login" },
    { "say": "Enter the 2FA code.", "action": "enter-2fa-code" },
    { "say": "Verify.", "action": "verify-2fa" },
    { "say": "Click Forgot Password.", "action": "forgot-link" },
    { "say": "Open the reset email.", "action": "open-reset-email" },
    { "say": "Click the reset link.", "action": "click-reset-link" },
    { "say": "Reveal the URL.", "action": "inspect-link", "target": "Verify your account" },
    { "say": "Mark it Dangerous.", "action": "mark-dangerous", "target": "Verify your account" },
    { "say": "Mark it Safe.", "action": "mark-safe", "target": "View your order" },
    { "say": "Use your passkey.", "action": "use-passkey" }
  ]
}
```

Actions: `type-password` (`minStrength`: 1–4, auto-completes when met), `type-username` (`value`), `type-login-password`, `login`, `use-passkey`, `forgot-link`, `open-reset-email`, `click-reset-link`, `enter-2fa-code`, `verify-2fa`, `inspect-link` (`target`), `mark-safe` (`target`), `mark-dangerous` (`target`), `toggle-setting`, `go-to-section`. Wrong phishing verdicts show immediate red feedback with an explanation; the item stays active for retry.

#### `guided-troubleshooting` schema

Scenarios for common computer problems. Each lesson specifies a `scenario` that determines the desktop state.

```json
"playgroundTask": {
  "type": "guided-troubleshooting",
  "goal": "Force quit the frozen app and restart it",
  "scenario": "frozen-notes",
  "steps": [
    { "say": "Click the frozen Notes window.", "action": "click-frozen" },
    { "say": "Open the system menu.", "action": "open-force-quit" },
    { "say": "Force Quit.", "action": "force-quit", "target": "Notes" },
    { "say": "Reopen Notes from the dock.", "action": "restart-app", "target": "notes" }
  ]
}
```

`scenario` values: `frozen-notes`, `frozen-browser`, `no-wifi`, `error-code`, `error-restart`, `public-wifi`, `password-reset`. The mode is **inferred** from the step actions — the `scenario` field is a free-text description for the lesson author only. The frozen app's name comes from the `force-quit` step's `target`. Actions: `read-error`, `click-frozen`, `open-force-quit`, `force-quit` (`target`), `restart-app` (`target`), `open-wifi-panel`, `toggle-wifi`, `reconnect-wifi`, `forget-network`, `copy-code`, `open-browser`, `paste-code`, `submit-support`, `dismiss-error`, `open-settings`, `click-restart`, `confirm-restart`, `type-in-app`, `open-app-market`, `go-to-my-apps`, `delete-broken-app` (`target`), `go-to-store-tab`, `reinstall-app` (`target`), `join-network` (`target`), `captive-portal-continue`, `open-settings-privacy`, `toggle-privacy-tracking`, `click-forgot-link`, `open-mail-from-dock`, `open-reset-email`, `click-reset-link`, `type-new-password` (optional `value`), `confirm-login`.

The **`public-wifi` scenario** (inferred from `join-network` or `captive-portal-continue`): the desktop boots offline, the menu-bar WiFi list offers café networks, joining one shows "Connecting…" then drops the learner on a captive-portal sign-in page, and Continue puts them online. Settings in the dock then opens a Privacy panel with a cross-site-tracking toggle. Steps use: `open-wifi-panel`, `join-network`, `captive-portal-continue`, `open-settings-privacy`, `toggle-privacy-tracking`.

The **`password-reset` scenario** (inferred from `click-forgot-link` or `open-mail-from-dock`): starts on a bank login form in the browser, spans to the Mail app in the dock for the reset email, and the link in that email hands control back to the browser for the new-password form. Finishing shows a signed-in account panel. Steps use: `click-forgot-link`, `open-mail-from-dock`, `open-reset-email`, `click-reset-link`, `type-new-password`, `confirm-login`. Both halves are the **real** apps in a `DraggableWindow` — `GuidedEmailTask` seeded via `seedInbox`, and `BrowserSimulator` for the bank site. Closing either window is not a dead end: the desktop says so and the dock reopens it.

The `error-restart` scenario: on mount a system error dialog appears ("Something went wrong"); learner clicks OK to dismiss → clicks Settings in the dock → clicks Restart button → confirms in a dialog → 1.5s black-screen animation → success desktop. Steps use: `dismiss-error`, `open-settings`, `click-restart`, `confirm-restart`.

The **`app-reinstall` scenario** (inferred when steps include `open-app-market` or `reinstall-app`): shows a broken app in the dock → learner opens App Market → goes to My Apps → deletes the broken app → switches to Store → reinstalls → opens fresh from dock. Inline App Market shows My Apps and Store tabs. Steps use: `open-app-market`, `go-to-my-apps`, `delete-broken-app` (`target`: app name), `go-to-store-tab`, `reinstall-app` (`target`), `restart-app` (`target`).

The **`type-in-app`** action: used after `restart-app` in a frozen-mode lesson. Shows a text area inside the reopened app window; completes when the learner types anything. Confirms the app is alive after force-quit and reopen.

#### `guided-calendar` schema

Calendar and reminders simulator. Use `launchApp` to control which view opens first.

```json
"playgroundTask": {
  "type": "guided-calendar",
  "goal": "Create an event and a reminder",
  "launchApp": "calendar",
  "steps": [
    { "say": "Click on Wednesday.", "action": "select-day", "target": "Wednesday" },
    { "say": "Create a new event.", "action": "create-event" },
    { "say": "Name it Dentist.", "action": "set-title", "value": "Dentist" },
    { "say": "Set time to 2:00 PM.", "action": "set-time", "value": "2:00 PM" },
    { "say": "Save it.", "action": "save-event" },
    { "say": "Switch to Reminders.", "action": "switch-view", "target": "reminders" },
    { "say": "Create a reminder.", "action": "create-reminder" },
    { "say": "Type Buy groceries.", "action": "set-reminder-text", "value": "Buy groceries" },
    { "say": "Save it.", "action": "save-reminder" },
    { "say": "Mark it done.", "action": "complete-reminder", "target": "Buy groceries" }
  ]
}
```

`launchApp`: `"calendar"` (default) or `"reminders"` (opens on reminders view). Actions: `select-day` (`target`: a weekday name such as `Wednesday`, which matches every Wednesday in the month, or a date number such as `15`), `create-event`, `set-title` (`value`), `set-time` (`value`), `set-repeat` (`value`), `save-event`, `create-reminder`, `set-reminder-text` (`value`), `save-reminder`, `complete-reminder` (`target`), `switch-view` (`target`: calendar/reminders), `select-calendar` (`target`).

#### `guided-desktop` schema

Window management and desktop exploration. The learner practices moving, resizing, minimizing, and closing windows, opening apps from the dock, and clicking menu-bar panels.

```json
"playgroundTask": {
  "type": "guided-desktop",
  "goal": "Manage windows like a pro",
  "steps": [
    { "say": "Drag the window to move it.", "action": "move" },
    { "say": "Drag the corner to resize.", "action": "resize" },
    { "say": "Click the minus button to minimize.", "action": "minimize" },
    { "say": "Click the app in the dock to restore.", "action": "restore" },
    { "say": "Click the expand button to maximize.", "action": "maximize" },
    { "say": "Restore it from maximized.", "action": "restore-max" },
    { "say": "Close the window.", "action": "close" },
    { "say": "Click Notes in the dock to open it.", "action": "open-app", "target": "notes" },
    { "say": "Close it with the red X button.", "action": "close-app" },
    { "say": "Click the time in the top-right corner of the menu bar.", "action": "open-clock" },
    { "say": "Click the WiFi icon in the menu bar.", "action": "open-wifi-panel" },
    { "say": "Click the battery icon in the menu bar.", "action": "open-battery-panel" },
    { "say": "Read today's date, then close the panel.", "action": "close-panel" }
  ]
}
```

Actions: `move`, `resize`, `minimize`, `restore`, `maximize`, `restore-max`, `close`, `open-app` (`target`: dock app id — notes/browser/files/mail/settings/photos/app-market/calendar/reminders/messages), `close-app` (closes the open window), `open-clock` (opens the clock/date panel), `open-wifi-panel` (opens the WiFi panel), `open-battery-panel` (opens the battery percentage panel), `close-panel` (closes whichever menu-bar panel is open).

The menu bar shows a live clock (updates every 30s), battery percentage (Battery API with 72% fallback), and WiFi icon. Lessons using `open-app` or any `open-*` action start with no window visible (the learner opens everything themselves). Steps using `open-clock`/`open-wifi-panel`/`open-battery-panel` show a pulsing ring on the matching icon; `close-panel` shows a pulsing ring on the panel's close button.

#### `notes-shortcut` schema

A Notes editor (contentEditable div + formatting toolbar) that detects keyboard shortcuts. Each step waits for the exact shortcut before advancing. For formatting steps (`bold`/`italic`/`underline`), the matching toolbar button pulses yellow as a hint; clicking it shows a nudge to use the keyboard instead. The learner opens Notes from the dock first (via `DesktopLaunch app="notes"`).

```json
"playgroundTask": {
  "type": "notes-shortcut",
  "goal": "Use keyboard shortcuts to format text",
  "steps": [
    { "say": "Type a few words in the editor.", "action": "type", "value": "any" },
    { "say": "Press Ctrl+A (or Command+A) to select all.", "action": "select-all" },
    { "say": "Press Ctrl+B (or Command+B) to bold the text.", "action": "bold" },
    { "say": "Press Ctrl+I (or Command+I) to italicize.", "action": "italic" },
    { "say": "Press Ctrl+U (or Command+U) to underline.", "action": "underline" },
    { "say": "Press Ctrl+C (or Command+C) to copy.", "action": "copy" },
    { "say": "Press Ctrl+Z (or Command+Z) to undo.", "action": "undo" },
    { "say": "Press Ctrl+Shift+Z (or Command+Shift+Z) to redo.", "action": "redo" }
  ]
}
```

Actions: `type` (`value`: any non-empty string typed in the editor), `select-all`, `bold`, `italic`, `underline`, `copy`, `cut`, `paste`, `undo`, `redo`. All shortcut detection uses `checkNotesShortcut` in `TaskChecker.ts` (Cmd/Ctrl + key). For `type`, the step completes when the editor contains `value` anywhere in its text content; the literal `"any"` accepts any non-empty input.

#### `real-world` schema

The one activity that is **not** a simulation. Each unit ends with one: the
learner does the thing on their own machine and the page checks it, in the
browser, on their device. Nothing is ever uploaded — there is no endpoint to
upload to. Components: `RealWorldMission.tsx` (frame + step list) and
`RealWorldChecks.tsx` (one body per check kind).

```json
"playgroundTask": {
  "type": "real-world",
  "goal": "You sorted a real folder on your own computer",
  "download": { "file": "messy-folder.zip", "label": "Download the messy folder", "note": "15 files, about 16 KB." },
  "steps": [
    { "say": "Download the practice folder.", "check": "download", "detail": "It is a zip file…" },
    { "say": "Unzip it.", "check": "confirm", "detail": "Double-click it…" },
    { "say": "Show me the folder.", "check": "folder", "expect": {
        "folders": ["Photos", "Documents", "Money"],
        "placements": [{ "file": "beach-day.jpg", "in": "Photos" }],
        "absent": ["New Text Document.txt"],
        "renamed": { "was": "scan0001.pdf", "in": "Money", "rejectPattern": "^(scan|img|untitled)" },
        "noLooseFiles": true } }
  ]
}
```

Check kinds — every one reads something real:

| `check` | Verifies | Extra fields |
|---|---|---|
| `confirm` | nothing; says so on the card | — |
| `download` | the real file link was used | lesson-level `download` |
| `folder` | a picked folder's structure, file by file | `expect` (above) |
| `file` | a picked file | `file`: `kind` (`image`/`pdf`/`any`), `nameIs`, `recentMinutes`, `minBytes`, `orientation`, `rejectPattern` |
| `paste` | text arriving by paste, not typing | `minChars`, `notText` |
| `window-max` | window shrunk, then filling the screen | — |
| `zoom` | real browser zoom in, then back to 100% | — |
| `dark-mode` | `prefers-color-scheme` changing | — |
| `reduce-motion` | `prefers-reduced-motion` changing | — |
| `offline` / `online` | `navigator.onLine` | — |
| `type-answer` | a typed answer | `match`: `battery` / `hostname` / `browser` / `text`, plus `answers`, `tolerance` |
| `keys` | a real key combination | `keys`: e.g. `"ctrl+a"` (ctrl also accepts Command) |

Every step takes `say` (the banner line and checklist entry) and optional
`detail` (the explanation on the card).

**Authoring rules.** Downloads live in `public/missions/` and are generated by
`scripts/make-mission-folder.py` — never hand-place a binary there. Anything the
check compares by name (folder names, junk to delete, the file to rename, a
`nameIs` file) **must be stated in the brief or a step**; `scripts/check-lessons.py`
fails the build otherwise, and also fails when a `download.file` does not exist.
Live-measured checks must poll as well as listen for their event — two bugs came
from event-only reads. See `docs/REAL_WORLD_MISSIONS.md`.

### Progress

Stored in `localStorage` under key `"lac-progress"`:

```ts
{ version: 1, completedSlugs: string[] }
```

`LessonModuleRunner` calls `markComplete(slug)` when a sub-lesson's playground is finished.
Sub-lessons with `type: "none"` or `"placeholder"` auto-advance (no gate).

**There is no account and no server copy.** Progress lives in localStorage on the
learner's own device, never expires, and is theirs to erase from the Lessons
page. Accounts, Supabase and cross-device sync were removed on 2026-07-28: the
product collects nothing, sets no cookie, and contacts no third party. Keep it
that way — `hostile-check` fails the build if any route sets a cookie or calls
out to another host, because the whole privacy claim rests on it.

### Sim State

Persistent simulator state is stored in `localStorage` under key `"lac-sim"` — one JSON object with namespaced sub-keys, read and written only through `lib/simState.ts`. The App Market keeps installed apps under the `apps` sub-key. **Never write a `lac-*` key directly**: "Reset all progress" clears `lac-progress` and `lac-sim`, so anything stored under its own key survives a reset. That was a real bug — installed apps used to live under `lac-sim-apps` and reset never touched them.

### Chat threads

Stored in `localStorage` under key `"lac-chats"`. Schema: `Record<string, ChatMessage[]>`.

## Routing

Lessons are grouped into **modules** (one URL each): `/lessons/[moduleSlug]`.
`slugifyModule()` in `lib/lessons.ts` converts module names to URL slugs.
`LessonModuleRunner` renders all sub-lessons in a module as a stepper.
After completing a module, the user can navigate to the next module or back to `/lessons`.

## Key Patterns

- **Server vs Client**: Lesson data loading (`getAllLessons`, etc.) is server-only (uses `fs`). Progress, chat, and all playground components are `"use client"`.
- **No fullscreen**: there is no Fullscreen API anywhere in the product. It was removed, and its residue outlived it by a long way — two lessons still warned the learner *"Do not press Escape — it will exit the simulator"* about a session that no longer existed, one of them the lesson **teaching the Escape key**. If a warning tells a learner not to press something, verify the hazard is real before believing it; in a course whose pitch is "you cannot break this", a false warning costs more than the thing it warns about.
- **FakeDesktop**: A self-contained desktop environment with a **10-app dock**: Messages, Browser, Files, Mail, Settings, Photos, App Market, Calendar, Reminders, Notes. The menu bar has a working clock, battery indicator (real Battery API), WiFi panel, and optional Do Not Disturb indicator. The taskbar shows open-app indicators (green dots). Settings changes (dark mode, brightness, Night Shift, text scale) are live via `SimThemeContext`.
- **Window sizing**: `DraggableWindow` takes a pixel `initial` geometry plus an opt-in `fit` prop that measures the desktop on mount and shrinks to it. Single-window lessons should pass `fit` — the playground pane is half the page in a lesson and the whole screen in fullscreen, and an unfitted window hangs off the edge and clips whatever the step is highlighting. `FakeDesktop` deliberately does **not** use it: clamping would collapse its cascade.
- **Multiple windows**: several apps can be open at once, cascaded so no window hides the one before it. Two lists drive this and they are deliberately separate: `openApps` fixes **DOM order** and is never re-sorted, `stack` holds **z-order**. Re-sorting the rendered list moves a window's element between mousedown and mouseup, which cancels the click — clicking Close on a background window raised it and swallowed the click. Raise windows by changing `stack` only. Every window body comes from `Desktop/AppBody.tsx`; `npm run desktop-check` guards the whole behavior.
- **Desktop-first launching**: Every guided lesson starts on the desktop — the learner opens the app from the dock themselves. `DesktopLaunch` wraps guided sims: it renders FakeDesktop with a highlighted dock icon and a dark banner ("Open Mail — click the glowing icon"), then swaps to the guided sim once the app is opened. No guided lesson should auto-open its app.
- **SimulatorFrame**: Every playground activity is wrapped in `SimulatorFrame` — a dark `#1d2733` banner with instructions, optional step progress bar, and a two-stage completion (0.8s celebration overlay, then a slim persistent "lesson complete" banner that doesn't block interaction). Older Unit 1–2 tasks use single-activity mode (no step counter). Pass `chrome={false}` for sims that own a full-bleed desktop or browser. The duration constant `CELEBRATION_MS = 800` is exported from `SimulatorFrame.tsx` and imported by `KeyboardNavTask`.
- **Non-blocking completion**: After finishing an activity, the sim remains interactive for free play. The celebration overlay clears after 0.8 seconds; a slim green banner stays. All read interactions (opening panels, switching folders, viewing popovers) continue working.
- **Failure channel**: `onResult(success, failMessage?)` — when a sim reports failure, the left panel shows a red "Activity failed" card with the message and a "Try again" button. The playground stays mounted so the learner can see what happened. Dr. Digital switches to hint mood. Used by: CLEAN NOW click (browser popup), wrong ad click (assessment), wrong phishing verdict (with retry).
- **Step running**: Every `GuidedXxxTask` drives its steps through `useStepRunner`, which owns `stepIndex`, `completedSteps`, `phase`, `flash`, and `done`. A handler reports what the learner did with `tryStep((s) => s.action === "…" && …)` rather than reading the current step directly. The optional second argument is a guided-only gate for multi-phase steps (`tryStep(pred, phase === 1)`). Use `wanted(pred)` / `wants(pred)` when a *render* decision depends on what is still outstanding — "is a save dialog still needed?", "which page reveals this search result?".
- **Assessment mode**: Guided tasks accept `mode: "assessment"` and an optional `hint`. `tryStep` then scans **every unmet objective** instead of only the current step, so skills can be demonstrated in any order. `step` is `undefined` in this mode, which is what silences all the yellow highlight rings — `hl()` and every inline `step?.action === …` ring goes false on its own, so no highlight code needs a mode check. `SimulatorFrame` swaps the step counter for "Objectives: N of M done" with an expandable checklist and a Hint button that reveals the `hint` string. **Authoring rules**: state outcomes, never clicks; use targets the unit's lessons did not use; hints point at where to look and never name the control. **Hide where the controls are, never hide which thing to act on** — anything the learner must type and could not have seen on screen (a site, a name to invent, a search term, a time) must be stated in the brief as a given, marked with `**bold**`. `scripts/check-lessons.py` fails the build otherwise. See `docs/DISCOVERABILITY_AUDIT.md`.
- **One app per icon**: `Desktop/AppBody.tsx` maps a dock app id to the real app component. `FakeDesktop`, `GuidedDesktopTask` (inert, `pointer-events-none` — that lesson is about the window frame) and `GuidedTroubleshootingTask` (live, for icons its scenario has no script for) all render from it. Never hand-draw a stand-in for an app that already exists.
- **Step targets must exist**: `scripts/check-lessons.py` reads photo labels, app names, contact ids, phishing subjects, settings sections and WiFi networks out of the components and fails the build on a step naming something the simulator does not have. Two shipped lessons were unfinishable before this check existed.
- **Handlers must honor `target`**: a `tryStep` predicate that ignores the step's `target` passes in guided mode by luck of ordering and is simply wrong in assessment mode, where every unmet objective is scanned. Same for direction — `favorite` and `unfavorite` are not interchangeable.
- **Validation**: All task validation lives in `TaskChecker.ts` as pure functions. Components call the appropriate checker and pass `onResult(boolean, failMessage?)` up to `LessonModuleRunner`.
- **Icons**: All UI glyphs use SVG components from `components/Playground/Icons.tsx` — stroke style, `currentColor`, configurable `size` prop (default 20). Never use emoji for UI glyphs (buttons, indicators, sidebar items). **Allowed emoji**: reaction-picker emojis (they are the feature being taught) and app-identity emoji in content (e.g., app store catalog icons). Text characters (`✓`, `✗`, `✕`, `★`, `☆`, `&times;`) are not emoji and are kept as-is.
- **No OS branding**: No Apple, macOS, Finder, Safari, FaceTime, iCloud, Siri, or "App Store" (as the app's own name) in the simulated OS. Real websites (Google, Wikipedia) inside the browser are fine. The settings app is "Settings" (never "System Settings"). The app store is "App Market".

## Adding New Units and Lessons

No code changes are needed to add lessons. Create JSON files in `content/lessons/` and the site picks them up automatically.

### Step 1: Plan the unit structure

Decide the unit name, modules, and sub-lessons. A **unit** is a top-level grouping (e.g. "Unit 3: The Internet"). A **module** groups related sub-lessons onto one page. A sub-lesson is a single JSON file.

### Step 2: Pick `order` numbers

`order` controls the global sort order of all lessons. Existing ranges:
- Unit 1: `1`–`50`
- Unit 2: `200`–`290`
- Unit 3 (Files & Folders): `300`–`390`
- Unit 4 (Internet & Browsing): `400`–`499`
- Unit 5 (Messages & Video Calls): `500`–`570`
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
- `drDigitalIntro` is the teaching content — Dr. Digital explains the concept in friendly, simple language for absolute beginners. Should be thorough enough that the learner could re-teach the concept (4–6 bullets: What is it? Why does it matter? How do I do it? What's the common mistake?).
- `drDigitalSuccess` congratulates the learner after they complete the activity (or auto-advances if `type: "none"`)
- `drDigitalHint` gives a nudge if they're stuck on the activity
- `warning` (optional) — a short caution shown above the Dr. Digital bubble in an amber banner. Use it to warn about keys or actions the learner must NOT press during this lesson (e.g. "Do not press Escape during this activity — it will exit the simulator"). Leave it out when there is no such risk.
- **First letter capitalized** in every learner-facing sentence (`drDigitalIntro`, `drDigitalSuccess`, `drDigitalHint`, `instructions`, step `say`)
- **Never rename an existing `slug`** — progress is stored by slug in localStorage. Deleting a lesson is fine; new lessons get new slugs. This is why `a11y-colour-filters` keeps a British spelling the rest of the course does not: renaming it would make every learner who finished that lesson appear not to have. Its visible text is American; only the key is frozen. `scripts/spelling-check.py` allows that one string by name.
- **American English everywhere** — the course is sold in the US and mixed spelling reads as unfinished. `color` not `colour`, `practice` not `practise`, `gray` not `grey`, `organize` not `organise`. Enforced by `python3 scripts/spelling-check.py`, which also carries a list of genuine typos. The deliberate misspellings in `kb-delete.json` and `invitation-exercise.json` are the *lesson* (the learner fixes them) and are exempted there.
- **No emoji in Dr. Digital copy** — use plain text descriptions instead
- **No OS brand names** in learner-facing text (see Key Patterns)

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
