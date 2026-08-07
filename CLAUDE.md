# LearnAComputer

Basic computer literacy course for absolute beginners, taught step-by-step with interactive playgrounds.

## Stack

- **Next.js 15** App Router, React 19, TypeScript, Tailwind CSS 3
- **No database, no accounts, no cookies** — progress lives in `localStorage` only. Cookieless, anonymous page-view analytics only (Vercel Web Analytics via `<Analytics/>` in `app/layout.tsx`); no per-user data, no cross-site tracking
- Deployed via Vercel

## Commands

```sh
npm run dev          # dev server on :3000
# /dev/mount-check   # dev-only page: mounts every lesson's activity and reports throws
# /dev/solve-check   # dev-only page: PLAYS every guided lesson to the end (see docs/SOLVE_CHECK.md)
npm run solve-check  # headless: PLAYS all 145 playable activities to the end (canonical)
npm run mission-check # headless: PLAYS all 18 real-world missions on a real machine
npm run phone-check   # PLAYS the 112 borrowed lessons in the phone shape (390x844)
npm run phone-gesture-check # PLAYS the 4 phone-only gesture lessons with real swipes
npm run phone-words-check   # does the phone course still speak phone? (static)
npm run phone-touch-check   # 44px targets and legible text, in every phone lesson
npm run desktop-check # proves the practice desktop holds several windows at once
npm run demo-check   # proves every page on the sales demo path loads clean
npm run hostile-check # the buyer with crossed arms: what a skeptic finds off the demo path
npm run recovery-check # deliberately FAILS a lesson, then proves the learner can carry on
npm run stray-check   # does the WRONG thing on purpose; proves nobody is left with no way forward
npm run simdark-check # is the practice computer's Dark Mode actually painted, in every dock app?
npm run sim-contrast-check # WCAG AA inside every one of the 170 activities (a gate)
npm run build        # production build (rm -rf .next first if switching from dev)
npm run lint         # eslint
npx tsc --noEmit     # type-check without emitting
python3 scripts/check-lessons.py  # lesson validation (targets, capitalization, reading level)
python3 scripts/check-actions.py  # every action a sim advertises must be one a learner can finish
python3 scripts/spelling-check.py # one dialect: American English, plus a typo list
python3 scripts/pitch-check.py    # does the sales material describe the product that exists?
                                  # (reads EXEMPT/STEPLESS out of lib/solve/solver.ts — never copy them)
python3 scripts/audit-order.py    # curriculum-shape report: order, module size, dependencies
python3 scripts/check-a11y.py     # every <img>/<Image> and lesson media has an alt (a gate)
node scripts/contrast-check.mjs   # WCAG AA contrast over the pages learners read, both themes
npm run ring-check                # is every highlighted control actually ON SCREEN? (a gate)
npm run ring-check-phone          # the same audit at 390x844, against /dev/phone-check
npm run motion-check              # does the lesson art move — and stop when asked?
```

All the browser checks need `npm run dev` running on :3000 first.

After touching any sim component or lesson steps, run **solve-check as well as
mount-check** — mounting proves an activity renders; solving proves a learner can
finish it, and the two unfinishable-lesson bugs were invisible to everything else.
`solve-check` is currently green at **145/145**; keep it there. It grew from 132 on 2026-07-29, when
`solveStepless` taught it every activity type that has no step list. **Nothing
scriptable is left unplayed** — only six reflex and trackpad activities a script
genuinely cannot perform.

After touching `RealWorldMission`, `RealWorldChecks` or any `real-world` lesson,
run **mission-check** — solve-check exempts all 18 missions, so nothing else
looks at them. It plays the learner's *computer*: real PNGs with real
dimensions and real PDFs handed to the page's own file input, genuine paste
events and key combinations, and CDP driving the screen, the window and the
device pixel ratio apart from each other. Keep it green at **18/18**.

After touching `FakeDesktop`, `DraggableWindow` or `AppBody`, also run
**desktop-check** — no guided lesson opens two apps at once, so solve-check
cannot see a broken window stack, and multi-window is what Unit 1 teaches.

**There is a second course, and it is the same course.** `/phone` — the "On Your
Phone" tab — plays **112 of the laptop lessons** in a phone-shaped simulator,
plus **4 phone-only gesture lessons** in `lib/phoneCourse.ts`. It is a *playlist*,
not a second curriculum: `PhoneCourse` hands the real lesson JSON to the real
`LessonPlaygroundPane` inside `SimFormFactorProvider value="phone"`, and the
components underneath change layout only. There is no second Messages app to keep
in step.

