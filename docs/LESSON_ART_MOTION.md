# Lesson art: motion, and the trap under it

The 28 lessons with no activity show a picture instead. Those pictures now move,
and the motion is the teaching — the callout pulses so a beginner's eye lands on
the part being named, the plug reaches for the socket and never gets there, a
bright segment runs along the map route from the green pin to the red one.

They also ship as SVG rather than WebP, which is why they stopped looking muddy.

This document is mostly about the two things that went wrong on the way, because
both of them look like they work right up until they don't.

---

## 1. What changed

| | Before | After |
|---|---|---|
| Format | `.webp`, quality 82 | `.svg`, vector, inlined into the page |
| Finish | film grain + 34% vignette (the photo-library finish) | no grain, 12% vignette (`lessonFinish`) |
| Motion | none | per-scene, purposeful |
| The two odd ones out | `power-button.png` / `charger.png`, loose 512px PNGs | generated scenes like the other 26 |

**Why the grain went.** `finish()` is what makes the 52 photo-library images read
as photography. On flat vector diagrams it is just noise on large areas of one
color, and the heavy vignette pulled all four edges toward gray — which is what
made the lesson set look dull beside the crisp UI it sits next to. Lesson art now
has its own `lessonFinish()`. It also has to be cheap: these are live SVG, so a
`feTurbulence` over 1200×800 would be re-rasterized by machines chosen for being
old.

**Why SVG.** Smaller than the WebP for this kind of drawing (part-screen
9,422B -> 1,253B gzipped), sharp at any zoom — a real consideration for an
audience that runs the browser at 150% — and the only format that can carry the
motion at all.

Two scenes were redrawn while the set was open, because they did not read:
`map-route`'s blocks sat on top of its streets so the map looked like beige
confetti, and `peripheral-trouble`'s laptop was a plain slab that read as a
filing cabinet.

---

## 2. Trap one: `prefers-reduced-motion` does not reach inside an image

The obvious way to make the motion switchable off is a media query inside the
SVG. **It does nothing.** Chromium does not propagate `prefers-reduced-motion`
into an SVG referenced as an image; the animation runs for everyone, including
the learner who explicitly asked it not to.

That was measured, not assumed:

```
prefers-reduced-motion: no-preference → animation RUNS
prefers-reduced-motion: reduce        → animation RUNS
```

The fix is to stop referencing it as an image. The art is **inlined into the
page**: the server reads the module's SVGs in `app/lessons/[slug]/page.tsx` via
`lib/lessonArtMarkup.ts` and passes the markup down, and `LessonMedia` renders it
inside a `role="img"` wrapper carrying the description. Inlined, the SVG is part
of the document, so its `prefers-reduced-motion` query is evaluated against the
page like any other, and honored.

An intermediate version used `<picture>` with a reduced-motion `<source>`
pointing at a second, motionless copy of every drawing. That worked, and it is
worth knowing it works — but it meant 28 extra files whose only job was to be the
same picture standing still. Inlining does it with one file, one media query, and
one fewer request.

**An inlined `<style>` is not scoped to its SVG.** Its rules apply to the whole
document, and keyframe names are global too. Unscoped, this set would have
published site-wide rules for `.row`, `.link`, `.face` and `.key`, and a
`@media (prefers-reduced-motion: reduce) { * { animation: none } }` that would
have silently switched off every animation on the site. `scopeCss` in the
generator namespaces every selector and keyframe to the scene's root id, and
`assertScoped` fails the build on anything that escapes.

---

## 3. Trap two: the first frame is a picture too

**A paused timeline holds frame 0 on screen indefinitely**, and timelines pause
for ordinary reasons — a background tab freezes `document.timeline` outright.

Where a keyframe set starts at `opacity: 0` — and most entrance animations
naturally do — that frame is not "the animation has not started". It is:

- a map with **no route on it**
- a certificate with **no seal**
- a cloud with **no folders in it**

Not a missing animation. A **drawing with a piece missing**, and worse than no
motion at all.

So: **no keyframe starts invisible.** Entrances begin a few pixels off and
slightly pale, which reads as motion when it plays and as a finished picture when
it does not. `assertPresentableFirstFrame()` in the generator throws at build
time on `0% { opacity: 0 }`.

