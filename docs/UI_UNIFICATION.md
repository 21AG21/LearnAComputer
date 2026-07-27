# One computer, everywhere

An audit of every playground surface across all twelve units, looking for the
same thing wearing two different faces. The learner should meet one Files app,
one browser, one desktop — not a lesser copy in Unit 1 and the real one in
Unit 4.

Every finding below was reproduced in a running browser before it was written
down.

---

## What was wrong

### 1. Two browsers

| | Where | What it had |
|---|---|---|
| `BrowserSimulator` | Unit 1's right-click, scroll and zoom lessons; the dock's Browser | One tab, big outlined arrows, a centred URL, a magnifier |
| `GuidedBrowserTask` | Unit 4, ~20 lessons | Tab strip with +, address bar with lock and star, Reading List / History / Downloads / New Window, a zoom stepper, fifteen sites |

A learner met the first browser in Unit 1, learned its shape, and then met a
completely different program in Unit 4 that the course also called "the
browser."

### 2. The dock's Browser was a stub

`Desktop/BrowserApp` was 53 lines: eight coloured letter-tiles and the sentence
"Type an address in the bar above to visit a site." There was no bar above. The
other six dock apps had already been collapsed onto their real implementations —
Messages, Mail, Photos, App Market, Calendar and Notes are each a seven-line
wrapper around the guided sim. Browser had not been.

### 3. Unit 1's Files app was deliberately crippled

`DesktopFileExplorerTask` and `EditFileTask` both passed
`filesEnabled={{ open: true }}` to `FakeDesktop`, which hid **New Folder**,
**Rename** and **Move to Trash** from the toolbar. Same component as Unit 3,
same file list, three fewer buttons. That is what made it read as a different,
lesser app.

### 4. Doubled window chrome

`DesktopFileExplorerTask`, `EditFileTask` and `GuidedSettingsTask` wrapped
`FakeDesktop` in a `SimulatorFrame` with its chrome on. The frame drew a title
bar reading "Files", and the desktop immediately underneath drew its own menu
bar reading "Desktop" — two stacked title bars for one app.

### 5. Files opened as a modal in Unit 3 and a window in Unit 1

Unit 1's Files runs inside `FakeDesktop`, which passes `onFileOpen` and gets a
real `FileViewer` window. Unit 3's `GuidedFilesTask` renders `FileManager`
directly, so double-clicking fell through to a centred translucent modal
containing the file's *description* rather than its contents.

### 6. `OpenAllAppsTask` drew its own instruction banner

A hand-rolled `bg-[#1d2733]` strip instead of `SimulatorFrame`, so it had no
progress bar and no completion state while every other activity did.

---

## What changed

| Fix | File |
|---|---|
| `BrowserSimulator`'s chrome rebuilt to match `GuidedBrowserTask` exactly — same tab strip, toolbar, address bar with lock, and action bar | `components/Playground/BrowserSimulator.tsx` |
| The dock's Browser is now `GuidedBrowserTask` in free play, like the other six apps | `components/Playground/Desktop/BrowserApp.tsx` |
| `freePlay` added to `GuidedBrowserTask` | `components/Playground/GuidedBrowserTask.tsx` |
| `filesEnabled` gates removed; the whole `enabled` prop chain deleted from `FakeDesktop` → `FilesApp` → `FileManager` since nothing set it any more | four files |
| `chrome={false}` on the three sims that own a full desktop | `DesktopFileExplorerTask`, `EditFileTask`, `GuidedSettingsTask` |
| `FileManager`'s preview renders the same `FileViewer` the desktop opens, inside a window-shaped frame with a title bar and an X | `components/Playground/Desktop/FileManager.tsx` |
| `OpenAllAppsTask` uses `SimulatorFrame` | `components/Playground/OpenAllAppsTask.tsx` |

Deleting the `enabled` chain removed `FileManagerEnabled`, `ALL_ENABLED`, and
eight conditional branches. Nothing gained a flag; a flag stopped existing.

---

## The shape after

There is one implementation of each app, and one route into it.

| App | Component | Reached from |
|---|---|---|
| Browser | `GuidedBrowserTask` | Unit 4 lessons, the dock, free play |
| Files | `FileManager` (via `FilesApp`) | Units 1 and 3, the dock |
| Mail | `GuidedEmailTask` | Unit 6, the dock |
| Messages | `GuidedMessagingTask` | Unit 5, the dock |
| Photos | `GuidedPhotosTask` | Unit 7, the dock |
| App Market | `GuidedAppStoreTask` | Unit 8, the dock |
| Settings | `SettingsApp` | Unit 9, the dock |
| Calendar / Reminders | `GuidedCalendarTask` | Unit 12, the dock |
| Notes | `GuidedNotesTask` | Unit 2, the dock |

Every guided lesson enters through `DesktopLaunch` — the learner sees the
desktop, the icon glows, they open the app themselves. The three sims that *are*
the desktop (`GuidedDesktopTask`, `GuidedTroubleshootingTask`,
`OpenAllAppsTask`) skip `DesktopLaunch` because there is nothing to launch, and
pass `chrome={false}` so only one title bar is drawn.

`BrowserSimulator` still exists, and that is deliberate. Unit 1's three browser
lessons need a fixed page and a fixed URL — a scroll target, a right-clickable
link, a poster of tiny print. Pointing them at the fifteen-site browser would
mean adding three one-off pages to Unit 4's site table. Instead the chrome is
identical and only the plumbing differs, which is the distinction that matters
to a learner: it looks and behaves like the browser they know.

---

## Verified in the browser

- Dock → Browser opens the full browser in a draggable window: tab strip,
  address bar, Reading List / History / Downloads / New Window, zoom, favourites.
- Unit 1 *Two-finger scrolling* shows the same chrome as Unit 4.
- Unit 1 *Right click* shows the same chrome, and the Pet News front page and
  cat article render inside it.
- Unit 1 *Double click* opens Files with **New Folder**, **Rename**,
  **Move to Trash** and **Search** — the full Unit 3 toolbar — under a single
  title bar.
- `BirthdayInvitation.txt` opens as an editable file with a Save button, in its
  own window that drags, resizes and closes.

`npx tsc --noEmit`, `npm run lint` (0 errors), `scripts/check-lessons.py`
(153 lessons) and `npm run build` all clean.