`components/Playground/SimFormFactor.tsx` is that context. **Its default is
`"desktop"`, and that default is what protects the laptop course** — nothing
outside `components/Phone/` provides it, so every existing lesson takes the code
path it always did.

After touching `SimFormFactor`, `PhoneShell`, any `isPhone` branch,
`lib/phoneCourse.ts` or `app/phone/`, run **both**:

```sh
npm run phone-check          # the 112 borrowed lessons at 390x844 — green at 112/112
npm run phone-gesture-check  # the 4 gesture lessons, real swipes — green at 4/4
npm run phone-words-check    # does the phone course still speak phone? (static, 1s)
npm run phone-touch-check    # can a finger hit it, and can a 75-year-old read it?
```

**`phone-touch-check` measures the two things a touch screen makes
non-negotiable**, and it exists because every other harness answers through the
DOM — where `element.click()` lands perfectly on a 20x20 button and reads 11px
text as easily as 17px. Its first run found **1227 controls under the 44px touch
floor and 1895 findings under the reading floor**, with `phone-check` green at
112/112 on the same code. Gate: targets under 44px, text under 13px. Text
between 13 and 15 is printed and advisory — a real phone sets a home-screen icon
label at about 11px, so a blanket 15px floor would mean inflating every label in
the course to serve a number rather than a person.

Most of it was fixed by **scoped rules in `globals.css`, not by 40 hand edits**:
a 44px minimum on controls inside `[data-phone-screen]`, a 44px `min-width` on
icon-only buttons, `font-size: 16px` on every field (under 16px, mobile Safari
zooms the whole page on focus and does not zoom back), 44px on range inputs, and
a 13px floor on the small text utilities. `[data-phone-screen]` marks the glass;
it was referenced by the press-feedback rule and **set by nothing**, so every tap
inside the phone had been silent since that rule was written.

`PHONETOUCH_NEGATIVE=1` shrinks the back arrow and drops body text to 8px, then
asserts **those exact defects come back named**. Its first version used
`addStyleTag` once, before a loop that calls `page.goto` per lesson — which
discards the sheet — so the negative run was the ordinary run wearing a label,
and reported *fewer* findings than the baseline. `addInitScript` survives
navigation.

…and then `solve-check`, `ring-check` and `desktop-check`, because the phone
branches live inside components 145 laptop activities also render.

`phone-check` drives `/dev/phone-check`, which is the **same** `SolveCheck`
component and the same `lib/solve` solver, wrapped in the phone context — two
solvers would mean two definitions of "finished". It sees what `solve-check`
cannot: that harness runs at 1440x900, where a pane collapsed to zero width or a
control below a 390px fold still passes. Its first run found Mail and Photos
rendering at **0px wide** while solve-check was green on the same code.

Both negative controls have been watched to fail. `PHONE_NEGATIVE=1
phone-check` injects `[data-phone-stacked]{flex-direction:row}` — the exact
regression — for 2 findings; only 2, because **the solver clicks through the DOM
and `element.click()` works on a zero-width button**, so a collapsed pane only
stops a step needing real geometry. `PHONE_NEGATIVE=1 phone-gesture-check`
replaces every swipe with a click and stalls 3 of 4.

`phone-words-check` runs the real `inPhoneWords` over the real lesson JSON and
fails on a laptop word reaching a learner — and on *"X is called X"*, the shape a
rewrite makes when it renames both halves of a definition (`finder-overview`
shipped **"The list at the top is called the list"**). Nothing else reads this
text: `phone-check` drives the DOM without reading a sentence, and
`check-lessons.py` reads the JSON *as authored*, before the rewrite exists. The
rules compile **case-insensitively** — matching lowercase only is the bug it
exists to stop, and it leaked "Hover to reveal its link" into the phishing lesson
and "press Enter" into 22 lessons on a device with no Enter key.
`PHONEWORDS_NEGATIVE=1` is the negative control, watched to fail at 346 findings.
It is a `.ts` file, not `.mjs`: `tsx` only transpiles a `.ts` **entry point**, and
from an `.mjs` entry the same import silently resolves down the CommonJS path
with every named export gone.

**The phone has three bars and they are three different things**
(`components/Playground/PhoneChrome.tsx`): a **status bar** (time, radio,
battery — and never any navigation), an app's **nav bar** (a back chevron
labelled with where it goes *to*, a centered title), and a **tab bar** at the
bottom for an app with two or more top-level sections. They were one
`DesktopMenuBar compact` carrying the clock, the app's name and a back arrow,
which is a shape no phone has — and the merge is what made push-and-pop
impossible, because with one bar there is nowhere to say "back to Mailboxes" as
distinct from "back to the home screen". Every app was therefore stuck one
screen deep with its sidebar permanently on display.

