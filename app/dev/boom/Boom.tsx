"use client";

import { useEffect, useState } from "react";

/**
 * Throws *after* mount, on purpose, and that timing is the whole point.
 *
 * Throwing during the first render throws on the server too, so Next returns its
 * own 500 document and `app/error.tsx` never renders inside the root layout —
 * which meant no theme, no nav, and a measurement of a page the product does not
 * own. The error a learner actually hits happens once the page is alive: a click
 * handler, an effect, a bad bit of state. This reproduces that, so the document is
 * a normal 200, the layout is in place, and the thing being measured is our
 * friendly failure page in the learner's own theme.
 */
export default function Boom() {
  const [go, setGo] = useState(false);
  useEffect(() => setGo(true), []);
  if (go) throw new Error("Deliberate error from /dev/boom, so the error page can be measured.");
  return <p className="p-6 text-gray-600 dark:text-gray-400">Throwing in a moment…</p>;
}
