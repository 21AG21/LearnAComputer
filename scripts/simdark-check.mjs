#!/usr/bin/env node
/**
 * Does the practice computer's Dark Mode reach the apps?
 *
 *   npm run dev            (in another terminal)
 *   node scripts/simdark-check.mjs
 *
 * Unit 9 teaches the learner to open Settings and turn on Dark Mode. For most of
 * this course's life that reskinned the wallpaper, the menu bar, the dock and
 * Settings itself — and nothing else. Open Mail or Notes from the dock afterwards
 * and a blazing white window landed on the dark desktop. Dr. Digital's own success
 * line was written around it: "the menu bar, dock and background all followed".
 *
 * No other harness could see this. solve-check, ring-check, stray-check and
 * desktop-check all drive the DOM and never look at a color; mount-check only asks
 * whether a component throws; contrast-check measures the *site*, in the site's own
 * two themes, and never touches the setting inside the simulator. A half-painted
 * dark mode is invisible to every one of them and obvious to any buyer who clicks
 * the toggle the lesson just taught.
 *
 * What this checks, per app, with the practice computer in dark mode:
 *
 *   1. **Nothing is still light.** Any visible element painting a near-white
 *      background of its own is reported. The exception is marked in the DOM
 *      rather than listed here: `data-sim-paper` means "this surface is a web
 *      page, a PDF page or a rendered document, and a real dark-mode browser or
 *      viewer does not repaint those either". Anything inside such an element is
 *      skipped. A missing marker is a finding, which is the right default — it
 *      fails loud on a surface nobody thought about.
 *
 *      A marker that is too *broad* is the dangerous direction, and it has already
 *      bitten once: `data-sim-paper` on the browser's whole page area also covered
 *      its new-tab page, which is browser furniture, not a website. That page kept a
 *      white ground while its text went light — white-on-white Favorites tiles — and
 *      this check dutifully skipped the region and called the browser clean. A
 *      screenshot caught what the check could not. Every line of output now prints
 *      how many elements it skipped, so an over-broad marker shows up as a number
 *      instead of as silence.
 *
 *   2. **Every word is still readable.** For each text node it resolves the real
 *      background by walking ancestors to the first opaque background-color, and
 *      scores WCAG contrast. Below 4.5:1 (3:1 for large text) is a finding. This
 *      is the half that catches the subtler bug: pairing a surface but not the
 *      text on it, or vice versa, which reads as "the app is broken" rather than
 *      "the app is light".
 *
 * SIMDARK_NEGATIVE=1 is the negative control, and it has been watched to fail: 69
 * findings across all nine apps. It puts back the white on every `sim-dark:bg-gray-800`
 * surface — the sidebars, toolbars and popovers — which trips both halves at once,
 * because the text on those surfaces stays light. A clean run under this flag means
 * the check has gone blind and its all-clear means nothing. Per the house rule in
 * CLAUDE.md: when a new check comes back clean, go find what it should have caught
 * before believing it.
 *
 * SIMDARK_VERBOSE=1 prints each finding's class list under its app.
 * SIMDARK_SHOTS=<dir> saves a screenshot per app — worth doing after any change
 * here, since the new-tab bug above was found by looking, not by measuring.
 *
 * Exits 1 on any finding.
 */
import { chromium } from "playwright";
import { MEASURE } from "./lib/sim-contrast.mjs";

const NEGATIVE = process.env.SIMDARK_NEGATIVE === "1";
const VERBOSE = process.env.SIMDARK_VERBOSE === "1";
const SHOT_DIR = process.env.SIMDARK_SHOTS ?? null;

/** Dock apps, by the aria-label their dock button carries. */
const APPS = [
  "Messages", "Browser", "Files", "Mail", "Photos",
  "App Market", "Calendar", "Reminders", "Notes",
];

const findings = [];
/** key -> set of modes it failed in, so the report can say "both themes". */
const seenText = new Map();
const note = (app, mode, kind, detail) => findings.push({ app, mode, kind, detail });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 940 } });
page.on("console", (m) => m.type() === "error" && console.log("  [console error]", m.text()));

await page.goto("http://localhost:3000/playground", { waitUntil: "networkidle" });

// ── Walk the dock, once per theme ──────────────────────────────────────────────

const dock = (label) => page.locator(`button[aria-label="${label}"]`).first();
const settle = async (ms = 700) => page.waitForTimeout(ms);

async function closeIfOpen(app) {
  const close = page.locator(`.absolute.shadow-2xl:has(span:text-is("${app}")) button[aria-label="Close"]`).first();
  if (await close.count()) await close.click();
  await settle(350);
}

/**
 * @param mode "light" | "dark"
 *
 * The light pass is not decoration. Until it existed, nothing in the repo measured
 * text contrast *inside* the simulator in its normal theme: `contrast-check` visits
 * site pages and never clicks "Start activity", so every control the learner
 * actually uses went unmeasured. That gap hid 38 white-on-blue-500 buttons at
 * 3.66:1 across eleven files.
 *
 * Running both passes also retires a piece of self-deception. An earlier version
 * filed any shortfall on a saturated ground under "advisory", on the theory that it
 * looked the same with Dark Mode off and so was not this reskin's fault. True, and
 * beside the point: a button nobody can read is a defect in whichever theme it
 * appears. Measuring both modes answers the question the excuse was dodging, so
 * findings are now findings and the mode is just a label on them.
 */
