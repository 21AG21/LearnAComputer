#!/usr/bin/env node
/**
 * Plays every lesson of the phone course to the end, with real gestures, on a
 * phone-sized touch screen.
 *
 *   npm run dev            # must be running on :3000
 *   npm run phone-check
 *   npm run phone-check -- swipe          # one lesson, or a substring
 *   PHONE_NEGATIVE=1 npm run phone-check  # negative control: expect it to FAIL
 *
 * ## Why nothing else can see this course
 *
 * `solve-check` walks `content/lessons/*.json`; the phone curriculum is not in
 * there and never will be, because dropping a second course into that folder
 * corrupts every count `check-lessons.py` and `pitch-check.py` derive from it.
 * Every other harness in the repo drives the laptop simulator. So without this
 * file the entire "On Your Phone" tab is unproven — which for a course whose
 * defining feature is that its activities cannot be finished with a click is
 * exactly the wrong thing to leave unproven.
 *
 * ## The gestures are performed, not faked
 *
 * A swipe is a pointer pressed, moved across several frames, and released. A
 * long press is a pointer held still for 700ms. A pinch is Ctrl and the wheel,
 * which is the same event a two-finger spread produces and the only one a
 * machine without a touchscreen can generate. None of it goes near
 * `dispatchEvent` with a synthetic object: the page gets the same event stream a
 * finger produces, or the run does not count.
 *
 * ## The negative control, and why it is this one
 *
 * `PHONE_NEGATIVE=1` replaces every gesture with a plain click on the same
 * element. That is not a random sabotage — it is precisely the regression this
 * course is most likely to suffer, because "make it a button" is the reflex fix
 * for a gesture somebody finds fiddly, and a course that teaches swiping by
 * asking you to click a swipe-shaped button teaches nothing. If the suite still
 * passes under this flag, the gesture work above is decorative and this harness
 * is not measuring what it claims to.
 *
 * Watched to fail: 11 findings, 12 of 23 lessons still finishing. The twelve that
 * survive are the right twelve — the typing and messaging lessons genuinely are
 * all taps — and that is the reading to check on any future run. A negative
 * control that failed *everything* would mean the flag had broken the page rather
 * than removed the gestures, and would prove nothing.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MEASURE } from "./lib/sim-contrast.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL || "http://localhost:3000";
const NEGATIVE = process.env.PHONE_NEGATIVE === "1";
const filter = process.argv[2] ?? "";
const ACT_TIMEOUT = 6000;

const failures = [];
const note = (m) => {
  failures.push(m);
  console.log(`    ✗ ${m}`);
};

/* ─────────────────────────────────────────────────────── gestures ────────── */

/** The centre of an element, in page coordinates. */
async function centre(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

/**
 * A real drag: press, several moves, release. The intermediate moves matter —
 * a single jump from start to end never crosses the swipe threshold in a way
 * the row-drag preview can follow, and more importantly it is not what a finger
 * does, so it would not exercise the same code.
 */
async function drag(page, selector, dx, dy) {
  const { x, y } = await centre(page, selector);
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(x + (dx * i) / 6, y + (dy * i) / 6);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(120);
}

/** Press and hold, still, long enough for the 500ms timer to fire. */
async function hold(page, selector, ms = 750) {
  const { x, y } = await centre(page, selector);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
  await page.waitForTimeout(120);
}

/** Two fingers spreading, expressed the way a machine without fingers can. */
async function pinch(page, selector, dir) {
  const { x, y } = await centre(page, selector);
  await page.mouse.move(x, y);
  await page.keyboard.down("Control");
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, dir === "out" ? -120 : 120);
    await page.waitForTimeout(60);
  }
  await page.keyboard.up("Control");
  await page.waitForTimeout(120);
}

/** Tap a point along a slider track, as a percentage of its width. */
async function slideTo(page, selector, pct) {
  const { box } = await centre(page, selector);
  const x = box.x + (box.width * pct) / 100;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y);
  await page.mouse.up();
  await page.waitForTimeout(120);
}

async function tap(page, selector) {
  await page.locator(selector).first().click({ timeout: ACT_TIMEOUT });
  await page.waitForTimeout(90);
}

