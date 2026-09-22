import { auth } from "@clerk/nextjs/server";
import { generateAssignment } from "@/lib/ai/learner/assessment";
import { recordLearningInteraction } from "@/lib/ai/learner/interactions";
import { ensureCurrentUser } from "@/lib/data/users";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const user = await ensureCurrentUser();
    const resourceId = (await params).resourceId;
    const body = await request.json().catch(() => ({})) as { conceptId?: unknown };
    const { data: resource, error: resourceError } = await supabaseAdmin.from("resources").select("id,topic_id,status").eq("id", resourceId).eq("user_id", user.id).single();
    if (resourceError || !resource) return Response.json({ error: "Resource not found" }, { status: 404 });
    if (resource.status !== "ready") return Response.json({ error: "This resource is not ready" }, { status: 409 });
    if (!resource.topic_id) return Response.json({ error: "Assignments require a resource linked to a learning topic" }, { status: 422 });
    
    const requestedConceptId = typeof body.conceptId === "string" ? body.conceptId : null;
    const { data: links, error: linksError } = await supabaseAdmin.from("resource_concepts").select("concept_id,relevance_score").eq("resource_id", resourceId);
    if (linksError || !links?.length) return Response.json({ error: "Analyze this resource's concepts before creating an Assignment" }, { status: 422 });
    
    const link = requestedConceptId ? links.find((item) => item.concept_id === requestedConceptId) : [...links].sort((a, b) => Number(b.relevance_score ?? 0) - Number(a.relevance_score ?? 0))[0];
    if (!link) return Response.json({ error: "Concept not found for this resource" }, { status: 404 });
    
    // For assignments, we fetch all segments, not just the first 40, to give maximum context if possible.
    const [{ data: concept, error: conceptError }, { data: segments, error: segmentsError }] = await Promise.all([
      supabaseAdmin.from("concepts").select("id,name,description").eq("id", link.concept_id).single(),
      supabaseAdmin.from("video_segments").select("id,start_seconds,end_seconds,text").eq("resource_id", resourceId).order("start_seconds"),
    ]);
    if (conceptError || !concept) return Response.json({ error: "Concept not found" }, { status: 404 });
    if (segmentsError || !segments?.length) return Response.json({ error: "This resource has no transcript context" }, { status: 422 });
    
    const topicId = resource.topic_id;
    
    // Check if an assignment (type: 'quiz') already exists for this concept
    const { data: existingAssessments, error: existingError } = await supabaseAdmin.from("assessments").select("*").eq("topic_id", topicId).eq("concept_id", concept.id).eq("type", "quiz");
    if (!existingError && existingAssessments && existingAssessments.length > 0) {
      // Reconstruct the assignments from existing assessments
      const assignments = existingAssessments.map(a => ({
         question: a.question,
         options: Array.isArray(a.options) ? a.options.map(String) : [],
         correctAnswer: a.correct_answer,
         explanation: a.explanation,
         conceptName: concept.name,
         assessmentId: a.id,
      }));
      // Return them along with original shapes to match frontend expectations
      return Response.json({ assessments: existingAssessments, assignments, concept });
    }
    
    // generateAssignment will throw NOT_ENOUGH_CONTENT if transcript is too short
    const assignments = await generateAssignment({ 
      concept, 
      segments: (segments ?? []).map((segment) => ({ 
        id: segment.id as string, 
        startSeconds: Number(segment.start_seconds), 
        endSeconds: Number(segment.end_seconds), 
        text: segment.text as string 
      })), 
      topic: topicId 
    });
    
    const { data: assessments, error: assessmentsError } = await supabaseAdmin.from("assessments").insert(
      assignments.map((qc) => ({ 
        topic_id: topicId, 
        concept_id: concept.id, 
        type: "quiz", 
        question: qc.question, 
        options: qc.options, 
        correct_answer: qc.correctAnswer, 
        explanation: qc.explanation 
      }))
    ).select();
    
    if (assessmentsError || !assessments || assessments.length === 0) throw new Error(assessmentsError?.message ?? "Could not save assessments");
    await recordLearningInteraction({ userId: user.id, topicId, conceptId: concept.id, resourceId, interactionType: "QUIZ", metadata: { assessment_ids: assessments.map(a => a.id), event: "generated_assignment" } });
    
    return Response.json({ assessments, assignments, concept });
  } catch (error) {
    console.error("POST /api/resources/[resourceId]/assignment failed", error);
    if (error instanceof Error && error.message === "NOT_ENOUGH_CONTENT") {
       return Response.json({ error: "Not enough content in the video transcript to create a meaningful assignment." }, { status: 422 });
    }
    return Response.json({ error: error instanceof Error ? error.message : "Could not create Assignment" }, { status: 400 });
  }
}
