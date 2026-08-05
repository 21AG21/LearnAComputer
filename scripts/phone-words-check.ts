/**
 * Does the phone course still speak phone?
 *
 * The phone plays 112 of the laptop course's own lesson files, and every one of
 * them is written for a machine with a mouse, a dock and a menu bar.
 * `inPhoneWords` rewrites that on the way to the screen — and it is a list of
 * patterns, so it leaks. It leaked for the whole of the course's first life:
 * "press Enter" survived into 22 lessons on a device with no Enter key,
 * "Hover to reveal its link" into the phishing lesson, "Move your mouse across
 * the dock" into an accessibility lesson, and the definition sentence of
 * `finder-overview` came out as **"The list at the top is called the list"**.
 *
 * Nothing else looks at this. `phone-check` plays every lesson to the end
 * through the DOM and never reads a sentence; `check-lessons.py` reads the JSON
 * as authored, before the rewrite exists. So the words a phone learner actually
 * reads were the one part of the course no harness had ever seen.
 *
 * This is a static check on purpose: it runs the real `inPhoneWords` over the
 * real lesson JSON and needs no browser and no dev server, so it costs a second
 * and can run on every commit. What it cannot see is text a *component* renders
 * — `useSimWords` covers those, and only a rendered-DOM sweep would prove it.
 * Recorded in docs/PHONE_COURSE.md as still open rather than left implied.
 *
 *   npm run phone-words-check
 *   PHONEWORDS_NEGATIVE=1 npm run phone-words-check   # negative control
 *
 * TypeScript, not `.mjs` like its neighbours, and for a reason worth knowing:
 * `tsx` only transpiles a `.ts` **entry point**. From a `.mjs` entry the same
 * import resolves down the CommonJS path and every named export vanishes — the
 * module loads, and `LAPTOP_WORDS` is simply undefined.
 *
 * The negative control skips the rewrite entirely — the exact regression this
 * guards, since every call site is one `phoneWording={false}` away from it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inPhoneWords, LAPTOP_WORDS } from "../lib/phoneWords.ts";
import { PHONE_COURSE } from "../lib/phoneCourse.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NEGATIVE = process.env.PHONEWORDS_NEGATIVE === "1";
const translate = NEGATIVE ? (t: string) => t : inPhoneWords;

/**
 * Laptop facts a phone learner is deliberately still told.
 *
 * These are not leaks. `troubleshooting-basics` teaches what to do when a
 * program freezes **on a real computer**, naming that computer's real keys; a
 * mechanical rewrite would turn true advice into invented advice. Listed by
 * slug and by the words it is allowed to keep, so the exemption is a line
 * somebody has to read rather than a word quietly missing from the list.
 */
const ALLOW = {
  "troubleshooting-basics": ["Ctrl+", "Task Manager", "desktop"],
  "unit-11-assessment": ["Task Manager"],
  // A phone really can pair a Bluetooth mouse; the sentence lists what the
  // radio connects to, and dropping the mouse would make the list wrong.
  "bluetooth-devices": ["mouse"],
};

const findings: { slug: string; where: string; word: string; quote: string }[] = [];
const lessonDir = path.join(ROOT, "content", "lessons");

/** Every learner-facing string in a lesson, with a label for the report. */
function strings(lesson: Record<string, unknown>) {
  const out: [string, unknown][] = [
    ["intro", lesson.drDigitalIntro],
    ["success", lesson.drDigitalSuccess],
    ["hint", lesson.drDigitalHint],
    ["title", lesson.title],
    ["warning", lesson.warning],
  ];
  const task = (lesson.playgroundTask ?? {}) as Record<string, unknown>;
  out.push(["goal", task.goal], ["instructions", task.instructions], ["hint", task.hint]);
  ((task.steps ?? []) as { say?: string }[]).forEach((s, i) => out.push([`step ${i + 1}`, s.say]));
  return out.filter(([, v]) => typeof v === "string" && v.length > 0) as [string, string][];
}

for (const unit of PHONE_COURSE) {
  for (const entry of unit.lessons) {
    if (entry.kind !== "lesson") continue; // the 4 gesture lessons are already phone-native
    const file = path.join(lessonDir, `${entry.slug}.json`);
    if (!fs.existsSync(file)) continue;
    const lesson = JSON.parse(fs.readFileSync(file, "utf8"));
    const allowed = ALLOW[entry.slug] ?? [];

    for (const [where, raw] of strings(lesson)) {
      const text = translate(raw);

      for (const word of LAPTOP_WORDS) {
        if (allowed.includes(word)) continue;
        const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
        const m = re.exec(text);
        if (m) {
          findings.push({
            slug: entry.slug, where, word,
            quote: text.slice(Math.max(0, m.index - 30), m.index + 50).replace(/\s+/g, " "),
          });
          break; // one finding per string is enough to send somebody to look
        }
      }

      /**
       * "X is called X".
       *
       * A rewrite that renames both halves of a definition destroys the lesson
       * it was translating, and it does it silently: the sentence still scans.
       */
      const tautology = /\b(?:the|a) ([a-z ]{3,20}?) (?:is|are) called (?:the|a) \1\b/i.exec(text);
      if (tautology) {
        findings.push({
          slug: entry.slug, where, word: "tautology",
          quote: tautology[0],
        });
      }
    }
  }
}

for (const f of findings) {
  console.log(`- ${f.slug} (${f.where}) — "${f.word}": …${f.quote}…`);
}

const label = NEGATIVE ? " [NEGATIVE CONTROL]" : "";
if (findings.length === 0) {
  console.log(`\nEvery phone lesson reads as a phone lesson.${label}`);
  if (NEGATIVE) {
    console.error("\nThe negative control found nothing. The check is blind — fix it.");
    process.exit(1);
  }
  process.exit(0);
}

console.log(`\n${findings.length} laptop word(s) reaching a phone learner.${label}`);
process.exit(NEGATIVE ? 0 : 1);
