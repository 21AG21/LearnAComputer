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
| Every lesson completable, mechanically proven | **In progress** — `/dev/solve-check` built; full-course runs iterating (115→145→163 of 166 passing as harness matured); each real bug found is fixed same-day | `docs/SOLVE_CHECK.md`, `docs/HARDENING_ROUND_1.md` |
| Crash containment (no blank screens, ever) | **Done** — per-activity error boundary, friendly error/404 pages | `components/ActivityErrorBoundary.tsx` |
| Storage failure (library machines, private browsing) | **Done** — in-memory fallback + one calm banner | `lib/safeStorage.ts` |
| Reading level ≤ grade 8, enforced at build | **Done** — worst intro was 10.9, now all ≤ 5.6 | `scripts/check-lessons.py` |
| Curriculum order sanity | **Done** — audit script + Keyboard Tour split + scaffolding sentences | `scripts/audit-order.py` |
| Demo deployment | **Existing** — Vercel deploy from `main`; every push updates it | `CLAUDE.md` |
| Sales playbook (cold call, demo, objections, implementation) | **Done, v1** — keep current as product moves | `docs/SALES_PLAYBOOK.md` |
| Accounts + progress sync (multi-machine demo) | **Done** — email + code sign-in, merge-on-signin | `docs/ACCOUNTS_AND_SYNC.md` |
| Instructor visibility (the paid feature) | **Designed, not built** — Stage J of the master plan | `docs/PROGRESS_MONITORING.md` |
| Certificates | **Not built** — Stage J | `docs/MASTER_PLAN.md` §6.3 |
| WCAG/contrast measured | **Not done** — Stage F | `docs/MASTER_PLAN.md` §1.6 |
| Wrong-device (phone) handling | **Not done** — Stage E | `docs/MASTER_PLAN.md` §1.3 |

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
   *(Pending: drive each once in the browser before the next demo.)*
2. **A lesson failing mid-demo.** Mitigated by solve-check + error boundary;
   the residual risk is the exempt types (reflex games, real-trackpad
   gestures) which only mount-check covers.
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

## Session log

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
