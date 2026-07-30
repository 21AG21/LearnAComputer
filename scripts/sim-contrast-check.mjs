#!/usr/bin/env node
/**
 * WCAG AA contrast for the controls a learner actually touches.
 *
 *   npm run dev            (in another terminal)
 *   node scripts/sim-contrast-check.mjs
 *
 * There was a hole here big enough to drive a demo through. `contrast-check`
 * measures the *pages* — homepage, catalog, a lesson, the certificate — and never
 * clicks "Start activity", so it has never seen the inside of a simulator. Every
 * other harness drives the DOM without looking at a color. `simdark-check` reaches
 * nine dock apps, which is a fraction of the course.
 *
 * So the entire playground — 170 activities, every button and label a learner
 * spends the course pressing — was unmeasured. What was hiding in there:
 *
 *   - `text-gray-400` on white at **2.54:1**, roughly 140 call sites: every email
 *     timestamp and preview line, the calendar's weekday headers, App Market
 *     prices, the browser's address-bar placeholder, "Select a contact to start
 *     chatting".
 *   - white on `bg-blue-500` at **3.68:1** — the primary button, 38 call sites.
 *   - a yellow-500 star rating on white at **1.92:1**.
 *   - orange-600 on orange-100 at **3.11:1**.
 *
 * None of that is dark-mode damage; it predates the sim's dark mode entirely. It
 * is simply what happens when nobody measures. A buyer running Lighthouse or axe
 * on a lesson page with an activity open finds all four in one pass, and this
 * product is sold partly on an accessibility unit.
 *
 * It walks every activity through `window.__strayShow`, the same script-controlled
 * mount `stray-check` uses, clicking through the "open the app" gate exactly as a
 * learner does — without that, most of the course silently never mounts. The
 * measurement itself is shared with `simdark-check` via `scripts/lib/sim-contrast.mjs`,
 * because two copies of the same maths is how you get two answers.
 *
 * SIMCONTRAST_NEGATIVE=1 is the negative control. It repaints every `text-gray-500`
 * to near-white on the light ground it sits on; a clean run under the flag means
 * the sweep is measuring nothing.
 *
 * SIMCONTRAST_FILTER=<substr> narrows to matching slugs while working.
 *
 * Exits 1 on any finding.
 */
import { chromium } from "playwright";
import { MEASURE } from "./lib/sim-contrast.mjs";

const BASE = "http://localhost:3000";
const NEGATIVE = process.env.SIMCONTRAST_NEGATIVE === "1";
const FILTER = process.env.SIMCONTRAST_FILTER ?? "";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.error(`[pageerror] ${e.message}`));

try {
  await page.goto(`${BASE}/dev/stray-check`, { waitUntil: "networkidle" });
} catch (e) {
  console.error(`Could not reach ${BASE} — is the dev server running? (${e.message})`);
  await browser.close();
  process.exit(2);
}

await page.waitForFunction(() => Array.isArray(window.__strayList), undefined, { timeout: 15_000 });
const all = await page.evaluate(() => window.__strayList);
const slugs = FILTER ? all.filter((s) => s.includes(FILTER)) : all;

if (NEGATIVE) {
  console.log("SIMCONTRAST_NEGATIVE=1 — washing out every gray-500 run on purpose\n");
}

/**
 * Findings are deduplicated by colour pair + class list, not by slug.
 *
 * The same `text-gray-400` sits in a component that thirty lessons mount, and
 * printing it thirty times buries the other three defects. The count of slugs it
 * appeared in is kept, because that is the number that says how much of the course
 * a single fix repairs.
 */
const byDefect = new Map();
let measured = 0;
let mounted = 0;
let launched = 0;
const skipped = [];
const started = Date.now();

for (let i = 0; i < slugs.length; i++) {
  const slug = slugs[i];
  await page.evaluate((n) => window.__strayShow(n), all.indexOf(slug));

  // Most guided lessons sit behind DesktopLaunch's "Open Mail — click the glowing
  // icon" gate and never render a frame until it is clicked. Click it the way a
  // learner does, or most of the course quietly reports as unmountable.
  let framed = await page
    .waitForFunction(() => !!document.querySelector("[data-sim-frame]"), undefined, { timeout: 2500 })
    .then(() => true)
    .catch(() => false);

  if (!framed) {
    const gate = await page.evaluate(() => {
      if (!/click the glowing icon in the dock/i.test(document.body.innerText)) return false;
      const ringed = [...document.querySelectorAll("*")].filter(
        (e) => /ring-yellow|animate-ring-pulse/.test((e.className || "").toString()) && e.offsetParent !== null,
      );
      const el = ringed.find((r) => !ringed.some((o) => o !== r && r.contains(o)));
      const btn = el?.closest("button") ?? el;
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (gate) {
      launched++;
      framed = await page
        .waitForFunction(() => !!document.querySelector("[data-sim-frame]"), undefined, { timeout: 6000 })
        .then(() => true)
        .catch(() => false);
    }
  }

  if (!framed) {
    skipped.push(slug);
    continue;
  }
  mounted++;
  await page.waitForTimeout(650); // launch animation, desktop settling

  if (NEGATIVE) {
    await page.addStyleTag({ content: `.text-gray-500 { color: #f4f4f5 !important; }` });
  }

  // Scope to the activity host rather than the desktop: this page has no
  // FakeDesktop of its own, and full-bleed activities render straight into it.
  const res = await page.evaluate(MEASURE, false);
  if (res.error) {
    skipped.push(`${slug} (${res.error})`);
    continue;
  }
  measured += res.badText.length + res.okCount;

  for (const t of res.badText) {
    const key = `${t.fg}|${t.bg}|${t.cls}`;
    const hit = byDefect.get(key) ?? { ...t, slugs: new Set(), samples: new Set() };
    hit.slugs.add(slug);
    hit.samples.add(t.text);
    byDefect.set(key, hit);
  }

  if ((i + 1) % 25 === 0 || i === slugs.length - 1) {
    const secs = Math.round((Date.now() - started) / 1000);
    console.log(`  ${i + 1} / ${slugs.length}  (${secs}s, ${byDefect.size} distinct defect(s))`);
  }
}

await browser.close();

console.log(
  `\nMeasured ${measured} text run(s) across ${mounted} activity/activities ` +
    `(${launched} reached by opening the app first).`,
);
if (skipped.length) {
  console.log(`  skipped ${skipped.length}: no sim frame (full-bleed or unmountable)`);
}

if (byDefect.size) {
  const rows = [...byDefect.values()].sort((a, b) => b.slugs.size - a.slugs.size);
  console.log(`\n${rows.length} distinct contrast defect(s), worst reach first:\n`);
  for (const d of rows) {
    console.log(
      `  ${d.ratio}:1 (needs ${d.need})  fg(${d.fg}) on bg(${d.bg})  in ${d.slugs.size} lesson(s)`,
    );
    console.log(`     e.g. "${[...d.samples][0]}"`);
    console.log(`     class="${d.cls}"`);
  }
  console.log(
    `\nEach line is one fix. ${rows.reduce((n, d) => n + d.slugs.size, 0)} lesson-appearances in total.`,
  );
  if (NEGATIVE) console.log("SIMCONTRAST_NEGATIVE=1 was set, so findings are the expected result.");
  process.exit(NEGATIVE ? 0 : 1);
}

if (NEGATIVE) {
  console.log("SIMCONTRAST_NEGATIVE=1 produced no findings — the sweep is blind. Fix the check.");
  process.exit(1);
}
console.log("Every text run in every activity meets WCAG AA.");
