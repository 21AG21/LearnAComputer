import { readFileSync } from "fs";
import path from "path";
import { LESSON_ART } from "@/lib/lessonArt";

/**
 * The lesson art, as markup to inline into the page. Server-only — it reads
 * from `public/`, like `lib/lessons.ts` reads from `content/`.
 *
 * ## Why these are inlined instead of `<img src="…">`
 *
 * **`prefers-reduced-motion` does not reach inside an SVG referenced as an
 * image.** That was measured, not assumed: the media query inside the file is
 * simply ignored, and the animation runs for the learner who explicitly asked it
 * not to. Inlined, the SVG is part of the document, the query is evaluated
 * against this page like any other, and the request is honored.
 *
 * The alternative was a `<picture>` holding a second, motionless copy of every
 * drawing — 28 more files whose only job was to be the same picture standing
 * still. Inlining does it with one file and a media query, and saves the request
 * as well: the art arrives with the page rather than after it.
 *
 * Animation itself works either way — an earlier round of this work claimed
 * browsers would not animate SVG-as-image at all, which turned out to be a
 * hidden page freezing its own timeline, and that claim is withdrawn.
 * `motion-check`'s negative control demonstrates the real difference: put the
 * art back behind an image and reduced motion stops working outright.
 *
 * The cost is markup in the HTML instead of a second request, which for a flat
 * vector diagram is a good trade: the biggest of them is ~17 KB of markup that
 * gzips to under 2 KB, and it arrives with the page rather than after it.
 *
 * The stylesheet inside each file is namespaced to that file's root id by
 * `scopeCss` in the generator, because an inlined `<style>` is **not** scoped to
 * its SVG — its rules apply to the whole document. Unscoped, this set would
 * publish page-wide rules for `.row`, `.link` and `.key`, and a
 * `prefers-reduced-motion` rule that switched off every animation on the site.
 */
const cache = new Map<string, string | null>();

export function lessonArtMarkup(slug: string): string | null {
  if (cache.has(slug)) return cache.get(slug) ?? null;

  const art = LESSON_ART[slug];
  // Only our own generated art is inlined. Anything else is a plain file that a
  // lesson pointed at itself, and it stays an ordinary image.
  const markup =
    art && art.src.startsWith("/lesson/") && art.src.endsWith(".svg")
      ? readFileSync(path.join(process.cwd(), "public", art.src.replace(/^\//, "")), "utf8")
      : null;

  cache.set(slug, markup);
  return markup;
}

/** The art markup for every sub-lesson in a module that has any. */
export function moduleArtMarkup(slugs: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const slug of slugs) {
    const markup = lessonArtMarkup(slug);
    if (markup) out[slug] = markup;
  }
  return out;
}
