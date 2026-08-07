# The phone course

**Rebuilt 2026-08-05.** `/phone` — the "On Your Phone" tab — is the *same* course
on the *same* practice computer, laid out for a screen you hold in one hand.
**116 entries: 112 real lessons out of `content/lessons/` plus 4 phone-only
gesture lessons.**

---

## The mistake this replaced, and why it mattered

The first version was a second curriculum with its own hand-built Messages,
Photos, Camera, Settings and on-screen keyboard. It looked fine and it was the
wrong idea, for the reason `SAME_ICON_AUDIT.md` exists: **a copy of an app drifts
from the app.** A learner who did Unit 1 on a phone and Unit 4 on a laptop would
have been looking at two different computers with the same icons.

So the bespoke phone was deleted. What is left is a **form-factor switch** on the
real simulator.

## How it works

`components/Playground/SimFormFactor.tsx` is a React context — `"desktop"` or
`"phone"`, defaulting to desktop. `PhoneCourse` wraps `LessonPlaygroundPane` —
the same component every laptop lesson uses — in `SimFormFactorProvider
value="phone"`, hands it the same lesson JSON, and the components underneath
change *layout only*.

Why a context and not a prop: a lesson renders a `Guided…Task`, which renders
`DesktopLaunch`, which renders `FakeDesktop`, which renders `Dock`, `AppBody` and
`SimulatorFrame`. Threading a `variant` prop through that chain means touching
every guided task in the course and giving each one a prop that means nothing to
it. A context is read only by the components whose layout actually differs, and
**every lesson in `content/lessons/` keeps working, unedited, in either shape.**

The default is what protects the laptop course: nothing outside
`components/Phone/` provides the context, so every existing lesson takes the
identical code path it always did. `solve-check` (145/145), `desktop-check` and
`ring-check` are the proof, and all three are run after any change in here.

```
lib/phoneCourse.ts               the curriculum: a playlist of slugs + 4 gesture lessons
app/phone/page.tsx               resolves the borrowed lessons on the server
components/Phone/
  PhoneCourse.tsx                list → teaching card → activity → finish card
  PhoneGestureTask.tsx           the only bespoke activity (Unit 1)
components/Playground/
  SimFormFactor.tsx              the context, and the home-bar exit context
  PhoneShell.tsx                 the status strip and the home bar
  touchGestures.ts               useSwipe — Pointer Events only
app/dev/phone-check/             SolveCheck, in the phone shape
scripts/phone-check.mjs          plays the 112 borrowed lessons at 390x844
scripts/phone-gesture-check.mjs  plays the 4 gesture lessons with real swipes
```

## What each unit is

| Unit | Lessons | Source |
|---|---|---|
| 1. Meet Your Phone | 4 | **bespoke** — tapping, sliding, the status strip, a check |
| 2. Files and Folders | 10 | Unit 3 |
| 3. The Internet and Browsing | 16 | Unit 4 |
| 4. Messages and Video Calls | 8 | Unit 5 |
| 5. Email | 9 | Unit 6 |
| 6. Photos | 8 | Unit 7 |
| 7. Apps | 7 | Unit 8 |
| 8. Settings | 6 | Unit 9 |
| 9. Online Safety | 11 | Unit 10 |
| 10. When Something Goes Wrong | 7 | Unit 11 |
| 11. Everyday Life | 7 | Unit 12 |
| 12. Making It Easier to Read | 13 | Unit 13 |
| Final Assessment | 10 | Final |

Left out on purpose, because a phone cannot do them: the trackpad and mouse
lessons, the whole physical-keyboard unit, window management, and the real-world
missions whose checks need a desktop-only browser API.

**Held back, and named in the file rather than quietly absent:**
`shopping-spot-fake` and `final-files` — `phone-check` cannot yet play either to
the end at 390px. They are listed in a comment in `lib/phoneCourse.ts` so the gap
is a line somebody trips over rather than an absence nobody notices. A lesson a
learner cannot finish is worse than one they were never offered.

---

