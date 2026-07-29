#!/usr/bin/env node
/**
 * What happens after a learner gets it wrong.
 *
 *   npm run dev && npm run recovery-check
 *
 * The course deliberately lets a learner fail: clicking CLEAN NOW in the scam
 * popup, or calling a safe message dangerous, reports failure and offers
 * "Try again". That path is a shipped feature and no other harness has ever
 * touched it — solve-check only ever does the right thing, so a broken
 * recovery would look perfectly healthy to every check in the repo while
 * stranding the one learner who most needs help: the one who just made the
 * mistake the lesson is about.
 *
 * This drives the failure on purpose, then proves the learner can carry on.
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const problems = [];
const ok = [];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await context.newPage();
page.on("pageerror", (e) => problems.push(`page error: ${e.message.split("\n")[0]}`));

const body = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));

await page.goto(`${BASE}/lessons/online-safety`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

// The scam-popup lesson sits behind gated ones. Skipping advances without
// marking anything complete, which is exactly how a learner would get here
// after giving up on an earlier activity.
const TARGET = "What If You Click a Scam?";
for (let i = 0; i < 14 && !(await body()).includes(TARGET); i++) {
  const skip = page.getByRole("button", { name: /skip this activity/i }).first();
  const next = page.getByRole("button", { name: /^Next/ }).first();
  if (await skip.count()) await skip.click();
  else if (await next.count()) await next.click();
  else break;
  await page.waitForTimeout(900);
}
if (!(await body()).includes(TARGET)) problems.push(`never reached "${TARGET}"`);

const start = page.getByRole("button", { name: /start activity/i }).first();
if (await start.count()) {
  await start.click();
  await page.waitForTimeout(2000);
}

// Guided sims start on the desktop: the learner opens the app themselves.
const dock = page.locator('button[aria-label="Browser"]').first();
if (await dock.count()) {
  await dock.click();
  await page.waitForTimeout(1800);
}

/** The address bar only becomes an input once it is clicked, as a real one does. */
async function typeAddress(url) {
  const label = page.getByText("Type a website address").first();
  if (await label.count()) await label.click();
  await page.waitForTimeout(400);
  const input = page.locator('input[placeholder="Type a website address"]').first();
  if (!(await input.count())) return false;
  await input.fill(url);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);
  return true;
}

// Reach the scam site so the popup appears.
if (!(await typeAddress("freegames.example"))) {
  problems.push("no address bar — could not reach the failure path at all");
} else {

  const clean = page.getByRole("button", { name: /clean now/i }).first();
  if (!(await clean.count())) {
    problems.push("the scam popup never appeared, so failure could not be triggered");
  } else {
    // The mistake the whole lesson is about.
    await clean.click();
    await page.waitForTimeout(1800);

    const afterFail = await body();
    if (!/try again/i.test(afterFail)) {
      problems.push("failing gave no Try again — the learner is stuck with no way back");
    } else {
      ok.push("failing shows an explanation and a Try again button");
      if (!/scam|fake|cleaner/i.test(afterFail)) {
        problems.push("the failure message does not say what went wrong");
      } else ok.push("the failure message explains the mistake");

      await page.getByRole("button", { name: /try again/i }).first().click();
      await page.waitForTimeout(2000);

      const afterRetry = await body();
      if (/try again/i.test(afterRetry)) {
        problems.push("Try again left the failure card on screen");
      }

      // The real question: is the activity usable again from the top?
      const dock2 = page.locator('button[aria-label="Browser"]').first();
      if (await dock2.count()) {
        await dock2.click();
        await page.waitForTimeout(1800);
      }
      if (!(await typeAddress("freegames.example"))) {
        problems.push("after Try again the activity did not come back — dead end");
      } else {
        const closeX = page.locator('button[aria-label="Close popup"]').first();
        const reachable = (await closeX.count()) > 0 || (await page.getByRole("button", { name: /clean now/i }).count()) > 0;
        if (!reachable) problems.push("after Try again the popup step cannot be reached again");
        else ok.push("after Try again the learner can retry the step properly");

        if (!(await closeX.count())) {
          problems.push("the popup has no close button — the only way out is the scam button");
        } else {
          await closeX.click();
          await page.waitForTimeout(1500);
          const stillOpen = await page.getByRole("button", { name: /clean now/i }).count();
          if (stillOpen) problems.push("closing the popup with the ✕ did not dismiss it");
          else ok.push("closing the popup the right way works after a failure");
          // And the step must now count as done, or the retry led nowhere.
          if (!/step 3 of 4|open the downloads/i.test(await body())) {
            problems.push("the popup step did not advance after closing it properly on the retry");
          } else ok.push("the retried step counts — the lesson moves on");
        }
      }
    }
  }
}

await browser.close();

for (const line of ok) console.log(`  ok    ${line}`);
if (problems.length === 0) {
  console.log("\nA learner who gets it wrong can always carry on.");
  process.exit(0);
}
console.log(`\n${problems.length} problem(s) recovering from a mistake:\n`);
for (const p of problems) console.log(`  - ${p}`);
process.exit(1);