const seen = (page, selector) => page.locator(selector).first().isVisible().catch(() => false);

/* ──────────────────────────────────────────────── keyboard typing ────────── */

const LETTER_LAYOUT = "qwertyuiopasdfghjklzxcvbnm";

async function ensureLayout(page, want) {
  for (let i = 0; i < 3; i++) {
    const label = await page.locator('[data-phone-control="kb-layout"]').first().textContent();
    const isLetters = label?.trim() === "123"; // the key offers the *other* layout
    if ((want === "letters") === isLetters) return;
    await tap(page, '[data-phone-control="kb-layout"]');
  }
}

/** Tap out a string on the glass keyboard, exactly as a learner would. */
async function typeOnGlass(page, text) {
  for (const ch of text) {
    if (ch === " ") {
      await tap(page, '[data-phone-key=" "]');
      continue;
    }
    const lower = ch.toLowerCase();
    if (LETTER_LAYOUT.includes(lower)) {
      await ensureLayout(page, "letters");
      // Shift may already be on — the lesson before this one often asks for it as
      // a step of its own. Tapping it again would switch it *off* and quietly
      // type a lowercase letter into a step that is checking for a capital.
      const shift = page.locator('[data-phone-control="kb-shift"]').first();
      const alreadyOn = (await shift.getAttribute("aria-label").catch(() => null)) === "Shift on";
      if (ch !== lower && !alreadyOn) await tap(page, '[data-phone-control="kb-shift"]');
      if (ch === lower && alreadyOn) await tap(page, '[data-phone-control="kb-shift"]');
      await tap(page, `[data-phone-key="${lower}"]`);
      continue;
    }
    await ensureLayout(page, "numbers");
    await tap(page, `[data-phone-key="${cssEscape(ch)}"]`);
  }
}

