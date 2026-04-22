// src/pages/Journey.tsx
import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { CheckCircle2, Circle, ChevronRight, MessageCircle, ArrowLeft } from "lucide-react";
import { useVoterStore } from "@/store/voterStore";
import { useElectionData } from "@/hooks/useElectionData";
import { supabase } from "@/lib/supabase";
import { logEvent } from "@/lib/analytics";
import { formatDeadline } from "@/lib/dateUtils";
import { t } from "@/lib/i18n";
import ChatWindow from "@/components/ChatWindow";
import type { ElectionPhase } from "@/types";

function PhaseCardSkeleton() {
  return (
    <div className="animate-pulse flex gap-4 p-4 bg-white rounded-2xl" aria-hidden="true">
      <div className="w-10 h-10 rounded-full skeleton shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-3 skeleton rounded w-1/2" />
      </div>
    </div>
  );
}

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function Journey() {
  const navigate = useNavigate();
  const { phaseId: deepLinkPhaseId } = useParams<{ phaseId: string }>();
  const { voterType, completedPhaseIds, markPhaseComplete, setCurrentPhase, language } = useVoterStore();
  const [expandedId, setExpandedId] = useState<string | null>(deepLinkPhaseId ?? null);
  const [chatOpen, setChatOpen] = useState(false);
  const chatTriggerRef = useRef<HTMLButtonElement>(null);
  const { phases, loading, error } = useElectionData(voterType);

  const progress = phases.length > 0
    ? Math.round((completedPhaseIds.filter(id => phases.some(p => p.id === id)).length / phases.length) * 100)
    : 0;

  const completedCount = completedPhaseIds.filter(id => phases.some(p => p.id === id)).length;
  const activePhase = phases.find(p => p.id === expandedId) ?? null;

  const handleMarkComplete = async (phase: ElectionPhase) => {
    markPhaseComplete(phase.id);
    logEvent("phase_completed", { phase_id: phase.id, phase_title: phase.title });
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from("user_progress").upsert({
        user_id: session.user.id,
        phase_id: phase.id,
        completed: true,
        completed_at: new Date().toISOString(),
      });
    }
  };

  const handlePhaseClick = (phase: ElectionPhase) => {
    const newId = expandedId === phase.id ? null : phase.id;
    setExpandedId(newId);
    if (newId) {
      setCurrentPhase(phase.id);
      logEvent("phase_viewed", { phase_id: phase.id, phase_title: phase.title });
    }
  };

  if (!voterType) {
    void navigate("/");
    return null;
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-surface-1 focus:outline-none">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-surface-3 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1 text-caption text-brand-500 font-medium hover:text-brand-600 transition-colors"
              aria-label="Back to voter type selection"
            >
              <ArrowLeft className="w-4 h-4" />
              Your Journey
            </button>
            <span className="text-caption text-text-secondary font-medium">
              {completedCount} of {phases.length} {t("journey.progress", language)}
            </span>
          </div>
          {/* Progress bar */}
          <div
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={phases.length}
            aria-label={`${completedCount} of ${phases.length} steps complete`}
            className="h-1.5 bg-surface-3 rounded-full overflow-hidden"
          >
            <motion.div
              className="h-full bg-brand-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Voter type badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block px-3 py-1 bg-brand-50 text-brand-500 text-label font-medium rounded-full tracking-wide uppercase">
            {voterType.replace("_", " ")} voter
          </span>
        </div>

        <h1 className="text-heading font-medium text-text-primary mb-6">
          {t("journey.heading", language)}
        </h1>

        {/* ARIA live announce */}
        <div aria-live="polite" className="sr-only">
          {loading ? "Loading election phases..." : `${phases.length} phases loaded`}
        </div>

        {error && (
          <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-2xl mb-4 text-body">
            {error} —{" "}
            <button onClick={() => window.location.reload()} className="underline">retry</button>
          </div>
        )}

        {/* Phase list */}
        <motion.ul
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-3 relative"
          aria-label="Election phases"
        >
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <li key={i}><PhaseCardSkeleton /></li>)
            : phases.map((phase, idx) => {
              const isComplete = completedPhaseIds.includes(phase.id);
              const isActive = !isComplete && idx === phases.findIndex(p => !completedPhaseIds.includes(p.id));
              const isExpanded = expandedId === phase.id;
              const deadline = formatDeadline(phase.deadline_days_before_election);

              return (
                <motion.li key={phase.id} variants={cardVariants}>
                  <div
                    className={`rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
                      isComplete
                        ? "border-civic-green bg-civic-green-bg"
                        : isActive
                        ? "border-brand-500 bg-white shadow-card-lg"
                        : "border-surface-3 bg-surface-2"
                    }`}
                  >
                    {/* Card header / trigger */}
                    <button
                      className="w-full text-left p-4 flex items-start gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
                      aria-expanded={isExpanded}
                      aria-label={`${phase.title}, ${isComplete ? "completed" : "not yet completed"}, press to ${isExpanded ? "collapse" : "expand"}`}
                      onClick={() => handlePhaseClick(phase)}
                    >
                      {/* Status dot */}
                      <div className={`shrink-0 mt-0.5 ${isActive ? "phase-active-dot" : ""}`}>
                        {isComplete
                          ? <CheckCircle2 className="w-6 h-6 text-civic-green" />
                          : isActive
                          ? <div className="w-6 h-6 rounded-full bg-brand-500" />
                          : <Circle className="w-6 h-6 text-text-tertiary" />
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xl">{phase.icon}</span>
                          <span className={`text-title font-medium ${isComplete ? "text-civic-green" : isActive ? "text-text-primary" : "text-text-secondary"}`}>
                            {phase.title}
                          </span>
                          {isComplete && (
                            <span className="text-label px-2 py-0.5 bg-civic-green text-white rounded-full ml-auto">
                              {t("journey.complete", language)}
                            </span>
                          )}
                        </div>
                        {deadline && (
                          <span className="inline-block mt-1 text-label px-2 py-0.5 bg-civic-amber-bg text-civic-amber rounded-full">
                            {deadline}
                          </span>
                        )}
                      </div>

                      <ChevronRight
                        className={`shrink-0 w-4 h-4 text-text-tertiary transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </button>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-0 border-t border-surface-3">
                            <p className="text-body text-text-secondary mt-3 mb-4">{phase.description}</p>
                            <div className="flex gap-2 flex-wrap">
                              {!isComplete && (
                                <motion.button
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => void handleMarkComplete(phase)}
                                  className="flex-1 bg-brand-500 text-white text-title font-medium py-2.5 px-4 rounded-xl hover:bg-brand-600 transition-colors focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                                  aria-pressed={isComplete}
                                >
                                  {t("journey.markComplete", language)}
                                </motion.button>
                              )}
                              <button
                                onClick={() => navigate(`/quiz/${phase.id}`)}
                                className="flex-1 border-2 border-brand-500 text-brand-500 text-title font-medium py-2.5 px-4 rounded-xl hover:bg-brand-50 transition-colors focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                              >
                                {t("journey.takeQuiz", language)}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.li>
              );
            })}
        </motion.ul>
      </div>

      {/* Floating AI chat button */}
      <button
        ref={chatTriggerRef}
        onClick={() => {
          setChatOpen(true);
          logEvent("ai_chat_opened", { phase_id: expandedId ?? "none" });
        }}
        className="fixed bottom-6 right-6 flex items-center gap-2 bg-brand-500 text-white px-4 py-3 rounded-full shadow-float hover:bg-brand-600 transition-all hover:scale-105 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        aria-label={`${t("journey.askAI", language)} about the current phase`}
      >
        <MessageCircle className="w-5 h-5" />
        <span className="text-title font-medium">{t("journey.askAI", language)}</span>
      </button>

      {/* Chat window */}
      <ChatWindow
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        phase={activePhase}
        triggerRef={chatTriggerRef}
      />
    </main>
  );
}
