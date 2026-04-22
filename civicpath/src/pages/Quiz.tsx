// src/pages/Quiz.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, ArrowLeft, Share2 } from "lucide-react";
import { useVoterStore } from "@/store/voterStore";
import { supabase } from "@/lib/supabase";
import { useQuizSession } from "@/hooks/useQuizSession";
import { logEvent } from "@/lib/analytics";
import { t } from "@/lib/i18n";
import type { QuizQuestion } from "@/types";
import clsx from "clsx";

export default function Quiz() {
  const navigate = useNavigate();
  const { phaseId } = useParams<{ phaseId: string }>();
  const { language } = useVoterStore();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [phaseTitle, setPhaseTitle] = useState("Election Phase");
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    async function load() {
      if (!phaseId) { setLoading(false); return; }
      const [{ data: phaseData }, { data: qs }] = await Promise.all([
        supabase.from("election_phases").select("title").eq("id", phaseId).single(),
        supabase.from("quiz_questions").select("*").eq("phase_id", phaseId),
      ]);
      if (phaseData) setPhaseTitle((phaseData as { title: string }).title);
      setQuestions((qs as QuizQuestion[]) ?? []);
      setLoading(false);
      logEvent("quiz_started", { phase_id: phaseId });
    }
    void load();
  }, [phaseId]);

  const {
    currentIndex, score, streak, selectedOption, isComplete,
    currentQuestion, isCorrect, submitAnswer, nextQuestion,
  } = useQuizSession(phaseId ?? "", questions);

  const handleAnswer = async (idx: number) => {
    await submitAnswer(idx);
    // Trigger shake animation for wrong answers
    const wasCorrect = questions[currentIndex]?.options[idx]?.correct ?? false;
    if (!wasCorrect) setShakeKey(k => k + 1);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/quiz/${phaseId}`;
    if (navigator.share) {
      await navigator.share({ title: `CivicPath — ${phaseTitle}`, text: "Test your civic knowledge!", url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-surface-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-surface-3 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <main id="main-content" className="min-h-dvh bg-surface-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">📭</div>
          <h1 className="text-heading font-medium text-text-primary mb-2">No questions yet</h1>
          <p className="text-body text-text-secondary mb-6">Check back after the phase content is loaded.</p>
          <button onClick={() => navigate(-1)} className="text-brand-500 font-medium">← Go back</button>
        </div>
      </main>
    );
  }

  // Completion screen
  if (isComplete) {
    const pct = Math.round((score / questions.length) * 100);
    logEvent("quiz_completed", { phase_id: phaseId, score, total: questions.length });
    return (
      <main id="main-content" className="min-h-dvh bg-surface-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-card-lg"
        >
          <div className="text-5xl mb-4">{pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "💪"}</div>
          <h1 className="text-display font-semibold text-text-primary mb-1">{pct}%</h1>
          <p className="text-body text-text-secondary mb-2">{score} of {questions.length} correct</p>
          {streak > 1 && (
            <p className="text-body text-brand-500 font-medium mb-6">🔥 {streak} streak!</p>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => void handleShare()}
              className="flex items-center justify-center gap-2 w-full border-2 border-brand-500 text-brand-500 py-3 rounded-2xl font-medium hover:bg-brand-50 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              {t("quiz.share", language)}
            </button>
            <button
              onClick={() => navigate("/journey")}
              className="w-full bg-brand-500 text-white py-3 rounded-2xl font-medium hover:bg-brand-600 transition-colors"
            >
              Back to Journey
            </button>
          </div>
        </motion.div>
      </main>
    );
  }

  const q = currentQuestion;
  if (!q) return null;

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-surface-1 flex flex-col focus:outline-none">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-surface-3">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => navigate(-1)} className="text-brand-500" aria-label="Go back">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-caption text-text-secondary font-medium">
              {phaseTitle}
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-label font-medium text-text-secondary">
                <Flame className="w-4 h-4 text-orange-500" /> {streak}
              </span>
              <span className="text-label font-medium text-text-secondary">
                {score}/{questions.length}
              </span>
            </div>
          </div>
          <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand-500 rounded-full"
              animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="bg-white rounded-2xl p-6 shadow-card mb-4">
              <span className="text-label text-text-tertiary uppercase tracking-wider mb-3 block">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <p className="text-title font-medium text-text-primary leading-relaxed">{q.question}</p>
            </div>

            {/* Options */}
            <div
              role="radiogroup"
              aria-label="Answer options"
              className={`flex flex-col gap-2 ${shakeKey > 0 ? "quiz-shake" : ""}`}
              key={`options-${shakeKey}`}
            >
              {q.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const showResult = selectedOption !== null;
                const isThisCorrect = opt.correct;

                let cardCls = "border-2 border-surface-3 bg-white";
                if (showResult) {
                  if (isThisCorrect) cardCls = "border-2 border-civic-green bg-civic-green-bg";
                  else if (isSelected) cardCls = "border-2 border-red-400 bg-red-50";
                  else cardCls = "border-2 border-surface-3 bg-surface-2 opacity-60";
                } else if (isSelected) {
                  cardCls = "border-2 border-brand-500 bg-brand-50";
                }

                return (
                  <button
                    key={idx}
                    role="radio"
                    aria-checked={isSelected}
                    disabled={selectedOption !== null}
                    onClick={() => void handleAnswer(idx)}
                    className={clsx(
                      "w-full text-left p-4 rounded-2xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                      cardCls
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-body text-text-primary">{opt.text}</span>
                      {showResult && isThisCorrect && <span className="text-civic-green text-lg">✓</span>}
                      {showResult && isSelected && !isThisCorrect && <span className="text-red-500 text-lg">✗</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ARIA result announcement */}
            <div aria-live="assertive" aria-atomic="true" className="sr-only">
              {selectedOption !== null && (
                isCorrect
                  ? `${t("quiz.correct", language)} ${q.explanation}`
                  : `${t("quiz.wrong", language)} The correct answer is ${q.options.find(o => o.correct)?.text ?? ""}. ${q.explanation}`
              )}
            </div>

            {/* Explanation + actions */}
            <AnimatePresence>
              {selectedOption !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  <div className={`p-4 rounded-2xl mb-4 ${isCorrect ? "bg-civic-green-bg text-civic-green" : "bg-red-50 text-red-700"}`}>
                    <span className="font-medium">{isCorrect ? `✅ ${t("quiz.correct", language)}` : `❌ ${t("quiz.wrong", language)}`}</span>
                    <p className="text-body mt-1">{q.explanation}</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate(`/chat?q=${encodeURIComponent("Explain: " + q.question)}&phase=${phaseId}`)}
                      className="flex-1 text-brand-500 text-body font-medium py-3 px-4 rounded-2xl border-2 border-brand-500 hover:bg-brand-50 transition-colors"
                    >
                      {t("quiz.askAI", language)}
                    </button>
                    <button
                      onClick={nextQuestion}
                      className="flex-1 bg-brand-500 text-white text-body font-medium py-3 px-4 rounded-2xl hover:bg-brand-600 transition-colors"
                    >
                      {t("quiz.next", language)}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
