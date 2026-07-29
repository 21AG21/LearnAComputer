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

- **A whole-course ring audit that is stable enough to gate on.** Round four
  below built the reveal that stops a ringed control hiding below the fold, and
  a check that catches it reliably *for one named lesson*. What is still open is
  the whole-course sweep: it reports 6–10 findings on identical code, because
  the sims are almost never at rest during an automated run. Making that
  trustworthy needs a notion of "the UI has settled" that this codebase does not
  have yet. Until then the sweep prints leads and exits 0, on purpose.
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

## Round three (2026-07-29): no hand-drawn browsers left

The other two entries are closed, and with them the whole "a dock icon opens
something the course does not teach" category.

**`support.example/help`** — the error-code lesson's support site — swallowed the
entire desktop (`view === "browser-support"`) and wore a gray strip with a domain
in it for an address bar. Opening a browser does not make your desktop vanish, so
it is a window now, over the crashed app, in the real browser chrome: tab, lock
icon, `support.example/help` in the address bar. The `View` union lost a member;
a `supportOpen` boolean replaced it.

**The café captive portal** was a bare card on the wallpaper. It is now a browser
window at `cornercafe.example/wifi`, which also makes the lesson's own sentence
land — *"That page is called a captive portal"* reads very differently when the
learner can see it is a web page with an address, in the browser they already
know, rather than a mystery panel the computer produced.

**Both windows can be closed without stranding anybody.** Closing the portal or
the support page leaves a desktop that says *"Nothing is open"* and names the dock
icon that brings it back; the dock handler reopens it. Verified by closing the
support window mid-lesson and reopening it — the step banner was still on step 4
and the pasted state survived.

**The same defect, a second time.** The café portal's ringed **Continue** button
finished 2px below the bottom edge of its window. Same class as the
*Forgot password?* clipping in round two, found the same way — by measuring the
ringed element against the window rect in a live browser, not by any harness.
Both are fixed by height, but the honest note is in *Still open* above: the
general answer is to scroll the ringed control into view, and it is worth
building the third time this appears rather than the fourth.

**Verified** by playing both lessons end to end — *Finding Help Online* six steps
to "Photos is working again", *Using WiFi You Do Not Own* five steps through the
café portal to Cross-Site Tracking off — then solve-check 132/132, mission-check
18/18, desktop-check, recovery-check, hostile-check, demo-check, check-lessons
198, check-actions, spelling, `tsc`, `lint`.

## Round four (2026-07-29): the glow the learner cannot see

The *Still open* item above — "a ringed control can still land below the fold" —
is now half closed, and the honest half of that sentence is worth as much as the
closed half.

### The product fix, which works

`SimulatorFrame` now brings the highlighted control into view. It walks up from
the ring, scrolling any container **inside the frame** that can be scrolled.
Deliberately not `scrollIntoView`, which would also scroll the lesson page and
yank the reading pane around for a control that was never off the *page*.

It reveals each control **once**. Without that, every mutation re-scrolled, so a
learner who scrolled up to re-read something got dragged back on the next
animation frame. The glow is a hint, not a leash.

Measured, both directions, on the café portal with its window deliberately
shrunk to 300px: reveal off → the ring is off screen and the check catches it
3 runs out of 3; reveal on → clean 3 runs out of 3. That is the exact defect
that shipped twice, cured.

### The check, and what it is honestly worth

`npm run ring-check` asks the question no other harness can: *is the pulsing
ring actually on screen?* solve-check cannot — the solver reaches controls
through the DOM and never needs to see them. A human tester cannot reliably —
they scroll without noticing they did.

**Filtered to one lesson it is a gate.** Clean 3/3, planted bug caught 3/3.

**Across the whole course it is a lead generator, and it exits 0.** Three
consecutive runs of identical code gave 8, then 6, then 10 findings, with the
offending step changing between runs. The cause is inherent: a ring is
legitimately out of view for a frame or two whenever a panel is mid-render or a
window is opening, and across 170 lessons an automated run is almost never at
rest.

Four mechanisms were tried before accepting that:

| Where the audit lived | Findings |
|---|---|
| Solver loop, 2 animation frames | 42 |
| Solver loop, 150ms | 10 |
| Solver loop, 600ms | 12 |
| Inside the reveal, last-observation-wins | 6–10 |

