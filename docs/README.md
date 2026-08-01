# docs/

Working documentation for LearnAComputer. Everything here is internal — none of
it ships to learners. Read `CLAUDE.md` at the repo root first; it is the
source of truth for the stack, the lesson schema, and every check harness.

Finished plans and one-time audits live in [`archive/`](archive/). The files
below are the ones still worth reading.

## Reference — how the current product and its guardrails work

| File | What it covers |
|---|---|
| [GOAL_STATE.md](GOAL_STATE.md) | Cross-session ledger: what's demo-safe now, what's mechanically proven, what's still a risk. Update it every working session. |
| [SOLVE_CHECK.md](SOLVE_CHECK.md) | The completability harness that auto-plays every guided lesson to the end. |
| [SAME_ICON_AUDIT.md](SAME_ICON_AUDIT.md) | One icon → one app, and the two negative-control harnesses (stray-check, double-click). |
| [SIM_DARK_MODE.md](SIM_DARK_MODE.md) | The practice computer's own dark mode (`sim-dark:`) and the `simdark-check` gate. |
| [SIM_CONTRAST_AUDIT.md](SIM_CONTRAST_AUDIT.md) | WCAG AA inside every activity — the `sim-contrast-check` gate. |
| [REAL_WORLD_MISSIONS.md](REAL_WORLD_MISSIONS.md) | The on-the-learner's-own-machine missions and how each check reads real state. |
| [DISCOVERABILITY_AUDIT.md](DISCOVERABILITY_AUDIT.md) | Authoring rules for assessment-mode lessons (hide the controls, never the goal). |
| [HOSTILE_BUYER_AUDIT.md](HOSTILE_BUYER_AUDIT.md) | What a skeptic finds off the demo path — the `hostile-check` gate. |
| [ADA_ACCESSIBILITY_AUDIT.md](ADA_ACCESSIBILITY_AUDIT.md) | Accessibility posture and the honest way to describe it in sales copy. |
| [FLEET_AUDIT_2026-07-31.md](FLEET_AUDIT_2026-07-31.md) | Latest cold multi-persona audit, with the fixed items and the remaining tail. |

## Sales & outreach

| File | What it covers |
|---|---|
| [SALES_PLAYBOOK.md](SALES_PLAYBOOK.md) | Everything to sell, demo, and implement — read cold, five minutes before a call. |
| [COLD_CALL_KIT.md](COLD_CALL_KIT.md) | The words, for dialing. |
| [DEMO_PRIYA_ELDER_CARE.md](DEMO_PRIYA_ELDER_CARE.md) | The elder-care demo script and after-visit follow-up. |
| [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) | Running a pilot once they say yes. |
| [GROWTH_PLAYBOOK.md](GROWTH_PLAYBOOK.md) | The reach machine: find → refer → reach → deliver → track. |
| [FREMONT_OUTREACH.md](FREMONT_OUTREACH.md) | Verified Fremont, CA targets and the cold-email kit. |

## Load-bearing — do not move or delete without updating the reader

- `scripts/pitch-check.py` reads **SALES_PLAYBOOK, COLD_CALL_KIT, DEMO_PRIYA_ELDER_CARE, IMPLEMENTATION_GUIDE** and fails the build if any doc they cite in backticks goes missing, or if a lesson/unit/mission/activity count drifts.
- `scripts/stray-check.mjs` cites **SAME_ICON_AUDIT.md**.
- **CLAUDE.md** points readers at SOLVE_CHECK, SAME_ICON_AUDIT, SIM_DARK_MODE, REAL_WORLD_MISSIONS, HOSTILE_BUYER_AUDIT, and DISCOVERABILITY_AUDIT by name.
