import "server-only";
import { extractConcepts, extractRelationships } from "./conceptExtractor";
import { createConceptRelationship, getOrCreateConcept, linkConceptToResource, listConcepts, normalizeConceptName } from "@/lib/data/concepts";
import { supabaseAdmin } from "@/lib/supabase";
import type { Concept, Resource } from "@/types/database";

export type KnowledgeExtractionSummary = {
  resourceId: string;
  conceptsCreated: number;
  conceptsReused: number;
  relationshipsCreated: number;
  status: "completed";
};

export async function processResourceKnowledge(resourceId: string): Promise<KnowledgeExtractionSummary> {
  const { data: resource, error: resourceError } = await supabaseAdmin.from("resources").select("*").eq("id", resourceId).single();
  if (resourceError || !resource) throw new Error("RESOURCE_NOT_FOUND");
  if ((resource as Resource).status !== "ready") throw new Error("RESOURCE_NOT_READY");

  const { data: segments, error: segmentsError } = await supabaseAdmin.from("video_segments").select("id,start_seconds,end_seconds,text").eq("resource_id", resourceId).order("start_seconds");
  if (segmentsError) throw new Error("DATABASE_ERROR");
  if (!segments?.length) throw new Error("EMPTY_SEGMENTS");

  const extracted = await extractConcepts(segments.map((segment) => ({ id: segment.id as string, startSeconds: Number(segment.start_seconds), endSeconds: Number(segment.end_seconds), text: segment.text as string })));
  const uniqueExtracted = [...new Map(extracted.map((concept) => [normalizeConceptName(concept.name), concept])).values()];
  const existing = await listConcepts();
  const conceptByName = new Map<string, Concept>();
  const resolved: Array<{ concept: Concept; importance: number }> = [];
  let conceptsCreated = 0;
  let conceptsReused = 0;

  for (const item of uniqueExtracted) {
    const result = await getOrCreateConcept(item.name, item.description, [...existing, ...resolved.map((entry) => entry.concept)]);
    conceptByName.set(normalizeConceptName(item.name), result.concept);
    resolved.push({ concept: result.concept, importance: item.importance });
    if (result.created) conceptsCreated += 1;
    else conceptsReused += 1;
  }

  const { error: clearLinksError } = await supabaseAdmin.from("resource_concepts").delete().eq("resource_id", resourceId);
  if (clearLinksError) throw new Error("DATABASE_ERROR");
  for (const item of resolved) await linkConceptToResource(resourceId, item.concept.id, item.importance);

  let relationshipsCreated = 0;
  try {
    const relationships = await extractRelationships(uniqueExtracted.map((concept) => ({ name: concept.name, description: concept.description })));
    for (const relationship of relationships) {
      const source = conceptByName.get(normalizeConceptName(relationship.source_concept_name));
      const target = conceptByName.get(normalizeConceptName(relationship.target_concept_name));
      if (!source || !target) continue;
      try {
        if (await createConceptRelationship(source.id, target.id, relationship.relationship_type)) relationshipsCreated += 1;
      } catch (error) {
        console.error("Could not persist concept relationship", { resourceId, relationship, error });
      }
    }
  } catch (error) {
    console.error("Concept relationship extraction failed", { resourceId, error });
  }

  const currentMetadata = resource.metadata && typeof resource.metadata === "object" && !Array.isArray(resource.metadata) ? resource.metadata as Record<string, unknown> : {};
  await supabaseAdmin.from("resources").update({ metadata: { ...currentMetadata, knowledgeStatus: "completed", knowledgeConcepts: resolved.length, knowledgeRelationships: relationshipsCreated, knowledgeError: null } }).eq("id", resourceId);
  return { resourceId, conceptsCreated, conceptsReused, relationshipsCreated, status: "completed" };
}