An app says which screen it is on by publishing a `PhoneNavEntry`, and **how it
publishes depends on where it sits**: apps mounted by `FakeDesktop` are
descendants of the shell and use the `usePhoneScreen` context; a guided sim
*renders* `SimulatorFrame`, so it is the shell's **parent** and must pass
`phoneNav` as a prop — a context published from its body never arrives.

Three rules around that, each of which cost a debugging round:

- **A full-bleed row in a scrolling list gets `ROW_RING`, not
  `animate-ring-pulse`.** The outer box-shadow has its left and right clipped by
  the container, and two yellow horizontal rules read as a rendering fault, not
  as "this one". Every list in the course had it.
- **`data-phone-back` says `"home"` or `"app"`, and `solver.ts` reads it.** The
  chevron's text is its destination, which at the top of an app is "Home" — a
  `NAV_LABELS` entry — so the solver's nav-hunt would press it and walk out of
  the app it was searching. The in-app pop stays in the hunt; leaving does not.
- **The nav bar's back label is a bare text node, never a `<span>`.** Same trap
  as the objectives toggle: `button[aria-label]` containing an `img` or `span`
  is how the solver identifies a dock icon.

**A "deliberate retreat" is an untested hypothesis.** The browser's desktop tab
strip was kept for months because removing it broke `browser-vs-search` with the
mechanism recorded as unidentified. It was never the strip: reading
`window.__solveTrace` showed the browser sitting on a **fresh New Tab** at the
search step — no search box, and Back disabled because a new tab has no history
— so the instruction said "type in the search box" with nothing on screen to
type into and no way to reach one. The new-tab page carries a search box now,
the way every phone browser's does; that lesson went from 1 pass in 6 to 6 in 6,
and the strip became a tab count that opens a grid of cards. Record a mystery
honestly, then go and solve it.

Seven more rules for this code, each of which shipped as a bug first:

- **`SimulatorFrame`'s no-chrome pane must be a flex column.** As a block, every
  sim's `flex-1` body sized to its content rather than the screen — invisible on
  a laptop, where that branch never runs, and on a phone it made Mail's folder
  list 600px tall with the inbox squeezed to nothing.
- **Never use the HTML `hidden` attribute next to Tailwind's `flex`.** The UA
  stylesheet's `display:none` loses to any author `display`, so a backgrounded
  app stayed on top of the home screen and every icon under it was unclickable.
  Use the `hidden` *class*.
- **Never `setPointerCapture` on `pointerdown`.** While a pointer is captured the
  following `click` goes to the *capturing* element, so a swipeable row swallows
  every tap on the button inside it. Track the pointer on the **window**
  (`touchGestures.ts`), and call `consumeClick()` first in the click handler —
  a drag that starts and ends in one element still fires a click.
- **An edge-anchored control gets `animate-ring-pulse-inset`.** `ring-pulse` is
  an *outer* box-shadow, and the home bar is the last child of an
  `overflow: hidden` column flush with the bottom edge — the whole shadow lands
  outside the clip. Measured: **0 yellow pixels** on lesson 1 step 2, the first
  gesture the course teaches, while step 1's icon ring painted 675. Two personas
  found it independently and both stalled there.
- **A ring cannot say "slide".** Every other highlight in the course means "press
  this", so a learner taught only to tap will tap — and tapping the home bar does
  nothing, by design. The go-home step carries words and an arrow beside the ring.
- **A bounce guard belongs on the control that bounces, not in the step engine.**
  Two presses 120ms apart on the status strip ticked "open the panel" *and*
  "close the panel" together. A 150ms cross-step guard in `useStepRunner` broke
  three *laptop* lessons whose steps are honestly satisfied back to back;
  scoping that guard to the phone broke 34 *phone* lessons, because the solver
  completes steps faster than any hand can. `FakeDesktop`'s `onTogglePanel`
  carries a 250ms guard instead — one control, one hazard.
- **Never put an element child inside a `SimulatorFrame` chrome button.** The
  solver identifies a dock icon as `button[aria-label]` containing an `img` or a
  `span`, so a labelled chevron wrapped in spans joined the list of app icons it
  clicks through, and `final-files` spent its whole budget toggling the
  objectives list. The `aria-label` is what a screen reader announces anyway.
- **The highlight ring is `animate-ring-pulse`, never `ring-4 ring-yellow-400
  animate-pulse`.** Tailwind's stock `animate-pulse` animates opacity 1→0.5, so
  44 call sites were fading the one control the learner had to find to 54% while
  everything around it stayed black. The project's own keyframe carries the navy
  edge that clears WCAG 1.4.11.

