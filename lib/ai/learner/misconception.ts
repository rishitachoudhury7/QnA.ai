import "server-only";
import { z } from "zod";

export const TeachBackEvaluationSchema = z.object({
  score: z.number().min(0).max(1),
  feedback: z.string().trim().min(10).max(1500),
  misconceptions: z.array(z.string().trim().min(1).max(300)).max(8),
  strengths: z.array(z.string().trim().min(1).max(300)).max(8),
  followUpQuestions: z.array(z.string().trim().min(10).max(300)).min(2).max(3),
}).strict();

export type TeachBackEvaluation = z.infer<typeof TeachBackEvaluationSchema>;

type TeachBackInput = { concept: { name: string; description: string | null }; explanation: string; segments: Array<{ text: string }> };

const models = [...new Set([process.env.GEMINI_MISCONCEPTION_MODEL, "gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"].filter((value): value is string => Boolean(value)))];

async function askGemini(prompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  for (const model of models) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, responseMimeType: "application/json" } }),
    });
    if (!response.ok) continue;
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) continue;
    try { return JSON.parse(text); } catch { throw new Error("TEACH_BACK_MALFORMED_OUTPUT"); }
  }
  throw new Error("TEACH_BACK_MODEL_UNAVAILABLE");
}

export async function evaluateTeachBack(input: TeachBackInput): Promise<TeachBackEvaluation> {
  if (!input.explanation.trim()) throw new Error("EMPTY_TEACH_BACK");
  const context = input.segments.map((segment) => segment.text).join("\n").slice(0, 30000);
  const prompt = `Evaluate a student's teach-back using only the supplied lesson context. Score conceptual understanding from 0 to 1. Identify concrete misconceptions, but do not penalize wording or missing details that are not required by the context. Also, generate 2 to 3 specific follow-up questions to deepen their understanding. Return JSON only with exactly: {"score":0.0,"feedback":"...","misconceptions":["..."],"strengths":["..."],"followUpQuestions":["..."]}.\n\nCONCEPT: ${input.concept.name}\nREFERENCE DESCRIPTION: ${input.concept.description ?? "Not provided"}\nLESSON CONTEXT:\n${context}\n\nSTUDENT EXPLANATION:\n${input.explanation}`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = TeachBackEvaluationSchema.safeParse(await askGemini(attempt ? `${prompt}\nPrevious output was invalid. Return corrected JSON only.` : prompt));
      if (result.success) return result.data;
      lastError = result.error;
    } catch (error) { lastError = error; }
  }
  throw new Error(`TEACH_BACK_INVALID_OUTPUT: ${lastError instanceof Error ? lastError.message : "invalid output"}`);
}