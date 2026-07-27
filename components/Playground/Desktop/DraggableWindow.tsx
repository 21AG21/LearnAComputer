"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import WindowControls from "../WindowControls";

const MOVE_THRESH = 20;
const RESIZE_THRESH = 15;
const MIN_W = 220;
const MIN_H = 140;

export interface DraggableWindowProps {
  title: string;
  icon?: ReactNode;
  /** Starting position and size (used on first mount only). */
  initial: { x: number; y: number; w: number; h: number };
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
  children: ReactNode;
}

export default function DraggableWindow({
  title, icon, initial, minimized, onClose, onMinimize, onMaximize,
  highlight, onMoved, onResized, className, children,
}: DraggableWindowProps) {
  const [pos, setPos] = useState({ x: initial.x, y: initial.y });
  const [size, setSize] = useState({ w: initial.w, h: initial.h });
  const [isMaximized, setIsMaximized] = useState(false);

  const dragRef = useRef<{ cx: number; cy: number; ix: number; iy: number; lastX: number; lastY: number } | null>(null);
  const resizeRef = useRef<{ cx: number; cy: number; iw: number; ih: number; lastW: number; lastH: number } | null>(null);
  const dragStartRef = useRef({ x: initial.x, y: initial.y });
  const resizeStartRef = useRef({ w: initial.w, h: initial.h });
  const savedRef = useRef({ x: initial.x, y: initial.y, w: initial.w, h: initial.h });

  const onMovedRef = useRef(onMoved);
  onMovedRef.current = onMoved;
  const onResizedRef = useRef(onResized);
  onResizedRef.current = onResized;

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      if (dragRef.current) {
        const { cx, cy, ix, iy } = dragRef.current;
        const nx = ix + e.clientX - cx;
        const ny = Math.max(0, iy + e.clientY - cy);
        dragRef.current.lastX = nx;
        dragRef.current.lastY = ny;
        setPos({ x: nx, y: ny });
      }
      if (resizeRef.current) {
        const { cx, cy, iw, ih } = resizeRef.current;
        const nw = Math.max(MIN_W, iw + e.clientX - cx);
        const nh = Math.max(MIN_H, ih + e.clientY - cy);
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

  function onTitleDown(e: React.MouseEvent) {
    if (isMaximized) return;
    e.preventDefault();
    dragStartRef.current = { ...pos };
    dragRef.current = { cx: e.clientX, cy: e.clientY, ix: pos.x, iy: pos.y, lastX: pos.x, lastY: pos.y };
  }

  function onResizeDown(e: React.MouseEvent) {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    resizeStartRef.current = { ...size };
    resizeRef.current = { cx: e.clientX, cy: e.clientY, iw: size.w, ih: size.h, lastW: size.w, lastH: size.h };
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
      className={`absolute shadow-2xl border-2 border-gray-700 rounded-lg overflow-hidden flex flex-col bg-white select-none ${className ?? ""}`}
      style={isMaximized ? { inset: 4 } : { left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      {/* Title bar */}
      <div
        className={`shrink-0 bg-gray-100 border-b-2 border-gray-700 px-3 py-2 flex items-center gap-2 ${
          !isMaximized ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        } ${highlight === "titlebar" ? "ring-4 ring-yellow-400 ring-inset animate-pulse" : ""}`}
        onMouseDown={onTitleDown}
      >
        {icon && <span className="flex items-center" aria-hidden="true">{icon}</span>}
        <span className="font-bold text-gray-700 text-sm font-[var(--font-app-title)]">{title}</span>
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
          className={`absolute bottom-0 right-0 w-8 h-8 cursor-se-resize rounded-tl-sm ${
            highlight === "resize" ? "ring-4 ring-yellow-400 animate-pulse" : ""
          }`}
          onMouseDown={onResizeDown}
          aria-label="Drag to resize"
          style={{
            background: "repeating-linear-gradient(135deg, transparent, transparent 3px, #999 3px, #999 4px)",
          }}
        />
      )}
    </div>
  );
}
