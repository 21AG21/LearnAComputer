/**
 * Draws the photo library. Every picture in the course — the Photos app, the Files
 * previews, message attachments, lesson art — is generated here so the whole set
 * shares one finish: a warm-shadow palette, a soft vignette, and a fine grain.
 *
 *   node scripts/generate-photos.mjs
 *
 * Seeded, so re-running produces byte-identical output and the repo stays quiet.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "photos");

// ── Seeded RNG ───────────────────────────────────────────────────────────────

function makeRng(seedStr) {
  let h = 2166136261;
  for (const ch of seedStr) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0;
  const next = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
  next(); next(); next();
  return {
    f: next,
    range: (a, b) => a + next() * (b - a),
    int: (a, b) => Math.floor(a + next() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}

// ── Color helpers ───────────────────────────────────────────────────────────

function hex(h) {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function toHex([r, g, b]) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function mix(a, b, t) {
  const [r1, g1, b1] = hex(a); const [r2, g2, b2] = hex(b);
  return toHex([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]);
}
const shade = (c, t) => mix(c, "#101820", t);
const tint  = (c, t) => mix(c, "#fdf8f0", t);

// ── SVG primitives ───────────────────────────────────────────────────────────

let uid = 0;
const id = (p) => `${p}${uid++}`;

function linear(stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1 } = {}) {
  const gid = id("lg");
  const body = stops
    .map(([off, col, op = 1]) => `<stop offset="${off}" stop-color="${col}" stop-opacity="${op}"/>`)
    .join("");
  return { gid, def: `<linearGradient id="${gid}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${body}</linearGradient>` };
}

function radial(stops, { cx = 0.5, cy = 0.5, r = 0.5 } = {}) {
  const gid = id("rg");
  const body = stops
    .map(([off, col, op = 1]) => `<stop offset="${off}" stop-color="${col}" stop-opacity="${op}"/>`)
    .join("");
  return { gid, def: `<radialGradient id="${gid}" cx="${cx}" cy="${cy}" r="${r}">${body}</radialGradient>` };
}

function blur(px) {
  const fid = id("bl");
  return { fid, def: `<filter id="${fid}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${px}"/></filter>` };
}

/** A ridge line across the frame: peaks that get flatter the further back they sit. */
function ridge(w, baseY, amp, steps, rng, roughness = 1) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const t = i / steps;
    const wave = Math.sin(t * Math.PI * rng.range(1.2, 2.4) + rng.range(0, 6));
    const jag = (rng.f() - 0.5) * amp * 0.55 * roughness;
    pts.push([x, baseY - (wave * amp * 0.5 + amp * 0.4) - jag]);
  }
  return pts;
}

const poly = (pts, w, h, fill, extra = "") =>
  `<polygon points="${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} ${w},${h} 0,${h}" fill="${fill}" ${extra}/>`;

/** Smooth hill silhouette — bezier through a handful of control points. */
function hillPath(w, h, baseY, amp, rng) {
  const n = rng.int(3, 5);
  let d = `M 0 ${baseY + rng.range(-amp, amp) * 0.3}`;
  for (let i = 1; i <= n; i++) {
    const x = (i / n) * w;
    const px = x - w / n / 2;
    d += ` Q ${px.toFixed(1)} ${(baseY - rng.range(amp * 0.3, amp)).toFixed(1)} ${x.toFixed(1)} ${(baseY + rng.range(-amp, amp) * 0.35).toFixed(1)}`;
  }
  return `${d} L ${w} ${h} L 0 ${h} Z`;
}

function stars(w, h, n, rng, maxY = h) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = rng.range(0, w);
    const y = rng.range(0, maxY);
    const r = rng.range(0.7, 2.4);
    const o = rng.range(0.25, 0.95) * (1 - y / maxY * 0.55);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#fff" opacity="${o.toFixed(2)}"/>`;
  }
  return s;
}

/** Conifer — a stack of widening triangles on a short trunk. */
function conifer(x, baseY, height, fill, rng) {
  const wdt = height * rng.range(0.36, 0.5);
  let s = `<rect x="${(x - wdt * 0.06).toFixed(1)}" y="${(baseY - height * 0.12).toFixed(1)}" width="${(wdt * 0.12).toFixed(1)}" height="${(height * 0.14).toFixed(1)}" fill="${shade(fill, 0.35)}"/>`;
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const top = baseY - height * (1 - t * 0.42);
    const bot = baseY - height * (0.52 - t * 0.42) + height * 0.06;
    const half = (wdt / 2) * (0.5 + t * 0.62);
    s += `<polygon points="${x.toFixed(1)},${top.toFixed(1)} ${(x + half).toFixed(1)},${bot.toFixed(1)} ${(x - half).toFixed(1)},${bot.toFixed(1)}" fill="${fill}"/>`;
  }
  return s;
}

/** Round-canopy tree — overlapping blobs, for deciduous woods. */
function leafyTree(x, baseY, height, fill, rng) {
  const cw = height * rng.range(0.5, 0.72);
  let s = `<rect x="${(x - height * 0.028).toFixed(1)}" y="${(baseY - height * 0.42).toFixed(1)}" width="${(height * 0.056).toFixed(1)}" height="${(height * 0.42).toFixed(1)}" fill="${shade(fill, 0.45)}"/>`;
  for (let i = 0; i < 4; i++) {
    const bx = x + rng.range(-cw * 0.3, cw * 0.3);
    const by = baseY - height * rng.range(0.5, 0.82);
    const br = cw * rng.range(0.3, 0.46);
    s += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${br.toFixed(1)}" fill="${i % 2 ? tint(fill, 0.1) : fill}"/>`;
  }
  return s;
}

function cloudBlob(x, y, w, h, fill, op, rng) {
  let s = "";
  for (let i = 0; i < 5; i++) {
    const cx = x + rng.range(-w * 0.36, w * 0.36);
    const cy = y + rng.range(-h * 0.3, h * 0.3);
    const rx = w * rng.range(0.22, 0.4);
    const ry = h * rng.range(0.45, 0.85);
    s += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${fill}" opacity="${op}"/>`;
  }
  return s;
}

/** Horizontal glints on water — the thing that makes flat color read as a surface. */
function waterGlints(w, y0, y1, n, rng, col = "#ffffff") {
  let s = "";
  for (let i = 0; i < n; i++) {
    const y = rng.range(y0, y1);
    const t = (y - y0) / (y1 - y0);
    const len = w * rng.range(0.04, 0.3) * (0.4 + t);
    const x = rng.range(-len * 0.2, w - len * 0.5);
    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${len.toFixed(1)}" height="${(1 + t * 3).toFixed(1)}" rx="${(1 + t * 1.5).toFixed(1)}" fill="${col}" opacity="${(rng.range(0.06, 0.3) * (0.35 + t)).toFixed(2)}"/>`;
  }
  return s;
}

// ── The shared finish ────────────────────────────────────────────────────────

function finish(w, h, warmth = 0.5) {
  const vig = radial([["0.5", "#000", 0], ["1", "#000", 0.34]], { r: 0.72 });
  const gid = id("grain");
  return `
    <defs>
      ${vig.def}
      <filter id="${gid}">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
    </defs>
    <rect width="${w}" height="${h}" fill="#f7c98b" opacity="${(warmth * 0.05).toFixed(3)}" style="mix-blend-mode:overlay"/>
    <rect width="${w}" height="${h}" fill="url(#${vig.gid})"/>
    <rect width="${w}" height="${h}" filter="url(#${gid})" opacity="0.05" style="mix-blend-mode:overlay"/>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Scenes
// ═══════════════════════════════════════════════════════════════════════════

const S = {};

S["sunset-beach"] = (w, h, rng) => {
  const sky = linear([["0", "#2c3f6b"], ["0.34", "#7f5f8f"], ["0.62", "#e08a67"], ["0.86", "#f6c07a"], ["1", "#fbdca4"]]);
  const sunY = h * 0.58, sunR = w * 0.075;
  const glow = radial([["0", "#fff3d0", 0.95], ["0.35", "#ffc978", 0.6], ["1", "#ff9d5c", 0]]);
  const sea = linear([["0", "#e9a878"], ["0.45", "#8f6f88"], ["1", "#3f4a6b"]]);
  const horizon = h * 0.6;
  return `<defs>${sky.def}${glow.def}${sea.def}</defs>
    <rect width="${w}" height="${horizon}" fill="url(#${sky.gid})"/>
    <circle cx="${w * 0.62}" cy="${sunY}" r="${sunR * 4}" fill="url(#${glow.gid})"/>
    ${cloudBlob(w * 0.22, h * 0.24, w * 0.46, h * 0.06, "#c98aa0", 0.4, rng)}
    ${cloudBlob(w * 0.74, h * 0.36, w * 0.4, h * 0.045, "#f2b489", 0.45, rng)}
    <circle cx="${w * 0.62}" cy="${sunY}" r="${sunR}" fill="#fff0c4"/>
    <rect y="${horizon}" width="${w}" height="${h - horizon}" fill="url(#${sea.gid})"/>
    <rect x="${w * 0.62 - sunR * 0.5}" y="${horizon}" width="${sunR}" height="${h * 0.3}" fill="#ffd79a" opacity="0.35"/>
    ${waterGlints(w, horizon + 4, h * 0.88, 60, rng, "#ffe6bb")}
    <path d="M 0 ${h * 0.88} Q ${w * 0.3} ${h * 0.845} ${w * 0.55} ${h * 0.885} T ${w} ${h * 0.87} L ${w} ${h} L 0 ${h} Z" fill="#c7a684"/>
    <path d="M 0 ${h * 0.9} Q ${w * 0.35} ${h * 0.875} ${w * 0.62} ${h * 0.905} T ${w} ${h * 0.9} L ${w} ${h} L 0 ${h} Z" fill="#dcc0a0" opacity="0.85"/>`;
};

S["mountain-dawn"] = (w, h, rng) => {
  const sky = linear([["0", "#213255"], ["0.4", "#6d5b86"], ["0.72", "#d78a72"], ["1", "#f4c58c"]]);
  const layers = ["#5d6e8e", "#4a5a79", "#394863", "#28344c"];
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>
    <circle cx="${w * 0.3}" cy="${h * 0.42}" r="${w * 0.05}" fill="#ffe0a8" opacity="0.9"/>`;
  layers.forEach((c, i) => {
    const base = h * (0.52 + i * 0.115);
    s += poly(ridge(w, base, h * (0.3 - i * 0.05), 9 + i * 2, rng, 1.2 - i * 0.2), w, h, c);
  });
  s += `<rect y="${h * 0.5}" width="${w}" height="${h * 0.2}" fill="#e9b592" opacity="0.16"/>`;
  return s;
};

