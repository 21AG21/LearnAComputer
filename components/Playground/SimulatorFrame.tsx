"use client";

import { inPhoneWords } from "@/lib/phoneWords";

import { useEffect, useRef, useState, type ReactNode } from "react";
import WindowControls from "./WindowControls";
import { useIsPhone, usePhoneHome } from "./SimFormFactor";
import PhoneShell from "./PhoneShell";
import type { PhoneNavEntry } from "./PhoneChrome";
import { SimThemeProvider } from "./Desktop/SimThemeContext";

export const CELEBRATION_MS = 800;

export interface ObjectiveItem {
  label: string;
  done: boolean;
}

interface SimulatorFrameProps {
  appName: string;
  appIcon?: ReactNode;
  instruction?: string | null;
  /** The current guided step — lets the banner show a big "Type this" box on typing steps. */
  currentStep?: { action?: string; value?: string; url?: string; query?: string } | null;
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
  /**
   * Draw the phone's status strip and home bar around the children.
   *
   * Only consulted in the phone form factor, where it defaults to on. The
   * simulators that render `FakeDesktop` themselves pass `false`: that component
   * grows its own strip and bar, and two of each is two clocks and two home bars.
   */
  phoneChrome?: boolean;
  /**
   * Rewrite laptop words for touch. On by default in the phone form factor,
   * because almost every lesson there is a borrowed laptop lesson. The phone's
   * own gesture lessons pass `false`: they are already in phone language and
   * name the laptop deliberately.
   */
  phoneWording?: boolean;
  /**
   * Which screen inside the app the learner is on, for the phone's nav bar.
   *
   * A prop rather than the `PhoneNavProvider` context that apps inside
   * `FakeDesktop` use, because a guided sim *renders* this frame — it is the
   * parent of `PhoneShell`, not a descendant, so a context published from its
   * body would never reach the bar. Omit it and the bar shows the app's name
   * with a chevron pointing home, which is right for a one-screen app.
   */
  phoneNav?: PhoneNavEntry;
  /** Free-play mode: no banner, no frame, no celebration — children fill the container directly. */
  freePlay?: boolean;
  children: ReactNode;
}

/**
 * The exact text a guided step asks the learner to type — or undefined if the
 * step is not a typing step. Feeds the big "Type this" box in the banner, so the
 * learner never has to dig the value out of a sentence or invent it themselves.
 */
export function typeTargetFor(
  step: { action?: string; value?: string; url?: string; query?: string } | null | undefined,
): string | undefined {
  const a = step?.action;
  if (!a) return undefined;
  const v = a === "navigate" ? step?.url : a === "search" ? step?.query : step?.value;
  if (!v || !v.trim()) return undefined;
  const TYPING = new Set([
    "navigate", "search", "new-folder", "rename", "save",
    "set-title", "set-time", "set-reminder-text",
    "set-subject", "set-body", "set-to", "set-cc", "set-bcc",
    "send-message", "send-group-message",
    "type-username", "type-new-password",
  ]);
  return TYPING.has(a) ? v : undefined;
}

/**
 * Set the string a learner has to type *into the sentence*, as a chip.
 *
 * The laptop shows it in its own white card under the instruction. On a phone
 * that card cost 52px of screen — and 52px reserved on **every** step, typing
 * or not, because a box that appears mid-lesson shoves the whole device down
 * and a status bar that moves is the one thing a status bar must never do.
 *
 * The card turns out to be redundant there: of the 68 typing steps in the
 * course, 62 already name the value in their own words, and the other six are
 * assessment objectives, where there is no current step and the card never
 * rendered anyway. So the phone marks up the occurrence that is already in the
 * sentence — monospace, boxed, exact — and pays nothing for it.
 *
 * If the value somehow is not in the sentence, it is appended rather than
 * dropped: losing the string a learner must copy is much worse than a slightly
 * clumsy line.
 */
function withTypeChip(line: string, value: string): ReactNode {
  const at = line.toLowerCase().indexOf(value.toLowerCase());
  const chip = (
    <code className="mx-0.5 whitespace-nowrap rounded bg-white px-1.5 py-0.5 font-mono text-[15px] font-bold text-gray-900">
      {value}
    </code>
  );
  if (at < 0) return <>{line} {chip}</>;
  return (
    <>
      {line.slice(0, at)}
      {chip}
      {line.slice(at + value.length)}
    </>
  );
}

/**
 * Re-exported so the many call sites that already import it from here keep
 * working. The rules themselves live in `lib/phoneWords.ts`, where a script can
 * import them too — see `npm run phone-words-check`.
 */
