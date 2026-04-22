// src/__tests__/quiz.test.ts
import { describe, it, expect } from "vitest";
import { calculateScore, calculateStreak, calculatePercentage } from "@/lib/quizUtils";
import { formatDeadline } from "@/lib/dateUtils";
import { sortPhasesByOrder } from "@/lib/phaseUtils";

// ── Quiz Scoring ───────────────────────────────────────────────
describe("Quiz scoring logic", () => {
  it("increments score for correct answer", () => {
    expect(calculateScore(3, true)).toBe(4);
  });
  it("does not change score for wrong answer", () => {
    expect(calculateScore(3, false)).toBe(3);
  });
  it("score never goes below 0", () => {
    expect(calculateScore(0, false)).toBe(0);
  });
  it("calculates percentage correctly", () => {
    expect(calculatePercentage(3, 5)).toBe(60);
  });
  it("percentage is 0 for no questions", () => {
    expect(calculatePercentage(0, 0)).toBe(0);
  });
});

// ── Streak Counter ─────────────────────────────────────────────
describe("Streak counter", () => {
  it("increments streak on correct answer", () => {
    expect(calculateStreak(2, true)).toBe(3);
  });
  it("resets streak to 0 on wrong answer", () => {
    expect(calculateStreak(5, false)).toBe(0);
  });
  it("streak starts at 0 for first wrong answer", () => {
    expect(calculateStreak(0, false)).toBe(0);
  });
});

// ── Deadline Formatter ─────────────────────────────────────────
describe("Deadline date formatter", () => {
  it("formats days before election correctly", () => {
    const result = formatDeadline(45);
    expect(result).toMatch(/45 days before election/i);
  });
  it("returns 'Election Day' for 0 days", () => {
    expect(formatDeadline(0)).toBe("Election Day");
  });
  it("handles null gracefully", () => {
    expect(formatDeadline(null)).toBe("Check local guidelines");
  });
  it("handles negative (after election day)", () => {
    expect(formatDeadline(-2)).toBe("After election day");
  });
});

// ── Phase Sorting ──────────────────────────────────────────────
describe("Phase sort order", () => {
  it("sorts phases ascending by phase_order", () => {
    const phases = [
      { id: "b", phase_order: 2, title: "Voting" },
      { id: "a", phase_order: 1, title: "Registration" },
    ];
    const sorted = sortPhasesByOrder(phases);
    expect(sorted[0]!.id).toBe("a");
    expect(sorted[1]!.id).toBe("b");
  });
  it("handles empty array", () => {
    expect(sortPhasesByOrder([])).toEqual([]);
  });
  it("does not mutate original array", () => {
    const phases = [
      { id: "b", phase_order: 2, title: "Voting" },
      { id: "a", phase_order: 1, title: "Registration" },
    ];
    sortPhasesByOrder(phases);
    expect(phases[0]!.id).toBe("b");
  });
});
