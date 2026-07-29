# Goal state — demo-ready, sales-ready, money-ready

**The standing goal (multi-session):** the product must be demo-available with
all capabilities, backed by a complete cold-call / demo / implementation
playbook, with every lesson hardened against every way a learner could hit a
wall — judged against the harshest test: *the worst single screen of this site
shown to a critical buyer who does not want to spend money.* Not met until the
product is beyond ready.

This file is the cross-session ledger. Update it every working session:
what moved, what's proven, what's still a demo risk.

---

## Scoreboard (update each session)

| Area | State | Proof |
|---|---|---|
| Every lesson completable, mechanically proven | **Done** — headless `npm run solve-check` is canonical; **all 132 playable activities pass, zero failures**, including every guided lesson AND all assessments. (Earlier ledger entries said "of 166" — that denominator was an accounting error; the playable set has always been 132: 198 lessons − 28 explanation-only − 38 exempt, which are 18 real-world missions plus 20 stepless activity types.) The final rounds surfaced four real product bugs invisible to every other check: WeatherNow's missing permission prompt made final-apps' allow-permission objective impossible; persistent installs stranded relearners on targetless install objectives; force-quitting the frozen app never satisfied "work out which app is stuck" once its window was gone; and markComplete dropped one of two same-tick objective completions. | `docs/SOLVE_CHECK.md`, `docs/HARDENING_ROUND_1.md` |
| Real-world missions provably finishable | **Done** — `npm run mission-check` plays **all 18 missions**, the last category no harness had ever touched (solve-check exempts them because their steps are satisfied outside the page). It drives the learner's *machine*: real PNGs whose real dimensions decide the landscape/portrait steps, real PDFs handed to the page's own file input, genuine paste events and key combinations, and CDP moving the screen, the window and the device pixel ratio independently. Proven honest by a negative control — feed the portrait step a wide photo and the run fails. This covered the four Unit 12 lessons converted from reading to missions that had never once been driven. | `scripts/mission-check.mjs` |
| Crash containment (no blank screens, ever) | **Done** — per-activity error boundary, friendly error/404 pages | `components/ActivityErrorBoundary.tsx` |
| Storage failure (library machines, private browsing) | **Done** — in-memory fallback + one calm banner | `lib/safeStorage.ts` |
| Reading level ≤ grade 8, enforced at build | **Done** — worst intro was 10.9, now all ≤ 5.6 | `scripts/check-lessons.py` |
| Curriculum order sanity | **Done** — audit script + Keyboard Tour split + scaffolding sentences | `scripts/audit-order.py` |
| Demo deployment | **Existing** — Vercel deploy from `main`; every push updates it | `CLAUDE.md` |
| Sales playbook (cold call, demo, objections) | **Done, v1** | `docs/SALES_PLAYBOOK.md` |
| Implementation runbook (setup, pilot plan, session scripts, troubleshooting matrix, all operator prompts) | **Done, v1** | `docs/IMPLEMENTATION_GUIDE.md` |
| Accounts + progress sync | **Removed 2026-07-28, deliberately.** The founder's call: no login, no Supabase, no user data at all. Progress is localStorage on one device, never expires. This trades cross-device sync for a privacy claim a buyer can verify in their own developer tools in thirty seconds. | `app/privacy/page.tsx` |
| Instructor visibility | **Removed 2026-07-28 and not coming back.** Built, then cut with accounts: a roster means collecting data about learners, and the product now collects none. Sales material says so plainly rather than promising a roadmap item that will not arrive. | `docs/SALES_PLAYBOOK.md §8` |
| Certificates | **Done, v1** — printable per-unit and full-course at /certificate, name asked at print time and never stored; verification codes still roadmap | `app/certificate/page.tsx` |
| WCAG/contrast measured | **Done** — scripts/contrast-check.mjs samples every text node on core pages in both themes; 14 real AA failures found and fixed (muted grays, dark-mode reds/blues); remaining 4 reports are false positives (hero text over the background image) | `scripts/contrast-check.mjs` |
| Wrong-device (phone) handling | **Done** — under 900px, a kind full-screen note with the live address and a continue-anyway escape | `components/SmallScreenGuard.tsx` |

