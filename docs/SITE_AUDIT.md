# Full-site audit

Asked for: *"do a full site audit and find more and more and more and more
issues, potential issues, etc, fix those."*

Two sweeps: one that mounts every activity in a real browser, and one static
pass over every lesson, component, route and asset. Both are repeatable — the
first is a page in the repo, the second is a script.

---

## Sweep 1 — every activity, mounted

Sampling a few playgrounds by hand has missed real breakage before, and 198
lessons is more than anyone will click through. So `/dev/mount-check` (dev only,
`notFound()` in production) mounts all **166 gated activities** in sequence
inside an error boundary and lists whatever throws.

**Result: every activity mounted. Zero console errors across the whole run.**

Re-run after all the fixes below: same result. That is now the regression test
for anything that touches the playground pane.

---

## Sweep 2 — static pass

`audit2.py` checked lessons, components, routes and assets together and produced
58 raw findings in 8 categories. Triaged honestly, because a raw count flatters:

| Category | Raw | Real | Verdict |
|---|---|---|---|
| public asset referenced nowhere | 28 | 22 | orphaned art from three refits — deleted |
| icon-only button without a name | 15 | **1** | the regex flagged any button starting with an icon; almost all have a visible label next to it |
| emoji in lesson copy | 6 | **1** | `✕ ☆` are text characters and allowed by the house rules; one real emoji |
| step without end punctuation | 3 | 0 | all three end in an email address on purpose |
| OS brand name in copy | 2 | 1 | naming real apps on the learner's real machine is correct; one was confusing |
| component referenced nowhere | 2 | 2 | one dead file, one that should have been used and was not |
| module split by order | 1 | 1 | real |
| thin intro | 1 | 1 | real |

---

## The two real bugs

### 1. Reset all progress did not uninstall the practice apps

`lib/simState.ts` reads and writes a namespaced blob under `lac-sim`, and
`resetProgress()` clears that key. The App Market never used it — it wrote
straight to a key of its own:

```ts
const SIM_KEY = "lac-sim-apps";          // reset never touched this
localStorage.setItem(SIM_KEY, JSON.stringify(ids));
```

So `lib/simState.ts` was dead code, and a learner who reset their progress and
went back to Unit 8 found their apps still installed — with the lesson telling
them to install something that was already there. The privacy page and
`CLAUDE.md` both described a design that was not in force.

The App Market now stores under the `apps` sub-key of `lac-sim` through
`simState`, which makes the documented design true and the reset complete.

**Verified in the browser**: set `lac-sim` to two installed apps, pressed Reset
all progress on the Lessons page, and read the key back — `null`, with
`lac-progress` emptied alongside it.

`CLAUDE.md` now says it in the imperative: **never write a `lac-*` key
directly**, because anything outside those two keys survives a reset.

### 2. Unit 4's module order disagreed with its module grouping

```
440–490  Using the browser
491–494  Online Safety          ← wedged in
495–496  Using the browser      ← resumed
```

The grouping merges by module name, so the page still showed the eight browser
lessons together — but the order numbers said otherwise, and anything that reads
them in sequence would disagree with what the learner sees. Renumbered:
Using the browser 440–492, Online Safety 493–496. No slug changed, so no
progress moved.

---

## Everything else fixed

**Failure pages.** There was no `app/not-found.tsx` and no `app/error.tsx`. A
mistyped lesson URL got Next's bare developer 404, and any unexpected client
error got a blank white page. For an audience still deciding whether computers
can be trusted, a blank screen is the worst possible answer. Both now explain
what happened, say plainly that it is not their fault and nothing is lost, and
offer a way back. Verified by visiting a made-up module slug.

**Silent unhandled task types.** `LessonPlaygroundPane` is a chain of
`task.type === "…"` branches with no fallback: a type in the union with no branch
rendered an empty white box behind a Start activity button, indistinguishable
from a broken activity. There is now a `HANDLED` set and a message that names the
type and tells the learner to skip.

**Accessibility.** One genuinely unlabelled control — the WiFi toggle in the
troubleshooting sim, a pill switch whose only content is the knob. It announced
as "button" with no name. Now `aria-label` + `aria-pressed`. A second sweep for
the same shape across every component found no others.

**Page titles.** Every tab said "LearnAComputer" — including all 64 lesson
modules. `generateMetadata` now titles each module page after the module, and
`/lessons`, `/login` and the cat page have their own (the last two through a
`layout.tsx`, since a client component cannot export metadata).

**Lint: 14 warnings → 0.** Not by suppressing them:

- `panelClass` was threaded into six Settings panels and used by none of them,
  with a `void panelClass;` in one to keep the compiler quiet — removed
  throughout, along with a `usedPct` nothing rendered and a colour helper nothing
  read.
- An `eslint-disable` in `FileManager` suppressed a rule that no longer fired.
- The `undoPill` dependency warning in `GuidedEmailTask` was **correct to
  suppress but not to ignore**: depending on the whole object would clear and
  restart the countdown interval every tick. Now disabled with the reason
  written down.
- `argsIgnorePattern: "^_"` added to the eslint config, so a leading underscore
  means what everyone already assumes it means.

**Dead weight.** 22 orphaned images (2.1 MB) left behind by the art refits —
`shape-*.png` replaced by sprites, `icon-*.png` replaced by SVG, `animal-*.png`
superseded by `Bird/Cow/Dog.png` — plus `MusicNoteIcon.tsx`, referenced by
nothing but its own definition. All recoverable from git history.

**Copy.** One real emoji in a hint (`🪟 New Window`); "Open your Files or Finder
app", which names the simulator's app and one real one and helps nobody on
Windows, now reads "your computer's file manager — Finder on a Mac, File Explorer
on Windows"; and `computer-parts-review`'s 77-character intro is now a real
explanation of what the parts are and why naming them matters.

---

## Checked and found clean

Worth recording, so the next pass does not redo it:

- **All ten top-level routes return 200** with sensible titles.
- **No `any` types, no `console.log`, no TODO/FIXME** anywhere in `app/`,
  `components/` or `lib/`.
- **One `dangerouslySetInnerHTML`** — the pre-paint theme script, which is the
  correct use of it.
- **One raw `<img>`** — inside the file viewer, on a local blob, where
  `next/image` would add nothing.
- **No duplicate lesson titles, no order collisions, no unit split across the
  order sequence.**
- **No broken internal links**: every `href` resolves to a route that exists.
- **Mobile**: the homepage and a lesson page both read correctly at 375px.

---

## Deliberately left alone

- **`placeholder` as a task type.** `check-lessons.py` bans it, so the "This
  activity is coming soon" branch is unreachable. It stays as the documented
  escape hatch rather than being ripped out.
- **`rls_auto_enable()` in Supabase.** The security advisor flags it the same way
  it flagged my own trigger function, but it predates this work and revoking
  execute on somebody else's function is not a change to make in passing. Noted
  in `docs/ACCOUNTS_AND_SYNC.md`.
- **App-identity emoji in the App Market catalog.** Allowed by the house rules —
  they are content, not UI glyphs.

## Still open

- **`/dev/mount-check` tests that activities mount, not that they can be
  completed.** Driving all 166 to completion would need a per-type script.
- **Contrast has not been measured.** The palette looks right in both themes but
  nothing has been run through a contrast checker, and `/accessibility` still
  says so honestly.
- **No automated test suite.** The checks in this repo are a validator, a
  type-checker, a linter and a mount harness. Nothing asserts behaviour except
  the folder-checker tests written by hand during the missions work.