The first number is the instructive one. **42 lessons "failed" and not one was a
real defect** — the audit was timing the reveal rather than measuring the
product. A gate that reports 42 phantom failures is worse than no gate, and
tuning the delay until the number looked green would have buried that rather
than fixed it. So the whole-course mode prints leads, names the command to
confirm each one, and returns success.

### A flaw in the design, recorded because it is a trap

The detector lives **inside** the thing it tests. The first negative control
disabled the reveal and expected the check to fire — it did not, because the
recording sits after the scrolling in the same function. A fixer cannot be
falsified by switching the fixer off. The control that works instead makes the
clipping **unfixable**: an `overflow: hidden` container the reveal cannot
scroll. Anyone extending this must use that shape.

**Verified**: solve-check 132/132, mission-check 18/18, desktop-check,
recovery-check, hostile-check, demo-check, check-lessons 198, check-actions,
spelling, `tsc`, `lint`.

## Round five (2026-07-29): the check earns its keep

Round four shipped a whole-course ring sweep and labelled it advisory. Advisory
output is worthless unless somebody actually works it, so this is that pass:
every lead re-run filtered to its own slug, which is the mode that is
repeatable.

### One real bug, in Unit 1

**Dragging a window could throw away the control the next step asks for.**

*Working with windows* is lesson 6 of Unit 1. Step 1 says drag the window by its
title bar. Step 2 says drag the striped corner handle at the bottom-right to
resize it. `DraggableWindow` clamped a drag to `y >= 0` and nothing else, and the
desktop it lives in is `overflow-hidden`. So a learner who dragged the window
down and right — doing exactly what step 1 asked, just further than the author
imagined — pushed the resize handle out through the desktop's edge, where it was
clipped out of existence. Step 2 then put its pulsing ring on a control that was
not on screen at all.

Measured before the fix, at a 1400x760 window: desktop bottom `740`, resize
handle at `792`. Gone. The title bar stayed visible, so a learner *could* drag
the window back up and recover — but nothing says so, and this is the audience
for whom "the thing I was told to click isn't there" ends the session.

Fixed by clamping both drag and resize to the desktop, with the bounds measured
at mousedown (the move handler is bound once with `[]` deps and would otherwise
close over a stale size). The window now pins at the edge: after dragging +900px
in both directions it sits at exactly `(maxX, maxY)` and the handle is still
inside. `ring-check -- working-with-windows` went from FINDING to CLEAR.

**This is the check paying for itself.** Nothing else in the repo could see it:
solve-check drags by a fixed small delta and never over-drags, so it has always
passed this lesson and always will.

### Leads that are reproducible but not yet diagnosed

Recorded honestly rather than left implied:

- `popups-ads` and `popup-accident` — the scam popup's ✕. The dialog carries
  `animate-pop-in`, a scale animation, so the reveal may simply be measuring it
  mid-flight; that would make these artifacts, not defects. Not confirmed either
  way. Both lessons pass solve-check and recovery-check, so the button is
  reachable.
- The Photos grid (`photos-app`, `photo-favorites`, `recently-deleted`, and
  others) — a photo below the fold of a scrolling grid that the reveal did not
  reach.
- The accessibility panel (`a11y-invert` and siblings) looked clean when
  measured by hand at a tall viewport, but a screenshot at a **short** one shows
  *Invert Colors* genuinely cut off at the bottom of the Settings window. Height,
  not the reveal, is the variable to chase there.

None of these blocks a lesson. All deserve the same treatment the window bug
got: reproduce filtered, measure the rect by hand, fix the cause.

**Verified**: solve-check 132/132, desktop-check, recovery-check, hostile-check,
demo-check, mission-check 18/18, check-lessons 198, `tsc`, `lint`.

## Round six (2026-07-29): the learner who clicks the wrong thing

Round five's commit message contained the lead for this one, in a sentence
written about a different bug: *"solve-check drags by a fixed small delta and
never over-drags."* Generalize that and it is the standing weakness of every
harness here — **they all do the moderate, correct thing.** Nothing in the repo
has ever asked what happens when a learner does the reasonable-but-wrong thing.

So: *Working with windows*, Unit 1 lesson 6, step 1 — *"Drag the strip at the top
of the window to move the window."* A learner clicks the red ✕ instead.

**Everything disappears.** The window is gone, the banner still says drag the
strip at the top of the window, and there is no glow anywhere on screen. The
learner is looking at an empty desktop being told to manipulate a window that is
not there, six lessons into their first unit.

