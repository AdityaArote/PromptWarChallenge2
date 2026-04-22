// src/lib/dateUtils.ts — Pure functions (easily unit-testable)

/**
 * Format a deadline expressed as days before election day.
 * Returns a human-readable string.
 */
export function formatDeadline(daysBeforeElection: number | null): string {
  if (daysBeforeElection === null) return "Check local guidelines";
  if (daysBeforeElection === 0) return "Election Day";
  if (daysBeforeElection < 0) return "After election day";
  return `${daysBeforeElection} days before election`;
}
