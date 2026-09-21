import { auth } from "@clerk/nextjs/server";
import { processResourceKnowledge } from "@/lib/ai/content/knowledge";
import { ensureCurrentUser } from "@/lib/data/users";
import { supabaseAdmin } from "@/lib/supabase";
import type { Resource } from "@/types/database";

export async function POST(_request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const resourceId = (await params).resourceId;
  try {
    const user = await ensureCurrentUser();
    const { data, error } = await supabaseAdmin.from("resources").select("*").eq("id", resourceId).eq("user_id", user.id).single();
    if (error || !data) return Response.json({ error: "Resource not found" }, { status: 404 });
    if ((data as Resource).type !== "youtube") return Response.json({ error: "Only YouTube resources can be analyzed" }, { status: 400 });
    const summary = await processResourceKnowledge(resourceId);
    return Response.json(summary);
  } catch (error) {
    console.error("POST /api/resources/[resourceId]/concepts failed", error);
    const owner = await ensureCurrentUser().catch(() => null);
    if (owner) {
      const { data: resource } = await supabaseAdmin.from("resources").select("metadata").eq("id", resourceId).eq("user_id", owner.id).single();
      const currentMetadata = resource?.metadata && typeof resource.metadata === "object" && !Array.isArray(resource.metadata) ? resource.metadata as Record<string, unknown> : {};
      if (resource) await supabaseAdmin.from("resources").update({ metadata: { ...currentMetadata, knowledgeStatus: "failed", knowledgeError: "Concept extraction failed" } }).eq("id", resourceId).eq("user_id", owner.id);
    }
    const message = error instanceof Error && error.message === "EMPTY_SEGMENTS"
      ? "This resource has no processed transcript segments. Reprocess the YouTube resource before analyzing concepts."
      : error instanceof Error && ["RESOURCE_NOT_READY", "RESOURCE_NOT_FOUND"].includes(error.message)
        ? error.message
        : "Could not analyze resource concepts";
    return Response.json({ error: message }, { status: error instanceof Error && error.message === "EMPTY_SEGMENTS" ? 422 : 400 });
  }
}