It was *recoverable* — clicking Notes in the dock brings it back — but that is
what **step 4** teaches. A learner who closes it at step 1 has not been told, and
has no reason to guess. "Recoverable if you already know the thing this lesson
has not taught you yet" is not recoverable.

Now the desktop says so, and the dock icon glows:

> **You closed the window.**
> Nothing is broken — click **Notes** in the row of icons at the bottom to open
> it again.

The glow matters more than the sentence: "look for the glow" is the one
instruction this course gives a learner who is lost, so when the way forward is a
dock icon, that is where the glow goes. Verified end to end — close at step 1,
follow the glow, window returns, still on step 1 of 7 — and the hint correctly
stays away when the learner closes the window at step 7, where closing is the
step.

**No harness could have found this.** solve-check only ever performs the current
step's action, so it never clicks ✕ out of turn; recovery-check tests the one
failure path the sims deliberately model (the scam popup). This came from asking
a question none of them asks.

### What this suggests, and is not yet built

The generalizable version is a harness that plays each lesson **wrongly on
purpose** — press every other control before the right one, close what the step
needs, over-drag, double-click what wants one click — and asserts the learner is
never left with no ring and no way back. That is a real gap, and it is the
honest next item rather than a claim of coverage.

**Verified**: solve-check 132/132, desktop-check, recovery-check, hostile-check,
demo-check, mission-check 18/18, ring-check on the lesson, check-lessons 198,
check-actions, spelling, `tsc`, `lint`.

## Round seven (2026-07-29): the pitch was selling a feature we deleted

Not a code defect. Worse, for a product whose job is to make money.

Accounts, sign-in and cross-device sync were removed on 2026-07-28. The sales
material was rewritten the same day — but not completely, and nobody had read it
end to end since. What was left:

| Where | What it told a salesperson to say |
|---|---|
| `SALES_PLAYBOOK.md` §8, under **"Shipped and demo-safe"** | *"accounts with email-code sign-in and cross-machine progress"* |
| §5, locked-down computers | *"signing in (an email and a code, no passwords) saves their progress across machines"* |
| §7, machine checklist | *"learners should **sign in** … sign-out cleans a machine between learners"* |
| §5, elementary schools | *"our accounts require an email, which isn't COPPA-appropriate"* |
| `COLD_CALL_KIT.md` §11 | listed *"under-13 accounts"* and an instructor dashboard *"until the migration is applied"* as roadmap |
| `DEMO_PRIYA_ELDER_CARE.md`, the HIPAA answer | *"The whole data model is an email address and a list of finished lesson names"* |

**The section titled "Ground truth — never claim what isn't shipped" contained a
claim that isn't shipped**, contradicted eighteen lines further down by
*"Removed on purpose, 2026-07-28 — do not offer to build them back on a call."*
The same page told a caller both things.

This is the most expensive kind of error this project can make, and it is worth
being blunt about why. The privacy story **is** the pitch — §1 says so, and
invites the buyer to open their developer tools and check. A salesperson who
promises sign-in from §5 and then hands over a product with no sign-in has not
just lost a feature argument; they have broken the one claim the buyer was told
to verify. On the exact axis the whole sale rests on.

All of it is corrected. The demo-safe list no longer mentions accounts; the
locked-down answer describes what actually happens (a calm banner, finish the
unit in the session); the shared-machine step is "Reset all progress" instead of
sign-out; the elementary-school answer says plainly that nothing is collected
from anyone, refuses to imply a COPPA review that has not happened, and gives
the real reason for the poor fit (the writing is aimed at adults). The cancelled
classroom build in `MASTER_PLAN.md` is now headed **CANCELLED** with the reason,
kept only as a record of what was rejected.

Also fixed: the playbook's header pointed at `PROGRESS_MONITORING.md`, deleted
with the feature, and a qualifying question still framed reporting needs as
setting up "the instructor-dashboard conversation" — it now says to ask that
question in order to **disqualify**, because finding out on call one beats
finding out in month two of a pilot.

**Checked and correct:** 198 lesson files, 14 units, 18 real-world missions —
every count the playbook quotes matches what is on disk.

### The guard, so it cannot come back