const cssEscape = (s) => s.replace(/["\\]/g, "\\$&");

/* ───────────────────────────────────────────── getting to the right screen ── */

/**
 * Assessment lessons list outcomes, not routes — "write the word Friday" says
 * nothing about opening Notes first. A learner works that out; the harness has
 * to be told. Each entry is "if this is not on screen, do these things".
 */
async function ensureFor(page, step, lesson) {
  // "Is the keyboard up?" has to be true in all three layouts. Asking for the
  // Shift key was wrong: Shift only exists on the letters layout, so the moment a
  // lesson switched to numbers the harness decided the keyboard had closed and
  // went off to reopen Notes over the top of a perfectly good one.
  const kb = '[data-phone-control="kb-layout"], [data-phone-control="kb-abc"]';
  const a = step.action;

  // A Quick Settings panel left open covers everything underneath it.
  if (a !== "close-quick-settings" && a !== "quick-toggle" && a !== "quick-slider" && (await seen(page, "[data-phone-quickclose]"))) {
    await drag(page, "[data-phone-quickclose]", 0, -70);
  }

  if (["type-text", "shift-key", "numbers-key", "backspace-key", "emoji-key", "pick-emoji", "tap-suggestion"].includes(a)) {
    if (await seen(page, kb)) return;
    // Where the writing goes depends on what else the lesson asks for.
    const messaging = lesson.steps.some((s) => s.action === "send-message");
    if (messaging) {
      await ensureFor(page, { action: "send-message" }, lesson);
      await tap(page, '[data-phone-control="composer"]');
    } else {
      await goApp(page, "notes");
      await tap(page, '[data-phone-control="note"]');
    }
    return;
  }

  if (a === "send-message") {
    if (await seen(page, '[data-phone-control="send"]')) return;
    await goApp(page, "messages");
    await tap(page, '[data-phone-thread="Alex"]');
    return;
  }

  if (a === "report-junk") {
    if (await seen(page, '[data-phone-control="report-junk"]')) return;
    if (await seen(page, '[data-phone-control="back"]')) await tap(page, '[data-phone-control="back"]');
    await goApp(page, "messages");
    await tap(page, '[data-phone-thread="Unknown"]');
    return;
  }

  if (a === "swipe-row" || a === "delete-row" || a === "open-thread") {
    if (await seen(page, "[data-phone-thread]")) return;
    if (await seen(page, '[data-phone-control="back"]')) await tap(page, '[data-phone-control="back"]');
    await goApp(page, "messages");
    return;
  }

  if (a === "pinch-photo") {
    if (await seen(page, "[data-phone-photoview]")) return;
    await goApp(page, "photos");
    await tap(page, "[data-phone-photo]");
    return;
  }

  if (a === "open-section" || a === "join-wifi" || a === "toggle" || a === "slider") {
    if (a === "slider" && (await seen(page, `[data-phone-slider="${step.target}"]`))) return;
    if (a === "join-wifi" && (await seen(page, `[data-phone-row="${step.target}"]`))) return;
    if (a === "open-section" && (await seen(page, `[data-phone-section="${step.target}"]`))) return;
    if (a === "toggle" && (await seen(page, `[data-phone-toggle="${step.target}"]`))) return;
    if (await seen(page, '[data-phone-control="back"]')) await tap(page, '[data-phone-control="back"]');
    if (!(await seen(page, "[data-phone-section]"))) await goApp(page, "settings");
    if (a === "join-wifi") await tap(page, '[data-phone-section="wifi"]');
    if (a === "slider") await tap(page, '[data-phone-section="display"]');
  }
}

/** Get to the home screen and open an app, however deep we currently are. */
async function goApp(page, id) {
  if (!(await seen(page, `[data-phone-app="${id}"]`))) {
    await drag(page, "[data-phone-homebar]", 0, -70);
  }
  await tap(page, `[data-phone-app="${id}"]`);
}

/* ────────────────────────────────────────────────────── the solver ───────── */

async function perform(page, step) {
  const t = step.target;
  switch (step.action) {
    case "open-app":
      return tap(page, `[data-phone-app="${t}"]`);
    case "go-home":
      return NEGATIVE ? tap(page, "[data-phone-homebar]") : drag(page, "[data-phone-homebar]", 0, -70);
    case "back":
      return tap(page, '[data-phone-control="back"]');
    case "open-quick-settings":
      return NEGATIVE ? tap(page, "[data-phone-statusbar]") : drag(page, "[data-phone-statusbar]", 0, 70);
    case "close-quick-settings":
      return NEGATIVE ? tap(page, "[data-phone-quickclose]") : drag(page, "[data-phone-quickclose]", 0, -70);
    case "quick-toggle":
      return tap(page, `[data-phone-quick="${t}"]`);
    case "quick-slider":
    case "slider":
      return slideTo(page, `[data-phone-slider="${t}"]`, Math.round(((step.min ?? 0) + (step.max ?? 100)) / 2));
    case "long-press-app":
      return NEGATIVE ? tap(page, `[data-phone-app="${t}"]`) : hold(page, `[data-phone-app="${t}"]`);
    case "app-menu":
      return tap(page, `[data-phone-menu="${t}"]`);
    case "drag-app": {
      if (NEGATIVE) return tap(page, `[data-phone-app="${t}"]`);
      const from = await centre(page, `[data-phone-app="${t}"]`);
      const to = await centre(page, "[data-phone-dock]");
      return drag(page, `[data-phone-app="${t}"]`, to.x - from.x, to.y - from.y);
    }
    case "done-arranging":
      return tap(page, '[data-phone-control="done-arranging"]');
    case "scroll-to": {
      if (NEGATIVE) return tap(page, "[data-phone-section]");
      const list = await centre(page, "[data-phone-section]");
      await page.mouse.move(list.x, list.y);
      for (let i = 0; i < 12; i++) {
        if (await seen(page, `[data-phone-row="${t}"]`)) {
          const box = await page.locator(`[data-phone-row="${t}"]`).first().boundingBox();
          if (box && box.y > 0 && box.y + box.height < page.viewportSize().height) break;
        }
        await page.mouse.wheel(0, 160);
        await page.waitForTimeout(70);
      }
      await page.waitForTimeout(200);
      return;
    }
    case "swipe-row":
      return NEGATIVE ? tap(page, `[data-phone-thread="${t}"]`) : drag(page, `[data-phone-thread="${t}"]`, -100, 0);
    case "delete-row":
      return tap(page, `[data-phone-delete="${t}"]`);
    case "tap-editor":
      return (await seen(page, '[data-phone-control="composer"]'))
        ? tap(page, '[data-phone-control="composer"]')
        : tap(page, '[data-phone-control="note"]');
    case "type-text":
      return typeOnGlass(page, step.value ?? "");
    case "shift-key":
      return tap(page, '[data-phone-control="kb-shift"]');
    case "numbers-key":
      return ensureLayout(page, "numbers");
    case "backspace-key":
      return tap(page, '[data-phone-control="kb-backspace"]');
    case "tap-suggestion":
      return tap(page, `[data-phone-suggestion="${step.value}"]`);
    case "emoji-key":
      return tap(page, '[data-phone-control="kb-emoji"]');
    case "pick-emoji":
      return tap(page, `[data-phone-emoji="${step.value ?? "heart"}"]`);
    case "open-thread":
      return tap(page, `[data-phone-thread="${t}"]`);
    case "send-message":
      return tap(page, '[data-phone-control="send"]');
    case "attach-photo":
      await tap(page, '[data-phone-control="attach"]');
      return tap(page, `[data-phone-photo="${t}"]`);
    case "report-junk":
      return tap(page, '[data-phone-control="report-junk"]');
    case "take-photo":
      return tap(page, '[data-phone-control="shutter"]');
    case "open-photo":
      return tap(page, `[data-phone-photo="${t}"]`);
    case "pinch-photo":
      return NEGATIVE ? tap(page, "[data-phone-photoview]") : pinch(page, "[data-phone-photoview]", step.dir);
    case "delete-photo":
      return tap(page, '[data-phone-control="delete-photo"]');
    case "share-photo":
      await tap(page, '[data-phone-control="share"]');
      return tap(page, `[data-phone-contact="${t}"]`);
    case "open-section":
      return tap(page, `[data-phone-section="${t}"]`);
    case "toggle":
      return tap(page, `[data-phone-toggle="${t}"]`);
    case "join-wifi":
      return tap(page, `[data-phone-row="${t}"]`);
    case "permission":
      return tap(page, `[data-phone-control="permission-${step.value}"]`);
    default:
      throw new Error(`no solver for action "${step.action}"`);
  }
}

/* ──────────────────────────────────────────────────────── the run ────────── */

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => consoleErrors.push(String(e)));

await page.goto(`${BASE}/phone`, { waitUntil: "networkidle" });

// Dismiss the storage notice, as a learner does on their first visit. It is a
// one-time disclosure and it takes real height off a 390px screen; leaving it up
// for the whole run would measure a layout nobody past their first minute sees.
await page
  .getByRole("button", { name: "Got it" })
  .click({ timeout: 3000 })
  .catch(() => {});

const course = await page.evaluate(() => window.__phoneCourse);
if (!course) {
  console.log("Could not read the phone course off the page — is the dev server running?");
  await browser.close();
  process.exit(1);
}
const lessons = course.flatMap((u) => u.lessons).filter((l) => !filter || l.slug.includes(filter) || l.title.toLowerCase().includes(filter.toLowerCase()));

console.log(`Playing ${lessons.length} phone lessons at 390x844${NEGATIVE ? "   [NEGATIVE CONTROL]" : ""}\n`);

/* Structural checks that do not need a lesson played. */
{
  // A phone slug must never collide with a laptop lesson slug — they share one
  // completed-slugs list, and a collision would silently tick the wrong lesson.
  const laptop = new Set(
    fs
      .readdirSync(path.join(ROOT, "content/lessons"))
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, "content/lessons", f), "utf8")).slug),
  );
  const phoneSlugs = course.flatMap((u) => u.lessons.map((l) => l.slug));
  for (const s of phoneSlugs) {
    if (laptop.has(s)) note(`slug "${s}" exists in both courses`);
    if (!s.startsWith("phone-")) note(`slug "${s}" does not start with "phone-"`);
  }
  if (new Set(phoneSlugs).size !== phoneSlugs.length) note("two phone lessons share a slug");

  // The guard that turns phone visitors away must not fire on the phone course.
  if (await page.getByText("You are on a phone").isVisible().catch(() => false))
    note("SmallScreenGuard is covering /phone");

  // Nothing may scroll sideways on a 390px screen.
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (wide) note("/phone scrolls sideways at 390px");
  console.log(`  ${phoneSlugs.length} slugs, no collisions, no sideways scroll\n`);
}

