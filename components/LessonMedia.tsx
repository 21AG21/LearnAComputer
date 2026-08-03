interface LessonMediaProps {
  src: string;
  alt: string;
  caption?: string;
  /**
   * The picture's SVG markup, to inline. Supplied by the server for generated
   * lesson art; absent for a plain image a lesson pointed at itself.
   */
  markup?: string;
}

/**
 * The picture beside a lesson that has no activity.
 *
 * ## Why the art is inlined rather than loaded as an image
 *
 * The generated lesson art animates, and the animation is the teaching: the
 * callout pulses so the eye lands on the part being named, the plug reaches for
 * the socket and never gets there, a highlight runs the route between the pins.
 *
 * Referenced as an image, that animation cannot be turned *off*:
 * `prefers-reduced-motion` does not propagate into an image-referenced SVG, so
 * the media query inside the file does precisely nothing and the picture keeps
 * moving for the learner who asked it to stop. Measured, not assumed.
 *
 * Inlined, the SVG is part of the document and the query is evaluated against
 * this page, honestly — which also makes the second motionless copy of every
 * drawing, and the `<picture>` that chose between them, unnecessary. The
 * stylesheet inside each file is namespaced to that file's root id by the
 * generator, because an inlined `<style>` is not scoped to its SVG: its rules
 * apply document-wide.
 *
 * The wrapper carries `role="img"` and the description, so the whole drawing is
 * announced as one picture rather than as a heap of unlabeled shapes.
 *
 * The soft rounded frame is new, and only correct because of the inlining. Loaded
 * as an image with `object-contain`, the element box was a fixed rectangle with
 * the picture letterboxed inside it, so a border drew a hard edge around mostly
 * empty space — which is why there deliberately wasn't one. An inlined SVG sized
 * `w-full h-auto` *is* its own box, so the corner radius follows the artwork
 * exactly. It earns its place in dark mode especially, where a light drawing
 * otherwise lands on the dark pane as a bare bright rectangle.
 */
export default function LessonMedia({ src, alt, caption, markup }: LessonMediaProps) {
  return (
    <div className="w-full min-w-0 h-full flex flex-col items-center justify-center gap-4 p-8">
      <div className="flex min-h-0 w-full max-w-lg flex-1 items-center justify-center">
        {markup ? (
          <div
            role="img"
            aria-label={alt}
            // The SVG carries its own width/height attributes; these override
            // them so it scales to the pane instead of demanding 1200×800.
            className="flex min-h-0 w-full items-center justify-center overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 [&>svg]:h-auto [&>svg]:max-h-full [&>svg]:w-full"
            // Build-time output of scripts/generate-photos.mjs, read off disk by
            // the server. No user input reaches this.
            dangerouslySetInnerHTML={{ __html: markup }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} width={1200} height={800} className="max-h-full w-full object-contain" />
        )}
      </div>
      {caption && <p className="max-w-lg text-center text-sm text-gray-500 dark:text-gray-400">{caption}</p>}
    </div>
  );
}