A simulator that renders `FakeDesktop` itself must pass `phoneChrome={false}` to
its `SimulatorFrame`, or the phone gets two status strips and two home bars.

**`npm run ring-check-phone` audits the ring at 390x844** — same script, same
recorder, driving `/dev/phone-check` — and it is where the worst phone bug so
far was found: `password-recovery`'s ten-icon dock wrapped to three rows and
left the bank sign-in page 40px tall, with every other harness green because
the solver clicks through the DOM. Two rules came out of getting it green:

- **A geometry check must measure the geometry a learner gets.** `SolveCheck`
  hosted every activity in the laptop's fixed 520px box; the real phone course
  hands the sim the whole viewport, ~300px more. The harness's phone host is
  `fixed inset-0` now. Before trusting any finding from a check that measures
  pixels, confirm the box it measures in is the box the product renders.
- **A negative control must break the cure, never the measurement.** The
  documented control ("make the reveal return early") also disabled the
  recorder that writes the findings, so it passed — a control that certifies
  the check. The working control disables only the scroll loop; watched to
  fail at 6 laptop / 1 phone findings.

On a phone, **a file's actions live on the file's own screen**: one tap opens a
file into a sheet, and Rename / Move to… / Move to Trash are in that sheet, not
in a toolbar under it. The toolbar-under-a-modal version left every gate green —
`element.click()` passes through a `bg-black/40` overlay — while no finger could
rename a file. The solver opens a **closed** `⋯` menu (`data-phone-more`) as
part of its nav hunt; closed only, or it oscillates.

See `docs/PHONE_COURSE.md`, including its **Still open** list —
`sim-contrast-check` has never run at phone size, so the phone's restyled rows
and sheets are unmeasured for contrast.

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
sim's scrolling layout, run **`npm run ring-check`**. It asks the one question no other harness
can — *is the pulsing ring on screen?* — because the solver reaches controls
through the DOM and never has to see them. Two shipped bugs put a step's own
target just below the fold and every check stayed green.

**`npm run ring-check` is a gate as of 2026-07-29** — whole course, exits 1 on
any finding. It spent most of its life advisory because the count wobbled (8, 6,
10 on identical code) until `SimulatorFrame` started publishing
**`data-sim-settled`**. Then it read 2, 2, 2, and those two were a real defect:
the scam popup's ✕ hung outside the dialog and was clipped by the page area,
unreachable by scrolling. Fixed; three runs now give zero. The lesson worth
carrying: the number was never going to become trustworthy by tuning a delay —
it became trustworthy when the thing being measured was asked to say when it had
stopped moving. See `docs/SAME_ICON_AUDIT.md` §§ *Round four*, *Seventeen* and
*Eighteen*.

**Anything that measures geometry must wait for `data-sim-settled`.** Measuring
a moving screen is how a check reports a race and calls it a defect — which
happened four separate times in one session before the signal existed.

**The practice computer has its own dark mode, and it is `sim-dark:`, not
`dark:`.** `dark:` follows the learner's browser and the site's theme toggle;
`sim-dark:` follows the Dark Mode switch inside the simulated Settings app, which
Unit 9 teaches the learner to flip. The two are independent in both directions, so
the sim root cannot just carry the `dark` class — `html.dark` is an ancestor of
everything and the class strategy cannot switch dark back *off* for a subtree.
`FakeDesktop`'s root carries `sim-dark`; the variant is registered in
`tailwind.config.ts` as **both** `&.sim-dark` and `.sim-dark &`, because the
descendant half alone does not match the root itself and that shipped invisible
gray-900-on-gray-900 text in five apps.

Every use is **additive** — a `sim-dark:` class beside the light one, never
replacing it — so the light-mode stylesheet is byte-identical and this cannot
regress the 99% of the course that never touches the setting. Colorless borders
(`border-b` with no color) are handled once, in `globals.css`, by a `@layer base`
rule; the layer is load-bearing, since a utility that names its own color must
still win.

**Chrome follows the setting; paper does not.** A real browser in dark mode
darkens its tabs and address bar and leaves websites looking how their authors
made them, and a PDF viewer leaves the page white. Surfaces that stay light on
purpose are marked `data-sim-paper` — web pages, PDF pages, rendered documents,
and the dock's icon tiles. The marker is what separates "light because nobody got
to it" from "light because that is what the thing is".

After touching `SimThemeContext`, any `sim-dark:` class, that base-layer rule, a
`data-sim-paper` marker, or any app reachable from the dock, run **`npm run
simdark-check`**. It turns Dark Mode on through the real Settings UI, opens all
nine other dock apps, and reports light neutral surfaces and text under WCAG AA.
Twelve gates were green on a dark mode that painted only the wallpaper, dock, menu
bar and Settings — every other harness drives the DOM or measures the *site*, and
none of them looks at the simulated computer's colors. Dr. Digital's own success
line had been written around the gap: *"the menu bar, dock and background all
followed."*

