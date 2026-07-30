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

const NEGATIVE = process.env.SIMDARK_NEGATIVE === "1";
const VERBOSE = process.env.SIMDARK_VERBOSE === "1";
const SHOT_DIR = process.env.SIMDARK_SHOTS ?? null;

/** Dock apps, by the aria-label their dock button carries. */
const APPS = [
  "Messages", "Browser", "Files", "Mail", "Photos",
  "App Market", "Calendar", "Reminders", "Notes",
];

const findings = [];
const accentAdvisory = [];
const note = (app, kind, detail) => findings.push({ app, kind, detail });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 940 } });
page.on("console", (m) => m.type() === "error" && console.log("  [console error]", m.text()));

await page.goto("http://localhost:3000/playground", { waitUntil: "networkidle" });

// ── Measurement, in the page ────────────────────────────────────────────────────

const MEASURE = () => {
  const lum = (r, g, b) => {
    const f = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const parse = (s) => {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(s || "");
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  };
  const ratio = (a, b) => {
    const [hi, lo] = a > b ? [a, b] : [b, a];
    return (hi + 0.05) / (lo + 0.05);
  };

  const scope = document.querySelector(".sim-dark");
  if (!scope) return { error: "no .sim-dark root — dark mode did not turn on" };

  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };

  /** The first ancestor background that is actually opaque enough to be the ground. */
  const groundOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a >= 0.85) return { color: c, on: n };
      n = n.parentElement;
    }
    return null;
  };

  /**
   * Is this color a neutral — a gray, a white, an off-white?
   *
   * Only neutrals are this check's business. A pastel accent that stays put in
   * dark mode (the blue pill on today's date, an orange "Ads" chip, a yellow
   * highlight) is a deliberate fixed color, and the first version of this check
   * reported every one of them: 200 findings, of which about four were real. A
   * missed *neutral* surface is the actual defect — those are the ones that were
   * supposed to flip and did not.
   *
   * The threshold is 32 and it is load-bearing. Tailwind's grays are slightly blue:
   * gray-900 is rgb(17,24,39), a channel spread of 22, and gray-700 reaches 26. The
   * first version of this used 20 and so classified gray-900 as an *accent* — which
   * quietly filed every "1:1, invisible text on gray-900" result under advisory,
   * the exact findings this check exists to surface. 32 keeps the whole gray ramp
   * while still excluding real tints (orange-100 spreads 42, blue-100 spreads 63).
   */
  const neutral = (c) => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) <= 32;

  /**
   * Glyphs, rules and dots painted with `bg-current` are backgrounds to the
   * browser and light-on-dark by design — a 42px² light "surface" is the minimize
   * dash, not an unpainted panel. Anything genuinely missed is far bigger.
   */
  const MIN_AREA = 400;

  const lightSurfaces = [];
  const badText = [];
  const accentText = [];
  const okText = [];
  let skipped = 0;

  for (const el of scope.querySelectorAll("*")) {
    if (el.closest("[data-sim-paper]")) {
      skipped++;
      continue;
    }
    if (!visible(el)) continue;

    // 1. A near-white neutral ground of its own.
    const own = parse(getComputedStyle(el).backgroundColor);
    if (own && own.a >= 0.85 && neutral(own) && lum(own.r, own.g, own.b) > 0.6) {
      const r = el.getBoundingClientRect();
      const area = Math.round(r.width * r.height);
      if (area >= MIN_AREA) {
        lightSurfaces.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.getAttribute("class") || "").slice(0, 120),
          rgb: `${own.r},${own.g},${own.b}`,
          area,
          text: (el.textContent || "").trim().slice(0, 40),
        });
      }
    }

    // 2. Readable text. Only elements that own a text node directly, so a
    //    paragraph is measured once instead of once per wrapper above it.
    const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!direct) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    const ground = groundOf(el);
    if (!fg || !ground) continue;
    const size = parseFloat(cs.fontSize);
    const bold = +cs.fontWeight >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const cr = ratio(lum(fg.r, fg.g, fg.b), lum(ground.color.r, ground.color.g, ground.color.b));
    const need = large ? 3 : 4.5;
    const rec = {
      text: el.textContent.trim().slice(0, 46),
      ratio: Math.round(cr * 100) / 100,
      need,
      fg: `${fg.r},${fg.g},${fg.b}`,
      bg: `${ground.color.r},${ground.color.g},${ground.color.b}`,
      cls: (el.getAttribute("class") || "").slice(0, 110),
    };
    if (cr >= need) okText.push(rec);
    else if (neutral(ground.color)) badText.push(rec);
    // Short of AA, but on a saturated accent — white on blue-500, say. That reads
    // exactly the same with the setting off, so it is not this reskin's doing and
    // failing here would blame dark mode for a light-mode shortfall. Printed in its
    // own bucket so the information survives; contrast-check owns the site's AA.
    else accentText.push(rec);
  }

  return { lightSurfaces, badText, accentText, okCount: okText.length, skipped };
};