Grepping by hand the same hour is the advice, and advice is not a guard. So
`python3 scripts/pitch-check.py` now reads the four sales-facing documents and
fails when one of them promises a capability the code no longer contains, points
at a doc that has been deleted, or quotes a lesson/unit/mission count that does
not match `content/lessons/`. A removal note is explicitly allowed — "Removed on
purpose … accounts and sign-in" is the sentence that stops a caller offering to
build it back, so the check excuses a forbidden phrase when the surrounding
lines frame it as gone.

Negative-controlled by restoring the exact sentence that shipped —
*"signing in with an email and a code gives them cross-machine progress"* — and
watching it fail on both patterns, then pass again on removal.

Deleting a feature is not done when the code is gone. The pitch outlives the
build, gets read under time pressure, and was the one artifact nobody ran a
harness against. Now something does.

## Round eight (2026-07-29): a harness that does the wrong thing

Round six ended by naming a harness that did not exist: one that plays a lesson
**wrongly on purpose** and checks the learner is never stranded. This is it.

`npm run stray-check` mounts each guided activity, does the thing the lesson did
not ask for — closes the window the step depends on — and asserts one invariant:

> **After a stray click, the learner still has a way forward.** A ring to follow,
> or words on screen saying what happened. Never nothing.

Never nothing, because nothing is where a beginner concludes they broke it and
stops. It runs against `/dev/stray-check`, a page whose only job is to mount one
activity under script control — solve-check and mount-check both walk their own
queue on a timer, and this needs to stop on a lesson while a script misbehaves.

### What it found immediately

**Ten more lessons with the Unit 1 bug — the entire accessibility unit.**

`a11y-invert`, `a11y-contrast`, `a11y-bold-text`, `a11y-brightness`,
`a11y-colour-filters`, `a11y-combining`, `a11y-larger-pointer`,
`a11y-reduce-motion`, `a11y-spoken-descriptions`, `a11y-turning-it-back`. Every
one is a `guided-settings` lesson: `FakeDesktop` with `autoOpenApp="settings"`.
Close the Settings window and you get a bare desktop — no glow, no words, and a
banner still naming the app.

Round six fixed this shape in `GuidedDesktopTask`, one component. It never
occurred to me that `FakeDesktop` had the same hole, and no amount of staring
would have told me — the harness did, in one run.

That it landed on **Unit 13** is worth sitting with. These are the lessons for
learners who already find screens hard to read: low vision, tremor, colorblind,
easily disoriented. A blank screen costs them the most, and they are exactly the
learners least likely to guess that a dock icon brings it back.

Fixed at the right level: `FakeDesktop` now shows the recovery line and glows the
dock icon whenever its lesson's app is closed. One fix, eleven lessons, and every
future sim that uses `autoOpenApp` inherits it.

### The negative control is a real one

Delete the "You closed the window" block from `GuidedDesktopTask` and run
`npm run stray-check -- working-with-windows`: it fails, naming the lesson. Put
it back: it passes. Both were run. That is the bug this was built for, and a
check that cannot fail on the bug it was built for is decoration.

### Result, and the size of the claim

Whole course, after the fix: **24 guided lessons had a window to close and all
24 leave the learner a way forward. 101 had no window to close and were skipped.**

That second number is the honest measure of this harness, so it goes in the same
sentence as the first. It exercises one stray action — closing the window — and
only on the quarter of lessons that have one. It does not press Escape, click
the dock mid-step, double-click what wants a single click, or work through every
other control before the right one. Each is the same shape and would slot in
beside the close.

A harness is worth exactly what it tries. This one tries one thing, on 24
lessons, and that one thing was worth eleven bugs.

## Round nine (2026-07-29): a warning about a hazard that no longer existed

Round eight ended by listing the wrong moves stray-check does not try. Escape
was one. Before automating it, the obvious question: what does Escape actually
do? Two lessons already carried a `warning` about it, which is a strong hint
that somebody once found out.

> `unit-2-assessment`: **"Do not press Escape during this activity — it will
> exit the simulator."**
>
> `kb-escape`: **"Do not press Escape right now — it can close what you are
> working on. Just read along and click Continue when you are ready."**

Both are false. **There is no Fullscreen API anywhere in this product.** It was
removed at some point and nothing was left that Escape could exit — verified by
grep across `components/`, `app/` and `lib/`, and then by pressing the key in a
running lesson: `document.fullscreenElement` was `false` before and after, and
nothing on screen changed. The only Escape handler in the entire codebase is in
`FileManager`, where it cancels an inline rename, which is exactly what Escape
ought to do.

