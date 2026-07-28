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
  lastAct,
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
  "Home", "Documents", "Pictures", "Downloads", "Trash", "Inbox", "All Photos", "Favorites", "Recently Deleted", "Store", "My Apps", "App Market", "Contacts",
  // Settings sections — a toggle lives behind its section, so the hunt must open them.
  "Appearance", "Display", "Accessibility", "WiFi", "Bluetooth", "Notifications", "Storage", "Privacy", "About",
  // Escape hatches out of detail views, so a hunt can reach list-level controls.
  "\u2190 Back", "Back", "Back to Store",
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
  // Menu-bar panels — the desktop's status icons carry these aria-labels.
  "open-wifi-panel": "Wi-Fi status",
  "open-battery-panel": "Battery status",
  "open-clock": "Open calendar",
  "close-panel": "Close panel",
  // Browser chrome
  "new-tab": "New tab",
  "close-popup": "Close popup",
  "zoom-in": "Zoom in",
  "zoom-out": "Zoom out",
  "lock-click": "Site security",
  // Messaging
  "create-group": "New group chat",
};

/**
 * Dialog steps whose only control is an obvious confirm button with no ring — a
 * learner sees a dialog and clicks OK; the solver does the same.
 */
const CONFIRM_LABELS = ["OK", "Got it", "Continue", "Done", "Close", "Dismiss", "Restart", "Yes", "Allow"];

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
    case "set-body":
      // Same deal: "say something in your reply" accepts anything but not nothing.
      return step.value || "Thanks for your message. See you soon!";
    case "add-to-album":
      // The value names a picker ROW — typed into the new-album box it mints
      // a duplicate album instead.
      return null;
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
function ringlessGestures(step: AnyStep, root: HTMLElement, all: AnyStep[] = []): Gesture[] {
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

  // `restore` wants the *running* app's dock icon (the one wearing the green
  // dot) — spraying clicks across the dock just opens other apps and un-does
  // the minimize. If a window is visible, minimize it first in the same breath.
  if (action === "restore") {
    const runningDock = Array.from(root.querySelectorAll<HTMLElement>("button[aria-label]")).find(
      (b) => isReachable(b) && b.querySelector("[class*='green']"),
    );
    if (runningDock) {
      out.push(async () => {
        const minimize = Array.from(root.querySelectorAll<HTMLElement>("[aria-label='Minimize']")).find(isReachable);
        if (minimize) {
          click(minimize);
          await wait(80);
        }
        click(runningDock);
      });
    }
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
    favorite: "favorite favourite fav",
    unfavorite: "favorite favourite fav",
    "go-to-installed": "my apps",
    install: "install get",
    "go-to-store": "store market",
    "open-force-quit": "force quit",
    "open-downloads": "downloads",
    "send-group-message": "start chat",
  };
  const actionWords = `${action.replace(/-/g, " ")} ${ACTION_SYNONYMS[action] ?? ""}`.trim();
  const actionButtons = Array.from(root.querySelectorAll<HTMLElement>("button, [role='button']")).filter((b) => {
    if (!isReachable(b)) return false;
    // A bare navigation entry is never the action's own control — the sidebar
    // "Trash" matched delete's "trash" synonym and navigated the target away.
    // Except for go-to-* actions, where the nav entry IS the control ("My Apps"),
    // and open-downloads, whose toolbar button shares Files' "Downloads" label.
    if (!action.startsWith("go-to") && action !== "open-downloads" && NAV_LABELS.includes(textOf(b))) return false;
    const label = (textOf(b) || b.getAttribute("aria-label") || "").toLowerCase();
    if (!label || label.length > 32) return false;
    const words = actionWords.split(" ").filter((w) => !["go", "to", "app", "add"].includes(w));
    return words.some((w) => w.length > 2 && label.includes(w));
  });

  // Actions that operate on "the selected thing" must select their own target in
  // the same breath. A bare "Move to Trash" click deleted whatever happened to be
  // selected — which was another objective's file, wrecking the whole assessment.
  const SELECTION_ACTIONS = new Set(["delete", "rename", "restore", "recover", "archive", "mark-spam"]);
  // Row actions are handled exclusively by the My Apps row compound below — a
  // generic "Delete" click acts on whichever row comes first, the wrong app.
  const ROW_ACTIONS = new Set(["delete-app", "update-app", "open-app"]);
  if ((ROW_ACTIONS.has(action) && step.target) || ["close-popup", "add-to-album", "share", "select-day", "set-reminder-text", "save-reminder"].includes(action)) {
    // Row actions: handled by the My Apps compound below. close-popup: only the
    // aria-labeled ✕ is safe — a generic "close" match hits tab-close buttons,
    // and anything inside the popup fails the lesson.
  } else if (SELECTION_ACTIONS.has(action) && step.target) {
    // The target may be scrolled below the fold of its list — still actionable,
    // a learner would scroll to it, so the gesture scrolls first.
    const leaves = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(
      (n) => textOf(n) === step.target && (isReachable(n) || n.offsetParent !== null),
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
          targetEl.scrollIntoView({ block: "center" });
          click(targetEl);
          await wait(60);
          // Re-resolve: the button may have been disabled until the selection
          // existed. When a sidebar folder shares the action button's label
          // ("Archive" the folder vs "Archive" the action), prefer the match
          // that FOLLOWS the target in the document — the reading pane's.
          const label = textOf(b) || b.getAttribute("aria-label") || "";
          const live = Array.from(root.querySelectorAll<HTMLElement>("button, [role='button']")).filter(
            (x) => isReachable(x) && (textOf(x) || x.getAttribute("aria-label")) === label,
          );
          const after = live.find((x) => targetEl.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING);
          const pick = after ?? live[live.length - 1];
          if (pick) click(pick);
        });
      }
    }
  } else {
    for (const b of actionButtons.slice(0, 6)) out.push(() => click(b));
  }

  // Messaging: the attach flow ends on a photo grid inside a shadowed overlay —
  // pick the first photo. A reaction is a double-click on the other person's
  // last bubble, then any emoji from the picker that pops up. And several
  // actions only exist inside an open 1-to-1 conversation, so as a last resort
  // open one the way a learner would: click a contact in the sidebar.
  if (action === "attach-photo") {
    // Phase ladder — grid, then menu row, then the Attach button — and never a
    // step backwards: re-clicking Attach while its menu is open toggles it shut.
    const photoBtn = Array.from(root.querySelectorAll<HTMLElement>("div[class*='shadow-xl'] button")).find(
      (b) => isReachable(b) && b.querySelector("img"),
    );
    const photosRow = Array.from(root.querySelectorAll<HTMLElement>("button")).find(
      (b) => isReachable(b) && textOf(b) === "Photos",
    );
    if (photoBtn) out.push(() => click(photoBtn));
    else if (photosRow) out.push(() => click(photosRow));
    else for (const el of byLabel("Attach")) out.push(() => click(el));
  }
  if (action === "add-reaction") {
    const bubbles = Array.from(root.querySelectorAll<HTMLElement>("[class*='rounded-bl-md']")).filter(isReachable);
    const last = bubbles[bubbles.length - 1];
    if (last) {
      out.push(async () => {
        doubleClick(last);
        await wait(250);
        const emojiBtn = Array.from(
          root.querySelectorAll<HTMLElement>("div[class*='shadow-lg'] button, div[class*='shadow-xl'] button"),
        ).find((b) => isReachable(b) && textOf(b).length > 0 && textOf(b).length <= 4);
        if (emojiBtn) click(emojiBtn);
      });
    }
  }
  if (["attach-photo", "add-reaction", "start-call", "pick-emoji"].includes(action)) {
    const CONTACT_NAMES = ["Alex", "Jordan", "Sam", "Grandma", "Doggo"];
    const row = Array.from(root.querySelectorAll<HTMLElement>("button")).find(
      (b) => isReachable(b) && CONTACT_NAMES.some((n) => textOf(b).startsWith(n)),
    );
    if (row) out.push(() => click(row));
  }
  // Reply and forward live in an open email's reading pane — when neither
  // button is on screen, open an email from the list the way a learner would.
  if (["reply", "forward"].includes(action) && actionButtons.length === 0) {
    const row = Array.from(root.querySelectorAll<HTMLElement>("button, [role='button'], [class*='cursor-pointer']")).find(
      (el) => isReachable(el) && textOf(el).length > 20,
    );
    if (row) out.push(() => click(row));
  }

  if (action === "send-group-message") {
    // The group thread may exist but be closed — its sidebar row reopens it.
    const groupRow = Array.from(root.querySelectorAll<HTMLElement>("button")).find(
      (b) => isReachable(b) && textOf(b).includes("Group Chat"),
    );
    if (groupRow) out.push(() => click(groupRow));
  }
  if (!["start-call", "mute", "camera-off", "end-call"].includes(action)) {
    // Stuck inside a video call while chasing something else: no other
    // objective's controls exist on the call screen — hang up first.
    const endCall = Array.from(root.querySelectorAll<HTMLElement>("button")).find(
      (b) => isReachable(b) && textOf(b) === "End call",
    );
    if (endCall) out.push(() => click(endCall));
  }

  // Photos: share picks its channel from the step's `via`; brightness and
  // contrast are labelled range sliders aimed at the middle of the step's
  // "min-max" window; the album picker panel names the exact row; and edit
  // controls only exist with a photo open, so open one — the named one when
  // the step names it.
  if (action === "share") {
    // Phase ladder: contact chip → channel button → the Share button — never
    // backwards, since re-clicking Share resets the sheet to its first phase.
    const chip =
      step.to &&
      Array.from(root.querySelectorAll<HTMLElement>("div"))
        .find((d) => (d.textContent ?? "").startsWith("Send to:"))
        ?.querySelector<HTMLElement>("button") &&
      Array.from(root.querySelectorAll<HTMLElement>("button")).find(
        (b) => isReachable(b) && textOf(b).toLowerCase() === step.to!.toLowerCase(),
      );
    const channel =
      step.via &&
      Array.from(root.querySelectorAll<HTMLElement>("button")).find(
        (b) => isReachable(b) && textOf(b).toLowerCase() === step.via,
      );
    const shareBtn = Array.from(root.querySelectorAll<HTMLElement>("button")).find(
      (b) => isReachable(b) && textOf(b) === "Share",
    );
    if (chip) out.push(() => click(chip));
    else if (channel) out.push(() => click(channel));
    else if (shareBtn) out.push(() => click(shareBtn));
  }
  if (action.startsWith("adjust-")) {
    const which = action.replace("adjust-", "");
    const range = Array.from(root.querySelectorAll<HTMLInputElement>("input[type='range']")).find(
      (r) => isReachable(r) && (r.closest("div")?.textContent ?? "").toLowerCase().includes(which),
    );
    if (range) {
      const [lo, hi] = (step.value ?? "").split("-").map(Number);
      const mid = Number.isFinite(lo) && Number.isFinite(hi) ? Math.round((lo + hi) / 2) : 120;
      out.push(() => setRange(range, mid));
    }
  }
  if (action === "add-to-album") {
    // Phase ladder: picker row → the "Album" toolbar button → open the photo
    // the sibling select-photo objective names (or any photo). Never the
    // "+ New Album" button — that mints a duplicate album.
    const panel = Array.from(root.querySelectorAll<HTMLElement>("div")).find((d) =>
      (d.textContent ?? "").startsWith("Add to album:"),
    );
    const row =
      panel && step.value
        ? Array.from(panel.querySelectorAll<HTMLElement>("button")).find((b) => textOf(b) === step.value)
        : undefined;
    const albumBtn = Array.from(root.querySelectorAll<HTMLElement>("button")).find(
      (b) => isReachable(b) && textOf(b) === "Album",
    );
    if (row) out.push(() => click(row));
    else if (albumBtn) out.push(() => click(albumBtn));
    else {
      const wantPhoto = all.find((s) => s.action === "select-photo")?.target?.toLowerCase();
      const thumbs = Array.from(root.querySelectorAll<HTMLElement>("button")).filter(
        (b) => isReachable(b) && b.querySelector("img"),
      );
      const named = wantPhoto
        ? thumbs.find((b) => (b.querySelector("img")?.getAttribute("alt") ?? "").toLowerCase().includes(wantPhoto))
        : undefined;
      const pick = named ?? thumbs[0];
      if (pick) out.push(() => click(pick));
    }
  }
  const PHOTO_DETAIL_ACTIONS = new Set([
    "rotate", "revert", "crop", "adjust-brightness", "adjust-contrast", "apply-filter", "share", "favorite", "unfavorite",
  ]);
  if (PHOTO_DETAIL_ACTIONS.has(action) && actionButtons.length === 0) {
    const altOf = (b: HTMLElement) => b.querySelector("img")?.getAttribute("alt") ?? "";
    const thumbs = Array.from(root.querySelectorAll<HTMLElement>("button")).filter(
      (b) => isReachable(b) && (textOf(b).length > 0 || altOf(b).length > 0) && b.querySelector("img"),
    );
    const named = step.target
      ? thumbs.find((b) => (textOf(b) + altOf(b)).toLowerCase().includes(step.target!.toLowerCase()))
      : undefined;
    const pick = named ?? thumbs[0];
    if (pick) out.push(() => click(pick));
  }

  // Event fields only exist in the open event form — from anywhere else,
  // + New Event opens it, and the Month tab gets back to the calendar first.
  if (["set-title", "set-time", "set-repeat", "save-event"].includes(action)) {
    const formOpen = root.querySelector<HTMLInputElement>("input[placeholder='Event title']");
    if (formOpen && action === "save-event" && !formOpen.value) {
      // A fresh form cannot be saved empty — give it a title, then Save.
      out.push(async () => {
        await typeInto(formOpen, "Practice event");
        await wait(80);
        const save = Array.from(root.querySelectorAll<HTMLElement>("button")).find(
          (b) => isReachable(b) && textOf(b) === "Save",
        );
        if (save) click(save);
      });
    }
    if (!formOpen) {
      const opener =
        Array.from(root.querySelectorAll<HTMLElement>("button")).find(
          (b) => isReachable(b) && textOf(b) === "+ New Event",
        ) ??
        Array.from(root.querySelectorAll<HTMLElement>("button")).find(
          (b) => isReachable(b) && textOf(b) === "Month",
        );
      if (opener) out.push(() => click(opener));
    }
  }

  // Symmetric ladder for reminders: form → typed text → Save. The generic
  // matcher is suppressed for these — the "Reminders" tab matches "reminder"
  // and clicking it closes the very form being saved.
  if (["set-reminder-text", "save-reminder"].includes(action)) {
    const box = root.querySelector<HTMLInputElement>("input[placeholder='Reminder text']");
    if (!box) {
      const opener =
        Array.from(root.querySelectorAll<HTMLElement>("button")).find(
          (b) => isReachable(b) && textOf(b) === "+ New Reminder",
        ) ??
        Array.from(root.querySelectorAll<HTMLElement>("button")).find(
          (b) => isReachable(b) && textOf(b) === "Reminders",
        );
      if (opener) out.push(() => click(opener));
    } else if (action === "save-reminder") {
      out.push(async () => {
        if (!box.value) {
          await typeInto(box, "Practice reminder");
          await wait(80);
        }
        const save = Array.from(root.querySelectorAll<HTMLElement>("button")).find(
          (b) => isReachable(b) && textOf(b) === "Save",
        );
        if (save) click(save);
      });
    }
  }

  // A weekday-named day ("Thursday") is any numbered cell in that weekday's
  // column — find the header, then a number button aligned under it.
  if (action === "select-day" && step.target && !/^\d+$/.test(step.target)) {
    const prefix = step.target.slice(0, 3).toLowerCase();
    const header = Array.from(root.querySelectorAll<HTMLElement>("*")).find(
      (n) => n.childElementCount === 0 && textOf(n).toLowerCase().startsWith(prefix) && isReachable(n),
    );
    if (header) {
      const hx = header.getBoundingClientRect();
      const hCenter = hx.left + hx.width / 2;
      const cell = Array.from(root.querySelectorAll<HTMLElement>("button")).find((b) => {
        if (!isReachable(b) || !/^\d+$/.test(textOf(b))) return false;
        const r = b.getBoundingClientRect();
        return Math.abs(r.left + r.width / 2 - hCenter) < r.width / 2;
      });
      if (cell) out.push(() => click(cell));
    } else {
      // No weekday headers — probably the Day view. Back to Month first.
      const month = Array.from(root.querySelectorAll<HTMLElement>("button")).find(
        (b) => isReachable(b) && textOf(b) === "Month",
      );
      if (month) out.push(() => click(month));
    }
  }

  // The browser's address bar is a div until clicked — click it, and the
  // autofocused input that appears gets typed into on the next iteration by
  // the focused-input branch.
  if (action === "navigate" && value !== null) {
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("[class*='cursor-text']")).filter(isReachable)) {
      out.push(() => click(el));
    }
  }

  // Some objectives live on a specific practice site (the scam popup only
  // exists on freegames.example). When the control is nowhere on screen,
  // navigate there the same way a learner told "go to X and…" would.
  const ACTION_PAGE: Record<string, string> = {
    "close-popup": "freegames.example",
    "cookie-decline": "weather.com",
    download: "recipebox.example",
  };
  const needPage = ACTION_PAGE[action];
  if (needPage && byLabel(WINDOW_BUTTON[action] ?? "").length === 0 && actionButtons.length === 0) {
    const addr = Array.from(root.querySelectorAll<HTMLElement>("[class*='cursor-text']")).find(isReachable);
    if (addr) {
      out.push(async () => {
        click(addr);
        await wait(100);
        const f = document.activeElement;
        if (f instanceof HTMLElement && root.contains(f) && isTextInput(f)) await typeInto(f, needPage, { enter: true });
      });
    }
  }

  // Row actions live on the My Apps tab, but the target's name on a store or
  // detail page fools targetOnScreen into calling off the hunt. Go to My Apps
  // and press the row's own button in one breath.
  if (["delete-app", "update-app", "open-app"].includes(action) && step.target) {
    const verb = { "delete-app": /delete|remove/i, "update-app": /update/i, "open-app": /open/i }[action]!;
    const myApps = Array.from(root.querySelectorAll<HTMLElement>("button")).find(
      (b) => isReachable(b) && textOf(b) === "My Apps",
    );
    if (myApps) {
      out.push(async () => {
        click(myApps);
        await wait(150);
        const name = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(
          (n) => n.childElementCount === 0 && textOf(n) === step.target && isReachable(n),
        )[0];
        for (let row = name?.parentElement; row; row = row.parentElement) {
          const btns = Array.from(row.querySelectorAll<HTMLElement>("button")).filter((b) => verb.test(textOf(b)));
          if (btns.length === 1) { click(btns[0]); break; }
          if (btns.length > 1) break; // overshot the row into the whole list
        }
      });
    }
  }

  // Install lives on an app's detail page. When no install button is in sight,
  // open the app the assessment's own select-app objective names, then press
  // the button that appears — one breath, like the selection compounds above.
  if (["install", "allow-permission", "update-app"].includes(action) && actionButtons.length === 0) {
    const appName = step.target ?? all.find((s) => s.action === "select-app")?.target;
    if (appName) {
      const card = Array.from(root.querySelectorAll<HTMLElement>("button, [role='button'], [class*='cursor-pointer']")).find(
        (el) => isReachable(el) && textOf(el).toLowerCase().includes(appName.toLowerCase()),
      );
      if (card) {
        out.push(async () => {
          click(card);
          await wait(150);
          const btn = Array.from(root.querySelectorAll<HTMLElement>("button")).find(
            (b) => isReachable(b) && /install|get|update/i.test(textOf(b)),
          );
          if (btn) click(btn);
        });
      }
    }
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
    ) ||
    // Image-only tiles (photo grids) carry their name in alt text.
    Array.from(root.querySelectorAll<HTMLImageElement>("img[alt]")).some((i) =>
      i.alt.toLowerCase().includes(humanTarget),
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
    } else if (action === "toggle") {
      // Grouped choice chips: the id "colour-filter-warm" belongs to a chip
      // labeled just "Warm" under a "Colour Filters" heading. Match a button on
      // the id's trailing word(s), longest suffix first.
      const parts = humanTarget.split(" ");
      for (let n = parts.length - 1; n >= 1; n--) {
        const suffix = parts.slice(-n).join(" ");
        const chip = Array.from(root.querySelectorAll<HTMLElement>("button")).find(
          (b) => isReachable(b) && textOf(b).toLowerCase() === suffix,
        );
        if (chip) {
          out.push(() => click(chip));
          break;
        }
      }
    }
  }
  const navHunt = () => {
    // An open detail view can replace the very list the target lives in —
    // closing it is the first move of any hunt.
    for (const esc of Array.from(root.querySelectorAll<HTMLElement>("[aria-label='Close email']")).filter(isReachable)) {
      out.push(() => click(esc));
    }
    // Folder buttons carry unread counts ("Inbox4"), so match label + digits.
    const isNav = (t: string) => NAV_LABELS.some((label) => t === label || new RegExp(`^${label}\\d+$`).test(t));
    const navs = Array.from(root.querySelectorAll<HTMLElement>("button, [role='button']")).filter(
      (b) => isReachable(b) && isNav(textOf(b)),
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
  // A search step's value is a query to type, never a thing to click — hunting
  // it clicked whichever app card mentioned the query word, forever.
  // add-to-album's value names a picker row the dedicated compound clicks —
  // hunting it here hits the same-named sidebar album and navigates away.
  const clickableValue = action.includes("search") || action === "add-to-album" ? null : step.value;
  const wanted = [step.target, humanTarget !== step.target?.toLowerCase() ? humanTarget : null, step.title, clickableValue, step.file, step.into, step.to].filter(
    Boolean,
  ) as string[];
  if (wanted.length) {
    const anyClickable = Array.from(root.querySelectorAll<HTMLElement>("button, a, [role='button'], li, tr, [class*='cursor-pointer']"));
    const clickable = anyClickable.filter(isReachable);
    // Image-only tiles match on their img alt text, like a screen reader.
    const matches = (el: HTMLElement, w: string) =>
      textOf(el).toLowerCase().includes(w) ||
      Array.from(el.querySelectorAll("img")).some((i) => (i.getAttribute("alt") ?? "").toLowerCase().includes(w));
    for (const w of wanted.map((x) => x.toLowerCase())) {
      let hit = clickable.filter((el) => matches(el, w));
      // Nothing reachable matched, but a match may be scrolled below the fold
      // of its list — a learner would scroll to it.
      if (hit.length === 0) hit = anyClickable.filter((el) => el.offsetParent !== null && matches(el, w));
      // Innermost match only, so a whole panel is not clicked because it contains the word.
      const inner = hit.filter((el) => !hit.some((o) => o !== el && el.contains(o)));
      for (const el of inner.slice(0, 3)) {
        if (DOUBLE_CLICK.has(action)) out.push(() => doubleClick(el));
        out.push(() => { el.scrollIntoView({ block: "center" }); click(el); });
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
      root.querySelectorAll<HTMLElement>(
        // A body is a textarea — typing prose into the To input corrupts the
        // recipient before the right field ever gets its turn.
        action === "set-body"
          ? "textarea, [contenteditable='true']"
          : "input:not([type='range']):not([type='checkbox']), textarea, [contenteditable='true']",
      ),
    ).filter((f) => isReachable(f) && (action.includes("search") ? isSearchBox(f) : !isSearchBox(f)));
    // Typing goes last for everything except search and send: those two have
    // a value destined for the one visible box, and clicks kept winning the
    // race by "changing the screen" without ever typing.
    if (action.includes("search") || action.startsWith("send")) out.unshift(...fields.map((f) => () => typeInto(f, value, { enter: true })));
    else for (const f of fields) out.push(() => typeInto(f, value, { enter: true }));
    // A search objective with no search box in sight (the box lives on another
    // page — the store front, not My Apps): go looking like a learner would.
    // A modal dialog may be covering the page — clear it before hunting.
    if (action.includes("search") && fields.length === 0) {
      // A "Search" button may reveal the box (Photos hides it in the sidebar).
      const reveal = Array.from(root.querySelectorAll<HTMLElement>("button")).find(
        (b) => isReachable(b) && textOf(b) === "Search",
      );
      if (reveal) out.push(() => click(reveal));
      const dlg = Array.from(root.querySelectorAll<HTMLElement>("button")).filter(
        (b) => isReachable(b) && ["Allow", "Don't Allow", "OK", "Cancel"].includes(textOf(b)),
      );
      for (const b of dlg) out.push(() => click(b));
      navHunt();
    }
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
  // The sims answer some gestures on a deliberate delay (navigation runs a 250ms
  // loading beat). The macrotask-fast loop can burn all its spins before the
  // first delayed handler ever lands — and once the harness declares failure and
  // unmounts, those queued completions dispatch into a dead instance. A spin
  // verdict therefore needs wall-clock time at this progress, not just attempts.
  let stuckSince = performance.now();
  const MIN_STUCK_MS = 3000;
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
        if (performance.now() - stuckSince < MIN_STUCK_MS) {
          // Attempts exhausted but barely any time has passed — a delayed
          // completion may still be in flight. Let the clock catch up.
          await wait(400);
          spinning = Math.floor(MAX_SPIN / 2);
          continue;
        }
        if (document.hidden && !parkedOut()) {
          await waitWhileHidden();
          spinning = Math.floor(MAX_SPIN / 2); // half a lap of grace once visible
          continue;
        }
        // In assessment mode name the first OPEN objective — steps[progress] is
        // ordinal position, not what is actually unmet, and blamed the wrong step.
        const openIdx = opts.assessment ? before.objdone.indexOf("0") : -1;
        const step = opts.steps[openIdx >= 0 ? openIdx : Math.min(before.progress, total - 1)];
        return outcome(
          false,
          `Step ${(openIdx >= 0 ? openIdx : before.progress) + 1} never completes — ${MAX_SPIN} interactions with its own highlight changed the screen but not the step (action: ${step?.action ?? "?"}${step?.target ? `, target: ${step.target}` : ""})${hiddenTag()}`,
        );
      }
    } else {
      spinning = 0;
      lastProgress = before.progress;
      pursueMoves = 0;
      stuckSince = performance.now();
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
        `iter step=${step.action ?? "?"}${step.target ? `:${step.target}` : ""} prog=${before.progress} objdone=${before.objdone} spin=${spinning} addr="${addr.slice(0, 28)}" results=${results} ring=[${before.ring.slice(0, 48)}]`,
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
      for (const gesture of ringlessGestures(step, root, opts.steps)) {
        await gesture();
        await settle();
        gi += 1;
        if (changed(before, snapshot(root))) { moved = true; trace(`  ringless #${gi} moved (${lastAct})`); break; }
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
        // Assessment mode: one dead objective is not a verdict — move on, and
        // only fail after two whole laps produced nothing. Two, because one
        // objective's gesture often creates the state another one needs (the
        // + New Event click opens the form the title objective types into).
        if (opts.assessment && spinning < Math.max(total * 2, 8)) {
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
