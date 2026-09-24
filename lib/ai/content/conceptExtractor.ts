import "server-only";
import { ExtractionSchema, RelationshipsSchema, type ExtractedConcept, type ExtractedRelationship } from "./conceptSchemas";

export type ConceptSourceSegment = { id: string; startSeconds: number; endSeconds: number; text: string };

const configuredModel = process.env.GEMINI_CONCEPT_MODEL;
const models = [...new Set([configuredModel, "gemini-3-flash-preview", "gemini-3.6-flash", "gemini-flash-latest", "gemini-flash-lite-latest"].filter((value): value is string => Boolean(value)))];

const transientStatuses = new Set([429, 500, 502, 503, 504]);

function retryDelay(attempt: number): number {
  return 750 * 2 ** attempt;
}

async function askGemini(prompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  let lastStatus = 0;
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
        }),
      });
      if (!response.ok) {
        lastStatus = response.status;
        console.warn("Phase 3 Gemini request failed", { model, status: response.status, attempt: attempt + 1 });
        if (transientStatuses.has(response.status) && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)));
          continue;
        }
        break;
      }
      const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) break;
      try {
        console.info("Phase 3 Gemini request succeeded", { model });
        return JSON.parse(text);
      } catch {
        throw new Error("GEMINI_MALFORMED_OUTPUT");
      }
    }
  }
  throw new Error(`GEMINI_EXTRACTION_ERROR_${lastStatus || "UNKNOWN"}`);
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
  const prompt = `You are an educational knowledge engineer. Identify only meaningful educational relationships between the supplied concepts. Use only concepts from the supplied list; never invent or paraphrase concept names. Do not connect every concept to every other concept. Prefer prerequisite_of only when there is a genuine learning dependency, use related_to for connected concepts that are not prerequisites, and use part_of when one concept is a component or subtopic of another. Avoid prerequisite cycles. Return JSON only with {"relationships":[{"source_concept_name":"...","target_concept_name":"...","relationship_type":"prerequisite_of|related_to|part_of"}]}. Both names must exactly match supplied concept names.\n\nCONCEPTS:\n${concepts.map((concept) => `- ${concept.name}: ${concept.description}`).join("\n")}`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await askGemini(attempt ? `${prompt}\nPrevious output was invalid. Return corrected JSON only.` : prompt);
      const rawRelationships = raw && typeof raw === "object" && "relationships" in raw && Array.isArray(raw.relationships) ? raw.relationships.length : 0;
      console.info("Phase 3 relationship model output", { attempt: attempt + 1, rawRelationshipCount: rawRelationships });
      const parsed = RelationshipsSchema.safeParse(raw);
      if (parsed.success) {
        console.info("Phase 3 relationship validation", { candidateCount: parsed.data.relationships.length });
        return parsed.data.relationships;
      }
      console.warn("Phase 3 relationship validation rejected model output", { issueCount: parsed.error.issues.length });
      lastError = parsed.error;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`RELATIONSHIP_EXTRACTION_INVALID: ${lastError instanceof Error ? lastError.message : "invalid output"}`);
}
