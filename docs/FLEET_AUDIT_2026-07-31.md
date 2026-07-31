# Fleet audit — 8 cold personas, 2026-07-31

Eight fresh agents, each given only a directive and no knowledge of prior work,
audited the whole site from a different lived-experience angle: an 80-year-old
with arthritis/tremor, a low-vision→blind user, a nervous cognitively-taxed
beginner, an adversarial break-it tester, a cynical buyer, a content/pedagogy
expert, a device/environment matrix, and a privacy/legal/safety officer. Each
verified findings against source and the running site. This is the deduped,
cross-referenced result.

## The verdict in one line
The product's **integrity is real** — the privacy claim holds and the guided
paths never hard-dead-end — but **three blockers make it unusable or unsafe for
exactly the audience it is sold to**, and the fix for all three is work already
greenlit (keyboard/no-drag operability + responsive layout).

## Confirmed GOOD (stated because buyers will ask, and 3+ agents verified each)
- **No cookies / no third-party requests / no analytics / no account** — confirmed
  independently by the buyer, privacy, and (partially) content auditors: curl'd 13
  routes for `Set-Cookie` (none), watched the wire (every request localhost),
  grepped deps (nothing), font self-hosted. This is the product's real strength.
- Guided sims **never hard-dead-end** (stray-check both modes + recovery-check green).
- Tremor **double-fire guards are real** (150ms + 500ms), storage degrades
  gracefully, windows recover from being closed.
- Contrast passes both themes (site + all 9 sim apps); reduced-motion now honored
  site-wide; the per-step `aria-live` region is correct; assessment discoverability
  is genuinely well-designed; real-world mission failure copy is the gold standard.

---

## BLOCKERS

### B1 — The zoom / responsive "dead-zone" removes the entire activity *(found independently by 3 agents: vision, break-it, device)*
`LessonModuleRunner.tsx:337,341` (activity/media pane `hidden lg:flex` / `lg:block`,
lg=1024px) vs `SmallScreenGuard.tsx:24` (`innerWidth < 900`). Between **900–1023px**
the guard is silent *and* the activity is `display:none`: "Start activity" flips to
"Exit/Restart" but renders an empty void — no ring, no words, no Next, only Skip
(which never completes the module). Verified live at 950–960px. `innerWidth` is
zoom-adjusted, so **150% zoom on a 1366/1440 laptop (≈911–960px) lands in the band**,
and **200% zoom drops under 900px** into the "needs a bigger screen" wall whose
"Continue anyway" dismiss is `gray-400` (2.54:1 — the lowest-contrast text on the
page). Activities also keep running invisibly while hidden (shape pile-up on resize).
WCAG 1.4.4 / 1.4.10 failure on the core function, aimed at the exact low-vision,
high-zoom audience.
**Fix:** stack the activity in-column below `lg` instead of hiding it; align the
guard to capability (pointer/keyboard) not CSS width; fail-safe message + pause when
a pane is genuinely hidden.

### B2 — The anti-phishing lesson trains the scam behavior *(content; real financial stakes)*
`scams-phishing.json` + `GuidedSecurityTask.tsx:664`: *"Click the link… Looking is
safe — it does not open anything."* True in the sim, **false on every real machine**
(clicking an inline link opens it). The real safe technique — **hover to preview the
URL (desktop) / long-press (touch)** — is taught nowhere in the course. In the one
unit built to protect older adults from scams, the flagship skill transfers as harm.
**Fix:** rebuild the reveal around hover/long-press; delete every "clicking a link to
look is safe" line.

### B3 — Core gestures have no non-drag / non-double-click / non-touch path *(motor + device + vision)*
The three hardest gestures for an arthritic or touch-only user are the *only* path:
- **Message reactions:** double-click OR a 500ms press-hold that `onPointerLeave`
  cancels on the slightest drift — no single-click/keyboard. Graded skill.
  (`GuidedMessagingTask.tsx:254-270,735-738`)