## The phone layout, component by component

**`FakeDesktop`** — apps fill the screen instead of opening in draggable windows;
the dock becomes a four-column grid of the same tiles on the wallpaper; the menu
bar goes compact and grows a back arrow; a home bar appears at the bottom. Every
open app **stays mounted** and the ones behind are hidden, so leaving an app and
coming back finds the half-written message still there — Unit 1 promises exactly
that.

**`PhoneShell`** — the status strip and home bar for the lessons that *don't*
render a `FakeDesktop`. Most guided lessons go through `DesktopLaunch`, which
hands over to the sim once the app is open and drops the desktop; correct on a
laptop, and on a phone it left the app floating with no clock and no way home in
**91 of the 118 entries**, falsifying two Unit 1 lessons in the process. It is
rendered by `SimulatorFrame`, so the lesson banner stays *above* the phone rather
than inside it. Simulators that render `FakeDesktop` themselves pass
`phoneChrome={false}`; forget that and you get two clocks and two home bars.

**Stacked panes** — `SettingsApp`, `FileManager`, `GuidedMessagingTask`,
`GuidedEmailTask`, `GuidedPhotosTask`, `GuidedCalendarTask` all put a sidebar
beside a content pane, which needs about 700px. On a phone they stack, marked
`data-phone-stacked`. The list takes the whole height until something is selected
and a capped strip after that: a fixed percentage looked tidy and bisected its own
rows, showing the top half of a word.

**`inPhoneWords`** (`SimulatorFrame.tsx`) — the borrowed lessons are written for a
laptop and say "click", "the sidebar", "in the dock". Rewriting them per device
would mean two copies of every sentence. The swap happens on the way to the
screen instead, so the JSON stays single-sourced. It runs on the banner, the
hint, the goal, the title, the warning and the teaching card, and — through
`useSimWords()` — on the handful of strings the *apps* render themselves, which
were the last place a phone learner was still being told to look "in the dock".

**Never run it over the phone's own words.** The four gesture lessons are already
in phone language and name the laptop deliberately: *"A phone does not need the
double tap a laptop does."* The blanket `laptop → phone` rule turned that into
*"a phone does not need the double tap a phone does"* — a self-contradiction, on
lesson one, in the sentence carrying the whole idea. `phoneWording={false}` and
the `kind === "lesson"` guard exist for that. A translator must not translate
text that is already in the target language.

---

## Bugs this shook out, all of which had shipped

- **`SimulatorFrame`'s no-chrome pane was a block**, so every sim's `flex-1` body
  sized to its own content instead of the screen. Invisible on a laptop, where
  that branch is never used; on a phone, Mail's folder list was 600px tall with
  the inbox squeezed to nothing under it.
- **The HTML `hidden` attribute loses to Tailwind's `flex`.** A backgrounded app
  stayed on top of the home screen — going home *looked* like it worked, and then
  every icon underneath was unclickable.
- **The home bar was a focusable button that went home on Enter**, so a learner
  pressing Enter to name a new folder was thrown back to the home screen. It is
  swipe-only now; the keyboard route home is the back arrow.
- **44 highlight rings used Tailwind's stock `animate-pulse`**, which animates
  opacity 1→0.5 — fading the one control the learner has to find to 54% while
  everything around it stayed black. All of them now use the project's own
  `animate-ring-pulse`, whose navy edge exists to clear WCAG 1.4.11.
- **`GuidedTroubleshootingTask` drew its dock as one 604px row** in a 364px box
  with every ancestor `overflow: hidden` — four icons off screen with no scroll,
  and three lessons named one of them.
- **Three comparison cards side by side** needed 595px on a 390px screen.
- **The status strip moved between steps.** The banner above the phone grew with
  the step's text, so the Wi-Fi icon jumped 110px between step 1 and step 2 of
  `urls`. A status bar that moves is the one thing a status bar must never do;
  the banner now reserves three lines' height on a phone.
