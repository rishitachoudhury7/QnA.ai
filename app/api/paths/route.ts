import { auth } from "@clerk/nextjs/server";
import { listPaths } from "@/lib/data/paths";
import { ensureCurrentUser } from "@/lib/data/users";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const user = await ensureCurrentUser();
    return Response.json(await listPaths(user.id));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load paths" }, { status: 500 });
  }
}