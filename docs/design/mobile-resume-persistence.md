# Design: Mobile activity pane (C1), Resume progress (H3), Persistence (C3)

Design-only response to the three items the overnight usability/accessibility audit
flagged (`docs/audit-2026-07-17/USABILITY_ACCESSIBILITY_AUDIT.md` on branch
`tender-guass-ey1tek`). No implementation here — these are the architecture decisions
so a follow-up build session (or the user) can execute without re-deriving them.

## TL;DR — decisions and why

| Item | Decision | One-line reason |
|---|---|---|
| **C1** mobile activity pane | **Hybrid, driven by a task-type capability map**: reflow the activities that are meaningful on a touchscreen; show an honest "open this on a laptop" card for the ones that teach a laptop-only input mechanic or need a wide canvas. | A blanket "make it responsive" would cram a desktop-OS mockup and a *right-click* lesson onto a phone where right-click doesn't exist; a blanket "needs a big screen" would needlessly lock out typing/editing/reading. |
| **H3** resume progress | On mount, set `index` to the **first incomplete sub-lesson** in the module (fallback to 0 if all done), computed in a client effect keyed on `route.moduleSlug`. | The data (`getCompletedSlugs()`) already exists; the only change is where we start. The effect also fixes a latent index-carryover fragility. |
| **C3** persistence | Swap `sessionStorage` → `localStorage` behind the unchanged `lib/progress.ts` interface, add a stored schema version + write-side try/catch, and correct the Dashboard copy. Scope (don't build) the account system. | One-backend-line change unlocks cross-day persistence for an audience (beginners, kids, elders) that closes tabs constantly. |

**Recommended build order: C3 → H3 → C1.** Each earlier item strengthens the next
(persistence makes resume meaningful across days; resume makes the mobile "come back on a
laptop" flow humane). C3 is also the smallest and highest-leverage.

**The one cross-cutting caveat to internalize:** `localStorage` is per-device. Until real
accounts exist, "skip the typing lesson on your phone, finish it on your laptop later" does
**not** literally sync — the laptop simply still shows it incomplete (because you never did
it *there*). The nudge works; the sync doesn't. Frame C1's fallback copy accordingly and
don't promise cross-device continuity until accounts land.

---

## C1 — Mobile activity pane

### The bug (confirmed in code)

`components/LessonModuleRunner.tsx:133`:

```tsx
<div className="hidden lg:block flex-1 min-w-0 p-4">
  <LessonPlaygroundPane task={subLesson.playgroundTask} started={started} ... />
</div>
```

Below the `lg` breakpoint (1024px) the entire activity pane is hidden, but the **"Start
activity" and "Skip this activity" buttons live in the left column and stay visible**
(`LessonModuleRunner.tsx:104-115`). So on a phone:

- "Start activity" is a **dead control** — it flips `started` true, but the pane it reveals is `display:none`.
- Advancing past a gated sub-lesson requires `attemptState === "success"` (`canAdvance`, line 29), which is unreachable because the activity can't be touched.
- The only forward path is **"Skip this activity,"** which advances without marking complete. Net effect: **on mobile you can complete zero gated activities** — every one is either dead or skipped.

This matters more than usual because the product's whole audience is beginners who may
well reach for a phone first.

### Why this is an architecture decision, not a CSS one

The 14 playground task types do **not** all mean the same thing on a narrow touchscreen.
Two axes matter:

1. **Does it teach a laptop-only input mechanic?** The entire *Using the Trackpad* module
   teaches single-click, double-click, right-click (two-finger), two-finger scroll, and
   pinch-zoom. On a touchscreen these mechanics *don't exist* — "tap the falling shape"
   teaches tapping, not trackpad clicking. Reflowing them onto a phone would teach the
   wrong muscle memory, not just look cramped.
2. **Can the canvas reflow meaningfully?** `FakeDesktop` (a full desktop OS with dock +
   menu bar + windows), and the fixed **1280×800 mockup PNGs** with percentage hotspots
   (`file-explorer-open`, `browser-right-click`) cannot become a phone layout without a
   ground-up redraw. A textarea or a chat thread reflows fine.

### The capability map (single source of truth)

Classify each `PlaygroundTask["type"]`. Put this next to the type union in `lib/lessons.ts`
(or a small `lib/taskCapabilities.ts`) so layout, the fallback card, and any future
per-task tuning all read from one place:

```ts
// Tasks that require a laptop: they teach a pointer/keyboard mechanic that doesn't
// exist on touch, and/or render a wide canvas that can't meaningfully reflow.
export const DESKTOP_ONLY_TASKS: PlaygroundTask["type"][] = [
  "shape-click-game",    // teaches trackpad single-click; wide falling canvas
  "file-explorer-open",  // teaches double-click; fixed 1280×800 mockup
  "browser-right-click", // teaches right-click — doesn't exist on touch; fixed mockup
  "browser-scroll-code", // teaches two-finger scroll
  "pinch-zoom",          // teaches trackpad pinch; ctrl+scroll fallback is desktop-only
  "open-all-apps",       // full desktop-OS mockup (FakeDesktop)
  "keyboard-shortcut",   // needs a physical Command/Ctrl key
];

// Everything else is mobile-capable *with reflow*:
//   type-text, message-reply, match-parts, edit-text, edit-file, compose-email
// ("none"/"placeholder" have no gate and no pane — trivially fine.)
export function isDesktopOnly(type: PlaygroundTask["type"]): boolean {
  return DESKTOP_ONLY_TASKS.includes(type);
}
```

Rationale for the two judgment calls:
- `keyboard-shortcut` (copy/paste) is desktop-only because it depends on Command/Ctrl+C/V — no equivalent on a soft keyboard, and the whole app is about learning a laptop.
- `match-parts` stays mobile-capable but is the **borderline** one: it's tap-to-match (fine on touch) over a wide laptop *image* that must scale down. Include it, but verify the image + dots scale on a narrow viewport during implementation.

### Detecting viewport: a small client hook (none exists today)

Confirmed there is no `matchMedia`/media-query hook in the repo. The wide-vs-narrow choice
changes *what is interactive* (real activity vs. fallback card), not just layout, so a
pure-CSS "render both, hide one" approach is wrong — it would keep the hidden desktop
activity mounted (FakeDesktop timers, ShapeClickGame intervals) running invisibly. Use a
tiny SSR-safe hook:

```ts
// lib/useIsWide.ts
export function useIsWide(): boolean | null {
  const [isWide, setIsWide] = useState<boolean | null>(null); // null = not yet resolved
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isWide;
}
```

`null` until mounted (matches the existing `completedSlugs === null` pattern in
`DashboardView`) so there's no hydration mismatch and no flash of the wrong layout — render
a neutral placeholder for that one frame.

### Layout + render decision in `LessonModuleRunner`

- Outer container `h-full flex` → **`h-full flex flex-col lg:flex-row`**.
- Left column keeps `w-full lg:max-w-xl`; on mobile it's the top block.
- The pane wrapper stops being `hidden lg:block`. Instead the render branches on `useIsWide()` **and** the task's capability:

```
isWide === null           → neutral placeholder (one frame)
isWide === true           → real pane, side-by-side (today's desktop behavior, unchanged)
isWide === false + capable → real pane, stacked BELOW the lesson text, with a real height
isWide === false + desktop-only → fallback card in place of the pane (see below)
```

On mobile the stacked pane needs an explicit height because most activity components are
`h-full` and a `flex-col` mobile page gives them no height to fill: wrap in something like
`min-h-[32rem] h-[70vh]`.

### The honest fallback card (desktop-only tasks on mobile)

Replaces the "Start activity" button (kills the dead control) with an informational card
that gives a **real reason** tied to the specific skill, and still lets the learner move
on without silently faking completion:

> 🖥️ **This one needs a laptop.** It teaches the **trackpad double-click**, which phones
> and tablets don't have. Open LearnAComputer on a laptop or desktop to try it — or skip
> ahead for now and come back to it later.
> [ Skip for now → ]

Key semantics:
- **Do not** offer a "mark complete" on mobile for these — that would record a skill the learner never practiced. "Skip for now" uses the existing skip path (advances, does **not** mark complete), so the activity stays incomplete and H3's resume brings them back to it on a laptop.
- The per-task skill string ("trackpad double-click", "right-click", …) can live in the same capability map as a `reason` field so the copy is specific, not generic.

### Recommended phasing

- **Phase 1 (unblock — small):** hook + capability map + the four-way render branch + fallback card. This alone removes the dead-button/hidden-activity bug and makes mobile honest. Mobile-capable tasks render stacked; desktop-only tasks show the card.
- **Phase 2 (polish — per component):** reflow the mobile-capable set — collapse the contact sidebar in `MessagingApp`, the inbox list in `MailApp`, and the file-list column in `EditFileTask` (`hidden` below `lg`, show just the conversation / compose / editor); confirm `match-parts` image scales. Bounded, component-local work.

---

## H3 — Resume progress

### The bug (confirmed)

`LessonModuleRunner.tsx:20` is `const [index, setIndex] = useState(0)` and nothing ever
resets or resumes it. Every visit to a module starts at sub-lesson 1 even if 1–4 were
finished. `getCompletedSlugs()` already exists and is already consumed by `DashboardView`,
so the data is right there.

### Design

On mount (client-only, since `getCompletedSlugs()` reads storage), set `index` to the first
sub-lesson in this module whose slug isn't in the completed set; if all are complete, land
on index 0 (review-from-top — simple and predictable).

```tsx
const [index, setIndex] = useState(0);
const [indexResolved, setIndexResolved] = useState(false);

useEffect(() => {
  const completed = getCompletedSlugs();
  const firstIncomplete = route.subLessons.findIndex((l) => !completed.includes(l.slug));
  setIndex(firstIncomplete === -1 ? 0 : firstIncomplete);
  setIndexResolved(true);
}, [route.moduleSlug]);   // <-- keyed on module, see note below
```

Gate the sub-lesson body on `indexResolved` (render the surrounding chrome, hold the body
one frame) so the learner doesn't see sub-lesson 1 flash then jump.

**Why key on `route.moduleSlug`, not mount:** Next's App Router **reuses this client
component instance** when navigating between two URLs of the same dynamic segment
(`/lessons/a` → `/lessons/b`). So `useState(0)` does *not* re-initialize on module change.
Today that's a **latent fragility**: `handleNext` on the last sub-lesson does
`router.push(next module)` while this instance stays mounted, so `index` carries into the
next module. Finish a 5-sub-lesson module (index 4), advance to a 1-sub-lesson module, and
`route.subLessons[4]` is `undefined` → `subLesson.playgroundTask` throws. Keying the resume
effect on `route.moduleSlug` re-runs it on every module change and clamps `index` into
range, incidentally fixing this. *(Worth a quick reproduce during implementation to confirm
the crash is reachable — the fix is correct either way.)*

### Interaction with Skip (C1) and session-only storage (C3)

- **Skip is already correct for resume.** `handleNext` only `markComplete`s when `!hasGate`,
  so a skipped gated activity stays incomplete → resume lands the learner back on it next
  time. No change needed.
- **Skip-forward within a session isn't undone.** The resume effect runs only on
  mount/module-change, so moving forward via Skip/Next inside the mounted module won't yank
  the learner backward mid-session. Leaving the module and returning *will* resume at the
  first incomplete (i.e. the thing they skipped) — for a beginner-focused app that nudge is
  a feature, not a bug.
- **Depends on C3 for cross-day value.** With today's `sessionStorage`, resume only helps
  within one tab session (e.g. dashboard → back). With `localStorage` (C3) it works across
  days. Build H3 regardless — it just reads whatever `getCompletedSlugs()` returns — but its
  payoff lands once C3 ships.

### Optional adjacent scope (not required by H3)

- A **"Continue where you left off"** entry point on the lessons index / dashboard that
  jumps to the first module containing an incomplete sub-lesson. Small, complements H3.
- A future **`skipped` set** in storage so resume prefers first *incomplete-and-not-skipped*
  (don't nag about a deliberate skip), falling back to first-incomplete. Adds a storage
  concept — defer; the plain first-incomplete rule is the right default now.

---

## C3 — Persistence

### The bug (confirmed)

`lib/progress.ts` uses `window.sessionStorage`; progress evaporates on tab close. The
Dashboard even apologizes for it (`DashboardView.tsx:52-55`: "resets when you close the
tab"). For an audience of beginners / kids / older learners who close tabs and return days
later, session-only is the worst-fit default.

### The fix (same-day mitigation)

Swap the backend to `localStorage`. The module already isolates read/write, so **no call
site changes** — this is the swap its own header comment anticipates. While in there, three
cheap hardening steps:

1. **Version the stored shape** so a future format change can be migrated/discarded cleanly
   (localStorage lives forever): `{ version: 1, completedSlugs: [...] }`; unknown/absent
   version → treat as empty (the existing try/catch already returns empty on parse trouble).
2. **Wrap writes in try/catch too.** `writeState` currently doesn't; `localStorage` can
   throw (Safari private mode historically, quota) — degrade to in-memory instead of
   crashing a lesson.
3. **Fix the Dashboard copy** so it matches behavior: "saved on this device / this browser"
   with the honest caveat that clearing browser data or switching devices loses it. Shipping
   the behavior change without the copy change would make the UI lie.

SSR is already safe (`typeof window === "undefined"` guards carry over unchanged).

### Known limits to document (not fix now)

- **Shared device = shared bucket.** A family laptop with grandma + grandchild share one
  `localStorage` key and overwrite each other. Accept for the mitigation; accounts solve it.
  (A lightweight "who's learning?" local profile → per-name storage key is a possible
  stopgap, but it starts reinventing accounts — don't build it now.)
- **Not cross-device.** Reiterating the top-level caveat: `localStorage` does not sync
  phone↔laptop, so C1's "finish it on a laptop" is a nudge, not a sync, until accounts.

### Scoping the "real account" system (design, don't build)

What a real account needs, enumerated so it can be planned — explicitly **not** to build now,
and note that per-project constraints mean an implementation session should *design/scaffold*
auth, not enter real credentials:

- **Identity/auth:** prefer **email magic-link** or "Sign in with Google/Apple" over
  passwords — password recovery is a real barrier for this audience.
- **Backend + DB:** `users` + `progress(user_id, lesson_slug, completed_at)`. On
  Next.js/Vercel, **Supabase** (auth + Postgres in one) is the natural fit; Neon / Vercel
  Postgres are alternatives.
- **API layer + the async ripple:** replacing `lib/progress.ts` locals with server
  actions/route handlers makes reads **async**. Call sites that assume sync today
  (`DashboardView`, the H3 resume effect) will need to move to async/loading states. Flag
  this as the known cost of the account migration. *Recommendation: keep `progress.ts` sync
  for the localStorage step* — don't pre-emptively make it async; accept the later churn.
- **Multi-device sync:** the actual payoff — progress follows the learner, which is what
  makes C1's cross-device story real.
- **Parent/teacher check-in** (already promised in the Dashboard copy): needs a supervisor
  ↔ learner relationship model and an authorized shared view. Larger; note, don't design deeply.
- **Privacy:** kids in the audience → COPPA / GDPR-K, parental consent, minimal PII. A
  gating constraint before any accounts ship.
- **Migration:** on first login, read existing `localStorage` progress and merge/upload it
  so device-local learners keep their history.

---

## Cross-cutting summary

```
C3 (localStorage)  ── makes ──▶  H3 (resume) meaningful across days
H3 (resume)        ── makes ──▶  C1 (mobile "come back on a laptop") humane
C1 (mobile)        ── wants ──▶  real cross-device sync, which only accounts (post-C3) give
```

Build **C3 → H3 → C1**. C3 is one backend line + hardening + copy. H3 is one effect
(keyed on `route.moduleSlug`) + a resolve gate, and it clears a latent index-carryover
crash. C1 is the real project: a capability map, a viewport hook, a four-way render branch,
an honest fallback card, then bounded per-component reflow.

### Open questions for the user
1. **All-complete landing (H3):** review-from-top (index 0) as proposed, or a dedicated
   "module complete ✓" state?
2. **`match-parts` on mobile:** treat as mobile-capable (reflow the laptop image) or move it
   to desktop-only for simplicity?
3. **C3 scope now:** just localStorage + hardening + copy this pass, and open a separate
   ticket for the account system — or do you want the account system itself designed out in
   more depth here?
