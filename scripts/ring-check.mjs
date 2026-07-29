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
 *   npm run ring-check             # whole course — a gate; exits 1 on a finding
 *   npm run ring-check -- <slug>   # one lesson, same contract
 *
 * Needs the dev server on :3000.
 *
 * ## It was advisory for most of its life, and why that ended
 *
 * The whole-course count used to wobble: 8, then 6, then 10 findings on three
 * consecutive runs of identical code, with the offending *step* changing between
 * runs. Four mechanisms were tried — auditing from the solver's loop at 2 frames
 * (42 findings), at 150ms (10), at 600ms (12), then last-observation-wins from
 * inside the reveal (6–10) — and none was stable, because a ring is legitimately
 * out of view for a frame whenever a panel is mid-render. The conclusion then
 * was "a checker cannot know when the sim is at rest", which was half true.
 *
 * `SimulatorFrame` now publishes **`data-sim-settled`** — nothing inside the
 * frame changed for 400ms — and writes the clipped-ring record on that quiet
 * tick. Three runs gave 2, 2, 2. The two survivors were the scam popup's ✕ in
 * `popups-ads` and `popup-accident`, a real defect (the close button hung
 * outside the dialog and was clipped by the page area, unreachable by
 * scrolling). Fixed. Three runs now give **zero, zero, zero**, so it is a gate.
 *
 * The lesson, for the next check like this: the number was never going to be
 * trustworthy by tuning a delay. It became trustworthy when the thing being
 * measured was asked to say when it had stopped moving.
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

console.log(`\n${unique.length} highlighted control(s) the learner cannot see:\n`);
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
  console.log(`    reproduce: npm run ring-check -- ${c.lesson}`);
  console.log("");
}

process.exit(1);
