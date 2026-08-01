# LearnAComputer — Master Plan: from finished course to shippable product

**Written 2026-07-27, at commit `07200e9`. Audience: an executor model (Opus 5) working
workstream by workstream.** Read `CLAUDE.md` at the repo root first — it documents the
stack, the lesson JSON schema, and every playground task type; this plan assumes that
context and does not repeat it. `docs/EXECUTION_PLAN.md` (QA Round 4) is **complete** —
every stage is marked done and verified. This plan supersedes it as the active work queue.

The six goals, in the user's words:

1. Idiot-proof the site
2. Create more lessons where the curriculum has gaps
3. Unify the UI
4. Make sure the order of the lessons makes sense
5. Make sure nothing is too difficult — someone with absolutely zero knowledge of
   computers can become computer literate and decent with technology
6. Think about how this will be sold — to adult schools, to elementary schools, to
   adults who want to teach their parents — and give them the tools to do anything
   they want

These map to Workstreams 1–6 below. **Workstreams 1, 3, 4, 5 are quality work on what
exists; Workstream 2 is new content; Workstream 6 is new product surface.** The
execution order at the end interleaves them — do not run them 1→6.

---

## How to work this plan

1. **After every stage** run all four checks; all must pass before moving on:
   ```sh
   python3 scripts/check-lessons.py
   npx tsc --noEmit
   npm run lint
   rm -rf .next && npm run build
   ```
2. **Then drive it in the browser.** Start the dev server via `.claude/launch.json`
   (`preview_start` with `{name: "dev"}`), never raw Bash, and never run `npm run build`
   while the dev server is running. Complete — not just look at — every lesson you
   touched. Run `/dev/mount-check` after any component change.
3. **Commit per stage** with a descriptive message; push to `main`.
4. **When a stage changes the lesson JSON schema**, update `CLAUDE.md` in the same
   commit.
5. **Every workstream gets its own audit-style doc in `docs/`** when it lands,
   following the house pattern (what was found, what was fixed, what was checked and
   found clean, what is deliberately left open).

### Hard rules (carried forward — violating any is a defect)

- **No multiple-choice / quiz activities. Ever.** Hands-on and guided only.
- **No OS or app brand names in the simulated OS.** Real websites inside the simulated
  browser are fine.
- **Never rename an existing lesson `slug`** — progress is keyed by slug. Deleting is
  fine; new lessons get new slugs. **Changing `order` numbers and `unit`/`module`
  strings is safe** — nothing keys off them.
- **Never write a `lac-*` localStorage key directly** — go through `lib/progress.ts`
  / `lib/simState.ts` / `lib/chat.ts` so Reset actually resets it.
- **One app per icon** — `Desktop/AppBody.tsx` is the single answer to what a dock
  icon opens. Never hand-draw a stand-in for an app that exists. If a scenario needs
  different data inside a real app, seed the real app.
- **Step targets must exist** — keep the UNKNOWN TARGET check in
  `scripts/check-lessons.py` fed when a sim gains a new targeted action.
- **Handlers must honor `target`** — a `tryStep` predicate that ignores its target is
  wrong in assessment mode even when guided ordering hides it.
- **Assessments state outcomes, never clicks**, and never hide a value the learner
  could not have seen (`**bold**` givens in the brief).
- **No emoji for UI glyphs** (SVGs from `Icons.tsx`); reaction-picker and app-identity
  emoji in content are the two exceptions.
- **First letter capitalized** in every learner-facing sentence.
- **Realism principle** — every activity is performed the way a person would do it on
  a real computer; the learner opens apps from the desktop themselves.

---

## Verified current state (measured 2026-07-27)

- **198 lessons, 14 units** (Units 1–12, Unit 13 accessibility, Final Assessment),
  every one completable — `check-lessons.py` passes, `/dev/mount-check` is 166/166,
  and the last two unfinishable lessons were found and fixed in `SAME_ICON_AUDIT.md`.
- **Activity mix:** 32 lessons are `type: "none"` (16%); the rest are hands-on.
  Heaviest types: guided-browser ×24, guided-settings ×24, real-world ×14,
  guided-files ×13, guided-email ×12. Ten types are used exactly once.
- **Readability (Flesch-Kincaid on `drDigitalIntro`):** median grade **5.1**, mean 5.2
  — genuinely good. **10 lessons sit above grade 8**, worst `identity-theft` at 11.4.
  Median intro is 80 words; the longest is 216.
- **Step counts:** median 4, maximum 10 (`calendar-reminders`). Nothing pathological.
- **Accounts:** none. Passwordless sign-in, Supabase and cross-device sync were
  **removed on 2026-07-28** at the founder's direction, along with the classroom
  dashboard and analytics. Progress lives in `localStorage` and nowhere else. Do
  not resurrect any of it from the sections below without checking that decision
  still stands — the privacy claim is now the product's main differentiator.
