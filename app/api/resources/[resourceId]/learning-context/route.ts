import { auth } from "@clerk/nextjs/server";
import { ensureCurrentUser } from "@/lib/data/users";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const user = await ensureCurrentUser();
    const resourceId = (await params).resourceId;
    const { data: resource, error: resourceError } = await supabaseAdmin
      .from("resources")
      .select("id,title,type,status,topic_id,duration_seconds")
      .eq("id", resourceId)
      .eq("user_id", user.id)
      .single();
    if (resourceError || !resource) return Response.json({ error: "Resource not found" }, { status: 404 });

    const [{ data: topic }, { data: links, error: linksError }] = await Promise.all([
      resource.topic_id ? supabaseAdmin.from("topics").select("id,title,description").eq("id", resource.topic_id).maybeSingle() : Promise.resolve({ data: null }),
      supabaseAdmin.from("resource_concepts").select("concept_id,relevance_score").eq("resource_id", resourceId),
    ]);
    if (linksError) throw linksError;
    const conceptIds = (links ?? []).map((link) => link.concept_id as string);
    if (!conceptIds.length) return Response.json({ resource, topic, concepts: [], currentConcept: null });

    const [{ data: concepts, error: conceptsError }, { data: mastery, error: masteryError }] = await Promise.all([
      supabaseAdmin.from("concepts").select("id,name,description").in("id", conceptIds),
      supabaseAdmin.from("student_concept_mastery").select("concept_id,mastery_score,confidence_score,evidence_count,last_assessed_at").eq("user_id", user.id).in("concept_id", conceptIds),
    ]);
    if (conceptsError || masteryError) throw conceptsError ?? masteryError;
    const relevanceByConcept = new Map((links ?? []).map((link) => [link.concept_id as string, Number(link.relevance_score ?? 0)]));
    const masteryByConcept = new Map((mastery ?? []).map((item) => [item.concept_id as string, { mastery: Number(item.mastery_score), confidence: Number(item.confidence_score), evidenceCount: Number(item.evidence_count), lastAssessedAt: item.last_assessed_at }]));
    const orderedConcepts = (concepts ?? []).map((concept) => ({ ...concept, relevance: relevanceByConcept.get(concept.id as string) ?? 0, ...(masteryByConcept.get(concept.id as string) ?? { mastery: 0, confidence: 0, evidenceCount: 0, lastAssessedAt: null }) })).sort((left, right) => right.relevance - left.relevance);
    return Response.json({ resource, topic, concepts: orderedConcepts, currentConcept: orderedConcepts[0] ?? null });
  } catch (error) {
    console.error("GET /api/resources/[resourceId]/learning-context failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Could not load learning context" }, { status: 500 });
  }
}