// ── Drive the desktop into dark mode ───────────────────────────────────────────

const dock = (label) => page.locator(`button[aria-label="${label}"]`).first();
const settle = async (ms = 700) => page.waitForTimeout(ms);

console.log("\nTurning on Dark Mode in the practice computer's own Settings");
await dock("Settings").click();
await settle(800);
await page.locator('button:has-text("Appearance")').first().click();
await settle(300);
await page.locator('button:has-text("Dark Mode")').first().click();
await settle(800);

const darkOn = await page.locator(".sim-dark").count();
if (!darkOn) {
  console.log("  FAIL  the desktop never got the sim-dark class — nothing else can be trusted");
  await browser.close();
  process.exit(1);
}
console.log("  ok    the desktop is in dark mode");

// Close Settings; it has always handled dark itself and is not what this checks.
await page.locator('.absolute.shadow-2xl:has(span:text-is("Settings")) button[aria-label="Close"]').first().click();
await settle(400);

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

// ── Walk the dock ──────────────────────────────────────────────────────────────

for (const app of APPS) {
  await dock(app).click();
  await settle(850);

  const res = await page.evaluate(MEASURE);
  if (res.error) {
    note(app, "no-scope", res.error);
    continue;
  }

  for (const s of res.lightSurfaces) {
    note(app, "light surface", `<${s.tag}> rgb(${s.rgb}) ${s.area}px²  "${s.text}"  class="${s.cls}"`);
  }
  for (const t of res.badText) {
    note(app, "unreadable text", `${t.ratio}:1 (needs ${t.need}) fg(${t.fg}) on bg(${t.bg})  "${t.text}"  class="${t.cls}"`);
  }

  for (const t of res.accentText) accentAdvisory.push({ app, ...t });

  const bad = res.lightSurfaces.length + res.badText.length;
  // The skipped count is printed on every line, passes included, and that is
  // deliberate. A `data-sim-paper` marker placed on a container that also holds
  // chrome makes this check skip real defects and still say "ok" — which is exactly
  // what happened to the browser's new-tab page. A number here means a suddenly
  // large skip is visible instead of silent.
  console.log(
    `  ${bad ? "FAIL" : "ok  "}  ${app.padEnd(11)} ` +
      `${res.lightSurfaces.length} light surface(s), ${res.badText.length} unreadable of ${res.badText.length + res.okCount} text node(s)` +
      `, ${res.skipped} skipped as paper`,
  );
  if (VERBOSE && bad) {
    for (const s of res.lightSurfaces) console.log(`          light: ${s.cls}`);
    for (const t of res.badText) console.log(`          text ${t.ratio}:1  ${t.cls}`);
  }
  if (SHOT_DIR) await page.screenshot({ path: `${SHOT_DIR}/${app.replace(/\s+/g, "-").toLowerCase()}.png` });

  // Close it again so each app is measured on its own, not through the one before.
  const close = page.locator(`.absolute.shadow-2xl:has(span:text-is("${app}")) button[aria-label="Close"]`).first();
  if (await close.count()) await close.click();
  await settle(350);
}

await browser.close();

// ── Report ────────────────────────────────────────────────────────────────────

console.log("");
if (accentAdvisory.length) {
  const seen = new Map();
  for (const a of accentAdvisory) seen.set(`${a.fg}|${a.bg}|${a.text}`, a);
  console.log(
    `Advisory — ${seen.size} text run(s) short of AA on a saturated accent. These look\n` +
      "identical with Dark Mode off, so they are not findings here; they belong to\n" +
      "contrast-check's remit if anyone wants them fixed:",
  );
  for (const a of seen.values()) console.log(`   ${a.ratio}:1 (needs ${a.need})  fg(${a.fg}) on bg(${a.bg})  "${a.text}"`);
  console.log("");
}

if (findings.length) {
  const byApp = new Map();
  for (const f of findings) byApp.set(f.app, [...(byApp.get(f.app) ?? []), f]);
  for (const [app, list] of byApp) {
    console.log(`${app} — ${list.length} finding(s)`);
    for (const f of list.slice(0, 12)) console.log(`   ${f.kind}: ${f.detail}`);
    if (list.length > 12) console.log(`   … and ${list.length - 12} more`);
  }
  console.log(`\n${findings.length} finding(s) across ${byApp.size} app(s).`);
  if (NEGATIVE) console.log("SIMDARK_NEGATIVE=1 was set, so findings are the expected result.");
  process.exit(NEGATIVE ? 0 : 1);
}

if (NEGATIVE) {
  console.log("SIMDARK_NEGATIVE=1 produced no findings — the check is blind. Fix the check.");
  process.exit(1);
}
console.log(`Dark mode reaches all ${APPS.length} dock apps: no light surfaces, no unreadable text.`);