- **Home tiles overlapped at 1280px.** A fixed 64px tile in a grid column
  narrower than that made neighbouring labels collide. The tiles size to their
  column now, and the bezel is a full-height 386x836 rather than 266x576.

## `touchGestures.ts`: two designs that are wrong

- **Listening on the element alone** loses the gesture the moment the finger
  leaves it — which, for the 20px bar you slide upward, is immediately.
- **`setPointerCapture` on `pointerdown`** fixes that and breaks worse: while a
  pointer is captured the following `click` goes to the *capturing* element, so a
  swipeable row swallows every tap on the button inside it.

Track the pointer on the **window** for the duration of the press. And a drag
that starts and ends inside one element still fires a `click` — `consumeClick()`
is what stops a swipe from also opening the thing it swiped.

---

## What two persona audits found, and what changed

Two adversarial agents played the course cold at 390×844 with real touch — one
as a nervous 68-year-old meeting a smartphone, one as a 100-year-old with a
tremor. **Both independently reached the same verdict: they could not finish
Unit 1 unaided**, and both named the same first cause.

**The highlight on lesson 1's home bar rendered zero pixels.** `animate-ring-pulse`
is an *outer* `box-shadow`; the home bar is the last child of an
`overflow: hidden` column, flush with the bottom edge, so every pixel of that
shadow lands outside the clip. Measured against step 1's icon ring — 675 yellow
pixels — step 2's home-bar ring sampled **0, at every phase of the animation**.
The learner saw a plain gray pill, identical to the step before, on the very
first gesture the course teaches, with a back arrow at the top left as the only
obvious control. The fix is `animate-ring-pulse-inset`, the same cue painted
inward, **plus a sentence and an arrow** — because every other highlight in the
course means "press this", and a ring alone cannot say "slide".

The rest, in the order they hurt:

- **"Close the panel" was a hard dead end.** `dismissPanel()` never reported
  upward, so the panel's own ✕ and a tap on the wallpaper both closed it while
  the step stayed unsatisfied — no panel, no ring, nothing to do. The lesson's
  own teaching text sends the learner down exactly those two routes.
- **A double-press skipped a whole step.** Two presses 120ms apart on the Wi-Fi
  glyph ticked "open the panel" *and* "close the panel" together; the learner
  never saw the panel the lesson is about. The guard lives on the toggling
  control, and finding that took two wrong attempts worth recording: a 150ms
  cross-step guard in `useStepRunner` broke **three laptop lessons** whose steps
  are honestly satisfied back to back, and scoping that same guard to the phone
  broke **34 phone lessons**, because a solver completes steps faster than any
  hand can. The hazard is one control that both opens and closes a panel, so
  that is where the 250ms bounce guard belongs.
- **A double-press on an app icon opened something uninvited.** The second press
  landed on whatever had arrived under the finger — Messages opened, then Sam's
  conversation on top of it, on the lesson whose card says "a second tap usually
  lands somewhere you did not mean". A freshly-opened app is now inert for 300ms.
- **A tap on the home bar produced nothing at all.** `onMissed` only fired after
  8px of movement, so the single most likely first attempt from somebody who has
  never swiped — a tap — was silence. It fires on any press with no direction now.
- **Six lessons demanded a double-tap two lessons after Unit 1 says a phone has
  none.** One tap did nothing; two taps 400ms apart did nothing; only a real
  `dblclick` opened a file. `FileManager` opens on a single tap on a phone, and
  the wording follows.
- **`scams-phishing` was unlearnable.** The whole skill is reading the real
  address under a link, and the two panes sat side by side inside 390px — a
  166px reading pane, the URL chip truncated to `bank-secure-l…`, and the
  wrong-answer explanation naming a `.ru` that was never on screen. Stacked now,
  and the chip wraps rather than ellipsizing: that string *is* the lesson.
- **Assessments hid their instructions.** The objectives list — the only guidance
  an assessment has — was folded behind a bare **▼** measuring 21×18px, on the
  lesson whose card promises "the list of what to do is at the top". The button
  reads **"What to do ▼"** now, and the lesson copy points at it by name.
  Opening the list by default was the obvious fix and the wrong one: it grows
  the banner, the banner shrinks the device, and `phone-check` came back with
  37 unfinishable lessons. Vertical space on a phone belongs to the lesson;
  what was actually broken was discoverability.
