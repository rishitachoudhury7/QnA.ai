import { auth } from "@clerk/nextjs/server";
import { ensureCurrentUser } from "@/lib/data/users";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const user = await ensureCurrentUser();
    const resourceId = (await params).resourceId;
    const { data, error } = await supabaseAdmin.from("resources").select("id,topic_id,type,title,url,thumbnail_url,duration_seconds,status,metadata").eq("id", resourceId).eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (data) return Response.json({ kind: "resource", ...data });

    const { data: topic, error: topicError } = await supabaseAdmin.from("topics").select("id,title,description,module_id").eq("id", resourceId).maybeSingle();
    if (topicError || !topic) return Response.json({ error: "Resource or topic not found" }, { status: 404 });
    const { data: module } = await supabaseAdmin.from("path_modules").select("learning_path_id").eq("id", topic.module_id).maybeSingle();
    const { data: path } = module ? await supabaseAdmin.from("learning_paths").select("goal_id").eq("id", module.learning_path_id).maybeSingle() : { data: null };
    const { data: goal } = path ? await supabaseAdmin.from("learning_goals").select("id").eq("id", path.goal_id).eq("user_id", user.id).maybeSingle() : { data: null };
    if (!goal) return Response.json({ error: "Resource or topic not found" }, { status: 404 });
    return Response.json({ kind: "topic", topic: { id: topic.id, title: topic.title, description: topic.description } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load resource" }, { status: 500 });
  }
}