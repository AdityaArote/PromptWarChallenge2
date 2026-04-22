// src/pages/Home.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Globe } from "lucide-react";
import { useVoterStore } from "@/store/voterStore";
import { logEvent } from "@/lib/analytics";
import { t } from "@/lib/i18n";
import type { VoterType } from "@/types";

const VOTER_OPTIONS: Array<{
  type: VoterType;
  icon: string;
  titleKey: "home.firstTime.title" | "home.returning.title" | "home.overseas.title";
  descKey: "home.firstTime.desc" | "home.returning.desc" | "home.overseas.desc";
}> = [
  { type: "first_time", icon: "📋", titleKey: "home.firstTime.title", descKey: "home.firstTime.desc" },
  { type: "returning",  icon: "🔄", titleKey: "home.returning.title",  descKey: "home.returning.desc" },
  { type: "overseas",   icon: "✉️",  titleKey: "home.overseas.title",   descKey: "home.overseas.desc" },
];

export default function Home() {
  const navigate = useNavigate();
  const { setVoterType, language, setLanguage } = useVoterStore();
  const [selected, setSelected] = useState<VoterType | null>(null);

  const handleBegin = () => {
    if (!selected) return;
    setVoterType(selected);
    logEvent("voter_type_selected", { type: selected });
    void navigate("/journey");
  };

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-surface-1 flex flex-col items-center justify-center px-4 py-12 focus:outline-none">
      {/* Language switcher */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setLanguage(language === "en" ? "hi" : "en")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl text-label text-text-secondary border border-surface-3 hover:bg-surface-2 transition-colors"
          aria-label={language === "en" ? "Switch to Hindi" : "Switch to English"}
        >
          <Globe className="w-3.5 h-3.5" />
          {language === "en" ? "हिन्दी" : "English"}
        </button>
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🗳️</div>
          <h1 className="text-display font-semibold text-brand-500 tracking-tight">
            {t("app.name", language)}
          </h1>
          <p className="text-body text-text-secondary mt-1">{t("app.tagline", language)}</p>
        </div>

        {/* Heading */}
        <h2 className="text-heading font-medium text-text-primary mb-4">
          {t("home.heading", language)}
        </h2>

        {/* Radio group */}
        <div
          role="radiogroup"
          aria-label={t("home.heading", language)}
          className="flex flex-col gap-3"
        >
          {VOTER_OPTIONS.map(({ type, icon, titleKey, descKey }) => {
            const isSelected = selected === type;
            return (
              <motion.button
                key={type}
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelected(type)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(type);
                  }
                }}
                whileTap={{ scale: 0.98 }}
                className={`relative w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                  isSelected
                    ? "border-brand-500 bg-brand-50"
                    : "border-surface-3 bg-white hover:border-brand-200 hover:bg-surface-1"
                }`}
              >
                {isSelected && (
                  <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-brand-500" />
                )}
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5">{icon}</span>
                  <div>
                    <div className="text-title font-medium text-text-primary">{t(titleKey, language)}</div>
                    <div className="text-caption text-text-secondary mt-0.5">{t(descKey, language)}</div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* CTA — fades in on selection */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="mt-6"
            >
              <button
                onClick={handleBegin}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium text-title py-4 rounded-2xl transition-colors focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                {t("home.cta", language)}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
