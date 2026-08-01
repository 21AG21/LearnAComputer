# Fixing Unit 1

A plan built from a full pass over the unit's feedback. Every complaint was
reproduced in the browser before being written down; measurements and line
counts below are real, not estimates.

The feedback reads as ~25 separate problems. It is closer to **eight**. Most of
the list is one of a handful of structural facts showing up in different
lessons, and fixing the fact fixes the whole cluster. The through-line, in the
learner's words:

> *One computer. Real windows. Real content. Let me click whatever I want.*

---

## Part 1 — What is actually wrong

### A. Apps are full-screen panes, not windows

`FakeDesktop` mounts every app as `absolute inset-0` — the app covers the entire
desktop, wallpaper and dock included. There is no window, so there is nothing to
drag, nothing to resize, nothing to maximize. The close and minimize buttons
live in the *menu bar* instead of on the app.

This single fact is behind:

| Complaint | Why |
|---|---|
| "Why is the Notes app not able to be dragged around?" | There is no window to drag |
| "Why can't it be expanded upon either?" | No resize handle, no maximize |
| "Why can't I click the full screen button?" | It isn't rendered |
| "If I click browser, why is the browser thing not the actual browser? It should be the actual browser… make it a lot bigger" | Browser fills 100% of the pane, so it reads as a takeover rather than an app |
| "Working with Windows 1 of 1 — it's covered, it's a pretty big body, should have full functionality" | The window is a fixed **280×180** box inside a **704×663** pane — 12% of the area |
| Two title bars stacked on the Files lesson | `SimulatorFrame`'s chrome says "Files", and the `FakeDesktop` menu bar underneath *also* says "Files" |

### B. Six apps exist twice

The dock opens small stubs unrelated to the simulators the rest of the course
teaches. Verified line counts:

| App | Dock stub | What Units 5–12 teach |
|---|---|---|
| Messages | `Desktop/MessagingApp` — **151** | `GuidedMessagingTask` — **899** |
| Mail | `Desktop/MailApp` — **203** | `GuidedEmailTask` — **508** |
| Photos | `Desktop/PhotosApp` — **96** | `GuidedPhotosTask` — **546** |
| App Market | `Desktop/AppMarketApp` — **99** | `GuidedAppStoreTask` — **580** |
| Calendar | `Desktop/CalendarApp` — **135** | `GuidedCalendarTask` — **388** |
| Notes | `Desktop/NotesApp` — **115** | `GuidedNotesTask` — **127** |

The Messages stub is a wireframe: three empty white squares for contacts, black
1px borders, a literal `Type Here:` label next to a bare `<input>`. That is what
"why is that messages app so bad" is pointing at. The Mail stub renders each
message as `From: / When: / Subject: / Contents:` cards.

**This is far more contained than it looks.** Two facts make it a small job:

1. All eight `Desktop/*App` files are imported by **exactly one** file —
   `FakeDesktop.tsx`. Nothing else in the codebase touches them.
2. Every stub-only prop is **already dead**: `instructionBanner`,
   `composeBanner`, `promptBanner`, `composeDefaults`, `onEmailOpened`,
   `onSendMessage`, `initialMessages`, `avatarSrc`, `contactName` are passed
   from nowhere. They are leftovers from the `message-reply` and
   `compose-email` task types, which no lesson uses any more.

And the seam already exists: every guided sim has the identical signature
`{goal, steps, mode?, hint?, onResult}`, and `useStepRunner` degrades correctly
with `steps: []` — no current step, no highlights, no completion callback. That
is free play, already written.

### C. A third desktop, in the troubleshooting simulator

`GuidedTroubleshootingTask` draws its own operating system: a **flat gray
rectangle** for a wallpaper, its own menu bar reading "Desktop", and a **dock of
one icon** on a white strip. Hence "the dock should be bigger and it should be
like the normal actual UI of how the computer really looks — it says desktop in
the top left but it's not the desktop."

`DesktopChrome` and `Dock` were extracted for exactly this; this simulator never
got moved over.

### D. Files don't open — they get described

Double-clicking a file shows a translucent centred modal containing the file's
icon, name, and a `body` string. It cannot be moved, resized, or closed with an
X. Worse, the strings in `filesData.tsx` are *descriptions of* files rather than
files:

