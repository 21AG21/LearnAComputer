# Accessibility audit — images, landmarks, keyboard

Triggered by a plain request: "make sure we are ADA compliant — images with
descriptions for the blind, all that stuff." This is the record of what was
already right, what was fixed, and — importantly — what a claim of "ADA
compliant" still requires that this pass does **not** deliver.

## The honest headline

**This is not a certification.** "ADA compliant" is a legal conclusion that comes
from a formal, third-party WCAG audit, which `SALES_PLAYBOOK.md` correctly lists
as still on the roadmap. This pass made the product **materially more
accessible** and added a build gate so the most common regression (an image with
no text alternative) cannot ship again. Do not let the sales copy claim
certification until a real audit signs off. The product's edge is that its claims
survive checking; an accessibility overclaim is the worst possible place to break
that.

## What was already right (before this pass)

The codebase was not starting from zero — a lot of the hard parts were already done:

- **Every lesson-art image already had descriptive alt text** — `LESSON_ART` in
  `lib/lessonArt.ts` (generated) carries lines like "A laptop with the keyboard
  outlined," and the two lessons using an inline `media` block both describe their
  picture.
- **All ~70 UI icons are `aria-hidden` by default** — `base()` in
  `components/Playground/Icons.tsx` sets it, so glyphs never spam a screen reader,
  and icon-only buttons (the dock, window controls) carry their own `aria-label`.
- **Contrast is measured and enforced** in both themes and inside every activity
  (`contrast-check.mjs`, `sim-contrast-check`, `simdark-check`).
- **Focus visibility** was already policed by `hostile-check`.
- `role="img"` + label on the Dr. Digital mascot SVG; `lang="en"` on `<html>`;
  the certificate name field wrapped in a real `<label>`; `TextEditorTask`,
  `EditFileTask`, and `CopyPasteTask` inputs already named.

## What this pass fixed

| Issue | WCAG ref | Fix |
|---|---|---|
| No way to skip the nav | 2.4.1 Bypass Blocks | A "Skip to main content" link, first in the DOM, off-screen until focused, jumping to the `<main>` landmark (`app/layout.tsx`). |
| **Nested `<main>` landmarks** — `PageTransition` renders a `<main>`, and `page.tsx` / `not-found.tsx` / `error.tsx` each rendered a second one inside it | 1.3.1 Info & Relationships | The three inner ones became `<div>`; `PageTransition` now owns the single `<main id="main-content" tabindex="-1">` for every route. |
| Two typing controls named only by a placeholder (placeholders are not a reliable accessible name) | 4.1.2 Name, Role, Value | `aria-label` added to the `TypeTextTask` field and the `UrlNavigatorTask` address bar. |
| No machine guard against a future image with no alt | — | `scripts/check-a11y.py` (below). |

## The regression gate — `scripts/check-a11y.py`

Every existing a11y harness measures color or focus; none asked whether an image
has a text description. This does, statically, over `app/` and `components/`:

- fails on any `<img>` or Next `<Image>` **missing** the `alt` attribute;
- fails on any lesson JSON `media` block with a `src` but empty/missing `alt`.

It **allows `alt=""`** — the correct, intentional mark for a decorative image (the
hero photo behind the headline, a dock tile whose button already carries the
name). The violation is a *missing* attribute, which leaves a screen reader
reading out a filename.

It refuses false positives on the icon components: `<Image\b` will not match
`<ImageIcon`. Watched to fail — a probe `<img src>` with no alt is caught on the
right line, and `<ImageIcon>` beside it is correctly ignored.

```sh
python3 scripts/check-a11y.py   # exits 1 on any undescribed image
```

## Verified in the browser (not just built)

On a running dev server, over `/`, `/lessons`, `/certificate`, `/dashboard`,
`/feedback`, `/playground`:

- **exactly one `<main>`** per route (id `main-content`), nesting gone;
- the **skip link present** on every route; its generated rule
  `.focus\:top-3:focus { top: 0.75rem }` confirmed in the CSSOM, so it slides
  on-screen on real focus (it reads as off-screen in the headless pane only
  because that tab doesn't hold OS focus — `document.hasFocus() === false`);
- **zero `<img>` missing alt** on any route;
- `hostile-check` still green (skip link adds no sideways scroll, focus intact),
  `contrast-check` green in both themes, production build clean.

## What a full audit would still need (the roadmap, stated honestly)

This pass did **not** make the interactive simulations fully screen-reader
operable. The guided desktop, browser, files and email sims are built from
clickable elements a sighted mouse/keyboard user drives; a blind user on a screen
reader cannot complete most of them today. Closing that is a large, separate
effort (roles, live-region step announcements, focus management inside each sim).
Until then, and until a third party audits the whole product against WCAG 2.1 AA,
"accessible and improving" is the honest phrasing — not "compliant."
