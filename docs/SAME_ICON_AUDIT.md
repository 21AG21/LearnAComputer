# One icon, one app — and steps you can actually finish

Asked for: *"clicking any icon brings up a different UI than if you clicked that
same icon in a different lesson, ambiguities/vagueness anywhere for any potential
issues, anything that could make someone frustrated."*

Three sweeps: the dock in every simulator that draws one, a cross-check of every
step target against the data its simulator actually holds, and a read of all 198
lessons for copy that names a control by a word the screen does not use.

Everything below was reproduced in a running browser before it was written down,
and driven again afterwards.

---

## 1. The same icon, three different computers

`docs/UI_UNIFICATION.md` collapsed the ten dock apps onto one implementation
each, so `Desktop/MailApp` is now seven lines around `GuidedEmailTask`. What it
did not settle is **what happens when you click the icon**, and there were three
different answers inside Unit 1 alone.

| Simulator | Lessons | Clicking a dock icon gave you |
|---|---|---|
| `FakeDesktop` | Units 1, 3, 9, and every `DesktopLaunch` lesson | the real app |
| `GuidedDesktopTask` | Unit 1 window lessons, the Final Assessment | a hand-drawn sketch of the app |
| `GuidedTroubleshootingTask` | Units 1, 10, 11 — nine lessons | **nothing at all**, for seven of the ten icons |

### The sketches

`GuidedDesktopTask` drew its own idea of each app: a browser that was four lines
of prose about tomatoes, a Photos app of six colored squares, a Files app of
three list items. A learner met that browser in *Working with windows*, then met
the real one in Unit 4.

### The dead icons

`GuidedTroubleshootingTask` rendered all ten icons and wired up two or three,
with this at the end of the handler:

```tsx
// else: no-op for decorative dock items
```

Click Photos in *When Something Goes Wrong* and the computer did not react. In a
unit whose entire subject is *what to do when the computer stops responding*,
seven icons that silently ignore you is the worst possible lesson.

**Fixed** by `components/Playground/Desktop/AppBody.tsx` — one place that answers
"what is inside a window when you open this app". `GuidedDesktopTask` renders it
with `pointer-events-none`, because that lesson is about the window frame and a
stray click inside should not start a video call; `GuidedTroubleshootingTask`
renders it live in a draggable window for any icon its scenario has no script
for. The sketches are gone.

### Two title bars in the troubleshooting sim

`UI_UNIFICATION.md` fixed doubled window chrome in three sims and missed this
one. `GuidedTroubleshootingTask` is a desktop and draws its own menu bar, but it
was still asking `SimulatorFrame` for a title bar — so every troubleshooting
lesson had a blank bar on top of the real one, carrying minimize and close
buttons that did nothing. Now `chrome={false}`, like every other sim that owns a
desktop.

(Its root also had to change from `flex-1` to `h-full`: with the frame's chrome
off the parent is a plain block, and a `flex-1` child of a block collapses to the
height of its content. Caught in the browser, not by the type checker.)

### Two Settings apps and a third one

The troubleshooting sim drew its own Settings twice — a Privacy card with a
toggle called **"Allow websites to track me across sites"**, and a separate About
panel with a Restart row. Unit 9's Settings calls that toggle **Cross-Site
Tracking** and has nine sections in a sidebar. Three different Settings apps, and
the lesson copy matched none of them.

Both now open the real `SettingsApp` in a window. It gained two optional props:
`initialSection`, and an `onRestart` that adds a Restart row to About — only when
passed, so a beginner browsing Settings in Unit 9 does not find a button that
reboots the computer. The row renders above the specifications, because below
them it fell under the fold of the window and the step said "Click the Restart
button" about something off screen.

---

## 2. Steps that could never be completed

Two lessons named a target the simulator does not have. Both left the learner on
a step that no click could finish.

### `Cafe Guest` — in the Final Assessment

```json
{ "say": "Join the café's network.", "action": "join-network", "target": "Cafe Guest" }
```

The sim offers `Coffee Shop Free WiFi`, `CoffeeShop-Staff` and `Neighbor 5G`.
There is no `Cafe Guest`, so nothing highlighted and

```tsx
tryStep((s) => s.action === "join-network" && s.target === network)
```

could not match whatever the learner clicked. Joining the café network still
showed the sign-in page, so the sim moved on while the banner stayed on step 2 of
5 forever. **Nobody could finish the final assessment.**

### `select-day` — both calendar lessons, at step 1

```tsx
tryStep((s) => s.action === "select-day" && (s.target === String(day) || s.target === undefined));
```

Lessons name the day the way a person would — `"Wednesday"` — and the grid is
numbered 1–31. The name was compared against the number, so it never matched, and
the highlight (`name === step.target`) never fired either. Both `guided-calendar`
lessons in the course were unreachable past their first step.