Three traps in that check, all of which hid real findings:

- **`data-sim-paper` is dangerous when too broad.** Marking the browser's whole
  page area also covered its *own* new-tab page, which kept a white ground while
  its text went light — white-on-white tiles — and the marker made the check skip
  exactly that region and call the browser clean. A screenshot caught it. Every
  output line now prints how many elements it skipped, so an over-broad marker is
  a number rather than silence. **Use `SIMDARK_SHOTS=<dir>` and look**; measuring
  did not find this one.
- The neutrality threshold is **32**, not 20. Tailwind's grays are blue-tinted —
  gray-900 spreads 22 channels — so 20 classified gray-900 as an *accent* and
  filed every "1:1 invisible text" result under advisory.
- Faint text moves **lighter** on a dark ground. The bulk pass mapped
  `text-gray-400` down to gray-500 in 35 places, i.e. made the dimmest text on
  screen dimmer, all under AA.

`SIMDARK_NEGATIVE=1` is the negative control and has been watched to fail (69
findings, all nine apps). See `docs/SIM_DARK_MODE.md`.

**`npm run sim-contrast-check` measures WCAG AA inside all 170 activities, and it
exists because `contrast-check` never clicks "Start activity".** That check visits
site *pages*; every other harness drives the DOM without reading a color. So the
entire playground — every button and label a learner spends the course pressing —
was unmeasured, and four defect classes were sitting in it, none of them
dark-mode-related:

- `text-gray-400` on white at **2.54:1**, 104 call sites — every email timestamp
  and preview, the calendar's weekday headers, App Market prices, the browser's
  address placeholder.
- white on `bg-blue-500` at **3.68:1** — the primary button, 38 call sites.
- a yellow-500 star rating at **1.92:1**, and an orange-600 chip at **3.11:1**.

The rule that came out of it: **`text-gray-400` is a dark-mode color only.** On
white it is 2.54:1; the pair is `text-gray-500 sim-dark:text-gray-400` (4.83:1
light, 7:1 dark). Five regions are genuinely dark in *light* mode too — the video
call, the music player, the undo pill, the Force Quit title bar, and Settings'
own `muted` — and keep bare gray-400. White text needs `bg-blue-600`, not
`bg-blue-500`.

It reaches every activity through `window.__strayShow`, the same script-controlled
mount `stray-check` uses, clicking the "open the app" gate as a learner does —
without that most of the course silently never mounts. **It also walks each lesson
forward**, clicking the highlighted control and re-measuring after every step,
because measuring on mount is measuring the first screen and everything a guided
lesson is *about* lives past it. That walk more than doubled coverage and found a
whole class the mount-only sweep never saw: semantic colours at the -500/-600 step
do not clear AA on white or on their own pale tint (green-600 3.3:1, red-500
3.44:1, blue-500 3.68:1, yellow-500 1.84:1). 69 text tokens and 13 fills moved one
step darker, each with a light dark-mode partner.

**It enforces WCAG 1.4.11 too**, scoped on purpose: a form field's border is always
scored (it is the only thing saying "type here"), a button's only when it is the
sole boundary — boxed on four sides and unfilled. A bottom-border-only button is a
list row, not a control outline; scoring those reported every list separator in the
course. Disabled controls are exempt, WCAG's own carve-out. Tailwind's default
border is gray-200, **1.24:1** on white, so every form field in the course had an
invisible boundary; the floor is `border-gray-500`, which is 4.83:1 on white and
3.58:1 on a gray-900 window, so one value serves both themes.

The measurement is shared with `simdark-check` via `scripts/lib/sim-contrast.mjs`;
two copies of the same maths is how you get two answers. It composites translucent
layers when resolving a ground — skipping anything under 0.85 alpha made the
celebration overlay's white congratulation read as white-on-white at 1:1, the same
wrong-layer mistake `contrast-check` once made over the homepage photos.
`SIMCONTRAST_NEGATIVE=1` is the negative control, covers both halves, and has been
watched to fail. Green at **7099 text runs and 640 control borders over 125
activities, walking 155 steps past mount**.

**`simdark-check` now measures both themes,** and that retired a piece of
self-deception. It used to file any shortfall on a saturated ground under
"advisory", reasoning that it looked the same with Dark Mode off so it was not the
reskin's fault — true, and beside the point, since a button nobody can read is a
defect in whichever theme it appears. Measuring light *and* dark answers the
question the excuse was dodging.

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

