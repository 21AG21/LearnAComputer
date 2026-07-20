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

export function checkTypeText(targetText: string, submitted: string, exact = false): boolean {
  if (exact) return submitted.trim() === targetText.trim();
  return submitted.trim().toLowerCase() === targetText.trim().toLowerCase();
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
