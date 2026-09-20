import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import type { Concept, ConceptRelationship } from "@/types/database";

export type PersistedConcept = { concept: Concept; created: boolean };

export function normalizeConceptName(name: string): string {
  return name.toLowerCase().replace(/[()\[\],.:;]+/g, " ").replace(/\b(algorithm|method|technique|concept)\b/g, " ").replace(/\s+/g, " ").trim();
}

export async function listConcepts(): Promise<Concept[]> {
  const { data, error } = await supabaseAdmin.from("concepts").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as Concept[];
}

export async function getOrCreateConcept(name: string, description: string, existing: Concept[]): Promise<PersistedConcept> {
  const normalized = normalizeConceptName(name);
  const match = existing.find((concept) => normalizeConceptName(concept.name) === normalized);
  if (match) return { concept: match, created: false };
  const { data, error } = await supabaseAdmin.from("concepts").insert({ name: name.trim(), description: description.trim() }).select().single();
  if (!error && data) return { concept: data as Concept, created: true };
  if (error?.code === "23505") {
    const refreshed = await listConcepts();
    const retry = refreshed.find((concept) => normalizeConceptName(concept.name) === normalized);
    if (retry) return { concept: retry, created: false };
  }
  throw new Error(error?.message ?? "Could not create concept");
}

export async function linkConceptToResource(resourceId: string, conceptId: string, relevanceScore: number): Promise<void> {
  const { error } = await supabaseAdmin.from("resource_concepts").upsert({ resource_id: resourceId, concept_id: conceptId, relevance_score: relevanceScore }, { onConflict: "resource_id,concept_id" });
  if (error) throw new Error(error.message);
}

export type RelationshipPersistenceResult = "inserted" | "duplicate" | "cycle" | "self";

export async function createConceptRelationship(sourceConceptId: string, targetConceptId: string, relationshipType: ConceptRelationship["relationship_type"]): Promise<RelationshipPersistenceResult> {
  if (sourceConceptId === targetConceptId) return "self";
  if (relationshipType === "prerequisite_of" && await relationshipWouldCycle(sourceConceptId, targetConceptId)) return "cycle";
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("concept_relationships")
    .select("id")
    .eq("source_concept_id", sourceConceptId)
    .eq("target_concept_id", targetConceptId)
    .eq("relationship_type", relationshipType)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return "duplicate";
  const { error } = await supabaseAdmin.from("concept_relationships").upsert({ source_concept_id: sourceConceptId, target_concept_id: targetConceptId, relationship_type: relationshipType }, { onConflict: "source_concept_id,target_concept_id,relationship_type", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return "inserted";
}

async function relationshipWouldCycle(sourceId: string, targetId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from("concept_relationships").select("source_concept_id,target_concept_id").eq("relationship_type", "prerequisite_of");
  if (error) throw new Error(error.message);
  const next = new Map<string, string[]>();
  for (const edge of data ?? []) next.set(edge.source_concept_id as string, [...(next.get(edge.source_concept_id as string) ?? []), edge.target_concept_id as string]);
  const pending = [targetId];
  const visited = new Set<string>();
  while (pending.length) {
    const current = pending.pop()!;
    if (current === sourceId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    pending.push(...(next.get(current) ?? []));
  }
  return false;
}
