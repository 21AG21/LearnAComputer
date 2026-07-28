/**
 * The solve-check solver.
 *
 * `check-lessons.py` proves a step's target exists in the simulator's data.
 * `/dev/mount-check` proves the activity renders. Neither proves a learner can
 * *finish* — and two lessons shipped that nobody could finish, invisible to
 * both. This closes that gap: it plays every guided lesson to the end.
 *
 * The trick is that it does not need to know each simulator's internals. Every
 * guided step highlights exactly the control the learner must use next, so the
 * solver follows the highlight: find the ring, act on what it points at, check
 * the activity moved. A step whose ring points at nothing, at something
 * unreachable, or at a control whose handler ignores it, fails here — which is
 * exactly the shape of both historical bugs.
 *
 * Development only. Nothing here is imported by the course.
 */

import {
  click,
  doubleClick,
  dragBy,
  dragTo,
  isContentEditable,
  isRange,
  isReachable,
  isTextInput,
  key,
  longPress,
  rightClick,
  setRange,
  textOf,
  typeInto,
  wait,
  yieldMacrotask,
} from "./gestures";

/** How a guided step looks from out here. Every sim's step type is a superset of this. */
export interface AnyStep {
  say: string;
  action?: string;
  check?: string;
  target?: string;
  value?: string;
  url?: string;
  query?: string;
  title?: string;
  file?: string;
  into?: string;
  via?: string;
  to?: string;
  page?: string;
  min?: number;
  max?: number;
  minStrength?: number;
}

export interface SolveOutcome {
  ok: boolean;
  /** Steps (guided) or objectives (assessment) satisfied when the solver stopped. */
  progress: number;
  total: number;
  /** Why it stopped, when it did not finish. */
  reason?: string;
  /** The `say` line of the step it could not get past — the thing a learner would be staring at. */
  stuckSay?: string;
  /** What the screen looked like at the moment of failure — for diagnosing, not for learners. */
  debug?: string;
  elapsedMs: number;
}

/** A one-line description of the screen, captured when a lesson fails. */
function describeScreen(root: HTMLElement): string {
  const ringDescr = Array.from(root.querySelectorAll<HTMLElement>(RING))
    .slice(0, 3)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return `${el.tagName.toLowerCase()}"${textOf(el).slice(0, 22)}"@${Math.round(r.width)}x${Math.round(r.height)}${isReachable(el) ? "" : "!unreachable"}`;
    });
  const buttons = Array.from(root.querySelectorAll<HTMLElement>("button"))
    .filter(isReachable)
    .slice(0, 10)
    .map((b) => textOf(b).slice(0, 14) || b.getAttribute("aria-label")?.slice(0, 14) || "?");
  return `rings=[${ringDescr.join(", ")}] buttons=[${buttons.join("|")}]`;
}

/**
 * Task types the solver deliberately does not play, with the reason. Listed
 * rather than silently skipped: an exemption is a claim, and a claim should be
 * readable.
 */
export const EXEMPT: Record<string, string> = {
  "real-world": "Checks the learner's own machine — there is nothing on the page to drive.",
  "shape-click-game": "Reflex game against moving targets; timing, not steps.",
  "keyboard-nav-game": "Focus-order game; covered by its own lesson's Tab sequence.",
  "match-parts": "Drag-match onto image coordinates, not highlighted controls.",
  "pinch-zoom": "Needs a real trackpad pinch / ctrl+wheel at a specific zoom level.",
  "browser-scroll-code": "Reads a code rendered off-screen; needs real scrolling.",
  none: "No activity.",
  placeholder: "No activity.",
};

/**
 * A rolling trace of what the solver did, kept on `window` so the headless
 * runner can print it when a lesson fails. Costs nothing to leave on.
 */
function trace(line: string) {
  const w = window as unknown as { __solveTrace?: string[] };
  (w.__solveTrace ??= []).push(line);
  if (w.__solveTrace!.length > 120) w.__solveTrace!.shift();
}

/** Rotates where the nav-hunt starts, so it visits every place instead of ping-ponging. */
let navSpin = 0;

/**
 * Navigation labels across the sims — where the hunt looks when a target is not
 * on screen. Also the labels the action-button matcher must never treat as an
 * action's own control.
 */
const NAV_LABELS = [
  "Home", "Documents", "Pictures", "Downloads", "Trash", "Inbox", "All Photos", "Store", "My Apps", "Contacts",
  // Settings sections — a toggle lives behind its section, so the hunt must open them.
  "Appearance", "Display", "Accessibility", "WiFi", "Bluetooth", "Notifications", "Storage", "Privacy", "About",
];

