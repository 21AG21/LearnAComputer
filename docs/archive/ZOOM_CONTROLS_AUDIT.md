# Zoom controls audit

A sweep of every zoom in/out button on the site. Five places render one; two
were broken in a way every automated check was blind to, because **the lesson
completes on zoom *state*, not on whether the learner can see anything change** —
so solve-check stayed green while the text a learner was told to enlarge never
moved.

## The controls

| Where | Mechanism | Verdict |
|---|---|---|
| `GuidedBrowserTask` — page zoom (toolbar +/−) | was `font-size: N%` → now CSS `zoom` | **was broken**, fixed |
| `GuidedBrowserTask` — PDF viewer +/− | was `font-size: N%` → now CSS `zoom` | **was broken**, fixed |
| `FileViewer` (Files) — PDF viewer +/− | was `font-size: N%` → now CSS `zoom` | **was broken**, fixed |
| `DesktopBrowserZoomTask` (pinch-zoom lesson) | `transform: scale()` | works, unchanged |
| `BrowserSimulator` generic zoom control | props | dead — no caller passes `onZoomIn`/`onZoomOut`, so it never renders |

## Bug 1 — a percentage font-size cannot scale rem text

The three viewers scaled their content with `style={{ fontSize: `${zoom}%` }}`.
But the page bodies, the bus timetable, the PDF recipe are built almost entirely
from Tailwind `text-xs` / `text-lg` / `text-xl` classes, and **those are
rem-based — root-relative, not parent-relative.** A parent's `font-size: 150%`
changes nothing for a child that pins its own size in rem.

Measured on the transit lesson's bus timetable (`text-xs`):

| Zoom label | `font-size: N%` (old) | CSS `zoom` (new) |
|---|---|---|
| 100% | 16px | 16px |
| 150% | 16px (**unchanged**) | 24px |
| 200% | 16px (**unchanged**) | 32px |

The learner reads *"The bus times are hard to read — click the + to zoom in,"*
clicks +, the label says 150%, and the times are exactly as small as before. The
fix is CSS `zoom`, which is what a real browser's zoom does: it scales the
rendered box, rem text included. Verified live — the bus times now grow
12 / 16 / 20 / 24px across 75 / 100 / 125 / 150%.

## Bug 2 — pointing the learner at the wrong button

`pdf-practice` opens the recipe in a PDF viewer that is a separate overlay
(`absolute inset-0 z-30`), floating above the web page. Its zoom-in step,
though, highlighted the **browser toolbar's** + — which zooms the page *behind*
the overlay. Measured: clicking the highlighted + took the hidden website to
175% while the recipe title stayed 25.8px, and the step reported done anyway.
The solver "passed" because it clicks the ring through the DOM and never has to
see that nothing moved — the same blind spot behind
[the redo and file-arrow bugs](SOLVER_MASKED_BUG_AUDIT.md).

Fixed by moving the highlight and the step-completion onto the PDF viewer's own
+ (the one a learner looking at the recipe actually sees), and suppressing the
toolbar +'s ring while a PDF overlay is open. The PDF buttons also gained
`aria-label`s. Verified live: the ring now sits on the PDF's +, clicking it
enlarges the recipe, and the step completes; solve-check and ring-check still
pass `pdf-practice` and the four web-page zoom lessons.

## Why nothing caught this

Every zoom lesson finishes when the zoom **number** crosses a threshold
(`zoom >= 150`), not when a pixel grows. solve-check drives the number and
reports done; ring-check confirms the button is on screen; neither asks *did the
content the learner is reading actually get bigger.* The gap is the same shape as
the sim-contrast one — a whole visual behavior that only a rendered-size
measurement can see. These fixes were verified by measuring `getBoundingClientRect`
before and after, in a real browser, at desktop width.
