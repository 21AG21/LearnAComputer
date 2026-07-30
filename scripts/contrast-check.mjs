#!/usr/bin/env node
/**
 * Measures WCAG contrast on the pages a learner actually reads, both themes.
 *
 *   node scripts/contrast-check.mjs   (dev server on :3000)
 *
 * Two ways of finding the background behind a piece of text, in order:
 *
 * 1. **Walk the ancestors** for a solid `background-color`. Exact, and what
 *    almost every text node on the site resolves through.
 *
 * 2. **Look at the actual pixels**, whenever something is painted *between* that
 *    ancestor and the text.
 *
 *    This is the case the old version got wrong, and it got it wrong in a way
 *    worth spelling out, because the obvious diagnosis is also wrong. It did not
 *    fail to find a background and guess white. It found a real one: `<body>` is
 *    genuinely `#fff`. The homepage hero photo and the unit-card photos are
 *    absolutely-positioned `<img>` elements painted on top of that white, under a
 *    dark scrim, with the text on top of both — and every element in the text's
 *    own ancestor chain is transparent. So the walk sailed past the photo it
 *    needed to see, reached body, and correctly reported white for the wrong
 *    layer: four "1:1 white on white" failures against text that is perfectly
 *    legible.
 *
 *    That is worse than a cosmetic wart. A real white-on-white bug prints exactly
 *    those lines, so four phantom failures were hiding the one true line this
 *    check would ever need to print. An ancestor walk cannot fix this in
 *    principle — being painted over is not visible from the ancestor chain. So
 *    when a painter overlaps the text, the glyphs are made transparent, the
 *    element is screenshotted, and the backdrop is measured off real pixels.
 *
 * Because a photo backdrop is not one color, the pixel path scores the *worst*
 * realistic patch (5th-percentile pixel ratio, after downsampling so a single
 * stray speck cannot fail a page) and reports the median alongside it.
 *
 * Anything the pixel path cannot capture goes in a third bucket, "could not
 * measure", printed separately and loudly. A check that says "I don't know" is
 * useful; one that guesses and calls it a measurement is not.
 *
 * NEGATIVE CONTROL — this check has been watched to fail, in both paths:
 *
 *   CONTRAST_NEGATIVE=1 node scripts/contrast-check.mjs
 *
 * recolors the homepage hero heading and the unit-card titles to #2b3340, a dark
 * gray a shade off the scrim they sit on. Those elements resolve through the
 * *pixel* path, so a clean run under that flag means the pixel path has gone
 * blind and the "0 failures" it prints is worthless. It must report them as
 * failures with a ratio near 1. Re-run it after any change to how the backdrop
 * is sampled — widening what a check can see is exactly the edit that blinds it.
 * See CLAUDE.md: this repo has shipped three harnesses that inspected nothing.
 */
import { chromium } from "playwright";
import sharp from "sharp";

/**
 * `/login` used to be in this list. Accounts were removed on 2026-07-28, so it
 * has been a 404 ever since — and `page.goto` does not throw on a 404, so the
 * check was measuring the not-found page and filing the results under "/login".
 */
const PAGES = [
  "/",
  "/lessons",
  "/lessons/using-the-trackpad-or-mouse",
  "/certificate",
  "/dashboard",
  "/privacy",

  /**
   * The two pages a learner only meets on their worst visit — and the two this
   * check could never reach, because it walks a list of routes and neither has a
   * route that returns 200.
   *
   * A wrong URL renders `not-found.tsx`; `/dev/boom` throws on purpose so
   * `error.tsx` renders. Both are declared with the status they are *supposed* to
   * return, so the guard below still fails on a route that broke by accident. The
   * page written to reassure somebody whose screen just went wrong is exactly the
   * page that has to be legible.
   */
  { path: "/this-url-does-not-exist", expect: 404 },
  { path: "/dev/boom", expect: 200, settle: 500 },
];

const NEGATIVE = process.env.CONTRAST_NEGATIVE === "1";

/**
 * CONTRAST_VERBOSE=1 prints every pixel-sampled measurement, passing ones
 * included. Without it, a clean run is indistinguishable from a run where the
 * screenshots silently returned nothing and every hard case was skipped — which
 * is the failure mode this whole rewrite exists to remove. Use it to confirm the
 * hard cases were actually looked at.
 */
const VERBOSE = process.env.CONTRAST_VERBOSE === "1";
const sampled = [];

