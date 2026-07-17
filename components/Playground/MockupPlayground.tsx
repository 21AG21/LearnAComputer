"use client";

import Image from "next/image";
import { ReactNode } from "react";

interface MockupPlaygroundProps {
  imageSrc: string;
  imageAlt: string;
  children?: ReactNode;
}

/**
 * Renders a designed playground mockup image at the largest size that fits the
 * screen (preserving its 1280x800 aspect ratio). Interactive areas are added
 * as invisible Hotspot buttons positioned in percentages of the image, so they
 * stay aligned at any screen size.
 */
export default function MockupPlayground({ imageSrc, imageAlt, children }: MockupPlaygroundProps) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-white">
      <div className="relative aspect-[1280/800]" style={{ width: "min(100vw, 160vh)" }}>
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          sizes="160vh"
          className="object-contain select-none"
          draggable={false}
        />
        {children}
      </div>
    </div>
  );
}

interface HotspotProps {
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

/** Invisible click target laid over an element drawn in the mockup image. Units are % of the image. */
export function Hotspot({ left, top, width, height, label, onClick, onDoubleClick, onContextMenu }: HotspotProps) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className="absolute bg-transparent border-none p-0 m-0 cursor-pointer"
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
    />
  );
}
