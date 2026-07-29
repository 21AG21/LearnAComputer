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

/**
 * Is there a way forward on screen? A ring to follow, or words explaining.
 *
 * Deliberately NOT scoped to `[data-sim-frame]`. Closing the window in a
 * DesktopLaunch lesson returns the learner to "Open Notes — click the glowing
 * icon in the dock", which is a perfectly good way forward and lives *outside*
 * the frame. An earlier version read only inside the frame, so the moment the
 * frame went away it reported "no ring, nothing explains" and called three
 * correct lessons broken. A harness that cannot see the fix is worse than no
 * harness, because it sends you to fix what is already right.
 */
const readState = () =>
  page.evaluate(() => {
    const frame = document.querySelector("[data-sim-frame]");
    const scope = document.querySelector("[data-stray-host]") ?? document.body;
    const rings = [...scope.querySelectorAll("*")].filter((e) => {
      const c = (e.className || "").toString();
      return /ring-yellow|animate-ring-pulse/.test(c) && e.offsetParent !== null;
    });
    const words = scope.textContent ?? "";
    return {
      mounted: !!frame,
      done: frame?.getAttribute("data-sim-done") === "1",
      rings: rings.length,
      explains:
        /you closed|nothing is broken|open it again|click .* in the (row|dock)|reopen/i.test(words) ||
        // DesktopLaunch's own gate: the app is shut and the dock icon glows.
        /click the glowing icon in the dock/i.test(words),
      closeButtons: frame ? frame.querySelectorAll('[aria-label="Close"]').length : 0,
      progress: Number(frame?.getAttribute("data-sim-progress") ?? 0),
      // Innermost ring: the control the step is actually pointing at.
      hasRing: rings.some((r) => !rings.some((o) => o !== r && r.contains(o))),
    };
  });

const stranded = [];
const skipped = [];
let checked = 0;
/** Lessons reached only by clicking through the "open the app" gate first. */
let launched = 0;
const started = Date.now();

for (let i = 0; i < slugs.length; i++) {
  const slug = slugs[i];
  const idx = all.indexOf(slug);
  await page.evaluate((n) => window.__strayShow(n), idx);

  // Most guided lessons open behind DesktopLaunch: a dark banner reading "Open
  // Mail — click the glowing icon in the dock", with no SimulatorFrame until the
  // learner clicks. The first version of this harness waited 8s for a frame that
  // could never appear, then skipped — silently reporting a large share of the
  // course as "no window to close" when the truth was "never opened". Click the
  // gate, the way a learner does, and the lesson is actually reachable.
  let framed = await page
    .waitForFunction(() => !!document.querySelector("[data-sim-frame]"), undefined, { timeout: 2500 })
    .then(() => true)
    .catch(() => false);

  if (!framed) {
    const gate = await page.evaluate(() => {
      if (!/click the glowing icon in the dock/i.test(document.body.innerText)) return false;
      const ringed = [...document.querySelectorAll("*")].filter(
        (e) => /ring-yellow|animate-ring-pulse/.test((e.className || "").toString()) && e.offsetParent !== null,
      );
      const el = ringed.find((r) => !ringed.some((o) => o !== r && r.contains(o)));
      const btn = el?.closest("button") ?? el;
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (gate) {
      launched++;
      framed = await page
        .waitForFunction(() => !!document.querySelector("[data-sim-frame]"), undefined, { timeout: 6000 })
        .then(() => true)
        .catch(() => false);
    }
  }

  if (!framed) {
    skipped.push({ slug, why: "no sim frame (full-bleed activity)" });
    continue;
  }
  await page.waitForTimeout(900); // launch animation, desktop settling

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
console.log(`\n${what} ${checked} guided lesson(s) (${launched} reached by opening the app first).`);
// Skips broken out by reason, because "skipped" hid three different things and
// one of them was "this harness never opened the lesson".
const reasons = {};
for (const s of skipped) reasons[s.why] = (reasons[s.why] ?? 0) + 1;
for (const [why, n] of Object.entries(reasons)) console.log(`  skipped ${n}: ${why}`);

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
