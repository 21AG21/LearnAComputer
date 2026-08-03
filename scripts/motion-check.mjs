/**
 * Does the lesson art actually move — and does it actually stop when the
 * learner has asked it to?
 *
 * No other harness can see this. solve-check and friends drive the DOM and
 * never look at a pixel; contrast-check samples colors on a page that is
 * holding still. Art that silently stopped animating, or worse, art that kept
 * moving for a learner with vestibular sensitivity, looks perfectly healthy to
 * every gate this repo owns.
 *
 * The bug it exists to prevent is real and was measured: **`prefers-reduced-
 * motion` does not reach inside an SVG referenced as an image.** A media query
 * in the file does nothing at all there. The art is therefore inlined into the
 * page, where the query is evaluated against the document like any other — and
 * this check proves both halves of that, on the real lesson pages.
 *
 *   npm run motion-check          # needs `npm run dev` on :3000
 *   MOTION_NEGATIVE=1 …           # negative control: expect it to FAIL
 *
 * ## One trap, which cost a wrong conclusion once
 *
 * **A hidden page has a frozen timeline.** `document.visibilityState ===
 * "hidden"` stops `document.timeline` dead, so every animation on the page sits
 * at time 0 and pixels never change. Measured in that state, working art looks
 * broken — and it did: an earlier round of this work concluded that some
 * browsers refuse to animate SVG-as-image, when in truth the page doing the
 * measuring was simply not visible. Playwright pages are visible, so this
 * harness is sound, but it asserts visibility up front rather than trusting it,
 * because "nothing moved" is otherwise indistinguishable from "nothing works".
 */
