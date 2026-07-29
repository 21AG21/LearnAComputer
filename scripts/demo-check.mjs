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

/**
 * Which capabilities are actually switched on today.
 *
 * The classroom feature ships as code plus a migration somebody has to run, so
 * for a while the product's own answer to "can we see who's progressing?"
 * depends on the state of a database, not on the code. Guessing that wrong in
 * front of a buyer is the single most expensive mistake available: promise the
 * roster, then open a page that says it is not switched on.
 *
 * A read-only probe with the public key. It reads no rows and changes nothing;
 * it only asks whether the table is there.
 */
{
  // Next loads .env.local for the app; a plain node script has to read it.
  // Values are used, never printed.
  const env = { ...process.env };
  try {
    const { readFileSync } = await import("node:fs");
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no local env file: handled below */
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log("\n?     classrooms  — no Supabase env here, cannot tell. Check before you promise it.");
  } else {
    const res = await page.request
      .get(`${url}/rest/v1/classes?select=id&limit=0`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
      .catch(() => null);
    const status = res?.status?.() ?? 0;
    // 200 or 401/403 both mean the table exists (RLS simply refuses to answer).
    // 404, or PostgREST's PGRST205, means the migration has not been applied.
    const bodyText = res ? await res.text().catch(() => "") : "";
    const live = status !== 0 && status !== 404 && !/PGRST205|does not exist|schema cache/i.test(bodyText);
    console.log(
      live
        ? "ok    classrooms  — switched on. /instructor and /join are demo-safe."
        : "note  classrooms  — NOT switched on. Do not promise the roster; say it is built and not live yet.",
    );
  }
}

await browser.close();

if (problems.length) {
  console.log(`\n${problems.length} stop(s) on the demo path are not safe to show:`);
  for (const p of problems) console.log(`- ${p}`);
  process.exit(1);
}
console.log("\nEvery stop on the demo path loads clean.");