So the course was telling a nervous beginner not to press a key, to protect them
from a consequence that could not happen.

### Why this is worse than a stale string

The pitch's first differentiator, in `SALES_PLAYBOOK.md` §1:

> *The simulated computer cannot be broken, so the fear that stops this audience
> — "what if I press the wrong thing?" — is engineered out.*

An amber warning banner saying *do not press this key* is that fear, engineered
back in, on the product's own screen. And the worse of the two is `kb-escape` —
**the lesson whose subject is the Escape key.** It taught what Escape does and
then told the learner not to try it. For an audience whose whole problem is being
frightened of the keyboard, that is the exact wrong instruction, in the exact
wrong lesson.

Both warnings are gone. `kb-escape` now ends with an invitation instead:

> *Go ahead and press it right now if you like. On this page it does nothing at
> all — like everything here, it is safe to try.*

### The rest of the residue

The removed feature left more behind, all of it now cleared: four dead
`:fullscreen` CSS rules in `globals.css`; `CLAUDE.md` documenting *"`LessonPlaygroundPane`
uses the native Fullscreen API"* as a Key Pattern and listing a "fullscreen
toggle" in the file map; and three code comments describing a "shared fullscreen
session". A reader of any of those would have believed the warnings.

### The rule this earns

**A warning is a claim, and claims rot.** When a `warning` says a key or action
will do something, the hazard has to still be real — and nothing checks that,
because a warning is prose. Round seven learned the same lesson about the sales
material and got `pitch-check` out of it. This one is smaller: eight lessons
carry a `warning`, they were read one by one, and the six that remain describe
things that genuinely still happen (a screen going dark, a screen reader taking
the keyboard, a scam popup, toolbar clicks not counting).

## Round ten (2026-07-29): the check that found nothing

stray-check gained its second wrong move, and this round's honest headline is
that **it found no bug.** Writing that down matters as much as the rounds that
did, because a harness only ever reports one of two things and only one of them
is ever celebrated.

### Why double-click, specifically

**Unit 1 teaches double-clicking.** Learners who have just been taught it
double-click everything afterwards — and this repo has already shipped exactly
that bug once, when double-pressing **Next** advanced two lessons and a whole
page of teaching went by unseen. So the prior was strong: `STRAY=double
npm run stray-check` double-clicks the highlighted control and asserts a single
gesture never advances more than one step. A skipped step is worse than a dead
end, because nothing on screen says it happened.

### The first version was a check of step 1

It reported all clear across 36 lessons, which was meaningless: it double-clicked
only each lesson's **first** highlighted control, and for most lessons that is
the dock icon that opens the app. It never reached the interesting steps.

The interesting steps are findable in the content, so they were looked up rather
than guessed: **67 places where two consecutive steps share an action and a
target.** `a11y-turning-it-back` toggles `invert-colors` at step 2 and again at
step 3; two lessons zoom twice in a row. Those are precisely where one gesture
could satisfy two steps — and the first draft never got to any of them. It now
walks the lesson, double-clicking each successive ring, which is also a truer
model of the learner being simulated.

### The result, and what actually protects it

Whole course: **36 lessons walked by double-click, none skips a step.**

The protection is real and already in the code — `useStepRunner.completeStep`:

```ts
if (last && last.idx === stepIndex && now - last.t < 150) return;
```

Two clicks in one tick both read the same `stepIndex`, and the second is
refused. That guard was added after the earlier double-click bug; this round
proves it holds everywhere, not just where it was first noticed.

### Negative control, on the thing that does the work

Removing that one line makes `a11y-turning-it-back` fail immediately —
*"one double-click advanced 2 steps (0 → 2)"* — and restoring it passes. The
control targets the guard rather than the symptom, which is the only version
worth running: it answers "would this check notice if the protection regressed?"
with a yes that was observed, not assumed.

### The rule

A green run is only worth the question it asked. This one asked a narrow
question — 36 lessons, one gesture — and got a real answer. The first draft
asked a question that sounded identical and answered nothing, and the only
reason that was caught was checking the content for cases the check *should*
have flagged. **When a new check comes back clean, go find what it should have
caught before believing it.**

## Round eleven (2026-07-29): the harness was skipping most of the course