S["desert-dunes"] = (w, h, rng) => {
  const sky = linear([["0", "#6f9dc8"], ["0.42", "#c8bfae"], ["0.72", "#eecfa0"], ["1", "#f6dfb2"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>
    <circle cx="${w * 0.72}" cy="${h * 0.22}" r="${w * 0.042}" fill="#fff6da"/>`;
  // Each dune is a crest with a lit windward slope and a dark slip face behind it.
  const dunes = [
    { y: 0.52, x: 0.28, lit: "#e6c390", dark: "#c49f6c" },
    { y: 0.62, x: 0.66, lit: "#dcb47e", dark: "#b58c58" },
    { y: 0.73, x: 0.2,  lit: "#cea16a", dark: "#a37a49" },
    { y: 0.86, x: 0.74, lit: "#bd8d55", dark: "#8e6539" },
  ];
  dunes.forEach(({ y, x, lit, dark }) => {
    const cy = h * y, peak = w * x, amp = h * 0.13;
    // windward: long shallow rise to the crest
    s += `<path d="M 0 ${(cy + amp * 0.55).toFixed(1)}
      C ${(peak * 0.5).toFixed(1)} ${(cy + amp * 0.2).toFixed(1)} ${(peak * 0.8).toFixed(1)} ${(cy - amp).toFixed(1)} ${peak.toFixed(1)} ${(cy - amp).toFixed(1)}
      C ${(peak + (w - peak) * 0.22).toFixed(1)} ${(cy - amp * 0.72).toFixed(1)} ${(peak + (w - peak) * 0.5).toFixed(1)} ${(cy + amp * 0.5).toFixed(1)} ${w} ${(cy + amp * 0.3).toFixed(1)}
      L ${w} ${h} L 0 ${h} Z" fill="${lit}"/>`;
    // slip face: the short steep side, in shadow
    s += `<path d="M ${peak.toFixed(1)} ${(cy - amp).toFixed(1)}
      C ${(peak + (w - peak) * 0.22).toFixed(1)} ${(cy - amp * 0.72).toFixed(1)} ${(peak + (w - peak) * 0.5).toFixed(1)} ${(cy + amp * 0.5).toFixed(1)} ${w} ${(cy + amp * 0.3).toFixed(1)}
      L ${w} ${(cy + amp * 1.3).toFixed(1)}
      C ${(peak + (w - peak) * 0.44).toFixed(1)} ${(cy + amp * 1.1).toFixed(1)} ${(peak + (w - peak) * 0.2).toFixed(1)} ${(cy - amp * 0.2).toFixed(1)} ${peak.toFixed(1)} ${(cy - amp).toFixed(1)} Z" fill="${dark}"/>`;
    // the crest line itself catches the light
    s += `<path d="M ${(peak - w * 0.14).toFixed(1)} ${(cy - amp * 0.88).toFixed(1)} Q ${peak.toFixed(1)} ${(cy - amp * 1.06).toFixed(1)} ${(peak + w * 0.1).toFixed(1)} ${(cy - amp * 0.86).toFixed(1)}" stroke="#fdeccd" stroke-width="2.5" fill="none" opacity="0.55"/>`;
  });
  // wind ripples on the nearest slope
  for (let i = 0; i < 26; i++) {
    const y = rng.range(h * 0.88, h);
    s += `<path d="M ${rng.range(-w * 0.1, w * 0.7).toFixed(1)} ${y.toFixed(1)} q ${rng.range(60, 200).toFixed(1)} ${rng.range(-8, 8).toFixed(1)} ${rng.range(140, 380).toFixed(1)} 0" stroke="#7f5a33" stroke-width="1.6" fill="none" opacity="${rng.range(0.06, 0.18).toFixed(2)}"/>`;
  }
  return s;
};

S["forest-path"] = (w, h, rng) => {
  const sky = linear([["0", "#cfe0c4"], ["0.5", "#9dbd93"], ["1", "#5c7a56"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  const light = linear([["0", "#fff8d8", 0.4], ["1", "#fff8d8", 0]]);
  s += `<defs>${light.def}</defs>`;
  s += `<path d="M ${w * 0.44} ${h * 0.52} L ${w * 0.12} ${h} L ${w * 0.86} ${h} L ${w * 0.56} ${h * 0.52} Z" fill="#a68a63"/>`;
  s += `<path d="M ${w * 0.46} ${h * 0.54} L ${w * 0.22} ${h} L ${w * 0.76} ${h} L ${w * 0.54} ${h * 0.54} Z" fill="#bda07a" opacity="0.7"/>`;
  for (let i = 0; i < 16; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const depth = i / 16;
    const x = w * 0.5 + side * (w * (0.06 + depth * 0.52)) + rng.range(-w * 0.02, w * 0.02);
    const tw = w * (0.012 + depth * 0.035);
    const top = h * (0.42 - depth * 0.42);
    const col = shade("#4a6b46", 0.15 + (1 - depth) * 0.4);
    s += `<rect x="${(x - tw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${tw.toFixed(1)}" height="${(h - top).toFixed(1)}" fill="${col}"/>`;
    s += `<ellipse cx="${x.toFixed(1)}" cy="${(top + h * 0.05).toFixed(1)}" rx="${(tw * 3.4).toFixed(1)}" ry="${(h * 0.16).toFixed(1)}" fill="${shade("#5e8555", 0.1 + (1 - depth) * 0.3)}" opacity="0.85"/>`;
  }
  s += `<rect width="${w}" height="${h}" fill="url(#${light.gid})"/>`;
  return s;
};

S["lake-mirror"] = (w, h, rng) => {
  const mid = h * 0.52;
  const sky = linear([["0", "#7ea7c9"], ["0.6", "#cfd9df"], ["1", "#f0dcc4"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${mid}" fill="url(#${sky.gid})"/>`;
  const peaks = ridge(w, mid, h * 0.24, 11, rng, 1.4);
  s += `<polygon points="${peaks.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} ${w},${mid} 0,${mid}" fill="#4d6379"/>`;
  s += `<polygon points="${peaks.map(([x, y]) => `${x.toFixed(1)},${(y + h * 0.05).toFixed(1)}`).join(" ")} ${w},${mid} 0,${mid}" fill="#69819a" opacity="0.7"/>`;
  s += `<rect y="${mid}" width="${w}" height="${h - mid}" fill="#3f5468"/>`;
  s += `<polygon points="${peaks.map(([x, y]) => `${x.toFixed(1)},${(mid + (mid - y) * 0.86).toFixed(1)}`).join(" ")} ${w},${mid} 0,${mid}" fill="#405a70" opacity="0.85"/>`;
  s += waterGlints(w, mid + 6, h, 70, rng, "#dfeaf2");
  return s;
};

S["rolling-hills"] = (w, h, rng) => {
  const sky = linear([["0", "#8ec4e8"], ["0.6", "#cfe6f2"], ["1", "#f0e6c8"]]);
  const greens = ["#a8c46e", "#8db35c", "#71984b", "#587c3c", "#42602f"];
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>
    <circle cx="${w * 0.2}" cy="${h * 0.18}" r="${w * 0.04}" fill="#fff8dc"/>
    ${cloudBlob(w * 0.62, h * 0.2, w * 0.34, h * 0.05, "#ffffff", 0.75, rng)}
    ${cloudBlob(w * 0.32, h * 0.32, w * 0.26, h * 0.035, "#ffffff", 0.55, rng)}`;
  greens.forEach((c, i) => {
    s += `<path d="${hillPath(w, h, h * (0.5 + i * 0.1), h * 0.09, rng)}" fill="${c}"/>`;
  });
  return s;
};

S["coastal-cliffs"] = (w, h, rng) => {
  // Looking down into a cove: a headland closes each side, a crescent of sand between them.
  const sky = linear([["0", "#3f7fb0"], ["0.55", "#9cc4dc"], ["1", "#e6d8bc"]]);
  const sea = linear([["0", "#2a7590"], ["0.5", "#1d5f7c"], ["1", "#2f8f9c"]]);
  const hz = h * 0.28;
  let s = `<defs>${sky.def}${sea.def}</defs>
    <rect width="${w}" height="${hz}" fill="url(#${sky.gid})"/>
    ${cloudBlob(w * 0.34, h * 0.09, w * 0.46, h * 0.03, "#ffffff", 0.7, rng)}
    ${cloudBlob(w * 0.8, h * 0.15, w * 0.3, h * 0.024, "#ffffff", 0.5, rng)}
    <rect y="${hz}" width="${w}" height="${h - hz}" fill="url(#${sea.gid})"/>
    ${waterGlints(w, hz + 6, h * 0.6, 40, rng, "#cfeaf2")}`;

  // Shallows, surf and sand: three nested crescents rising toward the bottom of the frame.
  const crescent = (yEdge, yMid, fill, op = 1) =>
    `<path d="M 0 ${h} L 0 ${(h * yEdge).toFixed(1)}
      C ${(w * 0.26).toFixed(1)} ${(h * yMid).toFixed(1)} ${(w * 0.74).toFixed(1)} ${(h * yMid).toFixed(1)} ${w} ${(h * yEdge).toFixed(1)}
      L ${w} ${h} Z" fill="${fill}" opacity="${op}"/>`;
  s += crescent(0.86, 0.6, "#4fb8bd", 0.85);
  s += crescent(0.9, 0.68, "#ffffff", 0.75);
  s += crescent(0.94, 0.74, "#d6ba90");
  s += crescent(1.0, 0.81, "#ecd6ae");

  // Headlands, drawn last so they close over the ends of the beach.
  const head = (dir, edge, reach, capY, toeY, rock, lit) => {
    const tip = edge + dir * reach;
    let d = `M ${edge} ${h} L ${edge} ${(h * capY).toFixed(1)}`;
    const pts = [[0.3, 0.03], [0.55, 0.05], [0.78, 0.1], [1, 0.16]];
    for (const [t, drop] of pts) {
      d += ` L ${(edge + dir * reach * t).toFixed(1)} ${(h * (capY + drop) + rng.range(-h * 0.012, h * 0.012)).toFixed(1)}`;
    }
    d += ` L ${(tip - dir * w * 0.015).toFixed(1)} ${(h * toeY).toFixed(1)}`;
    d += ` C ${(edge + dir * reach * 0.62).toFixed(1)} ${(h * (toeY + 0.1)).toFixed(1)} ${(edge + dir * reach * 0.3).toFixed(1)} ${(h * (toeY + 0.18)).toFixed(1)} ${edge} ${h} Z`;
    let out = `<path d="${d}" fill="${rock}"/>`;
    // the seaward half of the face catches the light
    out += `<path d="M ${(edge + dir * reach * 0.42).toFixed(1)} ${(h * (capY + 0.05)).toFixed(1)}
      L ${(tip - dir * w * 0.015).toFixed(1)} ${(h * toeY).toFixed(1)}
      C ${(edge + dir * reach * 0.7).toFixed(1)} ${(h * (toeY + 0.08)).toFixed(1)} ${(edge + dir * reach * 0.56).toFixed(1)} ${(h * (toeY + 0.12)).toFixed(1)} ${(edge + dir * reach * 0.42).toFixed(1)} ${(h * (toeY + 0.14)).toFixed(1)} Z" fill="${lit}" opacity="0.55"/>`;
    for (let i = 0; i < 6; i++) {
      const t = 0.12 + i * 0.13;
      out += `<path d="M ${edge} ${(h * (capY + 0.06 + t * 0.5)).toFixed(1)}
        Q ${(edge + dir * reach * 0.55).toFixed(1)} ${(h * (capY + 0.1 + t * 0.48)).toFixed(1)} ${(edge + dir * reach * 0.9).toFixed(1)} ${(h * (capY + 0.17 + t * 0.4)).toFixed(1)}"
        stroke="#3f382e" stroke-width="${rng.range(1.6, 4).toFixed(1)}" fill="none" opacity="0.25"/>`;
    }
    let g = `M ${edge} ${(h * capY).toFixed(1)}`;
    for (const [t, drop] of pts) g += ` L ${(edge + dir * reach * t).toFixed(1)} ${(h * (capY + drop)).toFixed(1)}`;
    out += `<path d="${g}" stroke="#77934f" stroke-width="${(h * 0.032).toFixed(1)}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
    out += `<ellipse cx="${(edge + dir * reach * 0.66).toFixed(1)}" cy="${(h * (toeY + 0.13)).toFixed(1)}" rx="${(reach * 0.4).toFixed(1)}" ry="${(h * 0.022).toFixed(1)}" fill="#fff" opacity="0.6"/>`;
    return out;
  };
  s += head(1, 0, w * 0.3, 0.34, 0.62, "#6f6555", "#93866f");
  s += head(-1, w, w * 0.26, 0.4, 0.66, "#5e564a", "#82786551".slice(0, 7));

  // sea stacks off the left point
  [[0.33, 0.66, 0.09], [0.39, 0.7, 0.06]].forEach(([sx, sy, sh]) => {
    s += `<path d="M ${(w * sx - w * 0.015).toFixed(1)} ${(h * sy).toFixed(1)} L ${(w * sx + w * 0.011).toFixed(1)} ${(h * (sy - 0.012)).toFixed(1)} L ${(w * sx + w * 0.019).toFixed(1)} ${(h * (sy + sh)).toFixed(1)} L ${(w * sx - w * 0.023).toFixed(1)} ${(h * (sy + sh)).toFixed(1)} Z" fill="#4f483d"/>`;
    s += `<ellipse cx="${(w * sx).toFixed(1)}" cy="${(h * (sy + sh)).toFixed(1)}" rx="${(w * 0.034).toFixed(1)}" ry="${(h * 0.011).toFixed(1)}" fill="#fff" opacity="0.6"/>`;
  });
  return s;
};

S["snow-peaks"] = (w, h, rng) => {
  const sky = linear([["0", "#3f6795"], ["0.55", "#93b9d6"], ["1", "#dfe9ee"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  const layers = [["#8ba2b8", 0.5, 0.3], ["#6d879f", 0.62, 0.26], ["#4f6880", 0.75, 0.2]];
  layers.forEach(([c, by, amp], i) => {
    const pts = ridge(w, h * by, h * amp, 7 + i * 3, rng, 1.6);
    s += poly(pts, w, h, c);
    // snow caps sit just under each summit
    for (let k = 1; k < pts.length - 1; k++) {
      const [x, y] = pts[k];
      if (y < pts[k - 1][1] && y < pts[k + 1][1]) {
        const cap = h * 0.05;
        s += `<polygon points="${x.toFixed(1)},${y.toFixed(1)} ${(x + cap * 0.9).toFixed(1)},${(y + cap).toFixed(1)} ${(x + cap * 0.3).toFixed(1)},${(y + cap * 0.75).toFixed(1)} ${(x - cap * 0.35).toFixed(1)},${(y + cap * 1.05).toFixed(1)} ${(x - cap * 0.9).toFixed(1)},${(y + cap).toFixed(1)}" fill="#f4f8fa" opacity="0.95"/>`;
      }
    }
  });
  s += `<rect y="${h * 0.86}" width="${w}" height="${h * 0.14}" fill="#e8eef1"/>`;
  return s;
};

S["autumn-woods"] = (w, h, rng) => {
  const sky = linear([["0", "#e8c98d"], ["0.6", "#f0dcae"], ["1", "#d9c48d"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  s += `<rect y="${h * 0.78}" width="${w}" height="${h * 0.22}" fill="#8d6a3f"/>`;
  const cols = ["#c9622f", "#d98b32", "#b8452b", "#e0a63f", "#9c4a2a"];
  for (let i = 0; i < 22; i++) {
    const x = rng.range(-w * 0.05, w * 1.05);
    const depth = rng.f();
    const ht = h * (0.32 + depth * 0.45);
    s += leafyTree(x, h * (0.76 + depth * 0.16), ht, rng.pick(cols), rng);
  }
  for (let i = 0; i < 40; i++) {
    s += `<ellipse cx="${rng.range(0, w).toFixed(1)}" cy="${rng.range(h * 0.8, h).toFixed(1)}" rx="${rng.range(3, 9).toFixed(1)}" ry="${rng.range(2, 5).toFixed(1)}" fill="${rng.pick(cols)}" opacity="0.75"/>`;
  }
  return s;
};

S["river-bend"] = (w, h, rng) => {
  const sky = linear([["0", "#8dbbdc"], ["1", "#e6ddc0"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h * 0.4}" fill="url(#${sky.gid})"/>`;
  s += `<path d="${hillPath(w, h, h * 0.4, h * 0.08, rng)}" fill="#7d9c62"/>`;
  s += `<path d="${hillPath(w, h, h * 0.52, h * 0.07, rng)}" fill="#6b8b52"/>`;
  s += `<path d="${hillPath(w, h, h * 0.66, h * 0.06, rng)}" fill="#587540"/>`;
  const river = linear([["0", "#a9cfe0"], ["1", "#5b8ba8"]]);
  s += `<defs>${river.def}</defs>`;
  s += `<path d="M ${w * 0.46} ${h * 0.38} C ${w * 0.36} ${h * 0.58} ${w * 0.66} ${h * 0.66} ${w * 0.44} ${h}
        L ${w * 0.72} ${h} C ${w * 0.84} ${h * 0.68} ${w * 0.54} ${h * 0.56} ${w * 0.53} ${h * 0.38} Z" fill="url(#${river.gid})"/>`;
  s += waterGlints(w, h * 0.5, h, 30, rng, "#eaf4f8");
  return s;
};

S["canyon"] = (w, h, _rng) => {
  const sky = linear([["0", "#5d90bd"], ["1", "#e9c894"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  const bands = ["#b4653c", "#c67c4a", "#a2542f", "#8d4527", "#743721"];
  const walls = [[0, 1], [w, -1]];
  walls.forEach(([ox, dir], wi) => {
    bands.forEach((c, i) => {
      const inset = (0.12 + i * 0.045) * w;
      const top = h * (0.18 + i * 0.1 + wi * 0.05);
      s += `<path d="M ${ox} ${top} L ${(ox + dir * inset).toFixed(1)} ${(top + h * 0.08).toFixed(1)} L ${(ox + dir * inset * 0.85).toFixed(1)} ${h} L ${ox} ${h} Z" fill="${c}"/>`;
    });
  });
  s += `<path d="M ${w * 0.42} ${h * 0.72} Q ${w * 0.5} ${h * 0.84} ${w * 0.46} ${h} L ${w * 0.58} ${h} Q ${w * 0.6} ${h * 0.84} ${w * 0.54} ${h * 0.72} Z" fill="#6f9ab0" opacity="0.9"/>`;
  return s;
};

S["wildflower-meadow"] = (w, h, rng) => {
  const sky = linear([["0", "#7fb8e0"], ["0.7", "#cfe7f3"], ["1", "#eae6c4"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h * 0.46}" fill="url(#${sky.gid})"/>
    ${cloudBlob(w * 0.7, h * 0.14, w * 0.36, h * 0.045, "#fff", 0.7, rng)}`;
  s += `<path d="${hillPath(w, h, h * 0.46, h * 0.05, rng)}" fill="#9ab863"/>`;
  s += `<path d="${hillPath(w, h, h * 0.58, h * 0.04, rng)}" fill="#84a552"/>`;
  const flowers = ["#f2d24b", "#e8735f", "#d9a3d6", "#f6f1e4", "#eb9a4d"];
  for (let i = 0; i < 240; i++) {
    const y = rng.range(h * 0.52, h);
    const t = (y - h * 0.52) / (h * 0.48);
    const x = rng.range(0, w);
    const r = 2 + t * 7;
    s += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + r * 2.4).toFixed(1)}" stroke="#5f7c3a" stroke-width="${(1 + t * 1.6).toFixed(1)}" opacity="0.75"/>`;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${rng.pick(flowers)}" opacity="${(0.7 + t * 0.3).toFixed(2)}"/>`;
  }
  return s;
};

S["pine-fog"] = (w, h, rng) => {
  const sky = linear([["0", "#b9c6c8"], ["1", "#dfe4e0"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  for (let layer = 0; layer < 4; layer++) {
    const depth = layer / 4;
    const col = shade("#3f5f4a", 0.05 + depth * 0.45);
    const baseY = h * (0.58 + layer * 0.11);
    for (let i = 0; i < 14; i++) {
      const x = (i / 13) * w * 1.1 - w * 0.05 + rng.range(-20, 20);
      s += conifer(x, baseY, h * (0.28 + depth * 0.2), col, rng);
    }
    s += `<rect y="${(baseY - h * 0.16).toFixed(1)}" width="${w}" height="${(h * 0.22).toFixed(1)}" fill="#e6ebe6" opacity="${(0.42 - depth * 0.08).toFixed(2)}"/>`;
  }
  s += `<rect y="${h * 0.9}" width="${w}" height="${h * 0.1}" fill="#dde3dd" opacity="0.6"/>`;
  return s;
};

S["tropical-beach"] = (w, h, rng) => {
  const sky = linear([["0", "#43a6d0"], ["0.65", "#a9dcec"], ["1", "#f0e4c4"]]);
  const hz = h * 0.48;
  const sea = linear([["0", "#1fa2a8"], ["0.5", "#38bfbc"], ["1", "#8fdcd0"]]);
  let s = `<defs>${sky.def}${sea.def}</defs>
    <rect width="${w}" height="${hz}" fill="url(#${sky.gid})"/>
    ${cloudBlob(w * 0.24, h * 0.16, w * 0.4, h * 0.04, "#fff", 0.7, rng)}
    <rect y="${hz}" width="${w}" height="${h * 0.34}" fill="url(#${sea.gid})"/>
    ${waterGlints(w, hz + 4, h * 0.8, 45, rng, "#ffffff")}
    <path d="M 0 ${h * 0.8} Q ${w * 0.5} ${h * 0.76} ${w} ${h * 0.81} L ${w} ${h} L 0 ${h} Z" fill="#f0dcb0"/>
    <path d="M 0 ${h * 0.8} Q ${w * 0.5} ${h * 0.76} ${w} ${h * 0.81} L ${w} ${h * 0.84} Q ${w * 0.5} ${h * 0.79} 0 ${h * 0.835} Z" fill="#ffffff" opacity="0.6"/>`;
  // two palms leaning off the left edge
  [[w * 0.14, h * 0.86, h * 0.62], [w * 0.3, h * 0.83, h * 0.44]].forEach(([px, py, ph]) => {
    s += `<path d="M ${px} ${py} Q ${(px - ph * 0.16).toFixed(1)} ${(py - ph * 0.55).toFixed(1)} ${(px - ph * 0.07).toFixed(1)} ${(py - ph).toFixed(1)}" stroke="#7a5a3a" stroke-width="${(ph * 0.045).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
    const tx = px - ph * 0.07, ty = py - ph;
    for (let k = 0; k < 7; k++) {
      const a = (-Math.PI * 0.92) + (k / 6) * Math.PI * 0.84;
      const ex = tx + Math.cos(a) * ph * 0.34;
      const ey = ty + Math.sin(a) * ph * 0.28 + ph * 0.06;
      s += `<path d="M ${tx.toFixed(1)} ${ty.toFixed(1)} Q ${((tx + ex) / 2).toFixed(1)} ${(Math.min(ty, ey) - ph * 0.1).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="#2f7a4e" stroke-width="${(ph * 0.05).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
    }
  });
  return s;
};

S["starry-night"] = (w, h, rng) => {
  const sky = linear([["0", "#080d20"], ["0.55", "#16224a"], ["1", "#2c3f63"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  const band = linear([["0", "#5f6fb0", 0], ["0.5", "#8f9fd8", 0.35], ["1", "#5f6fb0", 0]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  s += `<defs>${band.def}</defs><rect width="${w}" height="${h}" fill="url(#${band.gid})" opacity="0.5"/>`;
  s += stars(w, h * 0.86, 420, rng, h * 0.86);
  for (let i = 0; i < 6; i++) {
    const x = rng.range(0, w), y = rng.range(0, h * 0.5);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rng.range(2.5, 4).toFixed(1)}" fill="#fff"/>
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rng.range(7, 12).toFixed(1)}" fill="#fff" opacity="0.16"/>`;
  }
  s += poly(ridge(w, h * 0.9, h * 0.14, 9, rng, 1.5), w, h, "#070a14");
  return s;
};

S["aurora"] = (w, h, rng) => {
  const sky = linear([["0", "#050c1c"], ["0.6", "#0d2340"], ["1", "#16324d"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  s += stars(w, h * 0.7, 260, rng, h * 0.7);
  const b = blur(26);
  s += `<defs>${b.def}</defs><g filter="url(#${b.fid})">`;
  const ribbons = ["#4fe0a0", "#3fd0c8", "#8f6fe0", "#6ee08f"];
  ribbons.forEach((c, i) => {
    const y0 = h * (0.16 + i * 0.07);
    let d = `M ${-w * 0.05} ${y0}`;
    for (let k = 1; k <= 5; k++) {
      const x = (k / 5) * w * 1.1 - w * 0.05;
      d += ` Q ${(x - w * 0.11).toFixed(1)} ${(y0 + rng.range(-h * 0.1, h * 0.1)).toFixed(1)} ${x.toFixed(1)} ${(y0 + rng.range(-h * 0.05, h * 0.07)).toFixed(1)}`;
    }
    s += `<path d="${d}" stroke="${c}" stroke-width="${h * rng.range(0.05, 0.11)}" fill="none" opacity="0.5" stroke-linecap="round"/>`;
  });
  s += `</g>`;
  s += poly(ridge(w, h * 0.88, h * 0.1, 8, rng, 1.2), w, h, "#0b1524");
  s += `<rect y="${h * 0.88}" width="${w}" height="${h * 0.12}" fill="#152a3c"/>`;
  return s;
};

S["storm-clouds"] = (w, h, rng) => {
  // A bright break on the horizon is what makes the anvil above it read as heavy.
  const sky = linear([["0", "#232c38"], ["0.5", "#46525f"], ["0.76", "#8f9aa2"], ["0.88", "#e0d2b4"], ["1", "#c9b892"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  const glow = radial([["0", "#ffeec4", 0.85], ["1", "#ffeec4", 0]]);
  s += `<defs>${glow.def}</defs><ellipse cx="${w * 0.66}" cy="${h * 0.8}" rx="${w * 0.34}" ry="${h * 0.14}" fill="url(#${glow.gid})"/>`;
  const b = blur(10);
  s += `<defs>${b.def}</defs><g filter="url(#${b.fid})">`;
  for (let i = 0; i < 5; i++) {
    s += cloudBlob(rng.range(0, w), rng.range(h * 0.04, h * 0.34), w * rng.range(0.44, 0.8), h * rng.range(0.08, 0.14), "#1b232e", 0.9, rng);
  }
  for (let i = 0; i < 5; i++) {
    s += cloudBlob(rng.range(0, w), rng.range(h * 0.3, h * 0.58), w * rng.range(0.36, 0.66), h * rng.range(0.05, 0.1), "#5e6b77", 0.75, rng);
  }
  s += `</g>`;
  // rain falls in visible sheets, not scattered ticks
  for (let sheet = 0; sheet < 5; sheet++) {
    const sx = rng.range(-w * 0.2, w * 0.9);
    const sw = w * rng.range(0.14, 0.3);
    s += `<g opacity="${rng.range(0.16, 0.34).toFixed(2)}">`;
    for (let i = 0; i < 60; i++) {
      const x = sx + rng.range(0, sw);
      const y = rng.range(h * 0.36, h * 0.84);
      const len = rng.range(h * 0.05, h * 0.14);
      s += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + len * 0.3).toFixed(1)}" y2="${(y + len).toFixed(1)}" stroke="#e8eef4" stroke-width="1.3"/>`;
    }
    s += `</g>`;
  }
  s += poly(ridge(w, h * 0.88, h * 0.07, 7, rng, 0.8), w, h, "#232c36");
  s += `<rect y="${h * 0.93}" width="${w}" height="${h * 0.07}" fill="#1a222b"/>`;
  return s;
};

S["rainbow"] = (w, h, rng) => {
  const sky = linear([["0", "#5f7f9f"], ["0.5", "#a8bfd0"], ["1", "#e4dcc2"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  s += cloudBlob(w * 0.18, h * 0.16, w * 0.4, h * 0.05, "#6b7787", 0.7, rng);
  const arc = ["#e05c4a", "#e8934a", "#e8ca55", "#6fbe63", "#4b8fd0", "#7a63bd"];
  const cx = w * 0.5, cy = h * 0.94, r0 = h * 0.62;
  arc.forEach((c, i) => {
    const r = r0 - i * (h * 0.028);
    s += `<path d="M ${(cx - r).toFixed(1)} ${cy} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(cx + r).toFixed(1)} ${cy}" stroke="${c}" stroke-width="${(h * 0.028).toFixed(1)}" fill="none" opacity="0.55"/>`;
  });
  s += `<path d="${hillPath(w, h, h * 0.72, h * 0.06, rng)}" fill="#6d8c52"/>`;
  s += `<path d="${hillPath(w, h, h * 0.83, h * 0.05, rng)}" fill="#546f3d"/>`;
  return s;
};

S["misty-morning"] = (w, h, rng) => {
  const sky = linear([["0", "#d3ddd9"], ["0.5", "#e6e6da"], ["1", "#efe4cf"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  const glow = radial([["0", "#fff8dc", 0.85], ["1", "#fff8dc", 0]]);
  s += `<defs>${glow.def}</defs><circle cx="${w * 0.58}" cy="${h * 0.32}" r="${w * 0.3}" fill="url(#${glow.gid})"/>`;
  for (let layer = 0; layer < 5; layer++) {
    const y = h * (0.48 + layer * 0.1);
    const col = shade("#5b7a63", 0.02 + layer * 0.13);
    for (let i = 0; i < 9; i++) {
      s += conifer(rng.range(-40, w + 40), y + h * 0.05, h * (0.2 + layer * 0.06), col, rng);
    }
    s += `<rect y="${(y - h * 0.05).toFixed(1)}" width="${w}" height="${(h * 0.18).toFixed(1)}" fill="#eceee6" opacity="${(0.55 - layer * 0.07).toFixed(2)}"/>`;
  }
  return s;
};

S["full-moon"] = (w, h, rng) => {
  const sky = linear([["0", "#0a1226"], ["0.6", "#182b4a"], ["1", "#2d4460"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>${stars(w, h * 0.8, 200, rng, h * 0.8)}`;
  const cx = w * 0.62, cy = h * 0.34, r = w * 0.11;
  const glow = radial([["0", "#f4f2e0", 0.5], ["1", "#f4f2e0", 0]]);
  s += `<defs>${glow.def}</defs><circle cx="${cx}" cy="${cy}" r="${r * 3.4}" fill="url(#${glow.gid})"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f2efdc"/>`;
  for (let i = 0; i < 9; i++) {
    const a = rng.range(0, Math.PI * 2), d = rng.range(0, r * 0.72);
    s += `<circle cx="${(cx + Math.cos(a) * d).toFixed(1)}" cy="${(cy + Math.sin(a) * d).toFixed(1)}" r="${rng.range(r * 0.05, r * 0.17).toFixed(1)}" fill="#dcd8c2" opacity="0.75"/>`;
  }
  s += cloudBlob(w * 0.5, h * 0.42, w * 0.7, h * 0.045, "#22344f", 0.75, rng);
  s += cloudBlob(w * 0.3, h * 0.6, w * 0.6, h * 0.04, "#1b2b42", 0.7, rng);
  s += poly(ridge(w, h * 0.92, h * 0.09, 7, rng, 1), w, h, "#0c1424");
  return s;
};

S["city-dusk"] = (w, h, rng) => {
  const sky = linear([["0", "#1f2b4d"], ["0.45", "#5a4a72"], ["0.78", "#c9756a"], ["1", "#efb579"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  s += `<circle cx="${w * 0.78}" cy="${h * 0.7}" r="${w * 0.045}" fill="#ffdca0" opacity="0.9"/>`;
  const rows = [["#3c4463", 0.62, 0.55], ["#2a3049", 0.72, 0.8], ["#171c2d", 0.82, 1]];
  rows.forEach(([col, baseT, litness], ri) => {
    let x = -20;
    while (x < w + 20) {
      const bw = rng.range(w * 0.03, w * 0.085);
      const bh = h * rng.range(0.12, 0.36) * (0.7 + ri * 0.2);
      const y = h * baseT - bh;
      s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${(h - y).toFixed(1)}" fill="${col}"/>`;
      if (rng.f() < 0.3) s += `<rect x="${(x + bw * 0.4).toFixed(1)}" y="${(y - h * 0.05).toFixed(1)}" width="${(bw * 0.2).toFixed(1)}" height="${(h * 0.05).toFixed(1)}" fill="${col}"/>`;
      const cols = Math.max(1, Math.floor(bw / (w * 0.016)));
      const rowsN = Math.max(1, Math.floor(bh / (h * 0.038)));
      for (let cxi = 0; cxi < cols; cxi++) {
        for (let cyi = 0; cyi < rowsN; cyi++) {
          if (rng.f() > 0.4 * litness) continue;
          s += `<rect x="${(x + bw * 0.16 + cxi * (bw * 0.68 / cols)).toFixed(1)}" y="${(y + h * 0.02 + cyi * (bh * 0.86 / rowsN)).toFixed(1)}" width="${(bw * 0.13).toFixed(1)}" height="${(h * 0.014).toFixed(1)}" fill="${rng.pick(["#ffd98a", "#ffe9b8", "#f7c96e"])}" opacity="${rng.range(0.5, 1).toFixed(2)}"/>`;
        }
      }
      x += bw + rng.range(3, 12);
    }
  });
  return s;
};

S["bridge-night"] = (w, h, rng) => {
  const sky = linear([["0", "#0d1730"], ["0.6", "#1e3152"], ["1", "#3b5170"]]);
  const hz = h * 0.62;
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${hz}" fill="url(#${sky.gid})"/>${stars(w, hz * 0.7, 150, rng, hz * 0.7)}`;
  s += `<rect y="${hz}" width="${w}" height="${h - hz}" fill="#0f1c2f"/>`;
  const deck = hz - h * 0.02;
  const towers = [w * 0.28, w * 0.72];
  s += `<rect y="${deck.toFixed(1)}" width="${w}" height="${(h * 0.028).toFixed(1)}" fill="#24384f"/>`;
  towers.forEach((tx) => {
    s += `<rect x="${(tx - w * 0.012).toFixed(1)}" y="${(deck - h * 0.34).toFixed(1)}" width="${(w * 0.024).toFixed(1)}" height="${(h * 0.34).toFixed(1)}" fill="#1a2b3f"/>`;
    s += `<rect x="${(tx - w * 0.03).toFixed(1)}" y="${(deck - h * 0.26).toFixed(1)}" width="${(w * 0.06).toFixed(1)}" height="${(h * 0.016).toFixed(1)}" fill="#1a2b3f"/>`;
  });
  s += `<path d="M 0 ${(deck - h * 0.12).toFixed(1)} Q ${(towers[0] / 2).toFixed(1)} ${(deck + h * 0.01).toFixed(1)} ${towers[0].toFixed(1)} ${(deck - h * 0.32).toFixed(1)} Q ${(w * 0.5).toFixed(1)} ${(deck + h * 0.03).toFixed(1)} ${towers[1].toFixed(1)} ${(deck - h * 0.32).toFixed(1)} Q ${((w + towers[1]) / 2).toFixed(1)} ${(deck + h * 0.01).toFixed(1)} ${w} ${(deck - h * 0.12).toFixed(1)}" stroke="#2c435c" stroke-width="3" fill="none"/>`;
  for (let i = 0; i < 34; i++) {
    const x = (i / 33) * w;
    s += `<line x1="${x.toFixed(1)}" y1="${(deck - h * 0.02).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(deck - h * 0.14 - Math.abs(Math.sin(i / 33 * Math.PI * 2)) * h * 0.1).toFixed(1)}" stroke="#2c435c" stroke-width="1" opacity="0.7"/>`;
  }
  for (let i = 0; i < 26; i++) {
    const x = (i / 25) * w;
    s += `<circle cx="${x.toFixed(1)}" cy="${(deck - h * 0.008).toFixed(1)}" r="2.4" fill="#ffd98a"/>`;
    s += `<rect x="${(x - 1.6).toFixed(1)}" y="${hz.toFixed(1)}" width="3.2" height="${(h * rng.range(0.06, 0.2)).toFixed(1)}" fill="#ffd98a" opacity="0.28"/>`;
  }
  s += waterGlints(w, hz + 6, h, 40, rng, "#8fb4d0");
  return s;
};

S["street-golden"] = (w, h, rng) => {
  const sky = linear([["0", "#a8c6dc"], ["0.6", "#f0cf9c"], ["1", "#f8e2b8"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  const vp = h * 0.56;
  s += `<path d="M ${w * 0.44} ${vp} L 0 ${h} L ${w} ${h} L ${w * 0.56} ${vp} Z" fill="#6a6a72"/>`;
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const y = vp + (h - vp) * (t * t + 0.06);
    s += `<rect x="${(w * 0.5 - w * 0.012 * (1 + t * 5)).toFixed(1)}" y="${y.toFixed(1)}" width="${(w * 0.024 * (1 + t * 5)).toFixed(1)}" height="${(h * 0.012 * (1 + t * 4)).toFixed(1)}" fill="#e8e2d0" opacity="0.85"/>`;
  }
  [[-1, 0], [1, w]].forEach(([dir, edge]) => {
    for (let i = 0; i < 5; i++) {
      const t = i / 5;
      const near = edge + dir * -1 * (w * (0.02 + t * 0.32));
      const far = edge + dir * -1 * (w * (0.02 + (t + 0.2) * 0.32));
      const topN = vp - h * (0.42 - t * 0.3);
      const topF = vp - h * (0.42 - (t + 0.2) * 0.3);
      const col = shade(rng.pick(["#c9a487", "#b08d70", "#d6b795", "#9d7f66"]), t * 0.25);
      s += `<polygon points="${near.toFixed(1)},${topN.toFixed(1)} ${far.toFixed(1)},${topF.toFixed(1)} ${far.toFixed(1)},${h} ${near.toFixed(1)},${h}" fill="${col}"/>`;
      for (let k = 0; k < 4; k++) {
        const wy = topN + (h - topN) * (0.12 + k * 0.18);
        s += `<rect x="${(Math.min(near, far) + Math.abs(far - near) * 0.2).toFixed(1)}" y="${wy.toFixed(1)}" width="${(Math.abs(far - near) * 0.55).toFixed(1)}" height="${(h * 0.05).toFixed(1)}" fill="#f6d9a4" opacity="${(0.35 + t * 0.3).toFixed(2)}"/>`;
      }
    }
  });
  const glow = radial([["0", "#fff0c0", 0.7], ["1", "#fff0c0", 0]]);
  s += `<defs>${glow.def}</defs><circle cx="${w * 0.5}" cy="${vp}" r="${w * 0.3}" fill="url(#${glow.gid})"/>`;
  return s;
};

S["rooftops"] = (w, h, rng) => {
  const sky = linear([["0", "#79a9cf"], ["0.7", "#cbd9e2"], ["1", "#eddcbe"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  const cols = ["#c8785e", "#b06349", "#d99277", "#98543f", "#e0a684"];
  for (let row = 0; row < 4; row++) {
    const depth = row / 4;
    let x = -30;
    const baseY = h * (0.42 + row * 0.16);
    while (x < w + 30) {
      const bw = rng.range(w * 0.06, w * 0.15);
      const bh = h * rng.range(0.1, 0.2);
      const col = shade(rng.pick(cols), 0.35 - depth * 0.3);
      s += `<rect x="${x.toFixed(1)}" y="${(baseY - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${(bh + h * 0.2).toFixed(1)}" fill="${tint(col, 0.35)}"/>`;
      s += `<polygon points="${x.toFixed(1)},${(baseY - bh).toFixed(1)} ${(x + bw / 2).toFixed(1)},${(baseY - bh - h * 0.05).toFixed(1)} ${(x + bw).toFixed(1)},${(baseY - bh).toFixed(1)}" fill="${col}"/>`;
      for (let k = 0; k < 2; k++) {
        s += `<rect x="${(x + bw * (0.2 + k * 0.42)).toFixed(1)}" y="${(baseY - bh * 0.55).toFixed(1)}" width="${(bw * 0.2).toFixed(1)}" height="${(bh * 0.3).toFixed(1)}" fill="#4d5a68" opacity="0.75"/>`;
      }
      x += bw + rng.range(2, 10);
    }
  }
  return s;
};

S["harbour"] = (w, h, rng) => {
  const sky = linear([["0", "#5f8fb8"], ["0.6", "#bcd3e0"], ["1", "#e8dcc0"]]);
  const hz = h * 0.56;
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${hz}" fill="url(#${sky.gid})"/>
    ${cloudBlob(w * 0.7, h * 0.16, w * 0.4, h * 0.045, "#fff", 0.6, rng)}
    <rect y="${hz}" width="${w}" height="${h - hz}" fill="#2f5f78"/>`;
  const hullCols = ["#d8624f", "#e0e0d4", "#4f7fa8", "#e8b04a"];
  for (let i = 0; i < 7; i++) {
    const x = rng.range(w * 0.05, w * 0.95);
    const sc = rng.range(0.6, 1.3);
    const y = hz + rng.range(h * 0.01, h * 0.16);
    const bw = w * 0.09 * sc, bh = h * 0.04 * sc;
    s += `<path d="M ${(x - bw / 2).toFixed(1)} ${y.toFixed(1)} L ${(x + bw / 2).toFixed(1)} ${y.toFixed(1)} L ${(x + bw * 0.34).toFixed(1)} ${(y + bh).toFixed(1)} L ${(x - bw * 0.34).toFixed(1)} ${(y + bh).toFixed(1)} Z" fill="${rng.pick(hullCols)}"/>`;
    s += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y - h * 0.16 * sc).toFixed(1)}" stroke="#e6e2d4" stroke-width="${(1.6 * sc).toFixed(1)}"/>`;
    s += `<path d="M ${(x + 2).toFixed(1)} ${(y - h * 0.15 * sc).toFixed(1)} L ${(x + bw * 0.42).toFixed(1)} ${(y - h * 0.02 * sc).toFixed(1)} L ${(x + 2).toFixed(1)} ${(y - h * 0.02 * sc).toFixed(1)} Z" fill="#f4f0e4" opacity="0.9"/>`;
  }
  s += waterGlints(w, hz + 4, h, 55, rng, "#cfe4ee");
  return s;
};

S["train-station"] = (w, h, rng) => {
  const back = linear([["0", "#dfe2dc"], ["1", "#b5b7ae"]]);
  let s = `<defs>${back.def}</defs><rect width="${w}" height="${h}" fill="url(#${back.gid})"/>`;
  s += `<rect y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="#8f8a80"/>`;
  s += `<rect y="${h * 0.72}" width="${w}" height="${h * 0.012}" fill="#f0c46a"/>`;
  const cx = w * 0.5;
  for (let i = 5; i >= 0; i--) {
    const t = i / 5;
    const rx = w * (0.16 + t * 0.34), ry = h * (0.24 + t * 0.3);
    s += `<path d="M ${(cx - rx).toFixed(1)} ${(h * 0.74).toFixed(1)} A ${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 1 ${(cx + rx).toFixed(1)} ${(h * 0.74).toFixed(1)}" fill="none" stroke="${shade("#6d7079", 0.1 + t * 0.2)}" stroke-width="${(4 + t * 8).toFixed(1)}"/>`;
  }
  const glow = radial([["0", "#fff4d0", 0.75], ["1", "#fff4d0", 0]]);
  s += `<defs>${glow.def}</defs><ellipse cx="${cx}" cy="${h * 0.56}" rx="${w * 0.18}" ry="${h * 0.22}" fill="url(#${glow.gid})"/>`;
  for (let i = 0; i < 5; i++) {
    const x = cx + (i - 2) * w * 0.14;
    s += `<rect x="${(x - w * 0.006).toFixed(1)}" y="${(h * 0.36).toFixed(1)}" width="${(w * 0.012).toFixed(1)}" height="${(h * 0.36).toFixed(1)}" fill="#5c5f66"/>`;
  }
  for (let i = 0; i < 9; i++) {
    const x = rng.range(w * 0.06, w * 0.94);
    const ph = h * rng.range(0.08, 0.13);
    s += `<ellipse cx="${x.toFixed(1)}" cy="${(h * 0.73).toFixed(1)}" rx="${(ph * 0.3).toFixed(1)}" ry="${(ph * 0.07).toFixed(1)}" fill="#000" opacity="0.16"/>`;
    s += `<rect x="${(x - ph * 0.11).toFixed(1)}" y="${(h * 0.73 - ph).toFixed(1)}" width="${(ph * 0.22).toFixed(1)}" height="${(ph * 0.72).toFixed(1)}" rx="${(ph * 0.1).toFixed(1)}" fill="${rng.pick(["#3d4652", "#5a4436", "#2f3b48", "#6b4a52"])}"/>`;
    s += `<circle cx="${x.toFixed(1)}" cy="${(h * 0.73 - ph * 0.84).toFixed(1)}" r="${(ph * 0.11).toFixed(1)}" fill="#c9a487"/>`;
  }
  return s;
};

S["neon-street"] = (w, h, rng) => {
  let s = `<rect width="${w}" height="${h}" fill="#0c0a18"/>`;
  s += `<rect y="${h * 0.7}" width="${w}" height="${h * 0.3}" fill="#141224"/>`;
  const neon = ["#ff4d8d", "#3fe0ff", "#ffd23f", "#8f5bff", "#3fffa8"];
  const b = blur(14);
  s += `<defs>${b.def}</defs>`;
  [[0, 1], [w, -1]].forEach(([edge, dir]) => {
    for (let i = 0; i < 4; i++) {
      const t = i / 4;
      const x = edge + dir * w * (0.02 + t * 0.28);
      const bw = w * 0.2;
      s += `<rect x="${(dir > 0 ? x : x - bw).toFixed(1)}" y="${(h * (0.06 + t * 0.1)).toFixed(1)}" width="${bw.toFixed(1)}" height="${(h * 0.72).toFixed(1)}" fill="#171528"/>`;
      for (let k = 0; k < 3; k++) {
        const c = rng.pick(neon);
        const sy = h * (0.16 + t * 0.08 + k * 0.16);
        const sw = bw * rng.range(0.3, 0.62);
        const sx = dir > 0 ? x + bw * 0.15 : x - bw + bw * 0.2;
        s += `<g filter="url(#${b.fid})"><rect x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" width="${sw.toFixed(1)}" height="${(h * 0.035).toFixed(1)}" rx="4" fill="${c}" opacity="0.85"/></g>`;
        s += `<rect x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" width="${sw.toFixed(1)}" height="${(h * 0.035).toFixed(1)}" rx="4" fill="${c}"/>`;
      }
    }
  });
  for (let i = 0; i < 40; i++) {
    s += `<rect x="${rng.range(0, w).toFixed(1)}" y="${rng.range(h * 0.72, h).toFixed(1)}" width="${rng.range(20, 110).toFixed(1)}" height="2.5" rx="1" fill="${rng.pick(neon)}" opacity="${rng.range(0.08, 0.3).toFixed(2)}"/>`;
  }
  return s;
};

S["single-flower"] = (w, h, rng) => {
  const bg = radial([["0", "#f6ead4"], ["1", "#c8b48e"]]);
  let s = `<defs>${bg.def}</defs><rect width="${w}" height="${h}" fill="url(#${bg.gid})"/>`;
  const cx = w * 0.5, cy = h * 0.46, R = Math.min(w, h) * 0.3;
  s += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${h}" stroke="#5d7d3d" stroke-width="${(R * 0.11).toFixed(1)}"/>`;
  [[-1, 0.62], [1, 0.78]].forEach(([d, t]) => {
    s += `<path d="M ${cx} ${(cy + R * 1.5 * t).toFixed(1)} Q ${(cx + d * R * 0.7).toFixed(1)} ${(cy + R * 1.3 * t).toFixed(1)} ${(cx + d * R * 0.95).toFixed(1)} ${(cy + R * 1.75 * t).toFixed(1)} Q ${(cx + d * R * 0.55).toFixed(1)} ${(cy + R * 1.7 * t).toFixed(1)} ${cx} ${(cy + R * 1.5 * t).toFixed(1)} Z" fill="#6b8f45"/>`;
  });
  const petals = 13;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const px = cx + Math.cos(a) * R * 0.62, py = cy + Math.sin(a) * R * 0.62;
    s += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${(R * 0.42).toFixed(1)}" ry="${(R * 0.19).toFixed(1)}" fill="${i % 2 ? "#f2b93f" : "#e8a52f"}" transform="rotate(${(a * 180 / Math.PI).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)})"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${(R * 0.42).toFixed(1)}" fill="#6b4a25"/>`;
  for (let i = 0; i < 90; i++) {
    const a = rng.range(0, Math.PI * 2), d = Math.sqrt(rng.f()) * R * 0.38;
    s += `<circle cx="${(cx + Math.cos(a) * d).toFixed(1)}" cy="${(cy + Math.sin(a) * d).toFixed(1)}" r="${rng.range(1.5, 3.6).toFixed(1)}" fill="#4d3418" opacity="0.6"/>`;
  }
  return s;
};

S["leaves"] = (w, h, rng) => {
  let s = `<rect width="${w}" height="${h}" fill="#1e3a2b"/>`;
  const cols = ["#2f6b45", "#3f8355", "#57a067", "#245939", "#6cb478"];
  for (let i = 0; i < 34; i++) {
    const x = rng.range(0, w), y = rng.range(0, h);
    const L = Math.min(w, h) * rng.range(0.14, 0.36);
    const a = rng.range(0, 360);
    const c = rng.pick(cols);
    s += `<g transform="rotate(${a.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})">
      <path d="M ${x.toFixed(1)} ${(y - L / 2).toFixed(1)} Q ${(x + L * 0.34).toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${(y + L / 2).toFixed(1)} Q ${(x - L * 0.34).toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${(y - L / 2).toFixed(1)} Z" fill="${c}"/>
      <line x1="${x.toFixed(1)}" y1="${(y - L / 2).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + L / 2).toFixed(1)}" stroke="${shade(c, 0.3)}" stroke-width="1.6" opacity="0.7"/>
    </g>`;
  }
  const lg = linear([["0", "#a8d88f", 0.16], ["1", "#0d2318", 0.4]]);
  s += `<defs>${lg.def}</defs><rect width="${w}" height="${h}" fill="url(#${lg.gid})"/>`;
  return s;
};

S["cactus"] = (w, h, rng) => {
  const sky = linear([["0", "#f2a25f"], ["0.5", "#f0c887"], ["1", "#d98f5e"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  s += `<circle cx="${w * 0.72}" cy="${h * 0.3}" r="${w * 0.1}" fill="#ffe7ad" opacity="0.55"/>`;
  s += `<path d="${hillPath(w, h, h * 0.68, h * 0.05, rng)}" fill="#a9673f"/>`;
  s += `<rect y="${h * 0.78}" width="${w}" height="${h * 0.22}" fill="#8a5334"/>`;
  const shapes = [[w * 0.34, h * 0.86, h * 0.52], [w * 0.62, h * 0.89, h * 0.36], [w * 0.83, h * 0.87, h * 0.24]];
  shapes.forEach(([x, baseY, ht]) => {
    const bw = ht * 0.22;
    const c = "#3f6b46";
    // Arms are one continuous round-capped stroke — the elbow curves instead of stepping.
    [[-1, 0.5, 0.34], [1, 0.36, 0.26]].forEach(([d, at, ah]) => {
      const ay = baseY - ht * at;
      const ax = x + d * bw * 1.45;
      s += `<path d="M ${x.toFixed(1)} ${ay.toFixed(1)}
        Q ${ax.toFixed(1)} ${ay.toFixed(1)} ${ax.toFixed(1)} ${(ay - ht * ah).toFixed(1)}"
        stroke="${shade(c, 0.12)}" stroke-width="${(bw * 0.74).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
      // ribs on the arm
      for (let k = 0; k < 4; k++) {
        const ry = ay - ht * ah * (0.2 + k * 0.24);
        s += `<line x1="${(ax - bw * 0.3).toFixed(1)}" y1="${ry.toFixed(1)}" x2="${(ax + bw * 0.3).toFixed(1)}" y2="${ry.toFixed(1)}" stroke="${shade(c, 0.3)}" stroke-width="1.6" opacity="0.5"/>`;
      }
    });
    s += `<rect x="${(x - bw / 2).toFixed(1)}" y="${(baseY - ht).toFixed(1)}" width="${bw.toFixed(1)}" height="${ht.toFixed(1)}" rx="${(bw / 2).toFixed(1)}" fill="${c}"/>`;
    s += `<rect x="${(x - bw * 0.34).toFixed(1)}" y="${(baseY - ht * 0.96).toFixed(1)}" width="${(bw * 0.16).toFixed(1)}" height="${(ht * 0.92).toFixed(1)}" rx="${(bw * 0.08).toFixed(1)}" fill="${tint(c, 0.22)}" opacity="0.6"/>`;
    s += `<rect x="${(x + bw * 0.2).toFixed(1)}" y="${(baseY - ht * 0.96).toFixed(1)}" width="${(bw * 0.14).toFixed(1)}" height="${(ht * 0.92).toFixed(1)}" rx="${(bw * 0.07).toFixed(1)}" fill="${shade(c, 0.28)}" opacity="0.5"/>`;
    // spines
    for (let k = 0; k < 12; k++) {
      const sy = baseY - ht * (0.06 + k * 0.078);
      [-1, 1].forEach((d) => {
        s += `<line x1="${(x + d * bw * 0.42).toFixed(1)}" y1="${sy.toFixed(1)}" x2="${(x + d * bw * 0.66).toFixed(1)}" y2="${(sy - ht * 0.014).toFixed(1)}" stroke="#e8dcaf" stroke-width="1.4" opacity="0.7"/>`;
      });
    }
    // one bloom on the tallest
    if (ht > h * 0.4) {
      s += `<circle cx="${x.toFixed(1)}" cy="${(baseY - ht - bw * 0.1).toFixed(1)}" r="${(bw * 0.28).toFixed(1)}" fill="#e8628f"/>`;
      s += `<circle cx="${x.toFixed(1)}" cy="${(baseY - ht - bw * 0.1).toFixed(1)}" r="${(bw * 0.12).toFixed(1)}" fill="#f6d98f"/>`;
    }
  });
  return s;
};

S["mushrooms"] = (w, h, rng) => {
  const bg = radial([["0", "#4c6b4a"], ["1", "#22331f"]]);
  let s = `<defs>${bg.def}</defs><rect width="${w}" height="${h}" fill="url(#${bg.gid})"/>`;
  s += `<path d="${hillPath(w, h, h * 0.72, h * 0.04, rng)}" fill="#4a3a2a"/>`;
  const caps = [[w * 0.34, h * 0.8, 1.4], [w * 0.56, h * 0.86, 1], [w * 0.68, h * 0.78, 0.7], [w * 0.2, h * 0.88, 0.6]];
  caps.forEach(([x, baseY, sc]) => {
    const R = Math.min(w, h) * 0.11 * sc;
    s += `<rect x="${(x - R * 0.24).toFixed(1)}" y="${(baseY - R * 1.15).toFixed(1)}" width="${(R * 0.48).toFixed(1)}" height="${(R * 1.2).toFixed(1)}" rx="${(R * 0.2).toFixed(1)}" fill="#efe2ce"/>`;
    s += `<path d="M ${(x - R).toFixed(1)} ${(baseY - R * 1.05).toFixed(1)} A ${R.toFixed(1)} ${(R * 0.9).toFixed(1)} 0 0 1 ${(x + R).toFixed(1)} ${(baseY - R * 1.05).toFixed(1)} Z" fill="#c9432f"/>`;
    for (let k = 0; k < 6; k++) {
      s += `<circle cx="${(x + rng.range(-R * 0.7, R * 0.7)).toFixed(1)}" cy="${(baseY - R * rng.range(1.1, 1.6)).toFixed(1)}" r="${(R * rng.range(0.08, 0.16)).toFixed(1)}" fill="#f6efe2"/>`;
    }
  });
  for (let i = 0; i < 26; i++) {
    const x = rng.range(0, w), y = rng.range(h * 0.68, h);
    s += `<path d="M ${x.toFixed(1)} ${y.toFixed(1)} Q ${(x + rng.range(-14, 14)).toFixed(1)} ${(y - 22).toFixed(1)} ${(x + rng.range(-6, 6)).toFixed(1)} ${(y - 40).toFixed(1)}" stroke="#5f7f4a" stroke-width="2.4" fill="none" opacity="0.7"/>`;
  }
  return s;
};

S["succulents"] = (w, h, rng) => {
  let s = `<rect width="${w}" height="${h}" fill="#c8bda8"/>`;
  const cols = ["#7fa06b", "#5f8f7a", "#95ab6e", "#6b8f92", "#a8b276"];
  const spots = [];
  for (let i = 0; i < 11; i++) {
    let x, y, r, ok = false, tries = 0;
    while (!ok && tries++ < 200) {
      r = Math.min(w, h) * rng.range(0.1, 0.2);
      x = rng.range(r, w - r); y = rng.range(r, h - r);
      ok = spots.every(([sx, sy, sr]) => Math.hypot(sx - x, sy - y) > sr + r * 0.85);
    }
    if (!ok) continue;
    spots.push([x, y, r]);
    const c = rng.pick(cols);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 1.06).toFixed(1)}" fill="#a89880"/>`;
    for (let ring = 3; ring >= 0; ring--) {
      const rr = r * (0.3 + ring * 0.23);
      const n = 5 + ring * 3;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + ring * 0.4;
        const px = x + Math.cos(a) * rr * 0.62, py = y + Math.sin(a) * rr * 0.62;
        s += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${(rr * 0.46).toFixed(1)}" ry="${(rr * 0.24).toFixed(1)}" fill="${shade(tint(c, ring * 0.12), (3 - ring) * 0.06)}" transform="rotate(${(a * 180 / Math.PI).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)})"/>`;
      }
    }
  }
  return s;
};

S["autumn-leaf"] = (w, h) => {
  const bg = radial([["0", "#efe3cb"], ["1", "#b8a184"]]);
  let s = `<defs>${bg.def}</defs><rect width="${w}" height="${h}" fill="url(#${bg.gid})"/>`;
  const cx = w * 0.5, cy = h * 0.46, R = Math.min(w, h) * 0.34;
  s += `<line x1="${cx}" y1="${(cy + R * 0.5).toFixed(1)}" x2="${cx}" y2="${(cy + R * 1.25).toFixed(1)}" stroke="#8a5a2f" stroke-width="${(R * 0.06).toFixed(1)}" stroke-linecap="round"/>`;
  const lobes = 5;
  let d = `M ${cx} ${(cy + R * 0.55).toFixed(1)}`;
  for (let i = 0; i < lobes * 2; i++) {
    const a = -Math.PI / 2 + (i - lobes + 0.5) * (Math.PI * 0.92 / lobes);
    const rr = i % 2 === 0 ? R : R * 0.52;
    d += ` L ${(cx + Math.cos(a) * rr * 1.05).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }
  d += " Z";
  const grad = linear([["0", "#e8a02f"], ["0.5", "#d2622c"], ["1", "#a83a24"]]);
  s += `<defs>${grad.def}</defs><path d="${d}" fill="url(#${grad.gid})"/>`;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * (Math.PI * 0.85 / 5);
    s += `<line x1="${cx}" y1="${(cy + R * 0.5).toFixed(1)}" x2="${(cx + Math.cos(a) * R * 0.82).toFixed(1)}" y2="${(cy + Math.sin(a) * R * 0.82).toFixed(1)}" stroke="#8a3a1e" stroke-width="${(R * 0.022).toFixed(1)}" opacity="0.55"/>`;
  }
  return s;
};

S["dandelion"] = (w, h, rng) => {
  // Backlit against a dark field, so the seed head reads as light rather than disappearing.
  const bg = linear([["0", "#1d3326"], ["0.55", "#2f4a30"], ["1", "#16241a"]]);
  let s = `<defs>${bg.def}</defs><rect width="${w}" height="${h}" fill="url(#${bg.gid})"/>`;
  const sun = radial([["0", "#f6d98f", 0.5], ["1", "#f6d98f", 0]]);
  s += `<defs>${sun.def}</defs><circle cx="${w * 0.72}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.55}" fill="url(#${sun.gid})"/>`;
  for (let i = 0; i < 40; i++) {
    const gx = rng.range(0, w);
    s += `<path d="M ${gx.toFixed(1)} ${h} q ${rng.range(-30, 30).toFixed(1)} ${(-h * 0.2).toFixed(1)} ${rng.range(-50, 50).toFixed(1)} ${(-h * rng.range(0.2, 0.45)).toFixed(1)}" stroke="#2c4429" stroke-width="${rng.range(2, 5).toFixed(1)}" fill="none" opacity="0.8"/>`;
  }
  const cx = w * 0.4, cy = h * 0.4, R = Math.min(w, h) * 0.24;
  s += `<path d="M ${cx} ${cy} Q ${(cx - R * 0.5).toFixed(1)} ${(cy + R * 2).toFixed(1)} ${(cx - R * 0.25).toFixed(1)} ${h}" stroke="#6f8f48" stroke-width="${(R * 0.075).toFixed(1)}" fill="none"/>`;
  const glow = radial([["0", "#ffffff", 0.28], ["1", "#ffffff", 0]]);
  s += `<defs>${glow.def}</defs><circle cx="${cx}" cy="${cy}" r="${(R * 1.5).toFixed(1)}" fill="url(#${glow.gid})"/>`;
  for (let i = 0; i < 190; i++) {
    const a = rng.range(0, Math.PI * 2), d = R * (0.4 + Math.sqrt(rng.f()) * 0.6);
    const ex = cx + Math.cos(a) * d, ey = cy + Math.sin(a) * d;
    s += `<line x1="${(cx + Math.cos(a) * R * 0.14).toFixed(1)}" y1="${(cy + Math.sin(a) * R * 0.14).toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="#f2f6ea" stroke-width="1" opacity="0.55"/>`;
    // each seed ends in a little parachute, not a dot
    for (let k = 0; k < 3; k++) {
      const pa = a + (k - 1) * 0.34;
      s += `<line x1="${ex.toFixed(1)}" y1="${ey.toFixed(1)}" x2="${(ex + Math.cos(pa) * 7).toFixed(1)}" y2="${(ey + Math.sin(pa) * 7).toFixed(1)}" stroke="#fdfdf6" stroke-width="0.9" opacity="0.85"/>`;
    }
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${(R * 0.12).toFixed(1)}" fill="#c9b271"/>`;
  for (let i = 0; i < 14; i++) {
    const fx = cx + rng.range(R * 1.3, w * 0.55), fy = cy + rng.range(-R * 1.5, R * 0.9);
    s += `<g opacity="${rng.range(0.6, 1).toFixed(2)}">`;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      s += `<line x1="${fx.toFixed(1)}" y1="${fy.toFixed(1)}" x2="${(fx + Math.cos(a) * 10).toFixed(1)}" y2="${(fy + Math.sin(a) * 10).toFixed(1)}" stroke="#fdfdf6" stroke-width="1.1"/>`;
    }
    s += `<line x1="${fx.toFixed(1)}" y1="${fy.toFixed(1)}" x2="${(fx + 3).toFixed(1)}" y2="${(fy + 16).toFixed(1)}" stroke="#e8e4d0" stroke-width="1"/>`;
    s += `</g>`;
  }
  return s;
};

S["coffee-cup"] = (w, h, rng) => {
  let s = `<rect width="${w}" height="${h}" fill="#3f342c"/>`;
  for (let i = 0; i < 60; i++) {
    s += `<rect x="${rng.range(0, w).toFixed(1)}" y="${rng.range(0, h).toFixed(1)}" width="${rng.range(30, 180).toFixed(1)}" height="${rng.range(2, 6).toFixed(1)}" fill="#4d4038" opacity="${rng.range(0.2, 0.6).toFixed(2)}"/>`;
  }
  const cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.3;
  s += `<ellipse cx="${(cx + R * 0.16).toFixed(1)}" cy="${(cy + R * 0.16).toFixed(1)}" rx="${(R * 1.12).toFixed(1)}" ry="${(R * 1.08).toFixed(1)}" fill="#000" opacity="0.28"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${(R * 1.1).toFixed(1)}" fill="#f0ece2"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${(R * 0.86).toFixed(1)}" fill="#e6e0d2"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${(R * 0.72).toFixed(1)}" fill="#f6f2e8"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${(R * 0.62).toFixed(1)}" fill="#5c3a24"/>`;
  const foam = radial([["0", "#d8bd97", 1], ["0.75", "#c2a179", 1], ["1", "#8a5f3c", 1]]);
  s += `<defs>${foam.def}</defs><circle cx="${cx}" cy="${cy}" r="${(R * 0.58).toFixed(1)}" fill="url(#${foam.gid})"/>`;
  // rosetta
  s += `<path d="M ${cx} ${(cy - R * 0.44).toFixed(1)} Q ${(cx + R * 0.1).toFixed(1)} ${cy} ${cx} ${(cy + R * 0.46).toFixed(1)} Q ${(cx - R * 0.1).toFixed(1)} ${cy} ${cx} ${(cy - R * 0.44).toFixed(1)} Z" fill="#f6efe2" opacity="0.92"/>`;
  for (let i = 0; i < 5; i++) {
    const yy = cy - R * 0.3 + i * R * 0.16;
    const ww = R * (0.36 - i * 0.045);
    s += `<path d="M ${(cx - ww).toFixed(1)} ${yy.toFixed(1)} Q ${cx} ${(yy - R * 0.11).toFixed(1)} ${(cx + ww).toFixed(1)} ${yy.toFixed(1)} Q ${cx} ${(yy + R * 0.05).toFixed(1)} ${(cx - ww).toFixed(1)} ${yy.toFixed(1)} Z" fill="#f6efe2" opacity="0.9"/>`;
  }
  return s;
};

S["bookshelf"] = (w, h, rng) => {
  let s = `<rect width="${w}" height="${h}" fill="#6b4f39"/>`;
  const cols = ["#8f3f3a", "#3f5f7a", "#7a6f3f", "#5a3f6b", "#2f6b5a", "#b0824a", "#40485c", "#8a4f6b"];
  const shelves = 4;
  for (let r = 0; r < shelves; r++) {
    const top = h * (0.04 + r * 0.24);
    const bot = top + h * 0.2;
    s += `<rect y="${bot.toFixed(1)}" width="${w}" height="${(h * 0.026).toFixed(1)}" fill="#8a6748"/>`;
    s += `<rect y="${bot.toFixed(1)}" width="${w}" height="${(h * 0.008).toFixed(1)}" fill="#a5825f"/>`;
    let x = w * 0.02;
    while (x < w * 0.97) {
      const bw = rng.range(w * 0.018, w * 0.045);
      const bh = (bot - top) * rng.range(0.72, 1);
      const c = rng.pick(cols);
      const lean = rng.f() < 0.08;
      s += `<g transform="rotate(${lean ? 7 : 0} ${(x + bw / 2).toFixed(1)} ${bot.toFixed(1)})">
        <rect x="${x.toFixed(1)}" y="${(bot - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${c}"/>
        <rect x="${x.toFixed(1)}" y="${(bot - bh + bh * 0.12).toFixed(1)}" width="${bw.toFixed(1)}" height="${(bh * 0.035).toFixed(1)}" fill="${tint(c, 0.55)}" opacity="0.8"/>
        <rect x="${x.toFixed(1)}" y="${(bot - bh + bh * 0.82).toFixed(1)}" width="${bw.toFixed(1)}" height="${(bh * 0.03).toFixed(1)}" fill="${tint(c, 0.5)}" opacity="0.6"/>
        <rect x="${(x + bw * 0.3).toFixed(1)}" y="${(bot - bh + bh * 0.3).toFixed(1)}" width="${(bw * 0.4).toFixed(1)}" height="${(bh * 0.24).toFixed(1)}" fill="${tint(c, 0.4)}" opacity="0.45"/>
      </g>`;
      x += bw + rng.range(0.5, 3);
    }
  }
  const vg = linear([["0", "#fff2d0", 0.14], ["1", "#000", 0.22]]);
  s += `<defs>${vg.def}</defs><rect width="${w}" height="${h}" fill="url(#${vg.gid})"/>`;
  return s;
};

S["windowsill-plant"] = (w, h, rng) => {
  let s = `<rect width="${w}" height="${h}" fill="#3a3833"/>`;
  const view = linear([["0", "#bcd8e8"], ["0.6", "#dbe6d8"], ["1", "#c2cfae"]]);
  s += `<defs>${view.def}</defs><rect x="${w * 0.1}" y="${h * 0.06}" width="${w * 0.8}" height="${h * 0.66}" fill="url(#${view.gid})"/>`;
  for (let i = 0; i < 4; i++) {
    s += `<circle cx="${rng.range(w * 0.15, w * 0.85).toFixed(1)}" cy="${rng.range(h * 0.12, h * 0.5).toFixed(1)}" r="${rng.range(14, 40).toFixed(1)}" fill="#9fb98f" opacity="0.5"/>`;
  }
  s += `<rect x="${w * 0.1}" y="${h * 0.06}" width="${w * 0.8}" height="${h * 0.66}" fill="none" stroke="#f0ece2" stroke-width="${(w * 0.022).toFixed(1)}"/>`;
  s += `<rect x="${(w * 0.5 - w * 0.008).toFixed(1)}" y="${h * 0.06}" width="${(w * 0.016).toFixed(1)}" height="${h * 0.66}" fill="#f0ece2"/>`;
  s += `<rect x="${w * 0.1}" y="${(h * 0.06 + h * 0.31).toFixed(1)}" width="${w * 0.8}" height="${(w * 0.016).toFixed(1)}" fill="#f0ece2"/>`;
  s += `<rect x="${w * 0.05}" y="${h * 0.72}" width="${w * 0.9}" height="${h * 0.06}" rx="4" fill="#e8e2d4"/>`;
  const px = w * 0.32, py = h * 0.72;
  s += `<path d="M ${(px - w * 0.06).toFixed(1)} ${(py - h * 0.14).toFixed(1)} L ${(px + w * 0.06).toFixed(1)} ${(py - h * 0.14).toFixed(1)} L ${(px + w * 0.045).toFixed(1)} ${py.toFixed(1)} L ${(px - w * 0.045).toFixed(1)} ${py.toFixed(1)} Z" fill="#c47b52"/>`;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + rng.range(-1.15, 1.15);
    const L = h * rng.range(0.14, 0.3);
    const ex = px + Math.cos(a) * L, ey = py - h * 0.13 + Math.sin(a) * L;
    s += `<path d="M ${px.toFixed(1)} ${(py - h * 0.13).toFixed(1)} Q ${((px + ex) / 2 + rng.range(-16, 16)).toFixed(1)} ${((py - h * 0.13 + ey) / 2).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="#4f7f47" stroke-width="2.5" fill="none"/>`;
    s += `<ellipse cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" rx="${(L * 0.2).toFixed(1)}" ry="${(L * 0.11).toFixed(1)}" fill="${rng.pick(["#5f9455", "#4a7f45", "#74a862"])}" transform="rotate(${(a * 180 / Math.PI + 90).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)})"/>`;
  }
  const light = linear([["0", "#fff6d8", 0.34], ["1", "#fff6d8", 0]], { x1: 0, y1: 0, x2: 0.6, y2: 1 });
  s += `<defs>${light.def}</defs><rect width="${w}" height="${h}" fill="url(#${light.gid})"/>`;
  return s;
};

S["breakfast-table"] = (w, h, rng) => {
  let s = `<rect width="${w}" height="${h}" fill="#b08a63"/>`;
  for (let i = 0; i < 40; i++) {
    s += `<rect y="${rng.range(0, h).toFixed(1)}" width="${w}" height="${rng.range(1, 4).toFixed(1)}" fill="#9c774f" opacity="${rng.range(0.2, 0.5).toFixed(2)}"/>`;
  }
  const cx = w * 0.42, cy = h * 0.52, R = Math.min(w, h) * 0.3;
  s += `<ellipse cx="${(cx + 10).toFixed(1)}" cy="${(cy + 12).toFixed(1)}" rx="${(R * 1.05).toFixed(1)}" ry="${(R * 1.02).toFixed(1)}" fill="#000" opacity="0.2"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R.toFixed(1)}" fill="#f4f0e6"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${(R * 0.78).toFixed(1)}" fill="#faf7ef"/>`;
  s += `<ellipse cx="${(cx - R * 0.24).toFixed(1)}" cy="${(cy - R * 0.1).toFixed(1)}" rx="${(R * 0.34).toFixed(1)}" ry="${(R * 0.3).toFixed(1)}" fill="#f6e6b8"/>`;
  s += `<circle cx="${(cx - R * 0.24).toFixed(1)}" cy="${(cy - R * 0.1).toFixed(1)}" r="${(R * 0.15).toFixed(1)}" fill="#f0b23f"/>`;
  for (let i = 0; i < 3; i++) {
    s += `<rect x="${(cx + R * 0.1 + i * R * 0.16).toFixed(1)}" y="${(cy + R * 0.02).toFixed(1)}" width="${(R * 0.32).toFixed(1)}" height="${(R * 0.42).toFixed(1)}" rx="${(R * 0.05).toFixed(1)}" fill="#d9a468" transform="rotate(${(i * 9 - 9)} ${cx} ${cy})"/>`;
  }
  s += `<circle cx="${w * 0.79}" cy="${h * 0.36}" r="${(R * 0.42).toFixed(1)}" fill="#f0ece2"/>`;
  s += `<circle cx="${w * 0.79}" cy="${h * 0.36}" r="${(R * 0.3).toFixed(1)}" fill="#6b4526"/>`;
  s += `<path d="M ${(w * 0.79 + R * 0.4).toFixed(1)} ${(h * 0.36 - R * 0.08).toFixed(1)} a ${(R * 0.16).toFixed(1)} ${(R * 0.16).toFixed(1)} 0 1 1 0 ${(R * 0.24).toFixed(1)}" stroke="#f0ece2" stroke-width="${(R * 0.09).toFixed(1)}" fill="none"/>`;
  s += `<rect x="${w * 0.76}" y="${h * 0.72}" width="${(R * 0.1).toFixed(1)}" height="${(R * 0.9).toFixed(1)}" rx="3" fill="#c8c2b4" transform="rotate(14 ${w * 0.76} ${h * 0.72})"/>`;
  return s;
};

S["teapot"] = (w, h, rng) => {
  const bg = linear([["0", "#dcd0bc"], ["1", "#9c8a74"]]);
  let s = `<defs>${bg.def}</defs><rect width="${w}" height="${h}" fill="url(#${bg.gid})"/>`;
  s += `<rect y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="#7f6c58"/>`;
  const cx = w * 0.46, by = h * 0.74, R = Math.min(w, h) * 0.24;
  s += `<ellipse cx="${cx}" cy="${(by + 6).toFixed(1)}" rx="${(R * 1.15).toFixed(1)}" ry="${(R * 0.14).toFixed(1)}" fill="#000" opacity="0.25"/>`;
  s += `<path d="M ${(cx + R * 0.9).toFixed(1)} ${(by - R * 0.9).toFixed(1)} q ${(R * 0.7).toFixed(1)} ${(R * 0.1).toFixed(1)} ${(R * 0.5).toFixed(1)} ${(R * 0.8).toFixed(1)}" stroke="#3f5f6b" stroke-width="${(R * 0.14).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M ${(cx - R * 0.85).toFixed(1)} ${(by - R * 1.05).toFixed(1)} L ${(cx - R * 1.5).toFixed(1)} ${(by - R * 0.75).toFixed(1)} L ${(cx - R * 1.42).toFixed(1)} ${(by - R * 0.5).toFixed(1)} L ${(cx - R * 0.8).toFixed(1)} ${(by - R * 0.6).toFixed(1)} Z" fill="#3f5f6b"/>`;
  s += `<ellipse cx="${cx}" cy="${(by - R * 0.75).toFixed(1)}" rx="${R.toFixed(1)}" ry="${(R * 0.82).toFixed(1)}" fill="#4f7382"/>`;
  s += `<ellipse cx="${(cx - R * 0.3).toFixed(1)}" cy="${(by - R * 0.95).toFixed(1)}" rx="${(R * 0.4).toFixed(1)}" ry="${(R * 0.3).toFixed(1)}" fill="#7fa2ac" opacity="0.5"/>`;
  s += `<ellipse cx="${cx}" cy="${(by - R * 1.5).toFixed(1)}" rx="${(R * 0.36).toFixed(1)}" ry="${(R * 0.1).toFixed(1)}" fill="#3f5f6b"/>`;
  s += `<circle cx="${cx}" cy="${(by - R * 1.66).toFixed(1)}" r="${(R * 0.12).toFixed(1)}" fill="#e0c07a"/>`;
  for (let i = 0; i < 3; i++) {
    const sx = cx + R * 1.4 + i * 4;
    s += `<path d="M ${sx.toFixed(1)} ${(by - R * 0.4).toFixed(1)} q ${rng.range(-16, 16).toFixed(1)} ${(-R * 0.5).toFixed(1)} 0 ${(-R * 1).toFixed(1)}" stroke="#fff" stroke-width="3" fill="none" opacity="0.24"/>`;
  }
  s += `<circle cx="${w * 0.78}" cy="${(by - R * 0.16).toFixed(1)}" r="${(R * 0.3).toFixed(1)}" fill="#e6ded0"/>`;
  s += `<circle cx="${w * 0.78}" cy="${(by - R * 0.16).toFixed(1)}" r="${(R * 0.22).toFixed(1)}" fill="#b98a52"/>`;
  return s;
};

S["candle"] = (w, h, rng) => {
  let s = `<rect width="${w}" height="${h}" fill="#141019"/>`;
  const cx = w * 0.5, by = h * 0.86;
  const glow = radial([["0", "#ffd98a", 0.6], ["0.4", "#e08a3f", 0.24], ["1", "#e08a3f", 0]]);
  s += `<defs>${glow.def}</defs><circle cx="${cx}" cy="${h * 0.46}" r="${Math.min(w, h) * 0.6}" fill="url(#${glow.gid})"/>`;
  s += `<rect x="${(cx - w * 0.07).toFixed(1)}" y="${(by - h * 0.34).toFixed(1)}" width="${(w * 0.14).toFixed(1)}" height="${(h * 0.34).toFixed(1)}" rx="${(w * 0.012).toFixed(1)}" fill="#e8dcc2"/>`;
  s += `<rect x="${(cx - w * 0.07).toFixed(1)}" y="${(by - h * 0.34).toFixed(1)}" width="${(w * 0.05).toFixed(1)}" height="${(h * 0.34).toFixed(1)}" fill="#f6eeda" opacity="0.7"/>`;
  s += `<ellipse cx="${cx}" cy="${(by - h * 0.34).toFixed(1)}" rx="${(w * 0.07).toFixed(1)}" ry="${(w * 0.02).toFixed(1)}" fill="#d0c2a4"/>`;
  s += `<path d="M ${(cx - w * 0.03).toFixed(1)} ${(by - h * 0.345).toFixed(1)} q ${(w * 0.03).toFixed(1)} ${(h * 0.012).toFixed(1)} ${(w * 0.06).toFixed(1)} 0 q ${(-w * 0.02).toFixed(1)} ${(h * 0.03).toFixed(1)} ${(-w * 0.06).toFixed(1)} 0 Z" fill="#f2e6cc"/>`;
  s += `<line x1="${cx}" y1="${(by - h * 0.35).toFixed(1)}" x2="${cx}" y2="${(by - h * 0.39).toFixed(1)}" stroke="#2c2620" stroke-width="2.5"/>`;
  const fh = h * 0.11;
  s += `<path d="M ${cx} ${(by - h * 0.39 - fh).toFixed(1)} Q ${(cx + w * 0.032).toFixed(1)} ${(by - h * 0.39 - fh * 0.32).toFixed(1)} ${cx} ${(by - h * 0.385).toFixed(1)} Q ${(cx - w * 0.032).toFixed(1)} ${(by - h * 0.39 - fh * 0.32).toFixed(1)} ${cx} ${(by - h * 0.39 - fh).toFixed(1)} Z" fill="#f6b93f"/>`;
  s += `<path d="M ${cx} ${(by - h * 0.39 - fh * 0.62).toFixed(1)} Q ${(cx + w * 0.016).toFixed(1)} ${(by - h * 0.39 - fh * 0.24).toFixed(1)} ${cx} ${(by - h * 0.387).toFixed(1)} Q ${(cx - w * 0.016).toFixed(1)} ${(by - h * 0.39 - fh * 0.24).toFixed(1)} ${cx} ${(by - h * 0.39 - fh * 0.62).toFixed(1)} Z" fill="#fff1c0"/>`;
  s += `<ellipse cx="${cx}" cy="${by.toFixed(1)}" rx="${(w * 0.2).toFixed(1)}" ry="${(h * 0.02).toFixed(1)}" fill="#ffb35f" opacity="0.2"/>`;
  for (let i = 0; i < 26; i++) {
    s += `<circle cx="${rng.range(0, w).toFixed(1)}" cy="${rng.range(0, h * 0.8).toFixed(1)}" r="${rng.range(0.8, 2.2).toFixed(1)}" fill="#ffd98a" opacity="${rng.range(0.05, 0.22).toFixed(2)}"/>`;
  }
  return s;
};

S["fruit-bowl"] = (w, h, rng) => {
  const bg = linear([["0", "#2f3a3f"], ["1", "#1c2428"]]);
  let s = `<defs>${bg.def}</defs><rect width="${w}" height="${h}" fill="url(#${bg.gid})"/>`;
  s += `<rect y="${h * 0.66}" width="${w}" height="${h * 0.34}" fill="#6b5540"/>`;
  for (let i = 0; i < 22; i++) {
    s += `<rect y="${rng.range(h * 0.66, h).toFixed(1)}" width="${w}" height="${rng.range(1, 4).toFixed(1)}" fill="#5b4733" opacity="${rng.range(0.3, 0.6).toFixed(2)}"/>`;
  }
  const lamp = radial([["0", "#ffe9b8", 0.4], ["1", "#ffe9b8", 0]]);
  s += `<defs>${lamp.def}</defs><ellipse cx="${w * 0.46}" cy="${h * 0.5}" rx="${w * 0.42}" ry="${h * 0.42}" fill="url(#${lamp.gid})"/>`;
  const cx = w * 0.47, rim = h * 0.7, R = Math.min(w, h) * 0.34;
  s += `<ellipse cx="${cx}" cy="${(rim + R * 0.66).toFixed(1)}" rx="${(R * 1.16).toFixed(1)}" ry="${(R * 0.12).toFixed(1)}" fill="#000" opacity="0.4"/>`;
  const fruits = [
    { x: -0.66, y: -0.16, r: 0.28, c: "#c9432c", kind: "apple" },
    { x: -0.22, y: -0.3,  r: 0.3,  c: "#e08a2c", kind: "orange" },
    { x:  0.28, y: -0.18, r: 0.27, c: "#b8c93a", kind: "apple" },
    { x:  0.72, y: -0.1,  r: 0.24, c: "#d94a35", kind: "apple" },
    { x: -0.44, y: -0.62, r: 0.26, c: "#e8b02c", kind: "orange" },
    { x:  0.1,  y: -0.72, r: 0.28, c: "#8f4f8f", kind: "plum" },
    { x:  0.52, y: -0.58, r: 0.22, c: "#e0782c", kind: "orange" },
  ];
  fruits.forEach(({ x, y, r, c, kind }) => {
    const fx = cx + R * x, fy = rim + R * y, fr = R * r;
    s += `<ellipse cx="${(fx + fr * 0.1).toFixed(1)}" cy="${(fy + fr * 0.16).toFixed(1)}" rx="${fr.toFixed(1)}" ry="${(fr * 0.96).toFixed(1)}" fill="${shade(c, 0.42)}"/>`;
    s += `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="${fr.toFixed(1)}" fill="${c}"/>`;
    s += `<path d="M ${(fx - fr).toFixed(1)} ${fy.toFixed(1)} a ${fr.toFixed(1)} ${fr.toFixed(1)} 0 0 0 ${(fr * 2).toFixed(1)} 0 a ${fr.toFixed(1)} ${(fr * 0.7).toFixed(1)} 0 0 1 ${(-fr * 2).toFixed(1)} 0 Z" fill="${shade(c, 0.3)}" opacity="0.55"/>`;
    s += `<ellipse cx="${(fx - fr * 0.34).toFixed(1)}" cy="${(fy - fr * 0.4).toFixed(1)}" rx="${(fr * 0.34).toFixed(1)}" ry="${(fr * 0.22).toFixed(1)}" fill="#fff" opacity="0.4" transform="rotate(-28 ${(fx - fr * 0.34).toFixed(1)} ${(fy - fr * 0.4).toFixed(1)})"/>`;
    if (kind === "apple") {
      s += `<path d="M ${fx.toFixed(1)} ${(fy - fr * 0.94).toFixed(1)} q ${(fr * 0.12).toFixed(1)} ${(-fr * 0.3).toFixed(1)} ${(fr * 0.3).toFixed(1)} ${(-fr * 0.34).toFixed(1)}" stroke="#6b4a28" stroke-width="${(fr * 0.11).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
      s += `<ellipse cx="${(fx + fr * 0.44).toFixed(1)}" cy="${(fy - fr * 1.16).toFixed(1)}" rx="${(fr * 0.26).toFixed(1)}" ry="${(fr * 0.12).toFixed(1)}" fill="#5f8f45" transform="rotate(-20 ${(fx + fr * 0.44).toFixed(1)} ${(fy - fr * 1.16).toFixed(1)})"/>`;
    }
    if (kind === "orange") {
      s += `<circle cx="${fx.toFixed(1)}" cy="${(fy - fr * 0.9).toFixed(1)}" r="${(fr * 0.1).toFixed(1)}" fill="${shade(c, 0.5)}"/>`;
    }
  });
  // bowl in front, so the fruit sits inside it
  s += `<path d="M ${(cx - R * 1.06).toFixed(1)} ${rim.toFixed(1)} A ${(R * 1.06).toFixed(1)} ${(R * 0.78).toFixed(1)} 0 0 0 ${(cx + R * 1.06).toFixed(1)} ${rim.toFixed(1)} Z" fill="#3f6b78"/>`;
  s += `<path d="M ${(cx - R * 1.06).toFixed(1)} ${rim.toFixed(1)} A ${(R * 1.06).toFixed(1)} ${(R * 0.62).toFixed(1)} 0 0 0 ${(cx + R * 1.06).toFixed(1)} ${rim.toFixed(1)} Z" fill="#5f8f9c" opacity="0.5"/>`;
  s += `<ellipse cx="${cx}" cy="${rim.toFixed(1)}" rx="${(R * 1.06).toFixed(1)}" ry="${(R * 0.17).toFixed(1)}" fill="none" stroke="#8fb4bd" stroke-width="${(R * 0.05).toFixed(1)}"/>`;
  return s;
};

S["desk"] = (w, h, rng) => {
  let s = `<rect width="${w}" height="${h}" fill="#8f7250"/>`;
  for (let i = 0; i < 44; i++) {
    s += `<rect y="${rng.range(0, h).toFixed(1)}" width="${w}" height="${rng.range(1, 5).toFixed(1)}" fill="#7d6242" opacity="${rng.range(0.2, 0.55).toFixed(2)}"/>`;
  }
  s += `<g transform="rotate(-5 ${w * 0.36} ${h * 0.5})">
    <rect x="${w * 0.16}" y="${h * 0.2}" width="${w * 0.4}" height="${h * 0.6}" rx="6" fill="#000" opacity="0.2"/>
    <rect x="${w * 0.15}" y="${h * 0.19}" width="${w * 0.4}" height="${h * 0.6}" rx="6" fill="#f6f2e6"/>
    <rect x="${w * 0.15}" y="${h * 0.19}" width="${w * 0.035}" height="${h * 0.6}" rx="6" fill="#c9563f"/>`;
  for (let i = 0; i < 11; i++) {
    s += `<rect x="${(w * 0.21).toFixed(1)}" y="${(h * 0.26 + i * h * 0.048).toFixed(1)}" width="${(w * 0.3 * (i % 4 === 3 ? 0.55 : 1)).toFixed(1)}" height="2.6" rx="1.3" fill="#b0aa9c"/>`;
  }
  s += `</g>`;
  s += `<g transform="rotate(28 ${w * 0.62} ${h * 0.56})">
    <rect x="${w * 0.6}" y="${h * 0.3}" width="${w * 0.022}" height="${h * 0.44}" rx="4" fill="#e0a83f"/>
    <polygon points="${(w * 0.6).toFixed(1)},${(h * 0.3).toFixed(1)} ${(w * 0.622).toFixed(1)},${(h * 0.3).toFixed(1)} ${(w * 0.611).toFixed(1)},${(h * 0.25).toFixed(1)}" fill="#e8dcc2"/>
    <rect x="${w * 0.6}" y="${h * 0.7}" width="${w * 0.022}" height="${h * 0.04}" fill="#4f4a42"/>
  </g>`;
  s += `<circle cx="${w * 0.83}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.11}" fill="#000" opacity="0.18"/>`;
  s += `<circle cx="${w * 0.82}" cy="${h * 0.29}" r="${Math.min(w, h) * 0.11}" fill="#e6e0d2"/>`;
  s += `<circle cx="${w * 0.82}" cy="${h * 0.29}" r="${Math.min(w, h) * 0.082}" fill="#5c3a24"/>`;
  s += `<path d="M ${(w * 0.82 + Math.min(w, h) * 0.13).toFixed(1)} ${(h * 0.26).toFixed(1)} a ${(Math.min(w, h) * 0.05).toFixed(1)} ${(Math.min(w, h) * 0.05).toFixed(1)} 0 1 1 0 ${(Math.min(w, h) * 0.07).toFixed(1)}" stroke="#e6e0d2" stroke-width="${(Math.min(w, h) * 0.028).toFixed(1)}" fill="none"/>`;
  s += `<circle cx="${w * 0.76}" cy="${h * 0.78}" r="${Math.min(w, h) * 0.055}" fill="#4f6b7a"/>`;
  s += `<circle cx="${w * 0.76}" cy="${h * 0.78}" r="${Math.min(w, h) * 0.02}" fill="#2f3f4a"/>`;
  return s;
};

S["bird-branch"] = (w, h, rng) => {
  const sky = linear([["0", "#e8c98d"], ["0.5", "#f2dcae"], ["1", "#d8b884"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  s += `<circle cx="${w * 0.24}" cy="${h * 0.26}" r="${w * 0.1}" fill="#fff0c4" opacity="0.55"/>`;
  s += `<path d="M 0 ${h * 0.78} Q ${w * 0.35} ${h * 0.66} ${w} ${h * 0.7}" stroke="#5a4028" stroke-width="${(h * 0.028).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < 5; i++) {
    const t = 0.2 + i * 0.16;
    const bx = w * t, by = h * (0.75 - t * 0.08);
    s += `<path d="M ${bx.toFixed(1)} ${by.toFixed(1)} q ${rng.range(-40, 40).toFixed(1)} ${(-h * 0.1).toFixed(1)} ${rng.range(-60, 60).toFixed(1)} ${(-h * 0.16).toFixed(1)}" stroke="#5a4028" stroke-width="${(h * 0.008).toFixed(1)}" fill="none"/>`;
  }
  for (let i = 0; i < 22; i++) {
    const bx = rng.range(w * 0.05, w * 0.98), by = rng.range(h * 0.5, h * 0.74);
    s += `<ellipse cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" rx="${rng.range(8, 18).toFixed(1)}" ry="${rng.range(4, 8).toFixed(1)}" fill="#5f7f3f" opacity="0.8" transform="rotate(${rng.range(-40, 40).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)})"/>`;
  }
  const bx = w * 0.56, by = h * 0.66, R = Math.min(w, h) * 0.11;
  s += `<ellipse cx="${bx}" cy="${by}" rx="${(R * 1.15).toFixed(1)}" ry="${(R * 0.82).toFixed(1)}" fill="#3f5f7a"/>`;
  s += `<circle cx="${(bx - R * 0.85).toFixed(1)}" cy="${(by - R * 0.5).toFixed(1)}" r="${(R * 0.56).toFixed(1)}" fill="#4f7089"/>`;
  s += `<polygon points="${(bx - R * 1.3).toFixed(1)},${(by - R * 0.52).toFixed(1)} ${(bx - R * 2).toFixed(1)},${(by - R * 0.36).toFixed(1)} ${(bx - R * 1.3).toFixed(1)},${(by - R * 0.2).toFixed(1)}" fill="#e0a03f"/>`;
  s += `<circle cx="${(bx - R * 0.95).toFixed(1)}" cy="${(by - R * 0.62).toFixed(1)}" r="${(R * 0.11).toFixed(1)}" fill="#181418"/>`;
  s += `<ellipse cx="${(bx + R * 0.16).toFixed(1)}" cy="${(by - R * 0.06).toFixed(1)}" rx="${(R * 0.68).toFixed(1)}" ry="${(R * 0.42).toFixed(1)}" fill="#2f4b62" transform="rotate(-12 ${(bx + R * 0.16).toFixed(1)} ${(by - R * 0.06).toFixed(1)})"/>`;
  s += `<polygon points="${(bx + R * 0.9).toFixed(1)},${(by - R * 0.1).toFixed(1)} ${(bx + R * 2.1).toFixed(1)},${(by - R * 0.5).toFixed(1)} ${(bx + R * 2).toFixed(1)},${(by + R * 0.06).toFixed(1)}" fill="#35536b"/>`;
  s += `<ellipse cx="${(bx - R * 0.3).toFixed(1)}" cy="${(by + R * 0.62).toFixed(1)}" rx="${(R * 0.5).toFixed(1)}" ry="${(R * 0.26).toFixed(1)}" fill="#e8d0a4"/>`;
  return s;
};

S["cat-sleeping"] = (w, h, rng) => {
  let s = `<rect width="${w}" height="${h}" fill="#c8bda8"/>`;
  for (let i = 0; i < 40; i++) {
    s += `<rect x="${rng.range(-40, w).toFixed(1)}" y="${rng.range(0, h).toFixed(1)}" width="${rng.range(60, 240).toFixed(1)}" height="${rng.range(3, 9).toFixed(1)}" rx="4" fill="#b8ab94" opacity="${rng.range(0.25, 0.6).toFixed(2)}"/>`;
  }
  const cx = w * 0.5, cy = h * 0.58, R = Math.min(w, h) * 0.28;
  s += `<ellipse cx="${cx}" cy="${(cy + R * 0.7).toFixed(1)}" rx="${(R * 1.4).toFixed(1)}" ry="${(R * 0.24).toFixed(1)}" fill="#000" opacity="0.18"/>`;
  const fur = "#d9843f";
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${(R * 1.25).toFixed(1)}" ry="${(R * 0.85).toFixed(1)}" fill="${fur}"/>`;
  s += `<path d="M ${(cx + R * 1.1).toFixed(1)} ${(cy + R * 0.2).toFixed(1)} q ${(R * 0.9).toFixed(1)} ${(R * 0.4).toFixed(1)} ${(R * 0.15).toFixed(1)} ${(R * 0.72).toFixed(1)} q ${(-R * 0.6).toFixed(1)} ${(R * 0.1).toFixed(1)} ${(-R * 0.75).toFixed(1)} ${(-R * 0.3).toFixed(1)} Z" fill="${shade(fur, 0.1)}"/>`;
  for (let i = 0; i < 7; i++) {
    s += `<ellipse cx="${(cx - R * 0.9 + i * R * 0.34).toFixed(1)}" cy="${(cy - R * 0.4 + (i % 2) * R * 0.2).toFixed(1)}" rx="${(R * 0.2).toFixed(1)}" ry="${(R * 0.42).toFixed(1)}" fill="${shade(fur, 0.22)}" opacity="0.55" transform="rotate(${(i * 7 - 20)} ${(cx - R * 0.9 + i * R * 0.34).toFixed(1)} ${cy})"/>`;
  }
  const hx = cx - R * 0.86, hy = cy - R * 0.5;
  s += `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${(R * 0.52).toFixed(1)}" fill="${tint(fur, 0.08)}"/>`;
  [[-1], [1]].forEach(([d]) => {
    s += `<polygon points="${(hx + d * R * 0.18).toFixed(1)},${(hy - R * 0.42).toFixed(1)} ${(hx + d * R * 0.5).toFixed(1)},${(hy - R * 0.82).toFixed(1)} ${(hx + d * R * 0.52).toFixed(1)},${(hy - R * 0.3).toFixed(1)}" fill="${fur}"/>`;
    s += `<polygon points="${(hx + d * R * 0.26).toFixed(1)},${(hy - R * 0.42).toFixed(1)} ${(hx + d * R * 0.44).toFixed(1)},${(hy - R * 0.68).toFixed(1)} ${(hx + d * R * 0.44).toFixed(1)},${(hy - R * 0.36).toFixed(1)}" fill="#e8a89a"/>`;
    s += `<path d="M ${(hx + d * R * 0.1).toFixed(1)} ${(hy - R * 0.02).toFixed(1)} q ${(d * R * 0.12).toFixed(1)} ${(R * 0.1).toFixed(1)} ${(d * R * 0.24).toFixed(1)} 0" stroke="#3f2a1c" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    for (let k = 0; k < 3; k++) {
      s += `<line x1="${(hx + d * R * 0.28).toFixed(1)}" y1="${(hy + R * 0.14).toFixed(1)}" x2="${(hx + d * R * 1.1).toFixed(1)}" y2="${(hy + R * (0.02 + k * 0.14)).toFixed(1)}" stroke="#f4ece0" stroke-width="1.6" opacity="0.85"/>`;
    }
  });
  s += `<polygon points="${hx.toFixed(1)},${(hy + R * 0.1).toFixed(1)} ${(hx - R * 0.09).toFixed(1)},${(hy + R * 0.02).toFixed(1)} ${(hx + R * 0.09).toFixed(1)},${(hy + R * 0.02).toFixed(1)}" fill="#d9707a"/>`;
  return s;
};

S["dog-field"] = (w, h, rng) => {
  const sky = linear([["0", "#7fb8e0"], ["0.65", "#cfe6f2"], ["1", "#e8e4c2"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h * 0.5}" fill="url(#${sky.gid})"/>
    ${cloudBlob(w * 0.7, h * 0.14, w * 0.34, h * 0.04, "#fff", 0.7, rng)}`;
  s += `<path d="${hillPath(w, h, h * 0.5, h * 0.05, rng)}" fill="#9cb862"/>`;
  s += `<path d="${hillPath(w, h, h * 0.62, h * 0.04, rng)}" fill="#84a552"/>`;
  const dx = w * 0.52, dy = h * 0.78, R = Math.min(w, h) * 0.16;
  s += `<ellipse cx="${dx}" cy="${(dy + R * 0.5).toFixed(1)}" rx="${(R * 1.1).toFixed(1)}" ry="${(R * 0.16).toFixed(1)}" fill="#000" opacity="0.18"/>`;
  const fur = "#c98f4f";
  s += `<ellipse cx="${dx}" cy="${dy.toFixed(1)}" rx="${(R * 0.92).toFixed(1)}" ry="${(R * 0.56).toFixed(1)}" fill="${fur}"/>`;
  [[-0.55], [0.4]].forEach(([o]) => {
    s += `<rect x="${(dx + R * o).toFixed(1)}" y="${(dy + R * 0.3).toFixed(1)}" width="${(R * 0.2).toFixed(1)}" height="${(R * 0.55).toFixed(1)}" rx="${(R * 0.1).toFixed(1)}" fill="${shade(fur, 0.1)}"/>`;
  });
  s += `<path d="M ${(dx + R * 0.86).toFixed(1)} ${(dy - R * 0.18).toFixed(1)} q ${(R * 0.6).toFixed(1)} ${(-R * 0.5).toFixed(1)} ${(R * 0.34).toFixed(1)} ${(-R * 0.9).toFixed(1)}" stroke="${fur}" stroke-width="${(R * 0.2).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
  const hx = dx - R * 0.9, hy = dy - R * 0.62;
  s += `<ellipse cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" rx="${(R * 0.46).toFixed(1)}" ry="${(R * 0.42).toFixed(1)}" fill="${tint(fur, 0.1)}"/>`;
  s += `<ellipse cx="${(hx - R * 0.34).toFixed(1)}" cy="${(hy + R * 0.16).toFixed(1)}" rx="${(R * 0.3).toFixed(1)}" ry="${(R * 0.2).toFixed(1)}" fill="${tint(fur, 0.22)}"/>`;
  s += `<circle cx="${(hx - R * 0.6).toFixed(1)}" cy="${(hy + R * 0.14).toFixed(1)}" r="${(R * 0.08).toFixed(1)}" fill="#2c1f16"/>`;
  s += `<circle cx="${(hx - R * 0.16).toFixed(1)}" cy="${(hy - R * 0.1).toFixed(1)}" r="${(R * 0.07).toFixed(1)}" fill="#2c1f16"/>`;
  s += `<ellipse cx="${(hx + R * 0.3).toFixed(1)}" cy="${(hy - R * 0.08).toFixed(1)}" rx="${(R * 0.16).toFixed(1)}" ry="${(R * 0.34).toFixed(1)}" fill="${shade(fur, 0.22)}" transform="rotate(16 ${(hx + R * 0.3).toFixed(1)} ${(hy - R * 0.08).toFixed(1)})"/>`;
  s += `<path d="M ${(hx - R * 0.34).toFixed(1)} ${(hy + R * 0.34).toFixed(1)} q ${(R * 0.12).toFixed(1)} ${(R * 0.24).toFixed(1)} ${(R * 0.24).toFixed(1)} 0" stroke="#d9707a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < 130; i++) {
    const gx = rng.range(0, w), gy = rng.range(h * 0.6, h);
    s += `<line x1="${gx.toFixed(1)}" y1="${gy.toFixed(1)}" x2="${(gx + rng.range(-5, 5)).toFixed(1)}" y2="${(gy - rng.range(8, 26)).toFixed(1)}" stroke="#6f9040" stroke-width="1.8" opacity="0.6"/>`;
  }
  return s;
};

S["fish"] = (w, h, rng) => {
  const water = linear([["0", "#1f5f6b"], ["0.5", "#2f7f88"], ["1", "#4f9fa0"]]);
  let s = `<defs>${water.def}</defs><rect width="${w}" height="${h}" fill="url(#${water.gid})"/>`;
  for (let i = 0; i < 30; i++) {
    s += `<path d="M ${rng.range(0, w).toFixed(1)} ${rng.range(0, h).toFixed(1)} q 40 ${rng.range(-10, 10).toFixed(1)} 80 0" stroke="#8fd0cc" stroke-width="2" fill="none" opacity="${rng.range(0.06, 0.2).toFixed(2)}"/>`;
  }
  for (let i = 0; i < 5; i++) {
    const px = rng.range(w * 0.05, w * 0.95), py = rng.range(h * 0.1, h * 0.9);
    s += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${rng.range(30, 70).toFixed(1)}" ry="${rng.range(20, 44).toFixed(1)}" fill="#2f7f5f" opacity="0.4"/>`;
  }
  const koi = [[w * 0.36, h * 0.44, 1.15, "#e8622f", 12], [w * 0.68, h * 0.66, 0.85, "#f0f0e6", -18], [w * 0.56, h * 0.24, 0.6, "#e8a83f", 26]];
  koi.forEach(([fx, fy, sc, c, rot]) => {
    const R = Math.min(w, h) * 0.14 * sc;
    s += `<g transform="rotate(${rot} ${fx} ${fy})">`;
    s += `<path d="M ${(fx - R * 1.1).toFixed(1)} ${fy} q ${(R * 0.5).toFixed(1)} ${(-R * 0.62).toFixed(1)} ${(R * 1.5).toFixed(1)} 0 q ${(-R).toFixed(1)} ${(R * 0.62).toFixed(1)} ${(-R * 1.5).toFixed(1)} 0 Z" fill="${c}"/>`;
    s += `<path d="M ${(fx - R * 1.05).toFixed(1)} ${fy} q ${(-R * 0.55).toFixed(1)} ${(-R * 0.44).toFixed(1)} ${(-R * 0.75).toFixed(1)} ${(-R * 0.06).toFixed(1)} q ${(R * 0.2).toFixed(1)} ${(R * 0.24).toFixed(1)} ${(-R * 0.02).toFixed(1)} ${(R * 0.52).toFixed(1)} Z" fill="${c}" opacity="0.85"/>`;
    s += `<ellipse cx="${(fx - R * 0.1).toFixed(1)}" cy="${(fy - R * 0.28).toFixed(1)}" rx="${(R * 0.36).toFixed(1)}" ry="${(R * 0.14).toFixed(1)}" fill="#fff" opacity="0.3"/>`;
    s += `<circle cx="${(fx + R * 0.3).toFixed(1)}" cy="${(fy - R * 0.06).toFixed(1)}" r="${(R * 0.07).toFixed(1)}" fill="#241a14"/>`;
    s += `</g>`;
  });
  for (let i = 0; i < 22; i++) {
    s += `<circle cx="${rng.range(0, w).toFixed(1)}" cy="${rng.range(0, h).toFixed(1)}" r="${rng.range(2, 7).toFixed(1)}" fill="#dff2f0" opacity="${rng.range(0.1, 0.3).toFixed(2)}"/>`;
  }
  return s;
};

S["butterfly"] = (w, h, rng) => {
  const bg = radial([["0", "#e8e0c8"], ["1", "#96a878"]]);
  let s = `<defs>${bg.def}</defs><rect width="${w}" height="${h}" fill="url(#${bg.gid})"/>`;
  for (let i = 0; i < 5; i++) {
    s += `<circle cx="${rng.range(0, w).toFixed(1)}" cy="${rng.range(0, h).toFixed(1)}" r="${rng.range(40, 110).toFixed(1)}" fill="#7f9860" opacity="0.24"/>`;
  }
  const cx = w * 0.5, cy = h * 0.48, R = Math.min(w, h) * 0.3;
  [[-1], [1]].forEach(([d]) => {
    s += `<path d="M ${cx} ${cy} q ${(d * R * 1.2).toFixed(1)} ${(-R * 1.1).toFixed(1)} ${(d * R * 1.05).toFixed(1)} ${(-R * 0.2).toFixed(1)} q ${(-d * R * 0.15).toFixed(1)} ${(R * 0.32).toFixed(1)} ${(-d * R * 1.05).toFixed(1)} ${(R * 0.2).toFixed(1)} Z" fill="#e0812f"/>`;
    s += `<path d="M ${cx} ${(cy + R * 0.08).toFixed(1)} q ${(d * R * 0.9).toFixed(1)} ${(R * 0.1).toFixed(1)} ${(d * R * 0.66).toFixed(1)} ${(R * 0.86).toFixed(1)} q ${(-d * R * 0.4).toFixed(1)} ${(-R * 0.1).toFixed(1)} ${(-d * R * 0.66).toFixed(1)} ${(-R * 0.86).toFixed(1)} Z" fill="#d0691f"/>`;
    for (let i = 0; i < 6; i++) {
      const a = -0.2 - i * 0.2;
      s += `<circle cx="${(cx + d * R * (0.44 + i * 0.1)).toFixed(1)}" cy="${(cy - R * (0.5 - i * 0.08)).toFixed(1)}" r="${(R * (0.1 - i * 0.008)).toFixed(1)}" fill="#f6ecd4" opacity="0.85"/>`;
      void a;
    }
    s += `<path d="M ${cx} ${cy} q ${(d * R * 1.2).toFixed(1)} ${(-R * 1.1).toFixed(1)} ${(d * R * 1.05).toFixed(1)} ${(-R * 0.2).toFixed(1)} q ${(-d * R * 0.15).toFixed(1)} ${(R * 0.32).toFixed(1)} ${(-d * R * 1.05).toFixed(1)} ${(R * 0.2).toFixed(1)} Z" fill="none" stroke="#2f2318" stroke-width="${(R * 0.05).toFixed(1)}"/>`;
    s += `<line x1="${cx}" y1="${(cy - R * 0.28).toFixed(1)}" x2="${(cx + d * R * 0.8).toFixed(1)}" y2="${(cy - R * 1.24).toFixed(1)}" stroke="#2f2318" stroke-width="${(R * 0.035).toFixed(1)}" stroke-linecap="round"/>`;
  });
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${(R * 0.09).toFixed(1)}" ry="${(R * 0.6).toFixed(1)}" fill="#2f2318"/>`;
  s += `<circle cx="${cx}" cy="${(cy - R * 0.6).toFixed(1)}" r="${(R * 0.11).toFixed(1)}" fill="#2f2318"/>`;
  return s;
};

S["gradient-mesh"] = (w, h, rng) => {
  const cols = ["#ff5f4f", "#ffa32c", "#2fd0d8", "#5f6fe0", "#ff4f9f", "#8fe04f", "#ffd83f"];
  const base = linear([["0", "#ff8a4f"], ["0.5", "#c94fa0"], ["1", "#3f4fc9"]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  const b = blur(Math.min(w, h) * 0.09);
  let s = `<defs>${base.def}${b.def}</defs><rect width="${w}" height="${h}" fill="url(#${base.gid})"/><g filter="url(#${b.fid})">`;
  for (let i = 0; i < 14; i++) {
    s += `<ellipse cx="${rng.range(-w * 0.05, w * 1.05).toFixed(1)}" cy="${rng.range(-h * 0.05, h * 1.05).toFixed(1)}" rx="${rng.range(Math.min(w, h) * 0.14, Math.min(w, h) * 0.34).toFixed(1)}" ry="${rng.range(Math.min(w, h) * 0.14, Math.min(w, h) * 0.34).toFixed(1)}" fill="${rng.pick(cols)}" opacity="${rng.range(0.6, 0.95).toFixed(2)}"/>`;
  }
  s += `</g>`;
  // a few crisp discs on top, so the whole frame isn't uniformly soft
  for (let i = 0; i < 5; i++) {
    s += `<circle cx="${rng.range(w * 0.1, w * 0.9).toFixed(1)}" cy="${rng.range(h * 0.1, h * 0.9).toFixed(1)}" r="${rng.range(Math.min(w, h) * 0.03, Math.min(w, h) * 0.09).toFixed(1)}" fill="none" stroke="#fff6e8" stroke-width="2.5" opacity="0.5"/>`;
  }
  return s;
};

S["concentric"] = (w, h, rng) => {
  const cols = ["#f2e6d0", "#e0a05f", "#c9573f", "#3f5f6b", "#7fa08f"];
  let s = `<rect width="${w}" height="${h}" fill="#f2e6d0"/>`;
  const cx = w * 0.5, cy = h * 0.5;
  const max = Math.hypot(w, h) * 0.6;
  let r = max, i = 0;
  while (r > 4) {
    s += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="${cols[i % cols.length]}"/>`;
    r -= max * rng.range(0.055, 0.1);
    i++;
  }
  return s;
};

S["geo-tiles"] = (w, h, rng) => {
  const cols = ["#e8dcc4", "#2f5f6b", "#d97f4f", "#f0c05c", "#8fa87f"];
  const n = 7;
  const cell = Math.ceil(w / n);
  const rows = Math.ceil(h / cell);
  let s = `<rect width="${w}" height="${h}" fill="#e8dcc4"/>`;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < n; c++) {
      const x = c * cell, y = r * cell;
      const fg = rng.pick(cols), bg = rng.pick(cols.filter((k) => k !== fg));
      s += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${bg}"/>`;
      const rot = rng.int(0, 3) * 90;
      s += `<g transform="rotate(${rot} ${(x + cell / 2).toFixed(1)} ${(y + cell / 2).toFixed(1)})">`;
      if (rng.f() < 0.55) {
        s += `<path d="M ${x} ${y + cell} A ${cell} ${cell} 0 0 1 ${x + cell} ${y} L ${x + cell} ${y + cell} Z" fill="${fg}"/>`;
      } else {
        s += `<path d="M ${x} ${y} A ${cell} ${cell} 0 0 1 ${x + cell} ${y + cell} L ${x} ${y + cell} Z" fill="${fg}"/>`;
      }
      s += `</g>`;
    }
  }
  return s;
};

S["wave-lines"] = (w, h) => {
  const bg = linear([["0", "#0a1420"], ["0.5", "#12283a"], ["1", "#0a1420"]]);
  let s = `<defs>${bg.def}</defs><rect width="${w}" height="${h}" fill="url(#${bg.gid})"/>`;
  const cols = ["#4fe8d8", "#5f9fff", "#ffc74f", "#ff6f8f", "#a97fff"];
  const N = 58;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const y0 = h * (0.06 + t * 0.88);
    // amplitude swells in the middle of the stack, so the field reads as one ribbon
    const env = Math.sin(t * Math.PI);
    let d = `M ${-w * 0.02} ${y0.toFixed(1)}`;
    for (let k = 1; k <= 8; k++) {
      const x = (k / 8) * w * 1.04 - w * 0.02;
      const amp = h * 0.1 * env * Math.sin(t * Math.PI * 1.6 + k * 0.85);
      d += ` Q ${(x - w * 0.065).toFixed(1)} ${(y0 + amp * 1.5).toFixed(1)} ${x.toFixed(1)} ${(y0 + amp * 0.35).toFixed(1)}`;
    }
    const c = cols[i % cols.length];
    s += `<path d="${d}" stroke="${c}" stroke-width="${(6 + env * 8).toFixed(1)}" fill="none" opacity="0.1"/>`;
    s += `<path d="${d}" stroke="${c}" stroke-width="${(1.4 + env * 1.8).toFixed(1)}" fill="none" opacity="${(0.5 + env * 0.45).toFixed(2)}"/>`;
  }
  return s;
};

S["terrazzo"] = (w, h, rng) => {
  const cols = ["#d95f4f", "#3f6f7f", "#f0c05c", "#7fa06b", "#2f3540", "#e8917f"];
  let s = `<rect width="${w}" height="${h}" fill="#f2ece0"/>`;
  for (let i = 0; i < 420; i++) {
    const x = rng.range(0, w), y = rng.range(0, h);
    const r = rng.range(3, 15);
    const n = rng.int(4, 7);
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const rr = r * rng.range(0.6, 1.3);
      pts.push(`${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr * 0.8).toFixed(1)}`);
    }
    s += `<polygon points="${pts.join(" ")}" fill="${rng.pick(cols)}" opacity="${rng.range(0.7, 1).toFixed(2)}"/>`;
  }
  return s;
};

// ═══════════════════════════════════════════════════════════════════════════
// Site art — avatars and the pictures the practice websites hang on
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Contact portraits.
 *
 * The messaging app used to hand out the pinch-zoom lesson's animals as
 * profile pictures: Alex was a dog, Jordan a cat, Sam a bird, Grandma a cow.
 * Two of the five were then brown dogs at 28px, which is what a learner is
 * actually asked to tell apart in the contact list.
 *
 * Faces, drawn to differ on the things that survive being shrunk — hair
 * silhouette and background hue — rather than on detail nobody can see.
 */
function portrait(w, h, o) {
  const cx = w * 0.5, cy = h * 0.54, R = Math.min(w, h) * 0.3;
  const bg = radial([["0", tint(o.bg, 0.35)], ["1", o.bg]], { r: 0.75 });
  let s = `<defs>${bg.def}</defs><rect width="${w}" height="${h}" fill="url(#${bg.gid})"/>`;

  // Neck first, then shoulders over it — the other way round leaves a pale stub
  // hanging below the collar, which is what the first render did.
  s += `<path d="M ${(cx - R * 0.4).toFixed(1)} ${(cy + R * 0.62).toFixed(1)} q ${(R * 0.4).toFixed(1)} ${(R * 0.5).toFixed(1)} ${(R * 0.8).toFixed(1)} 0 l 0 ${(R * 0.7).toFixed(1)} l ${(-R * 0.8).toFixed(1)} 0 Z" fill="${shade(o.skin, 0.14)}"/>`;
  s += `<ellipse cx="${cx}" cy="${(cy + R * 2.05).toFixed(1)}" rx="${(R * 1.72).toFixed(1)}" ry="${(R * 1.2).toFixed(1)}" fill="${o.shirt}"/>`;
  // Collar: a shallow scoop of shirt cutting across the base of the neck.
  s += `<path d="M ${(cx - R * 0.62).toFixed(1)} ${(cy + R * 1.02).toFixed(1)} q ${(R * 0.62).toFixed(1)} ${(R * 0.42).toFixed(1)} ${(R * 1.24).toFixed(1)} 0 l 0 ${(R * 0.6).toFixed(1)} l ${(-R * 1.24).toFixed(1)} 0 Z" fill="${shade(o.shirt, 0.18)}"/>`;

  // Long hair sits behind the face; everything else in front.
  if (o.hair === "long") {
    s += `<path d="M ${(cx - R * 1.02).toFixed(1)} ${(cy - R * 0.15).toFixed(1)} q ${(-R * 0.1).toFixed(1)} ${(R * 1.5).toFixed(1)} ${(R * 0.2).toFixed(1)} ${(R * 1.85).toFixed(1)} l ${(R * 1.64).toFixed(1)} 0 q ${(R * 0.3).toFixed(1)} ${(-R * 0.35).toFixed(1)} ${(R * 0.2).toFixed(1)} ${(-R * 1.85).toFixed(1)} Z" fill="${o.hairColor}"/>`;
  }

  s += `<ellipse cx="${cx}" cy="${cy}" rx="${(R * 0.82).toFixed(1)}" ry="${(R * 0.98).toFixed(1)}" fill="${o.skin}"/>`;
  // Ears
  [-1, 1].forEach((d) => {
    s += `<ellipse cx="${(cx + d * R * 0.82).toFixed(1)}" cy="${(cy + R * 0.08).toFixed(1)}" rx="${(R * 0.13).toFixed(1)}" ry="${(R * 0.2).toFixed(1)}" fill="${shade(o.skin, 0.08)}"/>`;
  });

  // Hair front
  const hc = o.hairColor;
  if (o.hair === "short") {
    s += `<path d="M ${(cx - R * 0.84).toFixed(1)} ${(cy - R * 0.28).toFixed(1)} q ${(R * 0.06).toFixed(1)} ${(-R * 1.05).toFixed(1)} ${(R * 0.84).toFixed(1)} ${(-R * 1.02).toFixed(1)} q ${(R * 0.8).toFixed(1)} ${(-R * 0.03).toFixed(1)} ${(R * 0.84).toFixed(1)} ${(R * 1.02).toFixed(1)} q ${(-R * 0.3).toFixed(1)} ${(-R * 0.5).toFixed(1)} ${(-R * 0.86).toFixed(1)} ${(-R * 0.42).toFixed(1)} q ${(-R * 0.56).toFixed(1)} ${(-R * 0.08).toFixed(1)} ${(-R * 0.82).toFixed(1)} ${(R * 0.42).toFixed(1)} Z" fill="${hc}"/>`;
  } else if (o.hair === "curly") {
    for (let i = 0; i < 13; i++) {
      const a = Math.PI * (1.06 + (i / 12) * 0.88);
      s += `<circle cx="${(cx + Math.cos(a) * R * 0.86).toFixed(1)}" cy="${(cy + Math.sin(a) * R * 0.98).toFixed(1)}" r="${(R * 0.29).toFixed(1)}" fill="${hc}"/>`;
    }
  } else if (o.hair === "long") {
    s += `<path d="M ${(cx - R * 0.88).toFixed(1)} ${(cy - R * 0.2).toFixed(1)} q ${(R * 0.1).toFixed(1)} ${(-R * 1.1).toFixed(1)} ${(R * 0.88).toFixed(1)} ${(-R * 1.06).toFixed(1)} q ${(R * 0.84).toFixed(1)} ${(-R * 0.04).toFixed(1)} ${(R * 0.88).toFixed(1)} ${(R * 1.06).toFixed(1)} q ${(-R * 0.24).toFixed(1)} ${(-R * 0.62).toFixed(1)} ${(-R * 0.9).toFixed(1)} ${(-R * 0.54).toFixed(1)} q ${(-R * 0.62).toFixed(1)} ${(R * 0.06).toFixed(1)} ${(-R * 0.86).toFixed(1)} ${(R * 0.54).toFixed(1)} Z" fill="${hc}"/>`;
  } else if (o.hair === "bun") {
    s += `<circle cx="${cx}" cy="${(cy - R * 1.16).toFixed(1)}" r="${(R * 0.36).toFixed(1)}" fill="${hc}"/>`;
    s += `<path d="M ${(cx - R * 0.86).toFixed(1)} ${(cy - R * 0.16).toFixed(1)} q ${(R * 0.08).toFixed(1)} ${(-R * 1.0).toFixed(1)} ${(R * 0.86).toFixed(1)} ${(-R * 0.98).toFixed(1)} q ${(R * 0.82).toFixed(1)} ${(-R * 0.02).toFixed(1)} ${(R * 0.86).toFixed(1)} ${(R * 0.98).toFixed(1)} q ${(-R * 0.26).toFixed(1)} ${(-R * 0.56).toFixed(1)} ${(-R * 0.88).toFixed(1)} ${(-R * 0.5).toFixed(1)} q ${(-R * 0.6).toFixed(1)} ${(R * 0.05).toFixed(1)} ${(-R * 0.84).toFixed(1)} ${(R * 0.5).toFixed(1)} Z" fill="${hc}"/>`;
  }

  // Eyes, brows, nose, mouth
  [-1, 1].forEach((d) => {
    const ex = cx + d * R * 0.31, ey = cy - R * 0.04;
    s += `<ellipse cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" rx="${(R * 0.1).toFixed(1)}" ry="${(R * 0.115).toFixed(1)}" fill="#fdfbf7"/>`;
    s += `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="${(R * 0.058).toFixed(1)}" fill="${o.eyes}"/>`;
    s += `<path d="M ${(ex - R * 0.13).toFixed(1)} ${(ey - R * 0.23).toFixed(1)} q ${(R * 0.13).toFixed(1)} ${(-R * 0.09).toFixed(1)} ${(R * 0.26).toFixed(1)} 0" stroke="${shade(hc, 0.25)}" stroke-width="${(R * 0.045).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
  });
  s += `<path d="M ${cx.toFixed(1)} ${(cy + R * 0.06).toFixed(1)} q ${(-R * 0.07).toFixed(1)} ${(R * 0.18).toFixed(1)} ${(R * 0.04).toFixed(1)} ${(R * 0.21).toFixed(1)}" stroke="${shade(o.skin, 0.2)}" stroke-width="${(R * 0.04).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M ${(cx - R * 0.2).toFixed(1)} ${(cy + R * 0.42).toFixed(1)} q ${(R * 0.2).toFixed(1)} ${(R * 0.19).toFixed(1)} ${(R * 0.4).toFixed(1)} 0" stroke="${shade("#c4635f", 0.1)}" stroke-width="${(R * 0.05).toFixed(1)}" fill="none" stroke-linecap="round"/>`;

  if (o.glasses) {
    [-1, 1].forEach((d) => {
      s += `<circle cx="${(cx + d * R * 0.31).toFixed(1)}" cy="${(cy - R * 0.04).toFixed(1)}" r="${(R * 0.23).toFixed(1)}" fill="#fff" fill-opacity="0.12" stroke="${o.frames}" stroke-width="${(R * 0.045).toFixed(1)}"/>`;
    });
    s += `<line x1="${(cx - R * 0.08).toFixed(1)}" y1="${(cy - R * 0.04).toFixed(1)}" x2="${(cx + R * 0.08).toFixed(1)}" y2="${(cy - R * 0.04).toFixed(1)}" stroke="${o.frames}" stroke-width="${(R * 0.045).toFixed(1)}"/>`;
  }
  if (o.beard) {
    s += `<path d="M ${(cx - R * 0.72).toFixed(1)} ${(cy + R * 0.12).toFixed(1)} q ${(R * 0.1).toFixed(1)} ${(R * 0.92).toFixed(1)} ${(R * 0.72).toFixed(1)} ${(R * 0.9).toFixed(1)} q ${(R * 0.62).toFixed(1)} ${(R * 0.02).toFixed(1)} ${(R * 0.72).toFixed(1)} ${(-R * 0.9).toFixed(1)} q ${(-R * 0.24).toFixed(1)} ${(R * 0.66).toFixed(1)} ${(-R * 0.72).toFixed(1)} ${(R * 0.64).toFixed(1)} q ${(-R * 0.48).toFixed(1)} ${(R * 0.02).toFixed(1)} ${(-R * 0.72).toFixed(1)} ${(-R * 0.64).toFixed(1)} Z" fill="${hc}" opacity="0.92"/>`;
  }
  return s;
}

S["avatar-alex"] = (w, h) => portrait(w, h, { bg: "#3f7f8f", skin: "#d8a077", hair: "short", hairColor: "#2f2018", eyes: "#3a2a1e", shirt: "#2d5f6b", frames: "#2f2f2f", beard: true });
S["avatar-jordan"] = (w, h) => portrait(w, h, { bg: "#c47f3f", skin: "#8a5a3c", hair: "curly", hairColor: "#241812", eyes: "#3a281c", shirt: "#8f4f2f", frames: "#2f2f2f" });
S["avatar-sam"] = (w, h) => portrait(w, h, { bg: "#5f5f9f", skin: "#f0c9a4", hair: "long", hairColor: "#7f4a28", eyes: "#3f5f4f", shirt: "#43436f", frames: "#3f3f4f", glasses: true });
S["avatar-grandma"] = (w, h) => portrait(w, h, { bg: "#c47f8f", skin: "#eec4a8", hair: "bun", hairColor: "#c8c4bc", eyes: "#4f5a5f", shirt: "#9f5f6f", frames: "#8f6f4f", glasses: true });

S["avatar-doggo"] = (w, h) => {
  const cx = w * 0.5, cy = h * 0.55, R = Math.min(w, h) * 0.3;
  const bg = radial([["0", "#9fc47f"], ["1", "#5f8f4f"]], { r: 0.75 });
  let s = `<defs>${bg.def}</defs><rect width="${w}" height="${h}" fill="url(#${bg.gid})"/>`;
  const fur = "#c98f4f";
  s += `<ellipse cx="${cx}" cy="${(cy + R * 2.0).toFixed(1)}" rx="${(R * 1.6).toFixed(1)}" ry="${(R * 1.15).toFixed(1)}" fill="${shade(fur, 0.18)}"/>`;
  // Ears behind the head
  [-1, 1].forEach((d) => {
    s += `<ellipse cx="${(cx + d * R * 0.82).toFixed(1)}" cy="${(cy - R * 0.1).toFixed(1)}" rx="${(R * 0.26).toFixed(1)}" ry="${(R * 0.56).toFixed(1)}" fill="${shade(fur, 0.22)}" transform="rotate(${d * 16} ${(cx + d * R * 0.82).toFixed(1)} ${(cy - R * 0.1).toFixed(1)})"/>`;
  });
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${(R * 0.86).toFixed(1)}" ry="${(R * 0.8).toFixed(1)}" fill="${fur}"/>`;
  s += `<ellipse cx="${cx}" cy="${(cy + R * 0.36).toFixed(1)}" rx="${(R * 0.46).toFixed(1)}" ry="${(R * 0.38).toFixed(1)}" fill="${tint(fur, 0.35)}"/>`;
  [-1, 1].forEach((d) => {
    const ex = cx + d * R * 0.3, ey = cy - R * 0.14;
    s += `<ellipse cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" rx="${(R * 0.1).toFixed(1)}" ry="${(R * 0.11).toFixed(1)}" fill="#fdfbf7"/>`;
    s += `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="${(R * 0.062).toFixed(1)}" fill="#33241a"/>`;
  });
  s += `<ellipse cx="${cx}" cy="${(cy + R * 0.28).toFixed(1)}" rx="${(R * 0.14).toFixed(1)}" ry="${(R * 0.1).toFixed(1)}" fill="#33241a"/>`;
  s += `<path d="M ${cx.toFixed(1)} ${(cy + R * 0.38).toFixed(1)} q ${(-R * 0.16).toFixed(1)} ${(R * 0.2).toFixed(1)} ${(-R * 0.3).toFixed(1)} ${(R * 0.02).toFixed(1)} M ${cx.toFixed(1)} ${(cy + R * 0.38).toFixed(1)} q ${(R * 0.16).toFixed(1)} ${(R * 0.2).toFixed(1)} ${(R * 0.3).toFixed(1)} ${(R * 0.02).toFixed(1)}" stroke="#33241a" stroke-width="${(R * 0.05).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M ${(cx - R * 0.1).toFixed(1)} ${(cy + R * 0.5).toFixed(1)} q ${(R * 0.1).toFixed(1)} ${(R * 0.16).toFixed(1)} ${(R * 0.2).toFixed(1)} 0" fill="#d9707a"/>`;
  return s;
};

/** A soft studio backdrop — the neutral ground every product shot sits on. */
function studio(w, h, top, bot) {
  const g = linear([["0", top], ["1", bot]]);
  return `<defs>${g.def}</defs><rect width="${w}" height="${h}" fill="url(#${g.gid})"/>`;
}
const drop = (cx, cy, rx, ry, op = 0.16) =>
  `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="#000" opacity="${op}"/>`;

S["product-laptop"] = (w, h) => {
  let s = studio(w, h, "#eaf0f6", "#c6d4e2");
  const cx = w * 0.5, by = h * 0.72, bw = w * 0.62, bh = h * 0.05;
  s += drop(cx, by + bh * 1.4, bw * 0.62, bh * 1.1);
  // Lid
  s += `<path d="M ${(cx - bw * 0.42).toFixed(1)} ${by.toFixed(1)} L ${(cx - bw * 0.34).toFixed(1)} ${(by - h * 0.36).toFixed(1)} L ${(cx + bw * 0.34).toFixed(1)} ${(by - h * 0.36).toFixed(1)} L ${(cx + bw * 0.42).toFixed(1)} ${by.toFixed(1)} Z" fill="#3f4c5a"/>`;
  s += `<path d="M ${(cx - bw * 0.38).toFixed(1)} ${(by - h * 0.015).toFixed(1)} L ${(cx - bw * 0.31).toFixed(1)} ${(by - h * 0.335).toFixed(1)} L ${(cx + bw * 0.31).toFixed(1)} ${(by - h * 0.335).toFixed(1)} L ${(cx + bw * 0.38).toFixed(1)} ${(by - h * 0.015).toFixed(1)} Z" fill="#1d2733"/>`;
  const scr = linear([["0", "#4f7fbf"], ["1", "#2f4f7f"]]);
  s += `<defs>${scr.def}</defs><path d="M ${(cx - bw * 0.365).toFixed(1)} ${(by - h * 0.028).toFixed(1)} L ${(cx - bw * 0.3).toFixed(1)} ${(by - h * 0.322).toFixed(1)} L ${(cx + bw * 0.3).toFixed(1)} ${(by - h * 0.322).toFixed(1)} L ${(cx + bw * 0.365).toFixed(1)} ${(by - h * 0.028).toFixed(1)} Z" fill="url(#${scr.gid})"/>`;
  // Base + keys
  s += `<rect x="${(cx - bw * 0.5).toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="${(bh * 0.35).toFixed(1)}" fill="#8f9baa"/>`;
  s += `<rect x="${(cx - bw * 0.5).toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${(bh * 0.42).toFixed(1)}" rx="${(bh * 0.3).toFixed(1)}" fill="#b4bfcc"/>`;
  s += `<rect x="${(cx - bw * 0.12).toFixed(1)}" y="${(by + bh * 0.55).toFixed(1)}" width="${(bw * 0.24).toFixed(1)}" height="${(bh * 0.22).toFixed(1)}" rx="${(bh * 0.1).toFixed(1)}" fill="#7f8b99"/>`;
  return s;
};

S["product-tablet"] = (w, h) => {
  let s = studio(w, h, "#eaf6ee", "#c2ddcc");
  const cx = w * 0.5, cy = h * 0.5, tw = w * 0.42, th = h * 0.6;
  s += drop(cx, cy + th * 0.56, tw * 0.6, th * 0.06);
  s += `<rect x="${(cx - tw / 2).toFixed(1)}" y="${(cy - th / 2).toFixed(1)}" width="${tw.toFixed(1)}" height="${th.toFixed(1)}" rx="${(tw * 0.07).toFixed(1)}" fill="#2f3a45"/>`;
  const scr = linear([["0", "#7fc4b4"], ["1", "#3f8f9f"]]);
  s += `<defs>${scr.def}</defs><rect x="${(cx - tw / 2 + tw * 0.045).toFixed(1)}" y="${(cy - th / 2 + tw * 0.045).toFixed(1)}" width="${(tw - tw * 0.09).toFixed(1)}" height="${(th - tw * 0.09).toFixed(1)}" rx="${(tw * 0.035).toFixed(1)}" fill="url(#${scr.gid})"/>`;
  for (let i = 0; i < 9; i++) {
    const gx = cx - tw * 0.3 + (i % 3) * tw * 0.3, gy = cy - th * 0.28 + Math.floor(i / 3) * th * 0.19;
    s += `<rect x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" width="${(tw * 0.16).toFixed(1)}" height="${(tw * 0.16).toFixed(1)}" rx="${(tw * 0.04).toFixed(1)}" fill="#fff" opacity="0.5"/>`;
  }
  return s;
};

S["product-phone"] = (w, h) => {
  let s = studio(w, h, "#fdeef2", "#e6c2d0");
  const cx = w * 0.5, cy = h * 0.5, pw = w * 0.26, ph = h * 0.62;
  s += drop(cx, cy + ph * 0.55, pw * 0.75, ph * 0.05);
  s += `<rect x="${(cx - pw / 2).toFixed(1)}" y="${(cy - ph / 2).toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" rx="${(pw * 0.18).toFixed(1)}" fill="#2b2b33"/>`;
  const scr = linear([["0", "#c47f9f"], ["1", "#6f4f8f"]]);
  s += `<defs>${scr.def}</defs><rect x="${(cx - pw / 2 + pw * 0.05).toFixed(1)}" y="${(cy - ph / 2 + pw * 0.05).toFixed(1)}" width="${(pw * 0.9).toFixed(1)}" height="${(ph - pw * 0.1).toFixed(1)}" rx="${(pw * 0.14).toFixed(1)}" fill="url(#${scr.gid})"/>`;
  s += `<rect x="${(cx - pw * 0.14).toFixed(1)}" y="${(cy - ph / 2 + pw * 0.09).toFixed(1)}" width="${(pw * 0.28).toFixed(1)}" height="${(pw * 0.07).toFixed(1)}" rx="${(pw * 0.035).toFixed(1)}" fill="#2b2b33"/>`;
  return s;
};

S["product-headphones"] = (w, h) => {
  let s = studio(w, h, "#fdf6e4", "#e4d3ac");
  const cx = w * 0.5, cy = h * 0.52, R = Math.min(w, h) * 0.3;
  s += drop(cx, cy + R * 1.35, R * 1.15, R * 0.16);
  s += `<path d="M ${(cx - R).toFixed(1)} ${(cy + R * 0.2).toFixed(1)} a ${R.toFixed(1)} ${(R * 1.05).toFixed(1)} 0 0 1 ${(R * 2).toFixed(1)} 0" stroke="#3f4550" stroke-width="${(R * 0.19).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
  [-1, 1].forEach((d) => {
    s += `<rect x="${(cx + d * R - R * 0.26).toFixed(1)}" y="${(cy + R * 0.12).toFixed(1)}" width="${(R * 0.52).toFixed(1)}" height="${(R * 0.86).toFixed(1)}" rx="${(R * 0.24).toFixed(1)}" fill="#2f3540"/>`;
    s += `<rect x="${(cx + d * R - R * 0.17).toFixed(1)}" y="${(cy + R * 0.24).toFixed(1)}" width="${(R * 0.34).toFixed(1)}" height="${(R * 0.6).toFixed(1)}" rx="${(R * 0.17).toFixed(1)}" fill="#5f6874"/>`;
  });
  return s;
};

S["apple-pie"] = (w, h, rng) => {
  let s = studio(w, h, "#f6ece0", "#dcc7ab");
  const cx = w * 0.5, cy = h * 0.56, R = Math.min(w, h) * 0.33;
  s += drop(cx, cy + R * 0.5, R * 1.15, R * 0.24, 0.14);
  s += `<ellipse cx="${cx}" cy="${(cy + R * 0.16).toFixed(1)}" rx="${(R * 1.08).toFixed(1)}" ry="${(R * 0.5).toFixed(1)}" fill="#c9a06a"/>`;
  s += `<ellipse cx="${cx}" cy="${cy.toFixed(1)}" rx="${(R * 1.08).toFixed(1)}" ry="${(R * 0.5).toFixed(1)}" fill="#e0b87f"/>`;
  s += `<ellipse cx="${cx}" cy="${cy.toFixed(1)}" rx="${(R * 0.88).toFixed(1)}" ry="${(R * 0.4).toFixed(1)}" fill="#d9a463"/>`;
  // Lattice
  for (let i = -3; i <= 3; i++) {
    const off = (i / 3.4) * R * 0.85;
    s += `<ellipse cx="${(cx + off).toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(R * 0.055).toFixed(1)}" ry="${(R * 0.4 * Math.sqrt(Math.max(0.05, 1 - (off / (R * 0.9)) ** 2))).toFixed(1)}" fill="#eec98c"/>`;
    s += `<ellipse cx="${cx}" cy="${(cy + off * 0.46).toFixed(1)}" rx="${(R * 0.88 * Math.sqrt(Math.max(0.05, 1 - (off / (R * 0.95)) ** 2))).toFixed(1)}" ry="${(R * 0.03).toFixed(1)}" fill="#e5bd80"/>`;
  }
  // Crimped edge
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    s += `<ellipse cx="${(cx + Math.cos(a) * R * 1.02).toFixed(1)}" cy="${(cy + Math.sin(a) * R * 0.47).toFixed(1)}" rx="${(R * 0.09).toFixed(1)}" ry="${(R * 0.07).toFixed(1)}" fill="#e8c48b"/>`;
  }
  for (let i = 0; i < 30; i++) {
    s += `<circle cx="${(cx + rng.range(-R * 0.8, R * 0.8)).toFixed(1)}" cy="${(cy + rng.range(-R * 0.3, R * 0.3)).toFixed(1)}" r="${rng.range(1, 3).toFixed(1)}" fill="#a5713c" opacity="0.4"/>`;
  }
  return s;
};

S["soup-bowl"] = (w, h, rng) => {
  let s = studio(w, h, "#f0efe6", "#cfd0c2");
  const cx = w * 0.5, cy = h * 0.56, R = Math.min(w, h) * 0.31;
  s += drop(cx, cy + R * 0.62, R * 1.1, R * 0.2, 0.14);
  s += `<path d="M ${(cx - R * 1.02).toFixed(1)} ${cy.toFixed(1)} a ${(R * 1.02).toFixed(1)} ${(R * 0.78).toFixed(1)} 0 0 0 ${(R * 2.04).toFixed(1)} 0 Z" fill="#e8e2d6"/>`;
  s += `<ellipse cx="${cx}" cy="${cy.toFixed(1)}" rx="${(R * 1.02).toFixed(1)}" ry="${(R * 0.34).toFixed(1)}" fill="#f4efe4"/>`;
  s += `<ellipse cx="${cx}" cy="${cy.toFixed(1)}" rx="${(R * 0.88).toFixed(1)}" ry="${(R * 0.29).toFixed(1)}" fill="#d4813f"/>`;
  for (let i = 0; i < 22; i++) {
    const a = rng.range(0, Math.PI * 2), rr = Math.sqrt(rng.f()) * R * 0.78;
    s += `<ellipse cx="${(cx + Math.cos(a) * rr).toFixed(1)}" cy="${(cy + Math.sin(a) * rr * 0.32).toFixed(1)}" rx="${rng.range(R * 0.04, R * 0.08).toFixed(1)}" ry="${rng.range(R * 0.02, R * 0.035).toFixed(1)}" fill="${rng.pick(["#e8a24f", "#7f9f4f", "#c45f3f", "#f0c98c"])}"/>`;
  }
  for (let i = 0; i < 3; i++) {
    const x = cx - R * 0.3 + i * R * 0.3;
    s += `<path d="M ${x.toFixed(1)} ${(cy - R * 0.2).toFixed(1)} q ${(R * 0.16).toFixed(1)} ${(-R * 0.28).toFixed(1)} 0 ${(-R * 0.52).toFixed(1)} q ${(-R * 0.16).toFixed(1)} ${(-R * 0.24).toFixed(1)} 0 ${(-R * 0.44).toFixed(1)}" stroke="#fff" stroke-width="${(R * 0.05).toFixed(1)}" fill="none" opacity="0.35" stroke-linecap="round"/>`;
  }
  return s;
};

S["tomato-plant"] = (w, h, rng) => {
  const sky = linear([["0", "#bfe0f0"], ["1", "#e8f0d8"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  s += `<rect x="0" y="${(h * 0.78).toFixed(1)}" width="${w}" height="${(h * 0.22).toFixed(1)}" fill="#8a6a4a"/>`;
  const cx = w * 0.5, baseY = h * 0.8;
  s += `<rect x="${(cx - w * 0.008).toFixed(1)}" y="${(h * 0.22).toFixed(1)}" width="${(w * 0.016).toFixed(1)}" height="${(baseY - h * 0.22).toFixed(1)}" fill="#4f7f3f"/>`;
  s += `<rect x="${(cx + w * 0.05).toFixed(1)}" y="${(h * 0.2).toFixed(1)}" width="${(w * 0.012).toFixed(1)}" height="${(baseY - h * 0.2).toFixed(1)}" rx="${(w * 0.006).toFixed(1)}" fill="#a5825c"/>`;
  for (let i = 0; i < 12; i++) {
    const y = h * (0.28 + i * 0.042), d = i % 2 ? 1 : -1;
    s += `<ellipse cx="${(cx + d * w * 0.075).toFixed(1)}" cy="${y.toFixed(1)}" rx="${(w * 0.075).toFixed(1)}" ry="${(h * 0.028).toFixed(1)}" fill="${i % 3 ? "#4f8f3f" : "#3f7f33"}" transform="rotate(${d * 14} ${(cx + d * w * 0.075).toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  for (let i = 0; i < 7; i++) {
    const d = i % 2 ? 1 : -1;
    const tx = cx + d * w * rng.range(0.04, 0.11), ty = h * rng.range(0.38, 0.72);
    const r = w * rng.range(0.032, 0.05);
    s += `<circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="${r.toFixed(1)}" fill="#cf3f2f"/>`;
    s += `<circle cx="${(tx - r * 0.3).toFixed(1)}" cy="${(ty - r * 0.35).toFixed(1)}" r="${(r * 0.3).toFixed(1)}" fill="#fff" opacity="0.3"/>`;
    s += `<path d="M ${tx.toFixed(1)} ${(ty - r).toFixed(1)} l ${(-r * 0.4).toFixed(1)} ${(-r * 0.3).toFixed(1)} M ${tx.toFixed(1)} ${(ty - r).toFixed(1)} l ${(r * 0.4).toFixed(1)} ${(-r * 0.3).toFixed(1)}" stroke="#3f7f33" stroke-width="${(r * 0.22).toFixed(1)}" stroke-linecap="round"/>`;
  }
  return s;
};

S["city-bus"] = (w, h) => {
  const sky = linear([["0", "#a8c8e4"], ["1", "#dfe8ef"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  s += `<rect x="0" y="${(h * 0.72).toFixed(1)}" width="${w}" height="${(h * 0.28).toFixed(1)}" fill="#7f8590"/>`;
  s += `<rect x="0" y="${(h * 0.83).toFixed(1)}" width="${w}" height="${(h * 0.01).toFixed(1)}" fill="#e8e4d8" opacity="0.7"/>`;
  const bx = w * 0.1, by = h * 0.3, bw = w * 0.8, bh = h * 0.42;
  s += drop(w * 0.5, by + bh + h * 0.03, bw * 0.52, h * 0.02, 0.2);
  s += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="${(bh * 0.16).toFixed(1)}" fill="#2f6f9f"/>`;
  s += `<rect x="${bx.toFixed(1)}" y="${(by + bh * 0.62).toFixed(1)}" width="${bw.toFixed(1)}" height="${(bh * 0.14).toFixed(1)}" fill="#e8c94f"/>`;
  s += `<rect x="${(bx + bw * 0.04).toFixed(1)}" y="${(by + bh * 0.08).toFixed(1)}" width="${(bw * 0.34).toFixed(1)}" height="${(bh * 0.1).toFixed(1)}" rx="${(bh * 0.03).toFixed(1)}" fill="#1d2733"/>`;
  for (let i = 0; i < 5; i++) {
    s += `<rect x="${(bx + bw * (0.06 + i * 0.18)).toFixed(1)}" y="${(by + bh * 0.24).toFixed(1)}" width="${(bw * 0.14).toFixed(1)}" height="${(bh * 0.3).toFixed(1)}" rx="${(bh * 0.03).toFixed(1)}" fill="#bfd8e8"/>`;
  }
  [0.26, 0.74].forEach((t) => {
    s += `<circle cx="${(bx + bw * t).toFixed(1)}" cy="${(by + bh).toFixed(1)}" r="${(bh * 0.15).toFixed(1)}" fill="#2b2b33"/>`;
    s += `<circle cx="${(bx + bw * t).toFixed(1)}" cy="${(by + bh).toFixed(1)}" r="${(bh * 0.07).toFixed(1)}" fill="#9fa5ae"/>`;
  });
  return s;
};

/** Book covers: banded artwork, no lettering — the title sits in the HTML beside it. */
function bookCover(w, h, top, bot, motif) {
  const g = linear([["0", top], ["1", bot]]);
  let s = `<defs>${g.def}</defs><rect width="${w}" height="${h}" fill="url(#${g.gid})"/>`;
  if (motif === "leaves") {
    for (let i = 0; i < 9; i++) {
      const x = w * (0.16 + (i % 3) * 0.34), y = h * (0.24 + Math.floor(i / 3) * 0.26);
      s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(w * 0.11).toFixed(1)}" ry="${(h * 0.045).toFixed(1)}" fill="#fff" opacity="0.28" transform="rotate(${i * 40} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
  } else if (motif === "screen") {
    s += `<rect x="${(w * 0.2).toFixed(1)}" y="${(h * 0.28).toFixed(1)}" width="${(w * 0.6).toFixed(1)}" height="${(h * 0.3).toFixed(1)}" rx="${(w * 0.04).toFixed(1)}" fill="#fff" opacity="0.3"/>`;
    s += `<rect x="${(w * 0.3).toFixed(1)}" y="${(h * 0.6).toFixed(1)}" width="${(w * 0.4).toFixed(1)}" height="${(h * 0.04).toFixed(1)}" rx="${(h * 0.02).toFixed(1)}" fill="#fff" opacity="0.3"/>`;
  } else if (motif === "bowl") {
    s += `<path d="M ${(w * 0.25).toFixed(1)} ${(h * 0.46).toFixed(1)} a ${(w * 0.25).toFixed(1)} ${(h * 0.16).toFixed(1)} 0 0 0 ${(w * 0.5).toFixed(1)} 0 Z" fill="#fff" opacity="0.32"/>`;
    s += `<ellipse cx="${(w * 0.5).toFixed(1)}" cy="${(h * 0.46).toFixed(1)}" rx="${(w * 0.25).toFixed(1)}" ry="${(h * 0.05).toFixed(1)}" fill="#fff" opacity="0.45"/>`;
  } else {
    for (let i = 0; i < 5; i++) {
      s += `<path d="M ${(w * 0.1).toFixed(1)} ${(h * (0.3 + i * 0.1)).toFixed(1)} q ${(w * 0.4).toFixed(1)} ${(h * (i % 2 ? -0.08 : 0.08)).toFixed(1)} ${(w * 0.8).toFixed(1)} 0" stroke="#fff" stroke-width="${(h * 0.012).toFixed(1)}" fill="none" opacity="0.3"/>`;
    }
  }
  s += `<rect x="0" y="0" width="${(w * 0.06).toFixed(1)}" height="${h}" fill="#000" opacity="0.14"/>`;
  return s;
}
S["cover-garden"] = (w, h) => bookCover(w, h, "#5f9f5f", "#2f6f4f", "leaves");
S["cover-computer"] = (w, h) => bookCover(w, h, "#4f7fbf", "#2f4f8f", "screen");
S["cover-soup"] = (w, h) => bookCover(w, h, "#d9713f", "#a5432f", "bowl");
S["cover-walks"] = (w, h) => bookCover(w, h, "#e0a83f", "#a56f2f", "path");

// ═══════════════════════════════════════════════════════════════════════════
// Lesson art — the picture beside a lesson that has no activity
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A lesson with no playground used to show nothing at all, and the page
 * silently switched to a centered single column to fill the gap. Reading three
 * lessons in a row meant the text jumping from wide-and-centered to
 * narrow-and-left and back, which reads as three different websites.
 *
 * So every no-activity lesson gets a picture, and the layout stops moving.
 *
 * Most of these teach one named part of something, so they are drawn as one
 * diagram with that part picked out — the same laptop across Unit 1, the same
 * keyboard across Unit 2. A learner meeting the seventh of them recognizes the
 * machine and only has to find the new part.
 */
const CALLOUT = "#f0b429";
const glowRect = (x, y, w2, h2, r = 6) =>
  `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w2.toFixed(1)}" height="${h2.toFixed(1)}" rx="${r}" fill="none" stroke="${CALLOUT}" stroke-width="7" opacity="0.95"/>` +
  `<rect x="${(x - 6).toFixed(1)}" y="${(y - 6).toFixed(1)}" width="${(w2 + 12).toFixed(1)}" height="${(h2 + 12).toFixed(1)}" rx="${r + 5}" fill="none" stroke="${CALLOUT}" stroke-width="3" opacity="0.35"/>`;

/** An open laptop, three-quarters on, with one part called out. */
function laptop(w, h, part) {
  const g = linear([["0", "#eef2f7"], ["1", "#ccd8e4"]]);
  let s = `<defs>${g.def}</defs><rect width="${w}" height="${h}" fill="url(#${g.gid})"/>`;
  const cx = w * 0.5, baseY = h * 0.72, bw = w * 0.66, bh = h * 0.055;

  if (part === "sleep") {
    // Lid shut, seen slightly from the front, and big enough to be the subject
    // rather than a bar at the bottom of an empty frame.
    const lw = w * 0.62, lh = h * 0.14, lx = cx - lw / 2, ly = h * 0.56;
    s += drop(cx, ly + lh * 1.5, lw * 0.55, lh * 0.42);
    s += `<rect x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" width="${lw.toFixed(1)}" height="${lh.toFixed(1)}" rx="${(lh * 0.3).toFixed(1)}" fill="#5f6b78"/>`;
    s += `<rect x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" width="${lw.toFixed(1)}" height="${(lh * 0.52).toFixed(1)}" rx="${(lh * 0.28).toFixed(1)}" fill="#8f9baa"/>`;
    s += `<rect x="${(lx + lw * 0.02).toFixed(1)}" y="${(ly + lh * 0.06).toFixed(1)}" width="${(lw * 0.96).toFixed(1)}" height="${(lh * 0.16).toFixed(1)}" rx="${(lh * 0.08).toFixed(1)}" fill="#b4bfcc"/>`;
    // The one light that tells you it is asleep and not off.
    s += `<circle cx="${(cx + lw * 0.42).toFixed(1)}" cy="${(ly + lh * 0.66).toFixed(1)}" r="${(lh * 0.13).toFixed(1)}" fill="#8fd47f"/>`;
    s += `<circle cx="${(cx + lw * 0.42).toFixed(1)}" cy="${(ly + lh * 0.66).toFixed(1)}" r="${(lh * 0.26).toFixed(1)}" fill="#8fd47f" opacity="0.3"/>`;
    [[0.6, 0.42, 62], [0.68, 0.3, 44], [0.745, 0.21, 30]].forEach(([fx, fy, sz]) => {
      s += `<text x="${(w * fx).toFixed(1)}" y="${(h * fy).toFixed(1)}" font-family="Helvetica,Arial,sans-serif" font-size="${sz}" font-weight="700" fill="#5f7185" opacity="0.8">Z</text>`;
    });
    return s;
  }

  const lidTop = baseY - h * 0.42;
  s += drop(cx, baseY + bh * 1.5, bw * 0.58, bh * 1.0);
  // Lid
  s += `<path d="M ${(cx - bw * 0.44).toFixed(1)} ${baseY.toFixed(1)} L ${(cx - bw * 0.36).toFixed(1)} ${lidTop.toFixed(1)} L ${(cx + bw * 0.36).toFixed(1)} ${lidTop.toFixed(1)} L ${(cx + bw * 0.44).toFixed(1)} ${baseY.toFixed(1)} Z" fill="#4a5765"/>`;
  const scr = linear([["0", "#5f8fc4"], ["1", "#3a5f8f"]]);
  const sx = cx - bw * 0.325, sy = lidTop + h * 0.028, sw = bw * 0.65, sh = baseY - lidTop - h * 0.05;
  s += `<defs>${scr.def}</defs><path d="M ${sx.toFixed(1)} ${(baseY - h * 0.022).toFixed(1)} L ${(cx - bw * 0.31).toFixed(1)} ${sy.toFixed(1)} L ${(cx + bw * 0.31).toFixed(1)} ${sy.toFixed(1)} L ${(sx + sw).toFixed(1)} ${(baseY - h * 0.022).toFixed(1)} Z" fill="url(#${scr.gid})"/>`;
  // Camera dot in the lid bezel
  s += `<circle cx="${cx.toFixed(1)}" cy="${(lidTop + h * 0.014).toFixed(1)}" r="${(h * 0.008).toFixed(1)}" fill="#20262e"/>`;
  // Base
  s += `<rect x="${(cx - bw * 0.5).toFixed(1)}" y="${baseY.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="${(bh * 0.3).toFixed(1)}" fill="#8f9baa"/>`;
  s += `<rect x="${(cx - bw * 0.5).toFixed(1)}" y="${baseY.toFixed(1)}" width="${bw.toFixed(1)}" height="${(bh * 0.42).toFixed(1)}" rx="${(bh * 0.25).toFixed(1)}" fill="#b4bfcc"/>`;
  // Keys and trackpad, drawn on the base's top face
  const kx = cx - bw * 0.36, ky = baseY + bh * 0.06, kw = bw * 0.72, kh = bh * 0.22;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 14; c++) {
      s += `<rect x="${(kx + c * (kw / 14) + 1).toFixed(1)}" y="${(ky + r * (kh / 4) + 0.6).toFixed(1)}" width="${(kw / 14 - 2).toFixed(1)}" height="${(kh / 4 - 1.2).toFixed(1)}" rx="1.2" fill="#7f8b99"/>`;
    }
  }
  const tx = cx - bw * 0.11, ty = baseY + bh * 0.34, tw2 = bw * 0.22, th2 = bh * 0.2;
  s += `<rect x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" width="${tw2.toFixed(1)}" height="${th2.toFixed(1)}" rx="2" fill="#7f8b99"/>`;
  // Speaker grilles either side of the keys
  [-1, 1].forEach((d) => {
    for (let i = 0; i < 4; i++) {
      s += `<rect x="${(cx + d * bw * 0.4 - bw * 0.03 + i * bw * 0.014).toFixed(1)}" y="${(baseY + bh * 0.08).toFixed(1)}" width="${(bw * 0.007).toFixed(1)}" height="${(bh * 0.2).toFixed(1)}" rx="1" fill="#6f7b89"/>`;
    }
  });
  // Ports along the near edge
  [[-0.42, 0.05], [-0.34, 0.035], [0.34, 0.035], [0.42, 0.05]].forEach(([fx, fw2]) => {
    s += `<rect x="${(cx + bw * fx - bw * fw2 / 2).toFixed(1)}" y="${(baseY + bh * 0.86).toFixed(1)}" width="${(bw * fw2).toFixed(1)}" height="${(bh * 0.16).toFixed(1)}" rx="2" fill="#5f6874"/>`;
  });

  if (part === "screen") s += glowRect(sx, sy, sw, sh, 4);
  if (part === "keyboard") s += glowRect(kx - 4, ky - 3, kw + 8, kh + 6, 4);
  if (part === "trackpad") s += glowRect(tx - 4, ty - 3, tw2 + 8, th2 + 6, 4);
  if (part === "camera") s += `<circle cx="${cx.toFixed(1)}" cy="${(lidTop + h * 0.014).toFixed(1)}" r="${(h * 0.03).toFixed(1)}" fill="none" stroke="${CALLOUT}" stroke-width="6"/>`;
  if (part === "speakers") {
    [-1, 1].forEach((d) => { s += glowRect(cx + d * bw * 0.4 - bw * 0.036, baseY + bh * 0.04, bw * 0.072, bh * 0.28, 3); });
  }
  if (part === "ports") s += glowRect(cx - bw * 0.47, baseY + bh * 0.8, bw * 0.16, bh * 0.28, 3);
  return s;
}

S["part-screen"] = (w, h) => laptop(w, h, "screen");
S["part-keyboard"] = (w, h) => laptop(w, h, "keyboard");
S["part-trackpad"] = (w, h) => laptop(w, h, "trackpad");
S["part-speakers"] = (w, h) => laptop(w, h, "speakers");
S["part-camera"] = (w, h) => laptop(w, h, "camera");
S["part-ports"] = (w, h) => laptop(w, h, "ports");
S["laptop-sleep"] = (w, h) => laptop(w, h, "sleep");

/** A keyboard seen from above, with one key (or run of keys) picked out. */
const KEY_ROWS = [
  ["esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="],
  ["tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]"],
  ["caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "return"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "shift"],
  ["ctrl", "alt", "space", "alt", "ctrl"],
];
function keyboard(w, h, want) {
  const g = linear([["0", "#e9edf2"], ["1", "#cbd5e0"]]);
  let s = `<defs>${g.def}</defs><rect width="${w}" height="${h}" fill="url(#${g.gid})"/>`;
  const bx = w * 0.07, by = h * 0.16, bw = w * 0.86, bh = h * 0.68;
  s += drop(w * 0.5, by + bh + h * 0.03, bw * 0.5, h * 0.02);
  s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="14" fill="#8f9baa"/>`;
  s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh * 0.94}" rx="14" fill="#b4bfcc"/>`;
  const pad = bw * 0.022, rowH = (bh * 0.86) / KEY_ROWS.length;
  const hits = [];
  KEY_ROWS.forEach((row, r) => {
    // Widths in units; space is wide, modifiers a little wider than letters.
    const units = row.map((k) => (k === "space" ? 5 : ["tab", "caps", "shift", "return", "ctrl", "alt", "cmd", "esc"].includes(k) ? 1.5 : 1));
    const total = units.reduce((a, b) => a + b, 0);
    const avail = bw - pad * 2 - pad * (row.length - 1);
    let x = bx + pad;
    const y = by + bh * 0.06 + r * rowH;
    row.forEach((k, i) => {
      const kw = (units[i] / total) * avail;
      s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${kw.toFixed(1)}" height="${(rowH * 0.82).toFixed(1)}" rx="4" fill="#f4f6f8"/>`;
      s += `<rect x="${x.toFixed(1)}" y="${(y + rowH * 0.68).toFixed(1)}" width="${kw.toFixed(1)}" height="${(rowH * 0.14).toFixed(1)}" rx="3" fill="#d8dde3"/>`;
      const label = k.length > 1 && k !== "space" ? k : k === "space" ? "" : k.toUpperCase();
      if (label) {
        s += `<text x="${(x + kw / 2).toFixed(1)}" y="${(y + rowH * 0.55).toFixed(1)}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="${Math.min(rowH * 0.36, kw * 0.44).toFixed(1)}" fill="#5f6874">${label === "cmd" ? "ctrl" : label}</text>`;
      }
      if (want.includes(k)) hits.push([x, y, kw, rowH * 0.82]);
      x += kw + pad;
    });
  });
  hits.forEach(([x, y, kw, kh]) => { s += glowRect(x, y, kw, kh, 4); });
  return s;
}
S["key-numbers"] = (w, h) => keyboard(w, h, ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]);
S["key-caps"] = (w, h) => keyboard(w, h, ["caps"]);
S["key-ctrl"] = (w, h) => keyboard(w, h, ["ctrl"]);
S["key-escape"] = (w, h) => keyboard(w, h, ["esc"]);

/** A screen showing the practice desktop, with one region called out. */
function desktopShot(w, h, region) {
  const g = linear([["0", "#dfe6ee"], ["1", "#c2cfdc"]]);
  let s = `<defs>${g.def}</defs><rect width="${w}" height="${h}" fill="url(#${g.gid})"/>`;
  const bx = w * 0.08, by = h * 0.12, bw = w * 0.84, bh = h * 0.7;
  s += drop(w * 0.5, by + bh + h * 0.05, bw * 0.34, h * 0.02);
  s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="10" fill="#2f3a45"/>`;
  const ix = bx + bw * 0.014, iy = by + bh * 0.02, iw = bw * 0.972, ih = bh * 0.96;
  const wall = linear([["0", "#f2c8c8"], ["0.5", "#c8e8c8"], ["1", "#c8ccf0"]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  s += `<defs>${wall.def}</defs><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="6" fill="url(#${wall.gid})"/>`;
  // Menu bar
  const mh = ih * 0.075;
  s += `<rect x="${ix}" y="${iy}" width="${iw}" height="${mh}" rx="6" fill="#fbfcfd"/>`;
  s += `<rect x="${ix}" y="${(iy + mh * 0.5).toFixed(1)}" width="${iw}" height="${(mh * 0.5).toFixed(1)}" fill="#fbfcfd"/>`;
  s += `<rect x="${(ix + iw * 0.02).toFixed(1)}" y="${(iy + mh * 0.32).toFixed(1)}" width="${(iw * 0.09).toFixed(1)}" height="${(mh * 0.34).toFixed(1)}" rx="2" fill="#4f5a66"/>`;
  [0.84, 0.89, 0.94].forEach((fx) => {
    s += `<rect x="${(ix + iw * fx).toFixed(1)}" y="${(iy + mh * 0.32).toFixed(1)}" width="${(iw * 0.035).toFixed(1)}" height="${(mh * 0.34).toFixed(1)}" rx="2" fill="#8f99a5"/>`;
  });
  // Dock
  const dw = iw * 0.52, dh = ih * 0.11, dx = ix + (iw - dw) / 2, dy = iy + ih - dh * 1.35;
  s += `<rect x="${dx.toFixed(1)}" y="${dy.toFixed(1)}" width="${dw.toFixed(1)}" height="${dh.toFixed(1)}" rx="${(dh * 0.28).toFixed(1)}" fill="#fff" opacity="0.62"/>`;
  const cols = ["#cfe6f5", "#d6e8d0", "#f5dfc0", "#dcd6f0", "#f5cfd6", "#d0e8e4"];
  for (let i = 0; i < 6; i++) {
    s += `<rect x="${(dx + dw * 0.045 + i * dw * 0.155).toFixed(1)}" y="${(dy + dh * 0.18).toFixed(1)}" width="${(dw * 0.12).toFixed(1)}" height="${(dh * 0.64).toFixed(1)}" rx="${(dh * 0.18).toFixed(1)}" fill="${cols[i]}"/>`;
  }
  if (region === "menubar") s += glowRect(ix, iy, iw, mh, 4);
  if (region === "desktop") s += glowRect(ix + iw * 0.06, iy + mh * 1.4, iw * 0.88, ih - mh * 1.4 - dh * 1.6, 6);
  return s;
}
S["screen-desktop-art"] = (w, h) => desktopShot(w, h, "desktop");
S["screen-menubar-art"] = (w, h) => desktopShot(w, h, "menubar");

/** Everything else: one idea, one picture. */
const cloudPath = (cx, cy, r) =>
  `<path d="M ${(cx - r * 1.5).toFixed(1)} ${(cy + r * 0.45).toFixed(1)} a ${(r * 0.62).toFixed(1)} ${(r * 0.62).toFixed(1)} 0 0 1 ${(r * 0.16).toFixed(1)} ${(-r * 1.18).toFixed(1)} a ${(r * 0.78).toFixed(1)} ${(r * 0.78).toFixed(1)} 0 0 1 ${(r * 1.42).toFixed(1)} ${(-r * 0.34).toFixed(1)} a ${(r * 0.58).toFixed(1)} ${(r * 0.58).toFixed(1)} 0 0 1 ${(r * 1.06).toFixed(1)} ${(r * 0.5).toFixed(1)} a ${(r * 0.55).toFixed(1)} ${(r * 0.55).toFixed(1)} 0 0 1 ${(-r * 0.2).toFixed(1)} ${(r * 1.06).toFixed(1)} Z" fill="#fff" opacity="0.95"/>`;

S["cloud-backup"] = (w, h) => {
  const g = linear([["0", "#8fc4e8"], ["1", "#d8ecf6"]]);
  let s = `<defs>${g.def}</defs><rect width="${w}" height="${h}" fill="url(#${g.gid})"/>`;
  s += cloudPath(w * 0.5, h * 0.32, Math.min(w, h) * 0.2);
  // Phone below, photos rising into the cloud
  const px = w * 0.5 - w * 0.055, py = h * 0.66, pw = w * 0.11, ph = h * 0.3;
  s += `<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" rx="${(pw * 0.18).toFixed(1)}" fill="#2f3540"/>`;
  s += `<rect x="${(px + pw * 0.07).toFixed(1)}" y="${(py + pw * 0.07).toFixed(1)}" width="${(pw * 0.86).toFixed(1)}" height="${(ph - pw * 0.14).toFixed(1)}" rx="${(pw * 0.12).toFixed(1)}" fill="#dfe8f0"/>`;
  [["#f0c07f", -0.14, 0.54], ["#a8d8a0", 0, 0.5], ["#c4b0e8", 0.14, 0.56]].forEach(([c, dx, fy]) => {
    s += `<g transform="rotate(${(dx * 60).toFixed(0)} ${(w * (0.5 + dx)).toFixed(1)} ${(h * fy).toFixed(1)})"><rect x="${(w * (0.5 + dx) - w * 0.038).toFixed(1)}" y="${(h * fy - h * 0.045).toFixed(1)}" width="${(w * 0.076).toFixed(1)}" height="${(h * 0.09).toFixed(1)}" rx="4" fill="#fff"/><rect x="${(w * (0.5 + dx) - w * 0.03).toFixed(1)}" y="${(h * fy - h * 0.035).toFixed(1)}" width="${(w * 0.06).toFixed(1)}" height="${(h * 0.055).toFixed(1)}" rx="2" fill="${c}"/></g>`;
  });
  s += `<path d="M ${(w * 0.5).toFixed(1)} ${(h * 0.62).toFixed(1)} L ${(w * 0.5).toFixed(1)} ${(h * 0.46).toFixed(1)} M ${(w * 0.47).toFixed(1)} ${(h * 0.5).toFixed(1)} L ${(w * 0.5).toFixed(1)} ${(h * 0.455).toFixed(1)} L ${(w * 0.53).toFixed(1)} ${(h * 0.5).toFixed(1)}" stroke="#2f6f9f" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  return s;
};

S["app-vs-web"] = (w, h) => {
  const g = linear([["0", "#eef1f5"], ["1", "#d2dae4"]]);
  let s = `<defs>${g.def}</defs><rect width="${w}" height="${h}" fill="url(#${g.gid})"/>`;
  s += `<line x1="${(w * 0.5).toFixed(1)}" y1="${(h * 0.12).toFixed(1)}" x2="${(w * 0.5).toFixed(1)}" y2="${(h * 0.88).toFixed(1)}" stroke="#a8b4c0" stroke-width="3" stroke-dasharray="9 9"/>`;
  // Left: an app icon on a device home screen
  const px = w * 0.16, py = h * 0.22, pw = w * 0.18, ph = h * 0.56;
  s += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="${(pw * 0.14).toFixed(1)}" fill="#2f3540"/>`;
  s += `<rect x="${(px + pw * 0.06).toFixed(1)}" y="${(py + pw * 0.06).toFixed(1)}" width="${(pw * 0.88).toFixed(1)}" height="${(ph - pw * 0.12).toFixed(1)}" rx="${(pw * 0.09).toFixed(1)}" fill="#e6ecf2"/>`;
  for (let i = 0; i < 6; i++) {
    const c = ["#7fb4e0", "#8fc48f", "#e8b46f", "#c4a8e0", "#e08f9f", "#7fc4bc"][i];
    s += `<rect x="${(px + pw * 0.16 + (i % 2) * pw * 0.38).toFixed(1)}" y="${(py + ph * 0.14 + Math.floor(i / 2) * ph * 0.22).toFixed(1)}" width="${(pw * 0.3).toFixed(1)}" height="${(pw * 0.3).toFixed(1)}" rx="${(pw * 0.08).toFixed(1)}" fill="${c}"/>`;
  }
  // Right: a browser window with an address bar
  const bx = w * 0.56, by = h * 0.28, bw = w * 0.36, bh = h * 0.44;
  s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="8" fill="#fff"/>`;
  s += `<rect x="${bx}" y="${by}" width="${bw}" height="${(bh * 0.2).toFixed(1)}" rx="8" fill="#e4e9ef"/>`;
  s += `<rect x="${(bx + bw * 0.06).toFixed(1)}" y="${(by + bh * 0.055).toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${(bh * 0.09).toFixed(1)}" rx="${(bh * 0.045).toFixed(1)}" fill="#fff"/>`;
  for (let i = 0; i < 5; i++) {
    s += `<rect x="${(bx + bw * 0.07).toFixed(1)}" y="${(by + bh * 0.32 + i * bh * 0.12).toFixed(1)}" width="${(bw * (i === 4 ? 0.4 : 0.84)).toFixed(1)}" height="${(bh * 0.055).toFixed(1)}" rx="3" fill="#c8d0d8"/>`;
  }
  return s;
};

S["hardware-trouble"] = (w, h) => {
  let s = laptop(w, h, "none");
  const cx = w * 0.74, cy = h * 0.3, r = Math.min(w, h) * 0.13;
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f0b429"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${(r * 0.86).toFixed(1)}" fill="#fdf6e4"/>`;
  s += `<rect x="${(cx - r * 0.09).toFixed(1)}" y="${(cy - r * 0.46).toFixed(1)}" width="${(r * 0.18).toFixed(1)}" height="${(r * 0.6).toFixed(1)}" rx="${(r * 0.09).toFixed(1)}" fill="#a5701f"/>`;
  s += `<circle cx="${cx}" cy="${(cy + r * 0.4).toFixed(1)}" r="${(r * 0.11).toFixed(1)}" fill="#a5701f"/>`;
  return s;
};

S["peripheral-trouble"] = (w, h) => {
  const g = linear([["0", "#f2f4f7"], ["1", "#d0d8e0"]]);
  let s = `<defs>${g.def}</defs><rect width="${w}" height="${h}" fill="url(#${g.gid})"/>`;
  // The laptop side, with one socket empty.
  const lx = w * 0.62, ly = h * 0.3, lw = w * 0.3, lh = h * 0.4;
  s += drop(lx + lw / 2, ly + lh + h * 0.03, lw * 0.5, h * 0.02);
  s += `<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="10" fill="#8f9baa"/>`;
  s += `<rect x="${lx}" y="${ly}" width="${lw}" height="${(lh * 0.16).toFixed(1)}" rx="10" fill="#a8b4c0"/>`;
  const portY = ly + lh * 0.46, portW = lw * 0.16, portH = lh * 0.11;
  s += `<rect x="${(lx - portW * 0.3).toFixed(1)}" y="${portY.toFixed(1)}" width="${portW.toFixed(1)}" height="${portH.toFixed(1)}" rx="3" fill="#39414a"/>`;
  s += `<rect x="${(lx - portW * 0.3).toFixed(1)}" y="${(portY + lh * 0.22).toFixed(1)}" width="${portW.toFixed(1)}" height="${portH.toFixed(1)}" rx="3" fill="#39414a"/>`;

  // The mouse, and a plug that stops short of the socket.
  const mx = w * 0.22, my = h * 0.58, mw = w * 0.13, mh = h * 0.28;
  s += drop(mx, my + mh * 0.55, mw * 0.6, mh * 0.09);
  s += `<rect x="${(mx - mw / 2).toFixed(1)}" y="${(my - mh / 2).toFixed(1)}" width="${mw.toFixed(1)}" height="${mh.toFixed(1)}" rx="${(mw / 2).toFixed(1)}" fill="#d4dbe2"/>`;
  s += `<path d="M ${(mx - mw / 2).toFixed(1)} ${(my - mh * 0.16).toFixed(1)} a ${(mw / 2).toFixed(1)} ${(mh * 0.34).toFixed(1)} 0 0 1 ${mw.toFixed(1)} 0 Z" fill="#eef2f6"/>`;
  s += `<line x1="${mx.toFixed(1)}" y1="${(my - mh / 2).toFixed(1)}" x2="${mx.toFixed(1)}" y2="${(my - mh * 0.16).toFixed(1)}" stroke="#9fabb8" stroke-width="3"/>`;
  s += `<rect x="${(mx - mw * 0.055).toFixed(1)}" y="${(my - mh * 0.34).toFixed(1)}" width="${(mw * 0.11).toFixed(1)}" height="${(mh * 0.13).toFixed(1)}" rx="3" fill="#9fabb8"/>`;
  const cableEnd = w * 0.5;
  s += `<path d="M ${(mx + mw * 0.42).toFixed(1)} ${(my - mh * 0.34).toFixed(1)} q ${(w * 0.09).toFixed(1)} ${(-h * 0.16).toFixed(1)} ${(cableEnd - mx - mw * 0.42).toFixed(1)} ${(portY + portH / 2 - my + mh * 0.34).toFixed(1)}" stroke="#6f7b89" stroke-width="8" fill="none" stroke-linecap="round"/>`;
  s += `<rect x="${cableEnd.toFixed(1)}" y="${(portY + portH * 0.06).toFixed(1)}" width="${(portW * 0.75).toFixed(1)}" height="${(portH * 0.88).toFixed(1)}" rx="2" fill="#b4bfcc" stroke="#6f7b89" stroke-width="3"/>`;
  // The gap is the lesson.
  s += glowRect(cableEnd - 8, portY - 10, (lx - portW * 0.3) - cableEnd + portW + 16, portH + 20, 6);
  return s;
};

S["map-route"] = (w, h) => {
  let s = `<rect width="${w}" height="${h}" fill="#e8e4d8"/>`;
  s += `<rect x="0" y="${(h * 0.62).toFixed(1)}" width="${w}" height="${(h * 0.16).toFixed(1)}" fill="#cfe0ec"/>`;
  for (let i = 0; i < 7; i++) {
    s += `<rect x="${(w * (0.05 + i * 0.14)).toFixed(1)}" y="0" width="${(w * 0.02).toFixed(1)}" height="${h}" fill="#f7f5ee"/>`;
  }
  for (let i = 0; i < 5; i++) {
    s += `<rect x="0" y="${(h * (0.08 + i * 0.2)).toFixed(1)}" width="${w}" height="${(h * 0.02).toFixed(1)}" fill="#f7f5ee"/>`;
  }
  for (let i = 0; i < 16; i++) {
    const bx = w * (0.03 + (i % 8) * 0.12), by2 = h * (0.16 + Math.floor(i / 8) * 0.44);
    s += `<rect x="${bx.toFixed(1)}" y="${by2.toFixed(1)}" width="${(w * 0.07).toFixed(1)}" height="${(h * 0.13).toFixed(1)}" rx="3" fill="${i % 3 ? "#dcd6c8" : "#cfd8c8"}"/>`;
  }
  s += `<path d="M ${(w * 0.18).toFixed(1)} ${(h * 0.78).toFixed(1)} L ${(w * 0.34).toFixed(1)} ${(h * 0.78).toFixed(1)} L ${(w * 0.34).toFixed(1)} ${(h * 0.4).toFixed(1)} L ${(w * 0.62).toFixed(1)} ${(h * 0.4).toFixed(1)} L ${(w * 0.62).toFixed(1)} ${(h * 0.22).toFixed(1)}" stroke="#2f6fdf" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const pin = (px, py, c) =>
    `<path d="M ${px.toFixed(1)} ${py.toFixed(1)} c ${(-w * 0.032).toFixed(1)} ${(-h * 0.05).toFixed(1)} ${(-w * 0.032).toFixed(1)} ${(-h * 0.11).toFixed(1)} 0 ${(-h * 0.13).toFixed(1)} c ${(w * 0.032).toFixed(1)} ${(h * 0.02).toFixed(1)} ${(w * 0.032).toFixed(1)} ${(h * 0.08).toFixed(1)} 0 ${(h * 0.13).toFixed(1)} Z" fill="${c}"/>` +
    `<circle cx="${px.toFixed(1)}" cy="${(py - h * 0.088).toFixed(1)}" r="${(w * 0.013).toFixed(1)}" fill="#fff"/>`;
  s += pin(w * 0.18, h * 0.78, "#3f7f4f");
  s += pin(w * 0.62, h * 0.22, "#cf3f3f");
  return s;
};

S["qr-code"] = (w, h, rng) => {
  const g = linear([["0", "#f2f4f7"], ["1", "#d8dee6"]]);
  let s = `<defs>${g.def}</defs><rect width="${w}" height="${h}" fill="url(#${g.gid})"/>`;
  const N = 17, side = Math.min(w, h) * 0.58, cell = side / N;
  const ox = w * 0.5 - side / 2, oy = h * 0.5 - side / 2;
  s += drop(w * 0.5, oy + side + h * 0.03, side * 0.55, h * 0.018);
  s += `<rect x="${(ox - cell).toFixed(1)}" y="${(oy - cell).toFixed(1)}" width="${(side + cell * 2).toFixed(1)}" height="${(side + cell * 2).toFixed(1)}" rx="8" fill="#fff"/>`;
  const finder = (fx, fy) => {
    let t = `<rect x="${(ox + fx * cell).toFixed(1)}" y="${(oy + fy * cell).toFixed(1)}" width="${(cell * 7).toFixed(1)}" height="${(cell * 7).toFixed(1)}" fill="#1d2733"/>`;
    t += `<rect x="${(ox + (fx + 1) * cell).toFixed(1)}" y="${(oy + (fy + 1) * cell).toFixed(1)}" width="${(cell * 5).toFixed(1)}" height="${(cell * 5).toFixed(1)}" fill="#fff"/>`;
    t += `<rect x="${(ox + (fx + 2) * cell).toFixed(1)}" y="${(oy + (fy + 2) * cell).toFixed(1)}" width="${(cell * 3).toFixed(1)}" height="${(cell * 3).toFixed(1)}" fill="#1d2733"/>`;
    return t;
  };
  const inFinder = (r, c) => (r < 8 && c < 8) || (r < 8 && c > N - 9) || (r > N - 9 && c < 8);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (inFinder(r, c)) continue;
      if (rng.f() > 0.52) s += `<rect x="${(ox + c * cell).toFixed(1)}" y="${(oy + r * cell).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" fill="#1d2733"/>`;
    }
  }
  s += finder(0, 0) + finder(N - 7, 0) + finder(0, N - 7);
  return s;
};

S["safe-payment"] = (w, h) => {
  const g = linear([["0", "#e4f0e8"], ["1", "#c2dccc"]]);
  let s = `<defs>${g.def}</defs><rect width="${w}" height="${h}" fill="url(#${g.gid})"/>`;
  const cw = w * 0.44, ch = cw * 0.63, cx = w * 0.5 - cw / 2, cy = h * 0.56 - ch / 2;
  s += drop(w * 0.5, cy + ch + h * 0.04, cw * 0.5, h * 0.02);
  s += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="14" fill="#3f6f8f"/>`;
  s += `<rect x="${cx}" y="${(cy + ch * 0.2).toFixed(1)}" width="${cw}" height="${(ch * 0.17).toFixed(1)}" fill="#22384a"/>`;
  s += `<rect x="${(cx + cw * 0.08).toFixed(1)}" y="${(cy + ch * 0.5).toFixed(1)}" width="${(cw * 0.16).toFixed(1)}" height="${(ch * 0.18).toFixed(1)}" rx="3" fill="#e8c96f"/>`;
  for (let i = 0; i < 4; i++) {
    s += `<rect x="${(cx + cw * 0.3 + i * cw * 0.17).toFixed(1)}" y="${(cy + ch * 0.56).toFixed(1)}" width="${(cw * 0.12).toFixed(1)}" height="${(ch * 0.07).toFixed(1)}" rx="2" fill="#a8c4d8"/>`;
  }
  // Padlock, closed
  const lx = w * 0.5, ly = h * 0.24, lr = Math.min(w, h) * 0.09;
  s += `<path d="M ${(lx - lr * 0.55).toFixed(1)} ${ly.toFixed(1)} a ${(lr * 0.55).toFixed(1)} ${(lr * 0.6).toFixed(1)} 0 0 1 ${(lr * 1.1).toFixed(1)} 0" stroke="#2f6f4f" stroke-width="${(lr * 0.26).toFixed(1)}" fill="none"/>`;
  s += `<rect x="${(lx - lr * 0.8).toFixed(1)}" y="${ly.toFixed(1)}" width="${(lr * 1.6).toFixed(1)}" height="${(lr * 1.2).toFixed(1)}" rx="${(lr * 0.22).toFixed(1)}" fill="#3f8f5f"/>`;
  s += `<circle cx="${lx.toFixed(1)}" cy="${(ly + lr * 0.55).toFixed(1)}" r="${(lr * 0.16).toFixed(1)}" fill="#e4f0e8"/>`;
  return s;
};

S["share-doc"] = (w, h) => {
  const g = linear([["0", "#eef2f7"], ["1", "#cfd9e4"]]);
  let s = `<defs>${g.def}</defs><rect width="${w}" height="${h}" fill="url(#${g.gid})"/>`;
  const dx = w * 0.14, dy = h * 0.18, dw = w * 0.34, dh = h * 0.64;
  s += drop(dx + dw / 2, dy + dh + h * 0.03, dw * 0.5, h * 0.018);
  s += `<rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="8" fill="#fff"/>`;
  s += `<rect x="${dx}" y="${dy}" width="${dw}" height="${(dh * 0.09).toFixed(1)}" rx="8" fill="#4f7fbf"/>`;
  for (let i = 0; i < 8; i++) {
    s += `<rect x="${(dx + dw * 0.1).toFixed(1)}" y="${(dy + dh * 0.2 + i * dh * 0.085).toFixed(1)}" width="${(dw * (i % 4 === 3 ? 0.42 : 0.8)).toFixed(1)}" height="${(dh * 0.035).toFixed(1)}" rx="2" fill="#c8d0d8"/>`;
  }
  // Two people, one link between them
  const face = (fx, fy, r, c) =>
    `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="${r.toFixed(1)}" fill="${c}"/>` +
    `<circle cx="${fx.toFixed(1)}" cy="${(fy - r * 0.28).toFixed(1)}" r="${(r * 0.34).toFixed(1)}" fill="#fff" opacity="0.9"/>` +
    `<path d="M ${(fx - r * 0.52).toFixed(1)} ${(fy + r * 0.62).toFixed(1)} a ${(r * 0.55).toFixed(1)} ${(r * 0.5).toFixed(1)} 0 0 1 ${(r * 1.04).toFixed(1)} 0 Z" fill="#fff" opacity="0.9"/>`;
  s += face(w * 0.72, h * 0.34, Math.min(w, h) * 0.1, "#4f8f9f");
  s += face(w * 0.82, h * 0.66, Math.min(w, h) * 0.1, "#9f6f4f");
  s += `<path d="M ${(dx + dw + w * 0.02).toFixed(1)} ${(h * 0.44).toFixed(1)} L ${(w * 0.66).toFixed(1)} ${(h * 0.36).toFixed(1)} M ${(dx + dw + w * 0.02).toFixed(1)} ${(h * 0.5).toFixed(1)} L ${(w * 0.75).toFixed(1)} ${(h * 0.63).toFixed(1)}" stroke="#4f7fbf" stroke-width="6" stroke-linecap="round" stroke-dasharray="14 10"/>`;
  return s;
};

S["drive-cloud"] = (w, h) => {
  const g = linear([["0", "#9fcfe8"], ["1", "#dff0f8"]]);
  let s = `<defs>${g.def}</defs><rect width="${w}" height="${h}" fill="url(#${g.gid})"/>`;
  s += cloudPath(w * 0.5, h * 0.44, Math.min(w, h) * 0.3);
  // Folders inside the cloud
  const folder = (fx, fy, fw, c) =>
    `<path d="M ${fx.toFixed(1)} ${(fy + fw * 0.16).toFixed(1)} l 0 ${(fw * 0.56).toFixed(1)} l ${fw.toFixed(1)} 0 l 0 ${(-fw * 0.56).toFixed(1)} l ${(-fw * 0.52).toFixed(1)} 0 l ${(-fw * 0.1).toFixed(1)} ${(-fw * 0.12).toFixed(1)} l ${(-fw * 0.38).toFixed(1)} 0 Z" fill="${c}"/>`;
  s += folder(w * 0.34, h * 0.4, w * 0.1, "#e8b45f");
  s += folder(w * 0.47, h * 0.4, w * 0.1, "#7fb4e0");
  s += folder(w * 0.6, h * 0.4, w * 0.1, "#8fc48f");
  return s;
};

S["staying-connected"] = (w, h) => {
  const g = linear([["0", "#f0e8f5"], ["1", "#d4c8e4"]]);
  let s = `<defs>${g.def}</defs><rect width="${w}" height="${h}" fill="url(#${g.gid})"/>`;
  const bubble = (bx, by, bw, bh, c, flip) =>
    `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="${(bh * 0.34).toFixed(1)}" fill="${c}"/>` +
    `<path d="M ${(flip ? bx + bw - bh * 0.1 : bx + bh * 0.1).toFixed(1)} ${(by + bh).toFixed(1)} l ${(flip ? bh * 0.3 : -bh * 0.3).toFixed(1)} ${(bh * 0.3).toFixed(1)} l ${(flip ? -bh * 0.42 : bh * 0.42).toFixed(1)} ${(-bh * 0.14).toFixed(1)} Z" fill="${c}"/>`;
  s += bubble(w * 0.1, h * 0.2, w * 0.42, h * 0.16, "#7f8fd8", false);
  s += bubble(w * 0.44, h * 0.46, w * 0.44, h * 0.16, "#8fc4a8", true);
  s += bubble(w * 0.14, h * 0.7, w * 0.32, h * 0.14, "#7f8fd8", false);
  for (let i = 0; i < 3; i++) {
    s += `<rect x="${(w * 0.16 + i * w * 0.07).toFixed(1)}" y="${(h * 0.26).toFixed(1)}" width="${(w * 0.045).toFixed(1)}" height="${(h * 0.03).toFixed(1)}" rx="4" fill="#fff" opacity="0.65"/>`;
    s += `<rect x="${(w * 0.5 + i * w * 0.07).toFixed(1)}" y="${(h * 0.52).toFixed(1)}" width="${(w * 0.045).toFixed(1)}" height="${(h * 0.03).toFixed(1)}" rx="4" fill="#fff" opacity="0.65"/>`;
  }
  return s;
};

S["settings-adapt"] = (w, h) => {
  const g = linear([["0", "#eef1f5"], ["1", "#cfd6de"]]);
  let s = `<defs>${g.def}</defs><rect width="${w}" height="${h}" fill="url(#${g.gid})"/>`;
  const px = w * 0.14, py = h * 0.16, pw = w * 0.72, ph = h * 0.68;
  s += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="12" fill="#fff"/>`;
  const rows = [
    ["Text size", 0.72], ["Brightness", 0.4], ["Contrast", 0.58],
  ];
  rows.forEach(([label, v], i) => {
    const ry = py + ph * (0.16 + i * 0.2);
    s += `<text x="${(px + pw * 0.07).toFixed(1)}" y="${(ry + 6).toFixed(1)}" font-family="Helvetica,Arial,sans-serif" font-size="${(ph * 0.062).toFixed(1)}" fill="#4f5a66">${label}</text>`;
    s += `<rect x="${(px + pw * 0.42).toFixed(1)}" y="${(ry - ph * 0.014).toFixed(1)}" width="${(pw * 0.5).toFixed(1)}" height="${(ph * 0.028).toFixed(1)}" rx="${(ph * 0.014).toFixed(1)}" fill="#dde3ea"/>`;
    s += `<rect x="${(px + pw * 0.42).toFixed(1)}" y="${(ry - ph * 0.014).toFixed(1)}" width="${(pw * 0.5 * v).toFixed(1)}" height="${(ph * 0.028).toFixed(1)}" rx="${(ph * 0.014).toFixed(1)}" fill="#4f8fcf"/>`;
    s += `<circle cx="${(px + pw * (0.42 + 0.5 * v)).toFixed(1)}" cy="${ry.toFixed(1)}" r="${(ph * 0.038).toFixed(1)}" fill="#fff" stroke="#4f8fcf" stroke-width="4"/>`;
  });
  // Two toggles below
  [["Dark mode", true], ["Reduce motion", false]].forEach(([label, on], i) => {
    const ry = py + ph * (0.72 + i * 0.16);
    s += `<text x="${(px + pw * 0.07).toFixed(1)}" y="${(ry + 6).toFixed(1)}" font-family="Helvetica,Arial,sans-serif" font-size="${(ph * 0.062).toFixed(1)}" fill="#4f5a66">${label}</text>`;
    s += `<rect x="${(px + pw * 0.78).toFixed(1)}" y="${(ry - ph * 0.036).toFixed(1)}" width="${(pw * 0.14).toFixed(1)}" height="${(ph * 0.072).toFixed(1)}" rx="${(ph * 0.036).toFixed(1)}" fill="${on ? "#4f8fcf" : "#c8d0d8"}"/>`;
    s += `<circle cx="${(px + pw * (on ? 0.885 : 0.815)).toFixed(1)}" cy="${ry.toFixed(1)}" r="${(ph * 0.029).toFixed(1)}" fill="#fff"/>`;
  });
  return s;
};

S["holiday-away"] = (w, h) => {
  const sky = linear([["0", "#7fc4e8"], ["0.62", "#ffd8a8"], ["1", "#f5e0c0"]]);
  let s = `<defs>${sky.def}</defs><rect width="${w}" height="${h}" fill="url(#${sky.gid})"/>`;
  s += `<circle cx="${(w * 0.74).toFixed(1)}" cy="${(h * 0.3).toFixed(1)}" r="${(Math.min(w, h) * 0.11).toFixed(1)}" fill="#fff0c0"/>`;
  s += `<rect x="0" y="${(h * 0.62).toFixed(1)}" width="${w}" height="${(h * 0.1).toFixed(1)}" fill="#6fb4cf"/>`;
  s += `<rect x="0" y="${(h * 0.72).toFixed(1)}" width="${w}" height="${(h * 0.28).toFixed(1)}" fill="#f0dcb0"/>`;
  // Deckchair and a closed laptop left behind
  s += `<path d="M ${(w * 0.22).toFixed(1)} ${(h * 0.86).toFixed(1)} L ${(w * 0.34).toFixed(1)} ${(h * 0.68).toFixed(1)} L ${(w * 0.42).toFixed(1)} ${(h * 0.7).toFixed(1)} L ${(w * 0.3).toFixed(1)} ${(h * 0.88).toFixed(1)} Z" fill="#e0654f"/>`;
  s += `<line x1="${(w * 0.24).toFixed(1)}" y1="${(h * 0.88).toFixed(1)}" x2="${(w * 0.36).toFixed(1)}" y2="${(h * 0.74).toFixed(1)}" stroke="#a5825c" stroke-width="7" stroke-linecap="round"/>`;
  s += `<rect x="${(w * 0.52).toFixed(1)}" y="${(h * 0.8).toFixed(1)}" width="${(w * 0.14).toFixed(1)}" height="${(h * 0.03).toFixed(1)}" rx="4" fill="#8f9baa"/>`;
  // Palm
  s += `<path d="M ${(w * 0.82).toFixed(1)} ${(h * 0.86).toFixed(1)} q ${(-w * 0.02).toFixed(1)} ${(-h * 0.24).toFixed(1)} ${(w * 0.01).toFixed(1)} ${(-h * 0.4).toFixed(1)}" stroke="#8a6a4a" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < 5; i++) {
    const a = -140 + i * 55;
    s += `<ellipse cx="${(w * 0.83).toFixed(1)}" cy="${(h * 0.46).toFixed(1)}" rx="${(w * 0.075).toFixed(1)}" ry="${(h * 0.024).toFixed(1)}" fill="#3f8f5f" transform="rotate(${a} ${(w * 0.83).toFixed(1)} ${(h * 0.46).toFixed(1)})"/>`;
  }
  return s;
};

S["graduation"] = (w, h) => {
  const g = radial([["0", "#fff4d8"], ["1", "#e8d9b8"]], { r: 0.75 });
  let s = `<defs>${g.def}</defs><rect width="${w}" height="${h}" fill="url(#${g.gid})"/>`;
  // Certificate
  const cx = w * 0.5, cw = w * 0.5, ch = cw * 0.72, cy = h * 0.56 - ch / 2;
  s += drop(cx, cy + ch + h * 0.04, cw * 0.5, h * 0.02);
  s += `<rect x="${(cx - cw / 2).toFixed(1)}" y="${cy.toFixed(1)}" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" rx="6" fill="#fffdf7"/>`;
  s += `<rect x="${(cx - cw / 2 + 10).toFixed(1)}" y="${(cy + 10).toFixed(1)}" width="${(cw - 20).toFixed(1)}" height="${(ch - 20).toFixed(1)}" rx="3" fill="none" stroke="#c9a45f" stroke-width="4"/>`;
  for (let i = 0; i < 4; i++) {
    s += `<rect x="${(cx - cw * 0.3).toFixed(1)}" y="${(cy + ch * (0.34 + i * 0.13)).toFixed(1)}" width="${(cw * (i === 3 ? 0.28 : 0.6)).toFixed(1)}" height="${(ch * 0.045).toFixed(1)}" rx="3" fill="#d8d2c4"/>`;
  }
  s += `<circle cx="${(cx + cw * 0.3).toFixed(1)}" cy="${(cy + ch * 0.76).toFixed(1)}" r="${(ch * 0.11).toFixed(1)}" fill="#c9a45f"/>`;
  // Cap
  const mx = cx, my = h * 0.22, mw = w * 0.26;
  s += `<polygon points="${mx.toFixed(1)},${(my - mw * 0.16).toFixed(1)} ${(mx + mw / 2).toFixed(1)},${my.toFixed(1)} ${mx.toFixed(1)},${(my + mw * 0.16).toFixed(1)} ${(mx - mw / 2).toFixed(1)},${my.toFixed(1)}" fill="#2f3540"/>`;
  s += `<path d="M ${(mx - mw * 0.22).toFixed(1)} ${(my + mw * 0.07).toFixed(1)} l 0 ${(mw * 0.16).toFixed(1)} q ${(mw * 0.22).toFixed(1)} ${(mw * 0.1).toFixed(1)} ${(mw * 0.44).toFixed(1)} 0 l 0 ${(-mw * 0.16).toFixed(1)} Z" fill="#3f4750"/>`;
  s += `<line x1="${(mx + mw / 2).toFixed(1)}" y1="${my.toFixed(1)}" x2="${(mx + mw * 0.56).toFixed(1)}" y2="${(my + mw * 0.28).toFixed(1)}" stroke="#e0a83f" stroke-width="5"/>`;
  s += `<circle cx="${(mx + mw * 0.56).toFixed(1)}" cy="${(my + mw * 0.3).toFixed(1)}" r="${(mw * 0.045).toFixed(1)}" fill="#e0a83f"/>`;
  return s;
};

// ═══════════════════════════════════════════════════════════════════════════
// Manifest
// ═══════════════════════════════════════════════════════════════════════════

const L = [1440, 960];   // landscape 3:2
const P = [960, 1440];   // portrait
const Q = [1200, 1200];  // square

/** [file, scene, label, size] — label is what the Photos app shows. */
const MANIFEST = [
  ["sunset-beach",      "sunset-beach",      "Sunset at the Beach",   L],
  ["mountain-dawn",     "mountain-dawn",     "Mountains at Dawn",     L],
  ["desert-dunes",      "desert-dunes",      "Desert Dunes",          L],
  ["forest-path",       "forest-path",       "Path Through the Woods", P],
  ["lake-mirror",       "lake-mirror",       "Still Lake",            L],
  ["rolling-hills",     "rolling-hills",     "Rolling Hills",         L],
  ["coastal-cliffs",    "coastal-cliffs",    "Coastal Cliffs",        L],
  ["snow-peaks",        "snow-peaks",        "Snowy Peaks",           L],
  ["autumn-woods",      "autumn-woods",      "Autumn Woods",          L],
  ["river-bend",        "river-bend",        "Bend in the River",     P],
  ["canyon",            "canyon",            "Red Canyon",            L],
  ["wildflower-meadow", "wildflower-meadow", "Wildflower Meadow",     L],
  ["pine-fog",          "pine-fog",          "Pines in the Fog",      L],
  ["tropical-beach",    "tropical-beach",    "Palm Trees",            L],
  ["starry-night",      "starry-night",      "Starry Night",          L],
  ["aurora",            "aurora",            "Northern Lights",       L],
  ["storm-clouds",      "storm-clouds",      "Storm Coming In",       L],
  ["rainbow",           "rainbow",           "Rainbow After Rain",    L],
  ["misty-morning",     "misty-morning",     "Misty Morning",         L],
  ["full-moon",         "full-moon",         "Full Moon",             L],
  ["city-dusk",         "city-dusk",         "City at Dusk",          L],
  ["bridge-night",      "bridge-night",      "Bridge at Night",       L],
  ["street-golden",     "street-golden",     "Golden Hour Street",    L],
  ["rooftops",          "rooftops",          "Rooftops",              L],
  ["harbour",           "harbour",           "Boats in the Harbour",  L],
  ["train-station",     "train-station",     "Train Station",         L],
  ["neon-street",       "neon-street",       "Neon Street",           L],
  ["single-flower",     "single-flower",     "Sunflower",             Q],
  ["leaves",            "leaves",            "Green Leaves",          L],
  ["cactus",            "cactus",            "Cactus at Sunset",      P],
  ["mushrooms",         "mushrooms",         "Toadstools",            L],
  ["succulents",        "succulents",        "Succulents",            Q],
  ["autumn-leaf",       "autumn-leaf",       "A Single Leaf",         Q],
  ["dandelion",         "dandelion",         "Dandelion Seeds",       L],
  ["coffee-cup",        "coffee-cup",        "Morning Coffee",        Q],
  ["bookshelf",         "bookshelf",         "Bookshelf",             L],
  ["windowsill-plant",  "windowsill-plant",  "Plant on the Windowsill", P],
  ["breakfast-table",   "breakfast-table",   "Breakfast",             L],
  ["teapot",            "teapot",            "Teapot",                L],
  ["candle",            "candle",            "Candlelight",           P],
  ["fruit-bowl",        "fruit-bowl",        "Bowl of Fruit",         L],
  ["desk",              "desk",              "My Desk",               L],
  ["bird-branch",       "bird-branch",       "Bird on a Branch",      L],
  ["cat-sleeping",      "cat-sleeping",      "Cat Asleep",            L],
  ["dog-field",         "dog-field",         "Dog in the Field",      L],
  ["fish",              "fish",              "Koi Pond",              L],
  ["butterfly",         "butterfly",         "Butterfly",             L],
  ["gradient-mesh",     "gradient-mesh",     "Color Study",          L],
  ["concentric",        "concentric",        "Rings",                 Q],
  ["geo-tiles",         "geo-tiles",         "Tile Pattern",          Q],
  ["wave-lines",        "wave-lines",        "Wave Lines",            L],
  ["terrazzo",          "terrazzo",          "Terrazzo",              Q],
];

/**
 * Site art — everything that is *not* a photo in the practice Photos library:
 * contact portraits, and the pictures the practice websites hang on.
 *
 * Kept in a second manifest and a second folder because the Photos app renders
 * PHOTO_ASSETS wholesale. An avatar landing in the learner's photo library
 * would be a bug, not a bonus.
 */
const A = [400, 400];    // avatar / square thumb
const W = [900, 600];    // web hero, 3:2
const C = [420, 620];    // book cover

const SITE_MANIFEST = [
  ["avatar-alex",       "avatar-alex",       "Alex",              A],
  ["avatar-jordan",     "avatar-jordan",     "Jordan",            A],
  ["avatar-sam",        "avatar-sam",        "Sam",               A],
  ["avatar-grandma",    "avatar-grandma",    "Grandma",           A],
  ["avatar-doggo",      "avatar-doggo",      "Doggo",             A],
  ["product-laptop",    "product-laptop",    "Laptop",            W],
  ["product-tablet",    "product-tablet",    "Tablet",            W],
  ["product-phone",     "product-phone",     "Phone",             W],
  ["product-headphones","product-headphones","Headphones",        W],
  ["apple-pie",         "apple-pie",         "Apple pie",         W],
  ["soup-bowl",         "soup-bowl",         "Bowl of soup",      W],
  ["tomato-plant",      "tomato-plant",      "Tomato plant",      W],
  ["city-bus",          "city-bus",          "City bus",          W],
  ["cover-garden",      "cover-garden",      "The Maplewood Gardener",   C],
  ["cover-computer",    "cover-computer",    "Understanding Your Computer", C],
  ["cover-soup",        "cover-soup",        "101 Soup Recipes",  C],
  ["cover-walks",       "cover-walks",       "Walks Around the World",   C],
];

// ── Render ───────────────────────────────────────────────────────────────────

async function render(manifest, dir) {
  mkdirSync(dir, { recursive: true });
  const meta = [];
  for (const [file, sceneName, label, [w, h], slug] of manifest) {
    const scene = S[sceneName];
    if (!scene) throw new Error(`No scene named ${sceneName}`);
    uid = 0;
    const rng = makeRng(file);
    const body = scene(w, h, rng);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}${finish(w, h)}</svg>`;
    await sharp(Buffer.from(svg)).webp({ quality: 82, effort: 5 }).toFile(join(dir, `${file}.webp`));
    meta.push({ file, label, w, h, slug });
    process.stdout.write(`  ${file}.webp\n`);
  }
  return meta;
}

/**
 * Lesson art, keyed by lesson slug. The label is the alt text, so it says what
 * is in the picture rather than repeating the lesson title.
 */
const LA = [1200, 800];
const LESSON_MANIFEST = [
  ["part-screen",      "part-screen",      "A laptop with the screen outlined",                 LA, "computer-parts-screen"],
  ["part-keyboard",    "part-keyboard",    "A laptop with the keyboard outlined",               LA, "computer-parts-keyboard"],
  ["part-trackpad",    "part-trackpad",    "A laptop with the trackpad outlined",               LA, "computer-parts-trackpad"],
  ["part-speakers",    "part-speakers",    "A laptop with the speaker grilles outlined",        LA, "computer-parts-speakers"],
  ["part-camera",      "part-camera",      "A laptop with the camera above the screen circled", LA, "computer-parts-camera"],
  ["part-ports",       "part-ports",       "A laptop with the sockets along its edge outlined", LA, "computer-parts-ports"],
  ["laptop-sleep",     "laptop-sleep",     "A closed laptop, asleep",                           LA, "sleep-laptop"],
  ["screen-desktop",   "screen-desktop-art", "A screen with the empty desktop area outlined",   LA, "screen-desktop"],
  ["screen-menubar",   "screen-menubar-art", "A screen with the bar across the top outlined",   LA, "screen-menu-bar"],
  ["key-numbers",      "key-numbers",      "A keyboard with the row of number keys outlined",   LA, "kb-numbers"],
  ["key-caps",         "key-caps",         "A keyboard with the Caps Lock key outlined",        LA, "kb-caps-lock"],
  ["key-ctrl",         "key-ctrl",         "A keyboard with the Ctrl keys outlined",            LA, "kb-command"],
  ["key-escape",       "key-escape",       "A keyboard with the Esc key outlined",              LA, "kb-escape"],
  ["cloud-backup",     "cloud-backup",     "Photos rising from a phone into a cloud",           LA, "cloud-photos"],
  ["app-vs-web",       "app-vs-web",       "App icons on a phone beside a browser window",      LA, "app-vs-website"],
  ["hardware-trouble", "hardware-trouble", "A laptop with a warning sign beside it",            LA, "hardware-problems"],
  ["peripheral-trouble","peripheral-trouble","A mouse whose cable stops short of the socket",   LA, "peripheral-problems"],
  ["map-route",        "map-route",        "A street map with a route between two pins",        LA, "maps-navigation"],
  ["qr-code",          "qr-code",          "A QR code",                                         LA, "qrcodes-siri"],
  ["safe-payment",     "safe-payment",     "A bank card under a closed padlock",                LA, "shopping-banking"],
  ["share-doc",        "share-doc",        "A document linked to two people",                   LA, "google-docs-share"],
  ["drive-cloud",      "drive-cloud",      "Folders inside a cloud",                            LA, "google-drive-basics"],
  ["staying-connected","staying-connected","Message bubbles going back and forth",              LA, "social-media"],
  ["settings-adapt",   "settings-adapt",   "A settings panel of sliders and switches",          LA, "a11y-why"],
  ["holiday-away",     "holiday-away",     "A beach with a deckchair and a closed laptop",      LA, "final-intro"],
  ["graduation",       "graduation",       "A certificate and a graduation cap",                LA, "final-graduation"],
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const meta = [];

  for (const [file, sceneName, label, [w, h]] of MANIFEST) {
    const scene = S[sceneName];
    if (!scene) throw new Error(`No scene named ${sceneName}`);
    uid = 0;
    const rng = makeRng(file);
    const body = scene(w, h, rng);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}${finish(w, h)}</svg>`;
    const out = join(OUT, `${file}.webp`);
    await sharp(Buffer.from(svg)).webp({ quality: 82, effort: 5 }).toFile(out);
    meta.push({ file, label, w, h });
    process.stdout.write(`  ${file}.webp\n`);
  }

  const ts = `// Generated by scripts/generate-photos.mjs — do not edit by hand.\n\n` +
    `export interface PhotoAsset {\n  /** Basename, no extension. */\n  id: string;\n  src: string;\n  label: string;\n  w: number;\n  h: number;\n}\n\n` +
    `export const PHOTO_ASSETS: PhotoAsset[] = [\n` +
    meta.map((m) => `  { id: ${JSON.stringify(m.file)}, src: ${JSON.stringify(`/photos/${m.file}.webp`)}, label: ${JSON.stringify(m.label)}, w: ${m.w}, h: ${m.h} },`).join("\n") +
    `\n];\n\nexport const photoSrc = (id: string) =>\n  PHOTO_ASSETS.find((p) => p.id === id)?.src ?? PHOTO_ASSETS[0].src;\n`;
  writeFileSync(join(ROOT, "lib", "photoAssets.ts"), ts);

  const lessonMeta = await render(LESSON_MANIFEST, join(ROOT, "public", "lesson"));
  const lessonTs = `// Generated by scripts/generate-photos.mjs — do not edit by hand.\n\n` +
    `/** The picture beside a lesson that has no activity. Keyed by lesson slug. */\n` +
    `export const LESSON_ART: Record<string, { src: string; alt: string; caption?: string }> = {\n` +
    lessonMeta.map((m) => `  ${JSON.stringify(m.slug)}: { src: ${JSON.stringify(`/lesson/${m.file}.webp`)}, alt: ${JSON.stringify(m.label)} },`).join("\n") +
    `\n};\n`;
  writeFileSync(join(ROOT, "lib", "lessonArt.ts"), lessonTs);

  const siteMeta = await render(SITE_MANIFEST, join(ROOT, "public", "site"));
  const siteTs = `// Generated by scripts/generate-photos.mjs — do not edit by hand.\n\n` +
    `export interface SiteArt {\n  /** Basename, no extension. */\n  id: string;\n  src: string;\n  /** Alt text. Empty string means the picture is decorative.  */\n  label: string;\n  w: number;\n  h: number;\n}\n\n` +
    `export const SITE_ART: SiteArt[] = [\n` +
    siteMeta.map((m) => `  { id: ${JSON.stringify(m.file)}, src: ${JSON.stringify(`/site/${m.file}.webp`)}, label: ${JSON.stringify(m.label)}, w: ${m.w}, h: ${m.h} },`).join("\n") +
    `\n];\n\nexport const siteArt = (id: string) =>\n  SITE_ART.find((a) => a.id === id)?.src ?? SITE_ART[0].src;\n`;
  writeFileSync(join(ROOT, "lib", "siteArt.ts"), siteTs);

  console.log(
    `\n${meta.length} images → public/photos, manifest → lib/photoAssets.ts` +
    `\n${siteMeta.length} images → public/site, manifest → lib/siteArt.ts`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
