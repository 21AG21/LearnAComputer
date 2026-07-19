"use client";

/**
 * One neutral, generalized set of window buttons used by every simulator so the
 * whole course looks like a single computer — minimize, maximize, close, drawn
 * on the RIGHT the way most computers do it (deliberately NOT the coloured
 * dots-on-the-left that read as one specific brand).
 *
 * Pass a handler to make a control a real button; omit it and the control is
 * inert chrome (used by the guided activities, whose window can't be closed).
 */

type ControlKind = "minimize" | "maximize" | "close";

interface WindowControlsProps {
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  /** Pulse-highlight one control (used by the "Working with Windows" lesson). */
  highlight?: ControlKind | null;
  /** Hide the maximize control where it doesn't apply. */
  showMaximize?: boolean;
}

const pulse = "ring-4 ring-yellow-400 animate-pulse";

function Glyph({ kind }: { kind: ControlKind }) {
  if (kind === "minimize") return <span className="block w-3.5 h-[3px] bg-current rounded-full" />;
  if (kind === "maximize") return <span className="block w-3 h-3 border-2 border-current rounded-[3px]" />;
  return <span className="block leading-none text-base font-bold">✕</span>;
}

export default function WindowControls({
  onMinimize,
  onMaximize,
  onClose,
  highlight,
  showMaximize = true,
}: WindowControlsProps) {
  const anyInteractive = !!(onMinimize || onMaximize || onClose);
  const items: { kind: ControlKind; on?: () => void; label: string }[] = [
    { kind: "minimize", on: onMinimize, label: "Minimize" },
    ...(showMaximize ? [{ kind: "maximize" as const, on: onMaximize, label: "Maximize" }] : []),
    { kind: "close", on: onClose, label: "Close" },
  ];

  return (
    <div
      className={`flex items-center gap-1.5 shrink-0 ${anyInteractive ? "" : "text-gray-400"}`}
      aria-hidden={anyInteractive ? undefined : true}
    >
      {items.map(({ kind, on, label }) =>
        on ? (
          <button
            key={kind}
            onClick={on}
            aria-label={label}
            className={`w-7 h-6 flex items-center justify-center rounded transition-colors ${
              kind === "close" ? "text-gray-600 hover:bg-red-500 hover:text-white" : "text-gray-600 hover:bg-gray-200"
            } ${highlight === kind ? pulse : ""}`}
          >
            <Glyph kind={kind} />
          </button>
        ) : (
          <span key={kind} className="w-5 h-5 flex items-center justify-center">
            <Glyph kind={kind} />
          </span>
        )
      )}
    </div>
  );
}
