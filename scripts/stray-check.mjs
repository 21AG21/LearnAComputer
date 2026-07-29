#!/usr/bin/env node
/**
 * What is the learner left with after they do the wrong thing?
 *
 * Every other harness in this repo does the moderate, correct thing.
 * solve-check performs exactly the current step's action and nothing else, so
 * it has never once clicked a control the lesson did not ask for. That blind
 * spot shipped a real bug: on Unit 1's window lesson, step 1 says "drag the
 * strip at the top of the window" — a learner who clicks the red ✕ instead was
 * left with an empty desktop, no glow anywhere, and a banner naming a window
 * that no longer existed. Recoverable from the dock, but the dock is what step
 * 4 teaches. solve-check was green through all of it.
 *
 * So this harness does the wrong thing on purpose and checks one invariant:
 *
 *   **After a stray click, the learner must still have a way forward** — a
 *   pulsing ring to follow, or words on screen telling them what happened.
 *
 * Never nothing. Nothing is where a beginner concludes they broke it and stops.
 *
 * Two wrong moves are tested, chosen because each already has a bug to its name:
 *
 *   close  (default) — close the window the step needs. Shipped a dead end in
 *          Unit 1 and, once this existed, in all ten accessibility lessons.
 *
 *   double — double-click the control the step is highlighting. **Unit 1 teaches
 *          double-clicking**, so learners double-click everything afterwards,
 *          and this repo already shipped a bug where double-pressing Next
 *          skipped an entire lesson's teaching. The invariant: a double-click
 *          must never advance more than one step. Skipping a step silently is
 *          worse than a dead end, because nothing on screen says it happened.
 *
 * Escape was investigated and deliberately left out: nothing in the product
 * responds to it (see docs/SAME_ICON_AUDIT.md § Round nine — the two lessons
 * that warned about it were warning about a hazard that no longer existed).
 *
 *   npm run stray-check                    # every guided lesson, closing windows
 *   npm run stray-check -- files           # slugs containing "files"
 *   STRAY=double npm run stray-check       # double-click the highlighted control
 *
 * Needs the dev server on :3000. Exits 1 when a learner can be stranded or
 * silently skipped past a step.
 *
 * NEGATIVE CONTROL: in GuidedDesktopTask, delete the "You closed the window"
 * block and the dock highlight that goes with it, then
 * `npm run stray-check -- working-with-windows`. It must FAIL. That is the
 * exact bug this was built for; if it passes, this file is decoration.
 */

import { chromium } from "playwright";

const filter = process.argv[2] ?? "";
const ACTION = process.env.STRAY === "double" ? "double" : "close";
const BASE = process.env.SOLVE_CHECK_URL ?? "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.error(`[pageerror] ${e.message}`));

try {
  await page.goto(`${BASE}/dev/stray-check`, { waitUntil: "networkidle" });
} catch (e) {
  console.error(`Could not reach ${BASE} — is the dev server running? (${e.message})`);
  await browser.close();
  process.exit(2);
}

await page.waitForFunction(() => Array.isArray(window.__strayList), undefined, { timeout: 15_000 });
const all = await page.evaluate(() => window.__strayList);
const slugs = filter ? all.filter((s) => s.includes(filter)) : all;

if (slugs.length === 0) {
  console.error(`No guided lessons match "${filter}".`);
  await browser.close();
  process.exit(2);
}

/** Is there a way forward on screen? A ring to follow, or words explaining. */
const readState = () =>
  page.evaluate(() => {
    const frame = document.querySelector("[data-sim-frame]");
    if (!frame) return { mounted: false };
    const rings = [...frame.querySelectorAll("*")].filter((e) => {
      const c = (e.className || "").toString();
      return /ring-yellow|animate-ring-pulse/.test(c) && e.offsetParent !== null;
    });
    // The banner always says something; only text inside the simulated screen
    // counts as telling the learner what just happened to it.
    const body = frame.lastElementChild?.textContent ?? "";
    return {
      mounted: true,
      done: frame.getAttribute("data-sim-done") === "1",
      rings: rings.length,
      explains: /closed|nothing is broken|open it again|click .* in the (row|dock)|reopen/i.test(body),
      closeButtons: frame.querySelectorAll('[aria-label="Close"]').length,
      progress: Number(frame.getAttribute("data-sim-progress") ?? 0),
      // Innermost ring: the control the step is actually pointing at.
      hasRing: rings.some((r) => !rings.some((o) => o !== r && r.contains(o))),
    };
  });

