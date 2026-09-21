import { auth } from "@clerk/nextjs/server";
import { evaluateTeachBack } from "@/lib/ai/learner/misconception";
import { recordLearningInteraction } from "@/lib/ai/learner/interactions";
import { updateConceptMastery } from "@/lib/ai/learner/mastery";
import { ensureCurrentUser } from "@/lib/data/users";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const user = await ensureCurrentUser();
    const resourceId = (await params).resourceId;
    const body = await request.json() as { explanation?: unknown; conceptId?: unknown };
    const explanation = String(body.explanation ?? "").trim();
    const conceptId = typeof body.conceptId === "string" ? body.conceptId : null;
    if (!explanation) return Response.json({ error: "An explanation is required" }, { status: 400 });
    const { data: resource, error: resourceError } = await supabaseAdmin.from("resources").select("id,topic_id,status").eq("id", resourceId).eq("user_id", user.id).single();
    if (resourceError || !resource) return Response.json({ error: "Resource not found" }, { status: 404 });
    if (resource.status !== "ready" || !resource.topic_id) return Response.json({ error: "This resource is not ready for teach-back" }, { status: 409 });
    const { data: links } = await supabaseAdmin.from("resource_concepts").select("concept_id").eq("resource_id", resourceId);
    const selectedConceptId = conceptId && links?.some((link) => link.concept_id === conceptId) ? conceptId : links?.[0]?.concept_id;
    if (!selectedConceptId) return Response.json({ error: "Analyze this resource's concepts before submitting a teach-back" }, { status: 422 });
    const [{ data: concept, error: conceptError }, { data: segments, error: segmentsError }] = await Promise.all([
      supabaseAdmin.from("concepts").select("id,name,description").eq("id", selectedConceptId).single(),
      supabaseAdmin.from("video_segments").select("text").eq("resource_id", resourceId).order("start_seconds").limit(40),
    ]);
    if (conceptError || !concept || segmentsError || !segments?.length) return Response.json({ error: "Could not load teach-back context" }, { status: 422 });
    const evaluation = await evaluateTeachBack({ concept, explanation, segments });
    const { data: assessment, error: assessmentError } = await supabaseAdmin.from("assessments").insert({ topic_id: resource.topic_id, concept_id: concept.id, type: "teach_back", question: `Explain ${concept.name} in your own words.`, explanation: evaluation.feedback }).select().single();
    if (assessmentError || !assessment) throw new Error(assessmentError?.message ?? "Could not save teach-back assessment");
    const { data: attempt, error: attemptError } = await supabaseAdmin.from("assessment_attempts").insert({ assessment_id: assessment.id, user_id: user.id, answer: explanation, is_correct: evaluation.score >= 0.7, score: evaluation.score * 100, feedback: evaluation.feedback }).select().single();
    if (attemptError || !attempt) throw new Error(attemptError?.message ?? "Could not save teach-back attempt");
    const mastery = await updateConceptMastery({ userId: user.id, conceptId: concept.id, evidenceType: "explanation", score: evaluation.score * 100 });
    await recordLearningInteraction({ userId: user.id, topicId: resource.topic_id, conceptId: concept.id, resourceId, interactionType: "TEACH_BACK", metadata: { assessment_id: assessment.id, attempt_id: attempt.id, score: evaluation.score } });
    return Response.json({ evaluation, assessment, attempt, mastery, concept });
  } catch (error) {
    console.error("POST /api/resources/[resourceId]/teach-back failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Could not evaluate teach-back" }, { status: 400 });
  }
}