## What is proven by machine, and what is not

Being straight about the boundary matters more than the size of the green
number, because everything outside it is assumption wearing the same clothes.

| Proven every run | How |
|---|---|
| 132 simulated activities playable to the end | `solve-check` |
| 18 real-world missions, on a real machine | `mission-check` |
| Every page a buyer might open, incl. all ~40 module pages | `hostile-check` |
| The sales demo path, stop by stop | `demo-check` |
| Recovering from a deliberate mistake, end to end | `recovery-check` |
| **No cookies and no third-party requests, on every route** | `hostile-check` |
| Multi-window desktop | `desktop-check` |
| Lesson shape, step targets, reading level, dialect | `check-lessons.py`, `spelling-check.py` |
| WCAG AA contrast, both themes | `contrast-check.mjs` |

| **Not** proven by machine | Why, and what covers it instead |
|---|---|
| 20 reflex / trackpad-gesture activities | A script cannot pinch a trackpad. Mount-checked, then driven by hand |
| Whether the writing is *good* | Reading level is measured; persuasion is not |
| Whether a real buyer says yes | No amount of harness output substitutes for a prospect's face |

## The "worst screen" watchlist

The buyer-with-crossed-arms test: what is the weakest thing they could land on?
Ranked, current worst first. Fixing the top item promotes the next.

1. ~~**Unit 12 "Documents and Printing"** — 6 of 9 lessons read-only~~
   **Fixed 2026-07-27:** four of the six converted to *checked real-world
   missions* using existing check kinds — the print shortcut is caught with a
   real Ctrl+P keypress, the PDF lesson verifies an actual just-downloaded PDF
   from the learner's Downloads, the notes lesson verifies a real copy-paste
   out of their own notes app, and the Google Docs lesson verifies a pasted
   docs.google.com address. Module is now 7 hands-on / 2 walkthroughs.
   **Closed 2026-07-28:** all four are now played end to end by
   `npm run mission-check`, so the conversion is proven, not assumed.
2. **A lesson failing mid-demo.** Mitigated by solve-check (132 simulated
   activities), mission-check (18 real-world missions) and the error boundary.
   The residual risk is the 20 stepless types — reflex games and real-trackpad
   gestures — which only mount-check covers, plus the intermittent below.
3. ~~**The dashboard/catalog wrapper pages**~~ — **worked on 2026-07-28.** The
   catalog is the dashboard (`/dashboard` redirects to it) and it is the
   leave-behind screenshot in the demo, so it was the worst screen left. On a
   first visit it opened with an empty full-width progress bar and sixty-six
   identical gray "Not started" pills over sixty-six empty bars: a page-sized
   picture of nothing, for a course that has not been started yet, which is
   exactly when a buyer looks at it. Now it says what the course *is* in one
   sentence (fourteen units, doing not watching, free, no sign-up), the call to
   action reads **Start here** rather than the untrue "Continue where you left
   off", each module shows its length — the one fact a beginner wants before
   clicking — and bars appear only where there is progress to draw. Unit 2 is
   above the fold where nothing was before.
   Still open, and a matter of taste rather than correctness: the unit
   thumbnails are decorative stock images that carry no meaning.
4. ~~**No instructor view**~~ — removed with accounts on 2026-07-28. The
   answer in the room is now a straight "no, and here is why", which is a
   better position than an unfinished screen.

## Real learner-stranding bugs found by solve-check (running tally)

Every one of these passed tsc, lint, the validator and mount-check, and would
have stranded a real learner mid-lesson:

1. `useStepRunner` finish race — every step done, completion never fired.
2. `useStepRunner` multi-complete race — one navigation advanced three steps,
   silently skipping two (Enter + Go + loading timer in one tick).
3. Email: step glowed a row hidden behind the open reading pane.
4. Photos: step glowed a tile hidden behind the open photo (Back never glowed).
5. Browser: step glowed a download row inside a closed Downloads panel.
6. Files: completing "arrow until highlighted" wiped the selection, making the
   very next step ("press Enter to open it") impossible by keyboard.