Round ten ended with two harnesses disagreeing about `photos-app` — ring-check
reporting a clipped ring, stray-check reporting no ring at all — and that
disagreement written down as undiagnosed. This is the diagnosis, and the answer
was that **stray-check was wrong, about most of the course.**

### The gate it never opened

Most guided lessons open behind `DesktopLaunch`: a dark banner reading *"Open
Notes — click the glowing icon in the dock"*, with **no `SimulatorFrame` until
the learner clicks**. stray-check waited eight seconds for a frame that could
never appear, gave up, and skipped — 8 seconds wasted per lesson, and the skip
reported under a label that read like a property of the lesson.

Two commits ago this file said *"24 guided lessons had a window to close and all
24 recover; 101 had no window to close."* The second half was not true. Many of
those 101 were never opened. The honest version of that sentence was
"this harness never got past the front door of most of the course", and it took
a contradiction with another harness to notice.

It now clicks the gate, the way a learner does. Coverage, same run, same day:

| Mode | Before | After |
|---|---|---|
| double-click | 36 lessons | **104** |
| close-the-window | 24 | 27, with 71 lessons now actually opened |

### What the new coverage found: dead window controls

Three Unit 2 lessons — `editing-undo-redo`, `text-formatting`,
`keyboard-shortcuts-pattern` — failed immediately. The cause was not the dead end
this harness was built for. It was worse:

```tsx
<AppWindow title="Notes" onClose={() => {}} onMinimize={() => {}}>
```

**The ✕ and the − were drawn, clickable, and did nothing at all.** Not a dead
end — a dead control, which this repo already has a rule about, written when the
dock icons were fixed: *"A control that does nothing teaches nothing, and this
course's audience reads 'nothing happened' as 'I broke it'."*

`DesktopLaunch` had always passed an `exit` callback for exactly this — *"for
sims with a closable window"* — and nothing had ever used it. Now
`GuidedNotesTask` takes `onExit` and both buttons call it, returning the learner
to the desktop with the dock icon glowing and the banner naming the app. Two more
of the same class went with it: `EditFileTask` and `FakeDesktop`'s file viewer
each had a live ✕ and a dead −. Minimize now puts the window away and the list or
the dock is the way back, which is honest in a sim with no taskbar.

The only surviving `onClose={() => {}}` is `AppBody`'s Files instance, which
renders with `showHeader={false}` — no buttons drawn, so no dead control.

### And a false positive in the same check

With the sims fixed, the three lessons still failed — because `readState` only
looked **inside `[data-sim-frame]`**, and closing a DesktopLaunch window removes
the frame. The recovery it should have seen — the glowing dock icon and the
banner — lives outside it. The check was calling three now-correct lessons
broken.

`readState` now reads the whole activity host, and treats the launch gate as
what it is: a way forward. **A harness that cannot see the fix is worse than no
harness, because it sends you to repair what is already right.**

The negative control was re-run *after* that change, not before — widening what
the check can see is exactly the edit that could make it blind to real failures.
Removing the recovery block from `GuidedDesktopTask` still fails; restoring it
still passes.

### The rule

Two harnesses disagreeing about the same lesson is information, and it is the
only reason any of this was found. Neither was reporting an error. Both were
confidently reporting different worlds. **When two checks disagree, one of them
is lying — go and find out which before trusting either.**

## Round twelve (2026-07-29): the number in the pitch was dressed up

Round eleven's finding was that a harness silently skipped most of the course
while printing a confident count. The obvious follow-up: **do the other checks'
numbers mean what they say?**

They reconcile. `solve-check` queues 170 lessons (198 minus 28 explanation-only)
and the arithmetic is exact:

| | |
|---|---|
| exempt by type (reflex, gesture, real-world) | 24 |
| exempt because the lesson has no step list | 14 |
| **actually played** | **132** |

What did **not** reconcile is how the sales playbook described the shortfall:

> *"the remaining 20 are reflex and trackpad-gesture activities that are proven
> to render but are not auto-played, because a script cannot pinch a trackpad.
> Say that plainly — the precision is what makes the 150 believable."*

