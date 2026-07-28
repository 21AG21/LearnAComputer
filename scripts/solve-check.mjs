#!/usr/bin/env node
/**
 * Drives /dev/solve-check in a headless browser and prints the verdict.
 *
 * The in-app embedded pane throttles hidden pages so hard that the sims'
 * own timers freeze mid-run; headless Chromium reports the page visible and
 * never throttles, so this is the reliable way to run the whole course.
 *
 *   npm run solve-check                # the whole course
 *   npm run solve-check -- "Unit 3"    # filter by slug or unit substring
 *
 * Needs the dev server on :3000 (start it first). Exits 0 when every playable
 * lesson finishes, 1 otherwise — usable as a pre-push gate.
 */

import { chromium } from "playwright";

const filter = process.argv[2] ?? "";
const BASE = process.env.SOLVE_CHECK_URL ?? "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("pageerror", (e) => console.error(`[pageerror] ${e.message}`));

try {
  await page.goto(`${BASE}/dev/solve-check`, { waitUntil: "networkidle" });
} catch (e) {
  console.error(`Could not reach ${BASE} — is the dev server running? (${e.message})`);
  await browser.close();
  process.exit(2);
}

if (filter) {
  await page.getByPlaceholder("Filter by slug or unit").fill(filter);
}
await page.getByRole("button", { name: /^(Run|Restart)$/ }).click();

// Progress heartbeat, so a long run is visibly alive.
const started = Date.now();
let lastCounter = "";
const heartbeat = setInterval(async () => {
  try {
    const counter = await page
      .locator("span", { hasText: /\d+ \/ \d+/ })
      .first()
      .textContent();
    if (counter && counter !== lastCounter) {
      lastCounter = counter;
      console.log(`  ${counter.trim()}  (${Math.round((Date.now() - started) / 1000)}s)`);
    }
  } catch {
    /* page mid-render; next tick will catch up */
  }
}, 5000);

// The done block only renders when the first pass AND the retry pass are over.
await page.waitForSelector("#solve-check-result", { timeout: 45 * 60_000 });
clearInterval(heartbeat);

const solveTrace = await page.evaluate(() => window.__solveTrace ?? []);
const summary = await page.locator("#solve-check-result > p").first().textContent();
// Only the failure list — the exemption catalog lives in a <details> below it.
const realFailures = await page.locator("#solve-check-result > ul > li").allTextContents();

console.log(`\n${summary?.trim()}`);
for (const f of realFailures) console.log(`\n- ${f.replace(/\s+/g, " ").trim()}`);

// The solver's own trace of its last lesson — only worth reading on a failure,
// and only meaningful for single-lesson filtered runs.
if (realFailures.length > 0 && filter) {
  console.log("\nSolver trace (last lesson):");
  for (const line of solveTrace.slice(-40)) console.log(`  ${line}`);
}

await browser.close();
process.exit(realFailures.length === 0 ? 0 : 1);