7. App Market: WeatherNow asked for no permissions, so final-apps'
   "read what it asked for and agreed" objective was impossible as authored —
   it now asks for Location, and updating-apps teaches the Allow step.
8. App Market: installs persist across lessons (by design), so a learner who
   installed the app earlier met an impossible targetless install objective —
   mount seeding now un-installs the select-app target too.
9. Troubleshooting: force-quitting the frozen app never satisfied "work out
   which app is stuck" — once the window was gone the objective was
   unreachable; force-quitting the frozen app now completes it.
10. `useStepRunner.markComplete` rebuilt its set from the state closure, so
    two objective completions in one tick silently dropped the first — any
    handler proving two objectives at once lost one.
11. Email assessments credited a compose field only on a keystroke, so anyone
    who replied or forwarded — where the address arrives pre-filled — was never
    credited for it. (Detail in the section above.)
12. The solver could not tell Mail's "Archive" folder from its "Archive"
    button. Harness-side, but it masqueraded as an unfinishable lesson twice.

## The gate itself was lying about filtered runs (fixed 2026-07-28)

`npm run solve-check -- some-slug` did **not** reliably play that lesson. The
queue was derived live from the filter box, so a script that typed a slug and
pressed Run in the same tick started on the filtered list and then wandered
into the unfiltered one: a one-lesson filter played 28 lessons and reported
"14 playable", a number matching neither the filter nor the course. Fixed in
two places — `SolveCheck` now freezes the queue when Run is pressed, and the
script waits for the queue to shrink before pressing it. The runner also
**prints the slugs it played** on any filtered run, so the tool states its own
scope instead of leaving it to be inferred.

Unfiltered full-course runs were never affected, so every "132/132" in this
ledger stands. But any *single-lesson* conclusion recorded before this date was
weaker than it looked, including the first round of evidence about the flake
below — that evidence was re-gathered after the fix.

## The "flake" was two real bugs (found 2026-07-28)

Chasing it properly — three full runs in a row, rather than re-running until
green — reproduced it twice, in two *different* guided-email assessments, and
both turned out to be defects rather than noise:

11. **A field only counted if you typed in it.** `set-to`, `set-subject` and
    friends were satisfied from the keystroke handler alone, so a learner who
    **replied or forwarded** — where the address is already filled in for them —
    did exactly what the objective asked and got no credit. After pressing Send
    the compose was gone and the objective looked impossible. Assessments now
    credit a field for *holding* the right value, not merely for changing.
    Guided mode is untouched: there the instructions say what to type, and
    crediting a pre-filled "Re: …" would tick a step the learner never reached.
12. **"Archive" the folder and "Archive" the action are the same word.** The
    solver's compound gesture clicked the sidebar folder instead of the reading
    pane's button — the screen changed, the objective did not, which is exactly
    what its trace said. Mail's folder names are now excluded from the
    action-button hunt (`go-to-folder` still reaches them).

**Fixed properly (2026-07-28), in the product rather than the solver.** Two
attempts at this from the solver side each half-worked: excluding the folder
names broke `mark-spam` outright, and preferring document order reduced the
recurrence without ending it. The actual problem was in the sim: the reading
pane's buttons were called **"Archive"** and **"Spam"** — the same words as the
sidebar folders — so *nothing* could tell them apart, including a screen
reader, which announced two identical "Archive" buttons doing different things.
They now say what they do: **"Move to Archive"** and **"Mark as spam"**. That
also drops jargon a beginner would not know, which is the course's own rule.
With the collision gone, excluding the folder names from the action hunt is
finally safe, and three consecutive full runs pass.

The lesson for the next session: an intermittent failure in this harness has so
far *always* been a real defect wearing a disguise. Reproduce it by running the
full course several times, and read which objective is outstanding — that
sentence has named the bug every time. Never conclude "flaky" from a re-run
that happened to pass.

## Older note: environment-sensitivity in the gate

