import { auth } from "@clerk/nextjs/server";
import { ensureCurrentUser } from "@/lib/data/users";
import { supabaseAdmin } from "@/lib/supabase";
import type { Resource } from "@/types/database";

export async function GET(_request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const user = await ensureCurrentUser();
    const { data, error } = await supabaseAdmin.from("resources").select("id,status,metadata").eq("id", (await params).resourceId).eq("user_id", user.id).single();
    if (error || !data) return Response.json({ error: "Resource not found" }, { status: 404 });
    const resource = data as Pick<Resource, "status" | "metadata">;
    const metadata = resource.metadata && typeof resource.metadata === "object" && !Array.isArray(resource.metadata) ? resource.metadata as Record<string, unknown> : {};
    return Response.json({ status: resource.status, error: resource.status === "failed" && typeof metadata.ingestionError === "string" ? metadata.ingestionError : undefined });
  } catch {
    return Response.json({ error: "Could not load resource status" }, { status: 500 });
  }
}
