import "server-only";
import { z } from "zod";
import type { RetrievedSegment } from "./retrieval";

const TutorResponseSchema = z.object({
  answer: z.string().min(1).max(3000),
  citations: z.array(z.object({ segment_id: z.string().uuid(), label: z.string().min(1).max(120) })).max(8),
}).strict();

export type TutorResponse = z.infer<typeof TutorResponseSchema>;

const models = [...new Set([process.env.GEMINI_TUTOR_MODEL, "gemini-3-flash-preview", "gemini-3.6-flash", "gemini-flash-latest", "gemini-flash-lite-latest"].filter((value): value is string => Boolean(value)))];
const transientStatuses = new Set([429, 500, 502, 503, 504]);

async function askGemini(prompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } }),
      });
      if (!response.ok) {
        if (transientStatuses.has(response.status) && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 750 * 2 ** attempt));
          continue;
        }
        break;
      }
      const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) break;
      try { return JSON.parse(text); } catch { throw new Error("TUTOR_MALFORMED_OUTPUT"); }
    }
  }
  throw new Error("TUTOR_MODEL_UNAVAILABLE");
}

export async function answerTutorQuestion(question: string, currentSeconds: number, segments: RetrievedSegment[]): Promise<TutorResponse> {
  if (!segments.length) throw new Error("NO_TUTOR_CONTEXT");
  const context = segments.map((segment) => `[${segment.id}] ${segment.startSeconds.toFixed(1)}-${segment.endSeconds.toFixed(1)}s: ${segment.text}`).join("\n");
  const prompt = `You are a careful timestamp-aware tutor. Answer the student's question using only the supplied transcript context. If the context does not support an answer, say that the video context does not contain enough information. Do not invent facts, citations, timestamps, concepts, or examples. Explain clearly and briefly. Cite only supplied segment IDs in citations, with a human-readable timestamp label. The student's current playback time is ${currentSeconds.toFixed(1)} seconds. Return JSON only: {"answer":"...","citations":[{"segment_id":"uuid","label":"23:10 - Feature Scaling"}]}.\n\nSTUDENT QUESTION:\n${question}\n\nTRANSCRIPT CONTEXT:\n${context}`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const parsed = TutorResponseSchema.safeParse(await askGemini(attempt ? `${prompt}\nPrevious output was invalid. Return corrected JSON only.` : prompt));
      if (parsed.success) {
        const validIds = new Set(segments.map((segment) => segment.id));
        return { answer: parsed.data.answer, citations: parsed.data.citations.filter((citation) => validIds.has(citation.segment_id)) };
      }
      lastError = parsed.error;
    } catch (error) { lastError = error; }
  }
  throw new Error(`TUTOR_INVALID_OUTPUT: ${lastError instanceof Error ? lastError.message : "invalid output"}`);
}
