# LearnAComputer — QA Round 4 Execution Plan

**Status:** Not started. Phases 0–5 of QA Round 3 are complete (commit `0f8e4fe`).
**Audience:** This document is written for an executor model (Sonnet) working phase by phase. **Read `CLAUDE.md` at the repo root first** — it documents the stack, the lesson JSON schema, and every playground task type with its full action list. This plan assumes that context and does not repeat it.

This plan translates 112 pieces of user feedback into concrete, ordered work. **Appendix A** maps every feedback item to the section that handles it, so nothing gets dropped. **Appendix B** lists the asset files the user must supply before certain sections can start. **Appendix C** contains pre-diagnosed root causes with `file:line` references for every reported bug — read it before touching any bug listed there.

---

## How to work this plan

1. **Execute phases in order** (0 → 16). Phases 3–14 (the per-unit content work) depend on the framework and PlaygroundOS changes in Phases 1–2. Within a phase, sections can be done in any order unless a dependency is called out.
2. **After each phase:** run all four checks — they must all pass before you move on:
   ```sh
   python3 scripts/check-lessons.py
   npx tsc --noEmit
   npm run lint
   rm -rf .next && npm run build
   ```
3. **Then drive it in the browser.** Start the dev server via the `.claude/launch.json` config (`preview_start` with `{name: "dev"}`) — **never** via raw Bash. Click through every lesson you touched and *actually complete the activity*. Looking at it is not verification.
4. **Never mark a checkbox `[x]` without having driven the lesson in the browser yourself.**
5. **Commit per phase** with a descriptive message, and push to `main`.
6. **When a phase changes the lesson JSON schema** (new task types, new step actions, new fields), **update `CLAUDE.md` in the same commit.** This is not optional — the schema docs in `CLAUDE.md` are the contract every future lesson author reads.

### Hard rules (violating any of these is a defect)

- **No multiple-choice activities. Ever.** The `multiple-choice` type still exists in `lib/lessons.ts` for backward compatibility but zero lessons use it. Do not add any.
- **No OS/app brand names in the simulated OS.** No Apple, macOS, Finder, Safari, FaceTime, iCloud, Siri, or "App Store" as the app's own name. Real *websites* rendered inside the simulated browser (Google, Wikipedia, Amazon) are fine — they are realistic web content, not OS branding. The simulated OS is called **PlaygroundOS** in developer-facing docs; learner-facing copy just says "your computer".
- **Realism principle.** Every playground activity must be performed the way a person would do it on a real computer. The learner opens apps from the desktop themselves. Flows follow real-world sequences. If a real computer would show a loading delay, show one.
- **THE NEW RULE — no playground where software isn't involved.** If a lesson teaches a *physical* thing (a port, a charger, a power button, a camera, a trackpad's physical shape) or a pure concept with nothing to click, **do not render the PlaygroundOS pane at all**. An idle desktop sitting next to a lesson about a charging cable is confusion, not scenery. Section 1.9 adds the mechanism; every unit phase applies it.
- **One Files app.** After Phase 2.6 there is exactly one file-manager implementation in the codebase. If you find yourself writing a second file list, stop and use the shared component.
- **Assessments are assessments.** Every unit assessment uses `mode: "assessment"`: objectives only, no step-by-step `say` walkthrough, no yellow highlight rings, hints only when the learner presses Hint. An assessment must also **test something new** — never replay the exact click sequence of the lessons that preceded it.
- **Explanations must be thorough enough that the learner could re-teach the concept.** Every `drDigitalIntro` for a concept lesson answers: What is it? Why does it matter to me? How do I do it? What's the common mistake? Aim for 4–6 bullets, plain language, no jargon left undefined.
- **Never rename an existing lesson `slug`.** Progress is stored by slug in `localStorage`. Deleting a lesson is fine (only the deletions listed here). New lessons get new slugs.
- **First letters capitalized** in every learner-facing sentence — `drDigitalIntro`, `drDigitalSuccess`, `drDigitalHint`, `instructions`, and every step `say`. `scripts/check-lessons.py` enforces this.
- **Don't add npm dependencies** except the two named explicitly in Phase 1.2 (`@supabase/supabase-js`, `@supabase/ssr`). Everything else is achievable with React + Tailwind + inline SVG.

---

## Phase 0 — Assets and blockers

### 0.1 Image files — **all available in `~/Downloads/Images/`**

All eight image files are committed to the repo at `Images/` (added via commit `9c80862`). No phases are blocked. Before any other work, copy them into `public/playgrounds/` so Next.js can serve them statically:

```sh
cp Images/DockIcons1.png     public/playgrounds/dock-icons-1.png
cp Images/PowerButton.png    public/playgrounds/power-button.png
cp Images/Charger.png        public/playgrounds/charger.png
cp Images/Headphones.png     public/playgrounds/headphones.png
cp Images/ImageInFiles.png   public/playgrounds/files-pictures.png
cp Images/DownloadInFiles.png public/playgrounds/files-downloads.png
cp Images/DigitalCookie.png  public/playgrounds/cookie.png
```

