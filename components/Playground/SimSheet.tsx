"use client";

import type { ReactNode } from "react";
import { useIsPhone } from "./SimFormFactor";

/**
 * A dialog that knows which machine it is on.
 *
 * A laptop asks a question in a box floating in the middle of the screen. A
 * phone asks it in a sheet that rises from the bottom edge — every phone, every
 * time, for the same reason the home bar is at the bottom: that is where the
 * thumb is, and a box in the middle of a 390px screen is a thing that has
 * *landed on* the page rather than a thing the page is doing.
 *
 * That difference is not decoration for this audience. Unit 10 spends four
 * lessons teaching that a box appearing in the middle of the screen is how a
 * scam gets your attention. Drawing the course's own honest dialogs the same
 * way teaches the opposite of the lesson.
 *
 * The pattern was already written correctly twice — the Mail attachment picker
 * and the Files viewer — and hand-rolled seven other times without the phone
 * branch, in the browser and in troubleshooting. This is those two, extracted,
 * so the eighth author gets it right without knowing the rule.
 *
 * `onClose` on the scrim is the phone's own dismissal (tap outside), and it is
 * optional: a dialog that must be answered passes nothing and stays put.
 */
export default function SimSheet({
  children,
  onClose,
  z = "z-40",
  scrim = "bg-black/40",
  className,
}: {
  children: ReactNode;
  /** Tapping the scrim dismisses. Omit for a dialog that must be answered. */
  onClose?: () => void;
  /** Stacking, when the caller sits inside something already positioned. */
  z?: string;
  scrim?: string;
  /** Extra classes for the panel itself — a width cap, a background. */
  className?: string;
}) {
  const isPhone = useIsPhone();
  return (
    <div
      onClick={onClose}
      className={`absolute inset-0 flex ${z} ${scrim} ${
        isPhone ? "items-end" : "items-center justify-center p-4"
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${
          isPhone
            ? // Full width, anchored to the bottom edge, and it slides up. The
              // rounded top corners are the phone's own signal that the thing
              // came from off screen and can go back there.
              "w-full animate-sheet-up rounded-t-2xl"
            : "animate-slide-down rounded-xl"
        } ${className ?? ""}`}
      >
        {children}
      </div>
    </div>
  );
}
