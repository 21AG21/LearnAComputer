/**
 * The two forms a learner can send us something through.
 *
 * **They are links, never embeds.** An embedded form would make the page
 * contact Google on load, which would break the one claim this product asks
 * buyers to verify for themselves — no cookies, no third-party requests — and
 * `npm run hostile-check` fails the build over exactly that. A link the learner
 * chooses to click is different in kind: nothing leaves this site until they
 * decide it should, and they land somewhere they can see.
 *
 * Everything that renders these must therefore:
 *   - use a plain `<a>` with `target="_blank"` and `rel="noopener noreferrer"`
 *   - say out loud that it opens Google Forms, so nobody is surprised
 *   - never auto-open, auto-focus, or nag
 */

/** Course evaluation. Offered once the learner is most of the way through. */
export const COURSE_EVALUATION_URL = "https://forms.gle/he2kBUpTxeo8J71B9";

/** Report a problem. Available anywhere, any time. */
export const REPORT_PROBLEM_URL = "https://forms.gle/o6c94biV3wzWrLZe6";

/**
 * How far through the course before the evaluation is offered.
 *
 * Asking too early gets an opinion about Unit 1; asking at 100% only ever hears
 * from finishers, who are the least representative group there is. Three
 * quarters is late enough to have an informed view and early enough that people
 * who will not finish are still around to say why.
 */
export const EVALUATION_THRESHOLD = 0.75;

/** Shared wording, so the same promise is made in every place these appear. */
export const OPENS_GOOGLE_FORMS = "Opens Google Forms in a new tab.";