/**
 * WCAG AA inside the simulated phone, measured with the same maths the laptop
 * playground uses — `scripts/lib/sim-contrast.mjs`, not a second copy of it.
 *
 * It rides along with the play-through rather than being its own harness for the
 * same reason `sim-contrast-check` walks each lesson forward: measuring on mount
 * measures the home screen, and everything the course is about — the keyboard,
 * the message thread, the settings panels, the scam text — only exists once
 * somebody has tapped their way to it.
 */
const byDefect = new Map();
let textRuns = 0;
let borders = 0;

async function measureNow(page, slug) {
  const res = await page.evaluate(MEASURE, false);
  if (res.error) return;
  textRuns += res.badText.length + res.okCount;
  borders += (res.badUi?.length ?? 0) + (res.okUiCount ?? 0);
  const rows = [
    ...res.badText.map((t) => ({ ...t, kind: "text" })),
    ...(res.badUi ?? []).map((t) => ({ ...t, kind: "border" })),
  ];
  for (const t of rows) {
    const key = `${t.kind}|${t.fg}|${t.bg}|${t.cls}`;
    const hit = byDefect.get(key) ?? { ...t, slugs: new Set(), samples: new Set() };
    hit.slugs.add(slug);
    hit.samples.add(t.text);
    byDefect.set(key, hit);
  }
}