const stranded = [];
const skipped = [];
let checked = 0;
const started = Date.now();

for (let i = 0; i < slugs.length; i++) {
  const slug = slugs[i];
  const idx = all.indexOf(slug);
  await page.evaluate((n) => window.__strayShow(n), idx);

  try {
    await page.waitForFunction(() => !!document.querySelector("[data-sim-frame]"), undefined, { timeout: 8000 });
  } catch {
    skipped.push({ slug, why: "no sim frame (full-bleed activity)" });
    continue;
  }
  await page.waitForTimeout(700); // launch animation, desktop settling

  const before = await readState();

  if (ACTION === "double") {
    if (!before.hasRing) {
      skipped.push({ slug, why: "nothing highlighted to double-click" });
      continue;
    }
    // Double-click the highlighted control, then the next one, and the next —
    // walking the lesson the way a learner who was taught to double-click
    // actually walks it. The first draft only ever double-clicked step 1's
    // control, which for most lessons is the dock icon that opens the app; it
    // never reached the steps where two consecutive actions share a target,
    // and those are the only ones that can skip. A check that stops at step 1
    // is a check of step 1.
    let state = before;
    for (let hop = 0; hop < 14; hop++) {
      if (!state.hasRing || state.done) break;
      // Two real click events, the way a hand that was taught to double-click
      // produces them — not a synthetic dblclick, which a click handler ignores.
      await page.evaluate(() => {
        const frame = document.querySelector("[data-sim-frame]");
        const rings = [...frame.querySelectorAll("*")].filter((e) => {
          const c = (e.className || "").toString();
          return /ring-yellow|animate-ring-pulse/.test(c) && e.offsetParent !== null;
        });
        const el = rings.find((r) => !rings.some((o) => o !== r && r.contains(o)));
        const target = el?.closest("button") ?? el;
        target?.click();
        target?.click();
        target?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      });
      await page.waitForTimeout(650);
      const next = await readState();
      // One step per click is the contract. Two is a step of teaching the
      // learner never saw, with nothing on screen to say so.
      const jump = next.progress - state.progress;
      if (jump > 1) {
        stranded.push({ slug, jump, from: state.progress, to: next.progress });
        break;
      }
      if (jump === 0) break; // this control is not what the step wants; stop here
      state = next;
    }
    checked++;
    continue;
  }

  if (!before.closeButtons) {
    skipped.push({ slug, why: "no window close button to press" });
    continue;
  }

  // The wrong thing: close the window the step is talking about.
  await page.evaluate(() => {
    const frame = document.querySelector("[data-sim-frame]");
    frame?.querySelector('[aria-label="Close"]')?.click();
  });
  await page.waitForTimeout(900);

  const after = await readState();
  checked++;

  // Done means closing WAS the step — that is a finished lesson, not a trap.
  if (after.done) continue;
  if (after.rings > 0 || after.explains) continue;

  stranded.push({ slug, ringsBefore: before.rings });

  if ((i + 1) % 20 === 0) {
    console.log(`  ${i + 1} / ${slugs.length}  (${Math.round((Date.now() - started) / 1000)}s)`);
  }
}

await browser.close();

const what = ACTION === "double" ? "Double-clicked the highlighted control on" : "Closed the window on";
const why = ACTION === "double" ? "had nothing highlighted" : "had no window to close";
console.log(`\n${what} ${checked} guided lesson(s); ${skipped.length} ${why}.`);

if (stranded.length === 0) {
  console.log(
    ACTION === "double"
      ? "\nA double-click never skips a step."
      : "\nAfter a stray click, every lesson still shows a way forward.",
  );
  process.exit(0);
}

if (ACTION === "double") {
  console.log(`\n${stranded.length} lesson(s) skip a step when the control is double-clicked:\n`);
  for (const s of stranded) {
    console.log(`  ${s.slug}`);
    console.log(`    one double-click advanced ${s.jump} steps (${s.from} → ${s.to})`);
    console.log("    the learner never saw the step in between, and nothing says so\n");
  }
  process.exit(1);
}

console.log(`\n${stranded.length} lesson(s) leave the learner with nothing:\n`);
for (const s of stranded) {
  console.log(`  ${s.slug}`);
  console.log("    closed the window mid-step → no ring, and nothing on screen says what happened");
  console.log(`    reproduce: open the lesson, press the red X, look at the sim\n`);
}
process.exit(1);
