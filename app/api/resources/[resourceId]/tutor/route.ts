import { auth } from "@clerk/nextjs/server";
import { answerTutorQuestion } from "@/lib/ai/content/tutor";
import { retrieveTutorContext } from "@/lib/ai/content/retrieval";
import { ensureCurrentUser } from "@/lib/data/users";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const user = await ensureCurrentUser();
    const resourceId = (await params).resourceId;
    const body = await request.json() as { question?: unknown; currentSeconds?: unknown };
    const question = String(body.question ?? "").trim();
    const currentSeconds = Number(body.currentSeconds ?? 0);
    if (!question) return Response.json({ error: "A question is required" }, { status: 400 });
    if (!Number.isFinite(currentSeconds) || currentSeconds < 0) return Response.json({ error: "Invalid playback time" }, { status: 400 });
    const { data: resource, error: resourceError } = await supabaseAdmin.from("resources").select("id,status,type").eq("id", resourceId).eq("user_id", user.id).single();
    if (resourceError || !resource) return Response.json({ error: "Resource not found" }, { status: 404 });
    if (resource.type !== "youtube") return Response.json({ error: "Tutor context is only available for YouTube resources" }, { status: 400 });
    if (resource.status !== "ready") return Response.json({ error: "This resource is not ready" }, { status: 409 });
    const segments = await retrieveTutorContext(resourceId, question, currentSeconds);
    const answer = await answerTutorQuestion(question, currentSeconds, segments);
    return Response.json({ ...answer, context: segments.map((segment) => ({ id: segment.id, startSeconds: segment.startSeconds, endSeconds: segment.endSeconds, similarity: segment.similarity, hybridScore: segment.hybridScore })) });
  } catch (error) {
    console.error("POST /api/resources/[resourceId]/tutor failed", error);
    const message = error instanceof Error && ["NO_TUTOR_CONTEXT", "RETRIEVAL_DATABASE_ERROR", "TUTOR_MODEL_UNAVAILABLE"].includes(error.message) ? error.message : "Could not answer from this video";
    return Response.json({ error: message }, { status: 400 });
  }
}