`unit-6-assessment` failed a full-course run twice on 2026-07-28 (SolveCheck
retries first-pass failures and only reports a lesson that fails **twice**, so
this was not a single blip), then passed on its own, passed with all of Unit 6
in queue order, and passed on an immediate full re-run. The lesson file was
untouched by the change under test. Nothing in the email sim persists across
lessons — `GuidedEmailTask` never touches `lib/simState` — so the cross-lesson
carry-over theory that explains the older `a11y-assessment` flake does not
apply here; the likeliest cause is timing under load, since a second headless
browser was running against the same dev server at the time.

This matters beyond one lesson: **a gate that fails intermittently is
indistinguishable from a real bug**, and the response must stay "reproduce it
alone, then in its unit, then full" rather than "re-run until green." Do not
report 132/132 off a run that had other browser work competing with it.

## Handoff for the next session

**Run these first** (dev server on :3000): `solve-check` (132/132),
`mission-check` (18/18), `hostile-check`, `recovery-check`, `demo-check`,
`desktop-check`, then `check-lessons.py`, `check-actions.py`,
`spelling-check.py`. Nine gates; all green as of 2026-07-28.

**Debugging a solve-check failure**, the loop that works: filtered run (it now
prints the slugs it played — read that line) → read the solver trace → if
stuck, add a `[sim]`-prefixed console.log, which the runner relays → fix →
single-lesson retest → **full run** → commit. Twelve real learner-stranding
bugs have been found under "solver" failures this way. Assume any new failure
hides one, and never conclude "flaky" from a re-run that happened to pass.

**Two habits this project learned the hard way, both worth keeping:**

1. *Negative-control every new check.* Three separate harnesses here have
   reported a product fault that was really a bug in the harness, and one
   printed a confident green line while inspecting half of what it claimed.
   Break the bug on purpose and watch the check fail before trusting it.
2. *Be most suspicious of your own recent work.* The last four real defects
   were all found by auditing code written earlier the same session.

### The next engineering item

**Stage C's password-reset half is done** (2026-07-28) — see the session log
below and `docs/SAME_ICON_AUDIT.md` § *Round two*. What is left of task #123 is
smaller and lower-stakes:

**The error-code scenario's support page.** `GuidedTroubleshootingTask` still
hand-draws `support.example/help` as a card with a fake address bar, and the
`public-wifi` captive portal the same way. Both are web pages and belong in
`BrowserSimulator` inside a `DraggableWindow`, exactly as the bank site now is —
the pattern and the `fit` prop both exist, so this is an hour, not a day. Lower
stakes than the Mail one was: no unit teaches a support site the way Unit 6
teaches Mail, so no learner arrives with an expectation to violate. It is
nonetheless the last hand-drawn browser in the course.

### What is waiting on the founder, not on code

- **A conversation with a real buyer.** No harness substitutes for it, and
  nothing further in this repo can produce it. The migration and signed-in
  verification that used to sit here are gone: accounts were removed, so there
  is nothing left to switch on. Everything the product does is live.

## Session log

- **2026-07-28 (the last hand-drawn Mail):** Stage C's headline item, closed.
  Unit 11's password-reset lesson drew its own Mail app — a flat card with one
  row in it — behind the same dock icon Unit 6 spends nine lessons teaching, and
  its own browser as a card with a gray strip for an address bar. Both are now
  the real apps in the standard window frame: `GuidedEmailTask` with the full
  sidebar and reading pane, and `BrowserSimulator` with a tab strip, a lock
  icon, and an address bar that changes to the reset URL when the emailed link
  is followed. Done with four additive props on the email sim (`seedInbox`,
  `highlightEmail`, `highlightEmailAction`, `onOpenEmail`/`onEmailAction`), so
  none of the nine Unit 6 lessons changed. Fitting it turned up a real defect —
  a 520px window on a 435px desktop hung off the edge and clipped the very
  control step 1 was ringing — fixed with an opt-in `fit` prop on
  `DraggableWindow` that measures its desktop on mount. Played end to end in the
  browser; every harness green. Details in `docs/SAME_ICON_AUDIT.md`.
