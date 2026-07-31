"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import WindowControls from "../WindowControls";

const MOVE_THRESH = 20;
const RESIZE_THRESH = 15;
const KEY_STEP = 12; // px nudge per arrow key — the no-drag path to move/resize
const MIN_W = 220;
const MIN_H = 140;

export interface DraggableWindowProps {
  title: string;
  icon?: ReactNode;
  /** Starting position and size (used on first mount only). */
  initial: { x: number; y: number; w: number; h: number };
  /**
   * Shrink `initial` on mount so the window fits inside its desktop.
   *
   * Off by default: `FakeDesktop` cascades several windows on purpose and must
   * keep its offsets. On by default would collapse that cascade on a narrow
   * pane. Single-window lessons want it — a 520px window on a 435px pane hangs
   * off the right edge and clips the very control the step is ringing.
   */
  fit?: boolean;
  /** When true, the window hides but children stay mounted (state preserved). */
  minimized?: boolean;
  onClose: () => void;
  onMinimize: () => void;
  /**
   * Called after the maximize button is clicked.
   * Receives the new maximized state so callers can call tryStep correctly.
   */
  onMaximize?: (isNowMaximized: boolean) => void;
  /** Pulse-highlight one control or the drag/resize handle. */
  highlight?: "minimize" | "maximize" | "close" | "titlebar" | "resize" | null;
  /** Fired when the window is dragged past the movement threshold. */
  onMoved?: () => void;
  /** Fired when the window is resized past the resize threshold. */
  onResized?: () => void;
  /** Applied to the root element — use for CSS animations. */
  className?: string;
  /** Stacking order. Higher sits on top of other windows. */
  z?: number;
  /** Fired when the learner touches this window anywhere — used to raise it. */
  onFocus?: () => void;
  /** Dims the title bar when another window is on top, like a real desktop. */
  focused?: boolean;
  children: ReactNode;
}