| File | What double-clicking shows today |
|---|---|
| `VacationPhoto.png` | the text `"A photo from the beach"` |
| `Budget.xlsx` | `"A spreadsheet of this month's income and expenses."` |
| `FavoriteSong.mp3` | `"3 minutes 24 seconds of music"` |
| `TaxReturn.pdf` | `"Your 2025 tax return document."` |
| `BirthdayInvitation.txt` | `"A birthday invitation — double-click to edit it."` |

That last one is the sharpest: it instructs the learner to double-click to edit,
which is what they just did, and there is no editing. `GroceryList.txt` is the
only file whose `body` is its actual contents.

The real artwork is already sitting in `public/playgrounds/`:
`file-vacation-photo.png`, `file-budget.png`, `file-favorite-song.png`.

### E. The lesson reading pane collapses, and so does the image beside it

Measured on the Power button lesson at a 1280px viewport:

```
media pane   704 × 663      ← the space available
LessonMedia   64 × 663      ← collapsed to its own padding
<img>          0 × 0        ← invisible
```

`LessonMedia`'s root has no width class. Inside a flex-row parent it is
content-sized, so the child's `w-full max-w-sm aspect-square` resolves against
nothing and collapses. **Whatever text is in the caption is what sizes the
image.** Charger has a caption, so its root is 317px and its image renders at
253×253 — a third of the space available, and only by accident. Power button has
no caption, so it is 64px wide and the image is 0×0.

That is the whole of "the power button image doesn't load."

Separately, `LessonModuleRunner` gives the text `lg:max-w-xl` (576px) whenever a
lesson has media *or* an activity, and `lg:max-w-3xl` otherwise. So the
media lessons — Speakers, Power button, Charger — get the narrow column and
scroll, while the image beside them uses a quarter of a 704px pane.

### F. The menu-bar panels are half-built

- **`handleMenuBarClick` returns before `tryStep`.** Clicking the battery icon a
  second time to close the panel — what a real computer does, and what the
  learner tried — takes the `menuPanel === panel` early-return branch and never
  reports the `close-panel` step. The panel is now shut with no × left to click
  and the lesson cannot be completed. Exactly "if you just click, the battery
  will go again, it doesn't register that as complete… it's a bug."
- **No outside-click dismissal.** `FakeDesktop` dismisses a panel when you click
  the desktop; `GuidedDesktopTask` has no such handler.
- **The WiFi panel is static markup** — three `<div>`s, no buttons. There is no
  disconnect, and no way to interact at all. `FakeDesktop`'s version is live but
  also has no disconnect.

### G. Copy that describes controls the simulator doesn't have

Same class of bug as the "red X" found in the last audit:

| Lesson | Says | Actually |
|---|---|---|
| Two-finger scrolling | "scroll back up and type it into the box" | The code *and* the input are both at the bottom. You never scroll back up |
| Working with windows | "the **yellow** strip at the top of the window" | The title bar is gray; only the highlight ring is yellow |
| Working with windows | "the 'Notes' button in the **taskbar**" | It is a dock, and the course calls it a dock everywhere else |
| Calendar stub | "Open a Calendar lesson to add events." | Dead-end signage inside the product |
| App Market stub | "Open an App Market lesson to practice installing apps." | ditto |
| Photos stub | "Open a Photos lesson to create one." / "…to edit." | ditto |

The signage lines are the direct answer to "why does it say to open a calendar
lesson to add events? You should be able to add events whenever you want."

### H. The websites are thin

`petnews.example` is a heading and two paragraphs. The funny-cat payoff is a
picture with the caption *"That's one judgmental cat."* — the joke is missing.
`Desktop/BrowserApp`'s new-tab page is six colored squares with a letter in
each.

### I. Small, verified, unrelated

- **The App Market cannot scroll.** `AppWindow` puts children in
  `<div className="flex-1 overflow-hidden">` — a *block* box. `AppMarketApp`'s
  list is `flex-1 overflow-y-auto`, and `flex-1` is inert without a flex parent,
  so the list sizes to content and the parent clips it. Eight apps; the eighth
  is unreachable. The same structural mistake is in `PhotosApp`, `CalendarApp`
  and `NotesApp`.
- **"App Market" wraps to two lines in the dock.** Measured label heights: 25px
  for App Market, 13px for the other nine.
- **Unit 1's Files app has fewer buttons than Unit 3's.** `DesktopFileExplorerTask`
  passes `filesEnabled={{ open: true }}`, which hides New Folder, Rename and
  Move to Trash. It is the same component, deliberately stripped — which is
  what makes it feel like a different, lesser app.