/** Anything the sims use to mean "this is the control you want next". */
const RING = [
  "[class*='ring-yellow']",
  "[class*='animate-ring-pulse']",
  "[class*='border-yellow-400'][class*='animate-pulse']",
].join(",");

/** Steps opened by a double-click in every sim that has them. */
const DOUBLE_CLICK = new Set(["open-file", "open-folder"]);

/** Window-frame steps satisfied by dragging, not clicking — the ring sits on the handle. */
const DRAG_ACTIONS = new Set(["move", "resize"]);

/** Window-frame steps whose control is one of the aria-labelled WindowControls buttons. */
const WINDOW_BUTTON: Record<string, string> = {
  minimize: "Minimize",
  maximize: "Maximize",
  "restore-max": "Maximize",
  close: "Close",
  "close-app": "Close",
};

/**
 * Dialog steps whose only control is an obvious confirm button with no ring — a
 * learner sees a dialog and clicks OK; the solver does the same.
 */
const CONFIRM_LABELS = ["OK", "Got it", "Continue", "Done", "Close", "Dismiss", "Restart", "Yes"];

/** Notes shortcuts must come from the keyboard — clicking the toolbar button is nudged, by design. */
const SHORTCUT_KEYS: Record<string, { k: string; mods?: Partial<KeyboardEventInit> }> = {
  "select-all": { k: "a" },
  bold: { k: "b" },
  italic: { k: "i" },
  underline: { k: "u" },
  copy: { k: "c" },
  cut: { k: "x" },
  paste: { k: "v" },
  undo: { k: "z" },
  redo: { k: "z", mods: { shiftKey: true } },
};

/** A password that clears the top strength band, for steps that ask for a strong one. */
const STRONG_PASSWORD = "Purple-Otter-42!";

/** The text a step wants typed, if it wants any. */
function valueFor(step: AnyStep): string | null {
  switch (step.action) {
    case "navigate":
      return step.url ?? null;
    case "search":
      return step.query ?? step.value ?? null;
    case "type-password":
    case "type-login-password":
      // The lesson may prescribe the exact password ("Type 'Secure#2025!'") —
      // the sim checks for it, so an invented strong one never completes.
      return step.value ?? STRONG_PASSWORD;
    case "type-new-password":
      return step.value ?? STRONG_PASSWORD;
    case "enter-2fa-code":
      // GuidedSecurityTask derives the displayed code from the step, falling back to this.
      return step.value ?? "482913";
    case "type-in-app":
      return "Testing that this app still works.";
    case "type":
      return step.value && step.value !== "any" ? step.value : "Practice text";
    case "send-message":
    case "send-group-message":
      // An empty `value` means "any message counts" — but an empty draft cannot
      // be sent, so the solver still has to say *something*.
      return step.value || "Cats are my favorite";
    default:
      return step.value ?? null;
  }
}

/** What the page looks like right now, for deciding whether a gesture did anything. */
interface Snapshot {
  progress: number;
  done: boolean;
  ring: string;
  body: number;
  /** Assessment: per-objective bitstring ("0100…"); empty in guided mode. */
  objdone: string;
}

function readFrame(root: HTMLElement) {
  return root.querySelector<HTMLElement>("[data-sim-frame]");
}

function snapshot(root: HTMLElement): Snapshot {
  const frame = readFrame(root);
  const rings = Array.from(root.querySelectorAll<HTMLElement>(RING));
  return {
    progress: Number(frame?.dataset.simProgress ?? 0),
    done: frame?.dataset.simDone === "1",
    // Position and text together: a ring that moves to another control is progress
    // even when the step counter has not moved (multi-phase steps do exactly that).
    ring: rings
      .map((el) => {
        const r = el.getBoundingClientRect();
        return `${Math.round(r.left)},${Math.round(r.top)},${textOf(el).slice(0, 24)}`;
      })
      .join("|"),
    body: root.querySelectorAll("*").length,
    objdone: frame?.dataset.simObjdone ?? "",
  };
}

function changed(a: Snapshot, b: Snapshot): boolean {
  return a.progress !== b.progress || a.done !== b.done || a.ring !== b.ring || a.body !== b.body;
}

/** Rings, innermost first — an inner ring is the more specific target when they nest. */
function rings(root: HTMLElement): HTMLElement[] {
  const all = Array.from(root.querySelectorAll<HTMLElement>(RING)).filter(isReachable);
  return all.filter((el) => !all.some((other) => other !== el && el.contains(other)));
}

type Gesture = () => void | Promise<unknown>;

