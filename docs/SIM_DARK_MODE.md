# Dark mode inside the practice computer

Unit 9's *System Settings Overview* teaches the learner to open Settings, find
Appearance, and turn on Dark Mode. Until this round, that toggle repainted four
things — the wallpaper, the menu bar, the dock, and the Settings app itself — and
stopped. Open Mail from the dock immediately afterwards and a blazing white
window landed on the dark desktop.

The most damning evidence was in the lesson's own copy. Dr. Digital's success
line read:

> Dark mode is on, and the menu bar, dock and background all followed.

That sentence lists exactly the things that worked and declines to mention the
apps. It is a product admitting a feature is half-built, in the voice of the
character who is meant to be reassuring the learner. A buyer who clicks the
toggle the lesson just taught, then opens any app, finds the gap in about four
seconds.

## Why this was invisible to every existing harness

| Harness | Why it could not see this |
|---|---|
| `solve-check` | Drives the DOM to finish lessons. Never reads a color. |
| `ring-check` | Measures whether a highlight is on screen. Geometry, not color. |
| `stray-check` | Clicks the wrong things. Checks for a way forward, not a palette. |
| `desktop-check` | Counts windows and z-order. |
| `mount-check` | Asks only whether a component throws. |
| `mission-check` | Runs on the learner's real machine, outside the sim. |
| `contrast-check` | Measures the **site**, in the **site's** two themes. Never touches the setting inside the simulator. |

Twelve gates, all green, on a feature that was visibly half-finished. This is the
recurring shape of the bugs in this repo: the harnesses check that the product
*works*, and this one did work — it just looked broken.

## `sim-dark:`, and why it is not `dark:`

Two dark modes exist here and they are independent in both directions:

- `dark:` follows the learner's browser and the site's own theme toggle.
- **`sim-dark:`** follows the practice computer's Dark Mode setting, which lives
  in the simulated Settings app and which Unit 9 teaches the learner to flip.

A learner reading the site in light mode must be able to put the practice
computer into dark mode; someone reading in dark mode must still get a light
practice computer until they change that setting themselves. Anything else and
the lesson's own toggle appears to do nothing.

So this could not reuse Tailwind's `dark:`, and the sim root could not simply
carry the `dark` class: `html.dark` is an ancestor of everything, and the class
strategy has no way to switch dark back *off* for a subtree.

`tailwind.config.ts` therefore registers a scoped variant:

```ts
addVariant("sim-dark", ["&.sim-dark", ".sim-dark &"]);
```

`FakeDesktop`'s root gets `sim-dark` when the setting is on. Everything the
learner can open lives inside that element, so one class reskins the windows,
their title bars, and the apps.

**Both halves of that array are needed, and the missing one was a real bug.**
`.sim-dark &` is a descendant selector, so it does not match the element carrying
the class. `FakeDesktop`'s root has `text-gray-900 sim-dark:text-gray-100`; with
only the descendant half, the second class never applied, the root stayed
`gray-900`, and every app that inherited its text color drew gray-900 words on a
gray-900 window. Invisible text, in five apps. `simdark-check` caught it in the
plumbing of the very change it was written for.

### Additive on purpose

Every use is a `sim-dark:` class **added beside** the light one, never a
replacement. The light-mode stylesheet is byte-identical to before, so this
reskin cannot regress the 99% of the course that never touches the setting. That
property is worth more than the brevity of a token system, and it is why this was
not done by renaming `bg-white` to `bg-surface` everywhere.

### The default divider color

The simulated apps carry roughly 190 *colorless* border utilities — plain
`border-b`, `border-r`, `border` — because a divider that wants "the usual gray"
says so by leaving the color off. Tailwind's preflight paints all of them
`#e5e7eb`, a bright white hairline on a gray-900 window. Pairing 190 of them by
hand is 190 edits and a standing invitation to forget the 191st, so `globals.css`
sets the default once:

```css
@layer base {
  .sim-dark *, .sim-dark ::before, .sim-dark ::after { border-color: #374151; }
}
```

`@layer base` is the whole trick, and it was verified in the browser rather than
assumed:

| selector | result | why |
|---|---|---|
| `border-b` (colorless) | `#374151` | picks up the base rule |
| `border-b border-blue-200` | stays blue | utility layer wins at equal specificity |
| `border-b border-gray-200` | stays `#e5e7eb` | it named a color, so it keeps it |
| `border-transparent` | stays transparent | same |

Move that rule out of the base layer and it starts overriding deliberate colors.

## Where the line runs: chrome follows, paper does not

A real browser in dark mode darkens its tabs, address bar and menus and leaves
the websites you visit looking how their authors made them. A real PDF viewer
darkens its toolbar and leaves the page white. The reskin follows the same rule,
because it is both correct and a large reduction in surface area — most of
`GuidedBrowserTask`'s 258 neutral classes are website bodies, and darkening them
would have been wrong as well as expensive.

Surfaces that stay light **on purpose** are marked in the DOM with
`data-sim-paper`:

| Marked | What it is |
|---|---|
| `GuidedBrowserTask` website wrapper | a web page |
| `BrowserSimulator` page slot | a web page |
| the two PDF pages | paper |
| `FileViewer`'s budget table | a rendered document |
| `Dock`'s icon tiles | app artwork; no OS recolors app icons |

The marker is the difference between "light because nobody got to it" and "light
because that is what the thing is". `simdark-check` skips anything inside one.

