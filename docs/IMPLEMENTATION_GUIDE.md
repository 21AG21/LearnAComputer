# LearnAComputer — Implementation Guide

The operational runbook for putting real learners through the course:
site setup, a four-week pilot plan, session scripts, and a troubleshooting
matrix. Companion to `docs/SALES_PLAYBOOK.md` (the selling) — this is the
delivering. Written so a program coordinator who has never seen the product
can run a pilot from this document alone.

---

## 1. Before anyone arrives (30 minutes, once)

1. **Machines.** Any laptop/desktop with Chrome, Edge, Firefox or Safari from
   the last ~3 years. No installs, no admin rights, no plugins. Phones and
   tablets are politely turned away by the site itself (it shows the address
   to open on a computer).
2. **Smoke test each machine:** open the site → complete Unit 1's first
   activity (the falling shapes) → open Unit 3's first lesson and finish it.
   Two minutes per machine. If those work, everything works.
3. **Locked-down machines:** the course works even where saving is blocked —
   learners see one calm banner saying progress lasts until the tab closes
   and that signing in saves it for good. On such machines, have learners
   sign in (step 4) at the start of every session.
4. **Accounts (recommended for multi-session programs):** learner clicks
   Sign in → types their email → types the 6-digit code from their inbox.
   No passwords, nothing to forget. Progress then follows them to any machine.
5. **Shared machines between learners:** previous learner signs out, then
   Dashboard → "Reset all progress" leaves the machine clean.

## 2. The pilot shape (recommended)

- **8–12 learners, 4 sessions of 60–90 minutes, Units 1–3.**
- Success metric to agree with the program *before* session 1:
  “≥80% of attendees finish Unit 1, and each completes the Unit 3
  real-folder mission unaided.”
- One instructor plus the course's own guidance is enough for 12 learners —
  the glowing highlight answers "where do I click?", so the human answers
  "why" and "you're doing fine."

| Session | Cover | Real-world anchor |
|---|---|---|
| 1 | Unit 1 (mouse, screen, windows) | The learner's own trackpad habits |
| 2 | Unit 2 through the typing test | Type + copy on their own machine (Unit 2 mission) |
| 3 | Unit 3 (files) | The messy-folder mission on their own machine |
| 4 | Buffer + Unit 4 start, or reruns | Learner picks any lesson to redo confidently |

## 3. Session scripts (say-this sheets)

**Opening any session:**
> "The computer on the screen is a practice computer. You cannot break it —
> that is the whole point. I want you to click wrong things today. Every
> mistake here costs nothing and teaches something."

**First minutes of session 1:**
> "See the yellow glow? The course always shows you the exact spot. If you
> ever feel lost, stop and look for the glow."

**When a learner freezes:**
> "Look for the glowing ring. Take your time — nothing here is timed."

**When a learner fails an activity (red card appears):**
> "Read what it says — it is telling you what happened, not scolding you.
> Press Try again. Real computers should be this polite."

**When a learner is stuck on an assessment (no glow — by design):**
> "Assessments let you find the way yourself. If you want a nudge, the Hint
> button points you at where to look without giving it away."

**When a learner wants to skip:**
> "Skip is always allowed. It will be here when you want another try."

**Introducing a real-world mission:**
> "This one is not practice — you will do it on this real computer, and the
> page can check your real work. Nothing you do is uploaded anywhere; the
> checking happens right here on this machine."

**Closing any session:**
> "What you did today was real computing. The next time a screen surprises
> you at home, remember: read it, look for the obvious button, and nothing
> breaks from one wrong click."

## 4. Troubleshooting matrix (for the instructor)

| Symptom | Cause | Fix |
|---|---|---|
| "It says my progress won't be saved" (amber banner) | The machine blocks browser storage | Expected on locked-down machines — have them sign in; progress then saves to their account |
| Learner's progress "disappeared" | Different machine or browser profile, not signed in | Sign in with the same email — progress merges, nothing is lost |
| "This activity hit a problem" card | The activity crashed and contained itself | Press Try again — the lesson page and progress are unaffected. Note the lesson name and report it |
| Full-screen "needs a bigger screen" page | They opened it on a phone/small window | Use a computer, or widen the window past ~900px; "Continue here anyway" exists for capable tablets |
| Typed the sentence "right" but it won't pass | A stray word — the target now highlights the first wrong word | Point at the highlighted word: "compare just that one" |
| Sign-in code never arrives | Typo in email, or slow mail | Re-send; check spam; codes expire — request a fresh one |
| The activity seems to ignore clicks | They're clicking near, not on — targets are generous but real | "Put the arrow's very tip inside the glow, then click once" |
| Learner closed the tab mid-lesson | Nothing is lost except the current activity's steps | Reopen the site — it resumes at the right lesson; the activity restarts cleanly |
| Wants to redo a finished lesson | Supported | Catalog → the lesson → Redo |

## 5. Weekly pilot cadence (coordinator prompts)

- **To the instructor, weekly:** "How many attended? How many finished the
  unit? Name one lesson where hands went up — we fix confusing lessons
  within the week." *(And it is true: report it; the harness plus a fix
  lands in days.)*
- **To us (bug intake):** lesson name, step number, what they expected,
  what happened, photo of the screen if possible. Anything reproducible
  gets fixed and confirmed back to you.
- **End of pilot:** attendance, completion counts against the agreed
  metric, three learner quotes, instructor's one-paragraph verdict. That
  package is the renewal conversation.

## 6. What not to promise during implementation

Same ground truth as the sales playbook §8: no instructor dashboard yet
(track with a paper sheet or the learners' own dashboards over shoulders),
no certificates yet, no Spanish yet. Say "on the roadmap," never dates.
