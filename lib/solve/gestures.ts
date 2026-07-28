/**
 * Low-level DOM gestures for the solve-check harness (`/dev/solve-check`).
 *
 * These drive the real components in a real browser: real elements, real CSS,
 * real React handlers. That matters — the two worst layout bugs this project
 * has shipped (a pane collapsed to zero height, a button below the fold of its
 * window) were invisible to the type checker and to any test that reasoned
 * about the component tree instead of the rendered page.
 *
 * Development only. Nothing here is imported by the course.
 */

/** Anything a simulator can be typed into. */
export type Editable = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

export function isTextInput(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (!(el instanceof HTMLInputElement)) return false;
  return ["text", "search", "email", "password", "url", "tel", ""].includes(el.type);
}

export function isRange(el: Element | null): el is HTMLInputElement {
  return el instanceof HTMLInputElement && el.type === "range";
}

// Deliberately not a type predicate: `el is HTMLElement` narrows the *false* branch
// to `never` for any HTMLElement, which silently kills the fallback paths that ask
// "not editable? then look inside it".
export function isContentEditable(el: Element | null): boolean {
  return el instanceof HTMLElement && el.isContentEditable;
}

/**
 * React tracks the last value it wrote to an input and swallows `input` events
 * that report the same one. Going through the prototype setter updates the node
 * without updating React's tracker, so the event is seen as a genuine change.
 */
export function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * The harness usually lives in an embedded browser pane, and that pane reports a
 * 0×0 viewport whenever it is not on screen — at which point every element's
 * rect is zero and a size check calls the entire page unreachable. A test suite
 * must not pass only while somebody is watching it, so when the page itself has
 * no size, geometry stops counting as evidence (CSS visibility still does).
 */
function viewportCollapsed(): boolean {
  return (document.body?.getBoundingClientRect().width ?? 0) < 50;
}

/** An element a learner could actually reach: on screen, sized, not hidden or disabled. */
export function isReachable(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return false;
  const rect = el.getBoundingClientRect();
  if ((rect.width < 2 || rect.height < 2) && !viewportCollapsed()) return false;
  const style = getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) < 0.05) return false;
  // pointer-events:none is how GuidedDesktopTask makes its window body inert on
  // purpose, so a ring sitting on such an element is not something to click.
  if (style.pointerEvents === "none") return false;
  return true;
}

/**
 * The clickable ancestor-or-self: rings are often on a wrapper around the real
 * button. But an element that is itself interactive is the target, full stop —
 * a window's title bar *contains* the Minimize button, and drilling into it
 * turned "drag the window" into "minimize the window".
 */
export function clickTarget(el: HTMLElement): HTMLElement {
  const cursor = getComputedStyle(el).cursor;
  // `text` is here because an address bar styled cursor-text is itself the thing
  // to click — drilling inward found the lock icon inside it instead.
  const selfInteractive =
    el.matches("button, a, input, select, [role='button']") ||
    ["pointer", "grab", "grabbing", "move", "se-resize", "text"].includes(cursor);
  if (!selfInteractive) {
    const inner = el.querySelector("button, a, input, select, [role='button']");
    if (inner instanceof HTMLElement && isReachable(inner)) return inner;
  }
  const outer = el.closest("button, a, [role='button']");
  if (outer instanceof HTMLElement && isReachable(outer)) return outer;
  return el;
}

function mouse(el: HTMLElement, type: string, extra: MouseEventInit = {}) {
  const r = el.getBoundingClientRect();
  el.dispatchEvent(
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: r.left + r.width / 2,
      clientY: r.top + r.height / 2,
      button: 0,
      ...extra,
    }),
  );
}

export function click(el: HTMLElement) {
  const t = clickTarget(el);
  t.scrollIntoView({ block: "nearest" });
  mouse(t, "pointerdown");
  mouse(t, "mousedown");
  mouse(t, "mouseup");
  t.click();
}

export function doubleClick(el: HTMLElement) {
  const t = clickTarget(el);
  t.scrollIntoView({ block: "nearest" });
  click(t);
  click(t);
  mouse(t, "dblclick", { detail: 2 });
}