---

## Part 2 — The plan

Eight phases. Each is independently shippable and independently verifiable;
none leaves the course half-migrated. Ordered so the structural keystone lands
early and the later phases get cheaper.

---

### Phase 0 — The reading lessons

*Fixes: E. Smallest change, most visible.*

**`components/LessonMedia.tsx`**
- Add `w-full min-w-0` to the root so it fills the pane instead of its caption.
- Change the image wrapper from `w-full max-w-sm aspect-square` to
  `w-full max-w-xl flex-1 min-h-0` with `object-contain`, so the picture is
  bounded by the *pane*, not by a fixed square.

**`components/LessonModuleRunner.tsx`**
- Widen the text column. Today: `lg:max-w-xl` when media or an activity is
  present. Change to `lg:max-w-2xl` for media lessons (keep `xl` for activity
  lessons, where the playground genuinely needs the room), and keep
  `lg:max-w-3xl mx-auto` for pure reading.
- The goal is stated plainly: **a reading lesson should never need scrolling at
  1280×720.** Verify each of the nine "What is a computer?" lessons at that size.

**Content**
- `computer-parts-speakers.json` — delete the `media` block. It is a photo of
  headphones on a lesson about built-in speakers, and the lesson reads fine
  without it. ("There is no need for that headphone image.")
- `computer-parts-camera.json` — trim the intro from six bullets to four; fold
  the simulated-camera note into the last bullet.