export { inPhoneWords };


/**
 * The same rewrite, for text a *component* renders rather than the lesson JSON.
 *
 * The banner and the teaching card were being translated and the apps
 * underneath were not, so a phone learner read "Open App Market from the dock"
 * and "Click the WiFi icon in the menu bar" inside the simulator itself. Wrap
 * those strings in this and they follow the same one rulebook.
 */
export function useSimWords(): (text: string) => string {
  const isPhone = useIsPhone();
  return isPhone ? inPhoneWords : (t: string) => t;
}

export default function SimulatorFrame({
  appName,
  appIcon,
  instruction,
  currentStep,
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
  phoneChrome = true,
  phoneWording = true,
  phoneNav,
  freePlay,
  children,
}: SimulatorFrameProps) {
  const isPhone = useIsPhone();
  const goHome = usePhoneHome();
  const isAssessment = !!objectives;
  const typeThis = typeTargetFor(currentStep);
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
    /**
     * Did the last attempt actually get this ring into view?
     *
     * The latch above exists so a learner who scrolls away to read something is
     * not yanked back — the glow is a hint, not a leash. But latching on a
     * *failed* reveal is a different thing: it means one bad measurement, taken
     * while the app was still animating in or before the layout had settled,
     * permanently gives up on showing the control.
     *
     * That is invisible at 1440x900, where almost everything fits anyway, and
     * it is seven lessons at 390x844 — the first phone-size run of `ring-check`
     * found the browser's popup ✕, the recipe download and the Forgot-password
     * link all clipped by a container that could have been scrolled.
     *
     * So: latch on success, retry on failure. A learner who has been shown the
     * ring keeps their scroll position; a ring that was never shown gets
     * another go on the next mutation.
     */
    let revealedOk = false;
    /**
     * How many times this control has been re-revealed *after* the screen
     * stopped moving.
     *
     * `reveal` only ever ran on a DOM mutation, so an attempt made while a
     * window was still opening was the last word on that control: the sim
     * settles, no further mutation arrives, and nothing tries again. The
     * `revealedOk` latch above could ask for a retry but had no way to cause
     * one. That is why *Forgot password?* and the error-code Copy button stayed
     * clipped on a phone through several rounds of fixing the latch — the
     * retry existed and was never reachable.
     *
     * Bounded, because a control that is genuinely too big for its container
     * cannot be scrolled into view and must not spin trying.
     */
    let retries = 0;
    const MAX_RETRIES = 3;
    /** The first ancestor inside the frame cutting `el` off, or null. */
    const clippedBy = (el: HTMLElement): HTMLElement | null => {
      const r = el.getBoundingClientRect();
      for (let node = el.parentElement; node && frame.contains(node); node = node.parentElement) {
        const cs = getComputedStyle(node);
        if (!/(hidden|clip|auto|scroll)/.test(cs.overflowY + cs.overflowX)) continue;
        const box = node.getBoundingClientRect();
        if (r.bottom > box.bottom + 2 || r.top < box.top - 2 || r.right > box.right + 2 || r.left < box.left - 2) {
          return node;
        }
      }
      return null;
    };
    const reveal = () => {
      queued = 0;
      const rings = Array.from(
        frame.querySelectorAll<HTMLElement>("[class*='ring-yellow'],[class*='animate-ring-pulse']"),
      );
      // Innermost wins: rings nest when a highlighted control sits in a
      // highlighted row, and the inner one is the thing to click.
      const el = rings.find((r) => !rings.some((o) => o !== r && r.contains(o)));
      if (!el || el.offsetParent === null) return;
      if (el === revealedFor && revealedOk) return;
      if (el !== revealedFor) {
        revealedFor = el;
        retries = 0;
        revealedOk = false;
      }

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
      // Asked once the screen has stopped moving, never during. An earlier
      // version measured from the solver's loop and returned 42, then 12, then
      // 10 for the same course depending on how long it waited — it was timing
      // the reveal, not measuring the product. A ring is legitimately out of
      // view whenever a panel is mid-render.
      //
      // Settling is also when the *retry* belongs: the scroll above ran against
      // whatever layout existed at the moment of the mutation, and if that was
      // a window still opening, this second pass is the one that lands.
      if (quiet) clearTimeout(quiet);
      quiet = setTimeout(() => {
        setSettled(true);
        const node = clippedBy(el);
        revealedOk = node === null;

        // The record is a MAP, and every reveal overwrites this control's
        // entry: last observation wins. `npm run ring-check` reads what is
        // left.
        if (process.env.NODE_ENV !== "production") {
          const w = window as unknown as { __ringClipped?: Map<string, unknown>; __ringLesson?: string };
          const lesson = w.__ringLesson ?? "(unknown)";
          const control =
            (el.textContent || "").trim().slice(0, 40) || el.getAttribute("aria-label") || el.tagName;
          const key = `${lesson}|${control}`;
          w.__ringClipped ??= new Map();
          w.__ringClipped.delete(key);
          if (node) {
            w.__ringClipped.set(key, {
              lesson,
              control,
              say: (instruction ?? goal ?? "").slice(0, 90),
              scrollable: node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1,
              by: `${node.tagName.toLowerCase()}.${(node.className || "").toString().split(/\s+/).slice(0, 3).join(".")}`,
            });
          }
        }

        if (node && retries < MAX_RETRIES) {
          retries += 1;
          if (queued) cancelAnimationFrame(queued);
          queued = requestAnimationFrame(() => requestAnimationFrame(reveal));
        }
      }, QUIET_MS);
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

  /**
   * Collapsed — but no longer behind a control that says nothing.
   *
   * An assessment deliberately stops pointing, so the checklist *is* the
   * instructions, and it was folded behind a bare ▼ measuring 21×18px with
   * nothing beside it naming what it opened. Two persona audits stalled there.
   *
   * Opening it by default on a phone was the obvious fix and the wrong one:
   * the list grows the banner, the banner shrinks the device, and `phone-check`
   * came back with **37 unfinishable lessons**. Vertical space on a phone
   * belongs to the lesson. What was actually broken was discoverability, and a
   * button reading "What to do ▼" fixes that for the price of two words.
   */
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
      {/**
        * Guidance banner.
        *
        * Tighter on a phone, because there the banner and the simulated screen
        * are competing for the same 844px and the screen has to win. Same
        * content in the same order — the step counter, the progress bar, the
        * instruction, the "type this" box — at a size that leaves room to use
        * the thing the instruction is about.
        */}
      {/**
        * On a phone this box is a **fixed height**, and the instruction scrolls
        * inside it.
        *
        * The banner sits above the device, so anything that changes its height
        * moves the phone — the Wi-Fi icon jumped 110px between steps on `urls`,
        * and a status bar that moves is the one thing a status bar must never
        * do. That was previously solved by *reserving* space: three lines'
        * worth of minimum for the instruction plus an always-present 52px hole
        * where the "type this" card would go if the step had one. Most steps
        * have neither, so the phone was giving up 52px of screen permanently to
        * hold a box that is absent from all but a handful of lessons.
        *
        * One fixed height solves the same problem without the reserve: the
        * device never moves, a long instruction scrolls rather than being cut
        * off, and the card can appear and disappear inside the box without
        * anything below it noticing.
        */}
      <div
        className={`shrink-0 bg-[#1d2733] text-white ${
          isPhone ? "flex h-[7.75rem] flex-col px-3 py-2" : "px-5 py-3"
        }`}
      >
        <div className="flex shrink-0 items-center gap-3">
          {(done || isAssessment || totalSteps != null) && (
            <>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
                {done
                  ? "Done"
                  : isAssessment
                    ? `${doneCount} of ${objTotal} done`
                    : `Step ${(stepIndex ?? 0) + 1} of ${totalSteps ?? 0}`}
              </span>
              <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </>
          )}
        </div>
        <div className={`mt-1.5 flex items-start justify-between gap-3 ${isPhone ? "min-h-0 flex-1" : ""}`}>
          {/* aria-live: the single most important a11y hook in the product. Every
              guided lesson teaches by swapping this instruction on each step; a
              screen-reader learner must be told it changed, or they are stranded
              after every step with a silent, purely-visual ring as the only cue. */}
          <p
            /* Fills the fixed banner and scrolls if the step has more to say
               than fits — see the note on the banner itself. */
            className={`font-semibold leading-snug ${isPhone ? "min-h-0 flex-1 self-stretch overflow-y-auto text-[15px]" : "text-lg"}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {(() => {
              const raw = done ? goal + " — all done!" : (instruction ?? goal);
              const line = isPhone && phoneWording ? inPhoneWords(raw) : raw;
              // On a laptop the exact string gets its own card below; on a
              // phone it is set into the sentence instead. See `TypeChip`.
              return isPhone && typeThis && !done ? withTypeChip(line, typeThis) : line;
            })()}
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
                /**
                 * Labeled, and a real target — without growing the banner.
                 *
                 * A bare chevron says nothing about what is behind it, and at
                 * 21×18px it is a quarter of the touch floor, guarding the only
                 * guidance an assessment has. But `min-h-[44px]` on its own made
                 * the dark banner 24px taller, and the simulator below it 24px
                 * shorter — which pushed `final-files`' Put Back button under the
                 * fold and made the last lesson of the course unfinishable.
                 * `py-3 -my-3` buys the hit area out of the padding instead, and
                 * `solve-check` is what caught the first attempt.
                 *
                 * **No element children.** The solver identifies a dock icon as
                 * `button[aria-label]` containing an `img` or a `span`, so
                 * wrapping this label in spans put lesson *chrome* into the list
                 * of app icons it clicks through — and `final-files`' last
                 * objective spent its whole budget toggling this open and shut.
                 * The `aria-label` is what a screen reader announces either way,
                 * so the text can sit here bare and lose nothing.
                 */
                className="-my-3 flex items-center gap-1 px-2 py-3 text-sm font-semibold text-white/80 hover:text-white"
                aria-label={expanded ? "Hide what to do" : "Show what to do"}
              >
                What to do {expanded ? "▲" : "▼"}
              </button>
            </div>
          )}
        </div>
        {/* Laptop only. The phone sets the same string into the instruction —
            see `withTypeChip` — because a second box costs 52px of a screen
            that has 812 and the sentence already contains the words. */}
        {typeThis && !done && !isPhone && (
          <div className="mt-2 rounded-lg bg-white px-4 py-3 text-center shadow-sm">
            <span className="block text-xs font-bold uppercase tracking-widest text-blue-700">Type this — exactly</span>
            <span className="mt-1 block break-words font-mono text-2xl font-bold leading-snug text-gray-900">
              {typeThis}
            </span>
          </div>
        )}
        {isAssessment && hintOpen && hint && !done && (
          <div className="mt-2 rounded border border-yellow-400/50 bg-yellow-400/10 px-3 py-2 text-sm text-yellow-100">
            {isPhone && phoneWording ? inPhoneWords(hint) : hint}
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
                <span>{isPhone && phoneWording ? inPhoneWords(obj.label) : obj.label}</span>
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

      {/**
        * App window.
        *
        * A phone has no window: the app is the screen. Drawing the laptop's
        * bordered window inside a phone would be a picture of a laptop inside a
        * picture of a phone, and it would spend 24px of padding and 40px of
        * title bar saying something the device frame already says.
        */}
      {isPhone && phoneChrome ? (
        /**
         * The phone, with the lesson's banner above it rather than inside it.
         *
         * `SimThemeProvider` is here because the strip reads the practice
         * computer's own dark-mode setting, and on these lessons there is no
         * `FakeDesktop` above to have provided one. It is the same provider, so
         * a lesson that *does* have a desktop is unaffected.
         */
        <div className="min-h-0 flex-1">
          <SimThemeProvider>
            <PhoneShell title={appName} onHome={goHome ?? undefined} nav={phoneNav}>
              <div className="flex h-full min-h-0 flex-col bg-white">{children}</div>
            </PhoneShell>
          </SimThemeProvider>
        </div>
      ) : chrome && !isPhone ? (
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
        /**
         * A flex **column**, not a plain block — the same trap the free-play
         * branch above documents, and this branch had it too.
         *
         * Every sim's body is a `flex-1` pane, and `flex-1` against a block
         * parent sizes to its own *content* rather than to the space available.
         * With the laptop's bordered window this pane is never used, so the bug
         * sat here unseen; the phone drops the window chrome on every lesson,
         * and suddenly Mail's folder list was 600px tall with the inbox squeezed
         * to nothing underneath it. `min-h-0` is what lets a flex item shrink
         * below its content instead of pushing the column past the screen.
         */
        <div className="flex-1 min-h-0 flex flex-col relative bg-white">{children}</div>
      )}

      {/* Celebration overlay — shows briefly then disappears */}
      {showCelebration && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm animate-pop-in pointer-events-none">
          <div className="bg-green-700 text-white text-5xl w-24 h-24 rounded-full flex items-center justify-center shadow-2xl animate-ping-once">
            &#10003;
          </div>
          <p className="text-xl font-bold text-white text-center px-6 drop-shadow-md">{isPhone && phoneWording ? inPhoneWords(goal) : goal}</p>
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
