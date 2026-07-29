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
| Accounts + progress sync (multi-machine demo) | **Done** — email + code sign-in, merge-on-signin | `docs/ACCOUNTS_AND_SYNC.md` |
| Instructor visibility (the paid feature) | **Designed, not built** — Stage J of the master plan | `docs/PROGRESS_MONITORING.md` |
| Certificates | **Done, v1** — printable per-unit and full-course at /certificate, name asked at print time and never stored; verification codes still roadmap | `app/certificate/page.tsx` |
| WCAG/contrast measured | **Done** — scripts/contrast-check.mjs samples every text node on core pages in both themes; 14 real AA failures found and fixed (muted grays, dark-mode reds/blues); remaining 4 reports are false positives (hero text over the background image) | `scripts/contrast-check.mjs` |
| Wrong-device (phone) handling | **Done** — under 900px, a kind full-screen note with the live address and a continue-anyway escape | `components/SmallScreenGuard.tsx` |

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
3. **The dashboard/catalog wrapper pages** — functional but plainer than the
   lesson experience (Stage F site-chrome pass).
4. **No instructor view yet** — for a school buyer, "how do I see my class?"
   currently has a design doc for an answer, not a screen.

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

## Known flake in the gate (do not confuse with a bug)

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

Start here: `npm run solve-check` (dev server on :3000 first) — it should
report **all 132 playable activities pass**. If a change regresses that,
the debugging loop that works: filtered run → read the solver trace (`iter`
lines now name what each gesture clicked) → if stuck, add a `[sim]`-prefixed
console.log (the runner relays them) → fix → single-lesson retest → full run
→ commit. Ten real learner-stranding bugs were found under "solver" failures
this way — assume any new failure may hide one. Remaining goal work lives in
the worst-screen watchlist above (instructor view, site chrome) and Stage C
(task #123).

## Session log

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
