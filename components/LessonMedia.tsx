interface LessonMediaProps {
  src: string;
  alt: string;
  caption?: string;
  /** The same drawing, holding still, for a learner who asked for less motion. */
  still?: string;
}

/**
 * The picture beside a lesson that has no activity.
 *
 * ## Why `<picture>` and not `next/image`
 *
 * The generated lesson art animates, and the animation is the teaching: the
 * callout pulses so the eye lands on the part being named, the route draws
 * itself, the plug reaches for the socket and never gets there. That has to be
 * switchable off, and the obvious way to do it does not work — **Chromium does
 * not propagate `prefers-reduced-motion` into an SVG referenced as an image**,
 * so a media query inside the file is simply ignored and the animation runs for
 * everyone. That was measured with Playwright, not assumed.
 *
 * (The prose here says "referenced as an image" rather than naming the tag
 * because `scripts/check-a11y.py` scans for that tag by regex and would count a
 * mention in a comment as an image with no alt text. Keeping the checker blunt
 * is the right trade: it is a build gate, and a gate that tries to understand
 * comments is a gate that can be talked out of failing.)
 *
 * `<picture>` resolves `source media` against *this* page, where the preference
 * is real. The browser then downloads exactly one of the two files: the still
 * for a reduced-motion learner, the animated one for everybody else. No
 * client-side state, no hydration mismatch, no double fetch — which is why this
 * is worth stepping outside `next/image` for. (These are vectors; there is
 * nothing for the image optimizer to do to them anyway.)
 *
 * There is deliberately no border. `object-contain` letterboxes the picture
 * inside its box, so a border drawn on that box frames mostly empty space. The
 * art carries its own soft background, and the pane it sits in already has a
 * left border and a tinted ground.
 */
export default function LessonMedia({ src, alt, caption, still }: LessonMediaProps) {
  return (
    <div className="w-full min-w-0 h-full flex flex-col items-center justify-center gap-4 p-8">
      <picture className="flex min-h-0 w-full max-w-lg flex-1 items-center justify-center">
        {still && <source media="(prefers-reduced-motion: reduce)" srcSet={still} />}
        <img src={src} alt={alt} width={1200} height={800} className="max-h-full w-full object-contain" />
      </picture>
      {caption && <p className="max-w-lg text-center text-sm text-gray-500 dark:text-gray-400">{caption}</p>}
    </div>
  );
}