export default function DraggableWindow({
  title, icon, initial, fit, minimized, onClose, onMinimize, onMaximize,
  highlight, onMoved, onResized, className, z, onFocus, focused = true, children,
}: DraggableWindowProps) {
  const [pos, setPos] = useState({ x: initial.x, y: initial.y });
  const [size, setSize] = useState({ w: initial.w, h: initial.h });
  const [isMaximized, setIsMaximized] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<{ cx: number; cy: number; ix: number; iy: number; lastX: number; lastY: number; maxX: number; maxY: number } | null>(null);
  const resizeRef = useRef<{ cx: number; cy: number; iw: number; ih: number; lastW: number; lastH: number; maxW: number; maxH: number } | null>(null);
  const dragStartRef = useRef({ x: initial.x, y: initial.y });
  const resizeStartRef = useRef({ w: initial.w, h: initial.h });
  const savedRef = useRef({ x: initial.x, y: initial.y, w: initial.w, h: initial.h });
  const kbMove = useRef({ dx: 0, dy: 0, fired: false });
  const kbResize = useRef({ dw: 0, dh: 0, fired: false });

  const onMovedRef = useRef(onMoved);
  onMovedRef.current = onMoved;
  const onResizedRef = useRef(onResized);
  onResizedRef.current = onResized;

  // Fit to the desktop once, on mount. Measured rather than guessed, because the
  // playground pane's size depends on the browser window, so it must be measured.
  useEffect(() => {
    if (!fit) return;
    const host = rootRef.current?.parentElement;
    if (!host?.clientWidth || !host.clientHeight) return;
    const margin = 8;
    const w = Math.max(MIN_W, Math.min(initial.w, host.clientWidth - initial.x - margin));
    const h = Math.max(MIN_H, Math.min(initial.h, host.clientHeight - initial.y - margin));
    setSize({ w, h });
    setPos({
      x: Math.max(0, Math.min(initial.x, host.clientWidth - w - margin)),
      y: Math.max(0, Math.min(initial.y, host.clientHeight - h - margin)),
    });
    // Geometry is a mount-time decision — re-running would yank a window the
    // learner has since dragged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit]);

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      if (dragRef.current) {
        const { cx, cy, ix, iy, maxX, maxY } = dragRef.current;
        // Clamped to the desktop. Unclamped, a learner who dragged the window
        // down — which is exactly what step 1 of Unit 1's window lesson asks
        // for — pushed its bottom-right resize handle out through the
        // desktop's `overflow-hidden` edge, and step 2 then highlighted a
        // corner handle that was no longer on screen at all.
        const nx = Math.min(Math.max(0, ix + e.clientX - cx), maxX);
        const ny = Math.min(Math.max(0, iy + e.clientY - cy), maxY);
        dragRef.current.lastX = nx;
        dragRef.current.lastY = ny;
        setPos({ x: nx, y: ny });
      }
      if (resizeRef.current) {
        const { cx, cy, iw, ih, maxW, maxH } = resizeRef.current;
        // Same reason: growing the window past the desktop takes the handle
        // the learner is dragging out of view from under their own cursor.
        const nw = Math.min(Math.max(MIN_W, iw + e.clientX - cx), maxW);
        const nh = Math.min(Math.max(MIN_H, ih + e.clientY - cy), maxH);
        resizeRef.current.lastW = nw;
        resizeRef.current.lastH = nh;
        setSize({ w: nw, h: nh });
      }
    }
    function handleUp() {
      if (dragRef.current) {
        const moved =
          Math.abs(dragRef.current.lastX - dragStartRef.current.x) >= MOVE_THRESH ||
          Math.abs(dragRef.current.lastY - dragStartRef.current.y) >= MOVE_THRESH;
        dragRef.current = null;
        if (moved) onMovedRef.current?.();
      }
      if (resizeRef.current) {
        const resized =
          Math.abs(resizeRef.current.lastW - resizeStartRef.current.w) >= RESIZE_THRESH ||
          Math.abs(resizeRef.current.lastH - resizeStartRef.current.h) >= RESIZE_THRESH;
        resizeRef.current = null;
        if (resized) onResizedRef.current?.();
      }
    }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  /** The desktop this window lives in, measured when a gesture starts. */
  function hostBox() {
    const host = rootRef.current?.parentElement;
    return { w: host?.clientWidth ?? 0, h: host?.clientHeight ?? 0 };
  }

  function onTitleDown(e: React.MouseEvent) {
    if (isMaximized) return;
    e.preventDefault();
    dragStartRef.current = { ...pos };
    const host = hostBox();
    dragRef.current = {
      cx: e.clientX, cy: e.clientY, ix: pos.x, iy: pos.y, lastX: pos.x, lastY: pos.y,
      // Measured at mousedown rather than read from state: the move handler is
      // bound once with [] deps and would close over a stale size.
      maxX: host.w ? Math.max(0, host.w - size.w) : Infinity,
      maxY: host.h ? Math.max(0, host.h - size.h) : Infinity,
    };
  }

  function onResizeDown(e: React.MouseEvent) {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    resizeStartRef.current = { ...size };
    const host = hostBox();
    resizeRef.current = {
      cx: e.clientX, cy: e.clientY, iw: size.w, ih: size.h, lastW: size.w, lastH: size.h,
      maxW: host.w ? Math.max(MIN_W, host.w - pos.x) : Infinity,
      maxH: host.h ? Math.max(MIN_H, host.h - pos.y) : Infinity,
    };
  }

  // Keyboard move/resize — the no-drag, keyboard-operable path. Defined in render
  // scope so they read the current pos/size (the mouse handlers are bound with []).
  const ARROW: Record<string, [number, number]> = {
    ArrowLeft: [-KEY_STEP, 0], ArrowRight: [KEY_STEP, 0], ArrowUp: [0, -KEY_STEP], ArrowDown: [0, KEY_STEP],
  };

  function onTitleKey(e: React.KeyboardEvent) {
    // Only when the title bar itself is focused — not a control button inside it.
    if (isMaximized || e.target !== e.currentTarget) return;
    const d = ARROW[e.key];
    if (!d) return;
    e.preventDefault();
    const host = hostBox();
    const maxX = host.w ? Math.max(0, host.w - size.w) : Infinity;
    const maxY = host.h ? Math.max(0, host.h - size.h) : Infinity;
    const nx = Math.min(Math.max(0, pos.x + d[0]), maxX);
    const ny = Math.min(Math.max(0, pos.y + d[1]), maxY);
    kbMove.current.dx += nx - pos.x;
    kbMove.current.dy += ny - pos.y;
    setPos({ x: nx, y: ny });
    if (!kbMove.current.fired && (Math.abs(kbMove.current.dx) >= MOVE_THRESH || Math.abs(kbMove.current.dy) >= MOVE_THRESH)) {
      kbMove.current.fired = true;
      onMovedRef.current?.();
    }
  }

  function onResizeKey(e: React.KeyboardEvent) {
    if (isMaximized) return;
    const d = ARROW[e.key];
    if (!d) return;
    e.preventDefault();
    const host = hostBox();
    const maxW = host.w ? Math.max(MIN_W, host.w - pos.x) : Infinity;
    const maxH = host.h ? Math.max(MIN_H, host.h - pos.y) : Infinity;
    const nw = Math.min(Math.max(MIN_W, size.w + d[0]), maxW);
    const nh = Math.min(Math.max(MIN_H, size.h + d[1]), maxH);
    kbResize.current.dw += nw - size.w;
    kbResize.current.dh += nh - size.h;
    setSize({ w: nw, h: nh });
    if (!kbResize.current.fired && (Math.abs(kbResize.current.dw) >= RESIZE_THRESH || Math.abs(kbResize.current.dh) >= RESIZE_THRESH)) {
      kbResize.current.fired = true;
      onResizedRef.current?.();
    }
  }

  function handleMaximize() {
    if (!isMaximized) {
      savedRef.current = { x: pos.x, y: pos.y, w: size.w, h: size.h };
      setIsMaximized(true);
      onMaximize?.(true);
    } else {
      setIsMaximized(false);
      setPos({ x: savedRef.current.x, y: savedRef.current.y });
      setSize({ w: savedRef.current.w, h: savedRef.current.h });
      onMaximize?.(false);
    }
  }

  const hlControl =
    highlight === "minimize" ? "minimize" :
    highlight === "maximize" ? "maximize" :
    highlight === "close" ? "close" :
    null;

  // Keep children mounted while minimized so their state survives.
  if (minimized) {
    return <div style={{ display: "none" }}>{children}</div>;
  }

  return (
    <div
      ref={rootRef}
      className={`absolute shadow-2xl border-2 rounded-lg overflow-hidden flex flex-col bg-white sim-dark:bg-gray-900 select-none ${
        focused ? "border-gray-700 sim-dark:border-gray-500" : "border-gray-400 sim-dark:border-gray-700"
      } ${className ?? ""}`}
      style={
        isMaximized
          ? { inset: 4, zIndex: z }
          : { left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex: z }
      }
      // Capture, so raising the window happens even when the click lands on a
      // control inside it that stops propagation.
      onMouseDownCapture={onFocus}
    >
      {/* Title bar */}
      <div
        // The app glyph draws in `currentColor`, so the bar sets a color for it to
        // inherit — without one it picked up whatever the page outside the sim had.
        className={`shrink-0 border-b-2 px-3 py-2 flex items-center gap-2 text-gray-700 sim-dark:text-gray-200 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
          focused
            ? "bg-gray-100 border-gray-700 sim-dark:bg-gray-800 sim-dark:border-gray-500"
            : "bg-gray-200/70 border-gray-400 sim-dark:bg-gray-800/60 sim-dark:border-gray-700"
        } ${!isMaximized ? "cursor-grab active:cursor-grabbing" : "cursor-default"} ${
          highlight === "titlebar" ? "ring-4 ring-yellow-400 ring-inset animate-pulse" : ""
        }`}
        onMouseDown={onTitleDown}
        tabIndex={isMaximized ? -1 : 0}
        aria-label="Window title bar. Drag to move, or press the arrow keys to move it."
        onKeyDown={onTitleKey}
      >
        {icon && <span className="flex items-center" aria-hidden="true">{icon}</span>}
        <span className={`font-bold text-sm font-[var(--font-app-title)] ${focused ? "text-gray-700 sim-dark:text-gray-100" : "text-gray-500 sim-dark:text-gray-400"}`}>{title}</span>
        <div className="flex-1" />
        <WindowControls
          onMinimize={onMinimize}
          onMaximize={handleMaximize}
          onClose={onClose}
          highlight={hlControl}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {children}
      </div>

      {/* Resize handle */}
      {!isMaximized && (
        <div
          role="button"
          tabIndex={0}
          className={`absolute bottom-0 right-0 w-8 h-8 cursor-se-resize rounded-tl-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
            highlight === "resize" ? "ring-4 ring-yellow-400 animate-pulse" : ""
          }`}
          onMouseDown={onResizeDown}
          onKeyDown={onResizeKey}
          aria-label="Resize the window. Drag, or press the arrow keys."
          style={{
            background: "repeating-linear-gradient(135deg, transparent, transparent 3px, #999 3px, #999 4px)",
          }}
        />
      )}
    </div>
  );
}
