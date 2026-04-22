// src/lib/quizUtils.ts — Pure functions (easily unit-testable)

/** Increment score if answer is correct. Score never goes below 0. */
export function calculateScore(current: number, isCorrect: boolean): number {
  return isCorrect ? current + 1 : current;
}

/** Increment streak if correct; reset to 0 if wrong. */
export function calculateStreak(current: number, isCorrect: boolean): number {
  return isCorrect ? current + 1 : 0;
}

/** Convert a score/total into a percentage (0–100). */
export function calculatePercentage(score: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((score / total) * 100);
}
