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
    DesktopBrowserRightClickTask.tsx
    DesktopBrowserScrollTask.tsx
    DesktopBrowserZoomTask.tsx
    DesktopFileExplorerTask.tsx
    FakeDesktop.tsx         # Desktop environment: 10-app dock, menu bar, battery, wifi, clock
    MusicNoteIcon.tsx       # SVG music note for file previews

    Desktop/               # Apps that run inside FakeDesktop
      AppWindow.tsx         # Draggable/closeable window frame
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
  progress.ts              # localStorage read/write for completed slugs
  chat.ts                  # localStorage read/write for messaging threads
  simState.ts              # localStorage read/write for persistent sim state (lac-sim)

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
| `multiple-choice` | MultipleChoiceTask | **NEVER use — all remaining instances have been converted** |
| `drag-sort-files` | DragSortTask | Click-to-place items into category buckets |
| `spot-the-fake` | SpotTheFakeTask | Click the scam/fake among 2–3 item cards |
| `url-navigator` | UrlNavigatorTask | Type a URL into a fake browser address bar |
| `guided-files` | GuidedFilesTask | Guided file manager: open/create/rename/move/search/delete/restore/save |
| `guided-browser` | GuidedBrowserTask | Guided browser: navigate/search/tabs/cookies/popups/reload/zoom/downloads |
| `guided-messaging` | GuidedMessagingTask | Guided messaging + video calls: contacts, messages, reactions, photos, calls |
| `guided-email` | GuidedEmailTask | Guided email: compose/reply/forward, spam, attach files, CC/BCC, unsend |
| `guided-photos` | GuidedPhotosTask | Guided photos: edit (crop/rotate/brightness/contrast/filters), share, albums |
| `guided-app-store` | GuidedAppStoreTask | Guided app store: search, install, permissions, update, delete |
| `guided-settings` | GuidedSettingsTask | Guided settings: toggle, slider, storage cleanup, section navigation |
| `guided-security` | GuidedSecurityTask | Guided security: passwords, 2FA, phishing, passkeys, password reset |
| `guided-troubleshooting` | GuidedTroubleshootingTask | Guided troubleshooting: frozen apps, WiFi, error codes, support |
| `guided-calendar` | GuidedCalendarTask | Guided calendar + reminders: create events, set times, reminders |
| `guided-desktop` | GuidedDesktopTask | Guided window management: move, resize, minimize, maximize, close |
| `keyboard-nav-game` | KeyboardNavTask | Keyboard navigation game (Tab, Enter, arrow keys) |

**Playground philosophy:** activities should be *hands-on and guided* — the learner clicks, types, and manipulates a realistic simulation with each step highlighted (pulsing yellow). **NEVER use `multiple-choice`** — quizzes test recognition, not skill. All existing multiple-choice lessons have been converted to guided task types. `guided-files` is the reference pattern for a guided simulator.

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