let played = 0;
for (const lesson of lessons) {
  process.stdout.write(`  ${lesson.slug} … `);
  const before = failures.length;

  await page.goto(`${BASE}/phone`, { waitUntil: "networkidle" });
  await tap(page, `[data-phone-lesson="${lesson.slug}"]`);
  await tap(page, "[data-phone-start]");
  if (!NEGATIVE) await measureNow(page, lesson.slug);

  for (const [i, step] of lesson.steps.entries()) {
    try {
      await ensureFor(page, step, lesson);
      await perform(page, step);
      if (!NEGATIVE) await measureNow(page, lesson.slug);
    } catch (e) {
      note(`${lesson.slug} step ${i + 1} (${step.action}): ${String(e).split("\n")[0]}`);
      break;
    }
  }

  // Finished means the finish card, not a step counter that looks close enough.
  // Two locators OR'd rather than one comma-separated string: `text=` is not CSS,
  // so a combined selector throws — and the `.catch` below would have quietly
  // turned that throw into "did not finish" for all 23 lessons.
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

if (consoleErrors.length) {
  console.log(`\n  ${consoleErrors.length} console error(s):`);
  for (const e of [...new Set(consoleErrors)].slice(0, 5)) note(`console: ${e.slice(0, 160)}`);
}

await browser.close();

if (!NEGATIVE) {
  console.log(
    `\n  Contrast: ${textRuns} text run(s) and ${borders} control border(s) measured inside the phone.`,
  );
  for (const d of byDefect.values()) {
    note(
      `contrast ${d.kind}: ${d.fg} on ${d.bg} is ${d.ratio}:1 — ${d.cls || "(no class)"} ` +
        `in ${[...d.slugs].slice(0, 3).join(", ")} e.g. "${[...d.samples][0]?.slice(0, 40)}"`,
    );
  }
}

console.log(`\n${played}/${lessons.length} phone lessons played to the end.`);

if (NEGATIVE) {
  console.log(
    failures.length
      ? `Negative control worked — ${failures.length} finding(s), as intended.`
      : "NEGATIVE CONTROL CAME BACK CLEAN. Every gesture can be satisfied with a plain click; this check is not measuring gestures.",
  );
  process.exit(failures.length ? 0 : 1);
}
console.log(failures.length ? `${failures.length} finding(s).` : "Every phone lesson can be finished with a finger.");
process.exit(failures.length ? 1 : 0);
