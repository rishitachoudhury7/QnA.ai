import { auth } from "@clerk/nextjs/server";
import { getGoal, updateGoal } from "@/lib/data/goals";
import { createGeneratedPath } from "@/lib/data/paths";
import { generateLearningPath } from "@/lib/ai/path/generator";
import { ensureCurrentUser } from "@/lib/data/users";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const user = await ensureCurrentUser();
    const goal = await getGoal((await params).id, user.id);
    const curriculum = await generateLearningPath({ title: goal.title, description: goal.description, skillLevel: goal.skill_level, objective: goal.objective });
    const path = await createGeneratedPath(goal.id, curriculum);
    return Response.json({ path }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not generate learning path" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const user = await ensureCurrentUser();
    const goal = await updateGoal((await params).id, {
      title: String(body.title ?? "").trim(),
      skill_level: body.level ?? null,
      objective: body.objective ?? null,
    }, user.id);
    return Response.json(goal);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not update goal" }, { status: 400 });
  }
}