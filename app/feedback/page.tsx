import type { Metadata } from "next";
import { COURSE_EVALUATION_URL, REPORT_PROBLEM_URL, OPENS_GOOGLE_FORMS } from "@/lib/feedbackLinks";

export const metadata: Metadata = {
  title: "Feedback — LearnAComputer",
  description:
    "Share how the course is going, or report a problem. No sign-in, nothing is tracked, and each form opens in a new tab.",
};

/**
 * A permanent home for the feedback forms, reachable from the top nav so it is
 * there from the first minute — not only after a learner is three quarters
 * through (which is where the lesson catalog still surfaces the survey in
 * context). The course evaluation is the hero; reporting a problem sits below it.
 *
 * Both are plain links, never embeds: nothing contacts Google until the learner
 * clicks, which is the whole reason `hostile-check` can promise buyers this site
 * makes no third-party requests. See `lib/feedbackLinks.ts`.
 */
export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Feedback</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-300">
        Tell us how it is going. We read every response, and it is how the course
        gets better. There is no sign-in, nothing is tracked, and each form opens
        in a new tab.
      </p>

      <div className="mt-8 space-y-4">
        {/* The survey — the main thing, so it gets the filled button and the tint. */}
        <section className="rounded-2xl border-2 border-blue-600 bg-blue-50 p-6 dark:border-blue-500 dark:bg-blue-950/40">
          <h2 className="text-xl font-bold">Course survey</h2>
          <p className="mt-1 text-gray-700 dark:text-gray-200">
            A few short questions about what is working and what is not. It takes
            about five minutes, and your answers shape what we build next. You can
            fill it in whenever you like — even partway through.
          </p>
          <a
            href={COURSE_EVALUATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={OPENS_GOOGLE_FORMS}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-lg font-bold text-white hover:bg-blue-700 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Open the course survey <span aria-hidden="true">→</span>
          </a>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{OPENS_GOOGLE_FORMS}</p>
        </section>

        {/* Report a problem — available any time, styled as the quieter option. */}
        <section className="rounded-2xl border-2 border-gray-300 p-6 dark:border-gray-700">
          <h2 className="text-xl font-bold">Report a problem</h2>
          <p className="mt-1 text-gray-700 dark:text-gray-200">
            Found something broken, confusing, or just wrong? Tell us what happened
            and we will fix it.
          </p>
          <a
            href={REPORT_PROBLEM_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={OPENS_GOOGLE_FORMS}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border-2 border-gray-500 px-5 py-3 text-lg font-semibold hover:bg-gray-50 active:scale-95 dark:border-gray-400 dark:hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
          >
            Report a problem <span aria-hidden="true">→</span>
          </a>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{OPENS_GOOGLE_FORMS}</p>
        </section>
      </div>
    </div>
  );
}