A self-contained simulated browser. The JSON provides a `goal` and `steps`; each step highlights the exact control and only advances when the correct action is done. The set of fake websites (Shop, Google, Wikipedia, Weather, Daily News, Recipe Box, Free Games) lives hardcoded in `GuidedBrowserTask.tsx` — reference their `url` (e.g. `shop.example`, `google.com`, `weather.com`, `freegames.example`) in `navigate` steps.

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
    { "say": "Check the lock icon.", "action": "lock-click" },
    { "say": "Decline the cookie banner.", "action": "cookie-decline" },
    { "say": "Close the scam popup.", "action": "close-popup" },
    { "say": "Reload the page.", "action": "reload" },
    { "say": "Zoom in twice.", "action": "zoom-in" }
  ]
}
```

`mode` defaults to `"guided"`. Set `"assessment"` for objectives-only (no step-by-step highlighting). `initialDownloads` seeds the Downloads list on mount. Pages with special behavior: `weather.com` shows a cookie banner and ads, `freegames.example` is "Not Secure" and throws a scam popup, `recipebox.example` has a download button, `news.example` has fine print for zoom lessons. Cookie/popup/download steps must be preceded by a `navigate` to the matching page. Clicking **CLEAN NOW** on the popup fails the lesson with a message (teaches consequences). The `reload` action only completes when it fixes a broken page (pages navigated before a reload step render broken).

#### `guided-messaging` schema

A self-contained simulated messaging and video calling app. The JSON provides a `goal` and `steps`; each step highlights the exact control and only advances when the correct action is done. Four contacts are hardcoded: Alex, Jordan, Sam, Grandma — each with preset conversation threads.

```json
"playgroundTask": {
  "type": "guided-messaging",
  "goal": "Short summary shown when finished",
  "steps": [
    { "say": "Click on Alex to open their conversation.", "action": "select-contact", "target": "alex" },
    { "say": "Type a message and send it.", "action": "send-message", "value": "Hello!" },
    { "say": "React to their message.", "action": "add-reaction" },
    { "say": "Send a photo.", "action": "attach-photo" },
    { "say": "Start a video call.", "action": "start-call" },
    { "say": "Mute your microphone.", "action": "mute" },
    { "say": "Turn off your camera.", "action": "camera-off" },
    { "say": "End the call.", "action": "end-call" }
  ]
}
```

Actions: `select-contact` (`target`: lowercase contact name — alex/jordan/sam/grandma), `send-message` (2-phase: focus input then send; `value` is the required text), `add-reaction` (2-phase: double-click/long-press message then pick emoji), `attach-photo` (2-phase: click + button then pick photo from grid), `start-call`, `mute`, `camera-off`, `end-call`. Video call actions require an active call. Reactions require double-click or press-and-hold (never single click).

#### `guided-email` schema

A simulated email client with Inbox, Sent, Spam, Archive folders. The JSON provides a `goal` and `steps`.

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

Actions: `open-email` (`target`: sender name), `compose`, `set-to`/`set-cc`/`set-bcc`/`set-subject`/`set-body` (`value`), `attach` (2-phase: click paperclip then pick file from picker; `target` is filename), `send`, `reply`, `forward`, `delete`, `mark-spam`, `archive`, `go-to-folder` (`target`: Inbox/Sent/Spam/Archive), `unspam` (in Spam folder), `move-to-inbox` (in Archive). After sending a reply, a "Sent — Undo" pill appears with a 30-second countdown.

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

Actions: `search` (`value`), `select-app` (`target`), `install`, `allow-permission`, `deny-permission` (cancels install), `go-to-installed`, `go-to-store`, `update-app` (`target`), `delete-app` (`target`), `open-app` (`target`), `go-to-category` (`target`). Installed apps persist across lessons via `lac-sim-apps` in localStorage.

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

Actions: `open-section` (`target`: Appearance/Display/Accessibility/WiFi/Notifications/Storage/About), `toggle` (`target`: setting name), `slider` (`target`, `min`/`max` range), `delete-item` (`target`), `empty-trash`.

#### `guided-security` schema

Multi-section security simulator: passwords (live strength meter), login, 2FA, phishing verdict, passkeys.

```json
"playgroundTask": {
  "type": "guided-security",
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
  "launchApp": "notes",
  "steps": [
    { "say": "Click the frozen Notes window.", "action": "click-frozen" },
    { "say": "Open the system menu.", "action": "open-force-quit" },
    { "say": "Force Quit.", "action": "force-quit", "target": "Notes" },
    { "say": "Reopen Notes from the dock.", "action": "restart-app", "target": "notes" }
  ]
}
```

`scenario` values: `frozen-notes`, `frozen-browser`, `no-wifi`, `error-code`. `launchApp` names the dock app that starts frozen/problematic. Actions: `read-error`, `click-frozen`, `open-force-quit`, `force-quit` (`target`), `restart-app` (`target`), `open-wifi-panel`, `toggle-wifi`, `reconnect-wifi`, `forget-network`, `copy-code`, `open-browser`, `paste-code`, `submit-support`.

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

`launchApp`: `"calendar"` (default) or `"reminders"` (opens on reminders view). Actions: `select-day` (`target`), `create-event`, `set-title` (`value`), `set-time` (`value`), `set-repeat` (`value`), `save-event`, `create-reminder`, `set-reminder-text` (`value`), `save-reminder`, `complete-reminder` (`target`), `switch-view` (`target`: calendar/reminders), `select-calendar` (`target`).

#### `guided-desktop` schema

Window management: the learner practices moving, resizing, minimizing, and closing windows on the desktop.

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
    { "say": "Close the window.", "action": "close" }
  ]
}
```

Actions: `move`, `resize`, `minimize`, `restore`, `maximize`, `restore-max`, `close`.

### Progress

Stored in `localStorage` under key `"lac-progress"`:

