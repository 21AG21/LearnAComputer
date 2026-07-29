# Consistency audit

A pass over all 153 lessons and every simulator, looking for places where the
course contradicts itself: two versions of the same app, copy that describes a
control the simulator does not have, activities that were built but never used.

Findings are split into what has been fixed and what is still open.

---

## Fixed

### 1. The dock was drawn three different ways, with the wrong artwork

The icon PNGs had been sliced from the source sheet with a stride that drifted
off the grid. Everything after Files was half-cut and shifted one app to the
right: **Mail showed a bell, Settings showed an envelope, Photos showed a gear,
Notes showed a blank gray sliver.** The slices were opaque 320×267 rectangles
letterboxed into square tiles, so the ten icons merged into one ragged white
strip lying on the wallpaper.

Separately, three components each drew their own dock — `FakeDesktop` floated
bare icons, `GuidedDesktopTask` used a dark strip below the desktop,
`GuidedTroubleshootingTask` used a white strip with SVG icons instead of the
artwork. "The dock" was a different object in each lesson.

Re-sliced from the detected grid, mapped each glyph to the app it depicts, and
collapsed all three into `components/Playground/Dock.tsx`.

### 2. Unit 1 ran on a different computer from the rest of the course

`GuidedDesktopTask` had its own operating system: flat blue wallpaper, a thin
dark menu bar calling itself **"PlaygroundOS"**, an uppercase clock, four dock
apps. `FakeDesktop` — which every other unit uses — has a pastel wallpaper, a
white menu bar naming the front app, a lowercase clock, ten dock apps.

Wallpaper and menu bar extracted into `DesktopChrome.tsx`; both desktops render
from it, with the same ten apps in the same order.

### 3. Every window showed Notes content, whichever app was opened

The window body in `GuidedDesktopTask` was hardcoded to a Notes shopping list
and the title bar to a Notes icon. The lesson that asks the learner to open the
**browser** handed them a browser containing milk, eggs, bread and apples.
Each app now shows something recognizably its own.

### 4. The catalog showed fifteen units instead of twelve

Lessons group by exact unit string. Three assessments carried a differently
worded one — `"Unit 8: Apps and the App Store"` against `"Unit 8: Apps"`,
`"Unit 10: Staying Safe Online"` against `"Unit 10: Online Safety and
Security"`, `"Unit 11: When Things Go Wrong"` against `"Unit 11:
Troubleshooting"` — so each assessment rendered as its own extra unit
containing one lesson.

### 5. "Click the red X" — there is no red X

Four lines of Unit 1 copy told the learner to find "the red X". The close
button is a neutral gray ✕ that only reddens on hover; `WindowControls` says
the un-branded look is deliberate. A beginner hunting for a red X finds
nothing. Copy now matches the control and mentions the hover color.

### 6. The running dot was described in the wrong place, and did not appear

`screen-dock` said "a small dot appears **below** its icon" when an app is
open. The dot is a green badge **on** the icon — and it only rendered once the
app was *minimized*, so a learner following the lesson literally saw nothing at
all. Copy corrected; the dot now shows whenever the app is running.

### 7. Unit 12 had twelve lessons and no activity anywhere in it

After eleven hands-on units, the final unit was pure reading — and a finished
Calendar simulator (`guided-calendar`) was sitting unused. *Calendar and
Reminders* now uses it, and teaches the distinction the sim can actually
demonstrate: an appointment has a time and goes on the calendar, a task does
not and goes in reminders.

### 8. Touchscreen language in a laptop course

Nine lessons told the learner to "Tap" things they click — *"Tap a name to open
their conversation"*, *"then tap Install"*. Changed to click. The five trackpad
lessons keep "tap" and "pinch", which are real trackpad gestures there.

### 9. The dock's browser opened onto nothing

`Desktop/BrowserApp` rendered `<div className="h-full bg-white" />` as its page.
A learner told to "open any four apps from the dock" opened the browser onto a
blank white void. It now has a new-tab page.

---

## Still open

### A. The dock apps are not the apps the course teaches — *the biggest one*

This is the other half of "two of everything". `FakeDesktop`'s dock opens small
stub apps that are unrelated to the simulators the later units teach:

| App | In the dock | What the course teaches |
|---|---|---|
| Mail | `Desktop/MailApp`, 203 lines — cards labelled `From: / When: / Subject: / Contents:` | `GuidedEmailTask`, 508 lines — Inbox/Sent/Spam/Archive, reply, forward, attach |
| Messages | `Desktop/MessagingApp`, 151 lines | `GuidedMessagingTask`, 899 lines — reactions, emoji picker, photos, calls, groups |
| Photos | `Desktop/PhotosApp`, 96 lines | `GuidedPhotosTask`, 546 lines — editing, albums, sharing |
| App Market | `Desktop/AppMarketApp`, 99 lines | `GuidedAppStoreTask`, 580 lines |
| Calendar | `Desktop/CalendarApp`, 135 lines | `GuidedCalendarTask`, 388 lines |
| Notes | `Desktop/NotesApp`, 115 lines | `GuidedNotesTask`, 127 lines |

Files and Settings are already shared (`FileManager`, `SettingsApp`) — that is
the pattern to copy.

**Exposure is now narrow**: after the fixes above, the only lesson that puts a
learner in front of the stubs is `apps-opening` ("open any four apps from the
dock"), plus free play after any activity. But a learner who opens Mail there
and again in Unit 6 sees two unrelated programs with the same name.

**Suggested approach.** Every guided sim already has the same shape —
`{goal, steps, mode, hint, onResult}` — and `useStepRunner` degrades correctly
with `steps: []` (no current step, no highlights, no completion callback), which
is exactly free-play behavior. Add a `chrome?: boolean` prop that each sim
forwards to `SimulatorFrame` (which already supports `chrome={false}`), then
make each `Desktop/XxxApp` a thin `AppWindow` wrapper around the guided sim with
no steps. That deletes roughly 800 lines of stub and leaves one implementation
per app.

I did not start this because it touches six simulators and every
`DesktopLaunch`-wrapped lesson, and I would rather it be done and verified in
one piece than left half-migrated.

### B. Unit 12 and the capstone are still almost entirely read-only

Eleven of Unit 12's twelve lessons and the Final Capstone have no activity.
Seven of them actively promise one — `social-media`, `maps-navigation`,
`notes-documents`, `google-docs-basics`, `google-docs-share`,
`google-drive-basics`, `printing-scanning` all say "Let's practice" or "try it"
and then offer nothing to do.

Several could use simulators that already exist: `notes-documents` →
`notes-shortcut`, `shopping-banking` → `guided-browser`, `pdfs-reading` →
`guided-browser`'s PDF viewer.

### C. Three finished simulators no lesson uses

`drag-sort-files`, `spot-the-fake` and `url-navigator` are wired into
`LessonPlaygroundPane` and documented in CLAUDE.md, but no lesson references
them. `spot-the-fake` in particular looks like a natural fit for Unit 10.

The `message-reply` and `compose-email` task types are also now unreferenced —
their lessons were migrated to `guided-messaging` and `guided-email`.

### D. Single-lesson read-only modules

*Unit 7 / Cloud Storage* and *Unit 8 / Apps vs Websites* are one read-only
lesson each. They read as modules in the catalog but carry no practice.

### E. `guided-troubleshooting`'s `scenario` field is decorative

The scenario is inferred from the step actions; the JSON `scenario` string is
free text that nothing reads. It is documented as author-facing, but it looks
load-bearing and invites a lesson author to change it expecting an effect.