- **Open items inherited from previous audits** (all folded into workstreams below):
  - The troubleshooting sim still draws its own Mail and its own browser support page
    (`SAME_ICON_AUDIT.md` → Workstream 3).
  - `/dev/mount-check` proves activities *mount*, not that they can be *completed*
    (`SITE_AUDIT.md` → Workstream 1, the single most important item in this plan).
  - Contrast has never been measured; `/accessibility` says so honestly
    (`SITE_AUDIT.md` → Workstream 1).
  - No automated test suite beyond validator/tsc/lint/mount harness → Workstream 1.
  - `open-btn` dead highlight in the App Market; Color/Color split across two apps
    (deliberate); `facetime-*` slugs are branded and frozen → Workstream 3.
  - The supervisor view was designed, built, and then **deleted on 2026-07-28**
    along with its design doc. It is not a roadmap item; it is a decision.

---

# Workstream 1 — Idiot-proof the site

The audience reads "nothing happened" as "I broke it" and "an error" as "I broke it
expensively". Idiot-proofing means: nothing dead-ends, nothing is lost, nothing
depends on the learner guessing, and every failure the site can have is caught before
a learner meets it.

## 1.1 The completability harness — the headline item

`check-lessons.py` proves a step's *target* exists; `/dev/mount-check` proves the
activity *renders*. Neither proves the steps can be *finished* — the two unfinishable
lessons (`Cafe Guest`, `select-day`) sailed through both. Close the class of bug, not
instances of it.

**Build a per-type auto-solver harness.** For each guided task type, a solver that
reads the lesson's `steps` array and drives the mounted component to completion the
way a learner would. Two viable architectures — pick after a spike:

- **(a) In-page, extending `/dev/mount-check`:** each `GuidedXxxTask` exports a
  dev-only `solveStep(step)` that performs the DOM interaction for a step (click the
  element the highlight ring points at, type the value, etc.). The harness mounts the
  activity, calls the solver step by step, and asserts `done` fires. Pro: no new
  dependency, runs where mount-check already runs. Con: solvers that dispatch
  synthetic events can drift from what a real click does.
- **(b) Playwright driving the real dev server:** one spec per task type, lesson JSON
  as test parameters. Pro: real events, real browser, catches CSS-level unreachability
  (control rendered but off-screen or covered). Con: first test dependency in the
  repo; slower.

**Recommendation: (b), Playwright** — the `chrome={false}` layout collapse and the
below-the-fold Restart button were both CSS-level bugs invisible to synthetic events.
Wire it as `npm run solve-check`. Requirements regardless of architecture:

- Covers **every lesson with a `steps` array** in guided mode, and every assessment by
  performing objectives in JSON order (they must be completable in *some* order; also
  run a shuffled order for the three sims with the most assessment coverage).
