// src/components/ChatWindow.tsx
import { useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, MessageCircle } from "lucide-react";
import { useGeminiChat } from "@/hooks/useGeminiChat";
import { useVoterStore } from "@/store/voterStore";
import type { ElectionPhase } from "@/types";
import { t } from "@/lib/i18n";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  phase: ElectionPhase | null;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-surface-2 rounded-2xl w-fit" aria-hidden="true">
      <span className="typing-dot w-2 h-2 rounded-full bg-text-tertiary" />
      <span className="typing-dot w-2 h-2 rounded-full bg-text-tertiary" />
      <span className="typing-dot w-2 h-2 rounded-full bg-text-tertiary" />
    </div>
  );
}

export default function ChatWindow({ isOpen, onClose, phase, triggerRef }: Props) {
  const { voterType, language } = useVoterStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = [
    useRef(""),
    (val: string) => { inputRef.current && (inputRef.current.value = val); },
  ];

  const { messages, loading, error, sendMessage } = useGeminiChat(
    phase?.id ?? "general",
    phase?.title ?? "Election Process",
    voterType ?? "first_time",
    language
  );

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    } else {
      triggerRef.current?.focus();
      return undefined;
    }
  }, [isOpen, triggerRef]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    const val = inputRef.current?.value.trim() ?? "";
    if (!val) return;
    if (inputRef.current) inputRef.current.value = "";
    await sendMessage(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="fixed z-50 bg-white shadow-float
                     bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl
                     md:bottom-20 md:right-6 md:left-auto md:w-96 md:max-h-[600px] md:rounded-2xl
                     flex flex-col"
          role="dialog"
          aria-label={`CivicPath AI — ${phase?.title ?? "Election"}`}
          aria-modal="true"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 md:hidden">
            <div className="w-8 h-1 rounded-full bg-surface-3" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-brand-500" />
              <span className="font-medium text-title text-text-primary">CivicPath AI</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>

          {/* Phase context pill */}
          {phase && (
            <div className="px-4 pt-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-brand-50 text-brand-500 text-label rounded-full font-medium">
                {phase.icon} {phase.title}
              </span>
            </div>
          )}

          {/* Messages */}
          <div
            role="log"
            aria-label="Conversation with CivicPath AI"
            aria-live="polite"
            aria-relevant="additions"
            tabIndex={0}
            className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0"
          >
            {messages.length === 0 && (
              <div className="flex gap-2 items-start">
                <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">AI</div>
                <div className="bg-surface-2 rounded-2xl rounded-tl-none px-4 py-3 text-body text-text-primary max-w-[85%]">
                  {phase
                    ? `You're on ${phase.title}. ${phase.deadline_days_before_election ? `Deadlines typically fall ${phase.deadline_days_before_election} days before election day.` : ""} What would you like clarified?`
                    : "Hello! Ask me anything about the Indian election process."}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                role="article"
                aria-label={`${msg.role === "assistant" ? "AI" : "You"}: ${msg.content}`}
                className={`flex gap-2 items-start ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">AI</div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 text-body max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-brand-500 text-white rounded-tr-none"
                      : "bg-surface-2 text-text-primary rounded-tl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <>
                <div aria-live="polite" aria-atomic="true">
                  <span className="sr-only">{t("chat.loading", language)}</span>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">AI</div>
                  <TypingIndicator />
                </div>
              </>
            )}

            {error && (
              <div role="alert" className="text-body text-red-600 bg-red-50 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t border-surface-3">
            <p id="chat-context" className="sr-only">
              {t("chat.context", language)}: {phase?.title ?? "Election Process"}
            </p>
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                placeholder={t("chat.placeholder", language)}
                aria-label={t("chat.placeholder", language)}
                aria-describedby="chat-context"
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="flex-1 bg-surface-2 rounded-xl px-4 py-3 text-body text-text-primary placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-brand-500 focus:ring-inset disabled:opacity-50"
              />
              <button
                onClick={() => void handleSend()}
                disabled={loading}
                aria-label="Send message"
                className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white hover:bg-brand-600 transition-colors disabled:opacity-50 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
