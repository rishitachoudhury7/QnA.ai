import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import type { Json, LearningInteraction } from "@/types/database";

export type LearningInteractionType = LearningInteraction["interaction_type"];

export async function recordLearningInteraction(input: {
  userId: string;
  interactionType: LearningInteractionType;
  topicId?: string | null;
  conceptId?: string | null;
  resourceId?: string | null;
  metadata?: Json;
}): Promise<LearningInteraction> {
  const { data, error } = await supabaseAdmin.from("learning_interactions").insert({
    user_id: input.userId,
    interaction_type: input.interactionType,
    topic_id: input.topicId ?? null,
    concept_id: input.conceptId ?? null,
    resource_id: input.resourceId ?? null,
    metadata: input.metadata ?? {},
  }).select().single();
  if (error || !data) throw new Error(error?.message ?? "Could not record learning interaction");
  return data as LearningInteraction;
}