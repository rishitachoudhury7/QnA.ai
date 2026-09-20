import { after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { processYouTubeResource } from "@/lib/ai/content/ingestion";
import { ensureCurrentUser } from "@/lib/data/users";
import { supabaseAdmin } from "@/lib/supabase";
import type { Resource } from "@/types/database";

export async function POST(_request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const user = await ensureCurrentUser();
    const resourceId = (await params).resourceId;
    const { data, error } = await supabaseAdmin.from("resources").select("*").eq("id", resourceId).eq("user_id", user.id).single();
    if (error || !data) return Response.json({ error: "Resource not found" }, { status: 404 });
    const resource = data as Resource;
    if (resource.type !== "youtube") return Response.json({ error: "Only YouTube resources can be processed" }, { status: 400 });
    if (resource.status === "processing") return Response.json({ status: "processing" }, { status: 202 });
    if (resource.status === "ready") {
      const { count, error: segmentsError } = await supabaseAdmin.from("video_segments").select("id", { count: "exact", head: true }).eq("resource_id", resourceId);
      if (segmentsError) return Response.json({ error: "Could not verify processed transcript" }, { status: 500 });
      if ((count ?? 0) > 0) return Response.json({ status: "ready" });
    }
    const { error: updateError } = await supabaseAdmin.from("resources").update({ status: "processing" }).eq("id", resourceId).eq("user_id", user.id).in("status", ["pending", "failed", "ready"]);
    if (updateError) return Response.json({ error: "Could not start processing" }, { status: 500 });
    after(async () => { await processYouTubeResource(resourceId).catch(() => undefined); });
    return Response.json({ status: "processing" }, { status: 202 });
  } catch {
    return Response.json({ error: "Could not start resource processing" }, { status: 500 });
  }
}