const srgb = (v) => {
  v /= 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const ratioOf = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const round = (n) => Math.round(n * 100) / 100;

/**
 * Score a screenshot of the backdrop against the foreground color.
 *
 * Downsampled first: at full resolution one bright pixel in a photo can drag the
 * 5th percentile under the threshold and fail a page no human would call broken.
 */
async function scoreBackdrop(png, fgLum) {
  const { data, info } = await sharp(png)
    .resize(120, 120, { fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ratios = [];
  let darkest = [255, 255, 255];
  let darkestLum = 1;
  for (let p = 0; p + 2 < data.length; p += info.channels) {
    const px = [data[p], data[p + 1], data[p + 2]];
    const l = lum(px);
    ratios.push(ratioOf(fgLum, l));
    if (l < darkestLum) {
      darkestLum = l;
      darkest = px;
    }
  }
  if (!ratios.length) return null;
  ratios.sort((a, b) => a - b);
  const at = (q) => ratios[Math.min(ratios.length - 1, Math.floor(q * ratios.length))];
  return { worst: at(0.05), median: at(0.5), darkest, samples: ratios.length };
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const failures = [];
const unmeasured = [];

for (const theme of ["light", "dark"]) {
  await page.emulateMedia({ colorScheme: theme });

  for (const entry of PAGES) {
    const path = typeof entry === "string" ? entry : entry.path;
    const want = typeof entry === "string" ? 200 : entry.expect;
    const settle = typeof entry === "string" ? 0 : (entry.settle ?? 0);
    const res = await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle" }).catch(() => null);
    if (!res || res.status() !== want) {
      throw new Error(
        `${path} returned ${res ? res.status() : "no response"}, expected ${want}. A page in PAGES that ` +
          `does not load as expected silently measures whatever was on screen before it — fix the list or the route.`
      );
    }

    if (settle) await page.waitForTimeout(settle);

    /**
     * The site is `darkMode: "class"`, so emulating the media query only works
     * because an inline script in ThemeToggle mirrors it onto <html>. Assert it,
     * rather than trusting it: if that script ever stops running, the "dark" pass
     * would quietly measure light mode twice and still print all-clear.
     */
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    if (isDark !== (theme === "dark")) {
      throw new Error(
        `Asked for ${theme} mode on ${path} but <html class="dark"> is ${isDark}. ` +
          `The dark pass is not measuring dark mode.`
      );
    }

    const { resolved, unresolved } = await page.evaluate((negative) => {
      const parse = (s) => {
        const m = s.match(/rgba?\(([\d.]+), ?([\d.]+), ?([\d.]+)(?:, ?([\d.]+))?\)/);
        return m ? { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null;
      };

      // Negative control: put a near-scrim gray on text that lives over a photo,
      // so the pixel path has something it must catch.
      if (negative) {
        for (const el of document.querySelectorAll("h1, h2, h3, p, span")) {
          const t = el.textContent.trim();
          if (t.startsWith("Welcome to LearnAComputer") || /^Unit \d+: /.test(t)) el.style.color = "#2b3340";
        }
      }

      /**
       * Things that paint over an ancestor's background color: a photo, a
       * gradient scrim, a canvas.
       *
       * Deliberately narrow. Only *absolutely* positioned media counts, plus
       * anything carrying a `background-image`. An inline icon sitting next to a
       * label is in normal flow and is not behind it, so widening this to every
       * `<svg>` would drag half the site's buttons onto the slow path and sample
       * their own icons as if those were the backdrop.
       */
      const painters = [];
      for (const el of document.querySelectorAll("body *")) {
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none") continue;
        const isMedia = /^(IMG|VIDEO|CANVAS)$/.test(el.tagName) && /absolute|fixed/.test(cs.position);
        if (isMedia || cs.backgroundImage !== "none") {
          const r = el.getBoundingClientRect();
          if (r.width > 1 && r.height > 1) painters.push({ el, r });
        }
      }
      const overlaps = (el, r) =>
        painters.some(
          (p) =>
            !el.contains(p.el) &&
            p.r.left < r.right &&
            p.r.right > r.left &&
            p.r.top < r.bottom &&
            p.r.bottom > r.top
        );

      const resolved = [];
      const unresolved = [];
      const seen = new Set();
      let tag = 0;

      for (const el of document.querySelectorAll("body *")) {
        const hasOwnText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!hasOwnText) continue;

        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;

        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;

        const fg = parse(cs.color);
        if (!fg || fg.a === 0) continue;

        const size = parseFloat(cs.fontSize);
        const bold = parseInt(cs.fontWeight, 10) >= 700;
        const base = {
          text: el.textContent.trim().slice(0, 40),
          fg: cs.color,
          fgRgb: fg.rgb,
          need: size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5,
        };

        let bg = null;
        for (let n = el; n; n = n.parentElement) {
          const c = parse(getComputedStyle(n).backgroundColor);
          if (c && c.a > 0.6) {
            bg = c.rgb;
            break;
          }
        }

        if (bg && !overlaps(el, r)) {
          const key = `${cs.color}|${bg.join()}|${el.tagName}`;
          if (seen.has(key)) continue;
          seen.add(key);
          resolved.push({ ...base, bg });
        } else {
          // Either nothing is painted in the ancestor chain, or something is
          // painted over it. Both mean CSS cannot answer the question — hand it to
          // the pixel path. Keyed per element, not per color pair: each unit card
          // has a different photo behind the same white text.
          el.dataset.ccProbe = String(tag);
          unresolved.push({ ...base, probe: tag++ });
        }
      }
      return { resolved, unresolved };
    }, NEGATIVE);

    for (const r of resolved) {
      const ratio = ratioOf(lum(r.fgRgb), lum(r.bg));
      if (ratio < r.need) {
        failures.push({
          theme,
          path,
          how: "css",
          text: r.text,
          ratio: round(ratio),
          need: r.need,
          fg: r.fg,
          bg: `rgb(${r.bg.join(",")})`,
        });
      }
    }

    if (unresolved.length) {
      await page.addStyleTag({ content: "#cc-hide-marker{}" });
      for (const u of unresolved.slice(0, 60)) {
        const sel = `[data-cc-probe="${u.probe}"]`;
        // Hide the glyphs so the screenshot is backdrop only — no antialiased
        // edges of the very text we are trying to measure against.
        const style = await page.addStyleTag({
          content: `${sel}, ${sel} * { color: transparent !important; text-shadow: none !important; -webkit-text-stroke: 0 !important; }`,
        });
        let png = null;
        try {
          png = await page.locator(sel).first().screenshot({ timeout: 5000 });
        } catch {
          png = null;
        }
        await style.evaluate((node) => node.remove());

        const score = png ? await scoreBackdrop(png, lum(u.fgRgb)) : null;
        if (!score) {
          unmeasured.push({ theme, path, text: u.text, fg: u.fg });
          continue;
        }
        sampled.push({
          theme,
          path,
          text: u.text,
          worst: round(score.worst),
          median: round(score.median),
          need: u.need,
          pass: score.worst >= u.need,
        });
        if (score.worst < u.need) {
          failures.push({
            theme,
            path,
            how: "pixels",
            text: u.text,
            ratio: round(score.worst),
            median: round(score.median),
            need: u.need,
            fg: u.fg,
            bg: `sampled photo/gradient, darkest rgb(${score.darkest.join(",")})`,
          });
        }
      }
    }
  }
}

await browser.close();

for (const f of failures) {
  const how = f.how === "pixels" ? ` [pixel-sampled, median ${f.median}:1]` : "";
  console.log(`  [${f.theme}] ${f.path} — ${f.ratio}:1 (needs ${f.need}) "${f.text}" fg=${f.fg} on ${f.bg}${how}`);
}
if (failures.length) console.log(`${failures.length} contrast failures.`);
else console.log("All sampled text meets WCAG AA contrast in both themes.");

if (VERBOSE) {
  console.log(`\n${sampled.length} text elements were measured off real pixels:`);
  for (const s of sampled) {
    console.log(
      `  ${s.pass ? "ok  " : "FAIL"} [${s.theme}] ${s.path} — worst ${s.worst}:1, median ${s.median}:1 ` +
        `(needs ${s.need}) "${s.text}"`
    );
  }
} else if (sampled.length) {
  console.log(`(${sampled.length} elements over photos/gradients were measured off real pixels — CONTRAST_VERBOSE=1 to list them.)`);
}

if (unmeasured.length) {
  console.log(`\n${unmeasured.length} could not be measured (reported, not counted as failures):`);
  for (const u of unmeasured) console.log(`  [${u.theme}] ${u.path} — "${u.text}" fg=${u.fg}`);
}

process.exit(failures.length ? 1 : 0);
