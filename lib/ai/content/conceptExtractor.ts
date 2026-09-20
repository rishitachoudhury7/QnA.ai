import "server-only";
import { ExtractionSchema, RelationshipsSchema, type ExtractedConcept, type ExtractedRelationship } from "./conceptSchemas";

export type ConceptSourceSegment = { id: string; startSeconds: number; endSeconds: number; text: string };

const model = "gemini-3.6-flash";

async function askGemini(prompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) throw new Error("GEMINI_EXTRACTION_ERROR");
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("GEMINI_EXTRACTION_ERROR");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("GEMINI_MALFORMED_OUTPUT");
  }
}

function segmentContext(segments: ConceptSourceSegment[]): string {
  return segments.map((segment) => `[${segment.id}] (${segment.startSeconds.toFixed(1)}-${segment.endSeconds.toFixed(1)}s) ${segment.text}`).join("\n");
}

export async function extractConcepts(segments: ConceptSourceSegment[]): Promise<ExtractedConcept[]> {
  if (!segments.length) throw new Error("EMPTY_SEGMENTS");
  const context = segmentContext(segments.slice(0, 160)).slice(0, 60000);
  const prompt = `You are an educational knowledge engineer. Extract only meaningful, reusable concepts explicitly taught by this transcript. Do not extract generic nouns such as video, student, data, model, algorithm, or example unless the transcript teaches a specific technical meaning. Concepts must be reasonably atomic and useful for learner mastery. Return JSON only with this shape: {"concepts":[{"name":"...","description":"...","importance":0.0,"source_segment_ids":["segment uuid"]}]}. Importance is between 0 and 1. Every source_segment_ids value must be one of the supplied segment IDs. Use at most 40 concepts.\n\nTRANSCRIPT SEGMENTS:\n${context}`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const parsed = ExtractionSchema.safeParse(await askGemini(attempt ? `${prompt}\nPrevious output was invalid. Return corrected JSON only.` : prompt));
      if (parsed.success) {
        const validIds = new Set(segments.map((segment) => segment.id));
        const concepts = parsed.data.concepts.filter((concept) => concept.source_segment_ids.every((id) => validIds.has(id)));
        if (concepts.length) return concepts;
      } else lastError = parsed.error;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`CONCEPT_EXTRACTION_INVALID: ${lastError instanceof Error ? lastError.message : "invalid output"}`);
}

export async function extractRelationships(concepts: Array<Pick<ExtractedConcept, "name" | "description">>): Promise<ExtractedRelationship[]> {
  if (concepts.length < 2) return [];
  const prompt = `You are an educational knowledge engineer. Identify only meaningful relationships between the supplied concepts. Do not connect every pair. Avoid prerequisite cycles. Return JSON only with {"relationships":[{"source_concept_name":"...","target_concept_name":"...","relationship_type":"prerequisite_of|related_to|part_of"}]}. Both names must exactly match supplied concept names.\n\nCONCEPTS:\n${concepts.map((concept) => `- ${concept.name}: ${concept.description}`).join("\n")}`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const parsed = RelationshipsSchema.safeParse(await askGemini(attempt ? `${prompt}\nPrevious output was invalid. Return corrected JSON only.` : prompt));
      if (parsed.success) return parsed.data.relationships;
      lastError = parsed.error;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`RELATIONSHIP_EXTRACTION_INVALID: ${lastError instanceof Error ? lastError.message : "invalid output"}`);
}
