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

## The gates

```sh
npm run phone-check          # 112 borrowed lessons at 390x844 — green at 112/112
npm run phone-gesture-check  # the 4 gesture lessons, real swipes — green at 4/4
```

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

## Still open

- **`ring-check` and `sim-contrast-check` run at 1440x900 only.** Neither has ever
  looked at the phone. Running them against `/dev/phone-check` is the obvious next
  gate, and it is the hole that hid the off-screen dock.
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
