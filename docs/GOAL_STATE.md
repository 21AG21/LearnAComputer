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

1. **Unit 12 "Documents and Printing"** — 6 of 9 lessons are read-only
   explainers in a course that sells itself as hands-on. A skeptical buyer who
   clicks here sees text, not the product's magic. (Master plan §2.3 — print
   dialog sim.)
2. **A lesson failing mid-demo.** Mitigated by solve-check + error boundary;
   the residual risk is the exempt types (reflex games, real-trackpad
   gestures) which only mount-check covers.
3. **The dashboard/catalog wrapper pages** — functional but plainer than the
   lesson experience (Stage F site-chrome pass).
4. **No instructor view yet** — for a school buyer, "how do I see my class?"
   currently has a design doc for an answer, not a screen.

## Session log

- **2026-07-27 (this session):** Master plan written and pushed. Stage A
  (solve-check harness) built — found and fixed a completion-race in
  `useStepRunner` affecting every guided sim, plus the email reading-pane
  strand (learner told to open an email whose row is hidden). Stage B landed:
  error boundary, safeStorage + notice, forgiving typing with first-wrong-word
  highlight, adaptive shapes game. Stage D landed: 11 intros rewritten, FK
  build check, order audit script, Keyboard Tour split, scaffolding sentences.
  Sales playbook v1 written. Full-course solve runs iterating; goal set.
