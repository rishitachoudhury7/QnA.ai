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
    const body = await request.json() as { answers?: Array<{ assessmentId: string, answer: string }>; conceptId?: string };
    
    if (!body.answers || !Array.isArray(body.answers) || body.answers.length === 0) {
      return Response.json({ error: "Answers array is required" }, { status: 400 });
    }
    const conceptId = body.conceptId;

    const { data: resource, error: resourceError } = await supabaseAdmin.from("resources").select("id,topic_id").eq("id", resourceId).eq("user_id", user.id).single();
    if (resourceError || !resource?.topic_id) return Response.json({ error: "Resource not found" }, { status: 404 });
    
    const assessmentIds = body.answers.map(a => a.assessmentId);
    const { data: assessments, error: assessmentError } = await supabaseAdmin.from("assessments")
      .select("*")
      .in("id", assessmentIds)
      .eq("topic_id", resource.topic_id)
      .eq("type", "quiz");
      
    if (assessmentError || !assessments || assessments.length !== assessmentIds.length) {
       return Response.json({ error: "Some assessments were not found or invalid" }, { status: 404 });
    }
    
    let correctCount = 0;
    const attemptInserts = [];
    
    for (const answerObj of body.answers) {
       const assessment = assessments.find(a => a.id === answerObj.assessmentId);
       if (!assessment) continue;
       
       const options = Array.isArray(assessment.options) ? assessment.options.map(String) : [];
       const answer = String(answerObj.answer).trim();
       if (!options.includes(answer)) return Response.json({ error: "Answer must be one of the supplied options for an assessment" }, { status: 400 });
       
       const isCorrect = answer === assessment.correct_answer;
       if (isCorrect) correctCount++;
       
       attemptInserts.push({
         assessment_id: assessment.id,
         user_id: user.id,
         answer: answer,
         is_correct: isCorrect,
         score: isCorrect ? 100 : 0,
         feedback: assessment.explanation
       });
    }
    
    const { data: attempts, error: attemptsError } = await supabaseAdmin.from("assessment_attempts").insert(attemptInserts).select();
    if (attemptsError || !attempts) throw new Error(attemptsError?.message ?? "Could not save assessment attempts");
    
    const score = Math.round((correctCount / assessments.length) * 100);
    const isPerfect = score === 100;
    
    let mastery;
    if (conceptId) {
      mastery = await updateConceptMastery({ userId: user.id, conceptId, evidenceType: "assessment", score });
      if (isPerfect) {
         const { data, error } = await supabaseAdmin.from("student_concept_mastery")
           .update({ mastery_score: 100 })
           .eq("user_id", user.id)
           .eq("concept_id", conceptId)
           .select()
           .single();
         if (!error && data) {
           mastery = data;
         }
      }
    }
    
    await recordLearningInteraction({ 
      userId: user.id, 
      topicId: resource.topic_id, 
      conceptId: conceptId ?? null, 
      resourceId, 
      interactionType: "QUIZ", 
      metadata: { 
        assessment_ids: assessmentIds, 
        event: "submitted_assignment", 
        score,
        is_perfect: isPerfect
      } 
    });
    
    return Response.json({ isCorrect: isPerfect, score, mastery });
  } catch (error) {
    console.error("POST /api/resources/[resourceId]/assignment/attempt failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Could not submit Assignment" }, { status: 400 });
  }
}