- Asserts the completion banner appears and `markComplete` would fire.
- A lesson the solver cannot finish **fails loudly with the step index and action**.
- Document per-type solver coverage in the workstream doc; `real-world` checks are
  exempt (they read the learner's actual machine) — solver-exempt types are listed
  explicitly, not silently skipped.

**Acceptance:** reintroducing either historical bug (`Cafe Guest` target, the
`select-day` weekday comparison) makes `solve-check` fail. Prove it by reverting each
fix locally, watching it fail, and restoring.

## 1.2 Nothing is ever lost

- **Refresh / crash mid-module:** completed sub-lessons are already durable, but the
  learner's *position* inside a module resets to the first incomplete sub-lesson.
  Verify that resume-at-first-incomplete actually lands them where they were in every
  case (it should, since position ≈ first incomplete); fix any module where a
  completed-but-mid-review state strands them.
- **Refresh mid-activity:** step progress inside a running activity is lost by design
  (activities are short). Keep that, but make sure the activity restarts *cleanly* —
  no half-mutated `lac-sim` state that makes attempt #2 different from attempt #1.
  Audit every sim that writes `lac-sim` (App Market installs) or `lac-chats` for
  restart-safety.
- **localStorage unavailable** (private browsing on some setups, locked-down library
  machines): today this likely throws or silently drops progress. Add a probe in
  `lib/progress.ts`; on failure, fall back to in-memory storage and show one calm,
  non-blocking banner: progress will last until the tab closes, and signing in will
  save it for real. Never crash, never silently lose work.
- **Sign-in edge cases:** wrong code, expired code, email typo'd — walk the `/login`
  flow deliberately mistyping at every field and make every failure message say what
  to do next, not what went wrong internally.

## 1.3 The wrong device, handled kindly

The course teaches desktop computing; the sims need a keyboard and a pointer. A
learner opening it on a phone gets a broken-feeling experience through no fault of
their own — and this audience *will* be sent links via text message.

- Detect small viewports / coarse pointers at the app shell level. Below a working
  threshold, show a full-screen friendly page: this course teaches laptop and desktop
  computers, so open it on one — with the URL displayed huge, and an "email me the
  link" box (reuses the existing email plumbing; no account created).
- Tablets with keyboards are a judgment call — test one mid-size breakpoint and pick
  a threshold honestly rather than guessing.
- Lesson pages must never render a sim squashed into an unusable sliver. The
  fullscreen affordance already exists; the guard is for viewports where even
  fullscreen cannot work.

## 1.4 Stuck detection — the site notices before the learner gives up

All local, no telemetry. `useStepRunner` knows the current step and when it last
advanced:

- No progress on a step for ~45s in guided mode → Dr. Digital proactively surfaces
  the existing `drDigitalHint` (hint mood, gentle animation — not a popup).
- Another ~60s → a calm "Want to skip this one? You can come back any time" affordance
  near the existing skip button.
- Thresholds are constants in one place; tune after real use. Never triggered while
  the learner is actively interacting (reset the timer on any pointer/keyboard
  activity inside the sim, not just on step completion — being *busy but wrong* still
  deserves the hint, so cap the reset: activity postpones the hint at most once).
- Assessment mode: the same idle detection surfaces the Hint button's existence, never
  the hint content itself.

## 1.5 Read-aloud — the literacy safety net

Part of this audience reads with difficulty; some are learning English. The Web
Speech API (`speechSynthesis`) is built into every target browser and needs no
dependency.

- A speaker button on the Dr. Digital bubble reads the intro aloud; the same control
  on step banners reads the current instruction. One shared hook
  (`useReadAloud`), sentence-by-sentence highlighting optional but valuable.
- Site-level toggle ("Read instructions aloud") in the site's accessibility page,
  persisted through a proper `lib/` accessor (a new sub-key under `lac-sim` or its own
  documented key added to the reset list — follow the house rule).
- Degrade silently when `speechSynthesis` is absent; never a broken button.
- This is also a Workstream 6 selling point (elementary schools, ESL adult programs).

## 1.6 Accessibility debt — measure, then fix

- **Contrast:** run the palette (both themes, including sim-dark-mode-inside-site-
  dark-mode) through a WCAG AA contrast check. Fix failures; then update
  `/accessibility` to claim AA honestly, listing anything still open.
- **Keyboard:** the site chrome (nav, catalog, lesson panel, buttons) must be fully
  keyboard-operable with visible focus. The sims themselves are pointer-first by
  nature (they teach the mouse) — document that stance on `/accessibility` instead of
  pretending otherwise, and keep the keyboard-specific lessons (`keyboard-nav-game`,
  `notes-shortcut`) as the keyboard path.
- **Reduced motion:** `prefers-reduced-motion` should disable the celebration
  overlay animation, page transitions, and pulsing highlight (swap pulse for a solid
  ring — the *information* must survive, only the motion goes).
- **Screen readers:** an honest pass over the site chrome (landmarks, labels, the
  progress announcements). Full sim screen-reader support is out of scope — say so.
- WCAG AA on the site chrome is a hard requirement for the school/library sales in
  Workstream 6; treat it as product work, not polish.

## 1.7 Failure containment

- **Per-activity error boundary:** wrap the playground pane so a runtime throw inside
  one sim shows a friendly "This activity hit a problem — Try again" card (reusing the
  existing fail-card pattern) instead of unmounting the lesson page. The lesson text,
  skip, and navigation must survive any sim crash.
- **Slow machines:** this audience owns old laptops. Profile the heaviest lesson pages
  with 6× CPU throttle; anything interactive must stay responsive. Check bundle sizes
  didn't regress since the 2 MB trim (`SITE_AUDIT.md`); images in
  `public/playgrounds/` should be sized to their display dimensions.
- **Shared computers (libraries):** verify the story is coherent — sign out actually
  detaches, "Reset all progress" plus sign-out leaves a genuinely clean machine for the
  next learner, and signing in on a used machine *merges* rather than clobbers (the
  merge exists; drive it once with a deliberately conflicting local state).

## 1.8 First-run experience

Walk it as a stranger: land on `/`, no context. There must be exactly one obvious
thing to do (start Unit 1), the returning learner must land one click from where they
left off (resume exists — verify it), and nothing on the homepage assumes vocabulary
that Unit 1 teaches. Test with the narrowest realistic desktop viewport, at 200%
browser zoom, and in both themes.

---

# Workstream 2 — More lessons: closing the curriculum gaps

The 198 lessons teach the *computer*. What's thinner is *doing real things with it* —
which is the entire point for this audience, and the substance behind "give them the
tools to do anything they want". Gap analysis against what an adult actually needs,
cross-checked against the Northstar Digital Literacy standards (the assessment
framework adult-ed programs already use — alignment here is also a Workstream 6
selling point).

## 2.1 Authoring standards for all new content

Every new lesson follows the existing bar: `drDigitalIntro` thorough enough to
re-teach (4–6 beats: what/why/how/common mistake), FK grade ≤ 8 (see 5.1), guided
steps ≤ 12, targets that exist (the build check enforces), assessments state outcomes
not clicks. New browser-sim pages get added to `PAGES` in `GuidedBrowserTask.tsx` and
documented in `CLAUDE.md`'s site table. Prefer extending existing sims over new task
types; a new type needs the full four-step wiring plus solver coverage (1.1) plus
schema docs.

## 2.2 New unit: "Doing Real Things Online" — order range 1400–1499

Sits after Unit 13 (1310–1361), before the Final Assessment (1510+), so the capstone
stays last. This is the highest-value new content: each module is a complete
real-world errand, done end-to-end in the sims the learner already knows.

| Module | Lessons (sketch) | Vehicle |
|---|---|---|
| **Shopping online, safely** | Browse a shop, add to cart, walk a checkout *up to* the payment page and learn to read it (total, seller, https) — then stop; "when to trust a shop" | `guided-browser` + new `shop.example` cart/checkout pages. **Never simulate entering card numbers** — the lesson is reading the page, and the stated reason is "never type your card where you're not sure" |
| **Filling out forms** | A realistic sign-up/appointment form: text fields, dropdowns, checkboxes, the Submit moment, "what if I make a mistake"; reading a confirmation | `guided-browser` + new `cityservices.example` form page; new `fill-field`/`submit-form` step actions |
| **Watching and listening** | Play/pause/volume/fullscreen on a video page; turning captions on; finding something to watch | `guided-browser` + new `video.example` page with a working player sim |
| **Maps and getting around** | Search a place, read the route summary, switch to transit | `guided-browser` + new `citymaps.example` page |
| **Your money online** | Reading a bank balance and statement on `firstbank.example` (already exists, already "secure"); spotting a transaction you don't recognize; why the lock matters here most | `guided-browser` — extends the existing bank page. Reading only; never moving money |
| **Health online** | Booking an appointment on a portal (form + calendar skills combined); a telehealth call (reuses the video-call sim); refilling a prescription flow | `guided-browser` + `guided-messaging` call reuse |
| **Talking to AI assistants** | What a chatbot is; asking a real question; **what not to trust** (it can be wrong, it is not a person, never give it passwords); spotting AI-written scam text | New `assistant.example` chat page in the browser sim — the chat UI can reuse messaging components. 2026-relevant and almost no course for this audience teaches it |

Each module ends with its own mini real-world mission where checkable (e.g. maps:
type-answer the distance between two named places using any real maps site).

## 2.3 Filling thin spots inside existing units

- **Unit 12 "Documents and Printing" is 6/9 `type: "none"`** — the weakest module in
  the course. Build a **print-dialog sim**: a Print button in the Files/Notes app
  raising a realistic dialog (printer picker, copies, page range, the difference
  between Print and Save as PDF). Two or three of the `none` lessons become guided.
  Save-as-PDF is itself a skill worth a lesson.
- **Typing fluency:** Unit 2 teaches keys, but fluency needs reps. Add an optional
  "Typing practice" module (3–4 `type-text` drills with graded difficulty) marked
  clearly as practice-any-time, plus a pointer from the graduation page.
- **Scam fluency:** Unit 10 covers phishing well. Add one module on the *other* big
  three aimed at this exact audience: the tech-support popup call ("Microsoft calling"
  — extends the existing CLEAN NOW popup lesson into a phone-call scenario), the
  gift-card demand, and the grandparent/urgency scam. `spot-the-fake` +
  `guided-security` carry these without new types.
- **Software updates:** Unit 8 covers app updates; nothing covers the *system* update
  ("your computer wants to restart — is that safe? yes, and here's why you shouldn't
  put it off forever"). One `guided-settings` lesson + one `none` explainer.
- **Wi-Fi at home:** Unit 11 troubleshoots Wi-Fi; nothing explains the router. One
  `none` lesson (what the blinking box is, the turn-it-off-and-on ritual, where the
  network name/password sticker is) — physical topic, so no playground pane, per the
  house rule.
- **QR codes:** Unit 12 "Out and About" mentions URLs; QR codes are how the world
  hands them out now. One short lesson (what it is, phone camera, when *not* to scan).
- **Backups and "where are my files really":** one honest module — what the cloud is,
  what lives on the machine vs in an account, and the one-sentence backup habit.

## 2.4 What deliberately does *not* get lessons

Record these in the workstream doc so future passes don't re-litigate: social media
mechanics (platform-specific, churns fast — the *safety* principles are already in
Unit 10), spreadsheets/word-processor deep skills (that's a second course; the
document *concepts* are covered), cryptocurrency and investing (out of scope and a
safety hazard for this audience), and anything requiring a real account on a real
third-party service inside a lesson.

---

# Workstream 3 — Unify the UI

The big unification (one Files app, one app per icon, shared step runner, shared
frame) is done. What remains is the tail — and the tail matters because every
inconsistency is a "wait, this looks different, did I break it?" for this audience.

## 3.1 The last two bespoke apps (from `SAME_ICON_AUDIT.md`)

- **Troubleshooting's hand-drawn Mail** (password-reset scenario): give `MailApp` /
  `GuidedEmailTask` a `seedInbox` prop (the pattern `seedDraft` already establishes)
  carrying the bank-reset email, and render the real Mail app in the scenario. The
  reset link hands control back to the browser exactly as now.
- **Troubleshooting's hand-drawn support-page browser** (error-code scenario):
  `support.example` already exists in `GuidedBrowserTask`'s `PAGES`. Render the real
  browser chrome for the scenario's browser leg, seeded to that page.
- Both changes must pass the solver (1.1) for every troubleshooting lesson, and the
  scenario flows must be re-driven by hand — these are the two most stateful scenarios
  in the course.

## 3.2 One window frame

`Desktop/AppWindow.tsx` and `Desktop/DraggableWindow.tsx` are two draggable window
implementations. Unify on one (keep whichever has the richer behavior, port the
other's call sites), so every window in every sim drags, focuses, and closes
identically. Audit call sites first; this touches many sims, so it rides with the
solver harness as its regression net.

## 3.3 Design tokens

Extract the repeated literals into Tailwind theme tokens / shared constants: the
banner `#1d2733`, the highlight yellow, success green, fail red, the dark-mode sim
palette. Sweep components for hardcoded hexes that should be tokens. Acceptance: one
place to change the highlight color changes every sim.

## 3.4 Small unifications and dead code

- Delete the dead `open-btn` highlight branch in `GuidedAppStoreTask` **or** wire an
  `open-app` step into a Unit 8 lesson (opening what you installed is a real skill —
  slight preference for wiring it in).
- `FileViewer.tsx` vs `FileManager.tsx`: confirm both are live post-refactor; delete
  or fold anything orphaned.
- Consistent empty states, loading shimmers, and hover states across the ten apps —
  one pass with a checklist, one doc table.
- **Color/Color stays split** (each lesson matches its own control) until
  localization (6.5) forces the question — recorded, not forgotten.

## 3.5 Site-chrome coherence

One pass over homepage / catalog / lesson page / login / dashboard-redirect for:
heading scale, button styles, card styles, footer, both themes. The lesson experience
got years of polish; the wrapper pages should feel like the same product. Fold in the
1.8 first-run findings.

---

# Workstream 4 — Lesson order

## 4.1 The dependency audit — script it, don't eyeball it

Build `scripts/audit-order.py` (a report, not a build gate):

- For each lesson, derive **skills used** (from task type + step actions + sim
  features touched) and **skills taught** (first lesson whose module owns that skill).
- Flag any lesson using a skill before the lesson that teaches it, in global `order`.
- Also flag: modules whose internal orders interleave with another module's range,
  units whose display number disagrees with their order-range position, and gaps too
  small to insert into later.

Known findings to confirm and resolve (found by inspection, 2026-07-27):

- **Unit 2's Keyboard Tour uses `guided-email`, `guided-browser`, `guided-files`, and
  `guided-messaging` as typing contexts** — four apps the learner formally meets in
  Units 3–6. This was deliberate (typing needs somewhere real to type). Resolution is
  copy, not reordering: each such lesson's intro must carry one scaffolding sentence
  ("You will learn all about email later — today, just type where the box glows"),
  and the steps must demand *zero* un-taught navigation (the highlight carries them).
  Audit each; fix the ones that assume more.
- **Unit 1 order 21 is a `guided-troubleshooting` restart lesson** — fine in "Starting
  and Stopping" (restarting *is* starting and stopping) but verify its difficulty
  matches week-one hands (it should be the gentlest scenario in the sim).
- **Trackpad-before-everything stays.** Orders 1–5 teach clicking before "What is a
  computer?" — a past deliberate decision (you can't do anything without clicking).
  Do not re-litigate.

## 4.2 Unit-level ordering — one decision, one recommendation

The current spine is sound: hardware → typing → files → internet → communication
(messages, email) → media (photos) → apps → settings → safety → troubleshooting →
everyday life → accessibility → capstone. Safety is also correctly *threaded* early
(Unit 4 has an Online Safety module; Unit 6 has staying-safe) rather than hoarded in
Unit 10.

**The one real question: Unit 13 (Making Your Computer Easier to Use) sits last-but-
one, but its beneficiaries need it on day one.** A learner who can't read small text
should not wait 12 units to learn text scaling. Recommendation — do both halves:

- **Keep the unit where it is** (it depends on Settings fluency from Unit 9, and
  renumbering all displayed unit labels for a pedagogical maybe isn't worth the
  churn), **and**
- **Add the on-ramp early:** the site's own accessibility page (text size, dark mode,
  read-aloud from 1.5) gets surfaced in the first-run experience — a quiet "Make this
  site comfortable to read" link on the homepage and in Unit 1's first module. The
  *site* accommodates them on day one; the *unit* later teaches them to do it to
  their own computer.

New Unit 14 (Workstream 2) slots at 1400–1499; the Final Assessment stays terminal
and gains one module referencing Unit 14 skills only after Unit 14 ships.

## 4.3 Module-size pacing

Keyboard Tour is **13 sub-lessons** — double the next-largest module and a fatigue
cliff in week one. Split it into two modules ("Keyboard Tour" / "Typing Practice" or
similar) — module strings are safe to change; slugs are not. Scan for any other
module over ~8 sub-lessons. Then verify the catalog communicates the path: units in
order, next-up affordance obvious, resume one click.

---

# Workstream 5 — Nothing too difficult

The measured baseline is strong (median FK 5.1, median 4 steps). The work is the
outliers and the motor-skill assumptions.

## 5.1 Reading level: cap the outliers

- Rewrite the 10 intros above FK grade 8 down to ≤ 8 (ideally ≤ 6):
  `identity-theft` (11.4), `email-assessment` (9.0), `cookies` (9.0),
  `updating-apps` (8.7), `app-store` (8.6), `hardware-problems` (8.5),
  `emoji-reactions` (8.3), `bluetooth-devices` (8.3), plus the remaining two the
  script lists. Shorter sentences and defined jargon — not dumbed-down content.
- Add the FK computation to `check-lessons.py` as a **warning** above grade 8 and a
  **failure** above grade 10, so regressions surface at build time without making
  every content edit a fight.
- Cap intro length: warn above ~160 words (the 216-word intro is a wall of text for
  this audience; split or trim it and any others the script flags).
- One jargon pass: every technical term's first use in the whole course must carry its
  plain-language definition in the same breath. Build the first-use index by script;
  fix by hand. This index later feeds a printable glossary (Workstream 6).

## 5.2 Motor-skill audit — the hands are 70 years old

- **The falling-shapes game is the first activity in the course.** Audit it as such:
  no fail state, no punishing speed, shapes large, misclicks ignored, and if the score
  target stalls, the game quietly slows. A first-time mouse user must not meet time
  pressure in lesson one — soften or remove the timing entirely.
- **Inventory every timed mechanic** in the course; the undo-send countdown (teaches a
  real thing) stays, everything else justifies itself or loses its timer.
- **Double-click tolerance:** find every hand-rolled double-click detector; anything
  stricter than the platform default gets loosened, and every double-click step's hint
  mentions "two quick presses without moving the mouse" once.
- **Drag alternatives:** verify every drag interaction has a click-click path
  (guided-files move already does click-file-then-folder; check `match-parts`,
  photo-crop handles, window-resize — the *window* lessons teach dragging itself and
  are exempt, but their targets should be generous).
- **Precision targets:** sweep sims for interactive targets under ~40px in the default
  layout; grow them or their hitboxes.

## 5.3 Exact-text frustration

Every exact-match text task is a place where one stray space defeats a beginner:

- `type-text` with `exact: true`, `message-reply`'s `requiredResponse`,
  `compose-email`'s `requiredBody`, guided `send-message`/`set-body` values.
- Normalize forgivingly everywhere: trim, collapse internal whitespace, smart-quote
  fold; keep case sensitivity only where the lesson *teaches* capitals.
- When the text doesn't match, **show where** — highlight the first differing word
  ("check the highlighted word") instead of a generic "not quite". One shared
  diff-hint helper in `TaskChecker.ts`.

## 5.4 The difficulty curve holds hands then lets go

Verify the arc within each unit: guided (full highlights) → guided-lighter → assess-
ment (no highlights) → real-world. Any unit that jumps from heavy-guidance straight to
assessment gets one bridging lesson. Also verify every `drDigitalHint` passes the
test the discoverability audit set: it points at where to look and actually helps at
the moment of being stuck (stuck-detection from 1.4 makes hints load-bearing).

## 5.5 The zero-knowledge cold read

After 5.1–5.4 land, do one full-course read-through in the persona: a 74-year-old who
has never owned a computer, on a borrowed laptop. Every lesson, in order, asking only
"do I know what to do right now, and do I know it's working?" File everything found
as issues in the workstream doc; fix the cheap ones inline. This is the acceptance
test for the entire workstream.

---

# Workstream 6 — How this gets sold

Three buyers, one product, different wrappers. The strategy: **the learner experience
is finished and free-to-try; what institutions pay for is visibility and proof** —
seeing their learners' progress, and certifying it.

## 6.1 Segments, honestly assessed

| Segment | What they need | Readiness |
|---|---|---|
| **Adult schools, workforce programs, libraries, senior centers** | Instructor dashboard, class rosters, join codes, printable certificates, standards alignment, WCAG AA, works on locked-down shared machines | **Closest fit — sell here first.** The product tone, reading level, and real-world missions were built for exactly this learner |
| **Adults teaching their parents (B2C)** | A "set it up for Mom" flow, remote progress viewing, printable quick-start, gifting | Second — same product, the supervisor view is the feature |
| **Elementary schools** | COPPA-compliant accounts (no child emails), FERPA posture, teacher controls, ISTE mapping | **Real but later.** The blockers are legal-infrastructural, not content (median grade-5 reading + read-aloud from 1.5 actually suits ~4th grade). Do not gate the first two segments on this |

## 6.2 The supervisor/classroom build — CANCELLED 2026-07-28

> **Do not build this, and do not offer it on a call.** It was designed, built,
> and removed the same day, because every version of it requires collecting
> something about a learner and the product now collects nothing. That is not a
> gap waiting to be filled — it is the differentiator the whole pitch rests on.
> The design below is kept only as a record of what was rejected and why.
>
> If a buyer needs per-learner reporting, say plainly that this is not that
> product. `docs/SALES_PLAYBOOK.md` §5 has the words.

The cancelled design, for the record:

- **Entities:** organization → class → learner-membership. A class has a **join
  code**; a learner enters it once (on `/login` or a `/join` page) and their existing
  synced progress becomes visible to that class's instructors. Leaving a class (or
  the learner deleting their account) severs visibility — learner owns the data,
  instructor sees it, per the doc's privacy stance.
- **Instructor dashboard:** per-class roster; per-learner unit/module completion;
  who's stuck (no progress in N days); class-level "everyone finished Unit 4" view.
  Read-only over the same `progress` rows the sync already writes — no new write
  paths from instructors.
- **For families:** the identical mechanism with a friendlier skin — a "family code"
  is a class of one or two. One build, two labels.
- **Elementary-ready accounts (build later, design now):** class-code-only
  pseudonymous learners (name chosen by teacher, no email) — the schema should not
  make `email` structurally mandatory even though the current flow requires it.
- RLS policies per the design doc; Supabase advisors clean; the site must still build
  and fully function with no env vars (solo learners never need any of this).

## 6.3 Certificates

- Per-unit and full-course completion certificates: learner name (asked at generation
  time, not stored unless signed in), course/unit, date, a verification code checkable
  at `/verify/<code>` for signed-in completions (institutions want to check).
  Print-quality via a dedicated print-styled page — no PDF library needed.
- The graduation lesson (order 1570) links it; the dashboard offers per-unit ones.
  For adult-ed programs, this artifact *is* the product.

## 6.4 Standards alignment + instructor kit (documents that close sales)

- **Northstar Digital Literacy mapping:** a table mapping every unit/module to the
  Northstar standards it covers, published at `/for-educators` and as a printable.
  Where Workstream 2 closes a gap, the mapping says so; where we deliberately don't
  cover a standard, say that too — honesty reads as competence to educators.
- **Instructor kit:** a one-page per-unit lesson-plan sheet (objectives, expected
  duration, the real-world mission's requirements, discussion prompts), the glossary
  from 5.1 as a printable, and a "running this in a computer lab" guide (shared
  machines, the join-code flow, the localStorage caveats from 1.2).
- **Family kit:** a printable quick-start ("Set up the computer before you hand it
  over" checklist; "when they call you for help" cheat sheet mapping common panics to
  the lesson that resolves them).

## 6.5 Landing pages and the funnel

- `/for-schools`, `/for-libraries`, `/for-families` — same app, one honest page each:
  who it's for, what the learner experience is (embed 2–3 real lessons as a no-account
  demo — the lessons already run without sign-in, so "demo mode" is a curated link
  list, nearly free), what the paid tier adds, a contact/pilot CTA.
- The homepage stays learner-first; a single quiet "For educators and families" link
  routes buyers sideways.
- **Localization is the force multiplier for adult ed** (ESL programs are the biggest
  single buyer pool): plan the i18n architecture now — per-locale lesson trees
  (`content/lessons/es/…`), locale-aware `lib/lessons.ts`, string extraction for
  components — but **execute Spanish only after Workstreams 1–5 land**, because every
  string churned before then is translated twice. It's a phase of its own, roughly
  the size of a content unit rewrite.

## 6.6 Trust page and compliance posture

One `/privacy`-adjacent trust page in plain language: no ads, no tracking, progress
is a list of finished lessons, nothing a learner does in the sims leaves the machine,
missions read files locally and upload nothing, delete-account deletes everything.
This is a *sales* asset for schools and libraries, not boilerplate. Alongside it, an
internal compliance checklist doc: what FERPA/COPPA would require of the classroom
feature, WCAG status (from 1.6), and what's deferred.

## 6.7 Decisions reserved for the user (present options, don't decide)

- **Pricing** — the plan's shape (free individual / paid institutional visibility +
  certification; family tier) is a recommendation; numbers and licensing terms are
  the user's call.
