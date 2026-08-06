#!/usr/bin/env node
/**
 * Can a real finger hit it, and can a 75-year-old read it?
 *
 * Every other harness here asks whether a lesson can be *finished*, and they all
 * answer through the DOM — where `element.click()` lands perfectly on a 20×20
 * button and reads 11px text as easily as 17px. So the phone course could be
 * green on `phone-check` at 112/112 while being, for the person it is built for,
 * unusable: two persona audits found 108 controls under the 44px touch floor and
 * 248 text runs under 15px, and every gate in the repo was green through both.
 *
 * This one measures the two things a touch screen makes non-negotiable:
 *
 *   1. **Touch target size.** 44×44 CSS px is the accessibility floor, and this
 *      audience is defined by not being able to hit small things. Anything under
 *      **24px in either dimension is reported as critical** — that is WCAG 2.5.8's
 *      own minimum, and below it a tremor simply cannot land.
 *   2. **Text size.** Under 13px **fails**; 13–15px is reported as advisory.
 *      The split is deliberate. There is no WCAG minimum for text size, and a
 *      real phone sets a home-screen icon label at about 11px — so a blanket
 *      15px floor would have meant inflating every label in the course to serve
 *      a number rather than a person. Under 13px on a screen held at arm's
 *      length by someone with presbyopia is a different claim, and that one
 *      holds.
 *
 * It walks each lesson the way a learner does — click the pulsing ring, measure,
 * click the next ring — because the first screen of a guided lesson is never
 * where the lesson happens.
 *
 *   npm run dev                 # must be running on :3000
 *   npm run phone-touch-check
 *   npm run phone-touch-check -- messages   # one slug, or a substring
 *
 * ## What is deliberately NOT counted
 *
 * - **Inline links inside prose.** WCAG exempts them and so does every real
 *   phone; a sentence with a link in it cannot give the link 44px of height
 *   without becoming a list.
 * - **Disabled controls.** WCAG's own carve-out — a control you cannot press is
 *   not a target you can miss.
 * - **Anything off screen or zero-sized.** Not rendered is not a finding, and
 *   counting it drowns the ones that are.
 * - **The lesson's own chrome above the phone.** The banner is not the simulated
 *   device; it has its own rules and its own fixes.
 *
 * ## The negative control, and the way its first version lied
 *
 * `PHONETOUCH_NEGATIVE=1` shrinks the back arrow to well under the critical
 * floor and drops body text to 8px, then asserts **those exact defects come
 * back named**. Not "did it find anything" — the baseline finds plenty, so
 * counting findings proves nothing.
 *
 * The first version used `addStyleTag` once, before the loop. The loop calls
 * `page.goto` per lesson, which discards the sheet, so the negative run was the
 * ordinary run wearing a label — and it reported *fewer* findings than the
 * baseline, which was the only visible tell. `addInitScript` survives
 * navigation. Watched to fail: the shrunk back arrow and 29 8px text runs.
 */

import { chromium } from "playwright";

const filter = process.argv[2] ?? "";
const NEGATIVE = process.env.PHONETOUCH_NEGATIVE === "1";
const BASE = process.env.SOLVE_CHECK_URL ?? "http://localhost:3000";

/** The floor, and the point below which it stops being a near miss. */
const TARGET_MIN = 44;
const TARGET_CRITICAL = 24;
const TEXT_MIN = 15;
const TEXT_CRITICAL = 13;
/** How far into a lesson to walk. Past this, a lesson is repeating itself. */
const MAX_STEPS = 8;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  deviceScaleFactor: 2,
});

page.on("pageerror", (e) => console.error(`[pageerror] ${e.message}`));

try {
  await page.goto(`${BASE}/phone`, { waitUntil: "networkidle" });
} catch (e) {
  console.error(`Could not reach ${BASE} — is the dev server running? (${e.message})`);
  await browser.close();
  process.exit(2);
}

await page.getByRole("button", { name: "Got it" }).click({ timeout: 2500 }).catch(() => {});

const slugs = await page.$$eval("[data-phone-lesson]", (els) =>
  els.filter((e) => !e.hasAttribute("disabled")).map((e) => e.getAttribute("data-phone-lesson")),
);
const queue = filter ? slugs.filter((s) => s.includes(filter)) : slugs;

