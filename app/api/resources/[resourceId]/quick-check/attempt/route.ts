import { auth } from "@clerk/nextjs/server";
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
    const body = await request.json() as { assessmentId?: unknown; answer?: unknown };
    const assessmentId = typeof body.assessmentId === "string" ? body.assessmentId : null;
    const answer = String(body.answer ?? "").trim();
    if (!assessmentId || !answer) return Response.json({ error: "Assessment and answer are required" }, { status: 400 });
    const { data: resource, error: resourceError } = await supabaseAdmin.from("resources").select("id,topic_id").eq("id", resourceId).eq("user_id", user.id).single();
    if (resourceError || !resource?.topic_id) return Response.json({ error: "Resource not found" }, { status: 404 });
    const { data: assessment, error: assessmentError } = await supabaseAdmin.from("assessments").select("*").eq("id", assessmentId).eq("topic_id", resource.topic_id).eq("type", "quick_check").single();
    if (assessmentError || !assessment || !assessment.concept_id) return Response.json({ error: "Assessment not found" }, { status: 404 });
    const options = Array.isArray(assessment.options) ? assessment.options.map(String) : [];
    if (!options.includes(answer)) return Response.json({ error: "Answer must be one of the supplied options" }, { status: 400 });
    const isCorrect = answer === assessment.correct_answer;
    const { data: attempt, error: attemptError } = await supabaseAdmin.from("assessment_attempts").insert({ assessment_id: assessment.id, user_id: user.id, answer, is_correct: isCorrect, score: isCorrect ? 100 : 0, feedback: assessment.explanation }).select().single();
    if (attemptError || !attempt) throw new Error(attemptError?.message ?? "Could not save assessment attempt");
    const mastery = await updateConceptMastery({ userId: user.id, conceptId: assessment.concept_id, evidenceType: "assessment", score: isCorrect ? 100 : 0 });
    await recordLearningInteraction({ userId: user.id, topicId: resource.topic_id, conceptId: assessment.concept_id, resourceId, interactionType: "QUIZ", metadata: { assessment_id: assessment.id, attempt_id: attempt.id, is_correct: isCorrect } });
    return Response.json({ attempt, isCorrect, explanation: assessment.explanation, mastery });
  } catch (error) {
    console.error("POST /api/resources/[resourceId]/quick-check/attempt failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Could not submit Quick Check" }, { status: 400 });
  }
}