- **2026-07-28 (everything comes out):** The founder's call, and it makes the
  product simpler and the pitch stronger: **no login, no Supabase, no user data
  of any kind.** Deleted the sign-in page and magic-link callback, the auth
  provider and account nav, the cloud-progress sync, the classroom feature built
  earlier the same day (`/instructor`, `/join`, `lib/classes.ts`, its migration),
  three npm dependencies, and **Vercel Analytics** — because "we count page
  views" is not compatible with "we track only your session progress".
  Progress stays exactly where it always was: localStorage, on the learner's own
  device, with no expiry, erasable in two clicks.
  A storage notice now sits under the nav — a *disclosure*, not a consent gate,
  because there is nothing to consent to: no accept-all button, nothing blocked,
  and it never returns once acknowledged.
  Verified against a production build, not just dev: **zero cookies, zero
  third-party hosts contacted, empty localStorage until the learner acts.** The
  one cookie visible in development is Next's own `__next_hmr_refresh_hash__`,
  which no production build sets. `hostile-check` now asserts both on every
  route, because this claim is one careless `npm install` away from becoming a
  lie — and it is the claim the whole product now leads with.
  All sales material rewritten: free with no paid tier, no per-learner
  reporting now or later, and the privacy answer reframed as an invitation to
  check rather than a promise to trust.

- **2026-07-28 (a trap laid for the next author):** `open-app` was a
  **documented** App Market action that could never be satisfied. Its highlight
  case pointed at an `open-btn` that nothing renders, and no handler ever
  completed it. No lesson used it, so nothing was broken — but CLAUDE.md
  advertised it, which means the next person to follow the documented schema
  would have shipped an unfinishable lesson, and `check-lessons.py` would have
  passed it because the app name was real. That is precisely the failure that
  shipped twice before and motivated solve-check in the first place. Removed
  from the component, from `lib/lessons.ts`, and from the documented action
  list; opening an app is the dock's job, which is where the course teaches it.
  **Generalised the same day:** `python3 scripts/check-actions.py` compares each
  sim's declared action union against the actions some `tryStep` predicate can
  actually satisfy, and fails on anything an author could write but no learner
  could finish. Clean across 8 sims; two dispatch through a lookup table and are
  reported as not statically checkable rather than guessed at. Its own negative
  control earned its keep: the first version **did not catch** a reintroduced
  `open-app`, because a comment sitting inside the union stopped the regex early
  and half the union was never read. A check that quietly inspects half of what
  it claims to is worse than none — always re-break the bug and watch it fail.
- **2026-07-28 (widening the sweep, and naming the competition):**
  `hostile-check` now sweeps **every module page** — roughly forty, derived
  from the lesson files rather than hand-picked — not the fifteen chrome routes
  it started with. All clean. Added §5b to the sales playbook: the real
  competitive picture, which is that **the good alternatives are free**. Senior
  Planet (AARP) runs free live classes in groups of 12–15 with a helpline;
  GCFLearnFree has 2,000+ free tutorials, roughly ten times our page count; the
  local library is free, human and already trusted. The playbook now rehearses
  the objection that actually kills deals — *"AARP does this for free"* — and
  answers it with a question rather than a rebuttal, plus the one thing no free
  option does: check the skill on the learner's own machine. It also says
  plainly never to claim those tools are bad or that we have more content.
  Wrote `docs/SIGNED_IN_VERIFICATION.md`, because the signed-in half of the
  product is the one part no harness touches: a ten-minute two-browser script
  for sync and classes, and SQL that proves the row-level-security boundary by
  impersonating two learners — no sign-in required, and it will catch a data
  leak before a buyer does.
