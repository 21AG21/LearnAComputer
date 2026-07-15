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

export function checkTypeText(targetText: string, submitted: string): boolean {
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
