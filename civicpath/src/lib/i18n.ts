// src/lib/i18n.ts
// Minimal i18n — English + Hindi strings

export type TranslationKey =
  | "app.name"
  | "app.tagline"
  | "home.heading"
  | "home.firstTime.title"
  | "home.firstTime.desc"
  | "home.returning.title"
  | "home.returning.desc"
  | "home.overseas.title"
  | "home.overseas.desc"
  | "home.cta"
  | "journey.heading"
  | "journey.progress"
  | "journey.markComplete"
  | "journey.takeQuiz"
  | "journey.askAI"
  | "journey.complete"
  | "quiz.streak"
  | "quiz.score"
  | "quiz.submit"
  | "quiz.next"
  | "quiz.askAI"
  | "quiz.correct"
  | "quiz.wrong"
  | "quiz.share"
  | "chat.placeholder"
  | "chat.context"
  | "chat.loading"
  | "lang.en"
  | "lang.hi";

type Translations = Record<TranslationKey, string>;

const en: Translations = {
  "app.name": "CivicPath",
  "app.tagline": "Your election journey starts here",
  "home.heading": "What kind of voter are you?",
  "home.firstTime.title": "First-time voter",
  "home.firstTime.desc": "New to voting? We'll guide you through every step.",
  "home.returning.title": "Returning voter",
  "home.returning.desc": "Quick refresher on what's changed this election cycle.",
  "home.overseas.title": "Overseas / NRI voter",
  "home.overseas.desc": "Postal ballot timelines and deadlines for you.",
  "home.cta": "Begin My Journey →",
  "journey.heading": "Your Election Roadmap",
  "journey.progress": "complete",
  "journey.markComplete": "Mark Complete",
  "journey.takeQuiz": "Take Quiz",
  "journey.askAI": "Ask AI",
  "journey.complete": "✓ Complete",
  "quiz.streak": "Streak",
  "quiz.score": "Score",
  "quiz.submit": "Submit Answer",
  "quiz.next": "Next →",
  "quiz.askAI": "Ask AI to explain →",
  "quiz.correct": "Correct!",
  "quiz.wrong": "Not quite.",
  "quiz.share": "Share this phase",
  "chat.placeholder": "Ask about this phase...",
  "chat.context": "Currently asking about",
  "chat.loading": "AI is thinking...",
  "lang.en": "English",
  "lang.hi": "हिन्दी",
};

const hi: Translations = {
  "app.name": "CivicPath",
  "app.tagline": "आपकी चुनावी यात्रा यहाँ से शुरू होती है",
  "home.heading": "आप किस प्रकार के मतदाता हैं?",
  "home.firstTime.title": "पहली बार मतदाता",
  "home.firstTime.desc": "मतदान में नए हैं? हम आपको हर कदम पर मार्गदर्शन करेंगे।",
  "home.returning.title": "पुनः मतदाता",
  "home.returning.desc": "इस चुनाव चक्र में क्या बदला है इसकी त्वरित समीक्षा।",
  "home.overseas.title": "विदेश में रहने वाले / NRI मतदाता",
  "home.overseas.desc": "आपके लिए डाक मतपत्र समयसीमा और समय-सारणी।",
  "home.cta": "मेरी यात्रा शुरू करें →",
  "journey.heading": "आपका चुनाव रोडमैप",
  "journey.progress": "पूर्ण",
  "journey.markComplete": "पूर्ण चिह्नित करें",
  "journey.takeQuiz": "क्विज़ लें",
  "journey.askAI": "AI से पूछें",
  "journey.complete": "✓ पूर्ण",
  "quiz.streak": "स्ट्रीक",
  "quiz.score": "स्कोर",
  "quiz.submit": "उत्तर दें",
  "quiz.next": "अगला →",
  "quiz.askAI": "AI से समझाने को कहें →",
  "quiz.correct": "सही!",
  "quiz.wrong": "थोड़ा गलत।",
  "quiz.share": "इस चरण को साझा करें",
  "chat.placeholder": "इस चरण के बारे में पूछें...",
  "chat.context": "वर्तमान में पूछ रहे हैं",
  "chat.loading": "AI सोच रहा है...",
  "lang.en": "English",
  "lang.hi": "हिन्दी",
};

const translations: Record<string, Translations> = { en, hi };

export function t(key: TranslationKey, language: string): string {
  return translations[language]?.[key] ?? translations["en"][key] ?? key;
}
