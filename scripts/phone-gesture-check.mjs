#!/usr/bin/env node
/**
 * Plays Phone Unit 1 — the four lessons the phone course actually owns.
 *
 *   npm run dev                  # must be running on :3000
 *   npm run phone-gesture-check
 *   PHONE_NEGATIVE=1 …           # negative control: expect it to FAIL
 *
 * Everything else in the phone course is a lesson out of `content/lessons/`, and
 * `npm run phone-check` plays those with the ordinary solver. These four cannot
 * go through that solver, because they are not satisfied by clicking a DOM node:
 * going home is a finger dragged up a 20px bar, and sliding a list far enough to
 * reveal a row is satisfied by a *result* rather than by an action. So they are
 * driven here, with real pointer input.
 *
 * ## The gestures are performed, not faked
 *
 * A swipe is a pointer pressed, moved across several frames, and released.
 * Nothing goes near `dispatchEvent` with a synthetic object: the page gets the
 * same event stream a finger produces, or the run does not count.
 *
 * ## The negative control
 *
 * `PHONE_NEGATIVE=1` replaces every swipe with a plain click on the same
 * element. That is the regression this unit is most likely to suffer — "make it
 * a button" is the reflex fix for a gesture somebody finds fiddly, and a lesson
 * that teaches sliding by asking you to click a slide-shaped bar teaches
 * nothing. Watched to fail: the two lessons that depend on going home stall.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const NEGATIVE = process.env.PHONE_NEGATIVE === "1";
const ACT_TIMEOUT = 6000;

const failures = [];
const note = (m) => {
  failures.push(m);
  console.log(`    ✗ ${m}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await context.newPage();
page.on("pageerror", (e) => note(`page error: ${String(e).slice(0, 140)}`));

/** A real drag: press, several moves, release. */
async function drag(selector, dx, dy) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(x + (dx * i) / 6, y + (dy * i) / 6);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(150);
}

const tap = async (selector) => {
  await page.locator(selector).first().click({ timeout: ACT_TIMEOUT });
  await page.waitForTimeout(120);
};

await page.goto(`${BASE}/phone`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Got it" }).click({ timeout: 3000 }).catch(() => {});

const course = await page.evaluate(() => window.__phoneCourse);
if (!course) {
  console.log("Could not read the phone course off the page — is the dev server running?");
  await browser.close();
  process.exit(1);
}
const lessons = course.flatMap((u) => u.lessons).filter((l) => l.kind === "gesture");

console.log(`Playing ${lessons.length} gesture lessons at 390x844${NEGATIVE ? "   [NEGATIVE CONTROL]" : ""}\n`);

/* Structural checks. */
{
  const slugs = lessons.map((l) => l.slug);
  for (const s of slugs) if (!s.startsWith("phone-")) note(`gesture slug "${s}" does not start with "phone-"`);
  if (new Set(slugs).size !== slugs.length) note("two gesture lessons share a slug");
  if (await page.getByText("You are on a phone").isVisible().catch(() => false))
    note("SmallScreenGuard is covering /phone");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (wide) note("/phone scrolls sideways at 390px");
}

/** The status button a `close-panel` step has to press again. */
let lastPanel = null;

async function perform(step) {
  switch (step.action) {
    case "open-app":
      return tap(`[data-dock-app="${step.target}"]`);
    case "go-home":
      return NEGATIVE ? tap("[data-phone-homebar]") : drag("[data-phone-homebar]", 0, -70);
    case "open-panel": {
      lastPanel =
        step.target === "wifi" ? "Wi-Fi status" : step.target === "battery" ? "Battery status" : "Open calendar";
      return tap(`[aria-label="${lastPanel}"]`);
    }
    case "close-panel": {
      // The same button again — which is exactly what the lesson tells the
      // learner to do, and what a phone does.
      const label = lastPanel ?? "Wi-Fi status";
      lastPanel = null;
      return tap(`[aria-label="${label}"]`);
    }
    case "scroll-to": {
      if (NEGATIVE) return tap("[data-phone-section], button");
      // Wheel over the *section list*, which is the strip the lesson asks the
      // learner to slide — not whichever scrollable happens to be last in the DOM.
      const list = page.locator("div.overflow-y-auto", { has: page.getByText("Appearance", { exact: true }) }).first();
      const box = await list.boundingBox();
      if (!box) throw new Error("no scrollable section list");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (let i = 0; i < 14; i++) {
        await page.mouse.wheel(0, 140);
        await page.waitForTimeout(70);
      }
      await page.waitForTimeout(250);
      return;
    }
    default:
      throw new Error(`no driver for "${step.action}"`);
  }
}

let played = 0;
for (const lesson of lessons) {
  process.stdout.write(`  ${lesson.slug} … `);
  const before = failures.length;

  await page.goto(`${BASE}/phone`, { waitUntil: "networkidle" });
  await tap(`[data-phone-lesson="${lesson.slug}"]`);
  await tap("[data-phone-start]");

  for (const [i, step] of lesson.steps.entries()) {
    try {
      await perform(step);
      await page.waitForTimeout(250);
    } catch (e) {
      note(`${lesson.slug} step ${i + 1} (${step.action}): ${String(e).split("\n")[0]}`);
      break;
    }
  }

  const finished = await page
    .locator("[data-phone-next]")
    .or(page.getByText("That is the whole phone course."))
    .first()
    .waitFor({ state: "visible", timeout: 4000 })
    .then(() => true)
    .catch(() => false);

  if (!finished && failures.length === before) note(`${lesson.slug}: played every step but never finished`);
  if (finished) played++;
  console.log(failures.length === before && finished ? "done" : "STALLED");
}

await browser.close();
console.log(`\n${played}/${lessons.length} gesture lessons played to the end.`);

if (NEGATIVE) {
  console.log(
    failures.length
      ? `Negative control worked — ${failures.length} finding(s), as intended.`
      : "NEGATIVE CONTROL CAME BACK CLEAN. Every gesture can be satisfied with a plain click; this check is not measuring gestures.",
  );
  process.exit(failures.length ? 0 : 1);
}
console.log(failures.length ? `${failures.length} finding(s).` : "Unit 1 can be finished with a finger.");
process.exit(failures.length ? 1 : 0);
