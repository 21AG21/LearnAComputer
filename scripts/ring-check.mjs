#!/usr/bin/env node
/**
 * Can the learner SEE the control the lesson is telling them to click?
 *
 * Every other harness in this repo asks whether a lesson can be finished. This
 * one asks the question that sits underneath that and which nothing else can
 * see: **is the pulsing yellow ring actually on screen?**
 *
 * Why it needs to exist. The course's one instruction to a lost learner is
 * "look for the glow". Twice a window has been an inch too short and put the
 * glow just below its own bottom edge — *Forgot password?* in the Unit 11
 * password reset, *Continue* in the café captive portal. Both shipped. Both
 * were found by hand, by measuring a rect in a live browser. **solve-check was
 * green through both**, because the solver reaches controls through the DOM and
 * never needs to see them, and a human tester scrolls without noticing they
 * did. That is the definition of a blind spot, and this closes it.
 *
 * How. It reuses solve-check's run — the solver already visits every step of
 * every playable lesson — and audits the ring on each iteration
 * (`auditRing` in `lib/solve/solver.ts`). `SimulatorFrame` scrolls scrollable
 * ancestors to reveal the ring, so any violation here is either a layout the
 * learner can never reach or a regression in that reveal. Both are bugs, and
 * the report says which remedy applies.
 *
 *   npm run ring-check -- <slug>   # ONE lesson. Trustworthy. Exits 1 on a finding.
 *   npm run ring-check             # whole course. ADVISORY ONLY — always exits 0.
 *
 * Needs the dev server on :3000.
 *
 * ## Read this before believing a whole-course number
 *
 * **The single-lesson mode is a gate. The whole-course mode is a lead generator.**
 * That asymmetry is measured, not assumed:
 *
 *   - Single lesson, clean: passed 3/3 runs. Single lesson, bug planted:
 *     caught it 3/3 runs. Repeatable in both directions.
 *   - Whole course: 8, then 6, then 10 findings on three consecutive runs of
 *     identical code, with the offending *step* changing between runs.
 *
 * The reason is inherent, not a bug to be tuned away: a ring is legitimately out
 * of view for a frame or two whenever a panel is mid-render, a window is opening
 * or a view is transitioning, and across 170 lessons an automated run is almost
 * never at rest. Four mechanisms were tried — auditing from the solver's loop at
 * 2 frames (42 findings), at 150ms (10), at 600ms (12), then last-observation-
 * wins from inside the reveal (6–10). None was stable. Tuning until the number
 * looks green would only have hidden that.
 *
 * So the whole-course run prints leads and exits 0. Take a lead, re-run it
 * filtered to that one slug, and believe *that*.
 *
 * NEGATIVE CONTROL — run this before trusting a green result, because this repo
 * has shipped three harnesses that were quietly inspecting nothing. Two runs,
 * because one of them tests the check and the other tests the cure:
 *
 *   A. Shrink a window AND disable the reveal. In GuidedTroubleshootingTask set
 *      the public-wifi portal's `initial` height to 300, and make
 *      SimulatorFrame's reveal effect return early. Then
 *      `npm run ring-check -- public-wifi` must FAIL, naming "Continue".
 *      That is the exact bug that shipped twice. If it passes, this file is
 *      decoration.
 *   B. Put the reveal back, leave the window at 300. It must now PASS — which
 *      is what proves the reveal, not the window height, is doing the work.
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
  // Same trap solve-check hit: filling and running in one tick plays the
  // unfiltered queue and reports a number that means nothing.
  await page.waitForFunction(
    () => {
      const el = [...document.querySelectorAll("span")].find((s) => /^\d+ \/ \d+$/.test(s.textContent?.trim() ?? ""));
      const total = Number(el?.textContent?.trim().split("/")[1] ?? 0);
      return total > 0 && total < 170;
    },
    undefined,
    { timeout: 10_000 },
  );
}

await page.getByRole("button", { name: /^(Run|Restart)$/ }).click();

const started = Date.now();
let lastCounter = "";
const heartbeat = setInterval(async () => {
  try {
    const counter = await page.locator("span", { hasText: /\d+ \/ \d+/ }).first().textContent();
    if (counter && counter !== lastCounter) {
      lastCounter = counter;
      console.log(`  ${counter.trim()}  (${Math.round((Date.now() - started) / 1000)}s)`);
    }
  } catch {
    /* mid-render */
  }
}, 5000);

await page.waitForSelector("#solve-check-result", { timeout: 45 * 60_000 });
clearInterval(heartbeat);

const clipped = await page.evaluate(() => [...(window.__ringClipped?.values() ?? [])]);
const played = await page.$$eval("td.font-mono", (tds) => tds.map((td) => td.textContent?.trim() ?? ""));

await browser.close();

const unique = clipped;

console.log(`\nAudited the ring on ${played.length} lesson(s).`);

if (unique.length === 0) {
  console.log("\nEvery highlighted control is where the learner can see it.");
  process.exit(0);
}

console.log(`\n${unique.length} highlighted control(s) the learner may not be able to see:\n`);
for (const c of unique) {
  console.log(`  ${c.lesson}`);
  console.log(`    step:    ${c.say}`);
  console.log(`    control: "${c.control}"`);
  console.log(`    clipped by ${c.by}`);
  console.log(
    c.scrollable
      ? "    that container scrolls, so the frame's reveal did not reach it"
      : "    that container does not scroll — nothing the learner does reveals it",
  );
  if (!filter) console.log(`    confirm with: npm run ring-check -- ${c.lesson}`);
  console.log("");
}

if (!filter) {
  console.log("Whole-course mode is advisory: these are leads, not verdicts, and the");
  console.log("list is not identical between runs. Confirm each one filtered to its own");
  console.log("slug — that mode is repeatable. Exiting 0 on purpose.");
  process.exit(0);
}
process.exit(1);
