import { auth } from "@clerk/nextjs/server";
import { updateGoal } from "@/lib/data/goals";
import { ensureCurrentUser } from "@/lib/data/users";

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