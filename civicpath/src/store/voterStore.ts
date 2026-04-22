// src/store/voterStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VoterType, Language } from "@/types";

interface VoterState {
  voterType: VoterType | null;
  currentPhaseId: string | null;
  completedPhaseIds: string[];
  language: Language;
  setVoterType: (type: VoterType) => void;
  setCurrentPhase: (phaseId: string) => void;
  markPhaseComplete: (phaseId: string) => void;
  setLanguage: (lang: Language) => void;
}

export const useVoterStore = create<VoterState>()(
  persist(
    (set) => ({
      voterType: null,
      currentPhaseId: null,
      completedPhaseIds: [],
      language: "en",

      setVoterType: (type) => set({ voterType: type }),

      setCurrentPhase: (phaseId) => set({ currentPhaseId: phaseId }),

      markPhaseComplete: (phaseId) =>
        set((state) => ({
          completedPhaseIds: state.completedPhaseIds.includes(phaseId)
            ? state.completedPhaseIds
            : [...state.completedPhaseIds, phaseId],
        })),

      setLanguage: (lang) => set({ language: lang }),
    }),
    { name: "civicpath-voter" }
  )
);