- **The banner read the finish card's sentence.** With no current step, it fell
  back to `goal`, which is past tense: a frightened beginner opened the Unit 1
  check and read *"You found your way around the phone"* about something they
  had not done. Gesture lessons take a present-tense `doing` line now.
- **Two hints pointed at the wrong corner** — the compact strip puts the clock
  on the **left**. On an assessment the hint is the only help there is.
- **`Close` and `Start over` were 20px tall**, and `Start over` threw away the
  attempt with no confirmation, underlined and top-right where it was the most
  salient thing in the bar. Both are 44px hit areas inside the same 32px strip
  (`py-3 -my-3`), and Start over asks first.
- **The failure card skipped the rewrite** — the one learner-facing string on the
  phone that did, and the screen this audience reads most carefully. It now also
  says *nothing is broken*, which is the whole promise of a simulator.

**One fix broke the laptop, and `solve-check` said so.** Giving the objectives
toggle a written label wrapped it in a `<span>` — and the solver identifies a
dock icon as `button[aria-label]` containing an `img` or a `span`, so lesson
*chrome* joined the list of app icons it clicks through. `final-files`' last
objective spent its entire budget toggling the checklist open and shut. The
label is bare text now (the `aria-label` is what a screen reader announces
either way). Worth remembering in both directions: a phone fix lands in
components 145 laptop activities also render, and the solver's idea of "an app
icon" is looser than it looks.

Held up under both audits: the 44px home bar with its follow-the-finger lift,
60px of forgiven sideways drift, the 20-second stuck-learner reveal (measured at
20.14s), no horizontal overflow at 150% zoom or dsf 3, and the wrong-verdict
recovery in the phishing lesson — *"the best failure handling in the course"*.

## The gates

```sh
npm run phone-check          # 112 borrowed lessons at 390x844 — green at 112/112
npm run phone-gesture-check  # the 4 gesture lessons, real swipes — green at 4/4
npm run phone-words-check    # does the phone course still speak phone?
npm run phone-touch-check    # can a finger hit it, and can a 75-year-old read it?
```

`phone-words-check` runs the real `inPhoneWords` over the real lesson JSON and
fails on any laptop word reaching a learner, plus on *"X is called X"* — the
shape a rewrite makes when it renames both halves of a definition. It found
`finder-overview` teaching a word by saying **"The list at the top is called the
list"**, "press Enter" in 22 lessons on a device with no Enter key, and "Hover to
reveal its link" in the phishing lesson. Nothing else had ever read this text:
`phone-check` plays every lesson through the DOM without reading a sentence, and
`check-lessons.py` reads the JSON *as authored*, before the rewrite exists.

It is a `.ts` file rather than `.mjs` like its neighbours, and that is load-bearing:
`tsx` only transpiles a `.ts` **entry point**, and from an `.mjs` entry the same
import resolves down the CommonJS path and every named export silently vanishes.

`PHONEWORDS_NEGATIVE=1` skips the rewrite — the exact regression this guards,
since every call site is one `phoneWording={false}` away from it — and has been
watched to fail at 346 findings.

`phone-check` is `/dev/phone-check`: the same `SolveCheck` component and the same
`lib/solve` solver the laptop course uses, wrapped in the phone context. Two
solvers would mean two definitions of "finished".

**What it proves that `solve-check` cannot:** the phone renders the same
activities through different layout branches, and `solve-check` runs at 1440x900.
A pane collapsed to zero width or a control below a 390px fold passes there. Not
hypothetical — the first run found Mail and Photos at **0px wide** while
`solve-check` was green on the same code.

