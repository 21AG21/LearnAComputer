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

## What is still not measured

- **`/error` and `/not-found`.** `contrast-check` cannot route to them. The one
  low-contrast string there (the error digest) was fixed by the same rule, but by
  hand, not by measurement.
- **States behind interaction.** The sweep measures each activity as it mounts. A
  panel that only appears after four clicks is not reached. `simdark-check` covers
  more of that ground for the dock apps by opening each one; deeper states are
  still unmeasured.
- **Non-text contrast (WCAG 1.4.11).** Borders, icons and focus rings against
  their backgrounds are not scored. Everything checked so far clears 3:1 by
  inspection, but nothing enforces it.

None of these is a reason to distrust the green. They are the honest edge of what
is currently measured.
