"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * The gestures the phone course teaches, as reusable hooks.
 *
 * ## Everything here is Pointer Events, deliberately
 *
 * Touch events fire on a phone and never on a laptop; mouse events fire on a
 * laptop and only in a delayed, lied-about form on a phone. Pointer events are
 * the one family that reports both honestly, so a swipe written once works with
 * a finger *and* with a mouse held down and dragged. That matters more here than
 * anywhere else in the repo: this course is meant to be played on a phone, but it
 * is authored, reviewed and script-checked on a computer, and a gesture that only
 * one of those can perform is a gesture nobody can verify.
 *
 * ## The drag is tracked on the window, not on the element
 *
 * This is the design decision the rest of the file hangs off, and both of the
 * obvious alternatives are wrong:
 *
 * - **Listening on the element alone** loses the gesture the moment the finger
 *   leaves it, which for the 22px-tall bar you swipe upward to go home is
 *   immediately. Every swipe died on its first frame.
 * - **`setPointerCapture` on `pointerdown`** fixes that and breaks something
 *   worse: while a pointer is captured, the `click` that follows is dispatched
 *   to the *capturing* element instead of to whatever was under the finger. A
 *   swipeable row silently swallowed every tap on the button inside it — the
 *   entire Messages list opened nothing, and the only screens that still worked
 *   were the ones where the swipe handler and the click handler happened to sit
 *   on the same element.
 *
 * Listening on the window for the duration of the press has neither problem: the
 * gesture survives leaving the element, and a plain tap is never intercepted.
 *
 * ## `touch-action` is not optional
 *
 * A browser claims a gesture *before* it sends you the events for it. Left alone,
 * a vertical drag scrolls the page and a two-finger spread zooms the whole
 * document, and neither one reaches this code. Each hook below says which
 * `touch-action` its element must carry, and the components set it. Getting this
 * wrong does not throw — it produces a gesture that works with a mouse and does
 * nothing at all with a finger, which is the exact failure this course cannot
 * afford.
 */

export type SwipeDir = "up" | "down" | "left" | "right";

export interface SwipeEnd {
  dx: number;
  dy: number;
  /** `null` when the movement was too small to count as a swipe. */
  dir: SwipeDir | null;
}

interface SwipeOptions {
  /** Minimum travel, in CSS pixels, before a drag counts as a swipe. */
  threshold?: number;
  /** Live feedback while the finger is down — used to drag rows and panels. */
  onMove?: (dx: number, dy: number) => void;
  /** Restrict which axis is reported. `"x"` also lets the browser keep vertical scrolling. */
  axis?: "x" | "y" | "both";
}

/**
 * Watch one pointer from press to release, wherever on the page it wanders.
 *
 * Shared by every hook below so there is one answer to "when do the listeners
 * come off again" — they come off on `pointerup`, on `pointercancel` (which is
 * how a browser says "I am taking this gesture, it is a scroll now"), and on
 * unmount.
 */
