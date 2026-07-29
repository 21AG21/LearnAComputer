# The buyer with crossed arms

Every other harness in this repo asks *can a learner who does the right thing
finish?* This one asks the opposite question, and it is the question that
decides whether the product earns money:

> **What does somebody find who is looking for a reason to say no?**

They do not follow the demo path. They click the pages nobody rehearses, mistype
a URL, use the keyboard because they always do, shrink the window, and open the
developer console while you are talking. None of that is covered by
solve-check, mission-check, demo-check or desktop-check — all of which prove
the product works when it is used as intended.

Run it: `npm run hostile-check` (dev server on :3000).

## What it checks, and why each one costs a sale

| Check | The sentence it prevents |
|---|---|
| Console errors on every page | *"It's throwing errors — is this finished?"* Said while looking at your laptop. |
| Failed network requests | Same, plus "what is it talking to?" |
| Page renders more than a stub | A blank frame reads as broken, whatever the cause. |
| No sideways scrolling | A page that scrolls horizontally looks amateur at a glance. |
| No raw `undefined` / `NaN` / `Error:` in visible text | The single most damaging thing a prospect can spot. |
| Every page has an `<h1>` | Screen readers announce where they landed; so does Google. |
| Browser tab is not the bare brand name | Twelve identical tabs during a demo is a papercut. |
| First Tab reaches something, visibly | This buyer's learners include people who cannot use a mouse. |
| Mistyped lesson URL explains itself | An old link in an email must not look like a dead product. |
| Narrow window explains itself | Somebody *will* open it on a laptop with a small window. |

Severity is `blocker` / `serious` / `polish`; polish alone does not fail the
run, the other two do.

## Findings, first run (2026-07-28)

**Fixed in the product:**

- `/playground` had no `<h1>` at all. The desktop fills the page, so there was
  nothing for a screen reader to announce and nothing for a search result to
  show. Now a visually-hidden heading — `sr-only`, never `display:none`, which
  would remove it from the accessibility tree along with everything else.
- The browser tab on `/certificate` just said "LearnAComputer". That is the one
  page people deliberately keep open while they print. It is a client
  component and cannot export metadata, so the title lives in a sibling
  `layout.tsx`.
- The site-wide fallback title said only the brand name. It now says what the
  site *is*, which is what a search result shows.

**Two harness lies, fixed in the harness:** the analytics beacon is fetched
from Vercel's CDN, which this sandbox blocks — it works in production and a
blocked beacon breaks nothing, so flagging it on all fifteen routes drowned
real findings. And the 404 check read the page before it rendered, then
complained about wording ("This page is not here") that is better than the
wording it was looking for.

**Checked and found genuinely good** — worth knowing, because these are the
attacks a skeptic actually reaches for:

- **"So it certifies nothing."** Certificates are gated on real completion:
  only units where every lesson is finished offer one, and the whole-course
  certificate needs the whole course. You cannot print an unearned one.
- **"Can't they just skip everything?"** Skipping an activity does *not* mark
  it complete — `handleNext` only records completion for lessons with no
  activity to gate on. A skipped lesson stays unfinished, so it never counts
  toward a certificate.
- **A mistyped lesson URL** returns a real 404 with: *"Either the address has a
  typo in it, or the page moved. Nothing is broken and nothing you did caused
  this — your progress is exactly where you left it."*
- **Refreshing mid-module keeps your place** (verified at lesson 5 of 9).

## The one that mattered most

Pressing **Next** twice quickly advanced **two** lessons. A whole page of
teaching went by unseen, with nothing on screen to say it had.

This is not a rare edge case for this audience — it is the default behavior of
the people the course is written for. Unit 1 *teaches double-clicking*; learners
who have just been taught to double-click things then double-click everything,
including Next. Nobody reads a lesson in a fifth of a second, so a second press
that fast is the tail of a double-click, not a second intention. `handleNext`
now ignores it, while a deliberate press a beat later still advances. Verified
both ways.

## What this audit does not cover

Honesty about the edges, so nobody mistakes a green run for proof of everything:

- It does not judge **taste**. A page can pass every check here and still look
  plain. The catalog and dashboard chrome remain on the worst-screen watchlist
  in `GOAL_STATE.md`.
- It does not test **signed-in** journeys. Sign-in needs a real email round
  trip, so accounts, classes and sync are verified by hand, not here.
- It does not replace the **contrast** pass (`scripts/contrast-check.mjs`) or
  the reading-level gate in `check-lessons.py`.
- A green run means *nothing cheap is visibly wrong*. It is a floor, not a
  ceiling.
