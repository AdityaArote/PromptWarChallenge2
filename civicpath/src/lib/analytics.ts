// src/lib/analytics.ts
// Structured logging → Cloud Run stdout → GCP Cloud Logging automatically

type LogEvent =
  | "phase_viewed"
  | "phase_completed"
  | "quiz_started"
  | "quiz_completed"
  | "ai_chat_opened"
  | "voter_type_selected"
  | "language_changed";

export function logEvent(event: LogEvent, meta: Record<string, unknown> = {}): void {
  if (import.meta.env.PROD) {
    // In Cloud Run: stdout is captured by Cloud Logging
    console.log(JSON.stringify({
      severity: "INFO",
      event,
      ...meta,
      timestamp: new Date().toISOString(),
    }));
  } else {
    // Local dev: readable format
    console.log(`[CivicPath] ${event}`, meta);
  }
}
