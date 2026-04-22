// src/main.tsx
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ensureAnonymousSession } from "@/lib/supabase";
import Home from "@/pages/Home";
import Journey from "@/pages/Journey";

// Lazy-load heavy modules → Efficiency criterion
const Quiz = lazy(() => import("@/pages/Quiz"));

// Dark mode: respect system preference
if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  document.documentElement.classList.add("dark");
}

// Anonymous auth on mount
void ensureAnonymousSession();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      {/* Skip to main content — first focusable element */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50
                   focus:px-4 focus:py-2 focus:bg-brand-500 focus:text-white focus:rounded-xl
                   focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
      >
        Skip to main content
      </a>

      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner label="Loading CivicPath..." />}>
          <Routes>
            <Route path="/"                   element={<Home />} />
            <Route path="/journey"            element={<Journey />} />
            <Route path="/journey/:phaseId"   element={<Journey />} />
            <Route path="/quiz"               element={<Quiz />} />
            <Route path="/quiz/:phaseId"      element={<Quiz />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
