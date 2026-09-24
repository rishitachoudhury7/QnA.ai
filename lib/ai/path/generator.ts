import "server-only";
import { LearningPathSchema, type GeneratedLearningPath } from "@/lib/ai/path/schemas";

type GoalInput = {
  title: string;
  description?: string | null;
  skillLevel?: "beginner" | "intermediate" | "advanced" | null;
  objective?: string | null;
};

const model = "qwen/qwen3.8-27b";

function promptFor(goal: GoalInput, correction?: string) {
  return `You are an expert curriculum designer. Design a structured learning path for a student.

Student goal: ${goal.title}
Current skill level: ${goal.skillLevel ?? "beginner"}
Description: ${goal.description ?? "Not provided"}
Objective: ${goal.objective ?? "Not provided"}

Rules:
- Start from the student's current skill level and progress from foundations to advanced topics.
- Use logical prerequisite ordering and avoid unnecessary duplication.
- Make every topic a concrete, learnable concept rather than a vague category.
- Adapt the depth and starting point to the skill level; do not return the same generic curriculum for every level.
- Return 3 to 8 modules and 2 to 8 topics per module.
- Positions must start at 0 and increase sequentially within their parent.
- Do not generate resources, YouTube URLs, assessments, mastery scores, or invented prior knowledge.
- Return only JSON matching the requested shape.

JSON shape:
{"title":"...","description":"...","modules":[{"title":"...","description":"...","position":0,"topics":[{"title":"...","description":"...","position":0}]}]}
${correction ?? ""}`;
}

async function requestCurriculum(goal: GoalInput, correction?: string): Promise<unknown> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You output only valid JSON. Never include markdown fences or commentary." },
        { role: "user", content: promptFor(goal, correction) },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Groq request failed (${response.status})`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned an empty curriculum");
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Groq returned invalid JSON");
  }
}

export async function generateLearningPath(goal: GoalInput): Promise<GeneratedLearningPath> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = LearningPathSchema.safeParse(await requestCurriculum(goal, attempt === 0 ? undefined : "The previous response failed validation. Return corrected JSON only, with no extra fields and sequential positions."));
      if (result.success) return result.data;
      lastError = result.error;
    } catch (error) {
      lastError = error;
      if (attempt === 0 && error instanceof Error && /Groq request failed|GROQ_API_KEY|empty curriculum/.test(error.message)) throw error;
    }
  }
  throw new Error(`Groq curriculum validation failed: ${lastError instanceof Error ? lastError.message : "invalid response"}`);
}