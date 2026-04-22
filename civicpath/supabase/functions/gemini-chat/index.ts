// supabase/functions/gemini-chat/index.ts
// Deno runtime — Supabase Edge Functions
// NOTE: GEMINI_API_KEY lives ONLY here in Supabase secrets — NEVER in the client bundle

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  question: string;
  phase_id: string;
  phase_title: string;
  voter_type: string;
  language: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> };
  }>;
}

// SHA-256 cache key (phase + question)
async function cacheKey(phaseId: string, question: string): Promise<string> {
  const data = new TextEncoder().encode(`${phaseId}:${question.trim().toLowerCase()}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Validate JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json() as RequestBody;
  const { question, phase_id, phase_title, voter_type, language } = body;

  if (!question?.trim()) {
    return new Response(JSON.stringify({ error: "Question is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Cache lookup — 24h TTL stored in Supabase ai_response_cache table
  const key = await cacheKey(phase_id, question);
  const { data: cached } = await supabase
    .from("ai_response_cache")
    .select("answer, created_at")
    .eq("cache_key", key)
    .single();

  if (cached) {
    const age = Date.now() - new Date((cached as { answer: string; created_at: string }).created_at).getTime();
    if (age < 24 * 60 * 60 * 1000) {
      console.log(JSON.stringify({ severity: "INFO", event: "cache_hit", cache_key: key }));
      return new Response(JSON.stringify({ answer: (cached as { answer: string }).answer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Call Gemini 1.5 Flash
  const systemPrompt = language === "hi"
    ? `आप CivicPath AI हैं। आप भारतीय चुनाव प्रक्रिया के बारे में ${voter_type === "first_time" ? "पहली बार" : voter_type} मतदाताओं की मदद करते हैं। वर्तमान चरण: "${phase_title}". 100-150 शब्दों में सरल हिंदी में उत्तर दें।`
    : `You are CivicPath AI, helping ${voter_type} Indian voters navigate the election process. Current phase: "${phase_title}". Answer in clear, simple English in 100-150 words. Be specific and actionable. If the question is irrelevant to elections, politely redirect.`;

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) throw new Error("GEMINI_API_KEY secret not configured");

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: question }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 512,
          topK: 40,
          topP: 0.95,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH",  threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    }
  );

  if (!geminiRes.ok) {
    console.error(JSON.stringify({ severity: "ERROR", event: "gemini_error", status: geminiRes.status }));
    return new Response(JSON.stringify({ error: "AI service unavailable" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const geminiData = await geminiRes.json() as GeminiResponse;
  const answer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "I couldn't generate a response. Please try again.";

  // Cache the answer
  await supabase.from("ai_response_cache").upsert({ cache_key: key, answer, created_at: new Date().toISOString() });

  console.log(JSON.stringify({ severity: "INFO", event: "gemini_response", phase_id, voter_type, language }));

  return new Response(JSON.stringify({ answer }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
