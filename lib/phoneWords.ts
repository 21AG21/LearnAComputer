/**
 * Laptop words, rewritten for a phone, on the way to the screen.
 *
 * The phone course plays 112 of the laptop course's own lesson files. Those are
 * written for a machine with a mouse, a dock, a menu bar and windows, and
 * rewriting them per device would mean two copies of every sentence — which is
 * two things to keep true, and one of them always rots. The swap happens here
 * instead, at render time, so `content/lessons/*.json` stays single-sourced.
 *
 * ## Rules are case-preserving, not listed twice
 *
 * The first version matched lowercase only, and every sentence-initial
 * occurrence leaked: `hover over` was handled, `Hover to reveal its link` was
 * not — in a lesson about touching glass. Each rule is written once, in
 * lowercase, and the replacement takes the capitalization of whatever it
 * matched. Fifteen paired rules became fifteen.
 *
 * ## The rewrite must not produce a sentence that is false
 *
 * `finder-overview` teaches a word by naming it: *"The list on the left is
 * called the sidebar."* Rewriting both halves produced **"The list at the top is
 * called the list"** — a tautology, in the definition sentence of the lesson.
 * Anything of the form *X is called X* is a defect, not a translation, which is
 * why the naming rules run **before** the noun rules and why
 * `scripts/phone-words-check.mjs` fails the build on the shape.
 *
 * Never run this over text that is already in phone language — see
 * `phoneWording={false}` in `SimulatorFrame` and the `kind === "lesson"` guard
 * in `PhoneCourse`. The blanket `laptop → phone` rule turned Unit 1's *"a phone
 * does not need the double tap a laptop does"* into a self-contradiction.
 */

/**
 * [what a laptop lesson says, what the phone shows].
 *
 * Written lowercase and compiled **case-insensitively** — matching lowercase
 * only is exactly the bug this list exists to stop. Order is significant: the
 * specific reading of a phrase must come before the general one.
 */
