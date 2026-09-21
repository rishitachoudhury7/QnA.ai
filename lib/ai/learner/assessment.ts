import "server-only";
import { z } from "zod";

export const QuickCheckSchema = z.object({
  question: z.string().trim().min(10).max(500),
  options: z.array(z.string().trim().min(1).max(200)).min(2).max(5),
  correctAnswer: z.string().trim().min(1).max(200),
  explanation: z.string().trim().min(10).max(1000),
  conceptName: z.string().trim().min(2).max(120),
}).strict();

export const QuickCheckListSchema = z.object({
  questions: z.array(QuickCheckSchema).min(2).max(4)
}).strict();

export type QuickCheck = z.infer<typeof QuickCheckSchema>;

type AssessmentInput = {
  concept: { name: string; description: string | null };
  segments: Array<{ id: string; startSeconds: number; endSeconds: number; text: string }>;
  topic?: string | null;
};

const models = [...new Set([process.env.GEMINI_ASSESSMENT_MODEL, "gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"].filter((value): value is string => Boolean(value)))];

async function askGemini(prompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  for (const model of models) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } }),
    });
    if (!response.ok) continue;
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) continue;
    try { return JSON.parse(text); } catch { throw new Error("ASSESSMENT_MALFORMED_OUTPUT"); }
  }
  throw new Error("ASSESSMENT_MODEL_UNAVAILABLE");
}

export async function generateQuickCheck(input: AssessmentInput): Promise<QuickCheck[]> {
  if (!input.segments.length) throw new Error("EMPTY_SEGMENTS");
  const context = input.segments.slice(0, 20).map((segment) => `[${segment.id}] ${segment.startSeconds.toFixed(1)}-${segment.endSeconds.toFixed(1)}s: ${segment.text}`).join("\n").slice(0, 30000);
  const prompt = `Create 2 to 3 evidence-based multiple-choice Quick Check questions for the supplied concept. Use only facts explicitly supported by the transcript. Do not use outside knowledge, and do not mention information absent from the transcript. Return JSON only with exactly this shape: {"questions":[{"question":"...","options":["..."],"correctAnswer":"one exact option","explanation":"...","conceptName":"..."}]}. The correctAnswer must exactly equal one option.\n\nCONCEPT: ${input.concept.name}\nDESCRIPTION: ${input.concept.description ?? "Not provided"}\nTOPIC: ${input.topic ?? "Not provided"}\n\nTRANSCRIPT:\n${context}`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = QuickCheckListSchema.safeParse(await askGemini(attempt ? `${prompt}\nPrevious output was invalid. Return corrected JSON only.` : prompt));
      if (result.success && result.data.questions.every((q) => q.options.includes(q.correctAnswer) && q.conceptName.toLowerCase() === input.concept.name.toLowerCase())) return result.data.questions;
      lastError = result.success ? new Error("correctAnswer or conceptName did not match for some questions") : result.error;
    } catch (error) { lastError = error; }
  }
  throw new Error(`ASSESSMENT_INVALID_OUTPUT: ${lastError instanceof Error ? lastError.message : "invalid output"}`);
}

export const AssignmentListSchema = z.object({
  questions: z.array(QuickCheckSchema).min(5).max(10)
}).strict();

async function askCohere(prompt: string): Promise<unknown> {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) throw new Error("COHERE_API_KEY is not configured");
  
  const response = await fetch("https://api.cohere.ai/v1/chat", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "command-r-plus-08-2024",
      message: prompt,
      response_format: { type: "json_object" }
    }),
  });
  
  if (!response.ok) throw new Error(`Cohere API error: ${response.statusText}`);
  
  const payload = await response.json() as { text?: string };
  if (!payload.text) throw new Error("ASSESSMENT_MALFORMED_OUTPUT");
  
  try { return JSON.parse(payload.text); } catch { throw new Error("ASSESSMENT_MALFORMED_OUTPUT"); }
}

export async function generateAssignment(input: AssessmentInput): Promise<QuickCheck[]> {
  if (!input.segments.length) throw new Error("EMPTY_SEGMENTS");
  
  const totalCharacters = input.segments.reduce((acc, seg) => acc + seg.text.length, 0);
  if (totalCharacters < 500) {
    throw new Error("NOT_ENOUGH_CONTENT");
  }
  
  const targetQuestionCount = totalCharacters > 5000 ? 10 : 5;
  const context = input.segments.map((segment) => `[${segment.id}] ${segment.startSeconds.toFixed(1)}-${segment.endSeconds.toFixed(1)}s: ${segment.text}`).join("\n").slice(0, 50000);
  
  const prompt = `Create exactly ${targetQuestionCount} evidence-based multiple-choice assignment questions for the supplied concept. Use only facts explicitly supported by the transcript. Do not use outside knowledge, and do not mention information absent from the transcript. Return JSON only with exactly this shape: {"questions":[{"question":"...","options":["..."],"correctAnswer":"one exact option","explanation":"...","conceptName":"..."}]}. The correctAnswer must exactly equal one option.\n\nCONCEPT: ${input.concept.name}\nDESCRIPTION: ${input.concept.description ?? "Not provided"}\nTOPIC: ${input.topic ?? "Not provided"}\n\nTRANSCRIPT:\n${context}`;
  
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = AssignmentListSchema.safeParse(await askCohere(attempt ? `${prompt}\nPrevious output was invalid. Return corrected JSON only.` : prompt));
      if (result.success && result.data.questions.every((q) => q.options.includes(q.correctAnswer) && q.conceptName.toLowerCase() === input.concept.name.toLowerCase())) return result.data.questions;
      lastError = result.success ? new Error("correctAnswer or conceptName did not match for some questions") : result.error;
    } catch (error) { lastError = error; }
  }
  throw new Error(`ASSESSMENT_INVALID_OUTPUT: ${lastError instanceof Error ? lastError.message : "invalid output"}`);
}