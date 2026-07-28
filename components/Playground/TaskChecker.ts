import type { FolderExpect } from "@/lib/lessons";

export type SuccessCondition = "pasted-matches-source";

export interface CopyPasteSubmission {
  source: string;
  pasted: string;
}

export function checkCopyPasteTask(
  successCondition: SuccessCondition,
  submission: CopyPasteSubmission
): boolean {
  switch (successCondition) {
    case "pasted-matches-source":
      return submission.pasted.trim() === submission.source.trim();
    default:
      return false;
  }
}

/**
 * Typing checks forgive what keyboards do on their own: a double space, a smart
 * quote the browser swapped in, a straight dash for an em-dash. `exact` keeps
 * judging capitals and punctuation — that is what those lessons teach — but even
 * an exact lesson must not fail someone over whitespace or autocorrected quotes
 * they cannot see.
 */
export function checkTypeText(targetText: string, submitted: string, exact = false): boolean {
  const a = normalize(submitted);
  const b = normalize(targetText);
  if (exact) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * The word the learner should look at when a typing check fails: the index of the
 * first word (in the target's words) that differs. `null` means the texts match.
 * "Not quite, try again" tells a beginner nothing; "check the highlighted word"
 * tells them where to look.
 */
export function firstMismatchWord(targetText: string, submitted: string, exact = false): number | null {
  const fold = (s: string) => (exact ? normalize(s) : normalize(s).toLowerCase());
  const want = fold(targetText).split(" ");
  const got = fold(submitted).split(" ");
  for (let i = 0; i < want.length; i++) {
    if (got[i] !== want[i]) return i;
  }
  return got.length > want.length ? want.length - 1 : null;
}

export function checkShapeScore(score: number, targetScore: number): boolean {
  return score >= targetScore;
}

export function checkFilesOpened(opened: string[], required: string[]): boolean {
  return required.every((file) => opened.includes(file));
}

export function checkScrollCode(
  typedCode: string,
  code: string,
  reachedBottom: boolean,
  reachedTopAgain: boolean
): boolean {
  return reachedBottom && reachedTopAgain && typedCode.trim().toUpperCase() === code.toUpperCase();
}

export function checkZoomCode(typedDigits: string[], answerDigits: number[]): boolean {
  return answerDigits.every((digit, i) => typedDigits[i] === String(digit));
}

function normalize(s: string): string {
  return s
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function checkTextEdit(current: string, mustInclude: string[], mustNotInclude: string[]): boolean {
  const norm = normalize(current);
  return mustInclude.every((s) => norm.includes(normalize(s))) && mustNotInclude.every((s) => !norm.includes(normalize(s)));
}

export interface TextEditFeedback {
  pass: boolean;
  missingRules: string[];
  presentBadWords: string[];
}

export function checkTextEditDetailed(current: string, mustInclude: string[], mustNotInclude: string[]): TextEditFeedback {
  const norm = normalize(current);
  const missingRules = mustInclude.filter((s) => !norm.includes(normalize(s)));
  const presentBadWords = mustNotInclude.filter((s) => norm.includes(normalize(s)));
  return { pass: missingRules.length === 0 && presentBadWords.length === 0, missingRules, presentBadWords };
}

type KbEvent = { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; key: string };

export function checkNotesShortcut(action: string, e: KbEvent): boolean {
  const mod = e.metaKey || e.ctrlKey;
  switch (action) {
    case "bold":       return mod && e.key === "b";
    case "italic":     return mod && e.key === "i";
    case "underline":  return mod && e.key === "u";
    case "select-all": return mod && e.key === "a";
    case "copy":       return mod && e.key === "c";
    case "cut":        return mod && e.key === "x";
    case "paste":      return mod && e.key === "v";
    case "undo":       return mod && !e.shiftKey && e.key === "z";
    case "redo":       return mod && e.shiftKey && e.key === "z";
    default:           return false;
  }
}

// ─── Real-world missions ────────────────────────────────────────────────────
// The learner organizes a folder on their own machine and hands it back through
// a directory picker. These functions see only names and paths — the file
// contents are never read, and nothing is ever uploaded.


export interface FolderReport {
  pass: boolean;
  /** What they got right, so a near-miss doesn't read as total failure. */
  wins: string[];
  issues: string[];
  /** Set when the picked folder plainly isn't the practice one. */
  wrongFolder?: boolean;
}

/** Files a file manager creates on its own. Judging someone for these would be unfair. */
const SYSTEM_FILES = [".ds_store", "thumbs.db", "desktop.ini", ".localized"];

const isSystemFile = (name: string) => SYSTEM_FILES.includes(name.toLowerCase()) || name.startsWith("._");

/**
 * Turn the picker's relative paths into `{ folder, name }`, where folder is "" for
 * anything sitting loose at the top.
 *
 * The picker always prefixes every path with the chosen folder's own name, so the
 * first segment is dropped. If the learner picked the folder *containing* their
 * work instead, a second common segment is dropped too — as long as it isn't one
 * of the folders they were asked to make.
 */
export function normalizeFolderPaths(paths: string[], expectedFolders: string[] = []): Array<{ folder: string; name: string }> {
  const expected = expectedFolders.map((f) => f.toLowerCase());
  let parts = paths
    .map((p) => p.split("/").filter(Boolean))
    .filter((segs) => segs.length > 0 && !isSystemFile(segs[segs.length - 1]));

  const stripCommonRoot = () => {
    if (parts.length === 0) return false;
    const head = parts[0][0];
    if (!head || expected.includes(head.toLowerCase())) return false;
    if (!parts.every((segs) => segs.length > 1 && segs[0] === head)) return false;
    parts = parts.map((segs) => segs.slice(1));
    return true;
  };

  stripCommonRoot();
  stripCommonRoot();

  return parts.map((segs) => ({
    folder: segs.length > 1 ? segs[0] : "",
    name: segs[segs.length - 1],
  }));
}

export function checkOrganizedFolder(paths: string[], expect: FolderExpect): FolderReport {
  const entries = normalizeFolderPaths(paths, expect.folders);
  const wins: string[] = [];
  const issues: string[] = [];

  const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const find = (file: string) => entries.find((e) => eq(e.name, file));
  const folderNames = Array.from(new Set(entries.map((e) => e.folder).filter(Boolean)));

  // Did they hand back the right folder at all?
  const known = [...expect.placements.map((p) => p.file), ...(expect.absent ?? []), expect.renamed?.was].filter(
    Boolean,
  ) as string[];
  const recognised = known.filter((f) => find(f)).length;
  if (entries.length === 0) {
    return { pass: false, wins, issues: ["That folder is empty. Pick the folder you unzipped."], wrongFolder: true };
  }
  if (recognised === 0) {
    return {
      pass: false,
      wins,
      issues: [
        `None of the practice files are in there — I found ${entries.length} other file${entries.length === 1 ? "" : "s"}. Pick the folder that came out of the zip, not the one it is sitting in.`,
      ],
      wrongFolder: true,
    };
  }

  // Folders they were asked to make
  for (const folder of expect.folders) {
    if (folderNames.some((f) => eq(f, folder))) {
      wins.push(`Folder "${folder}" exists`);
    } else {
      issues.push(
        folderNames.length > 0
          ? `There is no folder called "${folder}". I can see: ${folderNames.join(", ")}.`
          : `There are no folders in here yet — "${folder}" is missing.`,
      );
    }
  }

  // Every file in its place
  const misplaced: string[] = [];
  const missing: string[] = [];
  for (const { file, in: target } of expect.placements) {
    const entry = find(file);
    if (!entry) {
      missing.push(file);
    } else if (!eq(entry.folder, target)) {
      misplaced.push(
        entry.folder
          ? `"${file}" is in ${entry.folder} — it belongs in ${target}.`
          : `"${file}" is still loose at the top — it belongs in ${target}.`,
      );
    }
  }
  const placed = expect.placements.length - misplaced.length - missing.length;
  if (placed > 0) wins.push(`${placed} of ${expect.placements.length} files are in the right folder`);
  issues.push(...misplaced.slice(0, 4));
  if (misplaced.length > 4) issues.push(`…and ${misplaced.length - 4} more in the wrong folder.`);
  for (const file of missing.slice(0, 3)) {
    issues.push(`I cannot find "${file}" anywhere. Did it get deleted by mistake? Check your trash.`);
  }

  // Junk that should be gone
  const survivors = (expect.absent ?? []).filter((f) => find(f));
  if ((expect.absent ?? []).length > 0 && survivors.length === 0) wins.push("The junk files are gone");
  for (const file of survivors) {
    issues.push(`"${file}" is still here. That one was junk — delete it.`);
  }

  // The file that had to be renamed after reading it
  if (expect.renamed) {
    const { was, in: target, rejectPattern } = expect.renamed;
    const stillThere = find(was);
    const expectedInTarget = expect.placements.filter((p) => eq(p.in, target)).map((p) => p.file);
    const extras = entries.filter(
      (e) => eq(e.folder, target) && !expectedInTarget.some((f) => eq(f, e.name)) && !eq(e.name, was),
    );

    if (stillThere) {
      issues.push(`"${was}" still has its old name. Open it, see what it is, and rename it after that.`);
    } else if (extras.length === 0) {
      issues.push(`Nothing renamed turned up in ${target}. "${was}" should be in there under a better name.`);
    } else if (rejectPattern && new RegExp(rejectPattern, "i").test(extras[0].name)) {
      issues.push(`"${extras[0].name}" still does not say what the file is. Name it after what you saw inside it.`);
    } else {
      wins.push(`"${was}" is now "${extras[0].name}"`);
    }
  }

  // Nothing left lying loose
  if (expect.noLooseFiles) {
    const loose = entries.filter((e) => !e.folder);
    const unaccounted = loose.filter(
      (e) => !expect.placements.some((p) => eq(p.file, e.name)) && !(expect.absent ?? []).some((f) => eq(f, e.name)),
    );
    if (loose.length === 0) {
      wins.push("Nothing is left loose at the top level");
    } else if (unaccounted.length > 0) {
      issues.push(
        `${unaccounted.length} file${unaccounted.length === 1 ? " is" : "s are"} still loose at the top: ${unaccounted
          .slice(0, 3)
          .map((e) => `"${e.name}"`)
          .join(", ")}.`,
      );
    }
  }

  return { pass: issues.length === 0, wins, issues };
}
