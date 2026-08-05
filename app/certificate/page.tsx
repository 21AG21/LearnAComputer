"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCompletedSlugs } from "@/lib/progress";
import { PHONE_UNIT_SLUGS } from "@/lib/phoneCourse";

/**
 * Printable certificates of completion. For adult-education programs this
 * artifact is a large part of what the course is *for* — proof a learner can
 * hand to an employer or pin to a fridge.
 *
 * The learner's name is asked at print time and never stored anywhere. Which
 * certificates are offered comes from real progress: a unit appears when every
 * one of its lessons is complete. Printing uses the browser's own dialog —
 * which is itself the skill Unit 12 teaches.
 *
 * Two courses feed this page. The laptop course's unit → slug map is served by
 * `/api/units` because it is read off disk; the phone course's is a module this
 * page can simply import. They are kept as two separate whole-course
 * certificates rather than merged into one, because they certify different
 * things — somebody who has finished the phone course has not been taught a
 * laptop, and a certificate that implied otherwise would be a lie told to
 * whoever they hand it to.
 */

interface UnitInfo {
  unit: string;
  total: number;
  done: number;
  /** Which course it belongs to, for the two whole-course certificates. */
  course: "laptop" | "phone";
}

export default function CertificatePage() {
  const [name, setName] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [courseDone, setCourseDone] = useState(false);
  const [phoneDone, setPhoneDone] = useState(false);

  useEffect(() => {
    const completed = new Set(getCompletedSlugs());
    const score = (list: Array<{ unit: string; slugs: string[] }>, course: "laptop" | "phone"): UnitInfo[] =>
      list.map((u) => ({
        unit: u.unit,
        total: u.slugs.length,
        done: u.slugs.filter((s) => completed.has(s)).length,
        course,
      }));

    const phone = score(PHONE_UNIT_SLUGS, "phone");
    setPhoneDone(phone.length > 0 && phone.every((u) => u.done >= u.total));

    // The lesson catalog (slug → unit, totals) is served statically for this page.
    // A failed fetch must still leave the phone certificates on offer — they do
    // not depend on it, and losing them because an unrelated route hiccuped would
    // hide work the learner has genuinely finished.
    fetch("/api/units")
      .then((r) => r.json())
      .then((catalog: Array<{ unit: string; slugs: string[] }>) => {
        const laptop = score(catalog, "laptop");
        setUnits([...laptop, ...phone]);
        setCourseDone(laptop.length > 0 && laptop.every((u) => u.done >= u.total));
      })
      .catch(() => setUnits(phone));
  }, []);

  const finished = useMemo(() => units.filter((u) => u.done >= u.total), [units]);
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="mx-auto max-w-2xl p-6">
      {/* Screen-only controls */}
      <div className="print:hidden">
        <h1 className="text-2xl font-bold">Certificates</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Finish every lesson in a unit and its certificate appears here. Your name is only used to
          print — it is never saved or sent anywhere.
        </p>

        <label className="mt-6 block font-semibold">
          Name as it should appear:
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type your full name"
            className="mt-1 w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-lg dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        <div className="mt-6 space-y-2">
          {courseDone && (
            <button
              onClick={() => setChosen("__course__")}
              className={`w-full rounded-lg border-2 px-4 py-3 text-left font-semibold ${chosen === "__course__" ? "border-blue-600 bg-blue-50 dark:bg-blue-950" : "border-gray-300 dark:border-gray-700"}`}
            >
              Full laptop course — all{" "}
              {units.filter((u) => u.course === "laptop").reduce((n, u) => n + u.total, 0)} lessons
            </button>
          )}
          {phoneDone && (
            <button
              onClick={() => setChosen("__phone__")}
              className={`w-full rounded-lg border-2 px-4 py-3 text-left font-semibold ${chosen === "__phone__" ? "border-blue-600 bg-blue-50 dark:bg-blue-950" : "border-gray-300 dark:border-gray-700"}`}
            >
              Full phone course — all{" "}
              {units.filter((u) => u.course === "phone").reduce((n, u) => n + u.total, 0)} lessons
            </button>
          )}
          {finished
            .filter((u) => u.unit !== "Final Assessment")
            .map((u) => (
              <button
                key={u.unit}
                onClick={() => setChosen(u.unit)}
                className={`w-full rounded-lg border-2 px-4 py-3 text-left ${chosen === u.unit ? "border-blue-600 bg-blue-50 font-semibold dark:bg-blue-950" : "border-gray-300 dark:border-gray-700"}`}
              >
                {u.unit}
              </button>
            ))}
          {finished.length === 0 && (
            <p className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center text-gray-500 dark:text-gray-400 dark:border-gray-700">
              No completed units yet — finish a unit and come back.{" "}
              <Link href="/lessons" className="text-blue-600 underline dark:text-blue-400">
                Back to lessons
              </Link>
              , or the{" "}
              <Link href="/phone" className="text-blue-600 underline dark:text-blue-400">
                phone course
              </Link>
            </p>
          )}
        </div>

        {chosen && (
          <button
            onClick={() => window.print()}
            disabled={!name.trim()}
            className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-lg font-bold text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 dark:text-gray-400"
          >
            {name.trim() ? "Print certificate" : "Type your name first"}
          </button>
        )}
      </div>

      {/* The certificate itself — what the printer sees */}
      {chosen && name.trim() && (
        <div className="mt-8 border-8 border-double border-gray-800 p-10 text-center print:mt-0 print:border-gray-800 print:bg-white print:text-black">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Certificate of Completion</p>
          <p className="mt-8 text-lg text-gray-600">This certifies that</p>
          <p className="mt-2 text-4xl font-bold">{name.trim()}</p>
          <p className="mt-6 text-lg text-gray-600">has completed</p>
          <p className="mt-2 text-2xl font-semibold">
            {chosen === "__course__"
              ? "the complete LearnAComputer laptop course"
              : chosen === "__phone__"
                ? "the complete LearnAComputer phone course"
                : chosen}
          </p>
          <p className="mt-8 text-gray-600">
            {chosen === "__course__"
              ? "every hands-on lesson, assessment, and real-world mission in the course"
              : chosen === "__phone__"
                ? "every hands-on lesson and check in the touch-screen course"
                : "every hands-on lesson in this unit, including its assessment"}
          </p>
          <div className="mt-12 flex items-end justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>{today}</span>
            <span className="border-t-2 border-gray-400 px-8 pt-1">LearnAComputer</span>
          </div>
        </div>
      )}
    </div>
  );
}
