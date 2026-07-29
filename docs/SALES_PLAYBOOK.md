# LearnAComputer — Sales Playbook

Everything a human (or an agent) needs to sell, demo, and implement this
product. Written to be read cold, five minutes before a call. Companion files:
`docs/GOAL_STATE.md` (what's demo-safe right now), `docs/MASTER_PLAN.md`
(what's coming), `docs/PROGRESS_MONITORING.md` (the classroom feature design).

---

## 1. What this is, in the words that sell it

**One sentence:** LearnAComputer teaches absolute beginners to use a computer
by *doing* — every lesson is a hands-on activity inside a safe simulated
computer, with a glowing highlight showing exactly what to click next, and
every unit ends with a checked task on the learner's **own** machine.

**The three differentiators (memorize these):**

1. **No quizzes, ever.** Quizzes test recognition; this course builds skill.
   198 lessons, and the learner is clicking, typing, and dragging in nearly
   every one. The simulated computer cannot be broken, so the fear that stops
   this audience — "what if I press the wrong thing?" — is engineered out.
2. **It checks real skills on the real machine.** Every unit ends with a
   mission on the learner's actual computer — organize a real folder, change
   real settings, copy between real programs — verified in the browser with
   nothing uploaded. No other beginner course closes the sim-to-real gap.
3. **Nothing to install, nothing tracked.** It runs in a browser. Progress is
   a list of finished lessons. No ads, no analytics, no data leaves the
   machine unless the learner signs in — and then it's an email address and
   that same list. For libraries and schools, the privacy story *is* a
   feature.

**The curriculum in one breath:** mouse and keyboard → typing → files → the
internet → messaging and video calls → email → photos → apps → settings →
online safety → troubleshooting → everyday life (shopping, documents,
printing) → making the computer easier to use (accessibility) → a full
final-assessment "trip" capstone. 198 lessons, 14 units.

## 2. Who buys it and why

| Buyer | Their pain | Our pitch |
|---|---|---|
| **Adult education / workforce programs** | Digital-literacy classes bottleneck on instructor attention; one teacher, twenty learners, forty hands in the air | The glowing-highlight guidance IS a teaching assistant per learner. Instructors coach the stuck, not the lost |
| **Public libraries** | Patrons ask staff for one-on-one computer help the desk cannot staff | Self-serve, zero-install, works on locked-down machines (it survives disabled localStorage), privacy story fits library values |
| **Senior centers / aging services** | Members isolated by the digital world; classes too fast, too jargon-heavy | Written at 5th-grade reading level, no time pressure anywhere, mistakes impossible in the sim, video-calling and messaging units reconnect them with family |
| **Adult children of aging parents (B2C)** | "I set up Mom's laptop and now I'm tech support forever" | Hand them the course instead of your weekends; the troubleshooting unit answers the panicked calls |

**Not yet the buyer:** elementary schools (COPPA-compliant accounts not built;
say "on the roadmap" honestly).

## 3. The cold call

**Opening (adult-ed / library):**

> "Hi — I'm calling because [org] runs digital-literacy programs, and I'd like
> to show you a course where beginners learn by actually clicking and typing
> inside a safe practice computer, instead of watching videos or answering
> quizzes. It takes ninety seconds to see. Could I send you a link, or show
> you on a call this week?"

**The one fact to land:** *every* lesson is hands-on with step-by-step
highlighting, and every unit ends with a checked task on the learner's real
computer. If they remember one thing, make it that.

**Qualifying questions (listen more than pitch):**
- "How do you run computer-basics help today — classes, one-on-one, handouts?"
- "What happens when twenty people need help clicking at once?"
- "What do your learners struggle with most — the mouse itself? Email? Scams?"
  (Whatever they name, we have a unit for it — name it back.)
- "Do you need to report outcomes to anyone — funders, a board?" (Sets up the
  instructor-dashboard conversation.)

**Close of call:** get a demo scheduled or send the link + one-pager. Never
end without a named next step and date.

## 4. The demo (12 minutes, scripted)

Run it on the production site. Before any demo: open the site yourself,
complete the first trackpad lesson and one guided lesson end-to-end. Never
demo a path you didn't drive that day.

**Minute 0–1 — frame it:**
> "Everything you're about to see, the learner does themselves. I'm going to
> make the mistakes a beginner makes, on purpose, so you can see what the
> course does when things go wrong — because that's where every other course
> loses people."

**Minute 1–3 — the first lesson** (`/lessons` → Unit 1, falling shapes):
show that lesson one is *clicking practice*, not reading. Miss a few shapes
on purpose — point out there's no fail state, no timer anxiety, and the game
quietly slows down for a struggling hand. "This is someone's first minute
ever holding a mouse. Nothing here can punish them."

**Minute 3–6 — a guided sim** (Unit 3, *Creating folders*, or Unit 6 email):
open the app from the dock ("the learner opens everything themselves — the
course never does it for them"), follow the glow, then **click the wrong
thing on purpose** — show the gentle nudge, no error, no dead end. Then
finish the step and show the completion moment.

**Minute 6–8 — the safety unit** (Unit 10 phishing): open the inbox sim,
inspect a link, mark the scam. "Their bank will thank you." This is the unit
buyers fund — scam losses are the number their board already knows.

**Minute 8–10 — the real-world mission** (Unit 3 mission): download the messy
folder, show the checker reading the learner's own work — and stress:
*nothing is uploaded; the check runs in the browser on their machine.* This
is the moment skeptics convert; let it breathe.

**Minute 10–12 — the close:**
> "Every unit works exactly like what you just saw. What would need to be
> true for you to put ten learners through Unit 1 next month as a pilot?"

**Demo hygiene:**
- Use a clean browser profile (no stale progress).
- If anything ever looks wrong, the honest line is: "Let me show you that on
  another lesson — and I'll have an answer for you on that one by tomorrow."
  Then file it and actually answer tomorrow.
- Never demo on a phone or narrow window; the course is built for the
  machines it teaches.

## 5. Objection handling

| Objection | Answer |
|---|---|
| "We already use YouTube videos / handouts" | "Videos are watching; this is doing. A learner can watch someone double-click all day and still not be able to. Here they double-click two hundred times before Unit 3 ends — and the course *checks* they can do it on their own machine." |
| "Our learners are too old / too far behind for software" | "This course assumes zero — lesson one is literally learning to click. Reading level is measured at 5th grade course-wide, nothing is timed, and every activity forgives every mistake. It was designed for exactly the person you're picturing." |
| "What about our locked-down computers?" | "Nothing to install — it's a website. It even keeps working when the machine blocks saving; the learner sees one calm note and keeps going, and signing in (an email and a code, no passwords) saves their progress across machines." |
| "How do we know it's working?" (funder/outcomes) | "Learners' progress syncs to their account, and the classroom dashboard for instructors is in development — today we support pilots with a simple check-in sheet, and pilot programs shape what that dashboard becomes." *(Do not oversell: the instructor view is designed, not shipped — `docs/PROGRESS_MONITORING.md`.)* |
| "What does it cost?" | Pricing is not published; the model under consideration is free for individuals with paid institutional visibility and certification. In a pilot conversation: "The pilot costs you nothing but a classroom hour. Let's earn the pricing conversation." *(Numbers are the founder's call — never improvise them.)* |
| "Data privacy? Our board will ask." | "No ads, no trackers, no behavioral profiling, and nothing sold or shared. We count page views through our host — cookieless, no visitor identifier, and it never sees a single thing from inside a lesson. Signed out, nothing else leaves the machine. Signed in, we store an email and a list of finished lessons; that is the entire data model, and deleting the account deletes it." *(Say "we count page views" — the privacy page says so, and a buyer who checks and finds a contradiction is lost.)* |
| "Is it accessible?" | Honest today: "Readable at a 5th-grade level, large targets, no time pressure, dark mode, and a full unit teaching learners to adjust their own settings. A formal WCAG audit is on the near-term roadmap." *(True per master plan §1.6 — update this row when it lands.)* |
| "We're an elementary school" | "The course reads at the right level, but our accounts require an email, which isn't COPPA-appropriate for under-13s yet. Classroom accounts without child emails are on the roadmap — can I keep you posted?" |

## 6. Implementation guide (what happens after yes)

**Pilot shape (recommended):** 8–12 learners, 4 sessions, Units 1–3.
Success metric agreed in advance: e.g. "≥80% of attendees finish Unit 1, and
each completes the Unit 3 real-folder mission unaided."

**Machine checklist (send ahead, 5 minutes per lab):**
1. Any modern browser (Chrome, Edge, Firefox, Safari) on a desktop or laptop —
   not tablets/phones for the core course.
2. Open the site, click Start — if the homepage loads, the course works.
3. Shared machines: learners should **sign in** (email + 6-digit code — no
   passwords to forget) so progress follows them; "Reset all progress" +
   sign-out cleans a machine between learners.
4. Sound is optional; nothing requires audio.

**Instructor prep (one hour):** do Unit 1 yourself end-to-end, including the
real-world mission. Read the unit's intros — they're the teaching script.

**Session prompts for instructors (say-this sheets):**
- Opening a session: "Today the computer on the screen is a practice one. You
  cannot break it. I want you to click the wrong things — that's how we learn
  what happens."
- When a learner freezes: "Look for the glowing yellow ring. The course is
  showing you the exact spot."
- When a learner fails an activity: "See — it told you what happened and gave
  you Try Again. That's what real computers should do."
- Ending a session: "Next time your grandkids send a photo, you know exactly
  which app it lands in."

**Support paths during pilot:** the Skip button (any activity can be skipped
and revisited), the Hint button (assessments), Reset all progress (dashboard),
and the instructor's own walkthrough knowledge. There is no in-app chat
support — say so, and give them your email.

## 7. Prompts library (for agents and humans running the machine)

- **Pre-demo smoke test:** "Open the production site in a clean profile.
  Complete Unit 1 lesson 1 and one guided-files lesson end-to-end. Run
  `/dev/solve-check` locally on any unit you plan to demo. Report anything
  that isn't green before the demo, not after."
- **Post-demo follow-up email:** "Thanks for the time today. Two links: the
  course itself — try Unit 1's first lesson, it takes 90 seconds — and the
  one-page privacy summary. You asked about [their question]: [answer]. I'd
  like to propose a 10-learner pilot of Units 1–3; I'll bring the machine
  checklist. Does [date] work?"
- **Pilot check-in (weekly):** "How many learners attended? How many finished
  the unit? Where did hands go up? Name one lesson that confused anyone —
  we fix those within the week." (And we do: file it, fix it, tell them.)
- **Bug triage from the field:** "Reproduce on the deployed site in a clean
  profile. If reproducible: slug, step number, expected vs. actual, screenshot.
  Then run solve-check on that lesson locally — if the harness passes but the
  human failed, the gap is the *instruction*, and the fix is copy."

## 8. Ground truth — never claim what isn't shipped

Shipped and demo-safe: 198 hands-on lessons across 14 units · guided
highlighting everywhere · assessments with hints · real-world missions with
in-browser verification · accounts with email-code sign-in and cross-machine
progress · printable per-unit and full-course certificates (`/certificate`) ·
a practice desktop that holds several windows at once (`/playground`) · dark
mode · crash containment (no blank screens) · locked-down machine tolerance ·
grade-5 reading level, enforced at build · **150 of the 170 activities
mechanically proven finishable, re-proven on every change** — 132 simulated
(`npm run solve-check`) plus all 18 real-world missions played on a real
machine (`npm run mission-check`) · WCAG AA contrast measured and fixed on the
pages learners read, in both themes (`scripts/contrast-check.mjs`).

The honest footnote, if pressed: the remaining 20 are reflex and trackpad-
gesture activities that are proven to render but are not auto-played, because
a script cannot pinch a trackpad. Say that plainly — the precision is what
makes the 150 believable.

Designed but NOT shipped (say "roadmap"): instructor/classroom dashboard ·
certificate verification codes · full third-party WCAG audit · Spanish ·
under-13 accounts · phone/tablet guidance page. The full sequence is
`docs/MASTER_PLAN.md`.

The fastest way to lose these buyers permanently is one overclaim. The
product's honesty is part of the product.
