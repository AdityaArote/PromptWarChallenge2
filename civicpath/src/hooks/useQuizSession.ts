// src/hooks/useQuizSession.ts
import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { calculateScore, calculateStreak } from "@/lib/quizUtils";
import type { QuizQuestion } from "@/types";

export function useQuizSession(phaseId: string, questions: QuizQuestion[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const submitAnswer = useCallback(async (optionIndex: number) => {
    if (selectedOption !== null) return; // already answered
    setSelectedOption(optionIndex);

    const correct = questions[currentIndex]?.options[optionIndex]?.correct ?? false;
    const newScore = calculateScore(score, correct);
    const newStreak = calculateStreak(streak, correct);
    setScore(newScore);
    setStreak(newStreak);

    if (currentIndex >= questions.length - 1) {
      setIsComplete(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from("quiz_scores").insert({
          user_id: session.user.id,
          phase_id: phaseId,
          score: newScore,
          total: questions.length,
          streak: newStreak,
        });
      }
    }
  }, [currentIndex, questions, score, streak, phaseId, selectedOption]);

  const nextQuestion = useCallback(() => {
    setSelectedOption(null);
    setCurrentIndex((i) => i + 1);
  }, []);

  const currentQuestion = questions[currentIndex];
  const isCorrect =
    selectedOption !== null
      ? (currentQuestion?.options[selectedOption]?.correct ?? false)
      : null;

  return {
    currentIndex,
    score,
    streak,
    selectedOption,
    isComplete,
    currentQuestion,
    isCorrect,
    submitAnswer,
    nextQuestion,
  };
}