- **2026-07-28 (the buyer with crossed arms):** Every harness so far proved the
  product works when used correctly. None asked what a skeptic finds when they
  go off the demo path, which is the question that decides whether it earns
  money. `npm run hostile-check` now sweeps fifteen routes for console errors,
  failed requests, sideways scrolling, raw `undefined` in visible text, missing
  headings, generic browser tabs, and a keyboard user's first Tab landing
  somewhere visible — plus a mistyped lesson URL and a narrow window. It found
  and fixed a `/playground` with no `<h1>` at all, a certificate tab labelled
  only with the brand name, and a site-wide title that never said what the site
  is. Full findings in `docs/HOSTILE_BUYER_AUDIT.md`.
  **The one that mattered: pressing Next twice quickly skipped a whole lesson.**
  Not an edge case here — Unit 1 teaches double-clicking, and learners who have
  just been taught to double-click go on to double-click everything, including
  Next. A page of teaching went by unseen with nothing to say it had.
  Two attacks were tried and failed honestly, which is worth knowing before a
  buyer tries them: certificates are gated on real completion, and skipping an
  activity never marks it complete, so neither can manufacture a certificate.
- **2026-07-28 (classrooms):** The instructor view exists. An instructor makes
  a class, reads out a six-character code (no O/0 or I/1 to mishear), and sees
  a roster of who has finished what; learners join on `/join` with a name they
  choose and can leave whenever they like. Scope was decided rather than
  deferred, and deliberately narrow: finished lessons and a chosen name, never
  an email address, never time-spent or failure counts — none of which the
  product collects. Every rule is enforced in the database by row-level
  security, so a mistake in the client cannot show one instructor another's
  learners, and joining goes through a `security definer` function so nobody
  can list classes they were not given a code for. The privacy page now
  describes this flow, because it is the first time anything a learner does can
  be seen by somebody else. **Not live:** applying the migration was blocked by
  a permission gate, so it ships as a migration file for the founder to run,
  and every sales doc says the feature does not exist until then.
- **2026-07-28 (empty Notes, lying filter):** Opening all ten dock apps at
  once on `/playground` — the founder's "full functionality" check — showed
  nine apps with real content and **Notes as a blank white rectangle** with
  three toolbar letters and no invitation to type. Nothing was broken, which
  is why no harness had ever complained; it simply looked dead, on the screen
  the demo lingers on. Notes now opens with a short shopping-list note on the
  practice desktop, and the editor shows a placeholder whenever it is empty
  (in lessons too, where an empty box was equally mute). Seeding is written
  straight to the DOM so React does not own the contentEditable and no input
  event fires — a seeded note must never satisfy a lesson's "type something"
  step. Verifying that fix then exposed the filtered-run bug above.
- **2026-07-28 (missions):** The last unproven category in the course is
  proven. Eighteen real-world missions — one per unit, plus the capstone —
  were exempt from solve-check by construction: their steps are satisfied by
  things outside the page, so an in-page solver has nothing to click. Four of
  them were Unit 12 lessons converted from reading to missions and never once
  driven. `npm run mission-check` now plays the learner's *computer* instead
  of the learner: PNGs generated with real pixel dimensions so the
  landscape/portrait steps are decided by real geometry, real PDF bytes, a
  correctly-sorted folder tree handed to the same `webkitdirectory` input a
  learner uses, genuine `paste` events and key combinations, and CDP moving
  the screen, the window and the device pixel ratio independently. All 18
  pass. Two harness lies were caught and fixed on the way, both of which would
  have slandered the product: clicking server-rendered HTML before React
  hydrated (every mission looked stuck), and headless Chromium reporting
  `screen.availWidth` as the viewport, which makes "smaller than the screen"
  impossible. A negative control keeps the result honest — feed the portrait
  step a wide photo and the run fails.
- **2026-07-28 (spelling):** The founder caught "Practise first" on the
  homepage. The course had drifted into a mix of dialects — `colour` beside
  Tailwind's `gray`, `behaviour`, `recognise`, `favourite`, `neighbour`,
  `honour`, `metres`, `defences` — across 67 files of lesson copy, UI strings,
  code identifiers and docs. All now American English, which is the market the
  course is sold into. Two step-target families (`colour-filter-*`,
  `invert-colours`) were renamed in lockstep across the settings sim and four
  lessons; `a11y-colour-filters` keeps its British **slug** forever because
  progress is keyed by slug, and that exception is documented in CLAUDE.md and
  allowlisted by name in the new `scripts/spelling-check.py`. A dictionary pass
  over every learner-facing string turned up no genuine typos beyond the
  deliberate ones in `kb-delete` (the lesson where learners fix typos), which
  are exempted. Metric distances also became feet — "6.2 meters" reads foreign
  to the US programs being sold to.
