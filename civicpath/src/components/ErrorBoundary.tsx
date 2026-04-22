// src/components/ErrorBoundary.tsx
import { Component, ReactNode, ErrorInfo } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(JSON.stringify({
      severity: "ERROR",
      event: "react_error_boundary",
      error: error.message,
      component: info.componentStack?.split("\n")[1]?.trim(),
    }));
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div role="alert" aria-live="assertive" className="flex flex-col items-center justify-center min-h-screen p-6 bg-surface-1">
          <div className="bg-white rounded-2xl p-8 shadow-card-lg max-w-sm w-full text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-heading font-medium text-text-primary mb-2">Something went wrong</h2>
            <p className="text-body text-text-secondary mb-6">Please refresh the page. Your progress is saved.</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-brand-500 text-white rounded-xl py-3 font-medium hover:bg-brand-600 transition-colors focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
