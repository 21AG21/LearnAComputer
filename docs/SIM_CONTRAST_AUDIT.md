# Contrast inside the simulator

## The hole

`contrast-check` measures *pages* — homepage, catalog, a lesson, the certificate,
the dashboard, privacy. It has never clicked **Start activity**. Every other
harness in the repo drives the DOM and never reads a color: solve-check finishes
lessons, ring-check measures where a highlight sits, stray-check does the wrong
thing on purpose, desktop-check counts windows, mount-check asks whether a
component throws.

So the entire playground was unmeasured. That is 170 activities and every button,
label, timestamp and placeholder a learner spends the whole course pressing — the
part of the product that *is* the product.

`simdark-check` (built the day before this) reached nine dock apps, and only in
dark mode. It also carried an "advisory" bucket for shortfalls on saturated
grounds, on the reasoning that they looked the same with Dark Mode off and so were
not the reskin's fault. That reasoning was true and beside the point. A button
nobody can read is a defect in whichever theme it appears, and the bucket was
quietly holding eight of them.

## What was in there

Four defect classes, none of them dark-mode damage — all predate the sim's dark
mode entirely. This is simply what accumulates when nobody measures.

| Defect | Ratio | Needs | Reach |
|---|---|---|---|
| `text-gray-400` on white | **2.54:1** | 4.5 | 104 call sites |
| white on `bg-blue-500` | **3.68:1** | 4.5 | 38 call sites |
| `text-yellow-500` star rating on white | **1.92:1** | 4.5 | 6 lessons |
| `text-orange-600` on `bg-orange-100` | **3.11:1** | 4.5 | 6 lessons |
| three near-misses (gray-500 and red-600 on gray-100, green-600 on white) | 3.3–4.39:1 | 4.5 | 3 lessons |

24 distinct defects, 135 lesson-appearances.

The `text-gray-400` class is the one that matters most, because of *what* it was
attached to: every email timestamp and preview line, the calendar's weekday
headers, App Market prices, the browser's address-bar placeholder, "Select a
contact to start chatting", "Start typing your note here." Secondary text — which
is exactly the text a beginner needs most, in a course sold to people who find
computers hard to read.

A buyer running Lighthouse or axe on a lesson page with an activity open finds all
four in one pass. This product ships a ten-lesson accessibility unit.

## The rules that came out of it

**`text-gray-400` is a dark-mode color.** On white it is 2.54:1. The correct pair
is `text-gray-500 sim-dark:text-gray-400` — 4.83:1 on white, 4.66:1 on gray-50,
7:1 on gray-900. Note this is the *opposite* direction from the dark-mode reskin's
first instinct, which mapped gray-400 *down* to gray-500 and made the dimmest text
dimmer still on a dark ground. Faint text moves lighter on dark and darker on
light; there is no single answer, which is the whole reason for the pair.

**Five regions keep bare `text-gray-400`,** because they are dark in *light* mode
too and gray-500 there would be 3.67:1 the wrong way round:

- `FileViewer`'s music player (gray-800 → gray-900 gradient)
- `GuidedEmailTask`'s "Sent — Undo" pill (`bg-gray-800`)
- `GuidedMessagingTask`'s video-call view (`bg-gray-900 text-white`)
- `GuidedTroubleshootingTask`'s Force Quit title bar (`bg-gray-800`)
- `SettingsApp`'s `muted`, which is already `dark ? gray-400 : gray-500`

**White text needs `bg-blue-600`, not `bg-blue-500`** (5.17:1 vs 3.68:1). Blue-500
as a plain fill with no text on it — an avatar, a progress bar, the selected-day
pill — is fine and stays: it clears the 3:1 bar for non-text.

**A star rating is still text.** `★★★★½` at yellow-500 on white is 1.92:1. It is
now `text-amber-700 sim-dark:text-yellow-400` (5.02:1 light, 11.3:1 dark). The
numeric rating beside it was already real text, but that does not license an
illegible glyph a sighted learner still has to read.

## `npm run sim-contrast-check`

Walks every activity through `window.__strayShow`, the script-controlled mount
`stray-check` uses, clicking the "open the app" gate exactly as a learner does —
without that most of the course silently never mounts and the run reports a
coverage number that is not true. For each activity it measures every text run
against its real resolved background.

Findings are deduplicated by colour pair **and class list**, not by slug. The same
`text-gray-400` lives in a component thirty lessons mount, and printing it thirty
times buries the other three defects. The count of lessons it appeared in is kept,
because that number is how much of the course a single fix repairs.

Green at **2966 text runs across 125 activities**. (The remaining 45 are
full-bleed activities with no simulator frame to anchor to; they are reported as
skipped rather than silently dropped.)

`SIMCONTRAST_NEGATIVE=1` is the negative control and **has been watched to fail**
— it washes every `text-gray-500` out to near-white and the sweep reports it at
1.05–1.1:1. `SIMCONTRAST_FILTER=<substr>` narrows to matching slugs while working.

### Shared measurement

