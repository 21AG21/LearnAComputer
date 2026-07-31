"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import WindowControls from "./WindowControls";

export const CELEBRATION_MS = 800;

export interface ObjectiveItem {
  label: string;
  done: boolean;
}

interface SimulatorFrameProps {
  appName: string;
  appIcon?: ReactNode;
  instruction?: string | null;
  stepIndex?: number;
  totalSteps?: number;
  done: boolean;
  goal: string;
  flash?: boolean;
  titleBarRight?: ReactNode;
  objectives?: ObjectiveItem[];
  /** Assessment nudge revealed by the Hint button. Should point at where to look, never give the answer. */
  hint?: string;
  onHint?: () => void;
  /** When false, skip the title bar and window border — children fill the pane directly. Default true. */
  chrome?: boolean;
  /** Free-play mode: no banner, no frame, no celebration — children fill the container directly. */
  freePlay?: boolean;
  children: ReactNode;
}

export default function SimulatorFrame({
  appName,
  appIcon,
  instruction,
  stepIndex,
  totalSteps,
  done,
  goal,
  flash,
  titleBarRight,
  objectives,
  hint,
  onHint,
  chrome = true,
  freePlay,
  children,
}: SimulatorFrameProps) {
  const isAssessment = !!objectives;
  const doneCount = objectives?.filter((o) => o.done).length ?? 0;
  const objTotal = objectives?.length ?? 0;
  const pct = isAssessment
    ? objTotal > 0 ? (doneCount / objTotal) * 100 : 0
    : totalSteps ? (Math.min(stepIndex ?? 0, totalSteps) / totalSteps) * 100 : 0;

  const frameRef = useRef<HTMLDivElement>(null);

  /**
   * Keep the highlighted control on screen.
   *
   * The course's promise to the learner is "look for the glow". Twice a window
   * has been an inch too short and put the glow just below its own bottom edge —
   * once on *Forgot password?*, once on the café portal's *Continue* — and both
   * times the learner was told to click something they could not see. No harness
   * noticed either, because the solver scrolls and a reader scrolls.
   *
   * Only containers **inside the frame** are scrolled. `scrollIntoView` would
   * also scroll the lesson page itself, which yanks the reading pane around for
   * a control that was never off the page to begin with.
   */
  /**
   * Has the simulated screen stopped moving?
   *
   * `ring-check` reads the ring's position, and a ring is legitimately off
   * screen for a frame or two whenever a panel is mid-render or a window is
   * opening. Sampling into that returned 6, 8 and 10 findings on three
   * consecutive runs of identical code, which is why that check prints leads
   * instead of failing a build. A checker cannot know when the sim is at rest;
   * the sim can. This is that signal.
   */
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    let queued = 0;
    let quiet: ReturnType<typeof setTimeout> | null = null;
    const QUIET_MS = 400;
    const markUnsettled = () => {
      setSettled(false);
      if (quiet) clearTimeout(quiet);
      quiet = setTimeout(() => setSettled(true), QUIET_MS);
    };
    /**
     * The control revealed last. Each one is brought into view **once**.
     *
     * Without this, every mutation re-scrolls, so a learner who scrolls away to
     * read something above the highlighted control gets yanked back on the next
     * animation frame. The glow is a hint, not a leash.
     */
    let revealedFor: HTMLElement | null = null;
    const reveal = () => {
      queued = 0;
      const rings = Array.from(
        frame.querySelectorAll<HTMLElement>("[class*='ring-yellow'],[class*='animate-ring-pulse']"),
      );
      // Innermost wins: rings nest when a highlighted control sits in a
      // highlighted row, and the inner one is the thing to click.
      const el = rings.find((r) => !rings.some((o) => o !== r && r.contains(o)));
      if (!el || el.offsetParent === null) return;
      if (el === revealedFor) return;
      revealedFor = el;

      for (let node = el.parentElement; node && frame.contains(node); node = node.parentElement) {
        const cs = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        if (/(auto|scroll)/.test(cs.overflowY) && node.scrollHeight > node.clientHeight) {
          const r = el.getBoundingClientRect();
          if (r.top < box.top) node.scrollTop -= box.top - r.top + 8;
          else if (r.bottom > box.bottom) node.scrollTop += r.bottom - box.bottom + 8;
        }
        if (/(auto|scroll)/.test(cs.overflowX) && node.scrollWidth > node.clientWidth) {
          const r = el.getBoundingClientRect();
          if (r.left < box.left) node.scrollLeft -= box.left - r.left + 8;
          else if (r.right > box.right) node.scrollLeft += r.right - box.right + 8;
        }
      }

      // Did it work?
      //
      // Reporting from right here removes the race an earlier version had, when
      // the audit lived in the solver's loop and returned 42, then 12, then 10
      // for the same course depending on how long it waited — it was timing the
      // reveal, not measuring the product.
      //
      // The record is a MAP, and every reveal overwrites this control's entry:
      // last observation wins. It is also only written once the screen has
      // stopped moving (`data-sim-settled`), because a ring is briefly out of
      // view whenever a panel is mid-render — reporting those made the count
      // wobble between 6 and 10 on identical code. `npm run ring-check` reads
      // what is left.
      if (process.env.NODE_ENV !== "production") {
        // Re-measure after the quiet period rather than now: `reveal` runs on
        // the mutation that started it, which is by definition mid-movement.
        const record = () => {
        const w = window as unknown as { __ringClipped?: Map<string, unknown>; __ringLesson?: string };
        const lesson = w.__ringLesson ?? "(unknown)";
        const control =
          (el.textContent || "").trim().slice(0, 40) || el.getAttribute("aria-label") || el.tagName;
        const key = `${lesson}|${control}`;
        w.__ringClipped ??= new Map();
        w.__ringClipped.delete(key);

        const r = el.getBoundingClientRect();
        for (let node = el.parentElement; node && frame.contains(node); node = node.parentElement) {
          const cs = getComputedStyle(node);
          if (!/(hidden|clip|auto|scroll)/.test(cs.overflowY + cs.overflowX)) continue;
          const box = node.getBoundingClientRect();
          if (r.bottom > box.bottom + 2 || r.top < box.top - 2 || r.right > box.right + 2 || r.left < box.left - 2) {
            w.__ringClipped.set(key, {
              lesson,
              control,
              say: (instruction ?? goal ?? "").slice(0, 90),
              scrollable: node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1,
              by: `${node.tagName.toLowerCase()}.${(node.className || "").toString().split(/\s+/).slice(0, 3).join(".")}`,
            });
            return;
          }
        }
        };
        if (quiet) clearTimeout(quiet);
        quiet = setTimeout(() => {
          setSettled(true);
          record();
        }, QUIET_MS);
      }
    };

    const schedule = () => {
      markUnsettled();
      if (queued) return;
      // Two frames: one for React's commit, one for any layout the sim does
      // after it (a window opening, a panel expanding).
      queued = requestAnimationFrame(() => requestAnimationFrame(reveal));
    };

    schedule();
    // The ring moves between renders that this effect's deps cannot see —
    // multi-phase steps re-target it without touching stepIndex.
    const obs = new MutationObserver(schedule);
    obs.observe(frame, { attributes: true, attributeFilter: ["class"], subtree: true, childList: true });
    return () => {
      obs.disconnect();
      if (quiet) clearTimeout(quiet);
      if (queued) cancelAnimationFrame(queued);
    };
  }, [stepIndex, done, instruction, goal]);

  const [expanded, setExpanded] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCompleteBanner, setShowCompleteBanner] = useState(false);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDone = useRef(done);

  useEffect(() => {
    if (done && !prevDone.current) {
      setShowCelebration(true);
      celebrationTimer.current = setTimeout(() => {
        setShowCelebration(false);
        setShowCompleteBanner(true);
      }, CELEBRATION_MS);
    }
    prevDone.current = done;
    return () => {
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    };
  }, [done]);

  /**
   * Free play: no banner, no progress bar — the app fills the window.
   *
   * This must be a flex column, not a plain block. Every sim's body is a
   * `flex-1` pane that scrolls internally, and `flex-1` against a block parent
   * sizes to *content* rather than to the window: Photos grew to 1605px inside
   * a 514px window and the `overflow-hidden` here silently ate the other 1091.
   * Two thirds of the photo library was on screen for nobody. Same bug in App
   * Market and the browser. `min-h-0` is what stops a flex item refusing to
   * shrink below its content.
   */
  if (freePlay)
    return <div className="h-full w-full min-h-0 flex flex-col overflow-hidden">{children}</div>;

  return (
    <div
      ref={frameRef}
      className="h-full flex flex-col bg-white overflow-hidden select-none relative"
      // Read by the solve-check harness (/dev/solve-check) to tell whether a gesture
      // advanced the activity. Parsing "Step 3 of 9" out of the banner text worked
      // until the banner was translated or reworded; an attribute is the contract.
      data-sim-frame=""
      data-sim-done={done ? "1" : "0"}
      data-sim-progress={isAssessment ? doneCount : Math.min(stepIndex ?? 0, totalSteps ?? 0)}
      data-sim-total={isAssessment ? objTotal : (totalSteps ?? 0)}
      data-sim-mode={isAssessment ? "assessment" : "guided"}
      // "1" once nothing inside the frame has changed for 400ms. Checks that
      // measure geometry must wait for this; measuring a moving screen is how
      // a check reports a race and calls it a defect.
      data-sim-settled={settled ? "1" : "0"}
      // Which objectives are met, as a bitstring ("01100…"). The solver pursues
      // exactly the first unmet one; guessing blindly made it lap through
      // objectives and trample one objective's target while chasing another.
      data-sim-objdone={isAssessment ? objectives!.map((o) => (o.done ? "1" : "0")).join("") : undefined}
    >
      {/* Guidance banner */}
      <div className="shrink-0 bg-[#1d2733] text-white px-5 py-3">
        <div className="flex items-center gap-3">
          {(done || isAssessment || totalSteps != null) && (
            <>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
                {done
                  ? "Done"
                  : isAssessment
                    ? `Objectives: ${doneCount} of ${objTotal} done`
                    : `Step ${(stepIndex ?? 0) + 1} of ${totalSteps ?? 0}`}
              </span>
              <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </>
          )}
        </div>
        <div className="mt-1.5 flex items-start justify-between gap-3">
          {/* aria-live: the single most important a11y hook in the product. Every
              guided lesson teaches by swapping this instruction on each step; a
              screen-reader learner must be told it changed, or they are stranded
              after every step with a silent, purely-visual ring as the only cue. */}
          <p className="text-lg font-semibold leading-snug" role="status" aria-live="polite" aria-atomic="true">
            {done ? goal + " — all done!" : instruction ?? goal}
          </p>
          {isAssessment && !done && (
            <div className="flex items-center gap-2 shrink-0">
              {(hint || onHint) && (
                <button
                  onClick={() => { setHintOpen((v) => !v); onHint?.(); }}
                  aria-expanded={hint ? hintOpen : undefined}
                  className="px-3 py-1 bg-yellow-500 text-black font-bold rounded text-sm hover:bg-yellow-400 transition-colors"
                >
                  Hint
                </button>
              )}
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-white/70 hover:text-white text-lg leading-none px-1"
                aria-label={expanded ? "Collapse objectives" : "Expand objectives"}
              >
                {expanded ? "▲" : "▼"}
              </button>
            </div>
          )}
        </div>
        {isAssessment && hintOpen && hint && !done && (
          <div className="mt-2 rounded border border-yellow-400/50 bg-yellow-400/10 px-3 py-2 text-sm text-yellow-100">
            {hint}
          </div>
        )}
        {isAssessment && expanded && objectives && (
          <div className="mt-2 border-t border-white/20 pt-2 space-y-1">
            {objectives.map((obj, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-sm ${obj.done ? "text-green-400" : "text-white/60"}`}
              >
                <span className="w-4 text-center">{obj.done ? "✓" : "○"}</span>
                <span>{obj.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slim completion banner — visible after celebration clears */}
      {showCompleteBanner && (
        <div className="shrink-0 bg-green-100 border-b border-green-300 px-4 py-1.5 flex items-center gap-2 text-green-800 text-sm font-medium">
          <span className="text-green-700 sim-dark:text-green-400">&#10003;</span>
          Lesson complete! You can keep practicing here.
        </div>
      )}

      {/* App window */}
      {chrome ? (
        <div className="flex-1 min-h-0 p-3">
          <div className="h-full flex flex-col border-2 border-gray-800 rounded-lg overflow-hidden shadow-md bg-white">
            {/* Title bar */}
            <div className="shrink-0 bg-gray-100 border-b-2 border-gray-800 px-3 py-2 flex items-center gap-2">
              <span className="font-bold text-gray-700 flex items-center gap-1.5 font-[var(--font-app-title)]">
                {appIcon && <span aria-hidden="true">{appIcon}</span>}
                {appName}
              </span>
              <div className="flex-1 flex justify-end">{titleBarRight}</div>
              <WindowControls />
            </div>
            {/* App body */}
            <div className="flex-1 min-h-0 flex flex-col bg-white relative">{children}</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 relative bg-white">{children}</div>
      )}

      {/* Celebration overlay — shows briefly then disappears */}
      {showCelebration && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm animate-pop-in pointer-events-none">
          <div className="bg-green-700 text-white text-5xl w-24 h-24 rounded-full flex items-center justify-center shadow-2xl animate-ping-once">
            &#10003;
          </div>
          <p className="text-xl font-bold text-white text-center px-6 drop-shadow-md">{goal}</p>
        </div>
      )}

      {/* Per-step flash */}
      {flash && !done && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <span className="text-green-400 text-6xl animate-ping-once drop-shadow-lg">&#10003;</span>
        </div>
      )}
    </div>
  );
}