const RULES: [string, string][] = [
  // ── Naming sentences, first: these define a word, and the noun rules below
  //    would rewrite the definition into a tautology. ──────────────────────
  ["\\bis called the sidebar\\b", "is called the list of places"],
  ["\\bis called the dock\\b", "is called the home screen"],
  ["\\bis called the menu bar\\b", "is called the status strip"],
  ["\\bis called the desktop\\b", "is called the home screen"],

  // ── The double-click, which a phone does not have ────────────────────────
  // Order matters here: the specific readings run before the general one.
  //
  // Opening is a **single** tap on a phone, and `FileManager` now behaves that
  // way. Reacting to a message is a **press and hold** — the lesson already
  // offers that as the alternative, so on a phone it becomes the only one.
  // What is left is genuine double-tapping (selecting a word), which is real on
  // glass and keeps the word.
  ["\\bdouble-click \\(or press and hold\\)", "press and hold"],
  ["\\bdouble-clicking \\(or pressing and holding\\)", "pressing and holding"],
  ["\\bDouble-click (.+?) to open\\b", "Tap $1 to open"],
  ["\\bdouble-click (.+?) to open\\b", "tap $1 to open"],
  ["\\bDouble-click (.+?) to see\\b", "Tap $1 to see"],
  ["\\bdouble-click (.+?) to see\\b", "tap $1 to see"],
  ["\\bDouble-click means two quick clicks on the same file\\.", "One tap opens a file on a phone."],
  ["\\bdouble-click folders and files, but single-click\\b", "tap folders and files, and tap"],
  ["\\bdouble-clicking\\b", "double-tapping"],
  ["\\bdouble-click\\b", "double-tap"],
  ["\\bclicking\\b", "tapping"],
  ["\\bclicked\\b", "tapped"],
  ["\\bclicks\\b", "taps"],
  ["\\bclick\\b", "tap"],
  ["\\bright-click\\b", "press and hold"],
  // No hover on glass. Every one of these steps is already satisfied by a tap
  // in the simulator; the laptop word was the only thing asking for a mouse.
  ["\\bhovering over\\b", "tapping"],
  ["\\bhover over\\b", "tap"],
  ["\\bhovering\\b", "tapping"],
  ["\\bhover\\b", "tap"],
  ["\\byour mouse\\b", "your finger"],
  ["\\bthe mouse\\b", "your finger"],
  ["\\bmouse pointer\\b", "finger"],
  ["\\bthe cursor\\b", "the blinking line"],
  ["\\bcursor\\b", "blinking line"],

  // ── Keys a phone does not have ───────────────────────────────────────────
  // The on-screen keyboard's key says Go, or return. There is nothing labelled
  // Enter for a learner to hunt for, and 21 of the 22 lessons that said so did
  // not hedge.
  ["\\bpress enter\\b", "tap Go"],
  ["\\bpressing enter\\b", "tapping Go"],
  ["\\bhit enter\\b", "tap Go"],
  ["\\bthe enter key\\b", "the Go key"],

  /**
   * A keyboard shortcut offered as an alternative, on a device with no keyboard.
   *
   * These are trailing clauses — "close a tab with its X, **or press Ctrl+W**" —
   * so the sentence is complete without them and dropping the clause is a
   * cleaner translation than inventing a touch equivalent that does not exist.
   * The bullet that is *nothing but* a shortcut goes entirely.
   */
  ["[,;]?\\s*(?:or|and)\\s*(?:press\\s*)?Ctrl\\+[^.]*", ""],
  ["\\u2022 Ctrl\\+[^\\n]*\\n?", ""],

  // ── Furniture ────────────────────────────────────────────────────────────
  // "the left sidebar" is doubly wrong on a phone: there is no sidebar, and the
  // list it means is above the pane, not beside it.
  ["\\bthe left sidebar\\b", "the list at the top"],
  ["\\bin the sidebar\\b", "in the list"],
  ["\\bthe sidebar\\b", "the list"],
  // Bare and possessive forms reach the noun with no "the" in front of it —
  // "the left sidebar", "the Settings sidebar", "the browser's toolbar".
  ["\\bsidebar\\b", "list"],
  ["\\bin the dock below\\b", "on the home screen"],
  ["\\bin the dock\\b", "on the home screen"],
  ["\\bfrom the dock\\b", "from the home screen"],
  ["\\bacross the dock\\b", "across the home screen"],
  ["\\bthe dock\\b", "the home screen"],
  ["\\bin the menu bar\\b", "in the strip at the top"],
  ["\\byour menu bar or taskbar\\b", "the strip at the top"],
  ["\\byour menu bar\\b", "the strip at the top"],
  ["\\byour taskbar\\b", "the strip at the top"],
  ["\\bthe menu bar\\b", "the strip at the top"],
  ["\\bthe taskbar\\b", "the strip at the top"],
  // Bare, last: "in your menu bar or taskbar" reaches the second noun with no
  // article in front of it, and a fallback is cheaper than enumerating them.
  ["\\bmenu bar\\b", "strip at the top"],
  ["\\btaskbar\\b", "strip at the top"],
  ["\\bin the toolbar\\b", "in the row of buttons"],
  ["\\bthe toolbar\\b", "the row of buttons"],
  ["\\btoolbar\\b", "row of buttons"],
  ["\\bon your desktop\\b", "on your home screen"],
  ["\\bthe desktop\\b", "the home screen"],
  ["\\bthis desktop\\b", "this home screen"],
  // The stacked list is above the pane, not beside it.
  ["\\bthe list on the left\\b", "the list at the top"],
  ["\\bon the left\\b", "at the top"],

  // ── Windows ──────────────────────────────────────────────────────────────
  ["\\ba window will pop up\\b", "it will open"],
  ["\\bwindow animations\\b", "screen animations"],
  ["\\bin one window\\b", "in one browser"],
  ["\\bthe window\\b", "the screen"],
  ["\\ba window\\b", "a screen"],

  // ── Form vocabulary: a phone learner sees boxes, not fields ──────────────
  ["\\bthe to field\\b", "the To box"],
  ["\\bthe subject field\\b", "the Subject box"],
  ["\\banother field\\b", "another box"],
  ["\\beach field\\b", "each box"],
  ["\\bthe field\\b", "the box"],

  // ── And it is not a laptop. One Final Assessment title says so out loud. ──
  ["\\blaptop\\b", "phone"],
];

/** Compiled once. Building 60 RegExps per string ran on every banner render. */
const COMPILED: [RegExp, string][] = RULES.map(([src, to]) => [new RegExp(src, "gi"), to]);

export function inPhoneWords(text: string): string {
  let out = text;
  for (const [re, to] of COMPILED) {
    re.lastIndex = 0;
    out = to.includes("$")
      ? out.replace(re, to)
      : out.replace(re, (m) => (/^[A-Z]/.test(m) ? to.charAt(0).toUpperCase() + to.slice(1) : to));
  }
  return out;
}

/**
 * The words that mean this rewrite missed something, for the gate.
 *
 * Exported rather than duplicated in the script: a check with its own copy of
 * the list is a check that goes quietly out of date with the thing it guards.
 */
export const LAPTOP_WORDS = [
  "double-click",
  "click",
  "hover",
  "mouse",
  "cursor",
  "press Enter",
  "sidebar",
  "the dock",
  "menu bar",
  "taskbar",
  "toolbar",
  "desktop",
  "laptop",
  "trackpad",
  "Ctrl+",
  "Task Manager",
];