### `forwards` is not a way around it

It looks like one: with no `backwards`/`both` fill, the start frame is never
painted before the animation runs, so a browser that skips the animation shows
the natural, finished styling.

But a *paused* animation has already started — the fill mode never comes into
it, and frame 0 is held. The guard therefore has **no fill-mode exemption**, and
the route is always fully drawn in the markup with only a brighter segment
travelling along it (the same trick the charger cable uses). That also fixed a
plainer problem: a draw-on plays once, so a learner who looks up three seconds
late has missed it. A travelling highlight repeats.

### A correction, kept on purpose

An earlier round of this work concluded something stronger and **wrong**: that
some browsers refuse to run CSS animations inside SVG-as-image at all. The
evidence was a Chrome showing these frozen at frame 0 while a plain DOM animation
on the same page moved 125px.

The page doing the measuring was **not visible**. `document.visibilityState`
was `hidden`, which stops `document.timeline` dead — every animation on that page
was frozen, including, when finally measured in the same breath, the "control"
that had appeared to move. It had been measured in an earlier call, when the page
happened to be visible.

A visible Chrome, headless and headed, animates SVG-as-image perfectly well:

```
headless=true  visibility=visible  as-image: ANIMATES   inline: ANIMATES
headless=false visibility=visible  as-image: ANIMATES   inline: ANIMATES
```

The lesson worth keeping: **a hidden page makes working animation and broken
animation look identical.** Assert `visibilityState` before concluding anything
from "nothing moved" — `motion-check` now does.

### One more: the animation must not contradict the lesson

`safe-payment` originally had the padlock swing shut. Closing it means showing it
**open** first, on the lesson whose entire point is that the closed one means
safe — and a paused timeline would hold it open. It now pulses gently, closed
throughout.

---

## 4. `npm run motion-check`

No other harness can see any of this. solve-check and friends drive the DOM and
never read a pixel; contrast-check samples colors on a page that is holding
still. An animation that quietly stopped working — or worse, one that kept
running for a learner with vestibular sensitivity — looks perfectly healthy to
every other gate this repo owns.

It asserts, over all 28 pieces of art:

1. every file the manifest promises is still served (28 files);
2. the page is **visible** before anything is concluded from stillness;
3. with motion allowed, the art is inline (`getAnimations()` only sees real DOM
   animations) and at least one is `running`;
4. with motion reduced, nothing is left running.

Needs `npm run dev` on :3000.

**`MOTION_NEGATIVE=1` is the negative control and has been watched to fail.** It
puts each picture back behind an image — exactly the regression a future
"simplify this to `next/image`" refactor would introduce — and reported all 8
sampled lessons still moving under reduced motion. If a run under that flag ever
comes back clean, this check has gone blind and must not be trusted.

The build-time guard was watched to fail too, on four cases: `opacity:0` with
`both` (caught), `opacity:0` with `forwards` (caught — the exemption that was
briefly there), a visible start (passed), and `opacity:0.5` (passed, i.e. the
regex does not trip on a decimal).

---

## 5. If you touch this

- Adding a scene: add it to `LESSON_MANIFEST` **and** `ANIM`. The generator
  throws if a piece of lesson art has no animation defined, so the two cannot
  drift apart.
- Changing a keyframe: the start frame is a picture the learner may see forever.
  Look at it.
- Adding a rule to a scene's CSS: it must be scoped to `#la-<file>`, or
  `assertScoped` fails the build. An inlined stylesheet is document-wide.
- After any change: `node scripts/generate-photos.mjs`, then `npm run
  motion-check`, then `python3 scripts/check-a11y.py`.
- The generator is seeded, so re-running it is byte-identical and the repo stays
  quiet.

One small landmine worth knowing: `scripts/check-a11y.py` finds images by regex,
so writing the literal image tag in a code comment makes it report an image with
no alt text. `LessonMedia`'s comment says "referenced as an image" for that
reason. Keeping the checker blunt is the right trade — it is a build gate, and a
gate that tries to understand comments is a gate that can be talked out of
failing.