/**
 * The negative control, re-applied after every navigation.
 *
 * The first version called `addStyleTag` once, before the loop — and the loop
 * calls `page.goto` for each lesson, which throws the injected sheet away. So
 * the "negative" run was the ordinary run with a different label on it, and it
 * came back with *fewer* findings than the baseline, which is the tell. A
 * negative control that silently stops applying is worse than none: it is a
 * green light bolted to a disconnected wire.
 *
 * `addInitScript` survives navigation, and the defect it injects is specific
 * and known — the back arrow shrinks to well under the critical floor, and body
 * text drops to 8px — so the run can assert those exact strings came back.
 */
const NEGATIVE_CSS =
  "[data-phone-back]{padding:0 !important;margin:0 !important}" +
  "[data-phone-screen] button{min-height:0 !important;padding:1px !important}" +
  "[data-phone-screen] p,[data-phone-screen] span{font-size:8px !important}";

if (NEGATIVE) {
  await page.addInitScript((css) => {
    const inject = () => {
      const el = document.createElement("style");
      el.textContent = css;
      document.head.append(el);
    };
    if (document.head) inject();
    else document.addEventListener("DOMContentLoaded", inject);
  }, NEGATIVE_CSS);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Got it" }).click({ timeout: 1500 }).catch(() => {});
}

console.log(
  `Measuring touch targets and text in ${queue.length} lesson(s) at 390x844` +
    `${NEGATIVE ? "   [NEGATIVE CONTROL]" : ""}\n`,
);

/**
 * One measurement pass over whatever is currently on the simulated screen.
 *
 * Returns a de-duplicated list keyed by "what the learner would call it", so a
 * list of twenty identical rows reports once rather than twenty times — the
 * fix is one component either way, and twenty lines hides the other findings.
 */
