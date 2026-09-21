import { z } from "zod";

export const ConceptSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(500),
  importance: z.number().min(0).max(1),
  source_segment_ids: z.array(z.string().uuid()).min(1).max(20),
}).strict();

export const ExtractionSchema = z.object({
  concepts: z.array(ConceptSchema).min(1).max(40),
}).strict();

export const RelationshipSchema = z.object({
  source_concept_name: z.string().trim().min(2).max(80),
  target_concept_name: z.string().trim().min(2).max(80),
  relationship_type: z.enum(["prerequisite_of", "related_to", "part_of"]),
}).strict();

export const RelationshipsSchema = z.object({
  relationships: z.array(RelationshipSchema).max(80),
}).strict();

export type ExtractedConcept = z.infer<typeof ConceptSchema>;
export type ExtractedRelationship = z.infer<typeof RelationshipSchema>;