- **Window move/resize:** drag-only via `mousemove` (`DraggableWindow.tsx`) — no
  buttons/keyboard; touch emits no mousemove. Blocks `working-with-windows`,
  `final-desktop`.
- **File move:** HTML5 drag-drop only (`FileManager.tsx:279-284`); the
  click-file-then-folder path the CLAUDE.md schema *claims exists* **does not exist**.
  Blocks 6 file lessons.
- **Open file:** requires a double-click (arrow+Enter only in one special lesson).
**Fix:** add a single-click/keyboard/"Move to…" path to each — reusing the
click-target-then-destination pattern the app already ships in DragSort/MatchParts —
and switch drag to Pointer Events for touch.

---

## SERIOUS

### S1 — Routine typos trigger a red "ACTIVITY FAILED" card, and "Try again" wipes the work *(cognition)*
`LessonModuleRunner.tsx:97-105,227-242`. One wrong letter in a *typing* lesson throws
a red-bordered "Activity failed" card with a red "Try again" button in the reading
column — while the activity pane shows gentle amber "Almost — check the highlighted
word." Two contradictory emotional registers on one screen; the salient red button
**remounts the task, erasing the near-correct text and the amber highlight that
showed the error**. The code even comments that "this audience reads a red box as
proof they are no good at this" — then re-introduces it. Harnesses miss it because a
red card technically *is* "a way forward."
**Fix:** don't route ordinary `type-text`/`edit-text`/`keyboard-shortcut`/`drag-sort`
misses through the failure card — keep the sim's inline amber retry; if the card must
show, never remount/wipe input; soften copy. Reserve the red card for the deliberate
consequence lessons (CLEAN NOW, wrong ad, wrong phishing verdict).

### S2 — The certificate prints blank in dark mode *(device)*
No `@media print` rule anywhere. In dark mode the name/unit inherit
`dark:text-gray-100` (near-white); browsers don't print backgrounds, so the name and
unit print **white-on-white — invisible**. The nav bar also prints on top (no
`print:hidden`). The printed certificate is part of the sales pitch.
**Fix:** a print stylesheet forcing the certificate black-on-white regardless of
theme; `print:hidden` on the site nav.