**Negative controls, both watched to fail.** `PHONE_NEGATIVE=1 npm run
phone-check` injects `[data-phone-stacked]{flex-direction:row}` — the exact
regression above — and produces 2 findings. Two, not twenty, and the reason
matters: **the solver reaches controls through the DOM**, and `element.click()`
works fine on a button zero pixels wide, so a collapsed pane only stops a step
that needs real geometry. `PHONE_NEGATIVE=1 npm run phone-gesture-check` replaces
every swipe with a click and stalls 3 of 4.

---

## What three app-realism agents found, and what changed

Three agents played the course at 390x844 against one question: *what would a
person who uses a real phone every day find wrong?* They converged on one cause.
**Six of the eight apps were a macOS split view folded into a column** — the
sidebar was rotated from beside the content to above it, and then left on screen
forever. Measured at rest: Mail and Photos gave **exactly half the phone** to a
sidebar; Settings showed **four of its nine sections** in a 173px strip holding
420px of rows.

Fixed:

- **Settings pushes and pops.** A full-screen list of rows with chevrons; tap
  one, it slides in; a back chevron brings you out. An earlier attempt at this
  was reverted for breaking assessments and the reason was not the layout — it
  had no way back. Assessments keep both panes, and that path is byte-identical
  to what shipped, proven by reverting the file and re-running when
  `final-settings` stalled.
- **`DraggableWindow` is not a window on a phone.** Eight troubleshooting
  lessons rendered a 366x265 floating window with a title bar, minimize /
  maximize / close at 28x24, a resize corner, and the dock visible underneath —
  and no back arrow and no home bar, so the only thing that looked like a way
  out was window chrome and none of its three buttons was one. It is now a
  full-screen app with a navigation bar and a back chevron, fixed at the
  component so the next window is right too.
- **Status panels are full-width**, below the strip rather than a 288px dropdown
  hanging off a 32px icon. Below, not over: a real Control Center does cover the
  status bar, but this course teaches "tap the same button again", and covering
  that button made its own instruction impossible.
- **The browser's controls are at the bottom.** Four stacked bands of chrome
  took 186px — 32% of the 578px a learner gets — before any web page. The
  address bar is alone at the top now and everything else is in two rows under
  the page, where the thumb is.
