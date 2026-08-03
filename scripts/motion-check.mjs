/**
 * Does the lesson art actually move — and does it actually stop when the
 * learner has asked it to?
 *
 * No other harness can see this. solve-check and friends drive the DOM and
 * never look at a pixel; contrast-check samples colors on a page that is
 * holding still. An animation that silently stopped working, or worse, one that
 * kept running for a learner with vestibular sensitivity, would look perfectly
 * healthy to every gate this repo owns.
 *
 * The bug this exists to prevent is real and was measured, not imagined:
 * **Chromium ignores `prefers-reduced-motion` inside an SVG loaded as an
 * image.** A media query in the file does nothing. The fix is `<picture>` with
 * a reduced-motion `<source>`, which is resolved against the page — so this
 * checks the thing that can break: that the right file is served, and that the
 * pixels agree.
 *
 *   npm run motion-check          # needs `npm run dev` on :3000
 *   MOTION_NEGATIVE=1 …           # negative control: expect it to FAIL
 *
 * The negative control strips the reduced-motion <source> from every <picture>
 * before measuring, which is exactly the regression a future refactor would
 * introduce (say, "simplify this back to next/image"). If a run under that flag
 * comes back clean, this check has gone blind and should not be trusted.
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const NEGATIVE = process.env.MOTION_NEGATIVE === "1";

/**
 * Every lesson slug that has generated art, with its two file paths.
 *
 * Pulled out by pattern rather than by turning the module into JSON: the alt
 * text is prose and contains colons and commas, and a "quote every key" regex
 * happily rewrites the middle of a sentence into broken JSON. Matching the two
 * fields this check actually needs cannot misread a description.
 */
const art = {};
for (const [, slug, src, still] of readFileSync(new URL("../lib/lessonArt.ts", import.meta.url), "utf8")
  .matchAll(/"([\w-]+)":\s*\{\s*src:\s*"([^"]+)",\s*still:\s*"([^"]+)"/g)) {
  art[slug] = { src, still };
}
if (!Object.keys(art).length) throw new Error("Parsed no lesson art out of lib/lessonArt.ts");

const slugify = (m) => m.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const findings = [];
const note = (m) => { findings.push(m); console.log(`  ✗ ${m}`); };

/** Screenshot a locator twice and report whether anything changed. */
async function moves(locator, ms = 700) {
  const a = await locator.screenshot();
  await locator.page().waitForTimeout(ms);
  return !a.equals(await locator.screenshot());
}

const browser = await chromium.launch();

// Pull the module route for each art-bearing lesson straight from the content.
const { readdirSync } = await import("node:fs");
const dir = new URL("../content/lessons/", import.meta.url);
const routeFor = {};
for (const f of readdirSync(dir)) {
  if (!f.endsWith(".json")) continue;
  const l = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
  if (art[l.slug]) routeFor[l.slug] = `/lessons/${slugify(l.module)}`;
}

const slugs = Object.keys(art);
console.log(`Checking ${slugs.length} pieces of lesson art${NEGATIVE ? "  [NEGATIVE CONTROL]" : ""}\n`);

// ── 1. Every file the manifest promises is actually served ───────────────────
{
  const page = await browser.newPage();
  for (const slug of slugs) {
    for (const key of ["src", "still"]) {
      const r = await page.goto(BASE + art[slug][key]);
      if (!r || r.status() !== 200) note(`${slug}: ${art[slug][key]} → ${r ? r.status() : "no response"}`);
    }
  }
  await page.close();
  console.log(`  ${slugs.length * 2} files served`);
}

// ── 2. With motion allowed: the animated file loads, and it moves ────────────
// ── 3. With motion reduced: the still loads, and nothing moves ───────────────
for (const [label, reducedMotion, wantSuffix] of [
  ["motion allowed", "no-preference", ".svg"],
  ["motion reduced", "reduce", "-still.svg"],
]) {
  const page = await browser.newPage({ reducedMotion, viewport: { width: 1280, height: 900 } });
  const fetched = [];
  page.on("request", (r) => { if (r.url().includes("/lesson/")) fetched.push(r.url()); });

  // One representative per animation family, so a broken keyframe set is caught
  // without paying for all 28 on every run.
  const sample = ["computer-parts-screen", "sleep-laptop", "cloud-photos", "maps-navigation",
    "qrcodes-siri", "social-media", "final-graduation", "computer-parts-charger"];
  let moved = 0;
  const before = findings.length;
  for (const slug of sample) {
    fetched.length = 0;
    await page.goto(BASE + routeFor[slug], { waitUntil: "networkidle" });
    // Walk the module to the sub-lesson that owns this art.
    const img = page.locator(`img[src*="${art[slug].src.split("/").pop().replace(".svg", "")}"]`).first();
    // "Skip this activity" matters: several of these pictures sit *after* a
    // gated activity in their module, and a walker that only knows "Next" stops
    // dead at the gate and reports the art as missing.
    for (let i = 0; i < 20 && !(await img.count()); i++) {
      const next = page.getByRole("button", { name: /^(Next →|Finish|Review this module|Skip this activity)$/ }).first();
      if (!(await next.count())) break;
      await next.click();
      await page.waitForTimeout(200);
    }
    if (!(await img.count())) { note(`${slug}: never reached its picture on ${routeFor[slug]}`); continue; }

    if (NEGATIVE) {
      await page.evaluate(() => document.querySelectorAll("picture source").forEach((s) => s.remove()));
      await page.evaluate(() => document.querySelectorAll("picture img").forEach((i) => { const s = i.src; i.src = ""; i.src = s; }));
      await page.waitForTimeout(400);
    }

    const got = fetched.filter((u) => !u.endsWith(".map"));
    const wrong = got.filter((u) => !u.endsWith(wantSuffix));
    if (wrong.length) note(`${slug} [${label}]: fetched ${wrong.map((u) => u.split("/").pop()).join(", ")}, wanted a ${wantSuffix} file`);

    const didMove = await moves(img);
    if (reducedMotion === "reduce" && didMove) note(`${slug} [${label}]: picture is still moving`);
    if (reducedMotion === "no-preference" && didMove) moved++;
  }
  if (reducedMotion === "no-preference" && moved === 0) note("motion allowed: nothing on any page moved at all");
  const failed = findings.length - before;
  console.log(`  ${label}: ${reducedMotion === "no-preference"
    ? `${moved}/${sample.length} animating`
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