`scripts/lib/sim-contrast.mjs` holds the one measurement, used by both this sweep
and `simdark-check`. Two callers measuring "the same" thing with two copies of the
maths is how a repo ends up with two answers and no way to tell which is right. It
runs inside the page via `page.evaluate`, so it must stay self-contained — no
imports, no closures over module scope.

Two calibrations in it are load-bearing and both were wrong at first:

- **Neutrality threshold 32, not 20.** Tailwind's grays are blue-tinted; gray-900
  is rgb(17,24,39), a channel spread of 22. At 20, gray-900 counted as an *accent*
  and every "1:1, invisible text on gray-900" result was filed under advisory.
- **Emoji are skipped.** An emoji paints itself and ignores `color` entirely, so
  scoring one against its tile measures nothing. Eleven of the original nineteen
  "accent" shortfalls were app-store tiles reported purely because a 🧩 sits on a
  purple square. Text characters like ✓ and ✕ *do* use `color` and stay in.

## Round two: the three edges, closed

The first version of this document ended with three things it did not measure.
Each one turned out to be hiding real defects, which is the argument against ever
leaving that list as a footnote.

### States behind interaction

Measuring each activity as it mounts is measuring the first screen. Everything a
guided lesson is *about* lives past it — the compose pane, the file picker, the
share sheet, the reading pane, the 2FA form, the crop tools, the downloads panel.

The sweep now walks each lesson forward by clicking its highlighted control, the
way the learner is being told to, and re-measures after every step. It stops as
soon as a click stops advancing the step counter, so a control that is not what
the step wants ends the walk rather than being hammered.

Coverage went from **2966 text runs to 7099**, across **155 steps past mount**. The
first walk found, in the four email lessons alone, three defects mounting could not
see: "Mark as spam" at 3.35:1, "Delete" at 4.41:1, and the celebration overlay's
congratulation at **1:1**.

That last one was partly a measurement bug and worth recording. The overlay is
`bg-black/30`, and the ground-finder skipped any layer under 0.85 alpha, so it
sailed past the scrim to the page's white and reported white-on-white — the same
wrong-layer mistake `contrast-check` made over the homepage photos, in a different
disguise. It composites translucent layers now. The honest ratio was 1.9:1, still a
fail, so the scrim went to `bg-black/60` (6.3:1) — which a celebration overlay
wanted anyway.

The full walk then surfaced a class the mount-only sweep never touched: semantic
colours at the -500/-600 step, which do not clear AA on white or on their own pale
tint. green-600 at 3.3:1, red-500 at 3.44:1, blue-500 at 3.68:1, yellow-500 at
1.84:1, and white on red-500/green-500/amber-500 between 2.15:1 and 3.76:1. **69
text tokens and 13 fills** moved one step darker, each with a light dark-mode
partner so the same class stays right on a gray-900 window.

### Non-text contrast (WCAG 1.4.11)

Now enforced, and scoped deliberately. 1.4.11 asks for 3:1 on "the visual
information required to identify a user interface component", which is not the same
as every border on the page:

- A **form field's** border is always scored. It is the only thing saying "you can
  type here", and for an audience that struggles to find the text box that matters
  more than anywhere else.
- A **button's** border is scored only when it is the sole boundary — boxed on all
  four sides and not filled. A filled button is identified by its fill.
- A button with only a *bottom* border is a list row, not a control outline. The
  first version scored those and reported every list separator in the course,
  which would have meant drawing hard dark rules through every list to satisfy a
  checker.
- Disabled controls are exempt, WCAG's own carve-out. The messaging app's "Start
  Chat" is meant to look muted until you tick somebody; darkening it to please a
  checker would make a disabled button look enabled.

Tailwind's default border is gray-200 — **1.24:1** on white. Every form field in
the course had an invisible boundary. The floor is `border-gray-500`: 4.83:1 on
white and 3.58:1 on the gray-900 dark window, so one value serves both themes.
`focus:border-blue-400` (2.43:1) went to blue-600; a focus indicator nobody can see
is the one border that has to be visible. **640 control borders** are now scored
every run.

### The failure pages

`/not-found` needs no help — any wrong URL renders it. `error.tsx` had no route at
all, so the page written to reassure somebody whose screen just broke was the one
page nothing could measure.

`app/dev/boom` throws on purpose, guarded for production like every other `/dev`
page. It throws **after mount**, and that timing is the point: a first-render throw
throws on the server too, so Next returns its own 500 document and `error.tsx`
never renders inside the root layout — no theme, no nav, and a measurement of a
page the product does not own. Throwing from an effect reproduces the error a
learner actually hits, the document is a normal 200, and what gets measured is the
real friendly page in the learner's own theme.

`PAGES` entries can now declare an expected status, so a route that breaks by
accident still fails the guard rather than being waved through.

## What is still not measured

- **Deep states behind conditional branches.** The walk follows the highlighted
  control, which is the lesson's happy path. A panel only reachable by doing
  something the lesson never asks for is not visited. `stray-check` goes off-path
  but does not measure colour.
- **Hover and active states.** Only the resting and focus appearance is scored.
- **The 45 activities with no simulator frame** to anchor to. They are reported as
  skipped rather than silently dropped, so the number is visible every run.