- **2026-07-28 (later):** Three founder-directed items. **The practice desktop
  now holds several windows at once** — `FakeDesktop` tracked a single
  `activeApp`, so opening a second app silently closed the first, which made
  the "Working with Windows" module unteachable on the very screen it teaches.
  Rebuilt on two deliberately separate lists (`openApps` for DOM order,
  `stack` for z-order) after the naive one-list version introduced a worse bug:
  re-sorting the rendered list moved a window's element between mousedown and
  mouseup, cancelling the click, so Close on a background window raised it and
  swallowed the press. Guarded by `npm run desktop-check` (14 assertions);
  solve-check stayed green at 132/132 throughout, because no guided lesson
  opens two apps at once — which is exactly why this bug survived so long.
  **Vercel Analytics** added, and the privacy page rewritten to say so
  truthfully (it claimed "no analytics script"; a buyer who checks and finds a
  contradiction is lost). **Priya Elder Care demo runbook** written
  (`docs/DEMO_PRIYA_ELDER_CARE.md`) with a verified click path, and
  `npm run demo-check` proves every stop on that path loads clean — run it the
  morning of. Sales playbook ground-truth refreshed (certificates and the
  proven-completable claim are now shippable; privacy row corrected).
- **2026-07-28:** **Solve-check complete: all 132 playable activities pass,
  zero failures — every guided lesson and every assessment.** The last 13
  failures fell in one day of cluster-by-cluster work (app store, browser,
  messaging, email, photos, calendar, security, troubleshooting), each fixed
  by teaching the solver the sim's real vocabulary (aria-labels, alt text,
  phase ladders that never step backwards) — and four of them hid real
  product bugs, now items 7–10 in the tally above. The messaging and
  troubleshooting sims also gained aria-labels on icon-only buttons, a real
  accessibility improvement. The old "of 166" denominator in this ledger was
  an accounting error; the playable set has always been 132.
- **2026-07-27 (this session):** Master plan written and pushed. Stage A
  (solve-check harness) built — found and fixed a completion-race in
  `useStepRunner` affecting every guided sim, plus the email reading-pane
  strand (learner told to open an email whose row is hidden). Stage B landed:
  error boundary, safeStorage + notice, forgiving typing with first-wrong-word
  highlight, adaptive shapes game. Stage D landed: 11 intros rewritten, FK
  build check, order audit script, Keyboard Tour split, scaffolding sentences.
  Sales playbook v1 written. Full-course solve runs iterating; goal set.
- **2026-07-27 (later):** The embedded pane proved unusable for long runs
  (hidden-tab throttling froze the sims mid-run), so the harness gained a
  headless Playwright runner — `npm run solve-check` — which is now the
  canonical way to prove the course. Assessment solving was rebuilt on a
  per-objective done bitstring exposed by `SimulatorFrame`
  (`data-sim-objdone`), with compound select-then-act gestures after the
  solver was caught deleting one objective's file while chasing another.
  Unit 12's worst-screen problem closed by converting four read-only lessons
  into checked real-world missions (JSON-only, existing check kinds).
  Definitive full-course headless run: **135/166 playable lessons complete
  end-to-end**; the 31-lesson failure list (with per-failure screen
  diagnostics and solver traces) is committed as
  `docs/solve-check-latest.txt` — that file is the **standing worklist for
  the next session**. Triage note: the failures cluster by *solver
  capability* (multi-phase assessment flows: attach-photo pickers,
  open-downloads panels, phishing inspect flows, force-quit menus), and each
  cluster resolves like today's Unit 3 case did — trace, teach the solver
  the missing gesture, and occasionally find a real product bug underneath
  (two found and fixed today). Solo-pass/queue-fail non-determinism remains
  for a few (a11y-assessment) — suspect cross-lesson `lac-sim`/localStorage
  carry-over within one harness page session; consider clearing storage
  between lessons in SolveCheck. Commits: `7c46a6a`, `a94ce74`.