It also asserts, by **reading the files rather than fetching the routes**, that
every page under `app/dev/` calls `notFound()` on `NODE_ENV === "production"`.
`/dev/solve-check` auto-plays the whole course and `/dev/mount-check` lists every
activity that throws; either one live is a screenshot a buyer never forgets. It
has to be a static check because the harness runs against a *dev* server, where
those pages are supposed to work — the failure being prevented is the fifth dev
page, added later by someone who did not know the rule. All four are guarded
today, and a real `next build` + `next start` was used to confirm they 404 in
production while the real routes return 200.

**`contrast-check` measures two ways, and the second one is the point.** Walking
the ancestors for a solid `background-color` answers almost every text node on the
site. It cannot answer the ones that sit on a photo: the homepage hero and the
unit cards put white text over an absolutely-positioned `<img>` under a dark
scrim, and every element in the text's own ancestor chain is transparent — so the
walk sailed past the photo, reached `<body>`, and reported its genuinely white
background for the wrong layer. Four "1:1 white on white" failures against text
that is perfectly legible. **A real white-on-white bug prints those same four
lines**, so the noise was hiding the only signal this check exists to give. When a
painter (absolutely-positioned media, or any `background-image`) overlaps the
text, the glyphs are now made transparent, the element is screenshotted, and the
backdrop is scored off real pixels — worst realistic patch, not average, because
a photo is not one color.

Three flags matter when touching it:

- `CONTRAST_NEGATIVE=1` is the negative control, and it has been watched to fail.
  It recolors the hero and unit-card titles to a near-scrim gray; those go down
  the *pixel* path, so a clean run under this flag means that path has gone blind.
- `CONTRAST_VERBOSE=1` lists every pixel-sampled measurement, passes included.
  Without it a clean run is indistinguishable from one where every screenshot came
  back empty and all the hard cases were skipped.
- Anything the pixel path cannot capture is printed in its own "could not
  measure" bucket and does **not** count as a failure. A check that says "I don't
  know" is useful; one that guesses and calls it a measurement is what this was.

`PAGES` entries may declare an expected status, so the two pages a learner only
meets on their worst visit are finally measured: a wrong URL for `not-found.tsx`,
and `/dev/boom` for `error.tsx`. That page throws **after mount** on purpose — a
first-render throw throws on the server too, so Next serves its own 500 document
and `error.tsx` never renders inside the root layout, leaving the check measuring a
page the product does not own. Anything else that does not return its declared
status still fails: `/login` sat in this list from the 2026-07-28 account removal
onward, and because `page.goto` does not throw on a 404, the check spent months
measuring the not-found page and filing the results under `/login`.

Still advisory, not a gate. It is now trustworthy enough to promote; nobody has.

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
  phone/page.tsx          # "On Your Phone" — the laptop course in a phone-shaped simulator

components/
  Phone/
    PhoneCourse.tsx        # Course list → teaching card → activity → finish card
    PhoneGestureTask.tsx   # The only bespoke activity: Unit 1's four gesture lessons

  MountCheck.tsx           # Dev-only harness behind /dev/mount-check
  SolveCheck.tsx           # Dev-only harness behind /dev/solve-check (drives lib/solve/)
  StrayCheck.tsx           # Dev-only harness behind /dev/stray-check — mounts one activity, script-driven
  ActivityErrorBoundary.tsx # One sim crash never blanks the lesson page
  StorageNotice.tsx        # One calm banner when localStorage cannot save
  SiteFooter.tsx           # About/Privacy/Terms/Accessibility + Report a problem
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

content/lessons/           # 197 lesson JSON files — the one curriculum, played on both
                           # the laptop and the phone. lib/phoneCourse.ts is a playlist of these.

lib/
  phoneCourse.ts           # The phone course: a playlist of lesson slugs + 4 gesture lessons
  feedbackLinks.ts         # The two Google Form URLs + the 75% threshold. Links only, never embeds
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

