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
   learners see one calm banner explaining that progress will last until the
   tab closes. Everything still teaches; only the remembering is lost. On such
   machines, plan to finish a unit within a session.
4. **No accounts, by design.** Nobody signs in, nobody gives an email address,
   and the site sets no cookies. Progress is kept in that browser on that
   machine, does not expire, and follows nobody to another computer. Tell
   learners this plainly — for many of them it is the reassuring part.
5. **Shared machines between learners:** Lessons page → "Reset all progress"
   leaves the machine clean for the next person. Do it between learners.

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
| "It says my progress won't be saved" (amber banner) | The machine blocks browser storage | Expected on locked-down machines. The lessons all still work; only the remembering is lost, so aim to finish a unit in the session |
| Learner's progress "disappeared" | A different machine, a different browser, or private browsing — progress lives on one device and there is no account to restore it from | Explain it once, kindly, and use the same machine next session. Finished lessons can be redone quickly |
| "This activity hit a problem" card | The activity crashed and contained itself | Press Try again — the lesson page and progress are unaffected. Note the lesson name and report it |
| Full-screen "needs a bigger screen" page | They opened it on a phone/small window | Use a computer, or widen the window past ~900px; "Continue here anyway" exists for capable tablets |
| Typed the sentence "right" but it won't pass | A stray word — the target now highlights the first wrong word | Point at the highlighted word: "compare just that one" |
| The activity seems to ignore clicks | They're clicking near, not on — targets are generous but real | "Put the arrow's very tip inside the glow, then click once" |
| Learner closed the tab mid-lesson | Nothing is lost except the current activity's steps | Reopen the site — it resumes at the right lesson; the activity restarts cleanly |
| Wants to redo a finished lesson | Supported | Catalog → the lesson → Redo |

## 5. Weekly pilot cadence (coordinator prompts)

- **To the instructor, weekly:** "How many attended? How many finished the
  unit? Name one lesson where hands went up — we fix confusing lessons
  within the week." *(And it is true: report it; the harness plus a fix
  lands in days.)*
- **To us (bug intake):** there is a **Report a problem** link in the footer of
  every page, and on the card that appears if an activity ever breaks. It opens
  a short Google Form in a new tab. Learners can use it themselves, but in a
  supervised session the instructor usually gets better detail: lesson name,
  step number, what they expected, what happened, photo of the screen if
  possible. Anything reproducible gets fixed and confirmed back to you.
- **Course feedback:** once a learner is three quarters of the way through, a
  card appears on the Lessons page inviting them to fill in a short evaluation.
  It is optional and anonymous, and it never interrupts a lesson. If you are
  running a pilot, that form is the easiest way to get learner voice into your
  end-of-pilot report — point people at it in session 3 or 4.
- **End of pilot:** attendance, completion counts against the agreed
  metric, three learner quotes, instructor's one-paragraph verdict. That
  package is the renewal conversation.

## 6. What not to promise during implementation

Same ground truth as the sales playbook §8. There is **no instructor dashboard
and none is coming** — per-learner reporting means collecting data about
learners, and this course deliberately collects none. Track a pilot with a
paper check-in sheet and the unit certificates learners print. No Spanish yet;
say "not yet," never a date. The course is free, so never imply a future price.
