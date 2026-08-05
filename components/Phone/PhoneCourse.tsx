"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DrDigitalAvatar from "@/components/DrDigitalAvatar";
import { getCompletedSlugs, markComplete, PROGRESS_EVENT } from "@/lib/progress";
import { PHONE_COURSE, PHONE_LESSONS, nextPhoneLesson, type PhoneLesson } from "@/lib/phoneCourse";
import { CheckIcon, SmartphoneIcon } from "@/components/Playground/Icons";
import PhoneScreen from "./PhoneScreen";

/**
 * The "On Your Phone" tab: a course list, a teaching card, the activity, and a
 * finish card — one at a time, filling the screen.
 *
 * ## Why there is no two-column layout here
 *
 * Every other lesson surface in this repo puts the teaching on the left and the
 * activity on the right. That layout needs about 900px, which is the whole
 * problem this course exists to solve. So the phone course shows exactly one
 * thing at a time and the learner moves forward through it, which is how phone
 * software works anyway — a beginner reading this on a 390px screen should
 * recognize the shape of it from every other app they have used.
 *
 * On a wide screen the same four views are simply centered in a narrow column
 * with the simulated phone in a bezel. Deliberately not a special desktop
 * layout: an instructor demonstrating this on a projector should be looking at
 * what the learner is holding.
 *
 * ## Progress
 *
 * Phone lessons are marked complete in `lac-progress` alongside the laptop
 * course's slugs, so "Reset all progress" clears both and there is no second
 * storage key to forget about. Every phone slug starts `phone-`; nothing else in
 * `content/lessons/` does, and `phone-check` asserts the two sets never overlap.
 */

type View =
  | { at: "list" }
  | { at: "teach"; lesson: PhoneLesson }
  | { at: "doing"; lesson: PhoneLesson; attempt: number }
  | { at: "failed"; lesson: PhoneLesson; attempt: number; message: string }
  | { at: "done"; lesson: PhoneLesson };

