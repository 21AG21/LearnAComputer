# Solve-check: proving every lesson can be finished

`scripts/check-lessons.py` proves a step's *target exists*. `/dev/mount-check`
proves an activity *renders*. Neither proves a learner can *finish* — and two
lessons shipped that nobody could complete (`Cafe Guest`, the `select-day`
weekday), invisible to the type checker, the linter, the validator and the
mount harness alike. `/dev/solve-check` closes that class of bug: it plays
every guided lesson to the end, in a real browser, the way a learner would.

## How it works

- `lib/solve/gestures.ts` — low-level DOM gestures: clicks, double-clicks,
  long-press, typing (through the native value setter so React sees the
  change), range-dragging, window-dragging, key presses.
- `lib/solve/solver.ts` — the loop. Every guided step highlights the control
  the learner must use next, so the solver **follows the highlight**: find the
  ring, act on what it points at, check the activity moved. Assessment
  activities have no rings; there the solver works from each objective's
  `action`/`target`/`value`, finding controls by aria-label and visible text.
- `components/SolveCheck.tsx` + `app/dev/solve-check/page.tsx` — the harness
  page. Mounts each activity in a real 520px pane (so a control below the fold
  fails here, not in front of a learner), runs the solver, and reports a table:
  finished / stopped at which step and why.

A step fails in one of three ways, and the message says which:

1. **Highlights nothing on screen** — the ring points at nothing, or at
   something unreachable (zero-size, hidden, `pointer-events: none`).
2. **Does not respond to its own highlight** — the control is there, but no
   gesture on it advances the step (the shape of a handler that ignores its
   `target`).
3. **Never completes** — interactions change the screen but the step counter
   never moves (the spin guard, 14 interactions per step).

## What it caught on its first runs

- **`useStepRunner` could finish without ever saying so.** Two step
  completions in the same tick (a double-click whose `click` and `dblclick`
  handlers both satisfy a step) both read the same stale `stepIndex`, skipped
  the "was that the last step?" test, and left the activity complete but
  silent. Finishing is now decided by an effect watching where the walk ended
  up, and `finish()` is idempotent. Found on the *first lesson the solver ever
  played* (`file-what-is`).

## Machine-readable progress

`SimulatorFrame` exposes `data-sim-frame`, `data-sim-done`,
`data-sim-progress`, `data-sim-total`, `data-sim-mode` — the contract the
solver reads instead of parsing banner text.

## Exemptions

Types the solver deliberately does not play are listed in `EXEMPT` in
`solver.ts` with a reason each (reflex games, real-trackpad gestures,
off-screen reading, and `real-world` — which checks the learner's actual
machine). An exemption is a claim, so the harness prints the list.

## Hard-won harness rules

- **Never `requestAnimationFrame`** — frames stop in a background tab; one rAF
  hung the whole run with no error.
- **Fast path on MessageChannel macrotasks, not timers** — browsers throttle
  `setTimeout` to ~1s in unfocused windows, which turned a minutes-long run
  into an afternoon. Only deliberate sim delays (loading bars, restart
  animations) wait on the real clock.
- **Cancellation must stop the hands, not just the recording** — an
  `AbortSignal` ends the loop; a `cancelled` flag alone left the previous
  lesson's solver clicking inside the next lesson's pane.
- **An element that is itself interactive is the click target** — drilling
  into a ringed container's first inner button turned "drag the window" into
  "minimize the window" (the title bar contains the Minimize button).

## Running it

Dev server up, then visit `/dev/solve-check`, optionally filter by slug or
unit substring, press Run. Full course takes a few minutes with the window
focused. Run it after touching any sim component or lesson steps, alongside
mount-check.

## Current status

See the latest run results at the bottom of this file's companion audit
(`docs/HARDENING_ROUND_1.md`).
