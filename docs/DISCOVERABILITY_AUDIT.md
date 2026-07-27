# Discoverability audit

Reported: *"a lot of the assessments for the units and the ones at the end are
hard to do because there isn't a guide, like what website do I open for the bus
timetable?"*

That is a real defect, not a difficulty preference. This is the audit, the fix,
and the check that stops it recurring.

---

## The distinction that was missed

Assessment lessons follow a rule from `CLAUDE.md`: **state outcomes, never
clicks.** "There is a folder called Travel", not "Click New Folder". That rule is
correct and stays.

It was applied to something it does not cover. There are two different things an
objective can withhold:

| | Withholding it tests | Verdict |
|---|---|---|
| **Where a control is** — which button archives an email, how to resize a window | the skill the unit taught | Correct to hide |
| **Arbitrary data** — a fictional domain, a name to invent, a search term, a time | recall of trivia | **Wrong to hide** |

`citytransit.example` is invented. It exists in no learner's world. Asking
someone to produce it from memory tests whether they memorised a made-up string
five units ago — not whether they can use a browser.

The failure was treating both columns as one.

---

## What the audit found

A script classified every step in all 197 lessons by whether its target is
**pointed at** (visible on screen — an email subject, a photo label, an app tile,
a file, a WiFi network) or **typed** (a URL, a name, a search term, a time).
Typed values were then checked against the step's own text and the lesson brief.

**10 flagged. 3 were false positives on inspection:**

| Lesson | Value | Verdict |
|---|---|---|
| `pdf-practice`, `unit-12-assessment-sim` | `ApplePieRecipe.pdf` | Fine — the only PDF in the Downloads panel, and "the recipe PDF" identifies it |
| `email-assessment` | `meeting is on Thursday` | Fixed anyway — see below |

**7 real:**

| Lesson | Mode | Problem |
|---|---|---|
| `final-browser` | assessment | `citytransit.example` unreachable |
| `final-browser` | assessment | `gardeningtips.example` unreachable |
| `unit-12-assessment-sim` | assessment | `citytransit.example` unreachable |
| `unit-7-assessment` | assessment | album must be named `Garden`, never stated |
| `unit-8-assessment` | assessment | must search for `chat`, never stated |
| `final-calendar` | assessment | time must be `9:00 AM`, never stated |
| `reply-forward` | **guided** | body must contain the literal word `Yes`; the step said only "Type your reply" |

`reply-forward` is the worst of them because it is a *teaching* lesson. A learner
typing "Sure, see you Tuesday!" fails with no explanation of why.

---

## Fix 1 — the sim, not the wording

The browser had 16 sites and listed **8** on its new-tab page:

```
FAVORITES = [shop, google, wikipedia, weather, news, recipes, library, bookshop]
```

`transit`, `garden`, `petnews`, `bank` and `support` existed with full content —
City Transit has a complete Route 12 timetable with fares — and were reachable
only by typing a domain you had to already know.

Now **13 tiles**, each showing its address beneath the name, in a 4-column grid.
A learner asked to put the bus timetable on screen scans the page and sees
**City Transit — citytransit.example**.

Two sites stay off deliberately:

- `freegames.example` — the scam site. Lessons navigate there on purpose; it does
  not belong in a list of favourites, and having it one click away undercuts the
  lesson where finding it is the point.
- `pickacolor.example` — an activity page, not a destination.

This is the fix that generalises: it repairs every existing browser assessment
and every future one, and it makes the sim behave like a real browser, where the
new-tab page is exactly how people reach sites they do not type from memory.

## Fix 2 — give the learner the data

Assessment briefs now name the givens explicitly, marked in bold so they read as
supplied data rather than instructions:

> You are given the two sites by name: **City Transit** for the timetable and
> **Gardening Tips** for the article. Both sit on the browser's new-tab page.
> How you reach them, and everything after, is yours.

The objectives are unchanged — still "The bus timetable is on screen", still no
highlighting, still any order. What changed is that the learner is no longer
asked to invent a fact.

`**bold**` did not render before this — `MessageBody` emitted raw text, so the
asterisks would have shown literally. A small `Rich` component in
`components/DrDigital.tsx` now parses them into `<strong>`.

## Fix 3 — the part that makes it stick

`scripts/check-lessons.py` now fails the build on this class of defect:

```
UNGIVEN VALUE: <slug> step '<action>' needs '<value>', which appears in
neither the step text nor the lesson brief
```

It maps 21 actions to the field carrying their typed value, exempts empty values
and the `"any"` wildcard, and exempts `navigate` when the URL is on the
new-tab page — with `BROWSER_FAVORITES` in the script kept in sync with
`FAVORITES` in the component.

It works: on first run it failed `email-assessment`, the case I had judged a
false positive. The step listed which duplicate words to delete but never gave
the sentence they should produce, so a learner could reasonably stop one edit
short. The step now names the target line. **The validator caught something my
own reading had waved through**, which is the argument for having it.

---

## Verified in the browser

Ran `final-browser` — the lesson the complaint was about — from a clean start:

1. The brief renders "City Transit" and "Gardening Tips" as real `<strong>`
   tags, no stray asterisks.
2. Opening the browser from the dock shows 13 favourites, each with its address:
   **City Transit · citytransit.example**.
3. Clicking that tile loads the Route 12 timetable and moves the counter to
   **OBJECTIVES: 1 OF 6 DONE** — with no prior knowledge of the domain.

`npx tsc --noEmit`, `npm run lint` (0 errors), `check-lessons.py` (197 lessons)
and `npm run build` all clean.

---

## Rule for future lessons

Added to the assessment-authoring rules:

> Hide **where the controls are**. Never hide **which thing to act on**. If the
> learner has to type it and could not have seen it on screen — a site, a name,
> a search term, a time — state it in the brief as a given. `check-lessons.py`
> enforces this.
