// src/types/index.ts

export type VoterType = "first_time" | "returning" | "overseas";
export type Language = "en" | "hi";

export interface ElectionPhase {
  id: string;
  phase_order: number;
  title: string;
  description: string;
  icon: string | null;
  deadline_days_before_election: number | null;
  voter_types: VoterType[];
}

export interface QuizQuestion {
  id: string;
  phase_id: string;
  question: string;
  options: Array<{ text: string; correct: boolean }>;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface UserProgress {
  user_id: string;
  phase_id: string;
  completed: boolean;
  completed_at: string | null;
}

export interface QuizScore {
  user_id: string;
  phase_id: string;
  score: number;
  total: number;
  streak: number;
}