const measure = () =>
  page.evaluate(
    ({ TARGET_MIN, TARGET_CRITICAL, TEXT_MIN, TEXT_CRITICAL }) => {
      const screen = document.querySelector("[data-phone-screen]");
      if (!screen) return { targets: [], text: [] };
      const view = screen.getBoundingClientRect();
      const onScreen = (r) =>
        r.width > 0 && r.height > 0 && r.bottom > view.top && r.top < view.bottom &&
        r.right > view.left && r.left < view.right;

      const name = (el) =>
        (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || el.tagName)
          .replace(/\s+/g, " ").trim().slice(0, 34) || el.tagName;

      const targets = [];
      const SEL = 'button, [role="button"], a[href], input:not([type="hidden"]), select, textarea';
      for (const el of screen.querySelectorAll(SEL)) {
        if (el.disabled || el.getAttribute("aria-disabled") === "true") continue;
        if (el.closest('[aria-hidden="true"]')) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || cs.pointerEvents === "none") continue;
        // Inline links inside prose: WCAG exempts them, and so does every phone.
        if (el.tagName === "A" && cs.display.startsWith("inline")) continue;
        const r = el.getBoundingClientRect();
        if (!onScreen(r)) continue;
        const w = Math.round(r.width), h = Math.round(r.height);
        if (w >= TARGET_MIN && h >= TARGET_MIN) continue;
        targets.push({
          label: name(el),
          w, h,
          critical: w < TARGET_CRITICAL || h < TARGET_CRITICAL,
        });
      }

      const text = [];
      const walker = document.createTreeWalker(screen, NodeFilter.SHOW_TEXT);
      const seen = new Set();
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const s = n.textContent?.trim();
        if (!s || s.length < 2) continue;
        const el = n.parentElement;
        if (!el || el.closest('[aria-hidden="true"]')) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none") continue;
        const size = parseFloat(cs.fontSize);
        if (!(size < TEXT_MIN)) continue;
        const r = el.getBoundingClientRect();
        if (!onScreen(r)) continue;
        const key = `${Math.round(size)}|${s.slice(0, 24)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        text.push({ size: Math.round(size * 10) / 10, quote: s.slice(0, 40), critical: size < TEXT_CRITICAL });
      }
      return { targets, text };
    },
    { TARGET_MIN, TARGET_CRITICAL, TEXT_MIN, TEXT_CRITICAL },
  );

/** Click the innermost pulsing ring — the one control the step is pointing at. */
const clickRing = () =>
  page.evaluate(() => {
    const rings = [...document.querySelectorAll("*")].filter(
      (e) => /animate-ring-pulse/.test((e.className || "").toString()) && e.getBoundingClientRect().width > 0,
    );
    const el = rings.find((x) => !rings.some((o) => o !== x && x.contains(o)));
    const hit = el?.closest("button") ?? el;
    if (!hit) return false;
    hit.click();
    return true;
  });

/** slug → the worst of each kind, so the report is one line per real problem. */
const findings = new Map();
const record = (slug, kind, item) => {
  const key = `${slug}|${kind}|${item.label ?? item.quote}|${item.w ?? item.size}`;
  if (!findings.has(key)) findings.set(key, { slug, kind, ...item });
};

for (const [i, slug] of queue.entries()) {
  try {
    await page.goto(`${BASE}/phone`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
    await page.locator(`[data-phone-lesson="${slug}"]`).click({ timeout: 5000 });
    await page.locator("[data-phone-start]").click({ timeout: 5000 });
    await page.waitForTimeout(700);

    for (let step = 0; step <= MAX_STEPS; step++) {
      const { targets, text } = await measure();
      for (const t of targets) record(slug, "target", t);
      for (const t of text) record(slug, "text", t);
      if (!(await clickRing())) break;
      await page.waitForTimeout(550);
    }
  } catch (e) {
    console.log(`  ! ${slug} — could not be walked (${e.message.split("\n")[0].slice(0, 70)})`);
  }
  if ((i + 1) % 10 === 0) console.log(`  ${i + 1} / ${queue.length}`);
}

await browser.close();

const all = [...findings.values()];
const targets = all.filter((f) => f.kind === "target");
const text = all.filter((f) => f.kind === "text");
const critical = all.filter((f) => f.critical);

/** Grouped by what the learner would call it: one label, every lesson it hurts. */
const group = (rows, key) => {
  const m = new Map();
  for (const r of rows) {
    const k = key(r);
    if (!m.has(k)) m.set(k, { ...r, slugs: new Set() });
    m.get(k).slugs.add(r.slug);
  }
  return [...m.values()].sort((a, b) => b.slugs.size - a.slugs.size);
};

console.log(`\n── Touch targets under ${TARGET_MIN}px ──`);
for (const g of group(targets, (r) => `${r.label}|${r.w}x${r.h}`).slice(0, 40)) {
  console.log(
    `  ${g.critical ? "!!" : "  "} ${String(g.w).padStart(3)}x${String(g.h).padEnd(3)}  ` +
      `${g.label.padEnd(34)} ${g.slugs.size} lesson(s): ${[...g.slugs].slice(0, 3).join(", ")}`,
  );
}

console.log(`\n── Text under ${TEXT_MIN}px ──`);
for (const g of group(text, (r) => `${r.size}|${r.quote}`).slice(0, 40)) {
  console.log(
    `  ${g.critical ? "!!" : "  "} ${String(g.size).padStart(4)}px  ${g.quote.padEnd(42)} ` +
      `${g.slugs.size} lesson(s): ${[...g.slugs].slice(0, 3).join(", ")}`,
  );
}

const label = NEGATIVE ? "   [NEGATIVE CONTROL]" : "";
console.log(
  `\n${targets.length} target finding(s), ${text.length} text finding(s), ` +
    `${critical.length} critical.${label}`,
);

if (NEGATIVE) {
  // Not "did it find anything" — the baseline finds plenty. Did it find the
  // *specific* defects that were injected? That is the only question that
  // distinguishes a working check from one whose style tag never applied.
  const sawShrunkBack = targets.some((t) => /back to the home/i.test(t.label) && t.critical);
  const sawTinyText = text.filter((t) => t.size <= 9).length;
  console.log(`\n  shrunk back arrow reported: ${sawShrunkBack}`);
  console.log(`  8px text runs reported:     ${sawTinyText}`);
  if (!sawShrunkBack || sawTinyText < 20) {
    console.error(
      "\nNEGATIVE CONTROL DID NOT SEE THE INJECTED DEFECT. This harness is not measuring what it claims.",
    );
    process.exit(1);
  }
  console.log("Negative control worked — the injected defects came back named.");
  process.exit(0);
}
/**
 * The gate is the floor, not the wish list.
 *
 * Targets under 44px and text under 13px fail the run. Text between 13 and 15
 * is printed and does not fail: see the note at the top — a number that forces
 * every icon label in the course wider than a real phone's is a number serving
 * itself. Keeping the advisory band visible is what stops it drifting down.
 */
const gating = [...targets, ...text.filter((t) => t.critical)];
console.log(
  gating.length === 0
    ? "\nEvery control is a finger's width and every word is legible."
    : `\n${gating.length} finding(s) below the floor.`,
);
process.exit(gating.length === 0 ? 0 : 1);
