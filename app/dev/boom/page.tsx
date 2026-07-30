import { notFound } from "next/navigation";
import Boom from "./Boom";

/**
 * Throws on purpose, so `app/error.tsx` can actually be looked at.
 *
 * The friendly failure page is one of the two pages in this product a learner only
 * ever meets on their worst visit, and it was the only page no check could reach:
 * `contrast-check` walks a list of routes, and there is no route that renders an
 * error boundary. So the page written to reassure somebody whose screen just broke
 * had never been measured for whether they can read it.
 *
 * `/not-found` needs no help — any wrong URL renders it — which is why only this
 * one exists.
 *
 * Development only, and guarded the same way every other `/dev` page is;
 * `hostile-check` asserts that guard is here.
 */
export default function BoomPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Boom />;
}