- **Telemetry** — currently zero, and "zero tracking" is itself a selling point.
  Option A: keep zero, rely on classroom pilots for stuck-point data (stuck detection
  in 1.4 works fine locally). Option B: privacy-first aggregate lesson-completion
  counts, disclosed on the trust page. Recommend A until a pilot proves the need.
- **Elementary timing** — build order above defers it; the user may want it sooner.
- **Pilot targets** — which 2–3 local adult-ed programs/libraries to approach first.

---

# Execution order — the work queue

Interleaved for value-per-risk, each stage a commit boundary with the standard
verification (four checks + browser drive + docs update):

| Stage | Work | Why here |
|---|---|---|
| **A** | 1.1 solver harness (spike both, build Playwright) | Everything after this lands on a safety net. Highest-leverage item in the plan |
| **B** | 1.7 error boundary · 1.2 storage/restart safety · 5.3 forgiving text matching · 5.2 motor-skill audit | Cheap, high-frustration-removal, all independently shippable |
| **C** | 3.1 last two bespoke apps · 3.2 one window frame · 3.4 dead code | The remaining unification, now protected by the solver |
| **D** | 5.1 readability rewrites + build-check · 4.1 order-audit script + Unit 2 scaffolding copy · 4.3 Keyboard Tour split | Content quality, zero component risk |
| **E** | 1.4 stuck detection · 1.5 read-aloud · 1.3 wrong-device page · 1.8 first-run · 4.2 accessibility on-ramp | The learner-support layer, as one coherent UX pass |
| **F** | 1.6 contrast/WCAG measured and fixed · 3.3 design tokens · 3.5 site-chrome pass | Measure once, fix on tokens, sweep once |
| **G** | 2.3 thin-spot lessons (print sim, scams, updates, router, QR, backups) | New content on mature rails |
| **H** | 2.2 Unit 14 "Doing Real Things Online" | The big content build; new browser pages + form actions get solver coverage as built |
| **I** | 5.4 difficulty-curve check · 5.5 the zero-knowledge cold read | The acceptance pass, after all content is in place |
| **J** | 6.2 supervisor/classroom · 6.3 certificates | The paid product surface |
| **K** | 6.4 alignment + kits · 6.5 landing pages · 6.6 trust page | The sales surface, describing what now exists |
| **L** | 6.5-bis Spanish localization | Deliberately last — translate strings once, after they stop moving |