- `computer-parts-power-button.json` — add a `caption` ("The power symbol looks
  the same on nearly every device.") now that captions no longer control layout.

**Verify:** all nine lessons at 1280×720 — no scrollbar in the left pane; power
button and charger images both render at pane width.

---

### Phase 1 — Real windows

*Fixes: A. The keystone. Everything after this is cheaper.*

**New — `components/Playground/Desktop/DraggableWindow.tsx`**

Lift the window mechanics out of `GuidedDesktopTask` (they already exist and
work — lines 165–301: drag refs, resize refs, threshold detection, the global
`mousemove`/`mouseup` listeners, save/restore rect for maximize) into one
component used by both desktops.

```tsx
interface DraggableWindowProps {
  title: string;
  icon?: ReactNode;
  initial: { x: number; y: number; w: number; h: number };
  minimized?: boolean;
  maximized?: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize?: () => void;
  /** Guided lessons only — pulsing ring on the control the step calls for. */
  highlight?: "minimize" | "maximize" | "close" | "titlebar" | "resize" | null;
  /** Fired past the movement threshold, so a nudge doesn't satisfy a step. */
  onMoved?: () => void;
  onResized?: () => void;
  children: ReactNode;
}
```

- Clamp so the title bar can never be dragged fully off-screen.
- Keep the existing `animate-window-open` / `-close` / `-minimize` classes.
- `WindowControls` already takes a `highlight` prop — pass it straight through.

**`FakeDesktop.tsx`**
- Replace each app's `<div className="absolute inset-0 …">` with a
  `DraggableWindow`.
- Move close/minimize **out of the menu bar and into the window title bar**,
  where they belong and where Unit 1's copy already points.
- Give each app a default rect as a fraction of the desktop, with a cascade
  offset so two open windows don't sit exactly on top of each other:

  | App | Default | Why |
  |---|---|---|
  | Browser | 84% × 80% | "Make the actual browser a lot bigger" — but not full screen, so closing it is still a visible act |
  | Files, Mail, Photos, App Market | 76% × 72% | List + detail needs the width |
  | Messages, Calendar, Settings | 68% × 66% | |
  | Notes | 58% × 56% | Small enough that dragging and resizing it are obviously possible |

**`GuidedDesktopTask.tsx`**
- Delete its private window implementation; render `DraggableWindow` with
  `highlight` driven by the current step.
- Raise `INIT` from 280×180 to the same fractional sizing, so *Working with
  windows* has a window worth manipulating.

**`Desktop/AppWindow.tsx`**
- Now only supplies the inner scroll container. Fix the block-vs-flex bug at the
  same time: `flex-1 overflow-hidden` → `flex-1 min-h-0 flex flex-col`. This is
  what makes the App Market scrollable (issue I) and unbreaks Photos, Calendar
  and Notes.
- `showHeader` becomes unnecessary — `DraggableWindow` always draws the title
  bar, because the title bar *is* the window.

**Verify:** open each of the ten apps from `/playground`; drag, resize,
maximize, restore, minimize and close each one. Then re-run *Working with
windows* and *Opening apps 2/3* and *3/3*.

---

### Phase 2 — One app per app

*Fixes: B. Contained, because only `FakeDesktop` imports the stubs.*

**`SimulatorFrame.tsx`** — add one prop:

```tsx
/** Free play: no instruction banner, no window chrome — the app fills the pane. */
freePlay?: boolean;
```

When set, skip the dark banner and the frame. It supersedes `chrome` for this
case rather than adding a second overlapping flag.

**Each of the six guided sims** — add `freePlay?: boolean` to props and forward
it to `SimulatorFrame`. No other change; `useStepRunner` already no-ops on
`steps: []`.

**Each of the six stubs** — replace the file body with a wrapper:

```tsx
// components/Playground/Desktop/MessagingApp.tsx
export default function MessagingApp() {
  return <GuidedMessagingTask goal="" steps={[]} freePlay onResult={() => {}} />;
}
```

Delete every dead prop while doing so — all nine are confirmed unreferenced.
This removes roughly **800 lines** of stub and leaves one implementation per app.

Two consequences to handle:

- **App Market gains its real catalogue.** `GuidedAppStoreTask` carries 12 apps
  across 4 categories against the stub's 8 in one flat list, and it scrolls once
  Phase 1 lands. That closes "the app market isn't scrollable and add some more
  apps" without writing new content.
- **Calendar becomes usable outside a lesson.** `GuidedCalendarTask` has working
  event creation, so "you should be able to add events whenever you want" is
  satisfied by deleting the stub, not by building anything.

**Delete the dead-end signage** — the three "Open a … lesson to …" lines vanish
with the stubs.

**Experimentation resets between lessons.** The learner asked for this
explicitly: *"if you do something that isn't part of the lesson it should go
away after the next thing, because we're allowed to experiment."* `FakeDesktop`
already has the mechanism — `appKeys` bumps a key on close to remount an app
fresh. Extend it so every app remounts when `LessonPlaygroundPane` changes
sub-lesson. The one deliberate exception is App Market installs, which persist
to `lac-sim-apps` on purpose because later lessons depend on them.

**Verify:** open all ten apps from the dock in *Opening apps 1/3* and confirm
each is the same program the later unit teaches. Then walk one lesson from each
of Units 5, 6, 7 and 8 to confirm guided mode is unaffected.

---

### Phase 3 — Files that really open

*Fixes: D.*

**`Desktop/filesData.tsx`** — replace the `body` descriptions with real content:

```ts
{ id: "vacation", name: "VacationPhoto.png", kind: "file", loc: "home",
  ext: "png", image: "/playgrounds/file-vacation-photo.png" },
{ id: "budget", name: "Budget.xlsx", kind: "file", loc: "home",
  ext: "xlsx", sheet: [["Item","Cost"], ["Rent","1200"], …] },
{ id: "invitation", name: "BirthdayInvitation.txt", kind: "file", loc: "documents",
  ext: "txt", body: "You're invited!\n\nSaturday the 14th, 2 o'clock\n42 Maple Street\n\nCake will be provided." },
```

Add `image?`, `sheet?` and `editable?` to the `Item` type. `FavoriteSong.mp3`
gets `/playgrounds/file-favorite-song.png` and a duration.

**New — `components/Playground/Desktop/FileViewer.tsx`** — opens a file *in a
window*, not a modal, using Phase 1's `DraggableWindow`, dispatching on `ext`:

| Extension | Window |
|---|---|
| `.txt` | Editable textarea with a Save button — the same editor `EditFileTask` uses |
| `.png` `.jpg` | The image, fit to the window, zoom in/out |
| `.xlsx` | A small grid with column headers and a totals row |
| `.pdf` | The existing PDF viewer from `GuidedBrowserTask` (title, pages, zoom) |
| `.mp3` | Album art, title, and a play/pause transport that runs a progress bar |

**`Desktop/FileManager.tsx`** — `handleItemDoubleClick` opens a `FileViewer`
window instead of setting `preview`. Keep `pendingPreviewClose` working so
`GuidedFilesTask`'s "Got it — Close" step still passes; it now highlights the
window's own X.

**Content** — `trackpad-double-click.json`: the intro says "double-click the
files below to open them", which becomes literally true. Keep the two target
files but say what each one opens into, so the learner knows a `.txt` and a
`.png` behave differently.

**Verify:** in *Double click*, open `GroceryList.txt`, `Budget.xlsx`,
`VacationPhoto.png`, `FavoriteSong.mp3` and `BirthdayInvitation.txt`. Each opens
in a window that drags, resizes and closes. The invitation is editable and saves.

---

### Phase 4 — Stop caging the learner

*Fixes the hard rule: "be able to do whatever you want, but then you just have
to restart the lesson, which isn't bad."*

Guided mode currently **blocks** every control except the one the step wants.
`GuidedDesktopTask.allow()` returns false for anything off-script, so clicking
maximize during a "minimize" step does nothing at all — no feedback, no
movement. That is the direct cause of "you shouldn't be having to force me to
click what you want me to click."

**Change the contract: highlight, don't gate.**

- `GuidedDesktopTask` — delete `allow()`. Every control stays live. `tryStep`
  already ignores actions that don't match the current step, so wandering off
  simply doesn't advance the counter. The yellow ring keeps showing the way
  back.
- `FileManager` — stop passing `filesEnabled={{ open: true }}` from
  `DesktopFileExplorerTask`. Unit 1's Files app gets the same toolbar as Unit
  3's. This is the concrete fix for "why isn't it the actual Files app?"
- Audit the other eleven guided sims for the same pattern (`enabled`,
  `disabled`, early-return-on-wrong-control) and remove the gates. Keep the two
  places where an action has a *taught consequence* — clicking **CLEAN NOW** on
  the scam popup and a wrong phishing verdict both fail deliberately, which is
  the lesson.
- The **Restart activity** button in `LessonModuleRunner` already exists and
  already remounts the playground. It is the escape hatch the learner named, so
  make it more prominent than "Skip this activity" rather than a peer of it.

**Verify:** in each Unit 1 guided lesson, deliberately click three wrong
controls, confirm they respond normally, then complete the step and confirm the
lesson still advances.

---

### Phase 5 — Menu bar and the troubleshooting desktop

*Fixes: C and F.*

**`GuidedDesktopTask.handleMenuBarClick`** — call `tryStep` on the close path
too:

```ts
if (menuPanel === panel) {
  setMenuPanel(null);
  tryStep((s) => s.action === "close-panel");   // ← the missing line
  return;
}
```

Add an outside-click handler on the desktop that closes the open panel *and*
reports `close-panel`, matching `FakeDesktop`. Closing a panel is one idea; it
should not matter which of the three ways the learner picks.

**WiFi panel** — make it real in both desktops. `FakeDesktop` already owns
`connectedNetwork` / `searchingNetwork` state and network switching; add a
**Disconnect** button on the connected row, and have `GuidedDesktopTask` render
that same live panel instead of its three static `<div>`s. ("Why is it not an
option to disconnect a network? There needs to be one, that is how it is in
real life.")

**`GuidedTroubleshootingTask`** — delete its private desktop:
- Wallpaper → `wallpaper(dark)` from `DesktopChrome`.
- Menu bar → `DesktopMenuBar`.
- Dock → the full ten-app `Dock` at `size="md"`. Scenario-relevant apps stay
  live; the rest open their normal windows, which is now free and correct after
  Phase 2. A dock of one icon is not a dock.

**Content** — `screen-wifi-icon.json` gains a step exercising disconnect and
reconnect, since the control will finally exist.

**Verify:** *Clock and Date*, *WiFi Icon*, *Battery Icon* — complete each three
ways (× button, clicking the icon again, clicking the desktop). All three must
advance the step. Then *Restarting your laptop*, checking it now looks like the
same computer as *Dock*.

---

### Phase 6 — Websites with something on them

*Fixes: H. "Every single URL and website that we use needs to actually have
text and be kind of like an actual website."*

The browser has 15 sites in `GuidedBrowserTask`. Give each one a real page —
navigation, a heading, several paragraphs of plausible copy, a footer — instead
of a heading and a stub. Shared page furniture so they feel like one web, with
per-site palettes so they don't feel like one page.

Priority order, by how often a learner lands there:

1. `petnews.example` — Unit 1's right-click lesson. Give it a front page:
   several stories, a sidebar, a "most read" list.
2. **The judgmental-cat payoff** — currently a picture and one caption. Make it
   a real article page: a headline, a byline ("Staff Correspondent, Cat Desk"),
   three short paragraphs of deadpan copy, a photo caption, and a comments
   section of one comment posted by a dog. The learner earned a joke; give them
   one.
3. `shop.example`, `google.com`, `wikipedia.org`, `weather.com` — heavy traffic
   from Unit 4.
4. `Desktop/BrowserApp`'s new-tab page — replace the six lettered squares with
   real tiles once the sites have content to preview.
5. The remaining nine.

Keep every URL on `.example` and keep the existing cookie / popup / download /
insecure behaviors exactly as they are — those are load-bearing for Units 4 and
10.

**Verify:** visit all 15 from *Guided browser* free play; each fills the window
with content and none needs scrolling to prove it is a real page.

---

### Phase 7 — The copy sweep

*Fixes: G, plus the dock label.*

| File | Change |
|---|---|
| `trackpad-two-finger-scroll.json` | Drop "then scroll back up" from `instructions`, the fourth intro bullet, and `drDigitalSuccess` ("You found it and scrolled right back!"). The code and the input are both at the bottom |
| `working-with-windows.json` | "the yellow strip at the top of the window" → "the strip at the top of the window with the app's name on it"; "the 'Notes' button in the taskbar" → "the Notes icon in the dock" |
| `apps-opening.json` | Point at the ten real apps now that they are real |
| `Dock.tsx` | Add an optional `short` label. `"App Market"` → `"Market"` in the dock; the full name stays in `aria-label`, the window title bar and every lesson |
| `filesData.tsx` | `BirthdayInvitation.txt`'s body stops being an instruction (covered in Phase 3) |

**Verify:** read every Unit 1 lesson against the running simulator and confirm
each sentence describes something on screen.

---

## Part 3 — Explicitly not changing

The feedback singled these out as working. Leaving them alone:

- **Zoom In and Out** — "that's pretty good, I like the zoom lesson"
- **Trackpad** — "the screen keyboard is good for trackpad"
- **Ports**, **Match the parts** — "I like the playground activity for match the
  parts, it's pretty good"
- **Putting the laptop to sleep**
- **Photos** — "the Photos app is not bad, Photos is fine." It still gets
  unified in Phase 2, since a Photos that is *fine* and a Photos that is *the
  same one Unit 7 teaches* are different things — but nothing about it is being
  redesigned.

---

## Part 4 — Order and risk

| Phase | Scope | Risk | Unblocks |
|---|---|---|---|
| 0 — Reading lessons | 2 components, 3 JSON | None | — |
| 1 — Real windows | 1 new component, 3 edits | **Highest** — touches every sim that renders an app | 2, 3 |
| 2 — One app per app | 6 stubs → wrappers, 7 sims + 1 prop | Medium; contained by the single import site | 5, 6 |
| 3 — Files that open | 1 new component, 2 edits, data | Medium | — |
| 4 — Stop caging | 12 sims, gate removal | Medium; needs a pass over every unit | — |
| 5 — Menu bar + troubleshooting | 3 components, 1 JSON | Low | — |
| 6 — Websites | 15 pages of content | Low, but the largest writing job | — |
| 7 — Copy sweep | 4 JSON, 1 component | None | — |

**Phase 1 carries the risk and everything else leans on it**, so it ships and
gets verified alone before Phase 2 starts. Phases 3–7 are independent of each
other and can land in any order.

Standing checks after each phase: `npx tsc --noEmit`, `npm run lint`,
`python3 scripts/check-lessons.py`, a production build, and a real walk through
the affected lessons in the browser — not just a screenshot of the first step.

## Part 5 — What this leaves open

From `CONSISTENCY_AUDIT.md`, untouched by this plan and still true afterwards:

- **B** — Unit 12 and the Final Capstone are read-only; seven lessons promise
  practice they don't deliver.
- **C** — `drag-sort-files`, `spot-the-fake` and `url-navigator` are built and
  wired but no lesson uses them. `message-reply` and `compose-email` become
  formally dead once Phase 2 lands and should be deleted then.
- **D** — Single-lesson read-only modules in Units 7 and 8.
- **E** — `guided-troubleshooting`'s `scenario` field is decorative; the mode is
  inferred from step actions. Phase 5 touches this file and is the natural
  moment to either make it load-bearing or delete it.
