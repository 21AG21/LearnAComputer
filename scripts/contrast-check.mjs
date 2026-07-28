#!/usr/bin/env node
/**
 * Measures WCAG contrast on the pages a learner actually reads, both themes.
 *
 *   node scripts/contrast-check.mjs   (dev server on :3000)
 *
 * Samples every visible text node's computed color against its effective
 * background, computes the WCAG ratio, and reports anything under AA
 * (4.5:1 normal text, 3:1 for >=24px or >=18.66px bold). A measurement, not
 * a proof: transparent overlays and images are approximated by the nearest
 * ancestor with a solid background.
 */
import { chromium } from "playwright";

const PAGES = ["/", "/lessons", "/lessons/using-the-trackpad-or-mouse", "/certificate", "/login"];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const failures = [];
for (const theme of ["light", "dark"]) {
  await page.emulateMedia({ colorScheme: theme });
  for (const path of PAGES) {
    await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle" }).catch(() => null);
    const bad = await page.evaluate(() => {
      const lum = (c) => {
        const [r, g, b] = c.map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const parse = (s) => {
        const m = s.match(/rgba?\(([\d.]+), ?([\d.]+), ?([\d.]+)(?:, ?([\d.]+))?\)/);
        return m ? { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null;
      };
      const bgOf = (el) => {
        for (let n = el; n; n = n.parentElement) {
          const c = parse(getComputedStyle(n).backgroundColor);
          if (c && c.a > 0.6) return c.rgb;
        }
        return [255, 255, 255];
      };
      const out = [];
      const seen = new Set();
      for (const el of document.querySelectorAll("body *")) {
        if (!el.childNodes.length || !Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none") continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        const fg = parse(cs.color);
        if (!fg) continue;
        const bg = bgOf(el);
        const L1 = lum(fg.rgb);
        const L2 = lum(bg);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const size = parseFloat(cs.fontSize);
        const bold = parseInt(cs.fontWeight, 10) >= 700;
        const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
        if (ratio < need) {
          const key = `${cs.color}|${bg.join()}|${el.tagName}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({
            text: el.textContent.trim().slice(0, 40),
            ratio: Math.round(ratio * 100) / 100,
            need,
            fg: cs.color,
            bg: `rgb(${bg.join(",")})`,
          });
        }
      }
      return out;
    });
    for (const b of bad) failures.push({ theme, path, ...b });
  }
}
await browser.close();

if (failures.length === 0) {
  console.log("All sampled text meets WCAG AA contrast in both themes.");
} else {
  console.log(`${failures.length} contrast failures (unique color pairs):`);
  for (const f of failures) {
    console.log(`  [${f.theme}] ${f.path} — ${f.ratio}:1 (needs ${f.need}) "${f.text}" fg=${f.fg} on ${f.bg}`);
  }
}
process.exit(failures.length ? 1 : 0);
