// src/hooks/useGeminiChat.ts
import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Message } from "@/types";

export function useGeminiChat(phaseId: string, phaseTitle: string, voterType: string, language: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim()) return;
    setError(null);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question,
            phase_id: phaseId,
            phase_title: phaseTitle,
            voter_type: voterType,
            language,
          }),
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { answer } = await res.json() as { answer: string };

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: answer },
      ]);
    } catch {
      setError("Could not reach the assistant. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [phaseId, phaseTitle, voterType, language]);

  const reset = useCallback(() => setMessages([]), []);

  return { messages, loading, error, sendMessage, reset };
}