export function rightClick(el: HTMLElement) {
  const t = clickTarget(el);
  t.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
}

/** Press and hold — how a reaction is added without a double-click. */
export async function longPress(el: HTMLElement, ms = 700) {
  const t = clickTarget(el);
  mouse(t, "pointerdown");
  mouse(t, "mousedown");
  await wait(ms);
  mouse(t, "mouseup");
  mouse(t, "pointerup");
}

export function key(el: Element | Document, k: string, mods: Partial<KeyboardEventInit> = {}) {
  const init: KeyboardEventInit = { key: k, code: k.length === 1 ? `Key${k.toUpperCase()}` : k, bubbles: true, cancelable: true, ...mods };
  el.dispatchEvent(new KeyboardEvent("keydown", init));
  el.dispatchEvent(new KeyboardEvent("keyup", init));
}

export async function typeInto(el: Editable, value: string, { enter = false } = {}): Promise<boolean> {
  if (isTextInput(el)) {
    el.focus();
    setNativeValue(el, value);
    el.dispatchEvent(new Event("change", { bubbles: true }));
    if (enter) {
      // Let React commit the value first. An Enter handler that reads *state*
      // (`if (!draft) return`) sees the pre-typing value when the keydown lands
      // in the same task as the input event — real typing never does that.
      await yieldMacrotask();
      await yieldMacrotask();
      key(el, "Enter");
    }
    return true;
  }
  if (isContentEditable(el)) {
    el.focus();
    el.textContent = value;
    el.dispatchEvent(new InputEvent("input", { bubbles: true }));
    return true;
  }
  return false;
}

export function setRange(el: HTMLInputElement, value: number) {
  setNativeValue(el, String(value));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * A drag that reports both HTML5 drag events and pointer movement, because the
 * sims are split between the two (file move uses dragstart/drop, window move
 * uses mousedown/mousemove).
 */
export async function dragTo(from: HTMLElement, to: HTMLElement) {
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const at = { clientX: a.left + a.width / 2, clientY: a.top + a.height / 2, bubbles: true, cancelable: true };
  const bt = { clientX: b.left + b.width / 2, clientY: b.top + b.height / 2, bubbles: true, cancelable: true };
  const dt = new DataTransfer();
  from.dispatchEvent(new DragEvent("dragstart", { ...at, dataTransfer: dt }));
  to.dispatchEvent(new DragEvent("dragover", { ...bt, dataTransfer: dt }));
  to.dispatchEvent(new DragEvent("drop", { ...bt, dataTransfer: dt }));
  from.dispatchEvent(new DragEvent("dragend", { ...bt, dataTransfer: dt }));

  from.dispatchEvent(new MouseEvent("mousedown", at));
  await wait(16);
  window.dispatchEvent(new MouseEvent("mousemove", bt));
  await wait(16);
  window.dispatchEvent(new MouseEvent("mouseup", bt));
}

/** Drag an element by an offset — how a window is moved or resized. */
export async function dragBy(el: HTMLElement, dx: number, dy: number) {
  const r = el.getBoundingClientRect();
  const sx = r.left + r.width / 2;
  const sy = r.top + r.height / 2;
  el.dispatchEvent(new MouseEvent("mousedown", { clientX: sx, clientY: sy, bubbles: true, cancelable: true }));
  await wait(16);
  // Two intermediate moves: drag handlers that track deltas want a path, not a jump.
  for (const t of [0.4, 0.8, 1]) {
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: sx + dx * t, clientY: sy + dy * t, bubbles: true }));
    await wait(16);
  }
  window.dispatchEvent(new MouseEvent("mouseup", { clientX: sx + dx, clientY: sy + dy, bubbles: true }));
}

export function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * A macrotask that browsers do NOT throttle in background tabs, unlike timers.
 * The harness usually runs in an unfocused window, where a plain setTimeout can
 * stretch to a second and a 166-lesson run to an afternoon.
 */
export function yieldMacrotask(): Promise<void> {
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => resolve();
    ch.port2.postMessage(null);
  });
}

/** Visible text, trimmed and collapsed — used to match a step's target against the screen. */
export function textOf(el: Element): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}
