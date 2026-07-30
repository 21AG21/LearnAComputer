# Settings & visual-effect audit

After the [zoom bug](ZOOM_CONTROLS_AUDIT.md) — a control whose effect is applied
through a CSS mechanism that silently no-ops, where the lesson completes on
*state* not on anything visibly changing — I swept every other live visual
setting for the same shape. These are the features no automated harness can see:
solve-check drives the toggle and reads `data-sim-done`; it never checks that the
screen actually changed.

## Every live setting, measured

Each was toggled in a real browser and the effect confirmed by reading computed
style / rendered geometry, not by trusting the lesson to complete.

| Setting | How it's applied | Verdict |
|---|---|---|
| Dark Mode | `sim-dark` class on the desktop root | works (also covered by simdark-check) |
| Brightness | black overlay, opacity from the value | works — overlay 0 → 0.48 at 40% |
| Night Shift | orange overlay | works — overlay appears |
| Invert Colors | `filter: invert(1)` on the root | works |
| Increase Contrast | `filter: contrast(1.55)` | works |
| Color Filter (grayscale / warm) | `filter: grayscale(1)` / `sepia(...)` | works |
| Larger Pointer | custom `cursor` on the root | works |
| Bold Text | `font-weight: 600` on the root | works |
| Reduce Motion | `.reduce-motion` class + `@layer` CSS forcing durations to 0s | works — a `transition-colors` element reads `transition-duration: 0s` |
| **Text Size** | **was `font-size: N em` on the root** | **was broken across the computer — fixed** |
| Photo edits (brightness/contrast/rotate/crop/filters) | real `filter` / `transform` / aspect-ratio on the `<img>` | works |

## The bug: "Text Size" did not change the whole computer

The lesson promises, in as many words: *"Drag the slider right and every menu,
label and message grows together … this changes the whole computer."* It didn't.

Text Size set `font-size: ${scale}em` on the desktop root. `em` is
parent-relative — but the dock labels, the menu-bar clock, and every Tailwind
`text-*` class are **rem**-based (root-relative) and ignore an ancestor's
font-size. So only text that *inherited* its size grew (the Settings panel, which
is why it looked like it worked in the lesson), while the desktop chrome stayed
fixed. Measured at 140%:

| Element | old (`em`) | new (`zoom`) |
|---|---|---|
| Settings label | 16px → 31px (**1.96×** — see double-apply below) | 16 → 22px (1.4×) |
| Menu-bar clock | 36px → **36px** (no change) | 36 → 50px (1.4×) |
| Dock label | 12.5px → **12.5px** (no change) | 12.5 → 17.5px (1.4×) |

There was also a **double application**: FakeDesktop *and* SettingsApp each set the
`em`, so inside Settings the two stacked — 140% rendered at ~196% while the rest
of the computer (what little scaled) was at 140%.

## The fix: CSS `zoom` with size compensation

`zoom` scales the rendered box — rem, chrome, images and all — which is exactly
"make the whole computer bigger." Applied naively it overflows the fixed screen,
so the root's width/height are pre-divided by the same factor and the zoom brings
them back to a perfect fit:

```jsx
zoom: textScale / 100,
width:  `${1e4 / textScale}%`,   // 100% at 100, 71.4% at 140
height: `${1e4 / textScale}%`,
```

At the default 100% this is the identity (`zoom: 1`, `width: 100%`), so **no other
lesson is touched** — only the four Text-Size lessons ever raise it. SettingsApp's
own `em` was removed (the desktop root now owns the scaling; keeping it would
stack a second zoom). Verified: clock and dock both grow 1.4× at 140%, the desktop
still fills its frame, and the lesson completes.

## Why nothing caught it

Same reason as zoom: the lesson finishes when `textScale` crosses a threshold, not
when a pixel moves, and every harness either drives the DOM (solve-check) or reads
colors (contrast checks) — none measures rendered text size. Both fixes were
verified by measuring `getBoundingClientRect` before and after in a real browser.
