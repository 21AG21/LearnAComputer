"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DrDigitalAvatar from "@/components/DrDigitalAvatar";
import LessonPlaygroundPane from "@/components/LessonPlaygroundPane";
import { SimFormFactorProvider } from "@/components/Playground/SimFormFactor";
import { getCompletedSlugs, markComplete, PROGRESS_EVENT } from "@/lib/progress";
import { PHONE_COURSE, PHONE_ENTRIES, nextPhoneEntry, type PhoneEntry } from "@/lib/phoneCourse";
import type { Lesson } from "@/lib/lessons";
import { CheckIcon, SmartphoneIcon, XIcon } from "@/components/Playground/Icons";
import { inPhoneWords } from "@/components/Playground/SimulatorFrame";
import PhoneGestureTask from "./PhoneGestureTask";

/**
 * The "On Your Phone" tab.
 *
 * ## The activity takes the whole viewport, on purpose
 *
 * On a laptop a lesson is two columns and there is room for a nav bar above it.
 * On a 390×844 phone there is not: a site nav, a page heading and a row of
 * lesson controls had between them been eating a fifth of the screen before the
 * simulated phone got a pixel. So the activity is a **fixed, full-viewport
 * layer**. It covers the nav rather than fighting it, and what is left is two
 * things and nothing else — the sentence telling the learner what to do, and the
 * phone they do it on.
 *
 * The Close and Start-over controls live in one 32px strip painted the same
 * color as the instruction banner directly below it, so the two read as a single
 * bar. That strip is the entire cost of the chrome.
 *
 * ## Almost none of this course lives here
 *
 * Entries marked `kind: "lesson"` are real lessons out of `content/lessons/`,
 * handed straight to `LessonPlaygroundPane` — the same component the laptop
 * course uses, rendering the same activity, with `SimFormFactorProvider` telling
 * the simulator underneath it to take its phone shape. There is no second
 * Messages app and no second Settings app to keep in step.
 */

type View =
  | { at: "list" }
  | { at: "teach"; entry: PhoneEntry }
  | { at: "doing"; entry: PhoneEntry; attempt: number }
  | { at: "failed"; entry: PhoneEntry; attempt: number; message: string }
  | { at: "done"; entry: PhoneEntry };

interface PhoneCourseProps {
  /** The borrowed lessons, resolved on the server: slug → the lesson JSON. */
  lessons: Record<string, Lesson>;
}

