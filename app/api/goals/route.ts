import { auth } from "@clerk/nextjs/server";
import { createGoal, listGoals } from "@/lib/data/goals";
import { ensureCurrentUser } from "@/lib/data/users";
import { createGeneratedPath } from "@/lib/data/paths";
import { generateLearningPath } from "@/lib/ai/path/generator";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Please sign in before accessing goals.", code: "AUTH_REQUIRED" }, { status: 401 });
  try {
    const user = await ensureCurrentUser();
    return Response.json(await listGoals(user.id));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load goals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Please sign in before creating a goal.", code: "AUTH_REQUIRED" }, { status: 401 });
  
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    if (!title) return Response.json({ error: "A goal title is required.", code: "INVALID_GOAL" }, { status: 400 });



    const user = await ensureCurrentUser();
    const goal = await createGoal({ title, skill_level: body.level ?? null, objective: body.objective ?? null }, user.id);
    try {
      const curriculum = await generateLearningPath({ title: goal.title, description: goal.description, skillLevel: goal.skill_level, objective: goal.objective });
      const path = await createGeneratedPath(goal.id, curriculum);
      return Response.json({ goal, path }, { status: 201 });
    } catch (error) {
      return Response.json({ goal, generationError: error instanceof Error ? error.message : "Could not generate learning path" }, { status: 201 });
    }
  } catch (error) {
    console.error("POST /api/goals failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Could not create goal", code: "GOAL_CREATE_FAILED" }, { status: 500 });
  }
}