That is true of **six**. The other **fourteen** are `type-text` ×3, `edit-text`
×2, `url-navigator` ×2, and one each of `drag-sort-files`, `spot-the-fake`,
`keyboard-shortcut`, `browser-right-click`, `edit-file`, `file-explorer-open`,
`open-all-apps` — typing a sentence, fixing a typo, typing a web address,
sorting files by clicking, spotting a scam, copy-paste, right-click, opening a
file, opening every app. **A script could play every one of them.** They are
unplayed because they predate the step-list architecture the solver walks, so
there is nothing for it to follow.

The sentence was written to make the number credible, and the credibility was
counterfeit. Worse than a plain overstatement: it is a *technical* excuse, aimed
at exactly the buyer most likely to open the repo and check it. This is the
fourth false claim found in the customer-facing material this session — after
sign-in, cross-machine progress, and the COPPA answer.

Corrected in the playbook, and the real gap now sits in `GOAL_STATE.md`'s
"not proven by machine" table as what it is: **the largest remaining coverage
gap, and a fixable one.** Fourteen activities could be brought under
solve-check by giving them step lists or teaching the solver their shapes. That
is a real engineering item, and naming it honestly is what makes it get done
instead of explained away.

### Why `pitch-check` did not catch this

It looks for phrases naming removed features and for counts that disagree with
`content/lessons/`. Every number in that sentence was right — 20 is 20. What was
false was the *characterisation*, and no regex finds that. The guard against
this class is not a script; it is the habit of reading a claim next to the thing
it claims about. Which is the whole method of this document.

## Round thirteen (2026-07-29): closing the gap instead of describing it

Round twelve found the sales playbook calling 14 ordinary click-and-type
activities "reflex and trackpad-gesture" lessons a script could not play, fixed
the sentence, and named the real gap. Naming a gap is not closing it. **Nine of
the fourteen are now played.**

`lib/solve/solver.ts` gained `solveStepless()` — a player for activities that
have no `steps[]` for the ring walk to follow:

| type | what it does | lessons |
|---|---|---|
| `type-text` | types `targetText`, presses Check my work | 3 |
| `edit-text` | types `correctText` (or satisfies `mustInclude`) | 2 |
| `url-navigator` | types `targetUrl`, presses Enter | 2 |
| `open-all-apps` | clicks dock icons until the activity reports done | 1 |
| `file-explorer-open` | opens Files from the dock, double-clicks each named file | 1 |

**solve-check: 132 → 141, zero failures.** No lesson content changed, so the
132 that already passed could not regress — and did not.

Success is read from the frame's own `data-sim-done`, the same contract the step
walk uses, never from anything the player believes about the DOM. One lesson
(`trackpad-double-click`) failed on the first run for a real reason: the activity
opens on the desktop and the learner opens Files from the dock themselves. The
player now does that too, which is the point — it should do what a learner does,
not reach past the interface.

### The honest remainder: five, named

`cloud-vs-computer` (drag-sort), `shopping-spot-fake` (spot-the-fake),
`editing-copy-paste` (needs a real clipboard), `trackpad-right-click`
(context menu), `invitation-exercise` (edit a file inside the Files app). Each
needs its own gesture, which is why they are last rather than lumped in. Plus
the six that genuinely cannot be scripted. **159 of 170 machine-proven.**

### The number is now derived, not typed

"150 of the 170" sat in the playbook, stale, for months — because no one
re-derives a sentence. `pitch-check` now computes the numerator and denominator
from `content/lessons/` using the same two sets the solver uses, and fails when
the prose disagrees. Negative-controlled: put "150" back and it reports
*"says 150 machine-proven activities, there are 159"*.

That is the difference between this round and round twelve. Twelve corrected a
false claim by hand; thirteen made the claim impossible to get wrong again —
and then made most of it moot by doing the work the excuse was covering for.

## Round fourteen (2026-07-29): fourteen down to one

Round thirteen brought nine of the fourteen mislabelled activities under
solve-check and left five, each described as "a specific afternoon's work".
Four of them took one afternoon between them.

| lesson | type | what the player does |
|---|---|---|
| `cloud-vs-computer` | drag-sort-files | clicks each item, then the bucket the task says it belongs in |
| `shopping-spot-fake` | spot-the-fake | clicks the card the task marks `isFake` |
| `trackpad-right-click` | browser-right-click | opens Browser from the dock, right-clicks the link, opens it in a new tab, **then switches to that tab** |
| `invitation-exercise` | edit-file | opens Files from the dock, goes to Documents, double-clicks the file, types the correction, saves |