export default function PhoneCourse() {
  const [view, setView] = useState<View>({ at: "list" });
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());
  const [hint, setHint] = useState<string | null>(null);

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
   * TypeScript module off disk, so the harness plays exactly the steps the page
   * is running — the same reason `stray-check` mounts activities through
   * `window.__strayShow`. Development only: nothing is attached in a production
   * build.
   */
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __phoneCourse?: unknown }).__phoneCourse = PHONE_COURSE;
  }, []);

  const onResult = useCallback(
    (success: boolean, failMessage?: string) => {
      setView((v) => {
        if (v.at !== "doing") return v;
        if (success) {
          markComplete(v.lesson.slug);
          return { at: "done", lesson: v.lesson };
        }
        return { at: "failed", lesson: v.lesson, attempt: v.attempt, message: failMessage ?? "That did not work." };
      });
    },
    [],
  );

  // ── The course list ────────────────────────────────────────────────────────
  if (view.at === "list") {
    const doneCount = PHONE_LESSONS.filter((l) => completed.has(l.slug)).length;
    return (
      <div className="mx-auto h-full w-full max-w-xl overflow-y-auto px-4 pb-16 pt-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <SmartphoneIcon size={26} aria-hidden />
          On Your Phone
        </h1>
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          A separate course for the computer in your pocket. It is built to be done{" "}
          <strong>on a phone</strong> — tapping, holding, swiping and pinching, with a keyboard made of glass. It
          works on a computer too, in a picture of a phone.
        </p>
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          The main course teaches a laptop, and almost nothing in it transfers: a phone has no second mouse button,
          no keys to hold down and no windows to arrange. So this teaches the phone on its own terms.
        </p>

        <div
          className="mt-5 rounded-xl border-2 border-gray-300 p-4 dark:border-gray-700"
          role="status"
        >
          <p className="font-semibold">
            {doneCount} of {PHONE_LESSONS.length} lessons done
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-green-600 transition-all duration-300"
              style={{ width: `${(doneCount / PHONE_LESSONS.length) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Finish a unit and its certificate appears on the{" "}
            <Link href="/certificate" className="text-blue-700 underline dark:text-blue-400">
              Certificates
            </Link>{" "}
            tab. Progress is saved on this phone only — there is no account and nothing is sent anywhere.
          </p>
        </div>

        {PHONE_COURSE.map((unit) => {
          const unitDone = unit.lessons.every((l) => completed.has(l.slug));
          return (
            <section key={unit.unit} className="mt-8">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                {unit.unit}
                {unitDone && <CheckIcon size={18} className="text-green-700 dark:text-green-400" aria-label="Finished" />}
              </h2>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{unit.blurb}</p>
              <ul className="mt-3 space-y-2">
                {unit.lessons.map((lesson) => (
                  <li key={lesson.slug}>
                    <button
                      type="button"
                      data-phone-lesson={lesson.slug}
                      onClick={() => {
                        setHint(null);
                        setView({ at: "teach", lesson });
                      }}
                      className="flex w-full items-center gap-3 rounded-xl border-2 border-gray-300 px-4 py-4 text-left transition-colors hover:border-blue-600 dark:border-gray-700"
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          completed.has(lesson.slug)
                            ? "bg-green-700 text-white"
                            : "border-2 border-gray-500 text-gray-700 dark:text-gray-300"
                        }`}
                        aria-hidden
                      >
                        {completed.has(lesson.slug) ? "✓" : ""}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{lesson.title}</span>
                        <span className="block text-sm text-gray-700 dark:text-gray-300">
                          {completed.has(lesson.slug) ? "Finished — tap to do it again" : `${lesson.steps.length} steps`}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    );
  }

  // ── The teaching card, before the activity ─────────────────────────────────
  if (view.at === "teach") {
    const { lesson } = view;
    return (
      <div className="mx-auto h-full w-full max-w-xl overflow-y-auto px-4 pb-10 pt-4">
        <BackToList onBack={() => setView({ at: "list" })} />
        <h1 className="mt-3 text-2xl font-bold">{lesson.title}</h1>
        <div className="mt-4 rounded-xl border-2 border-gray-300 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <DrDigitalAvatar className="h-9 w-9 shrink-0" />
            <p className="font-semibold">Dr. Digital</p>
          </div>
          <div className="mt-3 space-y-3 text-[17px] leading-relaxed">
            {lesson.intro.split("\n\n").map((para, i) => (
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
        <button
          type="button"
          data-phone-start
          onClick={() => setView({ at: "doing", lesson, attempt: 0 })}
          className="mt-5 w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white hover:bg-blue-700"
        >
          Try it on the phone
        </button>
      </div>
    );
  }

  // ── The activity ───────────────────────────────────────────────────────────
  if (view.at === "doing") {
    const { lesson, attempt } = view;
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
          <BackToList onBack={() => setView({ at: "list" })} />
          <button
            type="button"
            onClick={() => setView({ at: "doing", lesson, attempt: attempt + 1 })}
            className="text-sm font-semibold text-blue-700 underline dark:text-blue-400"
          >
            Start over
          </button>
        </div>
        {hint && (
          <p className="mx-3 mb-2 shrink-0 rounded-lg border-2 border-yellow-500 bg-yellow-50 px-3 py-2 text-sm dark:bg-yellow-950/40">
            {lesson.hint}
          </p>
        )}
        <PhoneScreen
          key={`${lesson.slug}-${attempt}`}
          lesson={lesson}
          onResult={onResult}
          onHint={() => setHint((h) => (h ? null : lesson.hint))}
        />
      </div>
    );
  }

  // ── The failure card ───────────────────────────────────────────────────────
  if (view.at === "failed") {
    const { lesson, attempt, message } = view;
    return (
      <div className="mx-auto h-full w-full max-w-xl overflow-y-auto px-4 pb-10 pt-6">
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 dark:bg-red-950/40">
          <p className="text-lg font-bold">Not that one</p>
          <p className="mt-2 text-[17px] leading-relaxed">{message}</p>
        </div>
        <button
          type="button"
          onClick={() => setView({ at: "doing", lesson, attempt: attempt + 1 })}
          className="mt-5 w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white hover:bg-blue-700"
        >
          Try again
        </button>
        <BackToList className="mt-4" onBack={() => setView({ at: "list" })} />
      </div>
    );
  }

  // ── The finish card ────────────────────────────────────────────────────────
  const { lesson } = view;
  const next = nextPhoneLesson(lesson.slug);
  return (
    <div className="mx-auto h-full w-full max-w-xl overflow-y-auto px-4 pb-10 pt-6">
      <div className="rounded-xl border-2 border-green-500 bg-green-50 p-4 dark:bg-green-950/40">
        <div className="flex items-center gap-2">
          <DrDigitalAvatar className="h-9 w-9 shrink-0" mood="success" />
          <p className="font-semibold">Dr. Digital</p>
        </div>
        <p className="mt-3 text-[17px] leading-relaxed">{lesson.success}</p>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{lesson.goal}</p>
      </div>

      {next ? (
        <button
          type="button"
          data-phone-next
          onClick={() => {
            setHint(null);
            setView({ at: "teach", lesson: next });
          }}
          className="mt-5 w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white hover:bg-blue-700"
        >
          Next: {next.title}
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