A website wrapper also pins `text-gray-900`, so the hundreds of unpaired
`text-gray-*` classes in the page bodies keep meaning what they say and nothing
inherits the desktop's light text onto white paper.

### The marker's dangerous direction is *too broad*

The first version put `data-sim-paper` on the browser's whole page area. That
area also renders three things the browser generates itself — the new-tab page,
the "not in the practice browser" page, the reload spinner. The new-tab page kept
a white ground while the chrome pass gave its text light colors, so the Favorites
tiles were white-on-white at 1.05:1 — **and the marker told `simdark-check` to
skip precisely that region, so the check reported the browser clean.**

A screenshot caught what the check could not. Two consequences:

1. Keep the marker on the narrowest thing that is genuinely paper. The browser's
   own pages are chrome and follow the setting.
2. `simdark-check` now prints how many elements it skipped on **every** line,
   passes included, so an over-broad marker shows up as a number rather than as
   silence. The browser's measured text-node count went from 21 to 48 when this
   was fixed — that jump is the signal the count exists to make visible.

## `npm run simdark-check`

Turns on Dark Mode through the real Settings UI, then opens each of the nine
other dock apps and asks two questions inside its window:

1. **Is anything still light?** Any visible element painting a near-white
   *neutral* background of its own, at least 400px², not inside `data-sim-paper`.
2. **Is every word still readable?** For each text node it walks ancestors to the
   first opaque background-color and scores WCAG contrast; below 4.5:1 (3:1 for
   large text) is a finding.

The second question is the one that catches the subtler bug — pairing a surface
but not the text on it, which reads to a learner as "the app is broken" rather
than "the app is light".

### Two calibrations that were wrong at first, and both hid real findings

**Neutrality threshold.** Only neutral surfaces are this check's business; a
pastel accent that deliberately stays put (the pill on today's date, an orange
"Ads" chip, a yellow highlight) is not a defect. The first version reported all of
them: 200 findings, about four of them real. But the threshold was 20, and
Tailwind's grays are slightly blue — gray-900 is rgb(17,24,39), a channel spread
of **22**. So gray-900 was classified as an accent, which quietly filed every
"1:1, invisible text on gray-900" result under advisory. The noise was hiding the
only signal the check exists to give. It is 32 now: the whole gray ramp counts as
neutral, real tints (orange-100 spreads 42, blue-100 spreads 63) do not.

**Faint text direction.** The bulk reskin mapped `text-gray-400` down to
`sim-dark:text-gray-500`, making the dimmest text on the screen dimmer still on a
dark ground — 3.67:1, under AA, in 35 places. On a dark theme faint text moves the
*other* way. gray-400 on gray-900 is 7:1, so the honest partner turned out to be
no partner at all, and all 35 were unwound.

### The advisory bucket

Text short of AA on a **saturated** ground (white on blue-500 at 3.68:1, an emoji
on a colored app tile) is printed separately and does not fail the run. Those read
identically with Dark Mode off, so failing here would blame this reskin for a
light-mode shortfall. They belong to `contrast-check`'s remit. Nineteen such runs
exist; the information is not lost, it is just not this gate's.

### Flags

- `SIMDARK_NEGATIVE=1` — the negative control, **watched to fail: 69 findings
  across all nine apps.** It restores the white on every `sim-dark:bg-gray-800`
  surface, which trips both halves at once because the text on those surfaces
  stays light. A clean run under this flag means the check is blind and its
  all-clear means nothing.
- `SIMDARK_VERBOSE=1` — prints each finding's class list.
- `SIMDARK_SHOTS=<dir>` — a screenshot per app. **Worth doing after any change
  here**: the new-tab bug above was found by looking, not by measuring.

Current state: **9/9 apps, 0 light surfaces, 0 unreadable text.**

## What changed

- `tailwind.config.ts` — the `sim-dark` variant.
- `app/globals.css` — the base-layer divider color.
- `FakeDesktop` — the `sim-dark` class plus a `text-gray-900` baseline, which is
  a no-op in light mode (`<body>` already resolves to gray-900) and stops the sim
  borrowing a text color from the *site's* theme.
- `DesktopChrome` — the menu-bar hover states were `dark:`, so they lit up
  white-on-white whenever someone read the site in dark mode with the sim still
  light. Now `sim-dark:`.
- `DraggableWindow`, `AppWindow`, `WindowControls` — window chrome, with the
  focused window's border going *lighter* in dark mode rather than darker.
- `FakeDesktop`'s WiFi / battery / calendar panels — each pale header tint gained
  a dark counterpart of the same hue, so the panel stays recognizable either way.
- The nine dock apps: `GuidedMessagingTask`, `GuidedEmailTask`,
  `GuidedPhotosTask`, `GuidedAppStoreTask`, `GuidedCalendarTask`,
  `GuidedNotesTask`, `FileManager`, `FileViewer`, and the browser's chrome in
  `BrowserSimulator` + `GuidedBrowserTask`.
- `Dock` — `data-sim-paper` on the icon tiles.
- `scripts/simdark-check.mjs`, `npm run simdark-check`.
- `content/lessons/system-settings.json` — the success line no longer lists only
  the parts that worked.

## When to run it

After touching `SimThemeContext`, any `sim-dark:` class, the base-layer divider
rule, a `data-sim-paper` marker, or any app reachable from the dock. It is the
only harness that looks at the practice computer's own colors.