- **`SimSheet`** extracts the bottom-sheet pattern that was already written
  correctly twice (Mail's attachment picker, the Files viewer) and hand-rolled
  seven times without it.
- **Three highlight rings still used Tailwind's `animate-pulse`**, which fades
  the control to 54% — including the browser's address bar, which is the single
  most-pointed-at control in the course.

**Two of these fixes broke something, and both were caught by a harness rather
than by looking.** Giving the objectives toggle a written label wrapped it in a
`<span>`, and the solver identifies a dock icon as `button[aria-label]`
containing an `img` or a `span` — so lesson chrome joined the app icons it
clicks through. And making Settings a proper phone screen took away the only
list in `phone-sliding` that was longer than the screen, so the lesson that
teaches sliding had nothing left to slide; it uses the browser's Favorites now,
and the gesture harness asks the page which box is scrollable instead of naming
an app.

**Known intermittent:** `browser-vs-search` stalls at its search step in roughly
half of full `phone-check` runs, and passes every time it is run alone or with
its own 16-lesson unit. The symptom is a spin-out under load, not a wrong
screen. Not yet diagnosed, and recorded here rather than left as a mystery
somebody rediscovers.

**Photos, Mail and Files followed.** A selected photo rendered in a fixed
`w-48` box — 192px on a 390px screen, a thumbnail floating in white space with
its title captioned underneath. It fills the width now, on a fixed clipping
stage: `max-h` cannot cap a box sized by `aspect-ratio` from its width, and
Rotate is a CSS **transform**, so a 347x260 photo turned on its side still
*occupies* 347x260 while *painting* 260x347 — it ran over the controls above and
below, and no amount of sizing the picture could have fixed it. Mail's five
action chips moved from above the message to a bar under it, and its ✕ is gone
on the phone because the row above already says "← Inbox"; two controls that
both mean "leave this screen" is the laptop habit this course keeps unlearning.
Files is a single column of rows with the whole filename on one line —
"GroceryList.txt" was rendering as "GroceryList.tx / t" in a 115px tile — and
its toolbar hides what it cannot do instead of graying it, which took it from
three wrapped rows to one.

**And Mail rows swipe.** `useSwipe` had existed for months and was used in
exactly two places, both of them the home bar. A left swipe on an inbox row now
slides it under the finger to reveal Archive. Both rules from `touchGestures.ts`
apply and both had shipped as bugs before: the pointer is tracked on the
**window**, because a swipe that leaves the row must not die, and
`consumeClick()` is called first in the click handler, because a drag that
starts and ends inside one element still fires a `click` — without it, swiping a
message would also open it. Verified by driving a real pointer drag: the row
archives, and a plain tap still opens the email.

**Deliberately not done:** the browser still shows a tab strip. Hiding it at one
tab is what a phone does, and it broke `browser-vs-search` reproducibly, with
the cause unidentified — a lesson nobody can finish is worse than a strip that
looks like a laptop.

## The chrome redesign, 2026-08-06

The complaint was "the phone playground is completely inaccurate to how a phone
works", and it was right. Screenshotting every app at 390x844 turned up one
cause behind almost all of it: **the phone was the desktop simulator with
responsive tweaks**, and the tweaks stopped at the layer where a phone is
actually different.

| What a phone has | What was there |
|---|---|
| A status bar: time, radio, battery, and no controls | `DesktopMenuBar compact`, carrying a back arrow **and** the app's name |
| A nav bar with a back chevron labelled with its destination | Nothing — back lived in the status bar |
| A bottom tab bar for top-level sections | A sidebar stacked above the content, both scrolling |
| Push and pop, one screen at a time | Split views folded into a column, in Mail, Messages, Photos and Files |
| A grid from the top, a dock, a page dot | Ten icons floating in the vertical center, no dock |
| One address pill, tabs as cards | A desktop tab strip with ✕ buttons |

### The split that made the rest possible

`components/Playground/PhoneChrome.tsx` is new and holds `PhoneStatusBar`,
`PhoneNavBar`, `PhoneTabBar` and the `PhoneNavEntry` an app publishes to say
which screen it is on. Separating the status bar from the nav bar is what made
push-and-pop *expressible*: with one merged bar there is nowhere to say "back to
Mailboxes" as distinct from "back to the home screen", so every app was stuck
one screen deep and its sidebar had to stay on display forever.

Two hosts draw those bars, and they take the app's screen by different routes,
for a reason worth remembering: apps mounted by `FakeDesktop` are *descendants*
of the shell and publish through `PhoneNavProvider`; a guided sim **renders**
`SimulatorFrame`, so it is the shell's *parent* and a context published from its
body would never arrive. Those pass `phoneNav` as a prop instead.

Three details are load-bearing:

- **The back button carries a bare text node, never a `<span>`.** The solver
  identifies a dock icon as `button[aria-label]` containing an `img` or a
  `span`; wrapping the label would enlist the back chevron in the list of app
  icons it clicks through on every `open-app` step.
- **`data-phone-back="home"` vs `"app"`.** The chevron's text is where it goes
  back *to*, which at the top of an app is "Home" — a `NAV_LABELS` entry. The
  solver's nav-hunt clicks those when its target is off screen, so a hunt for
  Mail's Spam folder would have walked straight out of Mail. `solver.ts` now
  skips the `"home"` kind and keeps the in-app pop, which is exactly what the
  hunt is for.
- **A full-bleed list row gets `ROW_RING` (`animate-ring-pulse-inset`).**
  `animate-ring-pulse` is an outer box-shadow, and a row filling its scrolling
  container has its left and right clipped away — what reached the learner was
  two yellow horizontal rules, which reads as a rendering fault rather than as
  "this one". Every list in the course had it: Files' places, Mail's folders and
  messages, Photos' albums, Messages' conversations.

### The banner stopped reserving space it was not using

The instruction banner was 160px, of which **52px was a permanently empty box**
held open in case the step had a "type this" card, plus a 60px floor for text
that is one line more often than not. The reserve existed for a real reason —
the banner sits above the device, so a banner that changes height moves the
phone, and a status bar that moves is the one thing a status bar must never do.

One fixed height solves the same problem without the reserve: 124px, with the
instruction scrolling inside it. The longest step text in the phone course is
137 characters and it fits without scrolling. The card itself is gone on the
phone: of the 68 typing steps in the course, 62 already name the value in their
own words and the other six are assessment objectives where the card never
rendered, so the phone marks up the occurrence already in the sentence as a
monospace chip and pays nothing for it.

### `browser-vs-search`, and why the tab strip could finally go

The desktop tab strip had been kept as a documented retreat: hiding it broke
`browser-vs-search` reproducibly, with the mechanism unidentified. It was never
the strip. Running the lesson under the real solver and reading
`window.__solveTrace` showed the stall exactly:

```
iter step=search prog=2 objdone= spin=14 addr="" results=0 ring=[]
  ringless #1 moved (click:Downloads)
```

At the `search` step the browser was sitting on a **fresh New Tab** — a page
with no search box and, because its history is empty, a **disabled Back
button**. The instruction said "type in the search box" with no search box on
screen and no way to one. The solver span its whole budget clicking Downloads,
which is in `NAV_LABELS` and is a panel toggle, so the screen kept changing and
the step never could.

A learner reaching that state has strictly less to go on than the solver does.
The fix is the phone-accurate one: **the new-tab page has a search box**, which
every phone browser's does. Content pages, which always have history, ring Back
instead and say so in words. `browser-vs-search` went from 1 pass in 6 to 6 in
6, and with the dead end gone the strip was replaced by a tab count that opens a
grid of cards.

The lesson for next time: a "deliberate retreat" is a hypothesis nobody has
tested. This one was recorded honestly as a mystery and it stayed a mystery for
as long as nobody read the trace.

## Round two: assessments, the ring at phone size, and the harness's fake phone

The second pass on this course closed three of the list below and taught two
checks humility. The short version, each entry earned:

- **Assessments push and pop now.** The solver learned phone navigation instead
  of the apps learning to flatten themselves: back chevrons carry
  `data-phone-back` ("home" is never pressed during a hunt, "app" goes last,
  after every forward move), `NAV_LABELS` grew the phones' screen names, and a
  closed `⋯` menu (`data-phone-more`) is opened as part of looking — closed
  only, which is what keeps the hunt from oscillating the way the general
  "click anything expandable" rule did.
- **On a phone, a file's actions live on the file's own screen.** One tap opens
  a file into a sheet; Rename / Move to… / Move to Trash used to be in the list
  toolbar *under* that sheet, so no finger could reach them — while every gate
  stayed green, because `element.click()` passes through a `bg-black/40`
  overlay and the solver renamed files through it. The sheet carries the
  actions now (Move to… asks its follow-up question inside the same sheet), and
  the phone's list toolbar keeps only New Folder and Search.
- **The `⋯` menu is the phone's layout in both modes.** It was guided-only for
  one round because the solver couldn't open it — harness reasoning, learner
  cost: `final-browser` asks for zoom, the stepper lives only in that menu, so
  the objective had no control on screen at all.
- **`ring-check-phone` exists** (`RING_PHONE=1`, against `/dev/phone-check` at
  390x844) and is green over all 112 lessons. Getting it green found four real
  clipping bugs — most seriously `password-recovery`, where the ten-icon dock
  wrapped to three rows and left the bank's sign-in page **40px tall** — and
  two check bugs that matter more than any of them:
  - **The harness's phone was 300px shorter than a real one.** `SolveCheck`
    hosted every activity in the laptop pane's fixed `h-[520px]` box;
    `PhoneCourse` gives the sim the whole viewport. A geometry check with the
    wrong geometry reports fiction in both directions. On a phone the host is
    now `fixed inset-0`.
  - **The documented negative control certified the check.** "Make the reveal
    return early" also disables the recorder that *writes the findings*, so the
    run came back green with nothing inspected. The control is now "disable
    only the scroll loop, keep the recorder", watched to fail at 6 findings on
    the laptop and 1 at phone size.
- **The reveal retries after the screen settles.** It only ever ran on a DOM
  mutation, so an attempt made mid-animation was the final word — the
  `revealedOk` latch could *ask* for a retry but nothing could cause one. It
  re-runs on settle now, bounded at three attempts.
- **`GuidedTroubleshootingTask` behaves like a phone**: dense two-row dock that
  steps aside while an app is open (and returns when a step rings a dock icon —
  hiding it broke `when-to-get-help`'s "reopen Photos" step the same hour it
  was added), one nav bar per screen, and `BrowserSimulator` drops its desktop
  tab strip and dead Reading List/History/Downloads row at phone size.
- **The words caught up with the apps**: "tap it once to select it" became "to
  open it" (selection-then-toolbar is a mouse model the phone no longer has),
  "the left-hand list" became "the list of places", and `left-hand` joined
  `LAPTOP_WORDS` — which immediately caught a fourth leak in
  `unit-9-assessment` nobody was looking for.

## Still open

- **Only Mail implements a swipe.** An inbox row now slides left to reveal
  Archive, which is the gesture people use twenty times a day on a real phone
  and the first one in this product outside the home bar. Photos still has no
  swipe between pictures and nothing has pull-to-refresh.
- **The browser keeps its zoom stepper** (`− 100% +`), now inside the `⋯` menu
  rather than on the bar — still a desktop control; a phone zooms by pinching.
  `zooming-webpages` and `a11y-zoom-web-page` ring it by name, so it cannot
  simply go.
- **There is no on-screen keyboard**, so no typing lesson ever has one appear,
  and nothing handles `visualViewport`: on a real phone the keyboard covers the
  Send button in `messages-app` and `composing-email`, with no scroll to reveal
  it.
- ~~`sim-contrast-check` runs at 1440x900 only.~~ **Closed:**
  `npm run sim-contrast-check-phone` walks the phone-course guided lessons at
  390x844 through `/dev/stray-check?phone=1`, hosted at the full viewport.
  Its first run reported the dark home screen's icon labels at 1.23:1 on
  *white* — measurement fiction, not a defect: the phone painted its wallpaper
  with the `background` shorthand, which resets `background-color` and knocked
  out the root's own `bg-gray-900`, so the ground resolver fell through the
  gradient to white. `backgroundImage` keeps the solid layer, and the sweep is
  green at ~5300 text runs. The negative control has been watched to fail at
  phone size.
- **`isReachable` in `lib/solve/gestures.ts` never checks the viewport** — its
  docstring says "on screen" and it does not test the rect. That is why the solver
  clicked a dock icon 171px past the right edge and reported green.
- **No reading lessons and no real-world missions.** All 28 `type: "none"` lessons
  are absent because `LessonPlaygroundPane` renders no branch for them and
  `PhoneCourse` has no "Continue" path. Several — `app-vs-website`, `qrcodes-siri`,
  `cloud-photos`, `final-graduation` — are more relevant on a phone than a laptop.
  Of the 18 missions, only 5 are genuinely desktop-blocked; 13 use checks a phone
  browser supports, and `unit-7-assessment-real` ("your own photos, measured") is
  the most phone-native task in the whole product.
- **A phone-only learner can earn no certificate.** `/api/units` counts every slug
  in a unit, and every unit has at least one lesson the phone course does not
  offer.
- **A lesson's `warning` is dropped on the phone.** Three lessons carry one;
  `unit-4-assessment`'s warns about the CLEAN NOW trap that fails the lesson.
- **The sales corpus still says phones are not supported** — `SALES_PLAYBOOK.md`,
  `COLD_CALL_KIT.md`, `IMPLEMENTATION_GUIDE.md`, `DEMO_PRIYA_ELDER_CARE.md`.
  `pitch-check.py` has no rule for a capability being *added*.