`dayMatchesTarget` now resolves a weekday name against the month's start day, so
every Wednesday pulses and any of them completes the step. A bare number still
works for a lesson that wants one specific date.

While in there: the column headers were `S M T W T F S`, in which T and S each
stand for two different days. Now `Sun Mon Tue Wed Thu Fri Sat`.

### The guard, so it cannot come back

`scripts/check-lessons.py` gained an **UNKNOWN TARGET** check that reads the
photo labels, app names, contact ids, phishing subjects, settings sections and
WiFi networks straight out of the components and fails the build when a step
names something that is not in them. Confirmed by reintroducing `Cafe Guest`:

```
1 ERROR(S) FOUND:
  - UNKNOWN TARGET: final-troubleshooting step 2 asks for
    guided-troubleshooting.join-network 'Cafe Guest', which the simulator does not have
```

---

## 3. Checks that accepted the wrong answer

Three handlers threw away the `target` the lesson gave them. In guided mode that
is mostly hidden by the step order; in **assessment mode** `tryStep` scans every
unmet objective, so the wrong action ticks the right box.

| Where | Was | Now |
|---|---|---|
| `GuidedPhotosTask.handleFavorite` | `s.action === "favorite" \|\| s.action === "unfavorite"` — any photo, either direction | the photo and the direction must both match |
| `GuidedPhotosTask.handleDelete` | `s.action === "delete"` — any photo | honors `target` |
| `GuidedAppStoreTask.handleInstall` | `s.action === "install"` — any app | honors `target` |

The favorite one was the worst of the three: "un-favorite it" was satisfied by
favouriting it again.

`final-photos` was leaning on that hole. Its third objective read *"The photo of
the koi is marked as a favorite"* with **no target at all**, so favouriting
anything passed it. It now names `Koi Pond` and the check enforces it.

---

## 4. Silent failures

A control that does nothing teaches nothing, and this course's audience reads
"nothing happened" as "I broke it".

- **Joining a WiFi network you have no password for.** Clicking Join on
  `CoffeeShop-Staff` spun for a second and then quietly connected to nothing. It
  now says *"CoffeeShop-Staff needs a password you do not have. Try the guest
  network."* Same for the neighbor's network in the home-WiFi scenario.
- **Reopening the wrong app mid-scenario.** In the frozen-app lesson, clicking
  Mail in the dock called the force-quit recovery path and announced that *Notes*
  was working again. Reopening now only counts when the current step actually
  asks for it; otherwise the icon opens its real app.

---

## 5. Copy that named controls the screen does not have

Every lesson's step text was read against the labels its simulator renders. Most
of what a regex flags here is prose, so the honest count is small:

| Fixed | Why |
|---|---|
| `final-files` — "out of the bin" ×2 | the Files sidebar says **Trash** |
| `final-photos` — "in the bin" | Photos says **Recently Deleted** |
| `final-photos` — "favorite" ×2 | the sidebar section is **Favorites** |
| `facetime-basics` — "the red phone button" | the control is labelled **End call**, and the next lesson in the same module already called it that |
| `final-files` step 5 | said the letter was *out* of the Trash where the step deletes it |
| `final-photos` step 2 | described step 3's outcome, so two objectives read identically |

Three things a raw grep flagged that are **correct as written**, recorded so the
next pass does not "fix" them:

- *"the Trash or Recycle Bin"* in the Unit 3 mission — that is the learner's own
  computer, and naming both is right.
- *"your computer's app store"* in the Unit 8 mission — same reason. **App
  Market** is the name of the simulated one only.
- `color` in the accessibility lessons and `color` in the Tab lesson — each
  matches the label on the control it points at (**Color Filters** in Settings,
  **Pick a Color** in the browser).

### One real brand, in a phishing exercise

The phishing set asked the learner to judge a link from **Bank of America** — a
real bank, appearing nowhere else in the course — alongside a scam impersonating
**First National Bank**, which is the bank everywhere else: in the browser's site
list as `firstbank.example`, and in the password-reset scenario. The same screen
asked a beginner to hold two banks in mind for no reason. The safe link is now
First National Bank at `firstbank.example`.

A duplicate `"Complete Purchase"` entry, identical to `"Complete Your Purchase"`
and referenced by nothing, was deleted.

---

## Verified

Driven in the browser, not just compiled:

- *Working with windows* — the dock opens the **real** Notes and the **real**
  browser (tab strip, address bar, Reading List / History / Downloads, zoom).
- *When Something Goes Wrong* — Photos opens from the dock in a draggable window
  with the same sidebar and the same photographs as Unit 7.
- *Restarting your laptop* — one menu bar, the real Settings app on About,
  Restart visible without scrolling, through the confirm dialog to
  "Your computer restarted successfully."
- *Using WiFi You Do Not Own* — the staff network refuses with a reason, the
  guest network reaches the café portal, and Settings ▸ Privacy ▸ **Cross-Site
  Tracking** finishes the lesson.