export default function PhoneCourse({ lessons }: PhoneCourseProps) {
  const [view, setView] = useState<View>({ at: "list" });
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());
  const [confirmRestart, setConfirmRestart] = useState(false);

  // Read on mount rather than in `useState`: localStorage does not exist while
  // this is being server-rendered, and reading it during the first client render
  // is what makes a hydration mismatch.
  useEffect(() => {
    const read = () => setCompleted(new Set(getCompletedSlugs()));
    read();
    window.addEventListener(PROGRESS_EVENT, read);
    return () => window.removeEventListener(PROGRESS_EVENT, read);
  }, []);

  /**
   * `phone-check` reads the curriculum from here rather than parsing the
   * TypeScript module off disk, so the harness plays exactly the entries the
   * page is running — the same reason `stray-check` mounts activities through
   * `window.__strayShow`. Development only.
   */
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __phoneCourse?: unknown }).__phoneCourse = PHONE_COURSE;
  }, []);

  const titleOf = useCallback(
    (e: PhoneEntry) => (e.kind === "gesture" ? e.title : inPhoneWords(lessons[e.slug]?.title ?? e.slug)),
    [lessons],
  );

  const onResult = useCallback((success: boolean, failMessage?: string) => {
    setView((v) => {
      if (v.at !== "doing") return v;
      if (success) {
        markComplete(v.entry.slug);
        return { at: "done", entry: v.entry };
      }
      return { at: "failed", entry: v.entry, attempt: v.attempt, message: failMessage ?? "That did not work." };
    });
  }, []);

  const open = useCallback((entry: PhoneEntry) => setView({ at: "teach", entry }), []);

  // ── The course list ────────────────────────────────────────────────────────
  if (view.at === "list") {
    const doneCount = PHONE_ENTRIES.filter((l) => completed.has(l.slug)).length;
    const next = PHONE_ENTRIES.find((l) => !completed.has(l.slug));
    return (
      <div className="mx-auto h-full w-full max-w-xl overflow-y-auto px-4 pb-16 pt-4">
        {/* One heading, one number, one bar. Everything a learner needs to start
            is a lesson row, and every sentence above the first row is a sentence
            between them and the course. */}
        <div className="flex items-center gap-2">
          <SmartphoneIcon size={24} aria-hidden />
          <h1 className="text-xl font-bold">On Your Phone</h1>
          <span className="ml-auto text-sm font-semibold text-gray-700 dark:text-gray-300">
            {doneCount} of {PHONE_ENTRIES.length}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800" role="status">
          <div
            className="h-full rounded-full bg-green-600 transition-all duration-300"
            style={{ width: `${(doneCount / PHONE_ENTRIES.length) * 100}%` }}
          />
        </div>

        {/**
          * One button that answers "where do I start?".
          *
          * The list is 116 rows under thirteen headings, and a beginner arriving
          * cold has to decide which one is for them before they can do anything.
          * That decision is the first thing between them and the course, and it
          * is a decision the page already knows the answer to.
          */}
        {next && (
          <button
            type="button"
            data-phone-continue
            onClick={() => open(next)}
            className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl bg-blue-600 px-4 py-4 text-left text-white hover:bg-blue-700"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-blue-100">
                {doneCount === 0 ? "Start here" : "Carry on where you left off"}
              </span>
              <span className="block truncate text-lg font-bold">{titleOf(next)}</span>
            </span>
            <span aria-hidden className="shrink-0 text-2xl">›</span>
          </button>
        )}

        {PHONE_COURSE.map((unit) => {
          const unitDone = unit.lessons.every((l) => completed.has(l.slug));
          return (
            <section key={unit.unit} className="mt-6">
              <h2 className="flex items-center gap-2 text-base font-bold">
                {unit.unit}
                {unitDone && <CheckIcon size={18} className="text-green-700 dark:text-green-400" aria-label="Finished" />}
              </h2>
              <ul className="mt-2 space-y-1.5">
                {unit.lessons.map((entry) => {
                  const missing = entry.kind === "lesson" && !lessons[entry.slug];
                  return (
                    <li key={entry.slug}>
                      <button
                        type="button"
                        data-phone-lesson={entry.slug}
                        disabled={missing}
                        onClick={() => open(entry)}
                        className="flex w-full items-center gap-3 rounded-xl border-2 border-gray-300 px-3 py-3 text-left transition-colors hover:border-blue-600 disabled:opacity-50 dark:border-gray-700"
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            completed.has(entry.slug)
                              ? "bg-green-700 text-white"
                              : "border-2 border-gray-500 text-gray-700 dark:text-gray-300"
                          }`}
                          aria-hidden
                        >
                          {completed.has(entry.slug) ? "✓" : ""}
                        </span>
                        <span className="min-w-0 font-semibold">{titleOf(entry)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    );
  }

  const { entry } = view;
  const lesson = entry.kind === "lesson" ? lessons[entry.slug] : undefined;
  /**
   * The borrowed lessons are written for a laptop and say "click", "the sidebar",
   * "the dock". `SimulatorFrame` already rewrites the step banner; the teaching
   * card is the *other* place a learner reads that prose, and it was going out
   * raw — telling somebody holding a phone to press Ctrl+D.
   */
  /**
   * Only the **borrowed** lessons get rewritten.
   *
   * The four gesture lessons are already written in phone language and name the
   * laptop on purpose — "a phone does not need the double tap a laptop does".
   * Running the rewrite over them turned that into "a phone does not need the
   * double tap a phone does": a self-contradiction, on lesson one, in the
   * sentence carrying the whole idea. A translator must not translate the text
   * that was already in the target language.
   */
  const say = (text: string) => (entry.kind === "lesson" ? inPhoneWords(text) : text);
  const intro = say(entry.kind === "gesture" ? entry.intro : (lesson?.drDigitalIntro ?? ""));
  const success = say(entry.kind === "gesture" ? entry.success : (lesson?.drDigitalSuccess ?? "Well done."));
  const goal = entry.kind === "gesture" ? entry.goal : "";
  /**
   * The amber caution the laptop runner shows above Dr. Digital.
   *
   * It was being dropped here, and one of the three lessons carrying one is
   * `unit-4-assessment`, whose warning names the CLEAN NOW pop-up that *fails*
   * the lesson. An assessment has no rings; the laptop learner was warned and
   * the phone learner walked into it blind.
   */
  const warning = entry.kind === "lesson" ? lesson?.warning : undefined;

  // ── The teaching card, before the activity ─────────────────────────────────
  if (view.at === "teach") {
    return (
      <div className="mx-auto h-full w-full max-w-xl overflow-y-auto px-4 pt-4">
        <BackToList onBack={() => setView({ at: "list" })} />
        <h1 className="mt-3 text-2xl font-bold">{titleOf(entry)}</h1>
        {warning && (
          <p className="mt-4 rounded-xl border-2 border-amber-500 bg-amber-50 px-4 py-3 text-[15px] font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Warning: {inPhoneWords(warning)}
          </p>
        )}
        <div className="mt-4 rounded-xl border-2 border-gray-300 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <DrDigitalAvatar className="h-9 w-9 shrink-0" />
            <p className="font-semibold">Dr. Digital</p>
          </div>
          <div className="mt-3 space-y-3 text-[17px] leading-relaxed">
            {intro.split(/\n{2,}|\n/).filter(Boolean).map((para, i) => (
              <p key={i}>
                {para.split(/(\*\*[^*]+\*\*)/g).map((bit, j) =>
                  bit.startsWith("**") && bit.endsWith("**") ? (
                    <strong key={j}>{bit.slice(2, -2)}</strong>
                  ) : (
                    <span key={j}>{bit}</span>
                  ),
                )}
              </p>
            ))}
          </div>
        </div>
        {/* The sticky button below is 84px of permanently-covered screen. Without
            this spacer the last paragraph can never be scrolled clear of it. */}
        <div className="h-20" aria-hidden />
      {/* Sticky, because a four-paragraph intro puts this 700px down the page —
          on the very first lesson of the course, where a learner has no reason
          to believe scrolling is what comes next. */}
      <div className="sticky bottom-0 -mx-4 mt-5 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-[#10151b]">
        <button
          type="button"
          data-phone-start
          onClick={() => setView({ at: "doing", entry, attempt: 0 })}
          className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white hover:bg-blue-700"
        >
          Try it on the phone
        </button>
        </div>
      </div>
    );
  }

  // ── The activity: the whole viewport, and nothing but the lesson ───────────
  if (view.at === "doing") {
    const { attempt } = view;
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#1d2733]">
        {/**
          * The only chrome. Painted the same color as the banner beneath it, so
          * the two read as one bar rather than two.
          *
          * The strip stays 32px tall — vertical space here is the lesson's — but
          * the two buttons in it do not. `py-3 -my-3` grows each hit area to
          * 44px **without** growing the strip: the extra 12px hangs down over
          * the banner's top padding, which is text and takes no input.
          * Measured at 57x20 and 67x20 before this, on a course whose audience
          * is defined by not being able to hit small things.
          */}
        <div className="relative z-10 flex h-8 shrink-0 items-center gap-3 px-3 text-white">
          <button
            type="button"
            data-phone-close
            onClick={() => setView({ at: "list" })}
            aria-label="Close this lesson"
            className="-my-3 flex items-center gap-1 py-3 text-sm font-semibold text-white/90 hover:text-white"
          >
            <XIcon size={15} aria-hidden />
            Close
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-white/80">{titleOf(entry)}</p>
          {/**
           * Confirmed, and quieter than Close.
           *
           * It was underlined, top-right and the most salient thing in the bar,
           * and it threw away everything the learner had done with one 20px-tall
           * press and no way back. The people this course is for press things by
           * accident; that is the premise of the whole product.
           */}
          <button
            type="button"
            onClick={() => setConfirmRestart(true)}
            className="-my-3 shrink-0 py-3 text-sm font-semibold text-white/70 hover:text-white"
          >
            Start over
          </button>
        </div>
        {confirmRestart && (
          <div className="absolute inset-x-3 top-9 z-30 rounded-xl bg-white p-4 shadow-2xl dark:bg-gray-800">
            <p className="text-[15px] font-semibold">Start this lesson again from the beginning?</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => { setConfirmRestart(false); setView({ at: "doing", entry, attempt: attempt + 1 }); }}
                className="min-h-[44px] flex-1 rounded-lg bg-blue-600 px-3 font-bold text-white"
              >
                Start again
              </button>
              <button
                type="button"
                onClick={() => setConfirmRestart(false)}
                className="min-h-[44px] flex-1 rounded-lg border-2 border-gray-500 px-3 font-bold"
              >
                Keep going
              </button>
            </div>
          </div>
        )}

        {/**
          * The shape of an actual phone.
          *
          * On a phone this fills the screen, because it *is* the screen. On
          * anything wider it takes a real handset's proportions — 9:19.5, the
          * ratio almost every phone sold in the last few years uses — inside a
          * dark bezel with rounded corners. Before this it was a 430px column
          * running off the bottom edge with a radius on the top only, which read
          * as a cropped web page rather than as a phone.
          */}
        <div className="flex min-h-0 flex-1 items-center justify-center sm:p-4">
          <SimFormFactorProvider value="phone">
            <div className="flex h-full w-full flex-col overflow-hidden bg-white sm:aspect-[9/19.5] sm:h-full sm:w-auto sm:rounded-[2.25rem] sm:border-[10px] sm:border-gray-900 sm:shadow-2xl">
              {entry.kind === "gesture" ? (
                <PhoneGestureTask key={`${entry.slug}-${attempt}`} lesson={entry} onResult={onResult} />
              ) : lesson ? (
                <LessonPlaygroundPane
                  key={`${entry.slug}-${attempt}`}
                  task={lesson.playgroundTask}
                  started
                  onResult={onResult}
                />
              ) : null}
            </div>
          </SimFormFactorProvider>
        </div>
      </div>
    );
  }

  // ── The failure card ───────────────────────────────────────────────────────
  if (view.at === "failed") {
    const { attempt, message } = view;
    return (
      <div className="mx-auto h-full w-full max-w-xl overflow-y-auto px-4 pb-10 pt-6">
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 dark:bg-red-950/40">
          <p className="text-lg font-bold">Not that one</p>
          {/* The one learner-facing string on the phone that used to skip the
              rewrite — and the screen this audience reads most carefully, since
              it is the screen that appears when something went wrong. It was
              telling them to "click" the ✕ next time. */}
          <p className="mt-2 text-[17px] leading-relaxed">
            {entry.kind === "lesson" ? inPhoneWords(message) : message}
          </p>
          {/* Said out loud, because the alternative is a beginner deciding they
              broke it. Nothing here can be broken; that is the whole promise. */}
          <p className="mt-3 text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
            Nothing is broken — this is the practice phone. Tap Try again to have
            another go.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setView({ at: "doing", entry, attempt: attempt + 1 })}
          className="mt-5 w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white hover:bg-blue-700"
        >
          Try again
        </button>
        <BackToList className="mt-4" onBack={() => setView({ at: "list" })} />
      </div>
    );
  }

  // ── The finish card ────────────────────────────────────────────────────────
  const next = nextPhoneEntry(entry.slug);
  const doneNow = PHONE_ENTRIES.filter((l) => completed.has(l.slug)).length;
  return (
    <div className="mx-auto h-full w-full max-w-xl overflow-y-auto px-4 pb-10 pt-6">
      <div className="rounded-xl border-2 border-green-500 bg-green-50 p-4 dark:bg-green-950/40">
        <div className="flex items-center gap-2">
          <DrDigitalAvatar className="h-9 w-9 shrink-0" mood="success" />
          <p className="font-semibold">Dr. Digital</p>
        </div>
        <p className="mt-3 text-[17px] leading-relaxed">{success}</p>
        {goal && <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{goal}</p>}
        {/* One line of "how far along am I". Finishing something and being told
            nothing about where it sits is the moment a course stops feeling like
            progress and starts feeling like a list. */}
        <p className="mt-3 text-sm font-semibold text-green-800 dark:text-green-300">
          {doneNow} of {PHONE_ENTRIES.length} lessons done
        </p>
      </div>

      {next ? (
        <button
          type="button"
          data-phone-next
          onClick={() => setView({ at: "teach", entry: next })}
          className="mt-5 w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white hover:bg-blue-700"
        >
          Next: {titleOf(next)}
        </button>
      ) : (
        <div className="mt-5 rounded-xl border-2 border-gray-300 p-4 dark:border-gray-700">
          <p className="font-semibold">That is the whole phone course.</p>
          <p className="mt-1 text-gray-700 dark:text-gray-300">
            Your certificates are on the{" "}
            <Link href="/certificate" className="text-blue-700 underline dark:text-blue-400">
              Certificates
            </Link>{" "}
            tab.
          </p>
        </div>
      )}
      <BackToList className="mt-4" onBack={() => setView({ at: "list" })} />
    </div>
  );
}

function BackToList({ onBack, className = "" }: { onBack: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={`text-sm font-semibold text-blue-700 underline dark:text-blue-400 ${className}`}
    >
      ← All phone lessons
    </button>
  );
}
