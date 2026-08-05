#!/usr/bin/env node
/**
 * Plays the whole phone course, on a 390x844 touch screen.
 *
 *   npm run dev            # must be running on :3000
 *   npm run phone-check
 *   npm run phone-check -- guided-files   # filter by slug or unit substring
 *   PHONE_NEGATIVE=1 npm run phone-check  # negative control: expect it to FAIL
 *
 * ## What this proves that `solve-check` cannot
 *
 * The phone course is not a second curriculum — it is the laptop course's own
 * lessons rendered through the simulator's phone branches: panes stacked instead
 * of side by side, no window chrome, an app filling the screen instead of a
 * draggable window, Settings as a list you go *into*. `solve-check` runs the same
 * activities at 1440x900 and is therefore blind to every one of those branches. A
 * pane collapsed to zero width, a control pushed below a 390px fold, a sidebar
 * eating the screen — all of it passes at desktop width.
 *
 * That is not hypothetical. The first run of this harness found Mail and Photos
 * rendering their content pane at **0px wide** on a phone, and every lesson in
 * both apps unplayable, while `solve-check` was green on the same code.
 *
 * ## It is deliberately the same solver
 *
 * `/dev/phone-check` renders the same `SolveCheck` component and the same
 * `lib/solve` solver, wrapped in `SimFormFactorProvider value="phone"`. Two
 * solvers would mean two definitions of "finished", and the answer to "can a
 * learner complete this?" must not depend on which harness asked.
 *
 * Unit 1's four bespoke gesture lessons are not here — they are the only content
 * the phone course owns, they are satisfied by swipes rather than by DOM actions,
 * and `scripts/phone-gesture-check.mjs` plays those.
 *
 * ## The negative control
 *
 * The first version of this flag re-ran the same queue at 1440px with the phone
 * shape off, and came back **clean** — of course it did: that is `solve-check`,
 * and `solve-check` passes. A negative control that reproduces a passing run
 * proves nothing at all, and it was replaced rather than explained away.
 *
 * `PHONE_NEGATIVE=1` now injects one CSS rule that puts the stacked apps back
 * side by side inside the 390px screen:
 *
 *     [data-phone-stacked] { flex-direction: row !important }
 *
 * That is precisely the bug this harness was built after — Mail and Photos
 * rendering their content pane at **0px wide**, every lesson in both apps
 * unplayable, and `solve-check` green on the same code. If the suite still
 * passes under the flag, this harness cannot see the one class of defect it
 * exists for. Watched to fail: 2 findings, both in Photos.
 *
 * Two, not twenty, and the reason is worth knowing: **the solver reaches
 * controls through the DOM**, and `element.click()` works perfectly well on a
 * button that is zero pixels wide. So a collapsed pane only stops the run where
 * the step needs real geometry — dragging a slider. Every step that is just a
 * click sails through a layout no human could use. That is the same blind spot
 * `ring-check` exists to cover on the laptop, and running it at phone size is
 * the obvious next gate.
 */

import { chromium } from "playwright";

const filter = process.argv[2] ?? "";
const NEGATIVE = process.env.PHONE_NEGATIVE === "1";
const BASE = process.env.SOLVE_CHECK_URL ?? "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  deviceScaleFactor: 2,
});

page.on("pageerror", (e) => console.error(`[pageerror] ${e.message}`));
page.on("console", (m) => {
  if (m.text().startsWith("[sim]")) console.log(`  ${m.text()}`);
});

try {
  await page.goto(`${BASE}/dev/phone-check`, { waitUntil: "networkidle" });
} catch (e) {
  console.error(`Could not reach ${BASE} — is the dev server running? (${e.message})`);
  await browser.close();
  process.exit(2);
}

if (NEGATIVE) {
  // Undo the phone stacking, leaving everything else exactly as it is.
  await page.addStyleTag({ content: "[data-phone-stacked]{flex-direction:row !important}" });
}

console.log(`Playing the phone course at 390x844${NEGATIVE ? "   [NEGATIVE CONTROL]" : ""}\n`);

if (filter) {
  await page.getByPlaceholder("Filter by slug or unit").fill(filter);
  await page.waitForFunction(
    () => {
      const el = [...document.querySelectorAll("span")].find((s) => /^\d+ \/ \d+$/.test(s.textContent?.trim() ?? ""));
      const total = Number(el?.textContent?.trim().split("/")[1] ?? 0);
      return total > 0 && total < 200;
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
    /* page mid-render; next tick will catch up */
  }
}, 5000);

await page.waitForSelector("#solve-check-result", { timeout: 45 * 60_000 });
clearInterval(heartbeat);

const summary = await page.locator("#solve-check-result > p").first().textContent();
const failures = await page.locator("#solve-check-result > ul > li").allTextContents();
const playedSlugs = await page.$$eval("td.font-mono", (tds) => tds.map((td) => td.textContent?.trim() ?? ""));

console.log(`\n${summary?.trim()}`);
console.log(`Played ${playedSlugs.length} lesson(s).`);
for (const f of failures) console.log(`\n- ${f.replace(/\s+/g, " ").trim()}`);

await browser.close();

if (NEGATIVE) {
  console.log(
    failures.length
      ? `\nNegative control worked — ${failures.length} finding(s), as intended.`
      : "\nNEGATIVE CONTROL CAME BACK CLEAN. This harness cannot see a collapsed phone pane; fix it before trusting it.",
  );
  process.exit(failures.length ? 0 : 1);
}
console.log(failures.length ? `\n${failures.length} lesson(s) cannot be finished on a phone.` : "\nEvery borrowed lesson can be finished on a phone.");
process.exit(failures.length === 0 ? 0 : 1);