**solve-check: 141 → 145.** Machine-proven is now **163 of 170**.

### Three of the four failed first, and every failure was mine

- **The buckets.** A bucket's text grows as items land in it — "In the cloud"
  becomes "In the cloudA file in Google Drive…" — so matching the label exactly
  found nothing after the first placement. Match the prefix, take the shortest.
- **The scam card.** Matching by label text is wrong when one label contains
  another ("Shop" inside "Book Shop"). The cards render in the task's own order,
  so pick by position.
- **The timers.** `spot-the-fake` holds its reveal for **2.8 seconds** so the
  learner can read why the shop was fake, and `drag-sort` waits 600ms. A fixed
  settle sampled `data-sim-done` too early and reported two correctly-solved
  activities as broken. There is now a `waitDone()` that polls the frame instead
  of assuming. **This is the fourth time this session a check has measured a
  race and called it a defect** — it is the characteristic failure of this kind
  of harness and it will happen again to whoever extends it.
- **The tab.** Opening a link in a new tab was not enough: the lesson completes
  when the learner *switches to* that tab, which is the entire point of "open in
  a new tab" rather than "open". The player was doing half the lesson. Fixing
  that made the check match what the lesson teaches, not just what it accepts.

### The one that is left, and why

`editing-copy-paste` needs a **real clipboard**. Headless Chromium will grant
it, but only with a permissions grant none of the other harnesses require, and
the activity's whole point is that the learner's own Cmd+C/Cmd+V worked. Faking
it would prove nothing. Left undone deliberately, with the reason recorded,
rather than papered over — which is the mistake round twelve found in the pitch.

### pitch-check caught its own drift, immediately

Updating the playbook to 163 made `pitch-check` fail: *"says 163 machine-proven
activities, there are 159"*. The check keeps its own copy of the solver's
`STEPLESS` set and I had updated only the solver. That is the guard doing
exactly its job — one commit after being built, it stopped a number going stale
the same way "150" had. The duplication is noted in the script as a thing to
unify.

## Round fifteen (2026-07-29): the copy-paste lesson did not check the copy

The last unplayed activity was `editing-copy-paste`, and the reason recorded in
round fourteen was *"needs a real clipboard"*. **That was wrong**, and being
wrong about it turned up the more interesting thing.

`CopyPasteTask` was a plain controlled textarea validating `pasted ===
sourceText`. No paste listener. No clipboard. Nothing about copying at all. Its
instructions read:

> *"Select the text below, press Ctrl+C (or Command+C) to copy it, click the
> box, then press Ctrl+V (or Command+V) to paste."*

…and a learner who carefully **retyped the sentence** passed it. In a lesson
called *Copy, Cut, and Paste*, in the unit about the keyboard. They would have
practiced typing and been told they had learned copy-paste.

This is the same class as § 3 above — *checks that accepted the wrong answer* —
and the standard was already set elsewhere in this repo. The real-world missions
have a `paste` check kind defined as *"a `paste` event carrying text they did
not type"*. The mission version of this skill enforces it; the simulated lesson
that teaches the shortcut did not.

### The fix, and the tone of it

The box now requires a real `paste` event. Typing the right words is **not**
failed — it is answered:

> *"Those are the right words — but they were typed, and this lesson is about
> copying. Select the sentence above, press Ctrl+C (or Command+C), click the
> box, then press Ctrl+V (or Command+V)."*

A red failure card would be wrong here. The learner did something reasonable and
got the words right; they just practiced the wrong skill. This audience reads a
hard failure as evidence they are no good at computers, and the course's whole
posture is that mistakes cost nothing.

### And the solver does it properly

`solveStepless` now selects the sentence, calls the browser's own
`document.execCommand("copy")`, and delivers **what the selection actually
holds** to the box as a `paste` event — not a string the function happened to
know. **solve-check: 145 → 146.**

**Negative-controlled on the product change, not the harness:** remove the paste
event from the player so it only types, and the lesson refuses — *"activity did
not finish"*. Put it back and it passes. That is the check confirming the
product now tests what it teaches, which is the only version of this control
worth running.

### Where the count lands

**146 of 170 simulated + 18 missions = 164 machine-proven.** The remaining six
are the genuinely un-scriptable reflex and trackpad activities. **The
"scriptable but not scripted" column is empty for the first time** — it read 20
this morning, before anyone checked what those 20 actually were.