Actions: `open-file`, `open-folder`, `go-to` (sidebar), `new-folder` (`value`), `rename` (`target`+`value`), `move` (`target`+`into`, drag onto the folder, or select the file and pick the folder from the **Move to…** toolbar button — the no-drag path), `search` (`value`+`reveal`), `delete` (`target`), `restore` (`target`), `save` (`value`+`into`). Available folders for `move`/`save`/`go-to`: Documents, Pictures, Downloads (and Home/Trash for `go-to`).

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
    { "say": "Zoom in twice.", "action": "zoom-in" }
  ]
}
```

`mode` defaults to `"guided"`. Set `"assessment"` for objectives-only (no step-by-step highlighting). `initialDownloads` seeds the Downloads list on mount. Pages with special behavior: `weather.com` shows a cookie banner and ads, `freegames.example` is "Not Secure" and throws a scam popup, `recipebox.example` has a download button, `news.example` has fine print for zoom lessons. Cookie/popup/download steps must be preceded by a `navigate` to the matching page. Clicking **CLEAN NOW** on the popup fails the lesson with a message (teaches consequences). The `reload` action only completes when it fixes a broken page (pages navigated before a reload step render broken).

**`open-download` action**: requires `file` field (filename string, e.g. `"ApplePieRecipe.pdf"`). Only PDF files show an Open button in the Downloads panel. Clicking it opens an in-browser PDF viewer window showing the Apple Pie Recipe (title, ingredients, numbered steps, page 1 of 2, working zoom controls). The step completes when the matching file is opened. Must be preceded by `download` and `open-downloads` steps.

Keyboard-navigation practice lives in the **`keyboard-nav-game`** type
(`KeyboardNavTask`), a real Tab-through-a-Contact-Form activity — not in the
browser. An earlier `pickacolor.example` page with a `tab-sequence` action taught
the same skill on colored circles; it was removed because the form is the honest
version and duplicating the lesson only split it.

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

**The phone course writes into the same list, and shares its slugs on purpose.**
112 of its entries *are* laptop lessons, so finishing one on a phone marks the
same slug complete — which is correct, because it is the same lesson. Only the
four gesture lessons have their own `phone-` slugs. One store, so "Reset all
progress" clears everything and there is no second key to forget.

**There is no account and no server copy.** Progress lives in localStorage on the
learner's own device, never expires, and is theirs to erase from the Lessons
page. Accounts, Supabase and cross-device sync were removed on 2026-07-28: the
product sets no cookie, keeps no per-user data, and makes no third-party request.
It does count anonymous, aggregate page views through Vercel Web Analytics
(cookieless; the beacon is same-origin `/_vercel/insights`). Keep it that way —
`hostile-check` fails the build if any route sets a cookie or calls out to
another host, and the privacy copy (privacy page, cookie banner) must stay honest
about the page-view counting.

**Links out are fine; embeds are not.** The two feedback forms
(`lib/feedbackLinks.ts`) are Google Forms, and they are plain `<a target="_blank"
rel="noopener noreferrer">` links. Nothing is loaded from Google and no request
leaves the site until the learner clicks — which is why `hostile-check` stays
green. An `<iframe>` of the same form would contact Google on page load, break
the claim, and fail the build. That is the line for anything external added
later: **the learner chooses to leave, or it does not go in.** Say where a link
goes, too — every place these render carries "Opens Google Forms in a new tab.

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

## Lesson art and the layout that must not move

A lesson page is two columns: the text on the left, and on the right either the
activity or a picture. **The left column is one width for every kind of lesson**
(`lg:max-w-xl`). It used to be three — narrow with an activity, wider with a
picture, wide-and-centered with neither — so stepping through a module slid the
text about and read as three different websites. Only the right pane changes.

Every lesson with `type: "none"` therefore needs a picture, or the right pane
collapses and the layout starts moving again. `scripts/check-lessons.py` fails
the build on a no-activity lesson with neither `media` nor an entry in
`lib/lessonArt.ts`.

Art lives in three generated sets, all from `node scripts/generate-photos.mjs`,
all seeded so re-running is byte-identical:

| Manifest | Output | Manifest file | What it is |
|---|---|---|---|
| `MANIFEST` | `public/photos/` | `lib/photoAssets.ts` | the practice Photos library |
| `SITE_MANIFEST` | `public/site/` | `lib/siteArt.ts` | contact portraits, practice-website pictures |
| `LESSON_MANIFEST` | `public/lesson/` | `lib/lessonArt.ts` | the picture beside a no-activity lesson, keyed by slug |

The first two rasterize to WebP through the shared `finish()` — grain and a
strong vignette, which is what makes a photo read as a photo. Lesson art takes
`lessonFinish()` instead and stays vector: that finish on flat diagrams is noise
on every large flat area, and it was the reason the lesson set looked muddy. A
scene in `LESSON_MANIFEST` must also have an entry in `ANIM`, or the generator
throws.

Keep them separate: `PhotosApp` renders `PHOTO_ASSETS` wholesale, so an avatar
or a lesson diagram landing in that folder shows up in the learner's photo
library.

**The lesson art has one palette (`PAL`) and one ground (`stage()`). Use them.**
The first version let every scene invent its own gradient and the result was
sixteen near-identical gray-blue hazes nobody had chosen, plus a few unrelated
tints that read as accidents. A new scene picks a tint for `stage()` from the
existing families rather than mixing a fresh one, and takes its colors from
`PAL`; `contact()` is the grounded shadow that stops a subject floating.

**The callout is the most important mark in the set** — on most of these,
naming one part *is* the lesson — so `glowRect`/`glowCircle` are deliberately
loud: a blurred amber bloom, a crisp ring, a bright inner line. Two things about
them are load-bearing. The bloom is a blurred **stroke**, never a fill: filled,
it floods whatever it surrounds, and on the screen (the largest target in the
set) it turned the wallpaper olive and hid the thing it was pointing at. And its
size is capped in absolute terms, because scaled to the target it looked right
on a port and drowned the frame on a screen. A run of adjacent keys gets **one**
ring around the run, not one per key — ten amber boxes in a row read as
decoration.

Two geometry rules the drawings learned the hard way: the laptop lid is
**square-on, not tapered**, because a tapered lid means a trapezoidal screen and
the callout ring is a rectangle — the two never lined up. The deck below it
*does* keep its perspective, and needs it: drawn flat it was eleven pixels tall
and the keyboard came out as a solid bar, on the lesson whose subject is the
keyboard.

**Unit 1's and Unit 2's lesson art is deliberately one drawing repeated.** The
same laptop with a different part outlined, the same keyboard with a different
key outlined — so a learner meeting the seventh of them recognizes the machine
and only has to find the new part. Add to `laptop()` / `keyboard()` rather than
drawing a new machine.

**The lesson art moves, it ships as SVG, and it is *inlined into the page*, not
loaded as an image.** The server reads the module's art in
`app/lessons/[slug]/page.tsx` (`lib/lessonArtMarkup.ts`) and passes the markup
down; `LessonMedia` renders it inside a `role="img"` wrapper carrying the alt
text.

Inlining is load-bearing, for one measured reason: **`prefers-reduced-motion`
does not reach inside an SVG referenced as an image.** The media query in the
file is ignored and the picture keeps moving for the learner who asked it to
stop. Inlined, the query is evaluated against the page and honored. (Animation
itself works either way — a claim that browsers refuse to animate SVG-as-image
was made here and **withdrawn**: the page doing the measuring was hidden, which
freezes its whole timeline. `document.visibilityState` makes working animation
and broken animation look identical; check it before believing "nothing moved".)

**An inlined `<style>` is not scoped to its SVG — it applies document-wide.**
`scopeCss` in the generator namespaces every selector and keyframe name to
`#la-<file>`, and `assertScoped` fails the build on any rule that escapes.
Without it this set would publish site-wide rules for `.row`, `.link` and
`.key`, and a `prefers-reduced-motion` block that switched off every animation
on the site.