function usePointerTracking(
  onMove: (e: PointerEvent) => void,
  onDone: (e: PointerEvent, cancelled: boolean) => void,
) {
  const move = useRef(onMove);
  const done = useRef(onDone);
  move.current = onMove;
  done.current = onDone;

  const detach = useRef<(() => void) | null>(null);
  const stop = useCallback(() => {
    detach.current?.();
    detach.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const begin = useCallback(() => {
    stop();
    const handleMove = (e: PointerEvent) => move.current(e);
    const handleUp = (e: PointerEvent) => {
      stop();
      done.current(e, false);
    };
    const handleCancel = (e: PointerEvent) => {
      stop();
      done.current(e, true);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
    detach.current = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  }, [stop]);

  return begin;
}

/**
 * A one-finger drag, reported once on release.
 *
 * The element needs `touch-action: none` for `axis: "y"` or `"both"`, and
 * `touch-action: pan-y` for `axis: "x"` — the latter keeps the list underneath
 * scrolling normally while horizontal drags come here.
 */
export function useSwipe(onEnd: (e: SwipeEnd) => void, { threshold = 40, onMove, axis = "both" }: SwipeOptions = {}) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const moved = useRef(false);

  const begin = usePointerTracking(
    (e) => {
      const s = start.current;
      if (!s || s.id !== e.pointerId) return;
      if (Math.abs(e.clientX - s.x) > 8 || Math.abs(e.clientY - s.y) > 8) moved.current = true;
      onMove?.(e.clientX - s.x, e.clientY - s.y);
    },
    (e, cancelled) => {
      const s = start.current;
      if (!s || s.id !== e.pointerId) return;
      start.current = null;
      if (cancelled) {
        onMove?.(0, 0);
        return;
      }
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      let dir: SwipeDir | null = null;
      if (horizontal && axis !== "y" && Math.abs(dx) >= threshold) dir = dx < 0 ? "left" : "right";
      if (!horizontal && axis !== "x" && Math.abs(dy) >= threshold) dir = dy < 0 ? "up" : "down";
      onEnd({ dx, dy, dir });
    },
  );

  return {
    /** Spread these onto the element. Kept apart from `consumeClick` on purpose:
     *  spreading a stray function onto a DOM node is a React warning and a real
     *  attribute nobody wanted. */
    props: {
      onPointerDown: (e: React.PointerEvent) => {
        start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        moved.current = false;
        begin();
      },
    },
    /**
     * A drag that starts and ends inside the same element still produces a
     * `click` — the browser does not decide a gesture was a drag on your behalf.
     * So swiping a conversation sideways to uncover its Delete button *also*
     * opened the conversation, putting the learner inside the message they were
     * trying to throw away without reading. Call this first in the click handler
     * of anything that is both swipeable and tappable.
     */
    consumeClick: () => {
      if (!moved.current) return false;
      moved.current = false;
      return true;
    },
  };
}

/**
 * Press and hold — the phone's version of a right-click.
 *
 * Cancelled by lifting early *and* by moving more than `slop` pixels, because a
 * hold that drifts is a swipe the learner has not finished yet. Without the
 * movement check, scrolling a list of app icons popped a menu every time.
 *
 * `onContextMenu` is suppressed: a long press with a *mouse* is nothing, but a
 * long press with a finger raises the browser's own text-selection menu on top of
 * the one the lesson is asking for.
 *
 * The element needs `touch-action: none` and, in practice, `user-select: none` —
 * otherwise a held finger selects the icon's label.
 */
export function useLongPress(onFire: () => void, { ms = 500, slop = 12 }: { ms?: number; slop?: number } = {}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const from = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    from.current = null;
  }, []);

  const begin = usePointerTracking(
    (e) => {
      const f = from.current;
      if (!f || !timer.current) return;
      if (Math.abs(e.clientX - f.x) > slop || Math.abs(e.clientY - f.y) > slop) cancel();
    },
    () => cancel(),
  );

  useEffect(() => cancel, [cancel]);

  return {
    /** Spread these onto the element; `consumeClick` is deliberately not among them. */
    props: {
      onPointerDown: (e: React.PointerEvent) => {
        from.current = { x: e.clientX, y: e.clientY };
        fired.current = false;
        begin();
        timer.current = setTimeout(() => {
          timer.current = null;
          fired.current = true;
          onFire();
        }, ms);
      },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
    /**
     * Lifting a finger after a long press still produces a `click`. Without this,
     * holding an app icon opened its menu and then instantly opened the app on
     * top of it — the menu appeared and vanished inside one gesture, which reads
     * as "press and hold does nothing". Call this first in the click handler and
     * bail out when it returns true.
     */
    consumeClick: () => {
      if (!fired.current) return false;
      fired.current = false;
      return true;
    },
  };
}

/**
 * Pinch to zoom, from two fingers on the glass.
 *
 * Reports a direction once the distance between the two pointers has changed by
 * `ratio` in either direction, then re-arms from the new distance so a long
 * continuous spread keeps reporting rather than firing once and going quiet.
 *
 * The `wheel` half is not a convenience — it is what makes this lesson
 * reviewable. A laptop has no second finger, so Ctrl and the scroll wheel is the
 * only way anybody can test, script or demonstrate this activity outside of
 * holding a phone, and it is the same gesture the main course's zoom lesson
 * teaches on a laptop. It is bound natively rather than through React's
 * `onWheel` because the listener has to be non-passive to call
 * `preventDefault()`, and React's synthetic wheel listeners are passive — without
 * that, Ctrl+scroll zooms the entire browser window instead.
 *
 * The element needs `touch-action: none`, or the browser zooms the page instead
 * of telling us about the second finger.
 */
export function usePinch(onPinch: (dir: "in" | "out") => void, { ratio = 1.15 }: { ratio?: number } = {}) {
  const points = useRef(new Map<number, { x: number; y: number }>());
  const base = useRef<number | null>(null);
  const latest = useRef(onPinch);
  latest.current = onPinch;

  const spread = () => {
    const [a, b] = Array.from(points.current.values());
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null;
  };

  const begin = usePointerTracking(
    (e) => {
      if (!points.current.has(e.pointerId)) return;
      points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const now = spread();
      if (now === null) return;
      if (base.current === null) {
        base.current = now;
        return;
      }
      if (now / base.current > ratio) {
        base.current = now;
        onPinch("out");
      } else if (base.current / now > ratio) {
        base.current = now;
        onPinch("in");
      }
    },
    (e) => {
      points.current.delete(e.pointerId);
      base.current = spread();
    },
  );

  /**
   * A **callback ref**, not `useRef` plus an effect, and this is the difference
   * between a working lesson and a dead one.
   *
   * The photo this attaches to only exists while a photo is open, so the node
   * arrives long after the hook first ran. An effect keyed on the handler
   * re-attaches when the *handler* changes, which in a guided lesson happens on
   * every step and hid the problem completely — but an assessment has no current
   * step, so the handler identity sat still, the effect never re-ran, and the
   * wheel listener was never attached to the photo at all. Pinching in the Unit 2
   * check did nothing, in the one place a learner has no ring to fall back on.
   *
   * A callback ref is invoked by React when the node mounts and again when it
   * unmounts, which is exactly the question being asked. The handler is read
   * through a ref so a new closure never causes a needless detach.
   */
  const node = useRef<HTMLDivElement | null>(null);
  const wheel = useRef((e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    latest.current(e.deltaY < 0 ? "out" : "in");
  });

  const ref = useCallback((el: HTMLDivElement | null) => {
    node.current?.removeEventListener("wheel", wheel.current);
    node.current = el;
    el?.addEventListener("wheel", wheel.current, { passive: false });
  }, []);

  return {
    ref,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        base.current = spread();
        begin();
      },
    },
  };
}

/**
 * A slider a finger can actually hit.
 *
 * A native `<input type="range">` on a phone has a thumb about 20px across and no
 * tolerance either side of the track, which is a poor target for the audience
 * this course is for — and Unit 5's whole point is that the person struggling to
 * read the screen can reach the brightness control. This maps the pointer's x
 * position across the *whole* row, so anywhere along the line works, including a
 * plain tap at the position you want, and the drag keeps working after the finger
 * has run off the end of the track.
 *
 * The element needs `touch-action: none`.
 */
export function useSliderDrag(onValue: (pct: number) => void) {
  const track = useRef<DOMRect | null>(null);

  const read = useCallback(
    (clientX: number) => {
      const r = track.current;
      if (!r || r.width === 0) return;
      onValue(Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100))));
    },
    [onValue],
  );

  const begin = usePointerTracking(
    (e) => read(e.clientX),
    () => {
      track.current = null;
    },
  );

  return {
    onPointerDown: (e: React.PointerEvent) => {
      track.current = e.currentTarget.getBoundingClientRect();
      read(e.clientX);
      begin();
    },
  };
}
