// src/lib/phaseUtils.ts — Pure functions (easily unit-testable)

import type { ElectionPhase } from "@/types";

/** Sort phases ascending by phase_order. */
export function sortPhasesByOrder(phases: Pick<ElectionPhase, "id" | "phase_order" | "title">[]): typeof phases {
  return [...phases].sort((a, b) => a.phase_order - b.phase_order);
}