Two rules govern the keyframes:

- **The resting state is the finished state.** Every start position lives in a
  keyframe, never in the markup.
- **The first frame is a picture too.** A paused timeline holds frame 0 on
  screen — a background tab freezes `document.timeline` outright — so a keyframe
  starting at `opacity: 0` is not "not started yet", it is a *missing element*:
  a map with no route, a certificate with no seal. `assertPresentableFirstFrame`
  throws on it at build time, with **no fill-mode exemption** (`forwards` looks
  like one and is not: a paused animation has already started).
  Also check the animation does not argue with the lesson — the padlock in
  `safe-payment` does not swing shut, because closing it means showing it open
  first on the lesson about closed locks.

After touching `ANIM`, `scopeCss`, `lessonFinish`, `LessonMedia` or any lesson
scene, run **`npm run motion-check`** (needs `npm run dev`). Nothing else looks
at this — every other harness drives the DOM or measures a page holding still.
`MOTION_NEGATIVE=1` is the negative control: it puts the art back behind an
image and has been watched to fail, 8/8 still moving under reduced motion. See
`docs/LESSON_ART_MOTION.md`.

**Sizing a picture: cap the width, not the height.** `object-cover` inside a
short full-width box is a letterbox crop that throws the subject away — a
photo of a dog in a field became an empty field, and `object-bottom` then showed
four legs. `w-full max-w-[300px] h-auto` shows the whole picture at any pane
width. `object-cover` is only safe where the subject fills the frame (a
bookshelf, a banner behind overlaid text).

`LessonMedia` frames the lesson art in a soft rounded card, and that is only
safe because the art is **inlined**. With an `<img>` and `object-contain` the
element box was a fixed rectangle with the picture letterboxed inside it, so any
border framed mostly empty space — which is why there deliberately wasn't one.
An inlined SVG sized `w-full h-auto` *is* its own box, so the radius follows the
artwork. Anything that goes back to `object-contain` has to drop the frame again.
