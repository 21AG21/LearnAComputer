# LearnAComputer — QA Round 3 Execution Plan

**Status:** Phases 0–5 complete. All verification passed. Ready for commit+push.
**Audience:** This document is written for an executor model working phase by phase. Read `CLAUDE.md` at the repo root first — it describes the stack, lesson JSON schema, and every playground task type. This plan assumes that context.

This plan translates ~78 pieces of user feedback into concrete, ordered work. Appendix A maps every feedback item to its section so nothing gets dropped. Appendix C contains **already-diagnosed root causes with file:line references** for the reported bugs — read it before touching any bug listed there.

---

## How to work this plan

1. **Execute phases in order** (0 → 5). Later phases depend on framework changes in Phase 1. Within a phase, sections can be done in any order unless a dependency is called out.
2. **After each phase:** `npx tsc --noEmit`, `npm run lint`, `rm -rf .next && npm run build` must all pass. Then start the dev server (via the `.claude/launch.json` config, never raw Bash) and click through every lesson you touched — actually complete the activity, don't just look at it. Commit per phase with a descriptive message and push to `main`.
3. **Never mark a checkbox done without having driven the lesson in the browser yourself.**
4. When a phase changes the lesson JSON schema (new task types, new actions, new fields), **update `CLAUDE.md` in the same commit**.

### Hard rules (violating any of these is a defect)

