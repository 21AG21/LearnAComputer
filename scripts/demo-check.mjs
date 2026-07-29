#!/usr/bin/env node
/**
 * The morning-of check: does every page in the demo runbook actually load?
 *
 *   node scripts/demo-check.mjs                    (against localhost:3000)
 *   BASE=https://your-deploy node scripts/demo-check.mjs
 *
 * `npm run solve-check` proves the activities can be finished; this proves the
 * exact click path in `docs/DEMO_PRIYA_ELDER_CARE.md` opens, renders its
 * activity, and throws nothing at the console. Ninety seconds, and it is the
 * difference between a confident demo and a live surprise.
 *
 * Run it the morning of. If it is not green, do not demo that path.
 *
 * If everything fails at once with 500s and 404s, the dev server is almost
 * certainly serving a wiped `.next` — someone ran a production build while it
 * was running. Restart `npm run dev` and run this again. (That is a real
 * failure this script caught, which is the point of having it.)
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";

// Every stop in the runbook, in demo order.
const PATH = [
  { beat: "1. First minute (clicking practice)", url: "/lessons/using-the-trackpad-or-mouse", wants: "Start activity" },
  { beat: "2. Practice desktop (two windows)", url: "/playground", wants: null },
  { beat: "3a. Guided lesson — video calling", url: "/lessons/video-calling", wants: "Start activity" },
  { beat: "3b. Guided lesson — files", url: "/lessons/working-with-files", wants: "Start activity" },
  { beat: "4. Scam recognition", url: "/lessons/recognizing-threats", wants: "Start activity" },
  { beat: "5. Real-world mission", url: "/lessons/unit-3-assessment", wants: "Start activity" },
  { beat: "6. Certificate", url: "/certificate", wants: "Certificates" },
  { beat: "Catalog (leave-behind screenshot)", url: "/lessons", wants: null },
  { beat: "Privacy (buyers do check)", url: "/privacy", wants: "Analytics" },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const problems = [];
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

for (const stop of PATH) {
  errors.length = 0;
  const res = await page.goto(BASE + stop.url, { waitUntil: "networkidle" }).catch((e) => ({ err: e }));
  await page.waitForTimeout(500);

  const status = res?.status?.() ?? 0;
  const body = await page.textContent("body").catch(() => "");
  const blank = (body ?? "").trim().length < 40;
  const crashed = /Something went wrong|Application error|This page could not be found/i.test(body ?? "");
  const missing = stop.wants && !(body ?? "").includes(stop.wants);

  const bad = [];
  if (res?.err || status >= 400) bad.push(`HTTP ${status || res?.err}`);
  if (blank) bad.push("page is blank");
  if (crashed) bad.push("error/not-found page");
  if (missing) bad.push(`missing expected text "${stop.wants}"`);
  // Next's dev overlay and hydration noise are the ones worth surfacing.
  const real = errors.filter((e) => !/favicon|Download the React DevTools/i.test(e));
  if (real.length) bad.push(`${real.length} console error(s): ${real[0].slice(0, 90)}`);

  console.log(`${bad.length ? "FAIL" : "ok  "}  ${stop.beat}  ${stop.url}`);
  if (bad.length) {
    for (const b of bad) console.log(`        ${b}`);
    problems.push(`${stop.beat} (${stop.url}): ${bad.join("; ")}`);
  }
}

// Beat 5 hands the buyer a real download. A 404 there lands at the exact moment
// the demo is asking them to believe the product, so check the bytes, not the page.
for (const asset of ["/missions/messy-folder.zip", "/missions/Downloads-Practice.pdf"]) {
  const res = await page.request.get(BASE + asset).catch((e) => ({ err: e }));
  const status = res?.status?.() ?? 0;
  const size = status === 200 ? (await res.body()).length : 0;
  const ok = status === 200 && size > 1000;
  console.log(`${ok ? "ok  " : "FAIL"}  mission download  ${asset}${ok ? ` (${size} bytes)` : ` — HTTP ${status}, ${size} bytes`}`);
  if (!ok) problems.push(`mission download ${asset}: HTTP ${status}, ${size} bytes`);
}

await browser.close();

if (problems.length) {
  console.log(`\n${problems.length} stop(s) on the demo path are not safe to show:`);
  for (const p of problems) console.log(`- ${p}`);
  process.exit(1);
}
console.log("\nEvery stop on the demo path loads clean.");