(`Images/` is in the repo root. `TabActivityIdea.png` stays in `Images/` — it's a design spec, not a public asset.)

`TabActivityIdea.png` is a **design spec mockup**, not an image to embed — see §4.4 for how it translates to a page inside `GuidedBrowserTask`.

**What each image is** (confirmed by inspection):

| File | Dimensions | What it looks like |
|---|---|---|
| `DockIcons1.png` | 1280×800 | Sprite sheet: 4 columns × 3 rows, 10 black-on-white icons |
| `PowerButton.png` | 512×512 | Classic power symbol (circle with vertical line), black on white |
| `Charger.png` | 512×512 | USB cable with plug ends, black on white |
| `Headphones.png` | 3684×3788 | Photograph of over-ear headphones — **scale down** to max 240×240 when rendering |
| `ImageInFiles.png` | 1280×800 | Image placeholder icon (mountains + sun silhouette), black on white |
| `DownloadInFiles.png` | 1280×800 | Download arrow icon, black on white |
| `DigitalCookie.png` | 512×512 | Cartoon chocolate-chip cookie (tan/brown) with a bite taken out |
| `TabActivityIdea.png` | 1311×703 | Design spec: browser at `pickacolor.example`, three colored circles, Tab/Enter sequence |

**Slicing `DockIcons1.png`** — it is a sprite sheet, 4 icons wide × 3 rows tall (last row has 2). Cell dimensions are exactly 320×267px (last row is 266px tall). Slice with a one-off script in the scratchpad, **do not commit the script**:

```sh
# Run from repo root in the scratchpad — do not commit
python3 - <<'EOF'
from PIL import Image
img = Image.open("public/playgrounds/dock-icons-1.png")

# Row-major order: (app-id, col, row)
icons = [
    ("messages",   0, 0), ("browser",  1, 0), ("files",    2, 0), ("reminders", 3, 0),
    ("mail",       0, 1), ("settings", 1, 1), ("photos",   2, 1), ("notes",     3, 1),
    ("app-market", 0, 2), ("calendar", 1, 2),
]
W, H = 320, 267  # cell width, height (row 3 is 266px — crop at 267 crops the border, fine)
for name, col, row in icons:
    box = (col*W, row*H, (col+1)*W, min(row*H+H, img.height))
    img.crop(box).save(f"public/playgrounds/dock-{name}.png")
print("done")
EOF
```

If `Pillow` is not installed: `pip3 install Pillow`. Verify the 10 output PNGs exist before continuing to §2.1.

- [ ] Copy all 7 image files (above) into `public/playgrounds/`
- [ ] Slice `dock-icons-1.png` into 10 `dock-<app>.png` files using the script above
- [ ] Verify: `ls public/playgrounds/dock-*.png` shows all ten

### 0.2 Everything is unblocked

Assets are available. Copy them (§0.1) and proceed to Phase 1. No sections are blocked.

---

## Phase 1 — Framework and navigation

Everything in Phases 3–16 depends on this phase. Do it first and do it completely.

### 1.1 Merge the lessons catalog and the dashboard (feedback #1)

Right now `/lessons` ([app/lessons/page.tsx](app/lessons/page.tsx), 33 lines) lists modules as bare underlined links with no progress, and `/dashboard` ([app/dashboard/page.tsx](app/dashboard/page.tsx) + [components/DashboardView.tsx](components/DashboardView.tsx)) lists the *same* modules again with completion counts. Two pages, one dataset, neither one good.

- [ ] Build a single page at `/lessons` that replaces both. Delete `app/dashboard/page.tsx` and `components/DashboardView.tsx`; create `components/LessonCatalog.tsx` (`"use client"` — it reads `localStorage`).
- [ ] The page receives `routes: ModuleRoute[]` from the server component (`getModuleRoutes()`) and reads `getCompletedSlugs()` in a `useEffect`. Render `null` until the effect has run, exactly as `DashboardView` does today ([components/DashboardView.tsx:19-22](components/DashboardView.tsx:19)) — this avoids a server/client hydration mismatch on progress state.
- [ ] Page structure, top to bottom:
  1. **Overall progress header.** `"{n} of {total} lessons complete"` with a full-width progress bar (`h-3 rounded-full bg-gray-200`, inner `bg-green-500 transition-all duration-500`).
  2. **Continue where you left off.** A prominent card linking to the first module containing an incomplete sub-lesson. Show unit name, module name, and `"Lesson {i+1} of {n}"`. If everything is complete, show a course-complete card instead.
  3. **Unit sections.** For each unit: a heading, then a card per module. Each module card shows the module name, `{done}/{total}`, a slim per-module progress bar, and a state chip — `Not started` (gray) / `In progress` (blue) / `Complete` (green with a `CheckIcon` from `Icons.tsx`). The whole card is one `<Link>` to `/lessons/{moduleSlug}`.
  4. **Footer.** Move the existing progress-storage explainer and the **Reset all progress** button here verbatim from [components/DashboardView.tsx:57-70](components/DashboardView.tsx:57). Keep the `window.confirm` guard and keep calling `resetProgress()` (which already clears both `lac-progress` and `lac-sim` — see [lib/progress.ts:55-61](lib/progress.ts:55)).
- [ ] **Redirect the old route.** Add `app/dashboard/page.tsx` back as a one-line server component: `import { redirect } from "next/navigation"; export default function Page() { redirect("/lessons"); }`. Anyone with a bookmark still lands somewhere sensible.
- [ ] **Update the nav bar** in [app/layout.tsx:22-36](app/layout.tsx:22): remove the "Dashboard" link. The nav becomes Home / Lessons / Playground.
- [ ] Widen the page: the current `max-w-xl` is too narrow for cards. Use `max-w-3xl mx-auto`.

**Acceptance:** `/lessons` shows real progress per module without visiting a second page; `/dashboard` redirects there; the reset button still works and still clears `lac-sim`.

### 1.2 Login page (feedback #2)

Build the **UI and the client-side session shape now**; wire Supabase **later**. Nothing in the course may become inaccessible because a user isn't signed in — progress stays in `localStorage` for this phase.

- [ ] `npm install @supabase/supabase-js @supabase/ssr` (the only dependencies this plan permits).
- [ ] Create `lib/supabase.ts`:
  - Export `createClient()` returning a browser Supabase client built from `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - **Guard for missing env vars**: if either is absent, log a single `console.warn` and export `null`. The site must build and run with no Supabase project configured — that is the state it will be in when you finish.
- [ ] Create `.env.local.example` (committed) with both variable names and empty values, plus a comment pointing at the Supabase project settings page. **Do not create `.env.local`** and never commit real keys.
- [ ] Create `app/login/page.tsx` — a client component styled to match the course (white card, `border-2 border-black`, generous type, same Roboto title font). It contains:
  - The Dr. Digital avatar (`components/DrDigitalAvatar.tsx`) and a one-line welcome.
  - Email + password inputs, both with visible `<label>`s (not placeholder-only — beginners lose placeholder text the moment they type).
  - A **Sign in** button and a **Create account** toggle that swaps the form's heading and submit label.
  - A **Continue without an account** link to `/lessons`, which must be visually prominent. This is the path everyone takes today.
  - A gray info box: *"Accounts aren't turned on yet. Your progress is saved on this device."*
- [ ] `handleSubmit` calls `signInWithPassword` / `signUp` when the client exists, and otherwise sets an inline message: *"Accounts aren't set up yet — use 'Continue without an account' for now."* Never throw, never leave a spinner running.
- [ ] Add a small **Sign in** link at the right end of the nav bar in `app/layout.tsx`.
- [ ] **Do not add middleware, route guards, or protected routes.** Do not migrate progress to Supabase. That is Phase 1.3's *document*, not this phase's code.

**Acceptance:** `/login` renders and is fully usable with no Supabase env vars set; the build passes; every lesson remains reachable without signing in.

### 1.3 Progress-monitoring design document (feedback #3)

**Write only. Implement nothing.** No schema is created, no code changes.

- [ ] Create `docs/PROGRESS_MONITORING.md` covering:
  1. **Today's model.** `lac-progress` (`{version, completedSlugs[]}`) and `lac-sim` in `localStorage`; read/written by [lib/progress.ts](lib/progress.ts) and [lib/simState.ts](lib/simState.ts). Its limits: per-device, per-browser, lost on cache clear, invisible to a parent or teacher.
  2. **What we want to know.** Per learner: which sub-lessons are complete and when; time spent per lesson; failed attempts per activity (the `onResult(false, …)` channel already produces this signal — it is simply discarded today); which lessons get skipped via *Skip this activity*; where learners quit a module.
  3. **Proposed Supabase schema.** Tables with columns and types: `profiles` (id uuid PK → auth.users, display_name, role enum learner|supervisor, created_at), `lesson_events` (id, user_id FK, lesson_slug, module_slug, event_type enum started|completed|failed|skipped, duration_ms nullable, fail_message nullable, created_at), `supervisor_links` (supervisor_id, learner_id, created_at, PK on the pair). Note the RLS policies each table needs: a learner reads and writes only their own rows; a supervisor reads rows for learners they are linked to; nobody writes another user's rows.
  4. **Sync strategy.** `localStorage` stays the write-ahead source of truth so the app works offline and while signed out. On sign-in, replay unsynced events. Reconcile by taking the union of completed slugs — completion is monotonic, so union is always safe and needs no conflict resolution.
  5. **The supervisor view.** What a parent or teacher sees: a learner list, per-unit progress bars, a "stuck here" list built from repeated failures on one slug, and last-active time.
  6. **Privacy.** Learners are likely minors. Data minimization, no third-party analytics, explicit linking (a supervisor is added by code or invite, never by email guess), and a stated deletion path.
  7. **Open questions**, explicitly flagged for the user: Do supervisors self-register or get invited? Is there a classroom/group concept above the 1:1 link? How long is event history retained?

### 1.4 Back and Next buttons: identical size (feedback #7)

[components/LessonModuleRunner.tsx:234-245](components/LessonModuleRunner.tsx:234). Back is `px-4 py-2 text-sm text-gray-600`; Next is `px-4 py-2 font-semibold`. Different font size and weight ⇒ visibly different heights and widths.

- [ ] Define one shared class string in the component:
  ```tsx
  const navBtn = "min-w-[120px] justify-center inline-flex items-center gap-1 border-2 rounded-lg px-5 py-2.5 text-base font-semibold transition-all active:scale-95";
  ```
- [ ] Back: `${navBtn} border-gray-300 text-gray-600 hover:bg-gray-50`. Next: `${navBtn} …` plus the state styles from 1.5.
- [ ] `min-w-[120px]` plus `justify-center` guarantees they match even though "← Back" and "Finish" have different label widths.

### 1.5 Next button reacts to completion; green check is faster (feedback #19, #25)

Two related changes.

**(a) The Next button announces that you may advance.** [components/LessonModuleRunner.tsx:240-244](components/LessonModuleRunner.tsx:240) currently renders Next with a static `animate-slide-up`.

- [ ] Add to `tailwind.config.ts` (`theme.extend.keyframes` / `theme.extend.animation`):
  ```ts
  "pop-attention": {
    "0%":   { transform: "scale(1)" },
    "40%":  { transform: "scale(1.12)" },
    "70%":  { transform: "scale(0.98)" },
    "100%": { transform: "scale(1)" },
  },
  // animation:
  "pop-attention": "pop-attention 0.45s ease-out 1",
  ```
- [ ] Track *when* the lesson just became passable: `const justCompleted = attemptState === "success";`
- [ ] When `justCompleted`, render Next as `border-green-600 bg-green-500 text-white hover:bg-green-600 animate-pop-attention shadow-lg` — it pops once and stays green. Otherwise render the neutral `navBtn` style. Do **not** loop the animation; one pop reads as "ready", a loop reads as an error.
- [ ] Apply the same green treatment when `alreadyDone` is true (revisiting a finished lesson) — minus the pop, since nothing just happened.

**(b) The celebration overlay is twice as long as it should be.** [components/Playground/SimulatorFrame.tsx:53-65](components/Playground/SimulatorFrame.tsx:53) holds it for `1600`ms.

- [ ] Change `1600` → `800`. Verify the same constant isn't duplicated elsewhere:
  ```sh
  grep -rn "1600" components/
  ```
  [components/Playground/GuidedDesktopTask.tsx](components/Playground/GuidedDesktopTask.tsx) and [components/Playground/KeyboardNavTask.tsx](components/Playground/KeyboardNavTask.tsx) each carry a local copy of this pattern — change those too. Extract the value to `export const CELEBRATION_MS = 800;` in `SimulatorFrame.tsx` and import it in both, so this can never drift again.

### 1.6 Every playground activity shows the green check (feedback #25)

The two-stage completion (overlay → slim banner) lives in `SimulatorFrame`. Activities that don't render through `SimulatorFrame` never show it.

- [ ] Audit every branch of [components/LessonPlaygroundPane.tsx:71-214](components/LessonPlaygroundPane.tsx:71). These are **not** wrapped and therefore have no celebration:
  `file-explorer-open`, `browser-right-click`, `browser-scroll-code`, `pinch-zoom`, `message-reply`, `open-all-apps`, `edit-file`, `compose-email`, `drag-sort-files`, `spot-the-fake`, `url-navigator`, and every `DesktopLaunch`-wrapped guided sim *before* its inner sim mounts.
- [ ] Most of these are being restructured anyway by later phases. For any that survive as-is, wrap them in `SimulatorFrame` using the existing single-activity mode (omit `stepIndex`/`totalSteps` and the banner shows just the instruction — see [SimulatorFrame.tsx:72-85](components/Playground/SimulatorFrame.tsx:72)), passing `done={completed}` from the existing `wrappedOnResult` at [LessonPlaygroundPane.tsx:62-65](components/LessonPlaygroundPane.tsx:62).
- [ ] Guided sims that own a full-screen desktop (`guided-desktop`, `guided-troubleshooting`) keep their local celebration — just confirm each one fires and uses `CELEBRATION_MS`.

**Acceptance:** finish any activity anywhere in the course and a green check appears for ~0.8s, then a slim green banner, then the sim stays interactive.

### 1.7 Skip the activity from inside a running activity (feedback #12, #23)

[components/LessonModuleRunner.tsx:198-232](components/LessonModuleRunner.tsx:198). Today "Skip this activity" only exists *before* you press Start; once started your options are Exit and Restart. A learner who gets stuck mid-activity is trapped.

- [ ] In the `started` branch, add a **third** button after Restart activity: **Skip this activity →**, calling `handleNext()`.
- [ ] Give **both** skip buttons (the pre-start one at line 208 and this new one) the same gray-box treatment the user asked for — no more bare underlined text:
  ```tsx
  className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200 active:scale-95"
  ```
- [ ] Skipping still calls `markComplete(subLesson.slug)` via `handleNext`'s `if (!hasGate)` path — **check this carefully**: for a gated lesson `handleNext` does *not* mark complete ([LessonModuleRunner.tsx:86](components/LessonModuleRunner.tsx:86)). That is correct and intentional. A skipped activity must **not** count as completed, or the progress number lies. Leave that behavior alone.

### 1.8 Back button on the first sub-lesson of a module (feedback #13)

[components/LessonModuleRunner.tsx:235](components/LessonModuleRunner.tsx:235) renders Back only when `index > 0`, so the first lesson of a module is a dead end — you cannot walk backwards into the previous module.

- [ ] Add `previousModuleSlug: string | null` to `LessonModuleRunnerProps` and thread it from `app/lessons/[slug]/page.tsx`.
- [ ] Add `getPreviousModuleSlug(moduleSlug)` to [lib/lessons.ts](lib/lessons.ts) — mirror `getNextModuleSlug` at [lib/lessons.ts:361-366](lib/lessons.ts:361), returning `routes[index - 1].moduleSlug` or `null` at index 0.
- [ ] Render Back whenever `index > 0 || previousModuleSlug`. When `index === 0` and a previous module exists, the click does `router.push(\`/lessons/${previousModuleSlug}\`)` and the label reads **← Previous module**.
- [ ] Note the interaction with the resume effect at [LessonModuleRunner.tsx:52-69](components/LessonModuleRunner.tsx:52): landing on a fully-completed previous module will show the "Module complete!" screen, which already has a **Review this module** button. That is acceptable and needs no change.

### 1.9 THE NEW RULE — hide the playground when software isn't involved (feedback #15, and #9, #10, #11, #14 in particular)

A lesson about a charging cable renders an idle PlaygroundOS desktop beside it. Beginners read that as "there is something here I'm supposed to do," and there isn't.

- [ ] Add an optional field to the `Lesson` interface in [lib/lessons.ts:264-275](lib/lessons.ts:264):
  ```ts
  /** Optional still image shown in the right pane instead of the PlaygroundOS desktop. */
  media?: { src: string; alt: string; caption?: string };
  ```
- [ ] In [components/LessonModuleRunner.tsx:248-256](components/LessonModuleRunner.tsx:248), replace the unconditional right pane with three cases:
  1. `subLesson.media` → render `components/LessonMedia.tsx` (new): a centered `next/image` with `object-contain`, `max-h-full`, rounded corners, a subtle border, and an optional caption below in `text-sm text-gray-500`. **No PlaygroundOS.**
  2. `hasGate` (there is a real activity) → render `LessonPlaygroundPane` exactly as today.
  3. Neither → render **nothing**, and let the left panel expand to fill the width. Change the left panel's class from `w-full lg:max-w-xl` to a conditional: keep `lg:max-w-xl` when a right pane exists, use `lg:max-w-3xl mx-auto` when it doesn't.
- [ ] Also apply case 3 in the module-complete screen at [LessonModuleRunner.tsx:155-157](components/LessonModuleRunner.tsx:155), which currently renders an idle desktop for decoration. Replace it with nothing and center the panel.
- [ ] **Document `media` in `CLAUDE.md`** under the Lesson JSON schema, with an example.

Every `type: "none"` lesson in the course now falls into case 2 or 3. Each unit phase below states which of its lessons get `media`, which get a real activity, and which get a bare centered panel.

### 1.10 Lesson-to-lesson transition animation (feedback #5)

Clicking Next swaps the text with no motion, so it isn't obvious anything changed.

- [ ] Add to `tailwind.config.ts`:
  ```ts
  "lesson-in": {
    "0%":   { opacity: "0", transform: "translateX(16px)" },
    "100%": { opacity: "1", transform: "translateX(0)" },
  },
  // animation:
  "lesson-in": "lesson-in 0.28s ease-out both",
  ```
- [ ] In `LessonModuleRunner`, wrap the left panel's content (title block + `DrDigital` + buttons — **not** the `← All lessons` link, which must not move) in a `<div key={subLesson.slug} className="animate-lesson-in space-y-6">`. Keying on the slug remounts the subtree on every lesson change, replaying the animation. This is the same trick `PageTransition` uses on `pathname` ([components/PageTransition.tsx:8-13](components/PageTransition.tsx:8)).
- [ ] Wrap the whole thing in `motion-reduce:animate-none` — respect `prefers-reduced-motion`.
- [ ] The right pane must **not** animate on every sub-lesson change; a desktop that slides in each time is nauseating. Leave it unkeyed.

### 1.11 Redo any lesson (feedback #89)

- [ ] In `LessonModuleRunner`, when `alreadyDone` is true and `hasGate` is true, render a **Redo this activity** button next to Next. It calls:
  ```tsx
  setActivityAttempt((n) => n + 1);
  setAttemptState("unattempted");
  setAlreadyDone(false);
  setStarted(true);
  ```
  `activityAttempt` is the existing remount key at [LessonModuleRunner.tsx:250](components/LessonModuleRunner.tsx:250), so bumping it gives a clean activity.
- [ ] On the merged `/lessons` page (1.1), each completed module card gets a small **Redo** affordance that routes to `/lessons/{moduleSlug}` and forces `index = 0`. Implement via a query param: `?restart=1`, read with `useSearchParams` in `LessonModuleRunner`; when present, skip the "resume at first incomplete" logic ([LessonModuleRunner.tsx:52-69](components/LessonModuleRunner.tsx:52)) and start at 0 with `reviewing = true`.

---

## Phase 2 — PlaygroundOS: the simulated computer

Everything here is in `components/Playground/`. These changes are felt in every unit, so they come before content work.

### 2.1 Dock icons from the user's artwork (feedback #4)

[components/Playground/FakeDesktop.tsx:41-52](components/Playground/FakeDesktop.tsx:41) currently mixes four PNGs (`icon-chat`, `icon-globe`, `icon-folder`, `icon-mail`) with six inline-SVG icons on colored rounded squares (`DockIconSvg`, [FakeDesktop.tsx:375-433](components/Playground/FakeDesktop.tsx:375)). It looks like two different operating systems.

- [ ] Once the asset arrives (0.1), give **all ten** apps an `icon` path in the `APPS` array. Delete `DockIconSvg` and `DOCK_ICON_STYLES` entirely.
- [ ] **Black and white only.** The user was explicit: do not tint, do not add colored backgrounds. No `bg-*` on the icon container, no CSS filters.
- [ ] **Rounded corners.** The icon element gets `rounded-2xl overflow-hidden` so the artwork is clipped to the squircle silhouette.
- [ ] Keep the `<Image fill sizes="56px" className="object-contain" />` pattern already used at [FakeDesktop.tsx:275](components/Playground/FakeDesktop.tsx:275).
- [ ] The four legacy `icon-*.png` files stay on disk (other components may reference them); just stop pointing the dock at them. Grep before deleting anything: `grep -rn "icon-chat\|icon-globe\|icon-folder\|icon-mail" components/ app/`.

### 2.2 The highlight ring is a squircle (feedback #20)

[FakeDesktop.tsx:270-272](components/Playground/FakeDesktop.tsx:270): `ring-4 ring-yellow-400 animate-pulse` on a `rounded-2xl` button. Tailwind's `ring` follows the border-radius, so it is *nearly* right — but the button is `w-14 h-14` while the artwork inside is `object-contain`, so the ring traces the square button box, not the icon.

- [ ] Make the ring hug the icon: put `rounded-2xl` **and** the ring on the same element that clips the image, and ensure the image fills it (`object-cover` if the source art is square-cropped, `object-contain` with a matching aspect otherwise).
- [ ] Soften the pulse — the current `animate-pulse` fades the whole icon to 50% opacity, which makes the art hard to see. Add a dedicated keyframe that pulses only the ring:
  ```ts
  "ring-pulse": {
    "0%, 100%": { boxShadow: "0 0 0 4px rgba(250,204,21,1), 0 0 0 8px rgba(250,204,21,0)" },
    "50%":      { boxShadow: "0 0 0 4px rgba(250,204,21,1), 0 0 0 12px rgba(250,204,21,0.45)" },
  },
  // animation: "ring-pulse": "ring-pulse 1.4s ease-in-out infinite",
  ```
  Apply `rounded-2xl animate-ring-pulse` instead of `ring-4 ring-yellow-400 animate-pulse`. The icon stays fully opaque and the glow radiates outward in the squircle shape.
- [ ] Use the identical treatment everywhere a dock icon is highlighted — grep `highlightApp` across `components/Playground/` and confirm `DesktopLaunch`, `DesktopFileExplorerTask`, `GuidedTroubleshootingTask`, and the older desktop tasks all route through `FakeDesktop`'s rendering rather than re-implementing the ring.

### 2.3 App-open animation (feedback #24)

The animation infrastructure exists — `animate-window-open` is defined in `tailwind.config.ts` and applied at [FakeDesktop.tsx:295-360](components/Playground/FakeDesktop.tsx:295).

- [ ] Verify it actually plays. The wrapper's className switches from `hidden` to `animate-window-open` in the same render; because the element was `display: none`, the animation *should* run on reveal — but confirm in the browser for each of the six built-in apps. If any app doesn't animate, the fix is to force a remount by including the open-state in the wrapper's `key`.
- [ ] **Add a dock-icon bounce on launch.** Real computers bounce the icon. Add:
  ```ts
  "dock-bounce": {
    "0%":   { transform: "translateY(0)" },
    "35%":  { transform: "translateY(-14px)" },
    "60%":  { transform: "translateY(0)" },
    "80%":  { transform: "translateY(-5px)" },
    "100%": { transform: "translateY(0)" },
  },
  // animation: "dock-bounce": "dock-bounce 0.55s ease-out 1",
  ```
  Track `launchingApp` state in `FakeDesktopInner`; set it in `openApp` ([FakeDesktop.tsx:132-144](components/Playground/FakeDesktop.tsx:132)) and clear it on a 550ms timeout. Apply `animate-dock-bounce` to that app's dock button.
- [ ] Slow `window-open` from `0.18s` to `0.24s` — at 180ms it currently reads as a flicker rather than a movement.

### 2.4 Status-panel close animation (feedback #8)

[FakeDesktop.tsx:219-251](components/Playground/FakeDesktop.tsx:219) mounts the WiFi / battery / calendar panels conditionally. `StatusPanel` has `animate-slide-down` on open ([FakeDesktop.tsx:451](components/Playground/FakeDesktop.tsx:451)) but closing just unmounts — it vanishes.

- [ ] Add the reverse keyframe:
  ```ts
  "slide-up-out": {
    "0%":   { opacity: "1", transform: "translateY(0)" },
    "100%": { opacity: "0", transform: "translateY(-8px)" },
  },
  // animation: "slide-up-out": "slide-up-out 0.16s ease-in both",
  ```
- [ ] Add `closingPanel` state alongside `openPanel`. `StatusPanel` gains a `closing?: boolean` prop and applies `animate-slide-up-out` when true. Route **all four** dismissal paths through one `dismissPanel()` helper that sets `closingPanel`, waits 160ms, then clears both:
  1. The `×` button ([FakeDesktop.tsx:455-462](components/Playground/FakeDesktop.tsx:455)),
  2. Clicking the desktop ([FakeDesktop.tsx:255](components/Playground/FakeDesktop.tsx:255)),
  3. Clicking the menu-bar button again ([FakeDesktop.tsx:198](components/Playground/FakeDesktop.tsx:198) and 201, 209),
  4. `openApp`, which clears the panel at [FakeDesktop.tsx:137](components/Playground/FakeDesktop.tsx:137).
- [ ] `CalendarPanel` renders through `StatusPanel`, so it inherits this for free — pass the prop through.

### 2.5 Hover states everywhere (feedback #51)

The menu-bar WiFi and battery buttons ([FakeDesktop.tsx:198-208](components/Playground/FakeDesktop.tsx:198)) have **no** hover style at all; the clock has only `hover:underline`. Nothing indicates they are clickable.

- [ ] Give all three menu-bar buttons a shared class: `rounded px-2 py-1 transition-colors hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer`. Drop the clock's `hover:underline` — the background change is the affordance.
- [ ] Add `aria-expanded={openPanel === "wifi"}` (etc.) to each, and an active style when its panel is open: `bg-black/10 dark:bg-white/15`.
- [ ] Sweep the rest of PlaygroundOS for click targets with no hover feedback. Confirmed missing on: the dock app **labels** (make the whole `<div>` at [FakeDesktop.tsx:266](components/Playground/FakeDesktop.tsx:266) the hover target so hovering the label affects the icon), the `StatusPanel` network rows (they have hover, verify it's visible against the connected-green row), and the `SettingsApp` sidebar items.
- [ ] Every interactive element also needs a visible **keyboard focus** ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`. Unit 2 teaches Tab navigation — the simulated OS must be tabbable or that lesson is a lie.

### 2.6 ONE Files app (feedback #21) — the largest single item in this plan

There are currently **two** file managers:

| | [Desktop/FilesApp.tsx](components/Playground/Desktop/FilesApp.tsx) (72 lines) | [GuidedFilesTask.tsx](components/Playground/GuidedFilesTask.tsx) (636 lines) |
|---|---|---|
| Layout | Flat list + preview pane | Sidebar (Home/Documents/Pictures/Downloads/Trash) + grid + toolbar + preview |
| Data | `FILLER_FILES` — 5 files, no folders ([filesData.ts](components/Playground/Desktop/filesData.ts)) | `makeItems()` — 12 items with folders and locations ([GuidedFilesTask.tsx:63-77](components/Playground/GuidedFilesTask.tsx:63)) |
| Features | Double-click to preview | Open, new folder, rename, drag-move, search, delete, restore, save |
| Used by | The dock in every `FakeDesktop`; Unit 1 double-click lesson; `EditFileTask` | Unit 3 onward |

The user's instruction is unambiguous: the elaborate one wins, everywhere, including the Unit 1 double-click activity.

- [ ] **Extract the presentational file manager** into `components/Playground/Desktop/FileManager.tsx`. Lift the entire UI out of `GuidedFilesTask` — sidebar, toolbar, item grid, preview pane, rename inline-editor, drag-and-drop with the blue drop-target highlight, search field, save dialog. It owns the filesystem state and exposes a callback-per-operation API:
  ```tsx
  interface FileManagerProps {
    items: Item[];
    onItemsChange: (items: Item[]) => void;
    location: Loc;
    onLocationChange: (loc: Loc) => void;
    /** Pulse-highlight a specific control — used by guided lessons. */
    highlight?: { kind: "item" | "sidebar" | "toolbar" | "folder"; target: string } | null;
    /** Which operations are available. Unit 1 passes {open: true} only. */
    enabled?: Partial<Record<"open" | "newFolder" | "rename" | "move" | "search" | "delete" | "restore" | "save", boolean>>;
    onOpen?: (item: Item) => void;
    onNewFolder?: (name: string) => void;
    onRename?: (item: Item, newName: string) => void;
    onMove?: (item: Item, into: Loc) => void;
    onSearch?: (query: string) => void;
    onDelete?: (item: Item) => void;
    onRestore?: (item: Item) => void;
    onSave?: (name: string, into: Loc) => void;
    /** Keyboard-only mode for the Unit 2 arrow-keys lesson (4.6). */
    keyboardNav?: boolean;
    selectedId?: string | null;
    onSelectedChange?: (id: string | null) => void;
  }
  ```
- [ ] **Move the filesystem into shared data.** Rewrite [Desktop/filesData.ts](components/Playground/Desktop/filesData.ts) to export the `Item` / `Loc` types and `makeItems()` (moved verbatim from [GuidedFilesTask.tsx:63-77](components/Playground/GuidedFilesTask.tsx:63)), plus `iconFor()` ([GuidedFilesTask.tsx:79-99](components/Playground/GuidedFilesTask.tsx:79)) and `LOC_TITLE` ([GuidedFilesTask.tsx:101-107](components/Playground/GuidedFilesTask.tsx:101)). Keep the old `FILLER_FILES` export as a deprecated alias **only** until every consumer is migrated, then delete it.
- [ ] **`GuidedFilesTask` becomes thin**: it keeps the step machine, `hl()`, `completeStep()`, flash, and `SimulatorFrame`; it renders `<FileManager … />` and maps each callback to `matchesStep`. Target: under 250 lines.
- [ ] **`Desktop/FilesApp.tsx` becomes thin**: renders `<AppWindow>` wrapping `<FileManager enabled={{open:true, newFolder:true, rename:true, move:true, search:true, delete:true, restore:true}} />` with local `useState` for items. The dock Files app is now the full file manager.
- [ ] **`DesktopFileExplorerTask`** ([DesktopFileExplorerTask.tsx](components/Playground/DesktopFileExplorerTask.tsx), the Unit 1 double-click activity) now opens the real Files app. It passes `enabled={{open: true}}` — a beginner practicing double-click should not be able to delete anything — and highlights each target file in turn. See 3.7.
- [ ] **`EditFileTask`** must use `FileManager` too. Grep for every consumer before you start:
  ```sh
  grep -rn "FilesApp\|FILLER_FILES\|filesData" components/ app/
  ```
- [ ] **Sidebar icons** (feedback #55, #56): once the assets land, `Pictures` uses `files-pictures.png` and `Downloads` uses `files-downloads.png` instead of the generic `FolderIcon` at [GuidedFilesTask.tsx:54-58](components/Playground/GuidedFilesTask.tsx:54). Wrap each in a bordered rounded box (`rounded border border-gray-300 overflow-hidden w-4 h-4`) as the user requested. Home / Documents / Trash keep their SVG icons.
- [ ] **Regression-test every Unit 3 lesson** after this refactor. All nine `guided-files` lessons (orders 300–380) must still complete. This is the highest-risk change in the plan — do it in its own commit, verify, then continue.

**Detailed migration order — do not deviate:**

1. **Start with `filesData.ts`** — add types and `makeItems()` first, keeping `FILLER_FILES` as a deprecated alias. This file has no JSX so it cannot break any renders.
2. **Create `FileManager.tsx`** as a new file. Copy the entire rendering section from `GuidedFilesTask.tsx` verbatim first, then refactor into the prop-driven shape above. Do not touch `GuidedFilesTask.tsx` yet. Build passes? Continue.
3. **Migrate `GuidedFilesTask.tsx`** to call `<FileManager />`. This is the only point where existing Unit 3 lessons could break. Test all nine lessons before touching anything else.
4. **Migrate `Desktop/FilesApp.tsx`** last — it is only used by the dock and Unit 1. Fewer consumers, easier rollback.
5. **Migrate `EditFileTask.tsx`** and `DesktopFileExplorerTask.tsx`. Both are small (under 100 lines each).

**Rollback gate:** After step 3, if any Unit 3 lesson breaks, revert `GuidedFilesTask.tsx` to the pre-refactor version and debug `FileManager.tsx` until all tests pass before re-attempting. The fallback is to keep `GuidedFilesTask.tsx` as-is and only migrate `FilesApp` — partial migration is acceptable as a checkpoint.

**The `enabled` prop is important:** Unit 1's double-click lesson passes `enabled={{ open: true }}` only. This means the toolbar's "New Folder", "Rename", and "Delete" buttons must be **absent** (not just disabled) when their flag is false — a disabled button is confusing to a beginner learning what double-click does. Use `enabled?.newFolder && <NewFolderButton />` rather than `disabled={!enabled?.newFolder}`.

**`AppWindow` wrapping in `FilesApp`:** The full dock Files app renders inside `AppWindow` (the draggable/resizable window frame). `FileManager` must accept a className or a `fullHeight` prop so it fills the window body rather than having its own height. The window's outer dimensions are controlled by `AppWindow`, not by `FileManager`.

**TypeScript guard:** After migration, run:
```sh
npx tsc --noEmit
grep -rn "FILLER_FILES" components/ app/   # must return nothing
grep -rn "import.*FilesApp" components/    # only GuidedFilesTask should remain (if it still uses it)
```

### 2.7 Settings app cleanup (feedback #16, #95, #96)

- [ ] **"Settings" appears twice.** [SettingsApp.tsx:100](components/Playground/Desktop/SettingsApp.tsx:100) renders a `Settings` heading inside the sidebar, while `FakeDesktop`'s menu bar already shows the app title from `APP_TITLES` ([FakeDesktop.tsx:194](components/Playground/FakeDesktop.tsx:194)). Delete the in-app heading at line 100.
- [ ] **Dark mode doesn't reach the WiFi and battery icons** (feedback #95). `WifiIcon` and `BatteryIcon` ([FakeDesktop.tsx:512-530](components/Playground/FakeDesktop.tsx:512)) hardcode `stroke="#111"` and `fill="#111"`. Change both to `stroke="currentColor"` / `fill="currentColor"` — the parent menu bar already sets `text-gray-100` in dark mode ([FakeDesktop.tsx:189](components/Playground/FakeDesktop.tsx:189)), so they will follow automatically. Check the `StatusPanel` bodies too: they use hardcoded light backgrounds (`bg-white`, `border-blue-200`) that stay white in dark mode.
- [ ] **The UI looks unprofessional next to Mail.** Study [Desktop/MailApp.tsx](components/Playground/Desktop/MailApp.tsx) — the user named it as the quality bar — and bring `SettingsApp` up to it: consistent `px-4 py-3` row padding, `divide-y divide-gray-200` between rows, section headers in `text-xs font-semibold uppercase tracking-wide text-gray-500`, a real two-column layout with a `w-52 border-r` sidebar, and setting descriptions in `text-sm text-gray-500` beneath each label rather than crammed alongside.
- [ ] **The About panel must not lie** (feedback #16). [SettingsApp.tsx:403-418](components/Playground/Desktop/SettingsApp.tsx:403) states "Memory 8 GB", "Storage 100 GB" — invented numbers a beginner may believe describe *their* computer.
  - Add a **purple banner** at the top of the About panel: `bg-purple-100 border-2 border-purple-400 text-purple-900 rounded-lg px-4 py-3 text-sm font-medium` reading: *"These are made-up numbers for practice. Your real computer's About page will show different information."*
  - Add the same banner to the **Storage** panel ([SettingsApp.tsx:316-380](components/Playground/Desktop/SettingsApp.tsx:316)), whose `INITIAL_STORAGE` values are equally invented.
  - Build one `<SimulatedDataBanner />` component in `SettingsApp.tsx` and use it in both places. Any future panel showing fabricated hardware data uses it too.

### 2.8 Fullscreen (F12) dock bug (feedback #33)

Reported: pressing F12 makes the dock move up with the viewport when it should stay put.

- [ ] Reproduce first. Open any lesson, press Start activity, press F12 (or click the fullscreen control in [components/LessonPlaygroundPane.tsx](components/LessonPlaygroundPane.tsx)), and watch the dock.
- [ ] Likely cause: the dock is `absolute bottom-4 left-1/2` ([FakeDesktop.tsx:264](components/Playground/FakeDesktop.tsx:264)) inside `.relative.flex-1` ([FakeDesktop.tsx:255](components/Playground/FakeDesktop.tsx:255)). When the browser enters fullscreen, the `:fullscreen` element's box changes and the ancestor chain's height resolution changes with it. If an ancestor is sized by content rather than `100%`, the dock's `bottom-4` anchors to the wrong box.
- [ ] Fix by guaranteeing the height chain is explicit from the fullscreen element down: the fullscreened container gets `h-full`, and every wrapper between it and `FakeDesktop` gets `h-full min-h-0`. Add a `:fullscreen` rule in `app/globals.css`:
  ```css
  :fullscreen { height: 100%; width: 100%; }
  :fullscreen .playground-root { height: 100%; }
  ```
  and put `playground-root` on the outer div of `LessonPlaygroundPane`.
- [ ] Verify in both states, at both viewport sizes, in all three of: idle desktop, an open app, and a `DesktopLaunch` banner + desktop.

### 2.9 Loading delays for realism (feedback #66)

Pages appear instantly in the simulated browser; real ones don't.

- [ ] In `GuidedBrowserTask`, add `loading: boolean` state. `navigate()` sets it true, then false after **250ms** (the user said ~100ms; 250 reads as a real page load without feeling slow — tune in the browser).
- [ ] While loading: the tab favicon becomes a spinner, the reload button becomes a `×` (stop), and the page body shows a thin indeterminate progress bar under the address bar (`h-0.5 bg-blue-500` with a translate animation). **Do not** blank the content — a white flash is worse than no animation.
- [ ] Suppress the delay when a step is being auto-completed programmatically, so step timing stays deterministic.
- [ ] Apply the same treatment to the reload flow (6.7) so a reload visibly *does* something.

---

## Phase 3 — Unit 1: Meet Your Laptop

Reference the lesson table: orders 1–26. Slugs must not change.

### 3.1 Trackpad module moves to the front (feedback #18)

Cursor control is the prerequisite for every other lesson, but "Using the Trackpad" currently sits at orders 12–16, after eight parts lessons and two power lessons.

- [x] Renumber so **Using the Trackpad runs first**, then What is a computer?, then the rest:
  - `trackpad-cursor-and-click` 1, `trackpad-double-click` 2, `trackpad-right-click` 3, `trackpad-two-finger-scroll` 4, `trackpad-pinch-zoom` 5
  - `computer-parts-screen` 10, `-keyboard` 11, `-trackpad` 12, `-speakers` 13, `-camera` 14, `-power-button` 15, `-charger` 16, `-ports` 17, `computer-parts-review` 18
  - `sleep-laptop` 20, `restart-laptop` 21
  - `screen-desktop` 30, `screen-dock` 31, `screen-menu-bar` 32, `screen-clock` 33, `screen-wifi-icon` 34, `screen-battery-icon` 35
  - `apps-opening` 40, `apps-closing` 41, `apps-closing-vs-quitting` 42
  - `working-with-windows` 50
- [x] **Update the Unit 1 range in `CLAUDE.md`** (currently `1`–`26`) to `1`–`50`.
- [x] Run `python3 scripts/check-lessons.py` — it asserts unique orders.

### 3.2 Trackpad + mouse (feedback #6)

`computer-parts-trackpad.json` and the whole Using the Trackpad module speak only of trackpads. Many learners use a mouse.

- [x] Rewrite `computer-parts-trackpad.json`'s `drDigitalIntro` to cover both: what a trackpad is, what a mouse is, that they do the same job, and the mapping — one finger tap = left click; two-finger tap or right side of the mouse = right click; two-finger drag = scroll wheel; pinch = Ctrl + scroll wheel.
- [x] In every one of the five trackpad lesson JSONs, phrase instructions to serve both: *"Tap the trackpad once (or click the left mouse button)"*, *"Two-finger tap the trackpad, or click the right mouse button"*, *"Drag two fingers on the trackpad, or roll the mouse wheel"*.
- [x] Consider retitling the module `"Using the Trackpad or Mouse"`. **Careful:** the module name is the URL slug via `slugifyModule()` ([lib/lessons.ts:295-300](lib/lessons.ts:295)), so this changes the route from `/lessons/using-the-trackpad` to `/lessons/using-the-trackpad-or-mouse`. Module slugs are not stored in progress (only lesson slugs are), so this is safe — but you must change `module` in **all five** files identically or the module will split in two.

### 3.3 Power button lesson → image, no playground (feedback #10)

- [x] `computer-parts-power-button.json`: keep `"playgroundTask": {"type": "none"}` and add media field.
- [x] Expand the intro to the 4–6 bullet standard.

### 3.4 Charger lesson → image, no playground (feedback #11)

- [x] Same treatment for `computer-parts-charger.json` with `/playgrounds/charger.png`.
- [x] Intro expanded.

### 3.5 Camera lesson: external cameras, no playground (feedback #9)

- [x] `computer-parts-camera.json`: rewritten to cover built-in and external cameras, added "can't turn on your real camera from these lessons" note.

### 3.6 Sleep lesson: no playground (feedback #14)

- [x] `sleep-laptop.json` expanded intro.
- [ ] Verify in the browser that the right pane is gone and text is centered (depends on 1.9).

### 3.7 Double-click lesson uses the real Files app (feedback #21, #53)

Depends on 2.6.

- [ ] `trackpad-double-click.json` keeps `type: "file-explorer-open"`. `DesktopFileExplorerTask` now renders the unified `FileManager` with `enabled={{open: true}}`.
- [ ] Replace the yellow `filesHint` string ([DesktopFileExplorerTask.tsx:35](components/Playground/DesktopFileExplorerTask.tsx:35)) with a proper `SimulatorFrame` banner listing the files, and **highlight the next target file** with the standard pulse so the learner knows where to aim.
- [ ] **Opening a file must open a window** (feedback #53). Today the preview appears in a side pane. Instead, open a real `AppWindow` over the file manager with the file's contents and a working close button, so the learner practices open → read → close → open the next one. This is exactly what feedback #53 asks for in Unit 3 as well — build it once in `FileManager` and both units get it.
- [ ] Update `filesToOpen` in the JSON to files that exist in the unified `makeItems()` set — `GroceryList.txt`, `VacationPhoto.png`, `Budget.xlsx`.

### 3.8 Right-click lesson fixes (feedback #22)

- [x] **(a)** Tab switching re-enabled after completion via `onTabClick` prop on `BrowserSimulator`.
- [x] **(b)** Window controls restored (`showControls={true}`).
- [x] **(c)** New tab URL shows `petnews.example/judgementalcat`, title updated.

### 3.9 Two-finger scroll: stop the blinking cursor (feedback #26)

- [x] On success: blur, readOnly, green styling applied.

### 3.10 Rename the pinch-zoom lesson (feedback #27)

- [x] `trackpad-pinch-zoom.json` title changed to `"Zoom In and Out"`. Intro updated for both gestures.

### 3.11 Falling-shapes game cleanup (feedback #18)

- [x] **(a)** SVG shapes (ShapeTriangle/Square/Pentagon/Hexagon/Circle) in `Icons.tsx`, SHAPE_COMPONENTS map in `ShapeClickGame.tsx`.
- [x] **(b)** `chrome={false}` prop added to `SimulatorFrame`, applied to `shape-click-game` and `match-parts`.

### 3.12 Restart lesson gets a real activity (feedback #17)

`restart-laptop.json` is `type: "none"`. The user wants: the desktop throws an error, the learner opens Settings and restarts.

- [ ] This is the `guided-troubleshooting` type with a new scenario. Add `"error-restart"` to the `scenario` values in [lib/lessons.ts:226](lib/lessons.ts:226) and handle it in [components/Playground/GuidedTroubleshootingTask.tsx](components/Playground/GuidedTroubleshootingTask.tsx) alongside the existing `frozen-notes` / `frozen-browser` / `no-wifi` / `error-code`.
- [ ] Scenario behavior:
  1. On mount, a system error dialog appears over the desktop: *"Something went wrong. Restarting your computer usually fixes this."* with an **OK** button.
  2. New step actions (add to the union at [lib/lessons.ts:230-234](lib/lessons.ts:230)): `dismiss-error`, `open-settings`, `click-restart`, `confirm-restart`.
  3. Learner dismisses the dialog, opens Settings from the dock, finds **Restart** (add a Restart button to the SettingsApp About panel — it belongs there and reinforces 2.7), clicks it, confirms in a dialog.
  4. **Show the restart happening**: black screen for ~1.5s, then the desktop fades back in with the error gone. Proof the fix worked — that is the pedagogy pattern (problem → explanation → fix → visible result).
- [ ] Rewrite `restart-laptop.json` as `guided-troubleshooting` with `scenario: "error-restart"`, `launchApp: "settings"`, and 4 steps.
- [ ] **Document the new scenario and its four actions in `CLAUDE.md`.**

### 3.13 Dock lesson: open and close apps (feedback #28)

- [x] `screen-dock.json` converted to `guided-desktop`. `open-app`/`close-app` actions added to `GuidedDesktopTask` and `lib/lessons.ts`. Mini dock with 4 apps (Notes, Browser, Files, Messages), pulsing ring on target app, window title tracks opened app.
- [x] Steps: open Notes → close → open Browser → close.

### 3.14 Menu bar lesson: point at their real computer (feedback #29)

- [x] `screen-menu-bar.json` and `screen-desktop.json` both updated with "look at your own screen" CTA.

### 3.15 Clock, WiFi, and battery lessons get activities (feedback #30)

All three are `type: "none"`. Each should make the learner open that exact panel in PlaygroundOS.

- [ ] These are menu-bar panels, not apps, so `guided-desktop` needs three more actions: `open-clock`, `open-wifi-panel`, `open-battery-panel`. (`open-wifi-panel` already exists in `guided-troubleshooting` — mirror its implementation.)
- [ ] `screen-clock.json` → `guided-desktop`, 2 steps: click the time in the menu bar; read today's date and close the panel.
- [ ] `screen-wifi-icon.json` → `guided-desktop`, 2 steps: click the WiFi icon; see which network is connected (the checkmark), then close.
- [ ] `screen-battery-icon.json` → `guided-desktop`, 2 steps: click the battery icon; read the percentage, then close.
- [ ] The battery panel already handles the no-Battery-API case gracefully ([FakeDesktop.tsx:244-248](components/Playground/FakeDesktop.tsx:244)) — keep that.
- [ ] Requires 2.4 (close animation) so the "then close it" step has visible feedback.

### 3.16 Opening apps: any four (feedback #31)

- [x] `OpenAllAppsTask` now accepts `targetCount` (default 4), counts ANY unique apps opened, shows live counter.
- [x] `apps-opening.json` updated to `targetCount: 4`.
- [ ] Fix the underlying defect: all 10 dock icons open something (photos, app-market, calendar, reminders currently no-op outside guided lessons).

### 3.17 Closing apps: practice, not theory (feedback #32)

- [x] `apps-closing.json` converted to `guided-desktop` with a single `close` step. Window starts open; learner closes it with the red X.

### 3.18 Closing vs quitting: needs an activity (feedback #34)

- [x] `apps-closing-vs-quitting.json` converted to `guided-desktop`: minimize → restore from dock → close.

---

## Phase 4 — Unit 2: Keyboard and Typing

The theme of this phase: **stop simulating apps we already built.** Typing lessons currently run inside `SimulatorFrame` shells labeled "Notes" ([LessonPlaygroundPane.tsx:74-94](components/LessonPlaygroundPane.tsx:74)) rather than inside the real `NotesApp`, `MailApp`, or `MessagingApp`.

### 4.1 Delete redundant lessons (feedback #35, #43, #48)

- [ ] Delete `content/lessons/kb-space.json` (order 202). Typing "hello dr digital" in `kb-letters` already exercises the space bar.
- [ ] Delete `content/lessons/typing-basics.json` (order 220, "Cursor, insertion point, and fixing mistakes"). The user calls it useless; `kb-delete` and `selecting-text` cover the ground.
- [ ] Delete `content/lessons/email-thank-you.json` (order 270, "Say thanks over email"). Duplicates `kb-typing-test`, which becomes the real mail-app lesson in 4.2.
- [ ] Deleting lessons is safe (only *renaming* slugs breaks progress). After deleting, the "Typing Basics" module has zero lessons and disappears from the catalog automatically — verify that `getLessonsGrouped()` doesn't leave an empty module heading.

### 4.2 Typing practice in the real Mail app (feedback #36)

`kb-typing-test.json` uses `compose-email`, rendered by `ComposeEmailTask` — a bespoke component, not the real mail client.

- [ ] Convert to `guided-email` with `launchApp: "mail"` so it goes through `DesktopLaunch` → learner opens Mail from the dock → composes in the same `GuidedEmailTask` UI as Unit 6.
- [ ] Steps: `compose` → `set-to` → `set-subject` → `set-body` → `send`. The body text is the typing exercise.
- [ ] Once `email-thank-you` is deleted (4.1) and this is converted, check whether `ComposeEmailTask.tsx` has any remaining consumers; if not, delete it and its `compose-email` union member. Grep first.

### 4.3 Command / Control: one lesson, not two (feedback #37)

`kb-command` (208, "Shortcut Keys (Ctrl / Command)") and `kb-control` (209, "Control") overlap almost entirely.

- [ ] Merge into `kb-command` and delete `kb-control.json`. The merged intro explains: these are *modifier* keys; which one your computer uses depends on the machine; the same shortcut is written `Ctrl+C` or `Cmd+C` and means the same thing; hold the modifier, tap the letter, release both.

### 4.4 Tab lesson activity (feedback #39, #47)

`kb-tab.json` is `type: "none"`. The user referenced a design named `TabActivityIdea` that is not in the repo.

**`TabActivityIdea.png` has arrived** — it shows a browser page at `pickacolor.example` with three large colored circles (red, green, blue) and the task: *"Can you click on the following colors in order using just the enter, Tab, and Shift + Tab keys?"* followed by the sequence: `red, green, blue, green, red, blue, green, red, blue, red`. This is the design. Build it as a page inside `GuidedBrowserTask` rather than a standalone component.

- [ ] **Add `pickacolor.example` to `PAGES`** in `GuidedBrowserTask.tsx`:
  - Three focusable `<button>` elements: `id="btn-red"`, `id="btn-green"`, `id="btn-blue"` — large circles (96px, `rounded-full`) in saturated red, green, and blue.
  - A sequence display at the bottom: the target sequence as a comma-separated list, with the current item **highlighted** (bold, or circled).
  - Pressing Enter on the focused button checks whether it matches the current item in the sequence; correct moves the sequence forward; wrong shows a gentle nudge; completing all 10 completes the step.
  - Tab moves focus right (red → green → blue → red), Shift+Tab moves left. `tabIndex` must be set correctly. The currently focused button shows a visible `outline: 4px solid #1d2733`.
  - This page is **only accessible** from the `guided-browser` step — it does not appear in the browser's "new tab" page or history by default.
- [ ] New `guided-browser` step action: `tab-sequence` — `{ action: "tab-sequence", page: "pickacolor.example" }`. Completes when all 10 items in the sequence are clicked correctly.
- [ ] **Two lessons, in order** (feedback #47):
  - `kb-tab` (order 211): mechanic only — Tab moves forward in a form, Shift+Tab moves back. Use the existing `keyboard-nav-game` (`KeyboardNavTask.tsx`) which already does this. 
  - **New lesson** `kb-tab-practical` (order 212, same module): navigate to `pickacolor.example` and complete the color sequence using only Tab/Enter. The payoff — Tab is useful, not just for skipping fields.
- [ ] Renumber `kb-arrow-keys` to 213 and `kb-doggo` to 214 to make room. Update `CLAUDE.md`'s Unit 2 range if the top changes.
- [ ] **Document `tab-sequence` in `CLAUDE.md`.**

### 4.5 Return key activity, and the warning-banner pattern (feedback #38, #40)

- [ ] `kb-return.json` → `type-text` requiring a **two-line** entry, so pressing Return is unavoidable. Validate with `mustInclude` containing both lines. Pair it with the Unit 2 mail lesson conceptually: Return makes a new paragraph in a document, but *sends* the message in some chat apps — name that trap explicitly.
- [ ] **Warning-banner pattern** (feedback #38) for keys that must not be pressed here: Escape (`kb-escape`) and the Ctrl+Q warning in `apps-closing`.
  - Add `warning?: string` to the `Lesson` interface in [lib/lessons.ts:264-275](lib/lessons.ts:264).
  - Render it in `LessonModuleRunner` **above** the `DrDigital` bubble: `border-2 border-amber-400 bg-amber-50 text-amber-900 rounded-lg px-4 py-3 font-medium` with a `WarningIcon` from `Icons.tsx`.
  - `kb-escape.json` gets: `"warning": "Don't press this key right now — it can close what you're working on. Just read along. You'll find Escape in the very top-left corner of your keyboard."`
  - **Document `warning` in `CLAUDE.md`.**

### 4.6 Arrow keys: navigate real files, mouse forbidden (feedback #41)

Depends on 2.6.

- [ ] `kb-arrow-keys.json` → a new activity that renders the unified `FileManager` with `keyboardNav: true`:
  - Arrow keys move the selection between items in the grid.
  - Enter opens the selected item.
  - **Click handlers are disabled** while `keyboardNav` is on. Clicking shows an inline nudge: *"Use the arrow keys for this one — no clicking!"* Do not fail the lesson; just refuse and explain.
- [ ] Express it as a `guided-files` lesson with a new step action `arrow-select` (`target`: filename) plus the existing `open-file`. Add `keyboardOnly?: boolean` to the `guided-files` task type.
- [ ] **Document both in `CLAUDE.md`.**

### 4.7 Doggo challenge in the real Messages app (feedback #42)

`kb-doggo.json` is `type: "type-text"` — a bare text box wrapped in a "Notes"-labeled frame. It is supposed to be a conversation.

- [ ] Convert to `guided-messaging` with `DesktopLaunch` to Messages. Steps: `select-contact` (target: a dog contact) → `send-message` with the required `value`.
- [ ] The four hardcoded contacts are Alex, Jordan, Sam, Grandma. Add **Doggo** as a fifth in `GuidedMessagingTask.tsx` with the existing `animal-dog.png` avatar and the seeded incoming message *"I'm hungry. Can you give me food?"*.
- [ ] `send-message` matching is case-insensitive `contains` on `step.value` — confirm the required reply text works with that, and that a mismatch produces the inline nudge rather than silent failure (that behavior was built in QA round 3; verify it survived).
- [ ] Once `message-reply` has no remaining consumers, remove it from the union and delete the branch in `LessonPlaygroundPane`. Grep first.

### 4.8 Split copy/paste from undo/redo (feedback #44)

`editing-copy-paste.json` (240) crams five shortcuts into one lesson.

- [ ] Narrow it to **copy, cut, paste** (keep the slug, keep order 240). Retitle *"Copy, Cut, and Paste"*.
- [ ] New lesson `editing-undo-redo` (order 242, same Editing module): Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z (or Ctrl+Y) redoes. Activity in the real Notes app: type a sentence, undo it, redo it. See 4.9 for the shared component.

### 4.9 Bold / italic / underline, and every shortcut, gets an activity (feedback #45, #46)

`text-formatting.json` (245) is `type: "none"`. `keyboard-shortcuts-pattern.json` (250) is `type: "none"`.

This is a **new playground type** — follow the "Adding a New Playground Type" checklist in CLAUDE.md: add the union member, build the component, add a checker, wire it in `LessonPlaygroundPane`. This section documents the specifics.

- [ ] **Step 1: Add to `lib/lessons.ts`** — new union member:
  ```ts
  | {
      type: "notes-shortcut";
      goal: string;
      steps: Array<{
        say: string;
        action: "type" | "select-all" | "bold" | "italic" | "underline" | "copy" | "cut" | "paste" | "undo" | "redo";
        value?: string;   // required for "type", "paste"
      }>;
    }
  ```
- [ ] **Step 2: Add `contentEditable` to `NotesApp`** — `NotesApp` currently renders `<textarea>`. Replace with:
  ```tsx
  <div
    ref={editorRef}
    contentEditable
    suppressContentEditableWarning
    className="flex-1 p-4 text-base leading-relaxed outline-none"
    onKeyDown={handleKeyDown}
  />
  ```
  `document.execCommand("bold")` / `"italic"` / `"underline"` work in all modern browsers even though deprecated — they are the only way to bold in a `contentEditable` without a dependency. `execCommand("undo")` handles undo/redo. Call `e.preventDefault()` on every intercepted shortcut so the browser's native handler doesn't interfere. Text content is read via `editorRef.current.innerHTML` for validation.

- [ ] **Step 3: Build `GuidedNotesTask.tsx`** — a thin wrapper that:
  - Renders `NotesApp` inside `SimulatorFrame` with the step banner.
  - Maintains `stepIndex` state.
  - On each `type` step: validates `editorRef.current.textContent.includes(step.value)`.
  - On each formatting step (`bold` / `italic` / `underline`): listens for the matching `keydown` event (Cmd/Ctrl+B/I/U) and calls `completeStep()` after `execCommand` fires.
  - On `select-all`: listens for Cmd/Ctrl+A.
  - On `copy` / `cut` / `paste`: listens for Cmd/Ctrl+C/X/V respectively.
  - On `undo` / `redo`: listens for Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z.
  - **Toolbar-click nudge:** if the bold/italic/underline toolbar button is clicked when the current step is a shortcut action, show a 2-second inline toast: *"Nice — that works! For this lesson, try the keyboard shortcut."* Do not advance the step.
  - All steps include a `say` instruction and the pulsing-yellow highlight ring on the relevant key (shown in the static keyboard diagram, if present, or in a legend next to the banner).

- [ ] **Step 4: Add to `TaskChecker.ts`** — pure function `checkNotesShortcut(stepAction, event): boolean`:
  ```ts
  export function checkNotesShortcut(action: string, e: KeyboardEvent): boolean {
    const mod = e.metaKey || e.ctrlKey;
    switch (action) {
      case "bold":       return mod && e.key === "b";
      case "italic":     return mod && e.key === "i";
      case "underline":  return mod && e.key === "u";
      case "select-all": return mod && e.key === "a";
      case "copy":       return mod && e.key === "c";
      case "cut":        return mod && e.key === "x";
      case "paste":      return mod && e.key === "v";
      case "undo":       return mod && !e.shiftKey && e.key === "z";
      case "redo":       return mod && e.shiftKey && e.key === "z";
      default:           return false;
    }
  }
  ```

- [ ] **Step 5: Wire in `LessonPlaygroundPane.tsx`** — add to the import list and dispatch block:
  ```tsx
  import GuidedNotesTask from "@/components/Playground/GuidedNotesTask";
  // ...
  {task.type === "notes-shortcut" && (
    <DesktopLaunch app="notes">
      <GuidedNotesTask goal={task.goal} steps={task.steps} onResult={onResult} />
    </DesktopLaunch>
  )}
  ```

- [ ] Convert `text-formatting` (bold/italic/underline), `keyboard-shortcuts-pattern` (select-all → copy → paste), and `editing-undo-redo` (from 4.8) to this type.
- [ ] **Document `notes-shortcut` fully in `CLAUDE.md`** — schema, actions table, and `LessonPlaygroundPane` wiring, per "Adding a New Playground Type".

### 4.10 Birthday invitation in the real Files app (feedback #49)

`invitation-exercise.json` (280) uses `edit-file` → `EditFileTask`, which the user calls "the bs prototype" and "super ugly."

- [ ] After 2.6, `EditFileTask` renders the unified `FileManager`. The flow becomes: learner opens Files from the dock → navigates to Documents → double-clicks `PartyInvitation.txt` → it opens in a real editor window → they fix it → Save → the window closes and the file list shows the updated file.
- [ ] **Fix the ugliness.** The editor window gets: a proper `AppWindow` title bar with the filename, a monospace-free readable body font at a comfortable size (`text-base leading-relaxed p-6`), a real **Save** button in the window (not floating below), and the validation feedback panel styled as a proper inline card rather than raw text.
- [ ] Keep the QA-round-3 improvements: `normalize()` for curly quotes, `checkTextEditDetailed()` feedback listing which specific misspellings remain, and the "Show me an example" panel. Verify they still work after the refactor.

### 4.11 Messy-email cleanup in the real Mail app (feedback #50)

`email-assessment.json` (290) is `type: "edit-text"` — editing an *email* inside a *Notes* frame, and never sending it.

- [ ] Convert to `guided-email`. Learner opens Mail → opens a saved draft containing the messy text → fixes it → **sends it**. Sending is the point; an email you never send isn't an email lesson.
- [ ] This requires `GuidedEmailTask` to support opening a **draft** with pre-filled body text. Add a `seedDraft?: { to: string; subject: string; body: string }` field to the `guided-email` task type, and a Drafts folder entry when present. **Document it in `CLAUDE.md`.**
- [ ] Note the module is called "Real-Life Exercise" and this file is named `email-assessment` — it is *not* the Unit 2 assessment. See 15.2 for the actual Unit 2 assessment, which does not exist yet.

---

## Phase 5 — Unit 3: Files and Folders

### 5.1 Opening a file opens a window (feedback #53)

- [ ] Covered by 3.7's `FileManager` change — opening an item raises a real closable window. Verify the Unit 3 lessons benefit: `file-what-is` (300) explicitly teaches "what happens when you open a file," and its two steps should now be open → read → close → open another.
- [ ] Update `file-what-is.json` steps and intro to describe the window: it has a title bar with the file's name, and the × closes it without deleting anything.

### 5.2 TaxReturn is already in the destination folder (feedback #57) — bug

See Appendix C. In `makeItems()` ([GuidedFilesTask.tsx:63-77](components/Playground/GuidedFilesTask.tsx:63)), `taxreturn` starts at `loc: "home"`. Some lesson asks the learner to move it into a folder where it appears to already be, or deletes/restores it in a way that leaves it misplaced for the next lesson.

- [ ] Reproduce by walking all nine Unit 3 lessons in order in one browser session. Each `guided-files` lesson calls `useState(makeItems)` so state resets per lesson — meaning the bug is a **content** bug: a lesson's steps contradict the initial state.
- [ ] Audit every `move` / `delete` / `restore` step in `creating-folders`, `moving-files`, `searching-files`, and `trash-delete` against `makeItems()`. Fix the JSON so no step is a no-op on arrival.
- [ ] Add a guard in `GuidedFilesTask`: when a step activates and the state already satisfies it, auto-complete without a flash. This makes content mistakes self-healing (it was Phase 1.6 in the previous round and was never implemented — implement it now).

### 5.3 / 5.4 Sidebar icons for Pictures and Downloads (feedback #55, #56)

- [ ] Covered by 2.6's sidebar bullet. Keep these as separate checkboxes so the blocked state is visible.

### 5.5 The apple-pie recipe must actually open (feedback #58, #63)

`recipes` page in `GuidedBrowserTask` has `download: "ApplePieRecipe.pdf"` ([GuidedBrowserTask.tsx:69](components/Playground/GuidedBrowserTask.tsx:69)). You can download it; you can never open it. `pdfs-reading` (1280) is supposed to teach exactly this.

- [ ] Add an `open-download` step action to the `guided-browser` type ([lib/lessons.ts:104-129](lib/lessons.ts:104)).
- [ ] Clicking a file in the Downloads panel opens a **PDF viewer window** rendering a real-looking recipe: title, ingredient list, numbered steps, page 1 of 2, and working zoom controls. It does not have to be a real PDF — it has to *look and behave* like opening one.
- [ ] Wire it into `pdfs-reading` (1280) and any Unit 4 lesson that downloads it.
- [ ] **Document `open-download` in `CLAUDE.md`.**

---

## Phase 6 — Unit 4: The Internet and Browsing

The recurring complaint: **the same three websites over and over**, and several controls that don't work.

### 6.1 More websites (feedback #61, #63, #64)

`PAGES` ([GuidedBrowserTask.tsx:62-70](components/Playground/GuidedBrowserTask.tsx:62)) has 8 entries and lessons reuse `google.com`, `wikipedia.org`, and `recipebox.example` relentlessly.

- [ ] Add at least six more, each with a distinct look and a genuine reason to exist:
  | id | url | Purpose |
  |---|---|---|
  | `library` | `citylibrary.example` | Catalog search, opening hours — used by the maps/library lessons |
  | `busschedule` | `citytransit.example` | A timetable table — good for zoom and for scroll |
  | `garden` | `gardeningtips.example` | Long article — reading-list and scroll practice |
  | `petnews` | `petnews.example` | Ties to the Unit 1 right-click cat (3.8) |
  | `bank` | `firstbank.example` | Secure-site and login examples for Unit 10 |
  | `store2` | `bookshop.example` | A second shop, so shopping lessons aren't all `shop.example` |
- [ ] Each needs: `title`, `url`, `secure`, an icon from `Icons.tsx`, `kind`, and a `body` with **real content** — a few sentences of plausible page text, not lorem. Some get `ads`, `cookie`, `popup`, or `download` flags.
- [ ] Then **rewrite every Unit 4 lesson's `navigate` targets** so no site appears in more than two lessons. Spread them across `internet-vs-website`, `browser-vs-search`, `urls`, `domain-names`, `safari-tabs`, `safari-windows`, `safari-downloads`, `safari-bookmarks`, `reading-list`, `history-autofill`.
- [ ] **Update the site list in `CLAUDE.md`'s `guided-browser` schema section.**

### 6.2 Internet Basics is repetitive (feedback #59, #60)

`internet-vs-website` (400) and `browser-vs-search` (410) teach nearly the same thing, and both have the learner type `google.com` and `wikipedia.org` yet again.

- [ ] Rewrite `internet-vs-website` as concept-first with **one** short activity: visit a single site the learner has not seen (`citylibrary.example`). Intro covers: the internet is the network of connected computers; a website is one destination on it; the browser is the app that fetches it. Analogy: the internet is the road system, a website is a shop, the browser is your car.
- [ ] Rewrite `browser-vs-search` to genuinely contrast the two: type an address directly (goes straight there) vs type words in a search box (gives a list to choose from). Use `search` → `open-result` so the learner must actually open a result — that mechanic was added in QA round 3 and should be exercised here.
- [ ] `urls` (420) and `domain-names` (430): use new sites, and make `domain-names` actually about the domain — compare `.com` / `.org` / `.example`, and the difference between `citylibrary.example` and `citylibrary.example.evil-site.net`. That last point sets up Unit 10.

### 6.3 The browser must be maneuverable (feedback #62)

Reported at "Unit 4 2/8" — `safari-tabs`, the second lesson of the 8-lesson "Using the browser" module.

- [ ] Reproduce: which controls are dead during that lesson? Likely cause is `hl()`-gated handlers that no-op when the current step doesn't match. Per the free-play rule, **every control performs its real action always**; only *step completion* is gated. Audit every handler in `GuidedBrowserTask` for the `if (step?.action === X)` anti-pattern wrapping the state change instead of just the `completeStep()` call.
- [ ] Specifically confirm these work at any time: back, forward, new tab, close tab, switch tab, address bar, reload, zoom in/out, bookmarks, history, downloads, reading list.

### 6.4 Reload must visibly work (feedback #64, #67)

The broken-page mechanic exists from QA round 3 but is reported as inconsistent.

- [ ] Reproduce in `refresh-reload` (495). The `reload` step only completes when it actually fixes a broken page — verify the seeding logic marks the right page broken, and that the broken state renders visibly (gray placeholder, scrambled text, "This page didn't load correctly").
- [ ] Combine with 2.9: reload shows a spinner for ~400ms, then the fixed page. The learner watches it repair itself.
- [ ] The user wants "the massive lesson complete popup" after seeing it work — that is the standard celebration overlay from 1.5/1.6. Confirm it fires here.

### 6.5 Zoom must actually work (feedback #68)

`zooming-webpages` (496), reported broken at "8 of 8".

- [ ] Verify both `−` and `+` are real buttons at all zoom levels (a previous round found `−` was a dead `<span>`; confirm the fix held).
- [ ] Verify the `news` page's `finePrint` renders at `text-[8px]` and becomes readable at ≥150%, and that the "Now you can read this!" confirmation appears.
- [ ] Verify the `zoom-in` step completes at ≥150% and that zoom **persists** across navigation within the lesson, like a real browser.
- [ ] Use `citytransit.example` (a dense timetable) as a second zoom target — small tabular text is the most realistic reason to zoom.

### 6.6 Cookies lesson art (feedback #70)

- [ ] `cookies.json` (492): render `cookie.png` in the cookie-consent banner inside `GuidedBrowserTask`, replacing the `CookieIcon` SVG. Size it ~48px, left of the banner text.

### 6.7 Online Safety auto-fail bug (feedback #71) — bug

Reported: the Unit 4 online-safety activity "automatically registers a fail because you have to click the thing to do the lesson."

- [ ] This is almost certainly `popups-ads` (493) or `popup-accident` (494). The **CLEAN NOW** button calls `onResult(false, …)` by design (teaching consequences), and ad clicks fail in assessment mode. If a lesson *instructs* the learner to click something that the fail-handler also catches, it fails instantly.
- [ ] Reproduce both lessons. Fix by scoping the fail: the ad-click failure must fire **only** when `mode === "assessment"`, and CLEAN NOW must not be the highlighted target of any step. If `popup-accident` seeds `SystemCleaner.exe` and asks the learner to delete it, verify the popup is not *also* live at that moment.

### 6.8 Unknown URLs get a helpful response (feedback #69)

Typing an address for a site that doesn't exist in `PAGES` currently does nothing.

- [ ] Add a fallback page: a friendly "This site isn't part of the practice computer" screen with the typed URL echoed back, an illustration, and the line: *"On your real computer, try typing this address in your own browser and see what you find!"*
- [ ] Plus a **Go back** button. This must never fail a lesson — it is a curiosity reward, not a mistake.

---

## Phase 7 — Unit 5: Messages and Video Calls

### 7.1 Lessons 1/5 and 2/5 are the same (feedback #73)

`messages-contacts` (500, 3 steps) and `messages-app` (510, 2 steps) both amount to "pick a contact and send a message."

- [ ] Make `messages-contacts` genuinely about **contacts**: browse the contact list, look at who's there, open a conversation *without* sending, note the difference between the list and a thread. No `send-message` step.
- [ ] `messages-app` becomes the first lesson where you actually send, and gets the favorite-animal message from 7.3.

### 7.2 Lesson 3/5 becomes group chats (feedback #74)

`group-conversations` (520) is titled for groups but its 2 steps are another 1:1 exchange.

- [ ] Build real group-chat support in `GuidedMessagingTask`: a group thread with 3+ participants, each message labeled with its sender's name and avatar, and a header showing the member list.
- [ ] Add step actions `create-group` (`value`: group name), `add-to-group` (`target`: contact), and `send-group-message`.
- [ ] Lesson steps: create a group → add two contacts → name it → send a message → see replies from two different people.
- [ ] **Document the new actions in `CLAUDE.md`.**

### 7.3 A message worth replying to (feedback #75)

- [ ] Seed one contact's thread with *"What's your favorite animal?"* and make `messages-app`'s send step accept **any** non-empty reply (no `value` constraint). Letting the learner answer freely is the whole point.

### 7.4 Emoji and reactions is repetitive (feedback #76)

`emoji-reactions` (540) repeats the reaction taught in `messages-photos` (530).

- [ ] Split cleanly: `messages-photos` covers **sending a photo** only — drop its reaction step. `emoji-reactions` covers **emoji in message text** (an emoji picker in the compose bar, which does not exist yet — build it) **and** reactions on a received message, which is then new material.
- [ ] The reaction-picker emojis stay as emoji — they are the feature being taught and are the documented exception to the no-emoji rule.

### 7.5 Video calls: we cannot see you (feedback #77)

- [ ] `facetime-basics` (550): add to the intro, prominently: *"This is a pretend video call. This website cannot turn on your real camera or microphone, and can't see or hear you. On a real call, your computer will ask for permission first — and you'll see a light next to your camera when it's on."*
- [ ] Label the self-preview tile in the call UI *"You (pretend)"* so it is unmistakable.

---

## Phase 8 — Unit 6: Email

### 8.1 Composing uses the real email UI (feedback #79)

`composing-email` (620) is the last `compose-email` lesson standing (4.2 converts the other one).

- [ ] Convert to `guided-email` via `DesktopLaunch` → Mail. Steps: `compose` → `set-to` → `set-subject` → `set-body` → `send`.
- [ ] After this, `compose-email` has zero consumers: delete `ComposeEmailTask.tsx`, remove the union member, remove the `LessonPlaygroundPane` branch, and remove it from the `CLAUDE.md` task-type table.

### 8.2 Composing 2/3 is buggy; step 3 of 8 has no success signal (feedback #80)

`reply-forward` (630, 8 steps).

- [ ] Walk all 8 steps in the browser and record exactly which one stalls. Step 3 of 8 is called out as having no clear success indication.
- [ ] Likely cause: a `set-body` / `set-subject` step that completes on blur or on send rather than on typing, so nothing happens as the learner types. Fix: complete text-entry steps **as soon as the required text is present in the field**, and flash the green per-step tick. Never require an extra click to "confirm" typing.
- [ ] Verify every step in every Unit 6 lesson gives visible feedback within ~200ms of the correct action.

### 8.3 CC/BCC registers on typing, and emails have bodies (feedback #81)

`cc-bcc` (640, 6 steps).

- [ ] Steps complete the moment the correct address is typed in the correct field, and the yellow highlight moves immediately to the next field.
- [ ] Add a `set-body` step — the current lesson sends an email with an empty body, which is exactly the bad habit feedback #26 flagged last round. Every `send` in the course must be preceded by a `set-body`.
- [ ] Audit **all** Unit 6 lessons for `send` without a preceding `set-body`.

---

## Phase 9 — Unit 7: Photos

### 9.1 Search button doesn't register (feedback #83, #84)

`photo-search` (702, 1 step) and `photo-people` (711, 3 steps) both use `search`.

- [ ] Reproduce: clicking the search icon does nothing measurable.
- [ ] Make `search` a **two-phase** step, matching the pattern used by `attach-photo` and `add-reaction`: phase 0 highlights the search **button** and completes on click (opening the search field); phase 1 highlights the **field** and completes when the query is typed.
- [ ] Update both lessons' `say` copy to match: *"Click the search icon"* then *"Type dog and press Enter."* The user explicitly asked for "say to type it in."

### 9.2 Two dog images (feedback #85)

- [ ] `photo-people` (711) surfaces two dog photos. The library has both `Dog.png` and `animal-dog.png` from the same source. Remove one from the photo library array in `GuidedPhotosTask.tsx` and give the survivor a distinct label. Check the whole 12-item library for other duplicates while you're there.

### 9.3 The bird photo must actually be bad (feedback #86)

`photo-editing` (720) says "fix this photo" but the bird renders normally, so the fix is invisible.

- [ ] Give library items optional `initialEdits`: `{ brightness?: number; contrast?: number; rotation?: number; saturation?: number }`, applied as the item's starting CSS filter/transform.
- [ ] Bird in Garden starts at `brightness: 55, contrast: 80, rotation: 90` — visibly dark **and** sideways.
- [ ] Rewrite `photo-editing`'s steps: rotate it upright → raise brightness → raise contrast → done. The before/after must be dramatic. Do **not** end with `revert` (which throws away the learner's work) — end with the fixed photo on screen.

### 9.4 Prove the share arrived (feedback #87)

`sharing-photos` (721) ends with a toast and no proof.

- [ ] After a successful share, show an **optional** banner in the sim: *"Want to see it arrive? Close Photos and open Messages."* with a **Show me** button that closes Photos and opens the Messages app with the shared photo visible in that contact's thread.
- [ ] Optional means optional: the lesson is already complete: this is free-play exploration after the celebration, not a required step.
- [ ] Requires the shared photo to actually be written into the messaging thread — use the `lac-chats` localStorage store that `MessagingApp` already reads.

---

## Phase 10 — Unit 8: Apps

### 10.1 Stop installing apps that are already installed (feedback #90, #92, #93) — bug

Three separate reports of the same root cause. `GuidedAppStoreTask` persists installs to `lac-sim-apps` and seeds state on mount ([GuidedAppStoreTask.tsx:205-213](components/Playground/GuidedAppStoreTask.tsx:205)). The seeding logic skips apps that have an `install` step *in the same lesson* — but it does not account for an app installed by an *earlier* lesson that a *later* lesson also asks you to install.

- [ ] Fix the seeding rule: when a lesson contains an `install` step for app X, **force X to be uninstalled at mount**, regardless of saved state. A lesson that teaches installing must always start from not-installed.
- [ ] Same for `delete-app`: force the app to be **installed** at mount so there is something to delete.
- [ ] Audit all six Unit 8 lessons plus `unit-8-assessment` against `BUILT_IN_APPS` ([GuidedAppStoreTask.tsx:159](components/Playground/GuidedAppStoreTask.tsx:159)) — never ask the learner to install an app that is on the built-in list.

### 10.2 Stop building everything around Puzzle Quest (feedback #91)

The catalog has 12 apps ([GuidedAppStoreTask.tsx:46-158](components/Playground/GuidedAppStoreTask.tsx:46)) and the lessons use Puzzle Quest for nearly everything.

- [ ] Assign each lesson a **different** app, chosen to fit what it teaches:
  | Lesson | App | Why |
  |---|---|---|
  | `app-store` (810) browse | Zen Garden | Nice detail page to look at |
  | `installing-apps` (820) | RecipeBox | Plain, free, uncontroversial |
  | `app-permissions` (830) | PhotoFun | Camera permission is genuinely needed |
  | `updating-apps` (840) | WeatherNow | Weather apps really do update constantly |
  | `deleting-apps` (850) | FlashLight | A trivial app you'd plausibly delete |
  | `free-vs-paid` (860) | Bubble Pop vs Zen Garden | Already the ads-vs-paid comparison |
  | `unit-8-assessment` (870) | NoteMaster / SketchPad | Apps untouched by any lesson |
- [ ] Verify each app's catalog entry (category, rating, reviews, tags) actually supports its lesson's point.

---

## Phase 11 — Unit 9: Settings

### 11.1 Dark mode reaches everything (feedback #95)

- [ ] Covered by 2.7. Verify by completing `display-theme` (920) and confirming the WiFi icon, battery icon, battery percentage, clock, all three status panels, and the dock labels all invert.

### 11.2 Settings UI quality (feedback #96)

- [ ] Covered by 2.7. Verify side by side against `MailApp`.

### 11.3 Assessment copy cleanup (feedback #97)

- [ ] `unit-9-assessment` (960) is `type: "none"` (an IRL checklist). Remove the line telling learners to skip trackpad sensitivity — that lesson was deleted in a previous round, so the reference is stale — and remove the stray text under the sixth numbered item.
- [ ] Then apply 15.1 to give Unit 9 a real assessment activity.

---

## Phase 12 — Unit 10: Online Safety and Security

The theme: **security tools are not websites.** `GuidedSecurityTask` renders inside a browser frame via `DesktopLaunch app="browser"` ([LessonPlaygroundPane.tsx:197-201](components/LessonPlaygroundPane.tsx:197)), which teaches the wrong mental model — you do not type your master password into a web page you found.

### 12.1 Passwords are not a website (feedback #98)

- [ ] `passwords-basics` (1000): the strength meter must **not** appear in a browser window. Render `GuidedSecurityTask`'s password section as a **standalone app window** (`AppWindow` titled "Password Checker") launched from the desktop, or as a plain full-pane tool with no browser chrome at all.
- [ ] **Concrete split strategy** — add a `chrome` prop to `GuidedSecurityTask`:
  ```tsx
  interface GuidedSecurityTaskProps {
    chrome: "browser" | "settings" | "mail" | "messages" | "bare";
    // ...
  }
  ```
  And update `LessonPlaygroundPane.tsx` lines 197-201 to read `task.chrome` and choose the wrapper:
  ```tsx
  {task.type === "guided-security" && (() => {
    const chrome = (task as any).chrome ?? "browser";  // default matches old behaviour
    const inner = <GuidedSecurityTask goal={task.goal} steps={task.steps} onResult={onResult} />;
    if (chrome === "browser")   return <DesktopLaunch app="browser">{inner}</DesktopLaunch>;
    if (chrome === "settings")  return <DesktopLaunch app="settings">{inner}</DesktopLaunch>;
    if (chrome === "mail")      return <DesktopLaunch app="mail">{inner}</DesktopLaunch>;
    if (chrome === "messages")  return <DesktopLaunch app="messages">{inner}</DesktopLaunch>;
    return inner;  // bare — full-pane, no desktop
  })()}
  ```
- [ ] **Per-lesson `chrome` values:**
  | Lesson | `chrome` | Why |
  |---|---|---|
  | `passwords-basics` (1000) | `"bare"` | Password strength is a local tool; no URL bar |
  | `password-managers` (1010) | `"browser"` | Logging into a site is a browser action |
  | `two-factor` (1020) | `"browser"` | The login form is in a browser |
  | `passkeys` (1030) | `"browser"` | Same login flow |
  | `scams-phishing` (1040) | `"mail"` | Phishing links come in email (see §12.4) |
  | `identity-theft` (1050) | `"messages"` | Smishing links come via text |
  | `safe-shopping` (1060) | `"browser"` | Shopping is a browser activity |
  | `public-wifi` (1070) | `"bare"` | Orchestrated separately (§12.7) |
- [ ] **Add `chrome` field to the `guided-security` union in `lib/lessons.ts`** and **document in `CLAUDE.md`**.

### 12.2 Show something after logging in (feedback #99)

Three lessons end on a button press with no visible result.

- [ ] `password-managers` (1010): after login, show a **logged-in account page** — a welcome header with the username, an account summary, and a Sign out button. Proof it worked.
- [ ] `two-factor` (1020): after **Verify**, show the same logged-in state plus a confirmation: *"Verified — you're signed in."*
- [ ] `passkeys` (1030): after **Sign in with passkey**, the fingerprint animation completes and the same logged-in page appears.
- [ ] Build one `<LoggedInPanel username={…} method={…} />` used by all three.

### 12.3 The phone looks odd (feedback #100)

- [ ] `two-factor`'s phone illustration needs work. Rebuild it: correct portrait aspect (~9:19.5), rounded corners `rounded-[2rem]`, a thin bezel, a small notch or pill camera cutout, a status bar with a time and battery, an SMS bubble styled like a real message app (gray bubble, sender name above), and the 6-digit code large and monospaced. Give the whole phone a subtle drop shadow so it reads as an object.

### 12.4 The phishing inspector is not a website (feedback #101)

- [ ] `scams-phishing` (1040) and `identity-theft` (1050): move the link inspector out of the browser. Present each item as what it actually is — an **email in the Mail app** or a **text in the Messages app** — and let the learner inspect the link there (hover/long-press reveals the true URL, exactly as on a real device).
- [ ] This is more realistic *and* reinforces Unit 5 and Unit 6. Requires `GuidedSecurityTask` to render inside `MailApp` / `MessagingApp` chrome for these sections.

### 12.5 Ad tracking lives in Settings (feedback #102)

- [ ] Add a **Privacy** section to `SettingsApp` with real toggles: *Allow websites to track me across sites* (off by default), *Block pop-up windows*, *Clear browsing data* (a button showing a confirmation).
- [ ] Move the ad-tracking teaching there. The relevant lesson becomes `guided-settings` instead of `guided-security`.

### 12.6 Online transactions out of the browser (feedback #103)

- [ ] `safe-shopping` (1060, "Shopping Safely Online"): the *checking* part (is this site secure? is this URL real?) legitimately happens in a browser and stays. But anything about **card details** must not be typed anywhere — replace with an inspection task: look at the lock, look at the URL, decide whether to proceed. Never simulate entering payment data, even fake data. That is a habit we must not build.

### 12.7 Public WiFi: a realistic end-to-end scenario (feedback #104)

`public_wifi` (1070) — the user wants a real situation, not a quiz.

- [ ] Rewrite as a cross-app scenario:
  1. The desktop starts with **no WiFi** — the browser shows the no-connection state (`NoConnectionIcon`, already built).
  2. Learner clicks the WiFi icon in the menu bar and sees the network list.
  3. They join *"Coffee Shop Free WiFi"* — a captive-portal page opens in the browser.
  4. The portal wants an email to connect. The lesson teaches: this is normal, but never enter a password you use elsewhere.
  5. Connected. Now open **Settings → Privacy** (12.5) and turn tracking off, because you are on a network you don't control.

**Implementation — use `guided-troubleshooting` with a new `public-wifi` scenario:**

The `guided-troubleshooting` component already orchestrates multi-app desktops and has the `scenario` prop system. Extend it:

- [ ] Add `scenario: "public-wifi"` to `GuidedTroubleshootingTask`. In this scenario, `FakeDesktop` boots with `wifiConnected: false` (pass a prop or use `SimThemeContext` — `SimThemeContext` already has `wifiConnected` state used by the no-connection browser state).
- [ ] Add four new step actions to the `guided-troubleshooting` union in `lib/lessons.ts`:
  ```
  "open-wifi-panel"  — already exists; use it to open the menu-bar WiFi list
  "join-network"     — new: clicks a specific network row in the panel; target: "Coffee Shop Free WiFi"
  "captive-portal-continue" — new: clicks the "Continue" button on the captive portal page in the browser
  "open-settings-privacy"   — new: opens Settings and navigates to Privacy section
  "toggle-privacy-tracking" — new: toggles the "Allow websites to track me" setting
  ```
- [ ] `join-network` step causes: the network shows "Connecting…" for ~1.5s, then "Connected"; `wifiConnected` in `SimThemeContext` becomes `true`; the browser's no-connection page reloads to the captive-portal page for `"Coffee Shop Free WiFi"` (a hardcoded page in `GuidedBrowserTask`'s `PAGES`, or a special render in the troubleshooting component).
- [ ] The captive-portal page has: a coffee-shop logo, a field for email (pre-filled with `you@example.com`), a "Continue" button, and a lesson-teaching note: *"You're entering your email — not a password. Safer networks don't need any info to connect."*
- [ ] After `captive-portal-continue`, the browser loads a "Connected! Welcome to Coffee Shop WiFi" page, and the lesson continues to Settings → Privacy.
- [ ] **Document the new `guided-troubleshooting` actions and the `public-wifi` scenario in `CLAUDE.md`.**

---

## Phase 13 — Unit 11: Troubleshooting

### 13.1 The Notes app must visibly work (feedback #106)

`troubleshooting-basics` (1110) force-quits a frozen Notes.

- [ ] After the restart step, Notes must **open for real** and be usable — the learner types in it to confirm it's alive. Right now the scenario ends the moment the app relaunches, so there is no proof of a fix.
- [ ] Add a final step: type something in the restored Notes.

### 13.2 Lesson 2/3 is a duplicate; make it delete-and-reinstall (feedback #107)

`software-problems` (1115) is the same force-quit flow as 1110 with Browser instead of Notes.

- [ ] Rewrite entirely as **delete and reinstall an app** — the real next escalation when force-quitting doesn't help:
  1. An app misbehaves (show it erroring).
  2. Open App Market → My Apps → delete it.
  3. Confirm it's gone from the dock.
  4. Reinstall it from the store.
  5. Open it and confirm it works.
- [ ] This spans `guided-troubleshooting` and `guided-app-store`. Either extend `guided-troubleshooting` with an `app-reinstall` scenario that can open App Market, or add the troubleshooting framing to `guided-app-store`. Prefer the former.

### 13.3 Delete the Unit 11 3/3 activity (feedback #108)

- [ ] `hardware-problems` (1120) is currently `guided-settings` (brightness slider). The user calls it "super stupid." Change to `type: "none"` and rewrite as a proper explainer: what counts as a hardware problem, the checks a person can safely do (cable seated, power, restart), and when to stop and get help. Rule 1.9 removes its playground.

### 13.4 Access issues: use the real Mail app (feedback #109)

`password-recovery` (1170, 6 steps) runs the whole password reset — including reading the reset email — inside the browser sim.

- [ ] Restructure to span two real apps: start in the browser (forgot password) → **open the Mail app from the dock** → open the real reset email there → click the link → back to the browser → set the new password → log in.
- [ ] After login, open a **new page** showing the logged-in account (reuse `LoggedInPanel` from 12.2).

**Implementation — use `guided-troubleshooting` with a new `password-reset` scenario:**

This is the same orchestration pattern as §12.7. Extend `GuidedTroubleshootingTask`:

- [ ] Add `scenario: "password-reset"` to `GuidedTroubleshootingTask`. In this scenario, `FakeDesktop` starts with the Browser app open showing `firstbank.example`'s login form.
- [ ] New step actions for this scenario:
  ```
  "click-forgot-link"      — clicks "Forgot password?" on the bank login form
  "open-mail-from-dock"    — learner clicks Mail in the dock (DesktopLaunch-style highlight)
  "open-reset-email"       — clicks the "Password Reset" email in the Mail inbox
  "click-reset-link"       — clicks the link inside the email (returns focus to the browser)
  "type-new-password"      — types a new password in the reset form (strength meter applies)
  "confirm-login"          — submits the login form with the new password
  ```
- [ ] Clicking the reset link in Mail: the Mail app renders the email body with a highlighted "Reset your password" button; clicking it switches the active window to Browser and navigates to `firstbank.example/reset?token=abc123`. The token is cosmetic — do not validate it.
- [ ] After `confirm-login` succeeds, render `LoggedInPanel` (from §12.2) in the browser frame.
- [ ] **Document the new scenario and actions in `CLAUDE.md`.**

### 13.5 Getting support: open the real apps (feedback #110)

`when-to-get-help` (1180, 6 steps) — the error dialog and the support site are both faked in one frame.

- [ ] Rebuild as a genuine sequence: open **Photos** from the dock (the app must really open) → it throws error `PX-4402` → copy the code → open **Browser** from the dock → go to `support.example` → paste the code → get a solution → reopen Photos and confirm it works.
- [ ] The user's complaint is that everything is handed over: at Unit 11 of 12, reduce the hand-holding. Give the objective and let them find the dock icons themselves — consider `mode: "assessment"` for this lesson.

**Implementation — use `guided-troubleshooting` with a new `error-restart` scenario:**

- [ ] Add `scenario: "error-restart"` to `GuidedTroubleshootingTask`. In this scenario:
  - `FakeDesktop` starts idle (no apps open).
  - No step highlighting — the learner is expected to find the dock icons themselves (assessment-adjacent).
- [ ] New step actions:
  ```
  "open-app-from-dock"     — waits for learner to click a named dock icon; target: "photos"
  "read-error"             — already exists; here the error says "Error PX-4402"
  "copy-code"              — already exists; copies "PX-4402" to clipboard
  "open-browser-from-dock" — waits for learner to click Browser in the dock; target: "browser"
  "navigate-support"       — navigates to support.example (learner types in the address bar)
  "paste-code"             — already exists; pastes into the support site's search field
  "submit-support"         — already exists; submits and shows a solutions page
  "reopen-app"             — learner reopens Photos; it works this time (error cleared from state)
  ```
- [ ] `support.example` must be added to `GuidedBrowserTask.tsx`'s `PAGES`: a simple search page for error codes, returning one result for "PX-4402" — *"Photos Library Rebuild: Go to Photos → File → Rebuild Library. Takes 1–2 minutes."*
- [ ] `reopen-app` clears the `errorActive` flag for Photos so it opens without the error dialog.
- [ ] **Document the new scenario and actions in `CLAUDE.md`.**

---

## Phase 14 — Unit 12: Everyday Life

### 14.1 Unit 12 is entirely "do it on your own computer" (feedback #112)

The user's instruction is unambiguous: Unit 12 revisits everything the course taught, with **no playground at all**, directing the learner to their real machine.

- [ ] Convert **every** Unit 12 lesson to `type: "none"`. That means changing:
  - `social-media` (1210) — currently `guided-messaging`
  - `calendar-reminders` (1220) — currently `guided-calendar`
  - `shopping-banking` (1250) — currently `guided-security`
  - `pdfs-reading` (1280) — currently `guided-browser`
  Already `none`: `maps-navigation`, `notes-documents`, `google-docs-basics`, `google-docs-share`, `google-drive-basics`, `qrcodes-siri`, `printing-scanning`, `unit-12-assessment`.
- [ ] Rewrite each intro as a **numbered real-world walkthrough** for the learner's own computer — the format `maps-navigation` and the Google Docs lessons already use. Each names the app to open, the exact steps, what they should see, and what to do if it looks different.
- [ ] Every Unit 12 lesson explicitly cross-references the unit that taught the skill: *"You practiced this in Unit 6 — now do it for real."*
- [ ] Rule 1.9 removes the playground pane automatically once they're all `none`. Verify no Unit 12 lesson renders a desktop.
- [ ] **Note the tension with 5.5**: `pdfs-reading` is where `open-download` was going to be exercised. Move that exercise to a Unit 4 lesson (`safari-downloads`, 460) instead, and let the Unit 12 version be the real-computer walkthrough.

---

## Phase 15 — Unit assessments: unique, creative, unassisted

**Feedback #52, #72, #78, #82, #88, #94, #105, #111** are the same instruction repeated for eight different units: *stop replaying the lessons, stop the hand-holding, be creative.* Treat them as one job.

### 15.1 The rules for every assessment

- [ ] `mode: "assessment"` on every one that has a guided task type. This suppresses step-by-step `say` text and the yellow highlight rings, and shows the objectives banner with a **Hint** button (`SimulatorFrame` already implements all of this — see [SimulatorFrame.tsx:72-123](components/Playground/SimulatorFrame.tsx:72)).
- [ ] **Objectives, never walkthroughs.** Write goals: *"Find a recipe and save it for later."* Never: *"Click the address bar, type recipebox.example, press Enter."*
- [ ] **New combinations only.** An assessment must require the learner to *sequence* skills themselves, and must not reuse the same target site/app/file as the lessons in that unit. If Unit 4's lessons used `recipebox.example`, the assessment uses `citylibrary.example`.
- [ ] **Hints nudge, never solve.** *"Which part of the browser shows where you are?"* Not: *"Click the address bar."*
- [ ] Per-sim assessment wiring: each guided sim needs to scan **all incomplete objectives** on every action rather than only checking the current step. This was deferred in QA round 3 and is now required. Refactor each sim's completion check into a pure `matchesStep(step, event): boolean` and, in assessment mode, test every unmet objective against each event.

**How to implement `matchesStep` — concrete example using `GuidedFilesTask`:**

Currently `GuidedFilesTask` has handler logic like:
```tsx
// BAD — coupled to current step index
const handleOpen = (item: Item) => {
  if (steps[stepIndex]?.action === "open-file" && steps[stepIndex].target === item.name) {
    completeStep();
  }
};
```

Refactor to:
```tsx
// In TaskChecker.ts or co-located:
function matchesFilesStep(step: GuidedFilesStep, event: { kind: string; name?: string; into?: string }): boolean {
  if (step.action === "open-file" && event.kind === "open")      return event.name === step.target;
  if (step.action === "go-to"    && event.kind === "navigate")   return event.name === step.target;
  if (step.action === "new-folder" && event.kind === "new-folder") return event.name === step.value;
  if (step.action === "rename"   && event.kind === "rename")     return event.name === step.value;
  if (step.action === "move"     && event.kind === "move")       return event.name === step.target && event.into === step.into;
  if (step.action === "delete"   && event.kind === "delete")     return event.name === step.target;
  if (step.action === "restore"  && event.kind === "restore")    return event.name === step.target;
  return false;
}

// In component:
const handleOpen = (item: Item) => {
  const event = { kind: "open", name: item.name };
  if (mode === "assessment") {
    // Complete any unmet objective that this action satisfies (order-free in assessment)
    const nextUnmet = steps.findIndex((s, i) => !completedSteps.has(i) && matchesFilesStep(s, event));
    if (nextUnmet !== -1) markComplete(nextUnmet);
  } else {
    // Guided: must match the CURRENT step only
    if (matchesFilesStep(steps[stepIndex], event)) completeStep();
  }
};
```

Apply this same pattern to every `GuidedXxxTask` component. The key difference: in guided mode, the step index gates completion; in assessment mode, any unmet step that matches the event is marked complete and the objectives panel updates. The learner can complete objectives in any order.

**Important:** `completedSteps` is a `Set<number>` not just a `stepIndex`. This is a small state shape change — currently most sims use `stepIndex` only. Refactoring `stepIndex` → `completedSteps: Set<number>` + `stepIndex: number` (still needed for guided-mode banner) is the mechanical change that enables assessment mode. Do this in Phase 15 after all other content work is done, since it touches every sim component.

### 15.2 Per-unit assessment briefs

- [ ] **Unit 1** — *no assessment exists.* Create `unit-1-assessment` (order 60, new module "Unit 1 Assessment") as `guided-desktop` in assessment mode: open two apps of your choice, minimize one, close the other, open a status panel, and find today's date.
- [ ] **Unit 2** — *no assessment exists.* Create `unit-2-assessment` (order 295, module "Unit 2 Assessment") as `notes-shortcut` (4.9) in assessment mode: write a short note, make one word bold, copy a line, paste it, and undo the paste. `email-assessment` (290) stays a Real-Life Exercise and is not the assessment.
- [ ] **Unit 3** — `unit-3-assessment` (390) is `type: "none"` (IRL). Add a real activity: `guided-files` in assessment mode — a messy Downloads folder to sort into folders you create, with one file to rename and one to trash. New files, not the lesson set.
- [ ] **Unit 4** (499, 11 steps) — currently replays the entire unit step by step. Rewrite: 5 objectives on **new** sites — find the library's opening hours, save the page for later, check the connection is secure, decline a cookie banner, and close a popup without clicking it.
- [ ] **Unit 5** (570, 12 steps) — assessment mode. Objectives: start a group chat with two people, send a photo, react to a message, make a video call and mute yourself.
- [ ] **Unit 6** (680, 15 steps) — assessment mode. Objectives: find the scam in the inbox and mark it spam, reply to a real email with an attachment, and archive something. Do not enumerate the clicks.
- [ ] **Unit 7** (780, 14 steps) — assessment mode. Objectives: find a specific photo by searching, fix it (it's crooked and dark), put it in a new album, and share it.
- [ ] **Unit 8** (870, 8 steps) — assessment mode, using apps no lesson touched (NoteMaster, SketchPad). Objectives: find an app that does X, check its reviews before installing, install it, grant only the permission it needs, then remove a different app you don't want.
- [ ] **Unit 9** (960) — currently `type: "none"`. Add a `guided-settings` assessment: make the screen easier to read (any combination of dark mode, brightness, text size), then find how much storage is free.
- [ ] **Unit 10** (1100, 11 steps) — assessment mode. Objectives: build a strong password, spot the two fake messages among five, and finish signing in with the code from your phone.
- [ ] **Unit 11** (1190, 4 steps) — reported as *not working at all*. Debug first (Appendix C), then rewrite in assessment mode: an app is frozen and the WiFi is off; fix both and prove it.
- [ ] **Unit 12** (1290) — stays `type: "none"`, an IRL checklist, per Phase 14.

---

## Phase 16 — New lesson: Bluetooth (feedback #54)

- [ ] The user notes the Bluetooth **logo is trademarked** — write the word "Bluetooth" in text, never draw the rune. Use a generic wireless/waves SVG if an icon is needed.
- [ ] Placement: Unit 9 (Settings), module **"Connecting Devices"**, order **930** (the gap between `display-theme` 920 and `notifications-sound` 940 is free).
- [ ] Add a **Bluetooth** section to `SettingsApp`:
  - A master on/off toggle.
  - *My Devices* (empty at first) and *Other Devices* (a discoverable list).
  - `headphones.png` rendered beside the entry so it is unmistakable which object is being paired.
  - Clicking a device shows `Connecting…` for ~1.5s, then moves it to My Devices marked `Connected`, with a battery reading.
  - A **Disconnect** option, so the flow is reversible.
- [ ] Lesson `bluetooth-devices.json` as `guided-settings`, 4 steps: open Bluetooth → turn it on → select the headphones → confirm connected. Requires new `guided-settings` actions `select-device` and `disconnect-device` — **document them in `CLAUDE.md`**.
- [ ] The intro must be explicit about the physical half a simulator can't do: the headphones must be **in pairing mode** (usually holding a button until a light flashes), they must be **charged**, and they must be **close by**. Beginners fail at that step, not at the on-screen one.

---

## Phase 17 — Final verification

- [ ] `python3 scripts/check-lessons.py` — unique orders, capitalized sentences, no `multiple-choice`, no `placeholder`.
- [ ] `npx tsc --noEmit`, `npm run lint`, `rm -rf .next && npm run build` all clean.
- [ ] **Full course walkthrough** in the in-app browser: every module page loads; complete at least one activity per playground type end to end, including one failure path (CLEAN NOW) and one assessment using a Hint.
- [ ] Confirm reset-all-progress still clears both `lac-progress` and `lac-sim`.
- [ ] Confirm `/login` renders with no Supabase env vars set and every lesson is still reachable signed out.
- [ ] Confirm no lesson without software involvement renders a PlaygroundOS pane (rule 1.9) — walk all `type: "none"` lessons.
- [ ] Confirm there is exactly one file-manager implementation: `grep -rn "FILLER_FILES" components/` returns nothing.
- [ ] **`CLAUDE.md` is current**: `media` and `warning` lesson fields; the `notes-shortcut` type; new actions on `guided-desktop` (`open-app`, `close-app`, `open-clock`, `open-wifi-panel`, `open-battery-panel`), `guided-browser` (`open-download`), `guided-files` (`arrow-select`, `keyboardOnly`), `guided-email` (`seedDraft`), `guided-messaging` (`create-group`, `add-to-group`, `send-group-message`), `guided-settings` (`select-device`, `disconnect-device`), `guided-troubleshooting` (`error-restart` scenario + its actions); the removal of `compose-email` and `message-reply`; the updated `guided-browser` site list; the new Unit 1 order range; the `SimulatorFrame` `chrome` prop; the one-Files-app rule.
- [ ] Commit and push.

---

## Appendix A — Feedback → plan traceability

| # | Feedback (condensed) | Section |
|---|---|---|
| 1 | Combine lessons and dashboard | 1.1 |
| 2 | Login page (Supabase eventually) | 1.2 |
| 3 | Progress-monitoring design doc, no implementation | 1.3 |
| 4 | `DockIcons1.png` dock icons, rounded, black and white | 0.1, 2.1 |
| 5 | Animation between lessons after Next | 1.10 |
| 6 | Trackpad lesson must include mouse | 3.2 |
| 7 | Back and Next same size | 1.4 |
| 8 | Animation when closing wifi/battery/calendar panels | 2.4 |
| 9 | Camera lesson: external cameras, no playground | 3.5 |
| 10 | Power button: `powerbutton.png`, no playground | 0.1, 3.3 |
| 11 | Charger: `charger.png`, no playground | 0.1, 3.4 |
| 12 | Skip button next to Restart during an activity | 1.7 |
| 13 | Back button on the first lesson of a module | 1.8 |
| 14 | No playground for the sleep lesson | 1.9, 3.6 |
| 15 | **New rule:** no playground when software isn't involved | 1.9 |
| 16 | Settings About must not show misleading data (purple banner) | 2.7 |
| 17 | Restart lesson: error → Settings → restart | 3.12 |
| 18 | Trackpad first; no numbers in shapes; no fake window chrome | 3.1, 3.11 |
| 19 | Next pops out green on completion; green check twice as fast | 1.5 |
| 20 | Dock highlight in the squircle shape | 2.2 |
| 21 | One Files app everywhere, the elaborate one | 2.6, 3.7 |
| 22 | Right-click: tab switching after completion, window controls, real URL | 3.8 |
| 23 | "Skip this activity" in a gray box | 1.7 |
| 24 | Animation when an app opens | 2.3 |
| 25 | Green check on every activity's completion | 1.5, 1.6 |
| 26 | No blinking cursor after the code is typed | 3.9 |
| 27 | Rename pinch-zoom → "Zoom In and Out" | 3.10 |
| 28 | Dock lesson: open and close apps | 3.13 |
| 29 | Menu bar lesson: check your own computer | 3.14 |
| 30 | Clock / WiFi / battery lessons need activities | 3.15 |
| 31 | Opening apps: any 4, not all | 3.16 |
| 32 | Closing apps: practice, not theory | 3.17 |
| 33 | **Bug:** F12 moves the dock | 2.8 |
| 34 | Closing vs quitting needs an activity | 3.18 |
| 35 | Remove the space-bar lesson | 4.1 |
| 36 | Typing practice in the real Mail app | 4.2 |
| 37 | Two lessons on Command | 4.3 |
| 38 | Warning banner for keys not to press (Escape) | 4.5 |
| 39 | Tab needs an activity (`TabActivityIdea`) | 0.1, 4.4 |
| 40 | Return needs an activity | 4.5 |
| 41 | Arrow keys: navigate real files, no clicking | 4.6 |
| 42 | Doggo challenge in the real Messages app | 4.7 |
| 43 | Remove the cursor/insertion-point lesson | 4.1 |
| 44 | Split undo/redo into its own lesson | 4.8 |
| 45 | Bold/italic/underline activity in Notes | 4.9 |
| 46 | Every keyboard shortcut needs an activity | 4.9 |
| 47 | Second Tab lesson showing practical use | 4.4 |
| 48 | Remove the "say thanks over email" lesson | 4.1 |
| 49 | Birthday invitation in the real Files app; fix the ugliness | 4.10 |
| 50 | Messy email in the real Mail app; send it | 4.11 |
| 51 | Visible hover on everything in PlaygroundOS | 2.5 |
| 52 | Unit assessments must be unique (all units) | 15 |
| 53 | Opening a file opens a real window | 3.7, 5.1 |
| 54 | Bluetooth lesson with `Headphones.png` | 0.1, 16 |
| 55 | `ImageInFiles.png` for Pictures | 0.1, 2.6, 5.3 |
| 56 | `DownloadInFiles.png` for Downloads | 0.1, 2.6, 5.4 |
| 57 | **Bug:** TaxReturn already in the folder | 5.2 |
| 58 | The apple-pie recipe must open | 5.5 |
| 59 | Internet Basics repeats the prior lesson | 6.2 |
| 60 | Stop retyping google.com / wikipedia.org | 6.1, 6.2 |
| 61 | Different sites in "Using the browser" | 6.1 |
| 62 | Unit 4 2/8 browser must be maneuverable | 6.3 |
| 63 | New sites, and the apple-pie PDF must open | 6.1, 5.5 |
| 64 | Reload sometimes dead; vary sites across all units | 6.1, 6.4 |
| 65 | Reading list must be viewable | 6.1 (page content) |
| 66 | ~100ms page loads for realism | 2.9 |
| 67 | See reload work, then the completion popup | 6.4 |
| 68 | Unit 4 8/8 zoom must work | 6.5 |
| 69 | Unknown URL → "try it in your real browser" | 6.8 |
| 70 | `DigitalCookie.png` for the cookie lesson | 0.1, 6.6 |
| 71 | **Bug:** online-safety activity auto-fails | 6.7 |
| 72 | Unit 4 assessment: creative, no hand-holding | 15.2 |
| 73 | Unit 5 2/5 duplicates 1/5 | 7.1 |
| 74 | Unit 5 3/5 should be group chat | 7.2 |
| 75 | A "what's your favorite animal?" message | 7.3 |
| 76 | Emoji/reactions repeats an earlier lesson | 7.4 |
| 77 | Video calls: we can't access your camera | 7.5, 3.5 |
| 78 | Unit 5 assessment: no yellow, be creative | 15.2 |
| 79 | Unit 6 composing must use the real email UI | 8.1 |
| 80 | **Bug:** composing 2/3; step 3/8 has no success signal | 8.2 |
| 81 | CC/BCC registers on typing; include a body | 8.3 |
| 82 | Unit 6 assessment: no hand-holding, must register | 15.2 |
| 83 | **Bug:** Unit 7 3/3 search doesn't register | 9.1 |
| 84 | **Bug:** Unit 7 organizing 1/3 search; say to type it | 9.1 |
| 85 | Two dog images | 9.2 |
| 86 | The bird must actually be dark and crooked | 9.3 |
| 87 | Optional banner to check Messages for the shared photo | 9.4 |
| 88 | Unit 7 assessment: creative, no hand-holding | 15.2 |
| 89 | Option to redo any lesson | 1.11 |
| 90 | **Bug:** asked to install an app already installed | 10.1 |
| 91 | Everything is Puzzle Quest | 10.2 |
| 92 | **Bug:** Unit 8 1/3 app already installed | 10.1 |
| 93 | **Bug:** Zen Garden already installed in the compare lesson | 10.1 |
| 94 | Unit 8 assessment: unique, creative, unassisted | 15.2 |
| 95 | **Bug:** dark mode misses WiFi and battery | 2.7, 11.1 |
| 96 | Settings says "Settings" twice; UI unprofessional | 2.7, 11.2 |
| 97 | Unit 9 assessment: stale trackpad line, stray text | 11.3 |
| 98 | Passwords must not be taught in a browser | 12.1 |
| 99 | Show something after login / verify / passkey | 12.2 |
| 100 | The phone looks odd | 12.3 |
| 101 | The phishing inspector shouldn't be in the browser | 12.4 |
| 102 | Ad tracking belongs in Settings | 12.5 |
| 103 | Unit 10 transactions shouldn't be in the browser | 12.6 |
| 104 | Realistic no-WiFi → connect → disable tracking | 12.7 |
| 105 | Unit 10 assessment: creative, not a copy | 15.2 |
| 106 | Unit 11 1/3: Notes must visibly work | 13.1 |
| 107 | Unit 11 2/3 duplicates 1/3 → delete and reinstall | 13.2 |
| 108 | Remove the Unit 11 3/3 activity | 13.3 |
| 109 | Access issues: open the real Mail app, new page after login | 13.4 |
| 110 | Support: really open Photos, really open the Browser | 13.5 |
| 111 | **Bug:** Unit 11 assessment doesn't work; must be unique | 13, 15.2 |
| 112 | All of Unit 12: no playground, do it on your own computer | 14.1 |

## Appendix B — Assets

All assets are available at `~/Downloads/Images/`. Copy instructions are in §0.1. The slicing script for `DockIcons1.png` is also in §0.1.

| User's filename | Save as | Needed by | Notes |
|---|---|---|---|
| `DockIcons1.png` | `dock-icons-1.png` → sliced `dock-<app>.png` | 2.1 | 1280×800 sprite sheet; §0.1 slicing script |
| `PowerButton.png` | `power-button.png` | 3.3 | 512×512 power symbol, black on white |
| `Charger.png` | `charger.png` | 3.4 | 512×512 cable icon, black on white |
| `Headphones.png` | `headphones.png` | 16 | 3684×3788 photo — **scale to max 240px** when rendering |
| `ImageInFiles.png` | `files-pictures.png` | 2.6, 5.3 | 1280×800; render at ~16×16 in sidebar |
| `DownloadInFiles.png` | `files-downloads.png` | 2.6, 5.4 | 1280×800; render at ~16×16 in sidebar |
| `DigitalCookie.png` | `cookie.png` | 6.6 | 512×512 cartoon cookie |
| `TabActivityIdea.png` | (design spec — do not copy to `public/`) | 4.4 | Shows `pickacolor.example`; §4.4 has the build instructions |

## Appendix C — Diagnosed root causes (read before fixing)

| Bug | Root cause | Location |
|---|---|---|
| Opening apps lesson is impossible (#31) | `open-all-apps` demands all 10 dock apps, but `BUILT_IN_APPS` contains only 6. `openApp` returns early for `photos`, `app-market`, `calendar`, `reminders`, so 4 icons never open and the task can never complete. | [FakeDesktop.tsx:17](components/Playground/FakeDesktop.tsx:17), [FakeDesktop.tsx:135](components/Playground/FakeDesktop.tsx:135) |
| Dark mode misses WiFi/battery (#95) | Both icons hardcode `stroke="#111"` / `fill="#111"` instead of `currentColor`, so they never follow the menu bar's text color. | [FakeDesktop.tsx:512-530](components/Playground/FakeDesktop.tsx:512) |
| Settings title duplicated (#96) | An in-app `Settings` heading is rendered *and* `FakeDesktop`'s menu bar shows `APP_TITLES[activeApp]`. | [SettingsApp.tsx:100](components/Playground/Desktop/SettingsApp.tsx:100) + [FakeDesktop.tsx:194](components/Playground/FakeDesktop.tsx:194) |
| About page shows invented specs (#16) | `AboutPanel` hardcodes "Memory 8 GB / Storage 100 GB"; `INITIAL_STORAGE` invents five entries. Nothing marks them as simulated. | [SettingsApp.tsx:403-418](components/Playground/Desktop/SettingsApp.tsx:403), [SettingsApp.tsx:42-48](components/Playground/Desktop/SettingsApp.tsx:42) |
| Status panels vanish with no animation (#8) | `StatusPanel` has `animate-slide-down` on mount but closing is a bare conditional unmount — there is no exit animation and four separate code paths clear `openPanel`. | [FakeDesktop.tsx:451](components/Playground/FakeDesktop.tsx:451), [FakeDesktop.tsx:137/198/255/455](components/Playground/FakeDesktop.tsx:137) |
| Menu-bar buttons look inert (#51) | The WiFi and battery buttons have no `hover:` class at all; the clock has only `hover:underline`. | [FakeDesktop.tsx:198-216](components/Playground/FakeDesktop.tsx:198) |
| Celebration lingers (#19) | Hardcoded `1600`ms, duplicated in `GuidedDesktopTask` and `KeyboardNavTask`. | [SimulatorFrame.tsx:59](components/Playground/SimulatorFrame.tsx:59) |
| Back and Next differ in size (#7) | Back is `text-sm text-gray-600`, Next is `font-semibold` — different metrics, different box. | [LessonModuleRunner.tsx:236/241](components/LessonModuleRunner.tsx:236) |
| No way back from a module's first lesson (#13) | Back renders only when `index > 0`; nothing links to the previous module. | [LessonModuleRunner.tsx:235](components/LessonModuleRunner.tsx:235) |
| Fake window chrome on the shapes game (#18) | `LessonPlaygroundPane` wraps it in `SimulatorFrame` with `appName="Practice"`, which always draws a title bar and inert `WindowControls`. | [LessonPlaygroundPane.tsx:95-99](components/LessonPlaygroundPane.tsx:95), [SimulatorFrame.tsx:136-145](components/Playground/SimulatorFrame.tsx:136) |
| Numbers baked into falling shapes (#18) | The shape PNGs were sliced from `FallingNumbers.png`, which has digits drawn inside each shape. No code change can remove them. | [ShapeClickGame.tsx:23-29](components/Playground/ShapeClickGame.tsx:23) |
| Two Files apps (#21) | `Desktop/FilesApp.tsx` (flat list over `FILLER_FILES`) and `GuidedFilesTask.tsx` (sidebar + folders over `makeItems()`) are unrelated implementations over unrelated datasets. | [FilesApp.tsx](components/Playground/Desktop/FilesApp.tsx), [GuidedFilesTask.tsx:63-77](components/Playground/GuidedFilesTask.tsx:63), [filesData.ts](components/Playground/Desktop/filesData.ts) |
| Re-installing an installed app (#90, #92, #93) | Mount-time seeding skips apps with an `install` step *in the same lesson*, but nothing forces an uninstall for an app a *previous* lesson installed and persisted to `lac-sim-apps`. | [GuidedAppStoreTask.tsx:205-213](components/Playground/GuidedAppStoreTask.tsx:205) |
| Security lessons framed as websites (#98, #101, #103) | `LessonPlaygroundPane` wraps every `guided-security` task in `DesktopLaunch app="browser"`, so the password checker and phishing inspector are always inside browser chrome. | [LessonPlaygroundPane.tsx:197-201](components/LessonPlaygroundPane.tsx:197) |
| Search doesn't register (#83, #84) | `guided-photos` `search` is single-phase and completes on query submit, so clicking the search icon produces no step feedback. Compare `attach-photo` / `add-reaction`, which are two-phase. | `GuidedPhotosTask.tsx` search handler |
| The "fixed" photo looks fine already (#86) | The photo library has no concept of a starting edit state — every item renders unmodified, so a repair lesson has nothing to repair. | `GuidedPhotosTask.tsx` library array |
| Lock/step no-ops in Unit 4 (#62) | The `if (step?.action === X)` pattern wrapping a state change instead of only the `completeStep()` call makes controls dead outside their step. | `GuidedBrowserTask.tsx`, multiple handlers |