import { readFileSync, readdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const NEGATIVE = process.env.MOTION_NEGATIVE === "1";

/**
 * Every lesson slug that has generated art. Pulled out by pattern rather than
 * by turning the module into JSON: the alt text is prose full of colons and
 * commas, and a "quote every key" regex rewrites the middle of a sentence into
 * broken JSON.
 */
const art = {};
for (const [, slug, src] of readFileSync(new URL("../lib/lessonArt.ts", import.meta.url), "utf8")
  .matchAll(/"([\w-]+)":\s*\{\s*src:\s*"([^"]+)"/g)) {
  art[slug] = src;
}
if (!Object.keys(art).length) throw new Error("Parsed no lesson art out of lib/lessonArt.ts");

const slugify = (m) => m.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const dir = new URL("../content/lessons/", import.meta.url);
const routeFor = {};
for (const f of readdirSync(dir)) {
  if (!f.endsWith(".json")) continue;
  const l = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
  if (art[l.slug]) routeFor[l.slug] = `/lessons/${slugify(l.module)}`;
}

const findings = [];
const note = (m) => { findings.push(m); console.log(`  ✗ ${m}`); };
const slugs = Object.keys(art);
console.log(`Checking ${slugs.length} pieces of lesson art${NEGATIVE ? "  [NEGATIVE CONTROL]" : ""}\n`);

const browser = await chromium.launch();

// ── 1. Every file the manifest promises is still served ──────────────────────
// The art is inlined, so a broken path would not show up as a missing picture —
// it would show up as a *build* that failed to read it. Checking anyway keeps
// the manifest and the folder honest with each other.
{
  const page = await browser.newPage();
  for (const slug of slugs) {
    const r = await page.goto(BASE + art[slug]);
    if (!r || r.status() !== 200) note(`${slug}: ${art[slug]} → ${r ? r.status() : "no response"}`);
  }
  await page.close();
  console.log(`  ${slugs.length} files served`);
}

/** Walk a module until the sub-lesson showing this art is on screen. */
async function reach(page, slug) {
  await page.goto(BASE + routeFor[slug], { waitUntil: "networkidle" });
  const id = "#la-" + art[slug].split("/").pop().replace(".svg", "");
  const svg = page.locator(`[role="img"] > svg${id}`);
  // "Skip this activity" matters: several pictures sit *after* a gated activity
  // in their module, and a walker that only knows "Next" stops at the gate.
  for (let i = 0; i < 20 && !(await svg.count()); i++) {
    const next = page.getByRole("button", { name: /^(Next →|Finish|Review this module|Skip this activity)$/ }).first();
    if (!(await next.count())) break;
    await next.click();
    await page.waitForTimeout(200);
  }
  return (await svg.count()) ? svg : null;
}

// One representative per animation family, so a broken keyframe set is caught
// without paying for all 28 on every run.
const sample = ["computer-parts-screen", "sleep-laptop", "cloud-photos", "maps-navigation",
  "qrcodes-siri", "social-media", "final-graduation", "computer-parts-charger"];

for (const [label, reducedMotion] of [["motion allowed", "no-preference"], ["motion reduced", "reduce"]]) {
  const page = await browser.newPage({ reducedMotion, viewport: { width: 1280, height: 900 } });
  const before = findings.length;
  let running = 0;

  for (const slug of sample) {
    const svg = await reach(page, slug);
    if (!svg) { note(`${slug}: never reached its picture on ${routeFor[slug]}`); continue; }

    // Assert the page is actually visible before believing "nothing moved".
    const vis = await page.evaluate(() => document.visibilityState);
    if (vis !== "visible") { note(`page is ${vis}; a frozen timeline would fake a pass`); break; }

    // An inlined SVG has no intrinsic size to fall back on the way an <img>
    // with width/height attributes does, so a CSS slip collapses it to nothing
    // and the lesson silently loses its picture. Only worth asserting once.
    if (reducedMotion === "no-preference") {
      const box = await svg.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), overflows: r.right > window.innerWidth + 1 };
      });
      if (box.w < 120 || box.h < 80) note(`${slug}: picture renders at ${box.w}×${box.h} — collapsed`);
      if (box.overflows) note(`${slug}: picture overflows the pane (right edge past the viewport)`);
    }

    if (NEGATIVE) {
      // The regression a future refactor would introduce: put the art back
      // behind an <img>, where prefers-reduced-motion cannot reach it.
      await svg.evaluate((el) => {
        const holder = el.parentElement;
        const file = new XMLSerializer().serializeToString(el);
        const img = document.createElement("img");
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(file)));
        img.width = 600; img.height = 400;
        holder.replaceWith(img);
        img.id = "__neg";
      });
      await page.waitForTimeout(500);
      const el = page.locator("#__neg");
      const a = await el.screenshot();
      await page.waitForTimeout(600);
      const moved = !a.equals(await el.screenshot());
      if (reducedMotion === "reduce" && moved) note(`${slug} [${label}]: picture is still moving`);
      if (reducedMotion === "no-preference" && moved) running++;
      continue;
    }

    // Real DOM animations, not an image: getAnimations only sees them inlined.
    const state = await svg.evaluate((el) => {
      const anims = el.getAnimations({ subtree: true });
      return { count: anims.length, states: anims.map((a) => a.playState) };
    });
    if (reducedMotion === "reduce") {
      // The scoped media query inside the file sets `animation: none`, so there
      // should be nothing left running at all.
      const live = state.states.filter((s) => s === "running").length;
      if (live) note(`${slug} [${label}]: ${live} animation(s) still running`);
    } else {
      if (!state.count) note(`${slug} [${label}]: no animations found on the picture`);
      else if (!state.states.includes("running")) note(`${slug} [${label}]: animations present but none running`);
      else running++;
    }
  }

  const failed = findings.length - before;
  console.log(`  ${label}: ${reducedMotion === "no-preference"
    ? `${running}/${sample.length} animating`
    : failed ? `${failed} problem(s) — see above` : "held still"}`);
  await page.close();
}

await browser.close();

if (NEGATIVE) {
  console.log(findings.length
    ? `\nNegative control worked — ${findings.length} finding(s), as intended.`
    : "\nNEGATIVE CONTROL CAME BACK CLEAN. This check is blind; fix it before trusting it.");
  process.exit(findings.length ? 0 : 1);
}
console.log(findings.length ? `\n${findings.length} finding(s).` : "\nLesson art moves, and stops when asked.");
process.exit(findings.length ? 1 : 0);
