import { auth } from "@clerk/nextjs/server";
import { ensureCurrentUser } from "@/lib/data/users";
import { supabaseAdmin } from "@/lib/supabase";

type Metadata = Record<string, unknown>;

function metadataOf(value: unknown): Metadata {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Metadata : {};
}

function numberMetadata(metadata: Metadata, key: string): number {
  const value = Number(metadata[key]);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const user = await ensureCurrentUser();
    const [{ data: paths, error: pathsError }, { data: resources, error: resourcesError }, { data: interactions, error: interactionsError }, { data: attempts, error: attemptsError }] = await Promise.all([
      supabaseAdmin.from("learning_paths").select("id,goal_id,title,description,version,learning_goals!inner(user_id),path_modules(id,title,description,position,topics(id,title,description,position))").eq("learning_goals.user_id", user.id).order("version", { ascending: false }),
      supabaseAdmin.from("resources").select("id,title,topic_id,status,duration_seconds,created_at").eq("user_id", user.id),
      supabaseAdmin.from("learning_interactions").select("interaction_type,concept_id,resource_id,metadata,created_at").eq("user_id", user.id).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabaseAdmin.from("assessment_attempts").select("is_correct,score,created_at").eq("user_id", user.id).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);
    if (pathsError || resourcesError || interactionsError || attemptsError) throw pathsError ?? resourcesError ?? interactionsError ?? attemptsError;

    const resourceIds = (resources ?? []).map((resource) => resource.id as string);
    const { data: links, error: linksError } = resourceIds.length
      ? await supabaseAdmin.from("resource_concepts").select("resource_id,concept_id").in("resource_id", resourceIds)
      : { data: [], error: null };
    if (linksError) throw linksError;
    const conceptIds = [...new Set((links ?? []).map((link) => link.concept_id as string))];
    const [{ data: concepts, error: conceptsError }, { data: mastery, error: masteryError }] = await Promise.all([
      conceptIds.length ? supabaseAdmin.from("concepts").select("id,name,description").in("id", conceptIds) : Promise.resolve({ data: [], error: null }),
      conceptIds.length ? supabaseAdmin.from("student_concept_mastery").select("concept_id,mastery_score,confidence_score,evidence_count").eq("user_id", user.id).in("concept_id", conceptIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (conceptsError || masteryError) throw conceptsError ?? masteryError;

    const masteryByConcept = new Map((mastery ?? []).map((item) => [item.concept_id as string, { mastery: Number(item.mastery_score), confidence: Number(item.confidence_score), evidenceCount: Number(item.evidence_count) }]));
    const conceptById = new Map((concepts ?? []).map((concept) => [concept.id as string, concept]));
    const weakConcepts = [...(mastery ?? [])]
      .map((item) => ({ id: item.concept_id as string, name: conceptById.get(item.concept_id as string)?.name ?? "Unnamed concept", mastery: Number(item.mastery_score) }))
      .filter((concept) => concept.mastery < 70)
      .sort((left, right) => left.mastery - right.mastery)
      .slice(0, 3);
    const overallMastery = mastery?.length ? Math.round((mastery.reduce((sum, item) => sum + Number(item.mastery_score), 0) / mastery.length) * 10) / 10 : 0;
    const masteredConcepts = (mastery ?? []).filter((item) => Number(item.mastery_score) >= 70).length;
    const learningSeconds = (interactions ?? []).filter((interaction) => interaction.interaction_type === "VIDEO_WATCH").reduce((sum, interaction) => sum + numberMetadata(metadataOf(interaction.metadata), "duration_seconds"), 0);
    const answeredAttempts = (attempts ?? []).filter((attempt) => typeof attempt.is_correct === "boolean");
    const retention = answeredAttempts.length ? Math.round(answeredAttempts.filter((attempt) => attempt.is_correct).length / answeredAttempts.length * 100) : 0;
    const currentPath = (paths ?? [])[0] ?? null;
    const currentPathTopics = ((currentPath?.path_modules ?? []) as unknown as Array<{ topics?: Array<{ id: string; title: string; description: string | null; position: number }> }>).flatMap((module) => module.topics ?? []);
    const pathProgress = currentPathTopics.map((topic) => {
      const topicConceptIds = (links ?? []).filter((link) => {
        const resource = (resources ?? []).find((item) => item.id === link.resource_id);
        return resource?.topic_id === topic.id;
      }).map((link) => link.concept_id as string);
      const topicMastery = topicConceptIds.map((id) => masteryByConcept.get(id)?.mastery).filter((score): score is number => typeof score === "number");
      const progress = topicMastery.length ? Math.round(topicMastery.reduce((sum, score) => sum + score, 0) / topicMastery.length) : 0;
      return { ...topic, state: progress >= 70 ? "done" : progress > 0 ? "progress" : "locked", progress };
    });
    const recommendation = weakConcepts[0] ? { concept: weakConcepts[0], resource: (resources ?? []).find((resource) => (links ?? []).some((link) => link.resource_id === resource.id && link.concept_id === weakConcepts[0].id)) ?? null } : null;
    return Response.json({ overallMastery, masteredConcepts, encounteredConcepts: conceptIds.length, learningSeconds, retention, currentPath, pathProgress, weakConcepts, recommendation });
  } catch (error) {
    console.error("GET /api/dashboard failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Could not load dashboard" }, { status: 500 });
  }
}