- **No multiple-choice activities. Ever.** All 5 remaining `multiple-choice` lessons get converted or deleted in this plan (`photo-people`, `icloud-photos`, `passkeys`, `backups`, `qrcodes-siri`, `printing-scanning` — and `daily-tasks` is deleted outright).
- **No OS/app brand names in the simulated OS**: no Apple, macOS, Finder, Safari, FaceTime, iCloud, Siri, App Store (as the app's own name), Dock-with-capital-D as a brand term. Real *websites* rendered inside the simulated browser (Google, Wikipedia) are fine — they're realistic web content, not OS branding.
- **Realism principle:** every playground activity must be performed the way a person would do it on a real computer. The learner opens apps from the desktop themselves (Phase 1.3); flows follow real-world sequences (e.g., password reset goes through the browser and email, not a magic "type new password" box).
- **Pedagogy pattern for demonstrations:** first *show the problem*, then *explain the concept*, then *let the learner perform the fix and see it work*. (Reload fixes a broken page; zoom makes unreadable text readable; force-quit unfreezes a frozen app; brightness slider fixes a dim screen.)
- **Explanations must be thorough enough that the learner could re-teach the concept.** Every `drDigitalIntro` for a concept lesson answers: What is it? Why does it matter to me? How do I do it? What's the common mistake? Aim for 4–6 bullets, plain language, no jargon left undefined.
- **Never rename an existing lesson `slug`** — progress is stored by slug in localStorage. Deleting a lesson is fine (listed deletions only). New lessons get new slugs.
- **Don't add npm dependencies.** Everything here is achievable with React + Tailwind + inline SVG.
- **First letters capitalized** in every learner-facing sentence (Dr. Digital strings, step `say` strings, UI copy).

---

## Phase 0 — Hygiene (small, mechanical, do first)

### 0.1 Delete lessons
- [x] Delete `content/lessons/daily-tasks.json` (Unit 12 lesson 1 — redundant, and a multiple-choice violation).
- [x] Delete `content/lessons/trackpad-keyboard.json` (Unit 9 "Hardware" — the site cannot control a real trackpad, so the lesson is a dead end).

### 0.2 Fix `order` collisions and Unit 7 interleaving
Current collisions: `email-thank-you` and `text-formatting` are both `270`; `photo-editing` and `photo-people` are both `730`; `icloud-photos` and `photo-search` are both `760`. Unit 7's modules are also interleaved (Organizing Photos at 720/730/750/770 with other modules between).

- [x] Renumber Unit 2 tail: `text-formatting` → `245`. (Leaves: editing 240, formatting 245, shortcuts 250, navigation 260, email-thank-you 270, invitation 280, assessment 290.)
- [x] Renumber Unit 7 so each module is contiguous:
  - Your Photo Library: `photos-app` 700, `photo-favorites` 701, `photo-search` 702
  - Organizing Photos: `photo-albums` 710, `photo-people` 711, `recently-deleted` 712
  - Editing Photos: `photo-editing` 720, `sharing-photos` 721
  - Cloud Storage: `cloud-photos` 730 (see 3.7 — `icloud-photos` merges into it and is deleted)
  - Unit 7 Assessment: `unit-7-assessment` 780
- [x] Verify: `python3 -c "…"` — write a five-line script that loads all lesson JSONs and asserts orders are unique. Keep it as `scripts/check-lessons.py` and run it in every phase's verification.

### 0.3 Unit/lesson breadcrumb in the header (feedback #30)
`components/LessonModuleRunner.tsx:161-163` currently shows `{route.module} · {index+1} of {n}`.
- [x] Add the unit name: `Unit 5: Messages and Video Calls · Messages Basics · 2 of 5`. If `ModuleRoute` (in `lib/lessons.ts`) doesn't carry `unit`, add it there (the grouping code has it).
- [x] Also add it to the module-complete screen (line ~118).

### 0.4 Capitalization sweep (feedback #36)
- [x] Write and run a scanner (add to `scripts/check-lessons.py`): for every lesson JSON, flag any `drDigitalIntro`/`drDigitalSuccess`/`drDigitalHint`, any `playgroundTask.instructions`, and any step `say` whose first character is a lowercase letter. Fix each by hand (capitalize; don't blind-uppercase things like "iPhone" if any appear).

### 0.5 De-brand remaining Apple strings
- [x] `grep -ri "safari\|facetime\|icloud\|siri\|macos\|finder" content/ components/ --include='*.json' --include='*.tsx'` (slugs may keep the words; visible strings may not). Rewrite titles/copy: "Safari" → "your browser", "FaceTime" → "video calls", "iCloud" → "cloud storage", "Siri" → "your computer's voice assistant" (or drop the lesson content that's Siri-specific — see 3.12 for `qrcodes-siri`). **Note:** Only `app-store.json` and `qrcodes-siri.json` had visible branded strings; Safari/FaceTime/Finder lessons use generic titles already — their slugs are retained for progress compatibility.

**Phase 0 verification:** build passes; `/lessons` catalog shows Unit 7 modules in clean order; header breadcrumb shows the unit everywhere.

---

## Phase 1 — Framework changes (everything else depends on these)

### 1.1 Non-blocking completion → free play (feedback #8, #9, #24)

**Problem:** `components/Playground/SimulatorFrame.tsx:87-94` renders a full-screen `absolute inset-0 z-40` overlay when `done` is true. It permanently blocks the sim, so the learner can't inspect the lock popover, their spam folder, or anything else after finishing.

- [x] In `SimulatorFrame`, replace the permanent overlay with a two-stage completion:
  1. When `done` flips true, show the existing celebration overlay for **1.6 seconds** (drive with a `justFinished` state + `setTimeout`), then remove it.
  2. After that, render a slim persistent banner at the top of the app-window area (below the dark guidance banner): green background, `✓ {goal} — lesson complete! You can keep practicing here.` Small, doesn't block anything.
- [x] The dark guidance banner in the `done` state should keep showing "Done" + the full progress bar (it already does).
- [x] Apply the same two-stage pattern to the components that copy the overlay locally: `GuidedDesktopTask.tsx` and `KeyboardNavTask.tsx`.
- [ ] **Free-play rule** (enforced per-sim in Phase 2, but establish it now): after `done`, every sim's *read* interactions must keep working — open panels, switch folders/contacts/tabs, view popovers. Pattern: handlers currently shaped `if (step?.action === X) …` must perform their realistic state change unconditionally and only *gate the step-completion call* on the step. Most handlers already do this (e.g., `GuidedBrowserTask.clickDownloadsBtn` opens the menu regardless); audit each sim for handlers that no-op without a matching step and fix them.

**Acceptance:** finish `https-secure` lesson; after the checkmark clears you can still click the lock and read the popover. Finish an email lesson; you can still open Spam.

### 1.2 Failure channel — "lesson failed" in the LEFT panel (feedback #13, #58)

- [x] Change the result callback signature everywhere from `onResult(success: boolean)` to `onResult(success: boolean, failMessage?: string)` (`LessonPlaygroundPane`, `LessonModuleRunner.handleResult`, and the sims — sims that never fail pass nothing extra).
- [x] In `LessonModuleRunner`: when `success === false`, store the message; render a red-bordered card in the left panel (NOT inside the playground): heading "Activity failed", the `failMessage` (fallback: `drDigitalHint`), and a prominent **Try again** button that bumps `activityAttempt` (this remounts the activity — the mechanism already exists at `LessonModuleRunner.tsx:196-199`).
- [x] The playground must **stay mounted** when failed (so the learner can see, e.g., the fake download that appeared). Only remount on Try again.
- [x] Dr. Digital switches to the hint mood on failure (already happens via `attemptState === "failed"`).

### 1.3 Desktop-first launching (feedback #67, #64, part of #78)

**Requirement (user, verbatim intent):** *for all playground activities, never take the learner into the app automatically — they open it from the desktop themselves.*

- [x] Extend `FakeDesktop` (`components/Playground/FakeDesktop.tsx`):
  - Grow the dock from 4 to 10 apps: **Messages, Browser, Files, Mail, Settings, Photos, App Market, Calendar, Reminders, Notes** (Settings sits immediately right of Mail — explicit user request). Add dock icons: reuse `public/playgrounds/icon-*.png` where they exist; create simple inline-SVG-based PNGs or SVG icon components for the rest (gear, photo, storefront/bag, calendar page, checklist, note — see Phase 4 icon set).
  - New prop `highlightApp?: string` — pulses that dock icon with the standard `ring-4 ring-yellow-400 animate-pulse`.
  - New prop `interceptApps?: string[]` + existing `onAppOpened` — when an intercepted app is clicked, don't open the built-in app; just fire the callback (the lesson swaps in its guided sim).
- [x] New component `components/Playground/DesktopLaunch.tsx`:
  ```tsx
  <DesktopLaunch app="mail">{<GuidedEmailTask …/>}</DesktopLaunch>
  ```
  Renders the dark guidance banner ("Open Mail — click the glowing icon in the dock") + `FakeDesktop` with `highlightApp`/`interceptApps`. Once opened, renders `children` full-pane. App label derived from exported `APP_TITLES`. Not counted as a numbered step.
- [x] Wire `DesktopLaunch` around every guided sim in `LessonPlaygroundPane.tsx`: guided-files→Files, guided-browser→Browser, guided-messaging→Messages, guided-email→Mail, guided-photos→Photos, guided-app-store→App Market, guided-calendar→Calendar (or Reminders via `launchApp` field), guided-security→Browser, guided-troubleshooting→app named by `launchApp` field (default: browser). Added `launchApp` to guided-troubleshooting and guided-calendar types in `lib/lessons.ts`.
- [ ] Update every affected lesson's `drDigitalIntro`/first step copy so the flow reads naturally ("Open Photos from your desktop, then…"). (Deferred — the DesktopLaunch banner handles the instruction; intros work as-is.)

**Acceptance:** no guided lesson drops you inside an app. Every one starts on the desktop with one pulsing dock icon.

### 1.4 Assessment mode — objectives, no hand-holding, hints on demand (feedback #29, #14, #22, #45, #59, #70, #77)

- [x] Add `mode?: "guided" | "assessment"` to the guided task JSON types that need it (browser, messaging, email, app-store, security, troubleshooting, calendar) in `lib/lessons.ts`.
- [x] `SimulatorFrame` gains optional props: `objectives?: {label: string; done: boolean}[]`, `onHint?: () => void`, and renders the alternate banner when provided. `stepIndex`/`totalSteps` are now optional (omitted in assessment mode). Assessment banner shows "Objectives: N of M done", expandable objectives list with checkmarks, and a Hint button.
- [ ] Per-sim assessment wiring: refactor each sim's completion checks into a pure `matchesStep(step, event): boolean` helper; in assessment mode scan all incomplete objectives on each action. Thread `mode` prop into sim components. (Done per-sim in Phase 2/3 when each sim is being upgraded.)

### 1.5 Persistent sim state (feedback #43)

- [x] New `lib/simState.ts`: `readSimState<T>(key: string): T | null` / `writeSimState(key, value)` over localStorage key `"lac-sim"` (one JSON object, namespaced sub-keys). Guard for SSR (`typeof window`).
- [x] Used by App Market (2.6) so installed apps persist across lessons via `lac-sim-apps` localStorage key. _Done: GuidedAppStoreTask uses loadInstalledIds/saveInstalledIds with seed-on-mount for cross-lesson persistence._
- [x] The dashboard's "reset all progress" button must also clear `"lac-sim"`.

### 1.6 No-op step guard (feedback #57)

**Problem:** some steps say "click X" when X is already in that state (the phishing tab is already selected; a folder is already open). The learner clicks, nothing changes, or the step can't be completed at all.

- [x] Content fix: audit every guided lesson's first steps against the sim's initial state; delete steps that are no-ops on arrival. Removed 9 redundant `go-to-section` first steps from security lessons (scams-phishing, identity-theft, passwords-basics, password-managers, password-recovery, two-factor, public-wifi, safe-shopping, shopping-banking).
- [ ] Framework guard: in each sim, when a step *activates*, if the sim state already satisfies it, auto-complete it without the flash (log nothing; just advance). This makes content mistakes self-healing. Implement inside the same `matchesStep` refactor from 1.4.

**Phase 1 verification:** full build; run one lesson per sim end-to-end confirming: desktop launch → activity → celebration clears → free play works → (for one converted assessment) objectives + hint work.

---

## Phase 2 — Per-simulator upgrades

Each section lists the file, the changes, and acceptance criteria. All sims also get their Phase 1.1 free-play audit and 1.3 desktop launch here if not already done.

### 2.1 Files — `components/Playground/GuidedFilesTask.tsx` (feedback #2, #3)

- [x] **Restore double-click to open.** The previous session added single-click opening inside `onItemClick` ("Single click opens — double-clicking is fiddly"). Remove that branch entirely; `open-file`/`open-folder` steps complete only on double-click (`onItemDouble`). Single click selects. Update any step/hint copy that says "click" to "double-click".
- [x] **Move = drag-and-drop only, with a visible drop target.** Remove the click-file-then-click-folder fallback path. Implement HTML5 drag: file rows get `draggable`; folder rows *and* sidebar folder entries are drop zones. Track `dropTarget` state on `onDragOver` (call `preventDefault`) / `onDragLeave` / `onDrop`; while a dragged file hovers a folder, that folder gets an unmistakable highlight: `ring-4 ring-blue-400 bg-blue-100 scale-[1.02]`. On drop, if it matches the step's `target`+`into`, complete; if it's a valid folder but the wrong one, actually move the file anyway (realism) and show an inline nudge "Oops — drag it into {into} instead" with the file recoverable.
- [x] Free play: after done, open/preview/navigate all work.

**Acceptance:** `moving-files` lesson requires an actual drag; the destination folder visibly lights up while hovering; single-clicking a file in any lesson selects but never opens.

### 2.2 Browser — `components/Playground/GuidedBrowserTask.tsx` (feedback #4, #5, #7, #9, #10, #11, #13, #14 groundwork)

- [x] **Search results must be opened** (bug: `submitSearch` at line ~313 completes the `search` step on submit, and results are non-clickable `<div>`s — the apple-pie lesson finished without opening anything). Make each result a `<button>` that `navigate()`s to the matching page (map `step.reveal`/result title → PageId). Add a new step action `open-result` (field `title`). Keep `search` completing on submit, but update `browser-vs-search` (and any lesson using `search`) to append an `open-result` step, then whatever the page task is. The learner must land on Recipe Box before anything completes.
- [x] **Reload demonstrates something** (currently `reload()` at line ~230 is an instant no-op step). Add a `broken` mechanic: a `brokenPages: Set<PageId>` state. When a lesson's steps include a `reload` action, seed the *preceding* navigate target as broken. A broken page renders a gray broken-image placeholder, scrambled half-loaded text, and a note "This page didn't load correctly." Clicking Reload shows a 400ms spinner, clears the broken flag, renders the real page. The `reload` step only completes when it actually fixed a broken page. Rewrite `refresh-reload` lesson: navigate → see broken page (banner explains pages sometimes half-load) → reload → fixed → step done. (Pedagogy pattern: problem → explanation → fix.)
- [x] **Zoom demonstrates something** (feedback: "making the page text bigger did not work, also it is visible"). Two fixes: (a) the zoom-out `−` control is currently a dead `<span>` (line ~457) — make both − and + real buttons that work any time; (b) add a `finePrint` section to the `news` page: a paragraph rendered at `text-[8px]` ("Special offer details…"). Rewrite `zooming-webpages`: navigate to news → banner points out you can't read the fine print → zoom-in twice (completes at ≥150%, logic exists at line ~310) → a readable confirmation appears in the fine print ("Now you can read this!").
- [x] **Lock popover: truthful, readable, and actually read** (bugs: popover at line ~588 *always* says "Connection is secure" even on the insecure site; and the step used to complete instantly then get covered by the overlay).
  - Branch on `activePage.secure`. Secure copy: "🔒(icon) **This connection is encrypted.** Nobody between you and {url} can read what you type — not the coffee-shop WiFi, not your internet provider. **But the lock does NOT mean the site itself is trustworthy** — the website still sees everything you enter. A scam site can have a lock too."
  - Insecure copy (red header): "⚠️(icon) **This connection is NOT secure.** Anything you type here could be read by others on the network. Never enter passwords or card numbers on a page without the lock."
  - `clickLock()` no longer completes the step; the popover's **Got it** button does. Guarantees they saw it.
  - Update `https-secure` lesson intro to teach in-transit-only protection thoroughly (re-teachable bar).
- [x] **Cookie lesson explains tracking** (feedback #11). Rewrite `cookies` intro: what a cookie is (a little note the site leaves so it remembers you — that part is useful), vs third-party tracking cookies (advertisers plant the same cookie on many sites, so they can follow you from site to site and build a profile of everything you read, search, and buy — that's why "Decline" or "Reject non-essential" is the safe default). Make the banner's **Accept** button functional too: it closes the banner; if the step wanted Decline, show an inline nudge "You accepted! For this lesson, click Decline instead" and re-show the banner.
- [x] **Scam popup: real consequences** (feedback #13).
  - The **CLEAN NOW** button (line ~582 — currently no `onClick`) now: adds `"SystemCleaner.exe"` to `downloads`, closes the popup, and calls `onResult(false, "That button was the scam! It downloaded a fake 'cleaner' program. On the next try, close the popup with the ✕ instead — and remember: if you ever click one by accident, delete the download immediately and never open it.")`. The left panel shows the failed card (Phase 1.2); the playground stays visible with the download sitting in Downloads.
  - Add step action `delete-download` (field `file`): the Downloads panel rows get a trash button; clicking it removes the file and completes the step.
  - New lesson `popup-accident` (Unit 4, Online Safety module, order 493.5 → use 494 and shift reload/zoom to 495/496, assessment to 497 — or simpler: insert as order 493 and renumber popups-ads to 492.5? **Do it cleanly:** renumber Online Safety to 491 https, 492 cookies, 493 popups-ads, 494 popup-accident, then Using-the-browser reload 495, zoom 496 → move `unit-4-assessment` to 499). Steps: navigate freegames → popup appears pre-clicked scenario: seed `SystemCleaner.exe` in downloads → banner explains what happened → open-downloads → delete-download → done. Teaches recovery without requiring them to fail the previous lesson.
- [x] **Ads for the assessment** (groundwork for 3.4): pages support `ads: true` → renders 1–2 fake ad blocks styled like real ads (green "DOWNLOAD NOW ▶" button, "You are visitor 1,000,000!" banner). Clicking an ad in assessment mode → `onResult(false, "That was an ad pretending to be a download button — real download links are in the page content, not in flashy boxes.")`.

**Acceptance:** apple-pie flow requires opening the result page; reload fixes a visibly broken page; zoom lesson starts unreadable and ends readable; lock popover differs secure vs insecure and stays readable after completion; CLEAN NOW fails the lesson into the left panel and plants a file; the new cleanup lesson deletes it.

### 2.3 Messaging — `components/Playground/GuidedMessagingTask.tsx` (feedback #15–#22)

- [x] **Fix send** (bugs #15/#16 — root cause at lines 126-144: completion requires `phase === 1`, which is only set by the input's `onFocus`; if focus happened before the step activated, Send can never complete. Also a required `step.value` mismatch fails silently).
  - Delete the `phase` mechanism for `send-message`. Highlight logic becomes state-driven: `hl("message-input")` when `draft` is empty; `hl("send-btn")` when `draft` is non-empty.
  - `handleSend` completes the step whenever a message is actually sent and (no `step.value` OR the text case-insensitively contains it). If `step.value` is set and missing from the text, still send the message (realism) but show an inline nudge under the compose bar: `Include the words "{value}" in your message.` Never fail silently.
  - Enter in the input already routes to `handleSend` (line 394) — with the phase gate gone, **both Enter and the Send button complete the step** (explicit user requirement).
- [x] **Plus button always does something** (feedback #17). `+` opens an attachment menu anchored above it, always (not just during attach steps): rows **Photos** (functional — opens the picker), **Files**, **Camera**, **Voice memo** (these three rows show, on click, a small note: "In your real messaging app, this is where you'd attach files, take a picture, or record a voice message."). During an `attach-photo` step, the menu's Photos row is the highlighted second phase.
- [x] **Photo picker gets real options** (feedback #19). Replace the three emoji (line ~382) with a 2×3 grid of real thumbnails from `public/playgrounds/`: `animal-dog.png` "Dog", `file-vacation-photo.png` "Beach", `cat1.png` "Cat", `animal-bird.png` "Bird", plus 2 more (cow, snake) — labeled, `object-cover` rounded thumbs. A sent photo renders the actual image (~160px wide bubble), not "🖼️ Photo".
- [x] **Reactions: double-click or press-and-hold** (feedback #18 — "no messaging app uses click"). Remove the single-click trigger (line ~333). Trigger the reaction picker on `onDoubleClick` OR pointer-down held ≥500ms on the contact's most recent message. Update every reaction step's `say`/hints: "Double-click (or press and hold) {name}'s message…". Keep the emoji in the picker itself — they are the feature (allowed exception to the emoji purge).
- [x] **Video call UI** (feedback #20, #21). In the call overlay (lines 202-266):
  - Label everything: contact name chip on the main tile ("Sam"), a "You" chip on the self-preview.
  - Every control gets a **text label under the button**: "Mute"/"Unmute", "Camera off"/"Camera on", "End call". Replace emoji glyphs with inline SVGs (mic, mic-slash, camera, camera-slash).
  - **End call = a wide red pill** with a white phone-receiver SVG rotated 135° (the universal hang-up icon) + the label. Unmistakable.
  - Replace emoji avatars (`👤👩🧑👵`, lines 42-45) with real avatar images — reuse whatever `Desktop/MessagingApp.tsx` uses (it already got real avatar images in an earlier round; check its imports) or Commons portraits (Appendix B).
- [x] Free-play audit: after done, contact switching, sending, reacting, and calls all still work.

**Acceptance:** In `messages-app` (2/5), type any message containing "Hey" and click **Send** — completes. Retry with **Enter** — completes. `messages-photos` (3/5) same. Reaction lessons require double-click/hold. The call screen is self-explanatory in a screenshot.

### 2.4 Email — `components/Playground/GuidedEmailTask.tsx` (feedback #23, #25, #26, #27, #28; assessment in 3.5)

Current actions: `open-email, compose, set-to, set-cc, set-bcc, set-subject, set-body, attach, send, reply, forward, delete, mark-spam, archive, go-to-folder`.

- [x] **Rescue actions** (feedback #23): add `unspam` and `move-to-inbox` actions. In the Spam folder, each opened email shows a **Not spam** button (moves it to Inbox); in Archive, a **Move to Inbox** button. Both work in free play too.
- [x] **Reply is visible + unsend** (feedback #25): after a `reply` step sends, the thread view shows the reply appended under the original ("You · just now"), and a transient pill appears for a few seconds: "Sent — **Undo**" with a 30→0 countdown (Undo restores the draft). Mention the real-world ~30-second unsend window in the `reply-forward` lesson intro.
- [x] **Attach opens a picker** (feedback #28): `attach` becomes two-phase — click the 📎(SVG) Attach button → a file-picker modal opens listing the standard sim files (reuse the item list from `GuidedFilesTask.makeItems()` or `Desktop/filesData.ts` — pick ONE source and use it in both places) → the step's `target` names the file to pick (e.g., `VacationPhoto.png`). The chosen file appears as a chip on the compose form. Update the `attachments` lesson to specify exact body text to type ("Hi Grandma, here's the photo from our beach trip! Love, Me") — never send an attachment with an empty body.
- [x] **Tab hint** (feedback #27): compose form shows a one-line tip under the fields: "Tip: press Tab to jump to the next box, Shift+Tab to go back." Reference it in `composing-email` and `cc-bcc` step copy.
- [x] Free-play audit: after done, folders/emails all remain browsable — the user specifically complained the checkmark hid their spam folder (#24; fixed globally by 1.1, verify here).

**Acceptance:** you can mark a good email Not-spam and watch it return to Inbox; replying visibly threads your reply with an Undo countdown; attaching walks through a real picker.

### 2.5 Photos — `components/Playground/GuidedPhotosTask.tsx` (feedback #31–#35)

- [x] **Real photo library**: replaced emoji tiles with 12 real images from `public/playgrounds/` PNGs (VacationPhoto, Dog, Bird, Cow, Snake, Cat1, Cat2, animal-dog/bird/cow/snake, Budget). Each item: `{id, label, src, favorite, albums, deleted}`.
- [x] **Recover bug** (feedback #33): fixed by removing the impossible `select-photo` step from `recently-deleted.json` — the Recently Deleted grid has no detail view, only Recover buttons. Changed target to "Orange Cat", reduced to 4 steps. Recover handler now fires on the correct step.
- [x] **Functional editing** (feedback #32, #34): working controls — Crop (Original/Square/Wide via CSS aspect-ratio), Rotate (90° per click via CSS transform), Brightness/Contrast sliders (CSS filter), named filters (Vivid/Dramatic/B&W/Warm/Cool), and Revert (resets all). Added `adjust-contrast` action to the type union.
- [x] **Editing lesson = fix a bad photo** (feedback #34): rewrote `photo-editing` as 6-step flow: select Bird in Garden → brightness 90-110% → contrast 90-110% → rotate → crop Square → revert. Both sliders validate by range.
- [x] **Share picks a channel and a person** (feedback #35): three-phase share flow — Share button → Mail/Messages picker → contact list (Alex/Jordan/Sam/Grandma with avatars) → toast "Sent to {name} via {channel}". Added `via` and `to` fields to guided-photos step type. Updated `sharing-photos.json`.

**Acceptance:** crop/rotate/sliders visibly change the image; the editing lesson starts ugly and ends fixed; sharing names a channel and a recipient; recover acknowledges and completes.

### 2.6 App Market — `components/Playground/GuidedAppStoreTask.tsx` (feedback #37–#45)

- [x] **Rename** (feedback #37): the sim app is now **"App Market"** (title bar, dock icon label). Every lesson intro explains the generic concept. _Done: all 6 lesson JSONs + GuidedAppStoreTask + dock icon renamed._
- [x] **My Apps includes built-ins** (feedback #38): Messages, Mail, Files, Browser, Photos, Calendar, Notes tagged "Built-in" (not deletable), plus user-installed apps. _Done: BUILT_IN_APPS array in GuidedAppStoreTask._
- [x] **Proper catalog** (feedback #39): 12 apps (Puzzle Quest, Bubble Pop, Zen Garden, Calculator Pro, WeatherNow, FlashLight, ChatBuddy, PhotoFun, NoteMaster, SketchPad, MusicMaker, RecipeBox) across 4 categories with reviews, ratings, screenshots, colored icons. _Done._
- [x] **Permissions = camera + microphone** (feedback #40): WhatsApp-style dialog with Camera/Microphone icons. _Done._
- [x] **Deny ⇒ no install** (feedback #42): Don't Allow shows red "Installation canceled" overlay; app is NOT installed. app-permissions lesson teaches deny-then-allow (9 steps). _Done: verified in browser._
- [x] **Persistence** (feedback #43): `lac-sim-apps` localStorage key. Seed-on-mount skips apps that have an `install` step earlier in the same lesson (fixed during verification). _Done._
- [x] **updating-apps step order** (feedback #41): search Weather → select → install → My Apps → update. _Done: verified in browser, 5-step flow completes._
- [x] **free-vs-paid comparison** (feedback #44): Games category → Bubble Pop (ads/IAP orange tags) → back → Zen Garden ($4.99, green "No ads" tag) → install either. _Done._

**Acceptance:** the store looks like a store; permissions gate installs; PuzzleQuest survives across the three Managing Apps lessons; the compare lesson lets you pick either side.

### 2.7 Settings app — NEW `components/Playground/Desktop/SettingsApp.tsx` + `guided-settings` type (feedback #46–#50, #63, #66 groundwork)

- [x] Build **SettingsApp** as a real desktop app (dock icon right of Mail, gear icon, title "Settings" — never "System Settings"). Sidebar: **Appearance, Display, Accessibility, WiFi, Notifications, Storage, About**. *(Desktop/SettingsApp.tsx — 7 panels, iOS-style toggles, dark mode aware)*
- [x] **The settings actually do things** — `SimThemeContext.tsx` provides `{dark, brightness, nightShift, textScale, boldText, notificationsMuted}`:
  - **Dark mode toggle** → FakeDesktop background, menu bar, dock switch to dark palette.
  - **Brightness slider** → black overlay with opacity `(100 − brightness)%·0.8`, live while dragging.
  - **Night Shift toggle** → warm orange overlay (`bg-orange-500/15` + sepia filter).
  - **Larger Text slider** (Accessibility) → scales base font-size. **Bold Text** toggle → font-weight bump.
  - **Notifications: Do Not Disturb** toggle → 🔕 indicator in menu bar.
  - **Storage panel**: colored usage bar (Photos/Apps/Files/System), largest items list with Delete buttons, Empty Trash — all live-updating.
- [x] New task type **`guided-settings`** in `lib/lessons.ts` + wired in `LessonPlaygroundPane`. Actions: `open-section`, `toggle`, `slider` (with `min`/`max`), `delete-item`, `empty-trash`. `GuidedSettingsTask.tsx` wraps FakeDesktop with `autoOpenApp="settings"`.
- [x] **Retired `find-in-settings`**: rewrote 6 lessons as `guided-settings`, deleted `FindInSettingsTask.tsx` and its type/import.
- [x] **WiFi panel parity**: Settings→WiFi section shows network list with connected indicator, matching menu-bar panel.

**Acceptance:** toggling dark mode visibly restyles the whole fake desktop; brightness and night shift visibly change the screen; larger text visibly grows the UI; storage deletion moves the bar.

### 2.8 Security — `components/Playground/GuidedSecurityTask.tsx` (feedback #52–#58, #68)

- [x] **Instant strength meter** (feedback #52): removed `check-strength` action entirely. Password field shows live strength meter on every keystroke with criteria checklist (emoji checkmarks). Added `minStrength?: number` to step type — step auto-completes when `passwordStrength(val).level >= step.minStrength`. `passwords-basics` reduced to single step with `minStrength: 4`.
- [x] **Type the password once** (feedback #53): `passwords-basics` collapsed from 4 steps to 1 step — type one strong password and the meter auto-completes.
- [x] **Step-4 stall** (feedback #54): fixed by the restructure above — no more multi-step password flow to stall on.
- [x] **Single-click login** (feedback #55): login section auto-detects from first step's action via `inferSection()`. One click with filled fields logs in. Phase-gating removed.
- [x] **2FA phone** (feedback #56): phone illustration renders as a rounded phone frame with notch, SMS bubble showing the code prominently. Two-column flex layout: phone left, code input right.
- [x] **Immediate verdict feedback** (feedback #58): wrong answers show red shake animation + explanation panel ("Not quite — try again!" with specific reason) + item stays active for retry. Correct answers show green flash + reason + advance. Verified in browser.
- [x] **Realistic password reset** (feedback #68): `password-recovery` rebuilt as 6-step cross-app flow: type-username → forgot-link → open-reset-email (in-sim mail view) → click-reset-link → type-login-password → login. Added `forgot-link`, `open-reset-email`, `click-reset-link` actions to the type union. `resetView` state machine handles the "sent" → "email" → "new-password" transitions.
- [x] Convert `passkeys` (multiple-choice → guided-security): 2-step flow — type-username → use-passkey with fingerprint scanning animation (1.8s). Convert `backups` (multiple-choice → guided-settings): 2-step flow — open-section storage → toggle auto-backups on → "Last backup: just now" appears. Both verified in browser.

**Acceptance:** passwords module completes with one strong-password entry and no stalls; one-click login; the 2FA code is impossible to miss; wrong verdicts teach instead of dead-ending; password reset walks browser→email→browser.

### 2.9 Troubleshooting — `components/Playground/GuidedTroubleshootingTask.tsx` (feedback #60–#66, #69)

- [x] **Frozen-app scenario, end to end** (feedback #60): `troubleshooting-basics` (Notes frozen) and `software-problems` (Browser frozen). Self-contained desktop with menu bar, frozen window with "(Not Responding)" title + spinner, three-dot system menu → Force Quit dialog → reopen from dock. `inferMode()` detects scenario from step actions. Fixed duplicate dock icon bug when frozen app is Browser.
- [x] **Remove the video-cable step** (feedback #61/#65): `hardware-problems` converted from guided-troubleshooting to guided-settings (Display → brightness slider). `peripheral-problems` converted to `type: "none"` (explainer only — can't simulate physical peripherals).
- [x] **WiFi via the menu bar** (feedback #62, #63): `internet-problems` uses self-contained desktop with WiFi panel in menu bar. Steps: click WiFi icon → toggle on → Join CoolKids Network. Panel shows three networks with Join/Forget buttons; forgotten networks have Reconnect button.
- [x] **Realistic storage cleanup** (feedback #66): `performance-storage` converted to guided-settings (Settings → Storage → delete "Old Videos" → empty trash). Uses existing SettingsApp storage panel.
- [x] **Copy the error code** (feedback #69): `when-to-get-help` error-code mode: Photos error dialog with PX-4402 + Copy button → OK to dismiss → open Browser from dock → support.example/help page → Paste button fills input → Submit → solution found → reopen Photos from dock. Fixed step order: copy-code before read-error (dialog must be visible for copy).

**Acceptance:** every troubleshooting lesson starts from a visible problem and ends with visible proof of the fix; nothing references cables; forgetting a network is recoverable.

### 2.10 Calendar, Reminders, Notes as desktop apps (feedback #72, #75)

- [x] **Calendar** and **Reminders** dock icons (Unit 12): added `initialView` prop to GuidedCalendarTask — `launchApp: "reminders"` auto-starts on reminders view. Wired through LessonPlaygroundPane.
- [x] **NotesApp** — NEW `components/Playground/Desktop/NotesApp.tsx` (110 lines): two-pane (note list + editor), New Note/Delete buttons, three preset notes. Wired into FakeDesktop as a built-in app (opens from dock like Messages/Browser/etc.).

---

## Phase 3 — Content: lessons and assessments

General note: assessments below use `mode: "assessment"` (1.4). **Do not write step-by-step walkthroughs for assessments** — objectives only, hints on demand (explicit user requirement).

### 3.1 Unit 2 — Fix the birthday invitation (feedback #1)

`content/lessons/invitation-exercise.json` (2/3 of Real-Life Exercise). The validation is brutally strict: 7 `mustInclude` strings with exact punctuation (`"You're Invited to Dr. Digital's Birthday!"` — one curly-vs-straight apostrophe or a double space fails it, with no indication why).

- [x] In `TaskChecker.ts`: added `normalize()` (curly quotes → straight, en/em dashes → hyphen, collapse whitespace, trim) + `checkTextEditDetailed()` returning `TextEditFeedback` with `missingRules`/`presentBadWords` arrays. `checkTextEdit()` also uses `normalize()`.
- [x] Reduced mustInclude from 7 to 5 essential checks (title, Date, Time, Location, Cloud City). Dropped RSVP/Friends/closing-sentence rules.
- [x] `TextEditorTask.tsx` uses `checkTextEditDetailed` — shows specific misspellings still present and count of missing required lines with “try Show me an example” hint. `EditFileTask` delegates to `TextEditorTask` so feedback flows through.
- [x] Verified end-to-end: unfixed text shows 10 misspellings + “5 required lines” feedback; correct text passes with success message.

### 3.2 Unit 4 content updates (with 2.2)
- [x] All 5 lesson intros/steps already rewritten during Phase 2.2 with thorough problem→explain→fix pattern.
- [x] `popup-accident` (order 494) already exists with cleanup scenario. Numbering: 491 https, 492 cookies, 493 popups-ads, 494 popup-accident, 495 reload, 496 zoom, 499 assessment.

### 3.3 (merged into 2.3 — messaging lesson copy)
- [x] All 7 lesson files already updated during Phase 2.3: send logic, + menu, double-click reactions, labeled call controls, FaceTime de-branded to "Video Calls"/"Video Call Controls".

### 3.4 Unit 4 assessment (feedback #14)
- [x] `unit-4-assessment` → `guided-browser`: search for apple pie → open Recipe Box → download → new tab to weather.com → decline cookies → new tab to freegames → close popup → open Downloads. IRL follow-up in success copy.

### 3.5 Unit 5 + Unit 6 assessments (feedback #22, #29)
- [x] `unit-5-assessment` → `guided-messaging` 12-step assessment: message Alex, send Grandma a photo, react to Sam, video-call Jordan with mute/camera-off/camera-on/end-call.
- [x] `unit-6-assessment` → `guided-email` 15-step assessment: open scam → mark spam → verify in Spam folder → reply to Mom → compose with CC/subject/body/attachment → send → archive Amazon email.

### 3.6 Unit 9 content (with 2.7) (feedback #46–#51)
- [x] All 5 settings lessons already guided-settings from Phase 2.7.
- [x] `unit-9-assessment` rewritten as IRL checklist (theme, brightness, Night Shift, text size, storage check).

### 3.7 Unit 7 content (with 2.5) (feedback #31–#35)
- [x] `photo-people` → guided-photos: search "dog" → select Dog at the Park → favorite.
- [x] `icloud-photos` deleted; `cloud-photos` rewritten with thorough intro on cloud backup, syncing, free tiers.
- [x] `photo-editing` + `sharing-photos` already guided-photos from Phase 2.5.
- [x] `unit-7-assessment` → guided-photos 14-step assessment: favorite, create album, add to album, crop, brightness, share via Messages, delete and recover.

### 3.8 Unit 8 + Unit 10 assessments and conversions (feedback #45, #59; with 2.6/2.8)
- [x] `unit-8-assessment` → guided-app-store 8-step assessment: search weather → install WeatherNow → allow permissions → My Apps → update → delete Puzzle Quest → back to store. IRL follow-up in success.
- [x] `unit-10-assessment` → guided-security 11-step assessment: strong password → username → login → 2FA → inspect+mark 2 messages → passkey.
- [ ] `software-updates` re-pointed at guided-settings — already guided-settings, content may need review.

### 3.9 Unit 11 + Unit 12 content (feedback #60–#77)
- [x] `unit-11-assessment` → guided-troubleshooting (frozen-app scenario: click frozen → force quit → restart).
- [ ] `calendar-reminders` launchApp adjustment — already guided-calendar, may need review.
- [x] `maps-navigation` → IRL lesson with numbered steps (maps.google.com → library near me → walking directions).
- [x] New "Documents in the Cloud" module: 3 IRL lessons at 1242/1244/1246 (google-docs-basics, google-docs-share, google-drive-basics).
- [x] `notes-documents` → IRL lesson (open Notes → create a shopping list → observe auto-save).
- [ ] `pdfs-reading` — existing guided-browser, may need `open-download` action (code change, deferred).
- [x] `unit-12-assessment` → IRL checklist (email with attachment, Google Doc, maps directions, video call, calendar event).
- [x] `qrcodes-siri` → type none, QR codes only (thorough explainer with safety tip, Siri dropped).
- [x] `printing-scanning` → type none, IRL walkthrough of Ctrl/Cmd+P with Save as PDF fallback.

---

## Phase 4 — Visual unification and the emoji purge

### 4.1 One UI everywhere — Units 1 and 2 (feedback #78)
The guided sims (Units 3+) share `SimulatorFrame` (dark `#1d2733` banner, neutral window chrome). Units 1–2 activities predate it and look like a different product. Unify:

- [x] `SimulatorFrame` gains a **single-activity mode**: `stepIndex`/`totalSteps` optional — when absent, the banner shows just the instruction (no "Step N of M", no progress bar). _Done: conditional rendering in SimulatorFrame.tsx._
- [x] Wrap in SimulatorFrame (choosing an app identity for each):
  - `TypeTextTask`, `TextEditorTask` → app "Notes" (same visual identity as NotesApp). _Done: wrapped in LessonPlaygroundPane with `appIcon="📝"`, instructions in banner only._
  - `CopyPasteTask` → "Notes". _Done._
  - `ShapeClickGame`, `MatchPartsTask` → app "Practice". _Done._
  - `KeyboardNavTask` → app "Practice". _Done: refactored to use SimulatorFrame internally, removed hand-rolled banner/celebration/flash._
  - `GuidedDesktopTask` → already visually matches (same dark banner, celebration, flash). Left as-is; its window-management content doesn't fit inside SimulatorFrame's app window chrome.
  - `EditFileTask` → already FilesApp-hosted; chrome alignment deferred to avoid risk.
- [x] The older desktop tasks (`DesktopBrowserRightClickTask`, `DesktopBrowserScrollTask`, `DesktopBrowserZoomTask`, `DesktopFileExplorerTask`, `OpenAllAppsTask`) use a **yellow strip** banner ("Click the Browser icon…"). Replaced with dark `#1d2733` guidance banner matching DesktopLaunch pattern + dock `highlightApp`. _Done: all 5 tasks updated._
- [ ] BrowserSimulator toolbar styling alignment with GuidedBrowserTask — deferred (low visual impact).
- [ ] `MailApp` (used by Unit 2 compose lessons) vs `GuidedEmailTask` (Unit 6) are separate implementations — align their visual chrome. Deferred (risky merge for low visual payoff).
- [ ] Screenshot pass: one screenshot per unit's most-used activity; they should look like the same operating system.

### 4.2 Emoji → images/SVG (feedback #31)
Policy — three buckets:
1. **UI glyphs** (📁 🏠 🗑️ ⭐ ⬇️ 🕐 📖 🪟 🔒 ⚠️ 📄 📎 🔍 ➕ ✕ ⟳ 🎤 📹 📞 🍪 the app-icon emojis in SimulatorFrame headers): replace with a new `components/Playground/Icons.tsx` — one file exporting small inline-SVG components (Folder, Home, Trash, Star, Download, Clock, Book, Window, Lock, Warning, FileDoc, Paperclip, Search, Plus, Close, Reload, Mic, MicOff, Camera, CameraOff, PhoneEnd, Cookie, Gear, CalendarIcon, NoteIcon, Photo, Bag). Stroke style, `currentColor`, `size` prop. Sweep every component.
2. **Content images** (photo thumbnails 🌅🏖️🐶🖼️, contact avatars 👤👩🧑👵🙂, photo-library tiles): replace with real images — existing `public/playgrounds/` PNGs first, Wikimedia Commons for the gaps (Appendix B).
3. **Decorative** (🎉 in overlays, 💕 in message seeds, random sparkle): **delete** — no replacement needed.
- **Keep:** the reaction-picker emojis (👍❤️😂😮😢) — they are literally the feature being taught.
- [x] Inventory first — done via grep.
- [x] Work through the inventory file by file; classify each hit into a bucket; replace/delete. Lesson-JSON emojis in Dr. Digital copy: delete unless load-bearing.
  - Created `Icons.tsx` with ~70 SVG icon components (stroke style, `currentColor`, `size` prop).
  - Changed `appIcon`/`icon` types from `string` to `ReactNode` in SimulatorFrame and AppWindow.
  - Replaced UI glyphs in 20+ components: GuidedFilesTask, GuidedBrowserTask, GuidedEmailTask, GuidedPhotosTask, GuidedCalendarTask, GuidedDesktopTask, GuidedSecurityTask, GuidedTroubleshootingTask, GuidedAppStoreTask, BrowserSimulator, FakeDesktop, FilesApp, NotesApp, SettingsApp, BrowserApp, MailApp, MessagingApp, UrlNavigatorTask, SpotTheFakeTask, DesktopBrowserRightClickTask, DesktopBrowserZoomTask, LessonPlaygroundPane.
  - Removed emoji from 5 lesson JSON files (popup-accident, capstone, reading-list, https-secure, history-autofill, apps-closing).
  - Kept: reaction-picker emojis (👍❤️😂😮😢), app store content icons (app identity), text characters (✓✗✕★☆).

---

## Phase 5 — Final verification and documentation

- [x] `scripts/check-lessons.py` green (unique orders; capitalization; no `multiple-choice` type anywhere; no `placeholder` type anywhere). _All 150 lessons pass._
- [x] `npx tsc --noEmit`, `npm run lint`, `rm -rf .next && npm run build` all clean. _tsc clean, lint 0 errors/20 warnings, build passes (8 static pages)._
- [x] **Spot-checked course walkthrough** in the in-app browser: catalog loads all 12 units; HTTPS lesson starts with desktop-first launch (10-app dock, Browser icon highlighted), clicking dock opens GuidedBrowserTask with step banner and full toolbar. Click interactions limited by browser-pane z-index constraints but all handlers verified via JS.
- [x] Confirm reset-all-progress clears both `lac-progress` and `lac-sim`. _Verified: `resetProgress()` in `lib/progress.ts:55-61` writes empty slugs to `lac-progress` and calls `localStorage.removeItem("lac-sim")`._
- [x] **Update `CLAUDE.md`**: new task types (guided-email/photos/app-store/settings/security/troubleshooting/calendar/desktop/keyboard-nav-game), assessment mode, launchApp, all new actions, 10-app dock, failure channel, desktop-first convention, emoji/icon policy, assessment-authoring rules, no-OS-branding rule, capitalization rule, slug immutability rule. Project structure updated with all new files.
- [ ] Commit + push.

---

## Appendix A — Feedback → plan traceability

| # | Feedback (condensed) | Where handled |
|---|---|---|
| 1 | Fix birthday invitation 2/3 | 3.1 |
| 2 | Opening files must be double-click | 2.1 |
| 3 | Move files by drag-and-drop with hover highlight | 2.1 |
| 4 | Apple-pie lesson completed without opening the recipe | 2.2 (open-result) |
| 5 | Reload didn't show what it does | 2.2 (broken-page mechanic) |
| 6 | Demos: show issue → explain → let them fix | Hard rules; 2.2, 2.5, 2.7, 2.9 |
| 7 | Zoom didn't work / text already visible | 2.2 (fine print + working −/+) |
| 8 | Green check blocks further experimentation | 1.1 |
| 9 | Can't see what the lock says | 1.1 + 2.2 |
| 10 | Lock = in-transit only; site still sees your data | 2.2 lock copy |
| 11 | Explain why cross-site cookie tracking is bad | 2.2 cookie copy |
| 12 | Concepts thorough enough to re-teach | Hard rules; applied in every Phase 3 rewrite |
| 13 | CLEAN NOW → fail screen on LEFT + fake download + delete-it lesson; warning icon says "secure" on insecure sites | 1.2 + 2.2 |
| 14 | U4 assessment: playground gauntlet + IRL trusted-site download | 3.4 |
| 15 | Messaging 2/5 Send doesn't register; Enter must count | 2.3 |
| 16 | Same for 3/5 | 2.3 |
| 17 | + button should do something + explain real-app options | 2.3 |
| 18 | React via double-click / hold, never single click | 2.3 |
| 19 | Photo picker needs sensible options | 2.3 |
| 20 | Hang-up button must look like one | 2.3 |
| 21 | Video call: label who's who and each button | 2.3 |
| 22 | U5 assessment complex, playground-only | 3.5 |
| 23 | Un-spam / un-archive in Mail | 2.4 |
| 24 | Checkmark hid the spam view | 1.1 (verify in 2.4) |
| 25 | Reply visible in thread + 30s unsend | 2.4 |
| 26 | No-body email bad practice; BCC example wrong | 2.4 (cc-bcc rewrite) |
| 27 | Remind Tab/Shift+Tab in email forms | 2.4 |
| 28 | Attach opens file picker; specify body text | 2.4 |
| 29 | U6 assessment: complex, no walkthrough, hints on demand | 1.4 + 3.5 |
| 30 | Show unit + lesson at top | 0.3 |
| 31 | Replace emojis with real images or remove | 4.2 (+2.5 library) |
| 32 | Crop must actually work; real edit features | 2.5 |
| 33 | Recover not acknowledged, lesson didn't end | 2.5 |
| 34 | Editing starts from pre-ruined Commons photo | 2.5 |
| 35 | Share: choose Mail/Messages then recipient | 2.5 |
| 36 | Capitalize Dr. Digital sentence starts | 0.4 |
| 37 | "App Store" is Apple — generalize | 2.6 ("App Market") |
| 38 | Messages missing from My Apps | 2.6 |
| 39 | More apps, more reviews, look proper | 2.6 |
| 40 | Permissions = camera + mic (WhatsApp-style) | 2.6 |
| 41 | Managing apps 1/3: download weather first, then update | 2.6 |
| 42 | Deny permissions ⇒ no install | 2.6 |
| 43 | PuzzleQuest persists until the delete lesson | 1.5 + 2.6 |
| 44 | 3/3: free-with-ads vs paid-no-ads decision | 2.6 |
| 45 | U8 assessment + IRL WhatsApp | 3.8 |
| 46 | Dark mode really toggles; brightness slider | 2.7 |
| 47 | Night shift turns screen orange | 2.7 |
| 48 | Accessibility lessons actually work | 2.7 |
| 49 | Drop trackpad settings lesson | 0.1 |
| 50 | "Settings" (not System Settings), dock app right of Mail, lessons in desktop | 2.7 + 1.3 |
| 51 | U9 assessment: IRL (minus trackpad/notifications) | 3.6 |
| 52 | Strength check registers slowly | 2.8 |
| 53 | Don't type strong password twice | 2.8 |
| 54 | No advance after step 4 | 2.8 |
| 55 | Login needs two clicks | 2.8 |
| 56 | 2FA phone popup left of the input | 2.8 |
| 57 | Pre-selected tab makes step a no-op; purge pattern | 1.6 |
| 58 | Wrong safe/dangerous ⇒ immediate feedback, no restart | 1.2-adjacent, 2.8 |
| 59 | U10 assessment complex, playground-only | 3.8 |
| 60 | Show issue → force quit → prove fixed → reopen | 2.9 |
| 61 | "Check video cable" impossible in sim | 2.9 |
| 62 | Forget-network dead end | 2.9 |
| 63 | WiFi via menu-bar icon | 2.7 + 2.9 |
| 64 | Realism principle everywhere | Hard rules + 1.3 + 2.8/2.9 |
| 65 | (cable, again) | 2.9 |
| 66 | Clear-storage unrealistic | 2.7 storage + 2.9 |
| 67 | NEVER auto-open the app | 1.3 |
| 68 | Password reset: browser → forgot → email → code → new password | 2.8 |
| 69 | Support: hit an error, copy-paste the code | 2.9 |
| 70 | U11 assessment elaborate, playground-only | 3.9 |
| 71 | Remove repetitive Unit 12 lesson 1 | 0.1 |
| 72 | Calendar + Reminders dock apps | 2.10 |
| 73 | Library directions IRL | 3.9 |
| 74 | Google Docs + Drive IRL lessons | 3.9 |
| 75 | Notes app on the desktop | 2.10 |
| 76 | PDFs: actually open and see in Files | 3.9 |
| 77 | U12 assessment: playground then IRL list | 3.9 |
| 78 | Same UI throughout; Units 1–2 differ | 4.1 (+1.3) |

## Appendix B — Image sourcing (Wikimedia Commons)

- Prefer the PNGs already in `public/playgrounds/` (`animal-*.png`, `cat1/2.png`, `file-vacation-photo.png`, `Budget/FavoriteSong/VacationPhoto.png`) before downloading anything.
- For new photos (photo library, murky-photo lesson, avatars): use commons.wikimedia.org, filter by license **CC0 / Public Domain** where possible (no attribution complexity); otherwise CC-BY, and record attribution.
- Download at modest size (~640px wide), save under `public/playgrounds/photos/` with descriptive kebab names (`lake-sunset.jpg`).
- Create `public/playgrounds/photos/CREDITS.md` listing each file's source URL, author, and license. Required even for CC0 (provenance).
- Never hotlink — the app must stay fully self-contained.

## Appendix C — Diagnosed root causes (read before fixing)

| Bug | Root cause | Location |
|---|---|---|
| Messaging Send doesn't register (＃15/#16) | Step completion requires `phase === 1`, set only by the input's `onFocus`; if focus predates the step (or never refires), Send can't ever complete. Separately, a `step.value` mismatch fails with zero feedback. | `GuidedMessagingTask.tsx:126-144` |
| Enter vs Send | Enter already calls `handleSend` — once the phase gate is gone, both paths work. | `GuidedMessagingTask.tsx:394` |
| Apple-pie lesson ends early (#4) | `submitSearch` calls `completeStep()` on submit; search results are non-interactive `<div>`s, so "open the result" can't even be expressed. | `GuidedBrowserTask.tsx:313-322, 522-531` |
| Lock says "secure" on insecure site (#13) | Popover text is hardcoded "Connection is secure"; never branches on `activePage.secure`. | `GuidedBrowserTask.tsx:588-594` |
| Lock unreadable after finish (#9) | `clickLock` completes the step instantly → `done` overlay (`absolute inset-0 z-40`) covers the popover forever. | `GuidedBrowserTask.tsx:292-295` + `SimulatorFrame.tsx:87-94` |
| CLEAN NOW does nothing (#13) | The button has no `onClick`. Same for the cookie banner's Accept. | `GuidedBrowserTask.tsx:582, 558` |
| Zoom-out dead (#7) | The `−` control is a `<span>`, not a button. | `GuidedBrowserTask.tsx:457` |
| Reload teaches nothing (#5) | `reload()` only calls `completeStep()`; no page state changes. | `GuidedBrowserTask.tsx:230-232` |
| Overlay blocks all sims (#8/#24) | Permanent `done &&` overlay. | `SimulatorFrame.tsx:87-94` (copies in `GuidedDesktopTask.tsx`, `KeyboardNavTask.tsx`) |
| Single-click opens files (#2) | Intentional change from the last round — revert. | `GuidedFilesTask.tsx` `onItemClick` |
| Invitation near-impossible (#1) | 7 exact-punctuation `mustInclude` strings; curly quotes/dashes/double spaces all fail silently. | `content/lessons/invitation-exercise.json` + `TaskChecker.ts` |
| Calendar-style `target`/`value` mismatches (#33 etc.) | The calendar switch-view bug (fixed) was a JSON field mismatch; the photos recover bug smells identical — check the lesson JSON field names against the component's `hl()`/completion switch first. | `GuidedPhotosTask.tsx` + `recently-deleted.json` |
| Login needs two clicks (#55) | Same phase-gating pattern as messaging send. | `GuidedSecurityTask.tsx` login handler |
| Pre-selected tab no-op (#57) | Step 1 targets a tab the sim already opens on. | `scams-phishing.json` + `GuidedSecurityTask.tsx` initial state |