```ts
{ version: 1, completedSlugs: string[] }
```

`LessonModuleRunner` calls `markComplete(slug)` when a sub-lesson's playground is finished.
Sub-lessons with `type: "none"` or `"placeholder"` auto-advance (no gate).

### Sim State

Persistent simulator state is stored in `localStorage` under key `"lac-sim"` (one JSON object with namespaced sub-keys). Used by the App Market to persist installed apps across lessons (`lac-sim-apps`). The dashboard's "Reset all progress" button clears both `lac-progress` and `lac-sim`.

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
- **FakeDesktop**: A self-contained desktop environment with a **10-app dock**: Messages, Browser, Files, Mail, Settings, Photos, App Market, Calendar, Reminders, Notes. The menu bar has a working clock, battery indicator (real Battery API), WiFi panel, and optional Do Not Disturb indicator. The taskbar shows open-app indicators (green dots). Settings changes (dark mode, brightness, Night Shift, text scale) are live via `SimThemeContext`.
- **Desktop-first launching**: Every guided lesson starts on the desktop — the learner opens the app from the dock themselves. `DesktopLaunch` wraps guided sims: it renders FakeDesktop with a highlighted dock icon and a dark banner ("Open Mail — click the glowing icon"), then swaps to the guided sim once the app is opened. No guided lesson should auto-open its app.
- **SimulatorFrame**: All playground activities share `SimulatorFrame` for visual consistency — a dark `#1d2733` banner with instructions, optional step progress bar, and a two-stage completion (1.6s celebration overlay, then a slim persistent "lesson complete" banner that doesn't block interaction). Older Unit 1–2 tasks are wrapped in SimulatorFrame in single-activity mode (no step counter).
- **Non-blocking completion**: After finishing an activity, the sim remains interactive for free play. The celebration overlay clears after 1.6 seconds; a slim green banner stays. All read interactions (opening panels, switching folders, viewing popovers) continue working.
- **Failure channel**: `onResult(success, failMessage?)` — when a sim reports failure, the left panel shows a red "Activity failed" card with the message and a "Try again" button. The playground stays mounted so the learner can see what happened. Dr. Digital switches to hint mood. Used by: CLEAN NOW click (browser popup), wrong ad click (assessment), wrong phishing verdict (with retry).
- **Assessment mode**: Guided tasks with `mode: "assessment"` show objectives instead of step-by-step instructions. The `SimulatorFrame` banner displays "Objectives: N of M done" with an expandable checklist and a Hint button. **Assessment-authoring rules**: list objectives only, never write step-by-step walkthroughs. Hints give a nudge, not the answer.
- **Validation**: All task validation lives in `TaskChecker.ts` as pure functions. Components call the appropriate checker and pass `onResult(boolean, failMessage?)` up to `LessonModuleRunner`.
- **Icons**: All UI glyphs use SVG components from `components/Playground/Icons.tsx` — stroke style, `currentColor`, configurable `size` prop (default 20). Never use emoji for UI glyphs (buttons, indicators, sidebar items). **Allowed emoji**: reaction-picker emojis (they are the feature being taught) and app-identity emoji in content (e.g., app store catalog icons). Text characters (`✓`, `✗`, `✕`, `★`, `☆`, `&times;`) are not emoji and are kept as-is.
- **No OS branding**: No Apple, macOS, Finder, Safari, FaceTime, iCloud, Siri, or "App Store" (as the app's own name) in the simulated OS. Real websites (Google, Wikipedia) inside the browser are fine. The settings app is "Settings" (never "System Settings"). The app store is "App Market".

## Adding New Units and Lessons

No code changes are needed to add lessons. Create JSON files in `content/lessons/` and the site picks them up automatically.

### Step 1: Plan the unit structure

Decide the unit name, modules, and sub-lessons. A **unit** is a top-level grouping (e.g. "Unit 3: The Internet"). A **module** groups related sub-lessons onto one page. A sub-lesson is a single JSON file.

### Step 2: Pick `order` numbers

`order` controls the global sort order of all lessons. Existing ranges:
- Unit 1: `1`–`26`
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
- **First letter capitalized** in every learner-facing sentence (`drDigitalIntro`, `drDigitalSuccess`, `drDigitalHint`, `instructions`, step `say`)
- **Never rename an existing `slug`** — progress is stored by slug in localStorage. Deleting a lesson is fine; new lessons get new slugs.
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
