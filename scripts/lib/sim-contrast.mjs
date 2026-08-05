/**
 * The one contrast measurement used inside the simulated computer.
 *
 * Shared by `simdark-check` (the nine dock apps, both themes) and
 * `sim-contrast-check` (every activity in the course, light mode). It lives here
 * because two callers measuring "the same" thing with two copies of the maths is
 * how a repo ends up with two different answers and no way to tell which is right.
 *
 * Runs inside the page via `page.evaluate`, so it must stay self-contained: no
 * imports, no closures over module scope. Playwright stringifies it.
 */

export const MEASURE = (wantDark) => {
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

  /**
   * In dark mode the desktop root carries `.sim-dark`, and nothing else will do —
   * falling back to any other element would mean measuring the *light* desktop and
   * reporting it as dark, so a missing class is a hard error.
   *
   * Light mode has no such class, and no single element either. `DesktopLaunch`
   * unmounts `FakeDesktop` the moment the learner opens the app, so on most
   * activities the desktop root is gone by the time there is anything to measure;
   * full-bleed activities never had one. The fall-through goes desktop → simulator
   * frame → harness host, which between them cover every activity in the course.
   */
  const scope = wantDark
    ? document.querySelector(".sim-dark")
    : document.querySelector("[data-sim-desktop]") ??
      document.querySelector("[data-sim-frame]") ??
      document.querySelector("[data-stray-host]") ??
      // The simulated *phone*, for `phone-check`. Added to the shared chain rather
      // than forked into a fourth copy of this maths: the phone course spends its
      // whole life inside a playground too, and it would otherwise be the one
      // playground in the repo whose colours nobody ever looked at.
      document.querySelector("[data-phone-screen]");
  if (!scope) {
    return { error: wantDark ? "no .sim-dark root — dark mode did not turn on" : "nothing mounted to measure" };
  }

  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };

  /**
   * The ground actually behind this text, compositing translucent layers.
   *
   * Taking the first ancestor with alpha ≥ 0.85 and ignoring everything thinner
   * gets scrims exactly wrong. The celebration overlay is `bg-black/30` over the
   * app, and skipping it reported the white congratulation text as white-on-white
   * at 1:1 — the same wrong-layer mistake `contrast-check` made over the homepage
   * photos, in a different disguise.
   *
   * So: collect every painted layer up to the first opaque one, then composite
   * them back down. If nothing opaque is found, assume the page's white beneath,
   * which is what `<body>` actually is.
   */
  const groundOf = (el) => {
    const layers = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.001) {
        layers.push(c);
        if (c.a >= 0.999) break;
      }
      n = n.parentElement;
    }
    if (!layers.length) return null;
    let out = layers[layers.length - 1];
    if (out.a < 0.999) out = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) {
      const t = layers[i];
      if (t.a >= 0.999) { out = t; continue; }
      out = {
        r: t.r * t.a + out.r * (1 - t.a),
        g: t.g * t.a + out.g * (1 - t.a),
        b: t.b * t.a + out.b * (1 - t.a),
        a: 1,
      };
    }
    return { color: { r: Math.round(out.r), g: Math.round(out.g), b: Math.round(out.b), a: 1 }, on: el };
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
  const okText = [];
  const badUi = [];
  let okUi = 0;
  let skipped = 0;

  for (const el of scope.querySelectorAll("*")) {
    if (el.closest("[data-sim-paper]")) {
      skipped++;
      continue;
    }
    if (!visible(el)) continue;

    // 1. A near-white neutral ground of its own — a dark-mode question only. In
    //    light mode a white sidebar is the correct answer, so asking there produced
    //    69 "findings" that were simply the product working.
    const own = wantDark ? parse(getComputedStyle(el).backgroundColor) : null;
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

    /**
     * An emoji paints itself. It ignores `color` entirely, so scoring the
     * element's text color against its background says nothing about whether the
     * glyph is legible — the App Market's twelve app tiles were reported as
     * eleven of the nineteen "accent" shortfalls purely because a 🧩 sits on a
     * purple square. Text characters like ✓ and ✕ *do* use `color` and stay in.
     * Skipped only when there is nothing but pictographs to measure.
     */
    const t0 = el.textContent.trim();
    if (t0 && !/[\p{L}\p{N}]/u.test(t0) && /\p{Extended_Pictographic}/u.test(t0)) continue;

    /**
     * Disabled controls are exempt, and this is WCAG's own carve-out rather than a
     * convenience: 1.4.3 does not apply to "text or images of text that are part of
     * an inactive user interface component". The messaging app's "Start Chat" is
     * gray-500 on gray-200 until you tick somebody — 3.9:1, and *looking* muted is
     * the entire point. Darkening it to satisfy a checker would make a disabled
     * button look enabled, which is a worse bug than the one being fixed.
     */
    if (el.closest("[disabled],[aria-disabled='true']")) continue;
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
    else badText.push(rec);
  }

  /**
   * WCAG 1.4.11, non-text contrast: the visual information needed to identify a
   * user-interface component must reach 3:1 against what is adjacent to it.
   *
   * In practice, for this product, that means the *border* of an interactive
   * control — the thing that says "this is a box you can type in" as opposed to a
   * sentence. Nothing has ever scored these. Scoped to real controls rather than
   * every bordered div, because a decorative hairline between two paragraphs is
   * not a component boundary and treating it as one produces noise instead of
   * findings.
   *
   * Disabled controls are exempt, same carve-out as 1.4.3.
   */
  const FIELDS = "input, select, textarea, [contenteditable='true']";
  const BUTTONS = "button, [role='button'], [role='checkbox'], [role='switch']";
  for (const el of scope.querySelectorAll(`${FIELDS}, ${BUTTONS}`)) {
    if (el.closest("[data-sim-paper]")) continue;
    if (!visible(el)) continue;
    if (el.closest("[disabled],[aria-disabled='true']")) continue;
    const cs = getComputedStyle(el);
    const sides = [
      parseFloat(cs.borderTopWidth) || 0, parseFloat(cs.borderBottomWidth) || 0,
      parseFloat(cs.borderLeftWidth) || 0, parseFloat(cs.borderRightWidth) || 0,
    ];
    const w = Math.max(...sides);
    if (w < 1) continue; // no border is a design choice, not a failing border

    /**
     * Which borders actually carry 1.4.11, and which are furniture.
     *
     * A **form field's** border is the affordance: it is the only thing saying
     * "you can type here", and for an audience that struggles to find the text box
     * that matters more than it does anywhere else. Always scored.
     *
     * A **button's** border only matters when it is the sole boundary. A filled
     * button is identified by its fill; the outline is decoration. And a button
     * with only a *bottom* border is a list row — Mail's inbox, the folder list —
     * where the hairline separates rows rather than identifying a control. The
     * first version scored those too and reported every list separator in the
     * course as a failure, which would have meant drawing hard dark rules through
     * every list to satisfy a checker.
     */
    const isField = el.matches(FIELDS);
    if (!isField) {
      const boxed = sides.every((x) => x >= 1);
      if (!boxed) continue;
      const ownBg = parse(cs.backgroundColor);
      const parentGround = el.parentElement ? groundOf(el.parentElement) : null;
      const filled =
        ownBg && ownBg.a >= 0.85 && parentGround &&
        (ownBg.r !== parentGround.color.r || ownBg.g !== parentGround.color.g || ownBg.b !== parentGround.color.b);
      if (filled) continue;
    }
    const bc = parse(cs.borderTopColor);
    if (!bc || bc.a < 0.85) continue;

    // Adjacent means what is *outside* the control, which is the parent's ground —
    // scoring a border against its own fill answers a different question.
    const outside = el.parentElement ? groundOf(el.parentElement) : null;
    if (!outside) continue;
    const cr2 = ratio(lum(bc.r, bc.g, bc.b), lum(outside.color.r, outside.color.g, outside.color.b));
    if (cr2 >= 3) { okUi++; continue; }
    badUi.push({
      tag: el.tagName.toLowerCase(),
      ratio: Math.round(cr2 * 100) / 100,
      need: 3,
      fg: `${bc.r},${bc.g},${bc.b}`,
      bg: `${outside.color.r},${outside.color.g},${outside.color.b}`,
      text: (el.textContent || "").trim().slice(0, 40) || el.getAttribute("aria-label") || el.tagName,
      cls: (el.getAttribute("class") || "").slice(0, 110),
    });
  }

  return { lightSurfaces, badText, badUi, okCount: okText.length, okUiCount: okUi, skipped };
};
