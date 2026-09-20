import { after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { processYouTubeResource } from "@/lib/ai/content/ingestion";
import { createResource, listResources } from "@/lib/data/resources";
import { ensureCurrentUser } from "@/lib/data/users";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const user = await ensureCurrentUser();
    const topicId = new URL(request.url).searchParams.get("topicId") ?? undefined;
    return Response.json(await listResources(user.id, topicId));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load resources" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const user = await ensureCurrentUser();
    const resource = await createResource({
      topic_id: typeof body.topicId === "string" && /^[0-9a-f-]{36}$/i.test(body.topicId) ? body.topicId : null,
      type: body.type,
      title: String(body.title ?? "").trim(),
      url: body.url ?? null,
      duration_seconds: typeof body.durationSeconds === "number" ? body.durationSeconds : null,
      status: body.type === "youtube" ? "processing" : body.status ?? "pending",
      metadata: body.metadata ?? {},
    }, user.id);
    if (resource.type === "youtube") {
      after(async () => { await processYouTubeResource(resource.id).catch(() => undefined); });
    }
    return Response.json(resource, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not create resource" }, { status: 400 });
  }
}