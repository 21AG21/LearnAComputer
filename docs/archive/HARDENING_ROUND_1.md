# Hardening round 1 — Stages A, B, D of the master plan

Executing `docs/MASTER_PLAN.md`. This round covers Stage A (the solve-check
harness), Stage B (failure containment, storage safety, forgiving text, motor
skills) and Stage D (readability, curriculum order, the Keyboard Tour split).
Stage C (the last bespoke apps) is next.

Everything below was verified in a running browser, and the whole course was
played end-to-end by the new harness. Baseline measurements are in
`docs/MASTER_PLAN.md`'s appendix.

---

## Stage A — the solve-check harness

Built `/dev/solve-check` (`lib/solve/gestures.ts`, `lib/solve/solver.ts`,
`components/SolveCheck.tsx`): plays every guided lesson to the end by following
the highlight ring, and works assessments from their objectives. Full design
and the hard-won harness rules live in `docs/SOLVE_CHECK.md`.

### Real bugs it caught immediately

- **`useStepRunner` could finish an activity without ever saying so.** Two
  completions in one tick — a double-click whose `click` and `dblclick`
  handlers both satisfy the step — read the same stale `stepIndex`, so the
  final-step check never fired. Every step done, no completion, no
  `markComplete`. Fixed: finishing is an effect watching the walk's position,
  and `finish()` is idempotent. This hit the *first lesson the solver ever
  played* (`file-what-is`), and it is the same shape as the two unfinishable
  lessons the previous audit found by hand.

### The environment fought back (recorded so nobody re-learns it)

Four harness traps, each of which looked like dozens of broken lessons:
`requestAnimationFrame` never firing in background tabs; `setTimeout`
throttled to ~1s in unfocused windows; the embedded browser pane reporting a
**0×0 viewport whenever it is not on screen** (every element "unreachable" —
the suite passed only while watched); and cancellation that stopped the
recording but not the solver, leaving the previous lesson's "hands" clicking
inside the next lesson's pane. All four are fixed in the harness and
documented in `docs/SOLVE_CHECK.md`.

## Stage B — idiot-proofing

- **One sim crash can no longer blank a lesson page.**
  `components/ActivityErrorBoundary.tsx` wraps the playground pane in
  `LessonModuleRunner`; a runtime throw shows a calm "This activity hit a
  problem — Try again" card and remounts on retry. The lesson text, skip
  button, and navigation live outside the boundary and survive anything.
- **Storage cannot fail silently anymore.** `lib/safeStorage.ts` is the one
  localStorage wrapper all three stores (`lac-progress`, `lac-sim`,
  `lac-chats`) go through. Before: `simState` *threw* on write in private
  browsing (crashing the App Market's install click), and the other two
  dropped writes silently — worse, because reads came back empty within the
  same session, so a lesson finished a minute ago showed as not done. Now
  writes fall back to memory (the session keeps working), and the first
  fallback fires one event; `components/StorageNotice.tsx` shows a single calm
  banner: progress lasts until the tab closes, signing in saves it for good.
- **Typing checks forgive what keyboards do on their own.** `checkTypeText`
  now folds smart quotes, em-dashes and repeated whitespace before comparing
  (`exact` still judges capitals and punctuation — that is what those lessons
  teach). And a failed attempt highlights the first wrong word in the target
  with "check the highlighted word" (`firstMismatchWord` in `TaskChecker.ts`,
  rendered by `TypeTextTask`) instead of a bare try-again.
- **The first activity in the course no longer runs away from a struggling
  hand.** The falling-shapes game — often somebody's first minutes holding a
  mouse — quietly slows a notch each time a shape escapes un-clicked, down to
  about half speed. A confident clicker never notices; there is still no fail
  state either way.
- **Double-click timing audited:** every sim uses native `onDoubleClick`
  (platform timing, which respects OS accessibility settings). No hand-rolled
  timers found — nothing to fix, recorded so the next pass doesn't look again.

## Stage D — readability and order

- **Eleven intros rewritten.** Nine read above Flesch-Kincaid grade 8 (worst:
  `identity-theft` at ~10.9); all now sit between grade 3.6 and 5.6 with the
  same substance in shorter sentences. Two more (`pdfs-reading` at 216 words,
  `shopping-banking` at 199) were walls of text and were trimmed under 180.
- **The reading level is now a build check.** `check-lessons.py` warns above
  FK grade 8, fails above 10, and warns on intros over 180 words — regressions
  surface at build time without making every edit a fight.
- **`scripts/audit-order.py`** reports on curriculum shape: simulators used
  before the unit that teaches them, modules that interleave, modules too long
  for one sitting, and order-number headroom. It is a report, not a gate —
  some findings are deliberate and are recorded in the script with reasons.
- **Six early-app lessons got their scaffolding sentence.** Unit 2 deliberately
  types into Mail, the browser, Files and Messages before their units; each
  now tells the learner the app comes later and the glow carries every click.
  (`trackpad-double-click` needed nothing — opening files by double-click *is*
  that lesson.)
- **The 13-sub-lesson Keyboard Tour is split.** Orders 200–207 stay "Keyboard
  Tour" (the keys); 208–214 are now "Special Keys" (shortcut keys, Escape,
  Tab, arrows, and the Doggo challenge). Module strings are safe to change;
  slugs never are. The two other 9-lesson modules are accepted with reasons in
  the audit script (mostly read-and-continue explainers).

## Checked and found clean

- **`AppWindow` vs `DraggableWindow` is not a duplication.** The master plan
  assumed two competing window frames; in fact `AppWindow` is the *static*
  full-pane title bar and `DraggableWindow` the floating window, and both
  share `WindowControls`. No unification needed — plan item closed as wrong.

## Still open

- The solve-check exemption list (reflex games, real-trackpad gestures,
  off-screen reading, real-world missions) is printed by the harness; those
  types are covered by mount-check only.
- Solve-check runs in dev against the running dev server; it is not wired into
  a CI pipeline (the repo has none). The gate is procedural: run it before
  pushing sim or lesson changes, per `CLAUDE.md`.

## Verification

- `python3 scripts/check-lessons.py` — 198 lessons, 0 errors, 0 warnings
- `npx tsc --noEmit`, `npm run lint` — clean
- `rm -rf .next && npm run build` — clean
- `/dev/mount-check` — 166/166 mounted
- `/dev/solve-check` — full-course run; final counts in the commit message
