#!/usr/bin/env node
/**
 * The buyer with crossed arms.
 *
 *   npm run dev && npm run hostile-check
 *
 * solve-check proves a learner who does the right thing can finish. This asks
 * the opposite question: what does somebody find who is *looking* for a reason
 * to say no? They click the pages nobody rehearses, they type a URL wrong, they
 * use the keyboard because they always do, they resize the window, and they
 * open the console.
 *
 * Every finding here is a thing that costs a sale, not a thing that breaks a
 * lesson — which is why none of the other harnesses look for any of it.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "http://localhost:3000";

/**
 * Every module page, not a hand-picked few. Fifteen routes proved the site
 * chrome was sound and said nothing about the other forty pages a learner
 * actually spends their time on — and the buyer clicks whichever one they
 * please. Mirrors `slugifyModule` in lib/lessons.ts.
 */
const moduleRoutes = () => {
  const slugify = (m) => m.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const dir = path.join(ROOT, "content/lessons");
  const modules = new Set(
    fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).module),
  );
  return [...modules].map((m) => `/lessons/${slugify(m)}`);
};

const ROUTES = [
  "/",
  "/lessons",
  ...moduleRoutes(),
  "/playground",
  "/certificate",
  "/dashboard",
  "/about",
  "/privacy",
  "/terms",
  "/accessibility",
  "/funny-cat-video",
];

const findings = [];
const note = (route, severity, what) => findings.push({ route, severity, what });

/**
 * The maintenance harnesses must 404 in production.
 *
 * `/dev/solve-check` auto-plays the whole course; `/dev/mount-check` lists every
 * activity that throws. Either one, reachable on the live site, is a screenshot a
 * buyer takes and never forgets — an internal test rig with the product's name on
 * it. Each page guards itself with `notFound()` on `NODE_ENV === "production"`,
 * and every one of them has it today.
 *
 * This is checked by reading the files rather than by fetching the routes, because
 * the harness runs against a *dev* server where those pages are supposed to work.
 * The failure mode being prevented is the fifth dev page, added later by someone
 * who did not know the rule — which no amount of browsing this server can catch.
 */