- *Calendar and Reminders* — headers read Sun–Sat, all five Wednesdays pulse,
  clicking one advances to step 2 of 10.
- `npx tsc --noEmit`, `npm run lint` (0 problems), `scripts/check-lessons.py`
  (198 lessons), `npm run build`, and `/dev/mount-check` (166 activities).

## Checked and found clean

Recorded so the next pass does not redo it:

- **Step preconditions.** Every lesson was walked to check that a step's setup
  actually happens first: a cookie banner dismissed on the page that has one, a
  download opened after it is downloaded, a call control used during a call, an
  email field filled while a compose window is open, a photo edited after a photo
  is picked. Twelve flags, all false — the four that looked wrong are assessments,
  where objectives are order-free by design and each one names its own site or
  person.
- **Highlight wiring.** Every `kind` string the step-highlight switch can return
  was matched against what the components render. One is dead (`open-btn` in the
  App Market) and no lesson uses the action that would reach it. All the rest
  resolve.
- **Every other step target.** After the two fixes above, all 198 lessons pass
  the new UNKNOWN TARGET check against the simulators' real data.

## Still open

- **The error-code scenario still draws its own browser.** `support.example/help`
  is not one of the browser's fifteen sites, so the paste-the-error-code page is
  still a bespoke card with a fake address bar — no tab strip, no lock icon, no
  window frame. Same fix shape as the password reset below: give
  `BrowserSimulator` the page as children and put it in a `DraggableWindow`.
  Lower stakes than the Mail one was, because no unit teaches a support site the
  way Unit 6 teaches Mail, but it is the last hand-drawn browser in the course.
  *(The `public-wifi` captive portal is the same story and would come along with
  it — a captive portal really is a web page and belongs in browser chrome.)*
- **`open-btn` in `GuidedAppStoreTask`** is declared in the highlight switch and
  rendered nowhere. No lesson uses the `open-app` action, so nothing is broken.
- **Two spellings of one word across two apps** — Settings says *Color
  Filters*, the browser says *Pick a Color*. Left alone deliberately: each lesson
  matches its own control, and the alternative churns lesson targets to fix
  something no learner is asked to type.
- **`facetime-basics` and `facetime-features` are branded slugs.** Their titles
  and copy are clean; the slugs cannot be renamed because progress is stored by
  slug.

---

## Round two (2026-07-28): the password reset now uses the real apps

The longest-standing entry on the list above is closed. Unit 11's
*Recovering a Forgotten Password* used to draw its own Mail — a flat card
captioned "Mail / Inbox" with one row in it — and its own browser, a card with a
gray strip and a domain in it. Both floated on the wallpaper with no window
frame. A learner reaches this lesson **after nine Unit 6 lessons in the real
Mail app**, clicks the same dock icon, and gets something that shares only a
name. That is the exact failure this audit exists to catch, and it was the last
one on the main lesson path.

**What it is now:** the real `GuidedEmailTask` — Compose, the
Inbox/Sent/Drafts/Spam/Archive sidebar with counts, the real reading pane with
Reply / Forward / Mark as spam / Move to Archive / Delete — and the real
`BrowserSimulator` chrome, with the tab strip, the lock icon, and an address bar
that changes from `firstbank.example` to `firstbank.example/reset?token=abc123`
when the emailed link is followed. Both sit in the standard `DraggableWindow`.

**How, without disturbing nine lessons.** `GuidedEmailTask` gained four purely
additive props — `seedInbox`, `highlightEmail`, `highlightEmailAction`, and the
`onOpenEmail` / `onEmailAction` callbacks. Nothing existing reads them, and the
host drives the app from its own step list rather than the sim owning steps it
does not have. `seedInbox` entries may carry an `actionLabel`, which renders as
a button at the foot of the message body: a link inside an email, which is what
the lesson is actually about. Reused by the next lesson that needs a message the
default inbox does not have.

**One real defect found on the way.** The first fitting put a 520px-wide window
on a 435px-wide desktop. It hung off the right edge, produced a sideways
scrollbar inside the sim, and cut off the bottom of the page — which on step 1
is the ringed **Forgot password?** link the learner is being told to click. So
`DraggableWindow` gained an opt-in `fit` prop that measures its desktop on mount
and shrinks to it. Opt-in, not automatic: `FakeDesktop` cascades several windows
deliberately, and clamping would collapse that cascade on a narrow pane. All
five single-window frames in `GuidedTroubleshootingTask` now use it.

**Verified** by playing the lesson end to end in the browser — six steps, a real
Mail inbox with the bank's message ringed at the top, the link inside the body,
the address bar carrying the reset token, through to "Signed in as
you@example.com" and *Lesson complete*. Then the whole suite: solve-check
132/132, mission-check 18/18, desktop-check, recovery-check, hostile-check,
demo-check, check-lessons (198), check-actions, spelling, `tsc`, `lint`.