async function pass(mode) {
  const wantDark = mode === "dark";
  const perApp = [];
  console.log(`\n${wantDark ? "Dark" : "Light"} mode`);

  for (const app of APPS) {
    await dock(app).click();
    await settle(850);

    const res = await page.evaluate(MEASURE, wantDark);
    if (res.error) {
      note(app, mode, "no-scope", res.error);
      continue;
    }

    for (const s of res.lightSurfaces) {
      note(app, mode, "light surface", `<${s.tag}> rgb(${s.rgb}) ${s.area}px²  "${s.text}"  class="${s.cls}"`);
    }
    for (const t of res.badUi ?? []) {
      note(app, mode, "control border", `${t.ratio}:1 (needs 3) ${t.fg} on ${t.bg}  "${t.text}"  class="${t.cls}"`);
    }
    for (const t of res.badText) {
      note(app, mode, "unreadable text", `${t.ratio}:1 (needs ${t.need}) fg(${t.fg}) on bg(${t.bg})  "${t.text}"  class="${t.cls}"`);
      seenText.set(`${t.fg}|${t.bg}|${t.text}`, (seenText.get(`${t.fg}|${t.bg}|${t.text}`) ?? new Set()).add(mode));
    }

    const bad = res.lightSurfaces.length + res.badText.length + (res.badUi?.length ?? 0);
    // The skipped count is printed on every line, passes included, and that is
    // deliberate. A `data-sim-paper` marker placed on a container that also holds
    // chrome makes this check skip real defects and still say "ok" — which is exactly
    // what happened to the browser's new-tab page. A number here means a suddenly
    // large skip is visible instead of silent.
    console.log(
      `  ${bad ? "FAIL" : "ok  "}  ${app.padEnd(11)} ` +
        `${res.lightSurfaces.length} light surface(s), ${res.badText.length} unreadable of ${res.badText.length + res.okCount} text node(s)` +
        `, ${(res.badUi ?? []).length} border(s) under 3:1, ${res.skipped} skipped as paper`,
    );
    if (VERBOSE && bad) {
      for (const s of res.lightSurfaces) console.log(`          light: ${s.cls}`);
      for (const t of res.badText) console.log(`          text ${t.ratio}:1  ${t.cls}`);
    }
    if (SHOT_DIR) {
      await page.screenshot({ path: `${SHOT_DIR}/${mode}-${app.replace(/\s+/g, "-").toLowerCase()}.png` });
    }

    // Close it again so each app is measured on its own, not through the one before.
    await closeIfOpen(app);
    perApp.push(app);
  }
  return perApp;
}

// Light first: the desktop boots light, so this needs no setup and establishes
// which findings are theme-independent before anything is toggled.
await pass("light");

console.log("\nTurning on Dark Mode in the practice computer's own Settings");
await dock("Settings").click();
await settle(800);
await page.locator('button:has-text("Appearance")').first().click();
await settle(300);
await page.locator('button:has-text("Dark Mode")').first().click();
await settle(800);

if (!(await page.locator(".sim-dark").count())) {
  console.log("  FAIL  the desktop never got the sim-dark class — nothing else can be trusted");
  await browser.close();
  process.exit(1);
}
console.log("  ok    the desktop is in dark mode");

// Close Settings; it has always handled dark itself and is not what this checks.
await closeIfOpen("Settings");

if (NEGATIVE) {
  console.log("\n  SIMDARK_NEGATIVE=1 — undoing every gray-800 surface on purpose");
  // Exactly the bug this check exists for: a surface that was supposed to flip and
  // did not. Reverting `sim-dark:bg-gray-800` puts back the white sidebars, toolbars
  // and popovers across every app — and because the text on them stays light, it
  // trips both halves at once, the light-surface test and the readability test. If
  // this run comes back clean, the check is measuring nothing.
  await page.addStyleTag({
    content: `.sim-dark .sim-dark\\:bg-gray-800 { background-color: #ffffff !important; }`,
  });
}

await pass("dark");

await browser.close();

// ── Report ────────────────────────────────────────────────────────────────────

console.log("");

if (findings.length) {
  const bothThemes = [...seenText.entries()].filter(([, m]) => m.size === 2).length;
  const byKey = new Map();
  for (const f of findings) {
    const k = `${f.mode} · ${f.app}`;
    byKey.set(k, [...(byKey.get(k) ?? []), f]);
  }
  for (const [k, list] of byKey) {
    console.log(`${k} — ${list.length} finding(s)`);
    for (const f of list.slice(0, 12)) console.log(`   ${f.kind}: ${f.detail}`);
    if (list.length > 12) console.log(`   … and ${list.length - 12} more`);
  }
  console.log(`\n${findings.length} finding(s).`);
  if (bothThemes) {
    console.log(
      `${bothThemes} distinct text run(s) fail in BOTH themes — those are not dark-mode\n` +
        "damage, they were never readable. Fix the color, not the variant.",
    );
  }
  if (NEGATIVE) console.log("SIMDARK_NEGATIVE=1 was set, so findings are the expected result.");
  process.exit(NEGATIVE ? 0 : 1);
}

if (NEGATIVE) {
  console.log("SIMDARK_NEGATIVE=1 produced no findings — the check is blind. Fix the check.");
  process.exit(1);
}
console.log(
  `Both themes clean across all ${APPS.length} dock apps: no light surfaces left in dark mode,\n` +
    "and every text run meets WCAG AA in light and dark alike.",
);
