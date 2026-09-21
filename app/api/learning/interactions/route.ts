import { auth } from "@clerk/nextjs/server";
import { recordLearningInteraction } from "@/lib/ai/learner/interactions";
import { updateConceptMastery } from "@/lib/ai/learner/mastery";
import { ensureCurrentUser } from "@/lib/data/users";
import type { Json } from "@/types/database";

const interactionTypes = new Set(["VIDEO_WATCH", "QUESTION", "QUIZ", "TEACH_BACK", "REVISION", "RESOURCE_OPENED"]);

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as { interactionType?: unknown; topicId?: unknown; conceptId?: unknown; resourceId?: unknown; metadata?: unknown };
    if (typeof body.interactionType !== "string" || !interactionTypes.has(body.interactionType)) return Response.json({ error: "Invalid interaction type" }, { status: 400 });
    const user = await ensureCurrentUser();
    const conceptId = typeof body.conceptId === "string" ? body.conceptId : null;
    const interaction = await recordLearningInteraction({ userId: user.id, interactionType: body.interactionType as Parameters<typeof recordLearningInteraction>[0]["interactionType"], topicId: typeof body.topicId === "string" ? body.topicId : null, conceptId, resourceId: typeof body.resourceId === "string" ? body.resourceId : null, metadata: body.metadata && typeof body.metadata === "object" ? body.metadata as Json : {} });
    const mastery = body.interactionType === "VIDEO_WATCH" && conceptId ? await updateConceptMastery({ userId: user.id, conceptId, evidenceType: "observation" }) : null;
    return Response.json({ interaction, mastery }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not record interaction" }, { status: 400 });
  }
}