const devPages = fs
  .readdirSync(path.join(ROOT, "app/dev"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join("app/dev", d.name, "page.tsx"));

for (const rel of devPages) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  if (!/NODE_ENV\s*===\s*["']production["']/.test(fs.readFileSync(abs, "utf8"))) {
    note(`/${rel}`, "high", "dev-only harness page has no production guard — it would ship live");
  }
}

const browser = await chromium.launch();

async function sweep(route) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const thirdParty = new Set();

  // The whole privacy claim now rests on this: no cookies, nothing phoning
  // home. It is one npm install away from quietly becoming false, so it is
  // asserted on every route rather than trusted.
  page.on("request", (r) => {
    try {
      const host = new URL(r.url()).host;
      if (!host.includes("localhost") && !host.startsWith("127.")) thirdParty.add(host);
    } catch {
      /* data: and blob: URLs have no host */
    }
  });

  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    // React's dev-only asset warnings are not what a buyer sees in production.
    if (/Download the React DevTools|Fast Refresh/.test(t)) return;
    consoleErrors.push(t.slice(0, 160));
  });
  page.on("requestfailed", (r) => {
    const url = r.url();
    if (url.includes("_next/static/development") || url.includes("hot-update")) return;
    // A Next.js RSC prefetch that gets superseded aborts by design — net::ERR_ABORTED
    // on a ?_rsc= request is not a broken route (the route returns 200). Ignoring it
    // stops a non-deterministic false "serious" finding on this pre-demo gate.
    if (/[?&]_rsc=/.test(url) && (r.failure()?.errorText || "").includes("ABORTED")) return;
    failedRequests.push(`${url.replace(BASE, "").slice(0, 80)} (${r.failure()?.errorText})`);
  });

  const res = await page.goto(BASE + route, { waitUntil: "networkidle" }).catch(() => null);
  await page.waitForTimeout(1200);

  if (!res || res.status() >= 400) {
    note(route, "blocker", `page returned ${res ? res.status() : "no response"}`);
    await context.close();
    return;
  }

  const probe = await page.evaluate(() => {
    const text = document.body.innerText.trim();
    const doc = document.documentElement;
    return {
      chars: text.length,
      h1: document.querySelector("h1")?.textContent?.trim() ?? null,
      title: document.title,
      // A page that scrolls sideways looks broken to everybody.
      overflowX: doc.scrollWidth - doc.clientWidth,
      // Anything that says the quiet part out loud.
      leaks: /undefined|NaN|\[object Object\]|Error:|TypeError/.test(text),
    };
  });

  if (probe.chars < 120) note(route, "blocker", `almost nothing on the page (${probe.chars} chars)`);
  if (!probe.h1) note(route, "polish", "no <h1> — screen readers and search engines both care");
  if (!probe.title || probe.title === "LearnAComputer") {
    note(route, "polish", `browser tab says "${probe.title}" — every tab looks the same`);
  }
  if (probe.overflowX > 2) note(route, "serious", `scrolls sideways by ${probe.overflowX}px`);
  if (probe.leaks) note(route, "serious", "raw undefined/NaN/Error text is visible on the page");
  for (const host of thirdParty) {
    note(route, "blocker", `contacted a third party: ${host} — the site claims it phones nobody`);
  }
  // `__next_hmr_refresh_hash__` is Next's hot-reload cookie and exists only in
  // dev; a production build sets nothing. Verified against `next start`.
  const cookies = (await context.cookies()).filter((c) => c.name !== "__next_hmr_refresh_hash__");
  for (const c of cookies) {
    note(route, "blocker", `set a cookie: ${c.name} — the site claims it sets none`);
  }

  for (const e of consoleErrors.slice(0, 3)) note(route, "serious", `console error: ${e}`);
  for (const f of failedRequests.slice(0, 3)) note(route, "serious", `failed request: ${f}`);

  // Keyboard: can somebody who never touches a mouse get started, and can they
  // see where they are? This audience includes people with tremors.
  const kb = await page.evaluate(async () => {
    const el = document.activeElement;
    return { startsOnBody: el === document.body || el === null };
  });
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const s = getComputedStyle(el);
    const visible =
      (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) ||
      s.boxShadow !== "none" ||
      s.borderColor !== "";
    return { tag: el.tagName, label: (el.textContent || "").trim().slice(0, 40), visible };
  });
  if (!focus) note(route, "serious", "pressing Tab focuses nothing — keyboard users are stranded");
  else if (!focus.visible) note(route, "serious", `focus ring invisible on first Tab stop (${focus.tag})`);
  void kb;

  await context.close();
}

for (const route of ROUTES) await sweep(route);

// A wrong address is the most ordinary mistake there is.
{
  const page = await (await browser.newContext()).newPage();
  const res = await page.goto(`${BASE}/lessons/this-does-not-exist`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200); // read the rendered page, not the empty shell
  const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();
  if (res && res.status() === 500) note("/lessons/<bad slug>", "blocker", "a mistyped lesson URL 500s");
  // The real page says "This page is not here" and explains it was not the
  // learner's fault, which is better than the wording first tested for here.
  else if (!/not found|not here|can't find|cannot find|no lesson|typo/.test(text)) {
    note("/lessons/<bad slug>", "serious", "mistyped lesson URL gives no friendly explanation");
  }
  await page.close();
}

// Narrow window: the guard should explain itself, not just break.
{
  const context = await browser.newContext({ viewport: { width: 420, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/lessons`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const t = (await page.evaluate(() => document.body.innerText)).toLowerCase();
  if (!/bigger screen|larger screen|computer|laptop/.test(t)) {
    note("/lessons @420px", "serious", "narrow window neither works nor explains itself");
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 2) note("/lessons @420px", "serious", `scrolls sideways by ${overflow}px`);
  await context.close();
}

await browser.close();

const order = { blocker: 0, serious: 1, polish: 2 };
findings.sort((a, b) => order[a.severity] - order[b.severity]);

if (findings.length === 0) {
  console.log("Nothing for a hostile buyer to point at.");
  process.exit(0);
}

console.log(`${findings.length} thing(s) a skeptical buyer could point at:\n`);
for (const f of findings) console.log(`  [${f.severity}] ${f.route} — ${f.what}`);
// Polish alone should not fail a build; the other two should.
process.exit(findings.some((f) => f.severity !== "polish") ? 1 : 0);