### S3 — The "follow the glow" ring is ~1.4:1 on white *(vision)*
`tailwind.config.ts:52` ring = yellow-400 (#facc15) ≈ 1.43:1 on white — the course's
core wayfinding cue fails the 3:1 non-text floor (WCAG 1.4.11), invisible to a cataract
user. No harness sees it (it's a `box-shadow`). No `aria-current` partner either.
**Fix:** darker-edged/higher-contrast ring; add `aria-current` on the highlighted control.

### S4 — Windows users are taught a Mac *(content)*
`screen-menu-bar`/`screen-desktop` teach a top menu bar + dock as "your own screen"
(Windows has neither; clock is bottom-right); `troubleshooting-basics` gives Mac-only
Force Quit; `kb-delete` describes **Backspace's** behavior under the **Delete** key's
name (wrong on Windows). The real-world missions hedge Win/Mac correctly — the sim
lessons don't.
**Fix:** hedge platform in the shell/troubleshooting lessons; add Backspace to `kb-delete`.

### S5 — Privacy disclosure is under-inclusive *(privacy)*
`app/privacy/page.tsx:120-125` enumerates what the missions read but omits
User-Agent, pasted-clipboard text, and screen/zoom size that `RealWorldChecks.tsx`
actually reads. Nothing is transmitted, but on a product sold on "we tell you exactly
what we read," the list must match the code.
**Fix:** complete the enumeration (or reword as illustrative).

### S6 — Sales scripts undersell the proven count and contradict each other *(buyer)*
`DEMO_PRIYA_ELDER_CARE.md` + `COLD_CALL_KIT.md` say "150 activities proven / 20
untestable"; the truth (and `SALES_PLAYBOOK.md`) is **163 of 169 proven / 6 hand-tested**
— and the cited `npm run solve-check` shows 145, disproving 150 on the spot.
`pitch-check.py` misses it because its regex only matches bold digits, not the
spelled-out "a hundred and fifty."
**Fix:** correct the two docs to 163/169; teach pitch-check to catch spelled-out
numbers (with a negative-control line).

### S7 — Tiny hit targets, and a fail-trap under a fail-target *(motor)*
Scam-popup ✕ (`w-8 h-8`) sits directly above the full-width "CLEAN NOW" trap — an
overshoot *fails the phishing lesson*. Window min/max/close are 28×24px 6px apart;
resize handle 32px; menu-bar status buttons ~28-36px. All below WCAG 2.5.5's 44px.
**Fix:** bring critical controls to ≥44px; move CLEAN NOW away from the ✕.

---

## MINOR (grouped)
- **Focus rings stripped** (`outline-none`, no replacement): browser address/search
  (`GuidedBrowserTask.tsx:964,1090`), Notes (`GuidedNotesTask.tsx:164`), Files search
  (`FileManager.tsx:335`), album name (`GuidedPhotosTask.tsx:383`). *(vision)*
- **Same "replace this paragraph before publishing" placeholder on the accessibility
  page** (`app/accessibility/page.tsx:69-74`) — I fixed the privacy one; this twin
  remains. *(privacy)*
- **No persistent site-wide text-size control** — the in-sim zoom scales only the sim. *(vision)*
- **Platform-key gaps:** redo omits Windows Ctrl+Y (and the sim rejects it,
  `TaskChecker.ts:120`); `trackpad-pinch-zoom` omits Mac Command; "look for the
  padlock" is dated (Chrome removed it 2023). *(content)*
- **Stale "yellow minus button" copy** in `apps-closing`/`apps-closing-vs-quitting`
  vs the neutral gray control. *(content)*
- **Phishing assessment partly label-matchable** — decorrelate one verdict pair. *(content)*
- **Password-strength box** could add "use a made-up password, not a real one." *(privacy/safety)*
- **First activity** says "before it reaches the bottom" implying a fail state there
  isn't; **ShapeClickGame ignores reduced-motion** (JS-driven fall, not CSS). *(cognition)*
- **`cloud-vs-computer` red card** on a genuinely ambiguous sorting task. *(cognition)*
- **Certificate says "fourteen units"** (13 + Final Assessment). *(privacy/content)*
- **Dead code / stale comments:** `lib/progress.ts` "account sync" comments +
  unused `replaceCompletedSlugs`; `compose-email`/`message-reply` types documented but
  not wired in `LessonPlaygroundPane` (0 lessons use them). *(privacy, break-it)*
- **No CSP header** — a strict `connect-src 'self'` would enforce the no-third-party
  claim at the browser. *(privacy)*
- **hostile-check flaky** on `?_rsc=` `ERR_ABORTED` prefetch — should ignore. *(buyer)*
- **Internal doc number drift** (GOAL_STATE 146 vs 145; "170 activities" vs 169). *(buyer)*
- **Reading-level guard grades only the intro**, not step/instruction text. *(cognition)*
- File grid lacks `aria-selected`/`aria-current`; 8-10px meaningful text in a few sims;
  DesktopLaunch banner not a live region. *(vision)*
- **Right-click lesson** has no touch/keyboard fallback. *(motor, device)*
- SmallScreenGuard false-alarms on a zoomed good laptop (same root as B1). *(device)*
- Google Forms fields need a human check that neither collects PII. *(privacy)*

---

## Proposed fix order
1. **B1 dead-zone** (triple-confirmed; one-line stopgap now, responsive stack as the
   real fix) — unblocks the whole audience the moment they zoom.
2. **B2 phishing** — safety; rebuild reveal around hover/long-press.
3. **S1 red-card tone + work-wipe**, **S2 certificate print**, **S3 ring contrast**,
   **the accessibility-page placeholder** — high value, low risk, mostly bounded.
4. **B3 no-drag/keyboard operability** — the large sim-operability build (already
   greenlit), now with a concrete target list.
5. **S4/S5/S6 + the copy/doc minors** — content platform-hedging, privacy enumeration,
   sales-number correction, pitch-check + hostile-check guard fixes.
6. Fold new static rules into `check-a11y.py` (interactive-div needs role/tabindex;
   input needs a name) so B3/S-class regressions can't return.

---

## Fix status — 2026-07-31

Worked top-to-bottom, each fix its own verified commit (solve-check / ring-check /
stray-check / recovery-check / hostile-check / build kept green throughout).

**Done and committed**
- **B1 zoom dead-zone** — activity pane stacks below `lg` instead of hiding; guard
  gates on a coarse pointer, not zoom-shrunk width; escape link contrast raised.
- **B2 phishing** — reveal now teaches hover / long-press; "clicking is safe"
  removed from sim and lesson; click still reveals so the solver/keyboard work.
- **S1 red card** — routine typo/edit/paste misses keep the sim's inline amber
  retry (no red "failed" card, no work-wipe); card reserved for consequence lessons.
- **S2 certificate print** — forced black-on-white; nav `print:hidden`.
- **S3 ring** — dark navy contrast edge (≈15:1) added to the yellow; five stripped
  input focus rings restored.
- **S4 platform** — Windows+Mac hedging in the shell/keyboard/troubleshooting
  lessons; Ctrl+Y redo accepted.
- **S5 privacy** — machine-read enumeration completed (User-Agent, paste, screen/zoom).
- **S6 sales numbers** — 163/169 corrected in both docs; pitch-check now catches
  spelled-out stale counts (negative-controlled).
- **B3** — messaging reactions get a single-click/keyboard React button (hold no
  longer cancels on drift); **file/folder OPEN by keyboard** (Tab + Enter/Space,
  tiles are `role="button"`); **window MOVE and RESIZE by keyboard** (arrow keys on
  the focusable title bar / resize handle, firing `onMoved`/`onResized` past the same
  thresholds); email-compose + slider labels; scam ✕ → 44px. (Window-button/resize
  size bumps were reverted — they broke desktop-check; 28×24 already meets WCAG AA.)
- **Minors** — accessibility-page placeholder, reduce-motion at OS level + the
  `aria-live` step region (Phase 1), dead `replaceCompletedSlugs` + stale sync
  comments removed, hostile-check `?_rsc=` abort ignored, password + shape-game copy,
  sim-contrast border fixes for the new controls.

Every one of the above is committed with the full gate battery green (solve 145/145,
ring, stray ×2, recovery, desktop, hostile, sim-contrast 124/124, simdark, demo,
check-a11y, check-lessons 197/197, spelling, pitch, check-actions, tsc, build).

**Remaining — the tail of the sim-operability build, genuinely multi-session**
Each touches the most heavily-tested components and must keep every gate green (a
`role="button"` change already tripped one bubbling bug and one sim-contrast border
this session — both caught and fixed, which is exactly why this goes carefully):
- **FileManager** — a click-file-then-folder *move* path (today: drag only). The
  keyboard *open* path is done.
- **DraggableWindow / FileManager** — Pointer Events so **touch** works (today mouse
  events only; the auto-solver dispatches mouse events, so the solver must move to
  pointer events in the same change or it regresses).
- ~13 more minor sim-input `aria-label`s (2FA / login / calendar / troubleshooting /
  app-store search), `aria-current` on the highlighted control, `aria-selected` on
  file rows, DesktopLaunch as a live region, a right-click touch/keyboard fallback.
- Then the `check-a11y.py` interactive-div / input-name rules (they'd fail on the
  above until it's finished, so they land last), and three tiny copy items
  (cloud-vs-computer per-item feedback, GOAL_STATE number drift, grading step text).