/** The gestures worth trying on this element for this step, best first. */
function gesturesFor(step: AnyStep, el: HTMLElement, root: HTMLElement): Gesture[] {
  const out: Gesture[] = [];
  const action = step.action ?? "";
  const value = valueFor(step);

  // Window-frame steps: the ring is on the drag handle, and clicking it does
  // nothing (or worse — the title bar contains the Minimize button). A `move`
  // WITH a target is a different animal — a file dragged into a folder.
  if (DRAG_ACTIONS.has(action) && !step.target) {
    out.push(() => dragBy(el, 70, 55));
    return out;
  }

  if (action === "move" && step.target && step.into) {
    const dest = Array.from(root.querySelectorAll<HTMLElement>("*")).find(
      (n) => isReachable(n) && textOf(n) === step.into,
    );
    if (dest) {
      out.push(() => dragTo(el, dest));
      // Both file sims also accept click-the-file-then-click-the-folder.
      out.push(async () => {
        click(el);
        await wait(30);
        click(dest);
      });
    }
  }

  // Selecting with the keyboard: the ring marks the file, but clicking it is
  // nudged away by design — the keydown listener sits on the focusable grid
  // above it, so that is where the keys go (focused first, like real hands).
  // Selection is a class-only change the solver's snapshot cannot see, so the
  // gesture presses through the whole list itself and watches the step counter.
  // No early return: before the app opens, the ring is the *dock icon*, and the
  // click fallback below is what launches it.
  if (action === "arrow-select") {
    out.push(async () => {
      const grid = el.closest<HTMLElement>("[tabindex]") ?? el;
      const frame = root.querySelector<HTMLElement>("[data-sim-frame]");
      const startProgress = frame?.dataset.simProgress;
      grid.focus();
      for (let i = 0; i < 12; i++) {
        key(grid, "ArrowDown");
        await wait(40);
        if (frame?.dataset.simProgress !== startProgress) break;
      }
    });
  }

  // A shortcut lesson is about the keyboard; the ring is only a hint.
  const shortcut = SHORTCUT_KEYS[action];
  if (shortcut) {
    const editor = root.querySelector<HTMLElement>("[contenteditable='true']") ?? el;
    out.push(() => {
      editor.focus();
      key(editor, shortcut.k, { ctrlKey: true, metaKey: true, ...shortcut.mods });
    });
  }

  const range = isRange(el) ? el : el.querySelector<HTMLInputElement>("input[type='range']");
  if (range) {
    const lo = step.min ?? Number(range.min || 0);
    const hi = step.max ?? Number(range.max || 100);
    out.push(() => setRange(range, Math.round((lo + hi) / 2)));
  }

  const select = el instanceof HTMLSelectElement ? el : el.querySelector("select");
  if (select instanceof HTMLSelectElement) {
    out.push(() => {
      const match = Array.from(select.options).find(
        (o) => !value || o.text.toLowerCase().includes(value.toLowerCase()),
      );
      select.value = (match ?? select.options[select.options.length - 1]).value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  const field =
    isTextInput(el) || isContentEditable(el)
      ? el
      : el.querySelector<HTMLElement>("input:not([type='range']), textarea, [contenteditable='true']");
  if (field && value !== null) {
    out.push(() => typeInto(field, value, { enter: true }));
    // Enter does not submit everywhere — a visible Send/dedicated button finishes
    // the job the way a mouse-first learner would.
    const send = Array.from(root.querySelectorAll<HTMLElement>("button")).find(
      (b) => isReachable(b) && /^(send|save|submit|search)$/i.test(textOf(b) || b.getAttribute("aria-label") || ""),
    );
    if (send) {
      out.push(async () => {
        await typeInto(field, value, { enter: false });
        click(send);
      });
    }
  }
  if (field && value === null && action.startsWith("type")) {
    out.push(() => typeInto(field, "Practice text", { enter: false }));
  }

  if (DOUBLE_CLICK.has(action)) {
    // Keyboard-only lessons open the selected item with Enter on the grid and
    // nudge the mouse away — try the keyboard door first; it is harmless elsewhere.
    const grid = el.closest<HTMLElement>("[tabindex]");
    if (grid) {
      out.push(() => {
        grid.focus();
        key(grid, "Enter");
      });
    }
    out.push(() => doubleClick(el));
  }
  if (action === "add-reaction") {
    out.push(() => doubleClick(el));
    out.push(() => longPress(el));
  }
  if (action === "browser-right-click" || action === "right-click") out.push(() => rightClick(el));

  out.push(() => click(el));

  // Last resort for a ring on a container: click whatever button is inside it.
  const inner = el.querySelector<HTMLElement>("button, a, [role='button']");
  if (inner && inner !== el) out.push(() => click(inner));

  return out;
}

/**
 * Gestures to try when nothing on screen carries a ring. Assessment mode never
 * highlights, so it lives here; guided mode reaching here is close to a failure
 * and only a handful of steps legitimately have no on-screen target.
 */
function ringlessGestures(step: AnyStep, root: HTMLElement): Gesture[] {
  const out: Gesture[] = [];
  const action = step.action ?? "";
  const value = valueFor(step);

  const byLabel = (label: string) =>
    Array.from(root.querySelectorAll<HTMLElement>(`[aria-label="${label}"]`)).filter(isReachable);

  // Window management without a ring (assessment mode, or panels the sim leaves
  // unhighlighted): the WindowControls buttons carry aria-labels.
  const winButton = WINDOW_BUTTON[action];
  if (winButton) for (const el of byLabel(winButton)) out.push(() => click(el));

  if (DRAG_ACTIONS.has(action)) {
    const handles = Array.from(
      root.querySelectorAll<HTMLElement>("[class*='cursor-grab'], [class*='cursor-se-resize'], [aria-label='Drag to resize']"),
    ).filter(isReachable);
    for (const h of handles) out.push(() => dragBy(h, 70, 55));
  }

  // `restore` / `restart-app` / `open-app`: the control is a dock icon. Prefer the
  // one named by the step; otherwise try each dock button until the step reacts.
  if (["restore", "open-app", "restart-app"].includes(action)) {
    const dock = Array.from(root.querySelectorAll<HTMLElement>("button[aria-label]")).filter(
      (b) => isReachable(b) && !!b.querySelector("img, span"),
    );
    const named = step.target
      ? dock.filter((b) => (b.getAttribute("aria-label") ?? "").toLowerCase().includes(step.target!.toLowerCase()))
      : [];
    for (const b of [...named, ...dock].slice(0, 12)) out.push(() => click(b));
  }

  // A dialog with an obvious confirm button and no ring: click it, like anyone would.
  if (!step.target && value === null) {
    const buttons = Array.from(root.querySelectorAll<HTMLElement>("button")).filter(isReachable);
    for (const label of CONFIRM_LABELS) {
      const hit = buttons.find((b) => textOf(b) === label);
      if (hit) out.push(() => click(hit));
    }
  }

  const shortcut = SHORTCUT_KEYS[action];
  if (shortcut) {
    const editor = root.querySelector<HTMLElement>("[contenteditable='true']");
    if (editor) out.push(() => { editor.focus(); key(editor, shortcut.k, { ctrlKey: true, metaKey: true, ...shortcut.mods }); });
  }

  // The action's own words name its control more often than not: `new-folder` is
  // a "New Folder" button, `create-album` a "New Album" one, `mark-spam` a
  // "Spam" button. Where the UI words differ from the action's, the synonym
  // table bridges them — "delete" is a button called Move to Trash.
  const ACTION_SYNONYMS: Record<string, string> = {
    delete: "trash remove",
    restore: "put back restore",
    recover: "recover put back",
    unspam: "not spam",
    "reading-list-add": "reading list",
    favorite: "favorite favourite",
    unfavorite: "favorite favourite",
  };
  const actionWords = `${action.replace(/-/g, " ")} ${ACTION_SYNONYMS[action] ?? ""}`.trim();
  const actionButtons = Array.from(root.querySelectorAll<HTMLElement>("button, [role='button']")).filter((b) => {
    if (!isReachable(b)) return false;
    // A bare navigation entry is never the action's own control — the sidebar
    // "Trash" matched delete's "trash" synonym and navigated the target away.
    if (NAV_LABELS.includes(textOf(b))) return false;
    const label = (textOf(b) || b.getAttribute("aria-label") || "").toLowerCase();
    if (!label || label.length > 32) return false;
    const words = actionWords.split(" ").filter((w) => !["go", "to", "app", "add"].includes(w));
    return words.some((w) => w.length > 2 && label.includes(w));
  });

  // Actions that operate on "the selected thing" must select their own target in
  // the same breath. A bare "Move to Trash" click deleted whatever happened to be
  // selected — which was another objective's file, wrecking the whole assessment.
  const SELECTION_ACTIONS = new Set(["delete", "rename", "restore", "recover", "archive", "mark-spam"]);
  if (SELECTION_ACTIONS.has(action) && step.target) {
    const leaves = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(
      (n) => isReachable(n) && textOf(n) === step.target,
    );
    const targetEl = leaves[leaves.length - 1];
    if (targetEl) {
      // Include currently-disabled matches: the button is often disabled *until*
      // something is selected, which is exactly what the compound gesture fixes.
      const candidates = Array.from(root.querySelectorAll<HTMLElement>("button, [role='button']")).filter((b) => {
        if (NAV_LABELS.includes(textOf(b))) return false;
        const label = (textOf(b) || b.getAttribute("aria-label") || "").toLowerCase();
        if (!label || label.length > 32) return false;
        const words = actionWords.split(" ").filter((w) => !["go", "to", "app", "add"].includes(w));
        return words.some((w) => w.length > 2 && label.includes(w));
      });
      for (const b of candidates.slice(0, 3)) {
        out.push(async () => {
          click(targetEl);
          await wait(60);
          // Re-resolve: the button may have been disabled until the selection existed.
          const label = textOf(b) || b.getAttribute("aria-label") || "";
          const live = Array.from(root.querySelectorAll<HTMLElement>("button, [role='button']")).find(
            (x) => isReachable(x) && (textOf(x) || x.getAttribute("aria-label")) === label,
          );
          if (live) click(live);
        });
      }
    }
  } else {
    for (const b of actionButtons.slice(0, 6)) out.push(() => click(b));
  }

  // Setting ids are kebab-case ("night-shift") while their labels are words
  // ("Night Shift") — match on the human form.
  const humanTarget = step.target?.replace(/-/g, " ").toLowerCase();

  // When the target names something that is not on screen at all, a learner
  // goes looking — back to Home, over to the Inbox. The solver hunts the same
  // way, through NAV_LABELS. The rotation matters: always starting at Home
  // ping-ponged between the first two places forever (each click "changed the
  // screen", so the hunt never advanced).
  const targetOnScreen = () =>
    !humanTarget ||
    Array.from(root.querySelectorAll<HTMLElement>("*")).some(
      (n) => n.childElementCount === 0 && textOf(n).toLowerCase().includes(humanTarget),
    );

  // Toggles and sliders: find the labelled row, act on its control — the label
  // itself is not clickable in the Settings app.
  if ((action === "toggle" || action === "slider") && humanTarget) {
    const label = Array.from(root.querySelectorAll<HTMLElement>("*")).find(
      (n) => n.childElementCount === 0 && textOf(n).toLowerCase() === humanTarget && isReachable(n),
    );
    // Walk outward from the label until a container actually holds a control —
    // querying the parent first grabbed the *neighboring* setting's switch.
    let container: HTMLElement | null | undefined = label?.closest("div");
    let control: HTMLElement | null = null;
    for (let hop = 0; container && hop < 4 && !control; hop++) {
      control = container.querySelector<HTMLElement>("[role='switch'], input[type='range']");
      container = container.parentElement;
    }
    if (control) {
      if (isRange(control)) {
        const lo = step.min ?? Number((control as HTMLInputElement).min || 0);
        const hi = step.max ?? Number((control as HTMLInputElement).max || 100);
        out.push(() => setRange(control as HTMLInputElement, Math.round((lo + hi) / 2)));
      } else {
        out.push(() => click(control));
      }
    }
  }
  const navHunt = () => {
    const navs = Array.from(root.querySelectorAll<HTMLElement>("button, [role='button']")).filter(
      (b) => isReachable(b) && NAV_LABELS.includes(textOf(b)),
    );
    const start = navSpin++ % Math.max(navs.length, 1);
    for (const b of [...navs.slice(start), ...navs.slice(0, start)]) out.push(() => click(b));
  };

  // Without a current step there is no click-then-click move path (the sims gate
  // it on the guided step), so dragging is the one gesture that moves a file —
  // and clicking the destination's name in a sidebar would *navigate*, not move.
  if (action === "move" && step.target && step.into) {
    if (!targetOnScreen()) {
      navHunt();
      return out;
    }
    const all = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(isReachable);
    const srcAll = all.filter((n) => textOf(n) === step.target);
    const dstAll = all.filter((n) => textOf(n) === step.into);
    const src = srcAll[srcAll.length - 1]; // innermost
    const dst = dstAll[dstAll.length - 1];
    if (src && dst) out.push(() => dragTo(src, dst));
    return out;
  }

  if (!targetOnScreen()) navHunt();

  // Text match: the surest way to find "Documents" or "Send" without a ring.
  // The humanized target rides along for kebab-case ids ("night-shift").
  const wanted = [step.target, humanTarget !== step.target?.toLowerCase() ? humanTarget : null, step.title, step.value, step.file, step.into, step.to].filter(
    Boolean,
  ) as string[];
  if (wanted.length) {
    const clickable = Array.from(root.querySelectorAll<HTMLElement>("button, a, [role='button'], li, tr, [class*='cursor-pointer']")).filter(isReachable);
    for (const w of wanted) {
      const hit = clickable.filter((el) => textOf(el).toLowerCase().includes(w.toLowerCase()));
      // Innermost match only, so a whole panel is not clicked because it contains the word.
      const inner = hit.filter((el) => !hit.some((o) => o !== el && el.contains(o)));
      for (const el of inner.slice(0, 3)) {
        if (DOUBLE_CLICK.has(action)) out.push(() => doubleClick(el));
        out.push(() => click(el));
      }
    }
  }

  // Typing goes LAST, after every click has had its chance — the first visible
  // input is very often the wrong one (typing a file's new name into the search
  // box filtered the file out of view and wedged the whole lesson). Search boxes
  // are only fair game for search steps.
  if (value !== null) {
    const isSearchBox = (f: HTMLElement) =>
      /search/i.test(f.getAttribute("placeholder") ?? "") || (f as HTMLInputElement).type === "search";
    // Search queries go in search boxes and ONLY search boxes — typed into the
    // address bar, "apple pie recipe" navigates to the not-a-real-site page and
    // wedges the lesson. Everything else avoids search boxes for the same reason
    // in reverse (a filename typed there filters the file out of view).
    const fields = Array.from(
      root.querySelectorAll<HTMLElement>("input:not([type='range']):not([type='checkbox']), textarea, [contenteditable='true']"),
    ).filter((f) => isReachable(f) && (action.includes("search") ? isSearchBox(f) : !isSearchBox(f)));
    for (const f of fields) out.push(() => typeInto(f, value, { enter: true }));
  }

  return out;
}

/**
 * The pick-a-color page: three focusable circles, a ten-item sequence, and the
 * current item marked in the tracker. A learner reads which color is next and
 * picks it; so does the solver — the tracker chip for the current item carries a
 * scale/shadow emphasis and its text is the color's name.
 */
async function solveTabSequence(root: HTMLElement, isDone: () => boolean): Promise<boolean> {
  for (let i = 0; i < 14; i++) {
    if (isDone()) return true;
    const current = Array.from(root.querySelectorAll<HTMLElement>("span[class*='scale-110']")).find((el) =>
      ["red", "green", "blue"].includes(textOf(el)),
    );
    if (!current) return isDone();
    const color = textOf(current);
    const btn = root.querySelector<HTMLElement>(`button[aria-label='${color}']`);
    if (!btn || !isReachable(btn)) return false;
    click(btn);
    await settle();
  }
  return isDone();
}

/**
 * `move` is the one step whose two halves are a drag. Both sims that use it also
 * accept click-source-then-click-destination, which the ring path already covers;
 * this is the fallback when the destination never lights up.
 */
async function tryDrag(step: AnyStep, root: HTMLElement): Promise<boolean> {
  if (step.action !== "move" || !step.target || !step.into) return false;
  const all = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(isReachable);
  const src = all.find((el) => textOf(el) === step.target);
  const dst = all.find((el) => textOf(el) === step.into);
  if (!src || !dst) return false;
  await dragTo(src, dst);
  return true;
}

const SETTLE_MS = 140;
/** Sims with a deliberate delay (loading bars, restart animation) need more than a paint. */
const SLOW_SETTLE_MS = 900;

/**
 * Two rules learned the hard way. Never `requestAnimationFrame`: frames stop in a
 * background tab and one rAF hung the whole run without an error. And keep the
 * fast path on unthrottled macrotasks: setTimeout stretches to a second per call
 * in an unfocused window, which turned a minutes-long run into an afternoon. Only
 * the slow settles use the real clock — a sim's own loading delay needs it.
 */
async function settle(ms = SETTLE_MS) {
  await yieldMacrotask();
  await yieldMacrotask();
  await yieldMacrotask();
  if (ms > SETTLE_MS) await wait(ms);
}

export interface SolveOptions {
  steps: AnyStep[];
  /** Assessment activities have no current step; the solver walks objectives in order instead. */
  assessment?: boolean;
  budgetMs?: number;
  /**
   * Stops the loop between gestures. Without it, restarting the harness left the
   * previous lesson's solver alive and clicking inside the next lesson's pane —
   * "cancelled" only stopped the recording, not the hands.
   */
  signal?: AbortSignal;
}

export async function solve(root: HTMLElement, opts: SolveOptions): Promise<SolveOutcome> {
  // `let`, not `const`: hidden-pane time is added back so it never counts
  // against the budget.
  let started = performance.now();
  const total = opts.steps.length;
  // Generous, because browsers throttle timers in a tab that is not front-most and
  // the harness is usually watched from another window. The spin guard is what
  // catches a genuinely stuck step; the budget is only the backstop.
  const budget = opts.budgetMs ?? 90_000;

  // `stuck` is the step the loop was actually working on when it gave up — in
  // assessment mode that is a cycled objective, not `steps[progress]`.
  const outcome = (ok: boolean, reason?: string, stuck?: AnyStep): SolveOutcome => {
    const snap = snapshot(root);
    const idx = Math.min(snap.progress, total - 1);
    return {
      ok,
      progress: snap.progress,
      total,
      reason,
      stuckSay: ok ? undefined : (stuck ?? opts.steps[idx])?.say,
      debug: ok ? undefined : describeScreen(root),
      elapsedMs: Math.round(performance.now() - started),
    };
  };

  await settle(SLOW_SETTLE_MS); // mount, plus any launch animation

  // Clicking a control can churn the page — open a panel, close it — without
  // getting any closer to finishing. Without this the solver spends its whole
  // budget looking busy and reports a timeout instead of naming the step.
  let spinning = 0;
  let lastProgress = -1;
  const MAX_SPIN = Math.max(14, total + 6);
  // Assessment mode: which objective is being worked on, and how many screen
  // changes it has produced without completing anything. Multi-stage objectives
  // (open the scam email, *then* mark it spam) need several iterations on the
  // same objective; hopping objectives on every screen change finished none.
  let pursue = 0;
  let pursueMoves = 0;

  // The page reports document.hidden whenever the embedded pane is off screen.
  // Hidden, the sims' own timers throttle to ~1s ticks — slow but alive — so
  // the solver keeps working. What it must not do is issue a *verdict* from a
  // hidden world, so before any failure return it parks until visible — but
  // only up to a total per-lesson allowance: a pane that never comes back must
  // not deadlock the whole run. Past the allowance, verdicts proceed and are
  // tagged, and the retry pass gives the lesson a second chance later.
  const PARK_ALLOWANCE_MS = 150_000;
  let parkedMs = 0;
  const parkedOut = () => parkedMs >= PARK_ALLOWANCE_MS;
  const waitWhileHidden = async () => {
    const t0 = performance.now();
    while (document.hidden && !opts.signal?.aborted && parkedMs + (performance.now() - t0) < PARK_ALLOWANCE_MS) {
      await wait(300);
    }
    const spent = performance.now() - t0;
    parkedMs += spent;
    started += spent; // parked time doesn't count against the budget
  };
  const hiddenTag = () => (document.hidden ? " [pane was hidden — verdict unreliable]" : "");

  while (performance.now() - started < budget) {
    if (opts.signal?.aborted) return outcome(false, "Aborted");
    const before = snapshot(root);
    if (before.done) return outcome(true);

    if (before.progress === lastProgress) {
      if (++spinning > MAX_SPIN) {
        if (document.hidden && !parkedOut()) {
          await waitWhileHidden();
          spinning = Math.floor(MAX_SPIN / 2); // half a lap of grace once visible
          continue;
        }
        const step = opts.steps[Math.min(before.progress, total - 1)];
        return outcome(
          false,
          `Step ${before.progress + 1} never completes — ${MAX_SPIN} interactions with its own highlight changed the screen but not the step (action: ${step?.action ?? "?"}${step?.target ? `, target: ${step.target}` : ""})${hiddenTag()}`,
        );
      }
    } else {
      spinning = 0;
      lastProgress = before.progress;
      pursueMoves = 0;
    }

    // Guided mode: the frame's progress *is* the current step. Assessment mode
    // has no order, but the frame's objdone bitstring says exactly which
    // objectives are still open — pursue the first of those (offset by `pursue`
    // when it stops responding, wrapping over the other open ones). Blind
    // cycling used to trample one objective's target while chasing another.
    let step: AnyStep | undefined;
    if (opts.assessment) {
      const open: number[] = [];
      for (let i = 0; i < total; i++) if (before.objdone[i] !== "1") open.push(i);
      if (open.length === 0) return outcome(true);
      step = opts.steps[open[pursue % open.length]];
    } else {
      step = opts.steps[Math.min(before.progress, total - 1)];
    }
    if (!step) return outcome(true);

    let moved = false;
    {
      const addr = root.querySelector<HTMLInputElement>("input")?.value ?? "";
      const results = Array.from(root.querySelectorAll("p")).filter((p) => /Top result/.test(p.textContent ?? "")).length;
      trace(
        `iter step=${step.action ?? "?"}${step.target ? `:${step.target}` : ""} prog=${before.progress} objdone=${before.objdone} spin=${spinning} addr="${addr.slice(0, 28)}" results=${results}`,
      );
    }

    // The color-sequence game runs on its own loop: the spin guard would cut off
    // a sequence that legitimately takes ten picks.
    if (step.action === "tab-sequence") {
      const before2 = snapshot(root);
      const ok = await solveTabSequence(root, () => snapshot(root).progress !== before2.progress || snapshot(root).done);
      await settle();
      if (ok || changed(before, snapshot(root))) {
        spinning = 0;
        continue;
      }
    }

    // A learner whose cursor is already blinking in a box types in the box. They
    // do not go back and press the button that opened it again. Several steps put
    // the ring on that button and drop it once the field appears (New Folder,
    // Rename), so following the ring alone loops forever on the button. But the
    // box has to be the *right kind* of box: a search query typed into the
    // still-focused address bar navigated to the not-a-real-site page and wedged
    // the lesson — search values go only into search-looking fields.
    const focused = document.activeElement;
    const value = valueFor(step);
    const focusedIsSearch =
      focused instanceof HTMLElement &&
      (/search/i.test(focused.getAttribute("placeholder") ?? "") || (focused as HTMLInputElement).type === "search");
    const focusedFits = (step.action ?? "").includes("search") ? focusedIsSearch : !focusedIsSearch;
    if (
      value !== null &&
      focusedFits &&
      focused instanceof HTMLElement &&
      root.contains(focused) &&
      (isTextInput(focused) || isContentEditable(focused))
    ) {
      const already = isTextInput(focused) ? focused.value : focused.textContent;
      if (already !== value) {
        await typeInto(focused, value, { enter: true });
        await settle();
        moved = changed(before, snapshot(root));
      }
    }

    for (const el of moved ? [] : rings(root)) {
      for (const gesture of gesturesFor(step, el, root)) {
        await gesture();
        await settle();
        if (changed(before, snapshot(root))) { moved = true; trace(`  ring-gesture moved (el="${textOf(el).slice(0, 20)}")`); break; }
      }
      if (moved) break;
    }

    if (!moved) {
      let gi = 0;
      for (const gesture of ringlessGestures(step, root)) {
        await gesture();
        await settle();
        gi += 1;
        if (changed(before, snapshot(root))) { moved = true; trace(`  ringless #${gi} moved`); break; }
      }
      if (!moved) trace(`  ringless exhausted (${gi} gestures)`);
    }

    if (!moved && (await tryDrag(step, root))) {
      await settle();
      moved = changed(before, snapshot(root));
      if (moved) trace("  tryDrag moved");
    }

    if (opts.assessment && moved) {
      // Working, but not done yet — stay on this objective for a few more
      // iterations before conceding it and trying the next one.
      if (++pursueMoves > 5) {
        pursue += 1;
        pursueMoves = 0;
      }
    }

    if (!moved) {
      // One more chance for anything on a timer: a loading bar, a "Connecting…"
      // spinner, a restart animation. Real delays are a house rule, so the solver
      // has to be as patient as a learner.
      await settle(SLOW_SETTLE_MS);
      if (document.hidden && !parkedOut()) {
        // The pane went off screen mid-iteration: whatever just "failed" was a
        // stalled world, not a broken lesson. Park and replay the iteration.
        await waitWhileHidden();
        continue;
      }
      if (!changed(before, snapshot(root))) {
        // Assessment mode: one dead objective is not a verdict — move to the
        // next, and only fail after a whole lap produced nothing.
        if (opts.assessment && spinning < total) {
          spinning += 1;
          pursue += 1;
          pursueMoves = 0;
          continue;
        }
        const ringCount = rings(root).length;
        return outcome(
          false,
          (ringCount === 0
            ? `Step ${before.progress + 1} highlights nothing on screen (action: ${step.action ?? step.check ?? "?"}${step.target ? `, target: ${step.target}` : ""})`
            : `Step ${before.progress + 1} does not respond to its own highlight (action: ${step.action ?? "?"}${step.target ? `, target: ${step.target}` : ""})`) + hiddenTag(),
          step,
        );
      }
    }
  }

  const snap = snapshot(root);
  if (snap.done) return outcome(true);
  return outcome(false, `Ran out of time at step ${snap.progress + 1} of ${total}`);
}
