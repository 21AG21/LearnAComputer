"use client";

import GuidedNotesTask from "../GuidedNotesTask";

/**
 * Notes on the practice desktop. It opens with a note already in it: every
 * other app here has something to look at, and an empty white rectangle reads
 * as broken to the exact beginner this course is for.
 */
const STARTER_NOTE = `<div><b>Shopping list</b></div><div>Milk</div><div>Bread</div><div>Something nice for Sunday</div><div><br></div><div>Ask Sam about the bus times</div>`;

export default function NotesApp() {
  return <GuidedNotesTask goal="" steps={[]} freePlay initialHtml={STARTER_NOTE} onResult={() => {}} />;
}
