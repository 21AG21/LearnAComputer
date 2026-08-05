"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Touch gestures for the simulated computer, in its phone shape.
 *
 * ## Pointer Events, deliberately
 *
 * Touch events fire on a phone and never on a laptop; mouse events fire on a
 * laptop and only in a delayed, lied-about form on a phone. Pointer events are
 * the one family that reports both honestly, so a swipe written once works with
 * a finger *and* with a mouse held down and dragged. That matters here more than
 * anywhere else in the repo: the phone course is meant to be played on a phone,
 * but it is authored, reviewed and script-checked on a computer, and a gesture
 * only one of those can perform is a gesture nobody can verify.
 *
 * ## The drag is tracked on the window, not on the element
 *
 * Both of the obvious alternatives are wrong, and neither failure is visible
 * until you hit it:
 *
 * - **Listening on the element alone** loses the gesture the moment the finger
 *   leaves it, which for the 20px-tall bar you slide upward to go home is
 *   immediately. Every swipe died on its first frame.
 * - **`setPointerCapture` on `pointerdown`** fixes that and breaks something
 *   worse: while a pointer is captured, the `click` that follows is dispatched
 *   to the *capturing* element rather than to whatever was under the finger. A
 *   swipeable row silently swallowed every tap on the button inside it — a whole
 *   list that opened nothing.
 *
 * Listening on the window for the duration of the press has neither problem.
 *
 * ## `touch-action` is not optional
 *
 * A browser claims a gesture *before* it sends you the events for it. Left
 * alone, a vertical drag scrolls the page instead. Anything using `useSwipe` on
 * the y axis needs `touch-action: none`. Getting this wrong does not throw — it
 * produces a gesture that works with a mouse and does nothing with a finger.
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
  /** Live feedback while the finger is down. */
  onMove?: (dx: number, dy: number) => void;
  /** Restrict which axis is reported. `"x"` also lets the browser keep vertical scrolling. */
  axis?: "x" | "y" | "both";
  /**
   * How much sideways wander to forgive on a vertical swipe (and vice versa).
   *
   * The strict rule is "whichever axis moved further wins", which is fine for a
   * steady hand and wrong for the people this course is for. A tremor turns a
   * 60px upward slide into 60 up and 35 across, the dominant-axis test calls it
   * horizontal, and the gesture **fails silently** — the worst outcome there is,
   * because nothing tells the learner they nearly had it. Forgiving means a
   * swipe counts as vertical while the sideways drift stays under this multiple
   * of the vertical travel.
   */
  tolerance?: number;
  /**
   * Fires when the press ended without qualifying, so the caller can say so.
   *
   * Including a press that never moved at all. That looks like a non-event and
   * is in fact the single most likely first attempt from somebody who has never
   * swiped anything: they tap the bar, because tapping is the only thing this
   * course has taught them so far, and — before this — absolutely nothing
   * happened. A tap on a control that wants a slide is not noise, it is the
   * exact moment the learner needs the sentence explaining the difference.
   */
  onMissed?: () => void;
}

/**
 * A one-finger drag, reported once on release.
 *
 * Spread `props` onto the element. `consumeClick` is kept out of that object on
 * purpose: spreading a stray function onto a DOM node is a React warning and an
 * attribute nobody wanted.
 */
export function useSwipe(
  onEnd: (e: SwipeEnd) => void,
  { threshold = 40, onMove, axis = "both", tolerance = 1.2, onMissed }: SwipeOptions = {},
) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const moved = useRef(false);
  const onEndRef = useRef(onEnd);
  const onMoveRef = useRef(onMove);
  const onMissedRef = useRef(onMissed);
  onEndRef.current = onEnd;
  onMoveRef.current = onMove;
  onMissedRef.current = onMissed;

  const detach = useRef<(() => void) | null>(null);
  const stop = useCallback(() => {
    detach.current?.();
    detach.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  const begin = useCallback(() => {
    stop();
    const handleMove = (e: PointerEvent) => {
      const s = start.current;
      if (!s || s.id !== e.pointerId) return;
      if (Math.abs(e.clientX - s.x) > 8 || Math.abs(e.clientY - s.y) > 8) moved.current = true;
      onMoveRef.current?.(e.clientX - s.x, e.clientY - s.y);
    };
    const finish = (e: PointerEvent, cancelled: boolean) => {
      stop();
      const s = start.current;
      if (!s || s.id !== e.pointerId) return;
      start.current = null;
      if (cancelled) {
        onMoveRef.current?.(0, 0);
        return;
      }
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      let dir: SwipeDir | null = null;
      // Forgiving, not dominant-axis: a shaky vertical slide is still vertical.
      if (axis !== "y" && Math.abs(dx) >= threshold && Math.abs(dy) <= Math.abs(dx) * tolerance) {
        dir = dx < 0 ? "left" : "right";
      }
      if (!dir && axis !== "x" && Math.abs(dy) >= threshold && Math.abs(dx) <= Math.abs(dy) * tolerance) {
        dir = dy < 0 ? "up" : "down";
      }
      onEndRef.current({ dx, dy, dir });
      if (!dir) onMissedRef.current?.();
    };
    const up = (e: PointerEvent) => finish(e, false);
    const cancel = (e: PointerEvent) => finish(e, true);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    detach.current = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [axis, stop, threshold, tolerance]);

  return {
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
     * Call this first in the click handler of anything both swipeable and
     * tappable, and bail out when it returns true.
     */
    consumeClick: () => {
      if (!moved.current) return false;
      moved.current = false;
      return true;
    },
  };
}
