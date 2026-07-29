#!/usr/bin/env node
/**
 * Plays every real-world mission to the end.
 *
 *   npm run dev          # must be running on :3000
 *   npm run mission-check
 *   npm run mission-check -- unit-3   # one mission, or a substring
 *
 * Why this exists: solve-check proves the 132 simulated activities, but it is
 * blind to the eighteen missions that end each unit, because their steps are
 * satisfied by things outside the page — a folder the learner picks, a PDF they
 * saved, a real Ctrl+P, the system turning dark mode on. Nothing had ever
 * proven those, including the course capstone and four Unit 12 lessons that
 * were converted from reading to missions and never once driven.
 *
 * So this harness plays the learner's *computer* instead of the learner: it
 * generates real files with real bytes and real dimensions, hands them to the
 * page's own file input, dispatches genuine paste events, presses genuine key
 * combinations, and changes the device pixel ratio and the color-scheme media
 * query for real. The page is not modified or mocked — every check runs the
 * same code a learner's browser runs.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "http://localhost:3000";
const filter = process.argv[2] ?? "";
const STEP_TIMEOUT = 10_000;

/* ------------------------------------------------------------------ fixtures */

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(body));
  return Buffer.concat([len, body, crc]);
}

/** A real PNG, so the page can measure real width and height off it. */
function png(w, h) {
  const stride = w * 3 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = y * stride + 1 + x * 3;
      raw[o] = 90 + ((x * 3) % 120);
      raw[o + 1] = 130;
      raw[o + 2] = 180 + ((y * 2) % 60);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function pdf(title) {
  const content = `BT /F1 18 Tf 60 700 Td (${title}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "lac-missions-"));

function write(name, buf) {
  const p = path.join(TMP, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, buf);
  return p;
}

const FIXTURES = {
  pdf: write("weekly-bus-timetable.pdf", pdf("Route 19 - weekday timetable")),
  wide: write("lake-at-sunset.png", png(240, 120)),
  tall: write("garden-gate.png", png(120, 240)),
  named: write("kitchen-window-light.png", png(200, 150)),
};

/**
 * The Unit 3 mission asks the learner to sort a real folder. Building the
 * finished version means the checker's own rules decide what counts, not mine.
 */
function organizedFolder(expect) {
  const root = path.join(TMP, "messy-folder");
  for (const f of expect.folders) fs.mkdirSync(path.join(root, f), { recursive: true });
  for (const { file, in: folder } of expect.placements) {
    fs.writeFileSync(path.join(root, folder, file), `practice file: ${file}\n`);
  }
  if (expect.renamed) {
    // The point of the step: read what is inside, then name it after that.
    fs.writeFileSync(path.join(root, expect.renamed.in, "council-tax-statement.pdf"), pdf("Council tax statement"));
  }
  return root;
}

/* ---------------------------------------------------------------- the driver */

const lessons = fs
  .readdirSync(path.join(ROOT, "content/lessons"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, "content/lessons", f), "utf8")))
  .filter((l) => l.playgroundTask?.type === "real-world")
  .sort((a, b) => a.order - b.order)
  .filter((l) => !filter || l.slug.includes(filter) || l.unit.includes(filter));

/**
 * Server-rendered HTML looks identical to the finished page and answers no
 * clicks at all. The first version of this harness pressed "I have done it"
 * against un-hydrated markup and reported every mission as stuck, which is a
 * lie about the product. Wait for React to actually own the frame.
 */
async function waitForHydration(page) {
  await page.waitForFunction(
    () => {
      const el = document.querySelector("[data-sim-frame]");
      return !!el && Object.keys(el).some((k) => k.startsWith("__react"));
    },
    undefined,
    { timeout: 40_000 },
  );
}

async function frameState(page) {
  return page.evaluate(() => {
    const el = document.querySelector("[data-sim-frame]");
    if (!el) return null;
    return {
      progress: Number(el.getAttribute("data-sim-progress") ?? 0),
      total: Number(el.getAttribute("data-sim-total") ?? 0),
      done: el.getAttribute("data-sim-done") === "1",
    };
  });
}

/** Whatever is on the card right now — so a stall explains itself. */
async function cardText(page) {
  return page
    .evaluate(() => {
      const el = document.querySelector("[data-sim-frame]");
      return (el?.innerText ?? "").replace(/\s+/g, " ").slice(0, 300);
    })
    .catch(() => "");
}

async function satisfy(page, step, lesson) {
  const context = page.context();

  switch (step.check) {
    case "confirm":
      await page.getByRole("button", { name: "I have done it" }).click();
      return;

    case "download": {
      const [dl] = await Promise.all([
        page.waitForEvent("download", { timeout: 8000 }),
        page.getByRole("link", { name: new RegExp(lesson.playgroundTask.download.label, "i") }).click(),
      ]);
      // Prove the file is real and has bytes, not just that a click happened.
      const body = await dl.createReadStream();
      let size = 0;
      for await (const c of body) size += c.length;
      if (size < 200) throw new Error(`download ${dl.suggestedFilename()} was only ${size} bytes`);
      return;
    }

    case "paste": {
      const min = step.minChars ?? 25;
      let text = "https://www.citytransit.example/timetable/route-19-weekday-morning-times";
      while (text.length < min + 5) text += " and the stop by the library";
      const ta = page.locator("textarea");
      await ta.click();
      await ta.evaluate((el, t) => {
        const dt = new DataTransfer();
        dt.setData("text", t);
        el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
      }, text);
      return;
    }

    case "keys": {
      const parts = (step.keys ?? "").toLowerCase().split("+");
      const key = parts[parts.length - 1];
      const mods = [];
      if (parts.includes("ctrl") || parts.includes("cmd")) mods.push("Control");
      if (parts.includes("shift")) mods.push("Shift");
      if (parts.includes("alt")) mods.push("Alt");
      await page.keyboard.press([...mods, key].join("+"));
      return;
    }

    case "file": {
      const want = step.file ?? {};
      let file;
      if (want.nameIs) {
        const real = path.join(ROOT, "public/missions", want.nameIs);
        file = write(want.nameIs, fs.existsSync(real) ? fs.readFileSync(real) : pdf(want.nameIs));
      } else if (want.kind === "pdf") {
        file = FIXTURES.pdf;
      } else if (want.orientation === "portrait") {
        file = FIXTURES.tall;
      } else if (want.orientation === "landscape") {
        file = FIXTURES.wide;
      } else {
        file = FIXTURES.named;
      }
      // recentMinutes reads the file's real timestamp.
      fs.utimesSync(file, new Date(), new Date());
      await page.locator('input[type="file"]').setInputFiles(file);
      return;
    }

    case "folder": {
      const dir = organizedFolder(step.expect);
      await page.locator('input[type="file"]').setInputFiles(dir);
      return;
    }

    case "type-answer": {
      let answer = "";
      if (step.match === "hostname") answer = await page.evaluate(() => location.hostname);
      else if (step.match === "browser") answer = "Chrome";
      else if (step.match === "battery") {
        answer = String(
          await page.evaluate(async () => {
            const nav = navigator;
            if (!nav.getBattery) return 50;
            try {
              return Math.round((await nav.getBattery()).level * 100);
            } catch {
              return 50;
            }
          }),
        );
      } else answer = (step.answers ?? ["yes"])[0];
      await page.getByPlaceholder("Type what you see").fill(answer);
      await page.getByRole("button", { name: "Check" }).click();
      return;
    }

    case "window-max": {
      // Resizing the viewport alone is not enough: headless Chromium reports
      // screen.availWidth as the viewport, so the window can never be "smaller
      // than the screen". CDP lets the screen and the window move separately,
      // which is the situation on a real desk.
      const h = page.viewportSize()?.height ?? 860;
      const SCREEN = { screenWidth: 1600, screenHeight: 1000 };
      const cdp = await context.newCDPSession(page);
      const metrics = (width) =>
        cdp.send("Emulation.setDeviceMetricsOverride", {
          width,
          height: h,
          deviceScaleFactor: 1,
          mobile: false,
          positionX: 0,
          positionY: 0,
          ...SCREEN,
        });
      await metrics(820);
      await page.waitForTimeout(900);
      await metrics(SCREEN.screenWidth);
      await page.waitForTimeout(900);
      await cdp.send("Emulation.clearDeviceMetricsOverride");
      await cdp.detach();
      return;
    }

    case "zoom": {
      const vp = page.viewportSize() ?? { width: 1280, height: 800 };
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1.5,
        mobile: false,
      });
      await page.waitForTimeout(900);
      await cdp.send("Emulation.clearDeviceMetricsOverride");
      await cdp.detach();
      return;
    }

    case "dark-mode":
      await page.emulateMedia({ colorScheme: "dark" });
      return;

    case "reduce-motion":
      await page.emulateMedia({ reducedMotion: "reduce" });
      return;

    case "offline":
      await context.setOffline(true);
      return;

    case "online":
      await context.setOffline(false);
      return;

    default:
      throw new Error(`no way to satisfy check "${step.check}"`);
  }
}

async function play(browser, lesson) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await context.newPage();
  const steps = lesson.playgroundTask.steps;

  try {
    await page.goto(`${BASE}/dev/mission-check?only=${lesson.slug}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-sim-frame]", { timeout: 20_000 });
    await waitForHydration(page);

    for (let guard = 0; guard < steps.length * 3 + 5; guard++) {
      const state = await frameState(page);
      if (!state) throw new Error("the mission frame disappeared");
      if (state.done) break;

      const i = state.progress;
      const step = steps[i];
      if (!step) {
        // Every step is satisfied; `done` is set by an effect a tick later, so
        // the walk can legitimately see "past the last step, not done yet".
        await page
          .waitForFunction(() => document.querySelector("[data-sim-frame]")?.getAttribute("data-sim-done") === "1", undefined, {
            timeout: 5000,
          })
          .catch(() => {});
        break;
      }

      await satisfy(page, step, lesson);

      const advanced = await page
        .waitForFunction(
          (from) => {
            const el = document.querySelector("[data-sim-frame]");
            if (!el) return false;
            return el.getAttribute("data-sim-done") === "1" || Number(el.getAttribute("data-sim-progress")) > from;
          },
          i,
          { timeout: STEP_TIMEOUT },
        )
        .then(() => true)
        .catch(() => false);

      if (!advanced) {
        return {
          slug: lesson.slug,
          ok: false,
          reason: `stuck on step ${i + 1}/${steps.length} (${step.check}) — "${step.say}". On screen: ${await cardText(page)}`,
        };
      }
    }

    const end = await frameState(page);
    if (!end?.done) {
      return { slug: lesson.slug, ok: false, reason: `ran out of attempts at step ${(end?.progress ?? 0) + 1}/${steps.length}` };
    }
    return { slug: lesson.slug, ok: true };
  } catch (err) {
    return { slug: lesson.slug, ok: false, reason: `${err.message} — on screen: ${await cardText(page)}` };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch();
const results = [];
for (const lesson of lessons) {
  results.push(await play(browser, lesson));
  const r = results[results.length - 1];
  if (!r.ok) console.log(`  ✗ ${r.slug}`);
}
await browser.close();
fs.rmSync(TMP, { recursive: true, force: true });

const failed = results.filter((r) => !r.ok);
console.log("");
if (failed.length === 0) {
  console.log(`Every one of the ${results.length} real-world missions can be finished.`);
} else {
  console.log(`${failed.length} of ${results.length} missions cannot be finished:\n`);
  for (const f of failed) console.log(`- ${f.slug} — ${f.reason}\n`);
  process.exit(1);
}
