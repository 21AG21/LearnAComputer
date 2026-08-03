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
| Format | `.webp`, quality 82 | `.svg`, vector, plus a `-still.svg` |
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

**Why SVG.** Smaller than the WebP for this kind of drawing, sharp at any zoom
(a real consideration for an audience that runs the browser at 150%), and the
only format that can carry the motion at all.

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

The fix is `<picture>`, whose `source media` is resolved against the *page*:

```html
<picture>
  <source media="(prefers-reduced-motion: reduce)" srcset="/lesson/map-route-still.svg">
  <img src="/lesson/map-route.svg" alt="…">
</picture>
```

Measured again, and this one holds — note that only one file is fetched either
way, so the correctness costs no bandwidth:

```
no-preference → fetched [/anim.svg]   pixels MOVE
reduce        → fetched [/still.svg]  pixels still
```

This is why `LessonMedia` steps outside `next/image`: the optimizer has nothing
to do to a vector, and it cannot express an art-direction swap. The in-file media
query is kept anyway as belt and braces — harmless where ignored, correct where
honored.

The still is the same markup with the `<style>` block left out. That is what
keeps the two files honest with each other, and it imposes the rule that every
start position lives in a keyframe, never in the markup.

---

## 3. Trap two: the first frame is a picture too

This is the expensive one.

**Some browsers do not run CSS animations inside an SVG referenced as an image.**
The same `map-route.svg` animated under Playwright's Chromium and sat frozen at
frame 0 in another Chrome build on the same machine, at the same hour. A plain
DOM animation on the same page ran fine in the frozen browser (a probe div moved
125px in 800ms), so this is specific to SVG-as-image, not to animation generally.

Where a keyframe set started at `opacity: 0` — and most entrance animations
naturally do — "frozen" did not mean "no animation". It meant:

- a map with **no route on it**
- a certificate with **no seal**
- a cloud with **no folders in it**

Not a missing animation. A **broken drawing**, and worse than no motion at all.

So: **no keyframe starts invisible.** Entrances begin a few pixels off and
slightly pale, which reads as motion where motion works and as a finished picture
where it does not. `assertPresentableFirstFrame()` in the generator throws at
build time on `0% { opacity: 0 }`.

### `forwards` is not a way around it

It looks like one. The reasoning is: with no `backwards`/`both` fill, the start
frame is never painted before the animation runs, so a browser that skips the
animation shows the element's natural (finished) styling.

That reasoning is wrong in practice, and the map disproved it on screen. The
frozen browser had **already started** the animation — it just never advanced the
timeline — so frame 0 was applied and held. The route drew itself for exactly one
round of testing and then showed a map with no route.

The guard therefore has **no fill-mode exemption**, and the route is now always
fully drawn in the markup with only a brighter segment travelling along it (the
same trick the charger cable uses). Anything that must always be visible has to
be visible in the markup.

### One more: the animation must not contradict the lesson

`safe-payment` originally had the padlock swing shut. A frozen first frame is
then an **open** padlock, on the lesson whose entire point is that the closed one
means safe — the picture would teach the opposite of the words beside it. It now
pulses gently, closed throughout.

---

## 4. `npm run motion-check`

No other harness can see any of this. solve-check and friends drive the DOM and
never read a pixel; contrast-check samples colors on a page that is holding
still. An animation that quietly stopped working — or worse, one that kept
running for a learner with vestibular sensitivity — looks perfectly healthy to
every other gate this repo owns.

It asserts three things, over all 28 pieces of art:

1. every file the manifest promises is actually served (56 files);
2. with motion allowed, the **animated** file is fetched and the pixels move;
3. with motion reduced, the **still** is fetched and nothing moves.

Needs `npm run dev` on :3000.

**`MOTION_NEGATIVE=1` is the negative control and has been watched to fail.** It
strips the reduced-motion `<source>` from every `<picture>` before measuring —
exactly the regression a future "simplify this back to `next/image`" refactor
would introduce. It reported 16 findings across both axes (wrong file fetched
*and* pixels moving). If a run under that flag ever comes back clean, this check
has gone blind and must not be trusted.

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
