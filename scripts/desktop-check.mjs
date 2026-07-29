#!/usr/bin/env node
/**
 * Proves the desktop can hold more than one window.
 *
 *   npm run dev            (in another terminal)
 *   node scripts/desktop-check.mjs
 *
 * "Working with Windows" is a whole module of the course, and it only teaches
 * anything if a learner can have Mail and the Browser open at the same time,
 * raise one over the other, minimize one and get it back. FakeDesktop used to
 * track a single `activeApp`, so opening a second app made the first vanish —
 * invisible to tsc, lint, mount-check and solve-check alike, because no guided
 * lesson opens two apps at once. This is the check that would have caught it.
 *
 * Exits non-zero on the first broken expectation.
 */
import { chromium } from "playwright";

const SHOT = process.env.SHOT ?? null;
const failures = [];
const check = (ok, what) => {
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${what}`);
  if (!ok) failures.push(what);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
page.on("console", (m) => m.type() === "error" && console.log("  [console error]", m.text()));

await page.goto("http://localhost:3000/playground", { waitUntil: "networkidle" });

const WINDOW = "div.absolute.shadow-2xl";
const dock = (label) => page.locator(`button[aria-label="${label}"]`).first();
const openWindows = () =>
  page.$$eval(WINDOW, (ws) =>
    ws
      .filter((w) => w.offsetParent !== null)
      .map((w) => ({
        title: w.querySelector("span.font-bold")?.textContent?.trim() ?? "?",
        z: Number(w.style.zIndex || 0),
        x: parseInt(w.style.left || "0", 10),
        y: parseInt(w.style.top || "0", 10),
      })));

const openApp = async (label) => {
  await dock(label).click();
  await page.waitForTimeout(650); // launch animation
};

console.log("\nThree apps open at once");
await openApp("Mail");
await openApp("Browser");
await openApp("Notes");
let wins = await openWindows();
check(wins.length === 3, `three windows visible (saw ${wins.length}: ${wins.map((w) => w.title).join(", ")})`);
check(
  new Set(wins.map((w) => `${w.x},${w.y}`)).size === wins.length,
  "each window is at its own position (cascaded, not stacked exactly)",
);
check(wins.every((w) => w.z > 0), "every window carries a stacking order");

console.log("\nClicking a buried window raises it");
const beforeTop = wins.reduce((a, b) => (a.z > b.z ? a : b)).title;
await page.locator(`${WINDOW}:has(span:text-is("Mail"))`).first().locator("div.cursor-grab").first().click();
await page.waitForTimeout(250);
wins = await openWindows();
const afterTop = wins.reduce((a, b) => (a.z > b.z ? a : b)).title;
check(beforeTop !== "Mail" && afterTop === "Mail", `Mail came to the front (was "${beforeTop}", now "${afterTop}")`);
check((await openWindows()).length === 3, "raising one window did not close the others");

console.log("\nMinimize and restore");
await page.locator(`${WINDOW}:has(span:text-is("Mail"))`).first().locator('[aria-label="Minimize"]').click();
await page.waitForTimeout(400);
wins = await openWindows();
check(!wins.some((w) => w.title === "Mail"), "minimized window left the screen");
check(wins.length === 2, `the other two stayed open (saw ${wins.length})`);
check(
  await dock("Mail").locator("[class*='green']").count() > 0,
  "the dock still shows Mail as running",
);
await openApp("Mail");
wins = await openWindows();
check(wins.some((w) => w.title === "Mail"), "clicking the dock brought the minimized window back");
check(wins.length === 3, `all three are back (saw ${wins.length})`);

console.log("\nClosing one leaves the rest");
await page.locator(`${WINDOW}:has(span:text-is("Browser"))`).first().locator('[aria-label="Close"]').click();
await page.waitForTimeout(400);
wins = await openWindows();
check(!wins.some((w) => w.title === "Browser"), "closed window is gone");
check(wins.length === 2, `the other two survived (saw ${wins.length})`);
check(await dock("Browser").locator("[class*='green']").count() === 0, "the dock dropped Browser's running dot");

if (SHOT) {
  await page.screenshot({ path: SHOT });
  console.log(`\nscreenshot: ${SHOT}`);
}
await browser.close();

console.log(
  failures.length
    ? `\n${failures.length} desktop expectation(s) broken:\n- ${failures.join("\n- ")}`
    : "\nThe desktop handles multiple windows.",
);
process.exit(failures.length ? 1 : 0);