**If time is short:** A → B → D is the idiot-proofing and difficulty core; the course
is materially safer and kinder after three stages. J is the first stage that makes
the product *sellable*; nothing before it blocks a hand-run pilot (a pilot can run
today on screenshots and a shared spreadsheet — don't let J gate outreach).

**Parallelization:** D (content JSON) shares no files with C (components). H shares
`GuidedBrowserTask` with nothing else in flight. J/K touch app-shell and Supabase
only. A must land before C; F's tokens before any new sim styling in G/H.

---

## Appendix — measured baseline (2026-07-27, commit `07200e9`)

- 198 lessons, 14 units, 55 modules; per-unit lesson counts: U1 28, U2 23, U3 11,
  U4 18, U5 9, U6 10, U7 10, U8 9, U9 7, U10 12, U11 10, U12 19, U13 16, Final 16.
- Order ranges in use: 1–61, 200–296, 300–391, 400–499, 500–571, 600–681, 700–781,
  805–871, 900–961, 1000–1101, 1110–1191, 1210–1261, 1310–1361, 1510–1570.
  **Free for new units: 1400–1499** (and headroom within most units).
- Type usage: none 32 · guided-browser 24 · guided-settings 24 · real-world 14 ·
  guided-files 13 · guided-email 12 · guided-messaging 10 · guided-desktop 9 ·
  guided-troubleshooting 9 · guided-photos 9 · guided-app-store 8 ·
  guided-security 7 · notes-shortcut 5 · type-text 3 · edit-text 2 ·
  keyboard-nav-game 2 · url-navigator 2 · guided-calendar 2 · eleven types ×1.
- Readability: FK median 5.1 / mean 5.2 / max 11.4; ten intros above grade 8
  (worst: identity-theft 11.4, email-assessment 9.0, cookies 9.0, updating-apps 8.7,
  app-store 8.6, hardware-problems 8.5, emoji-reactions 8.3, bluetooth-devices 8.3).
- Intros: median 80 words, max 216. Guided steps: median 4, max 10.
- Verification green: `check-lessons.py` (198), `tsc`, lint (0), build (14 routes),
  `/dev/mount-check` 166/166.
