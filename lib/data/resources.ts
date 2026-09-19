import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import type { Resource, ResourceInsert } from "@/types/database";

export async function listResources(userId: string, topicId?: string) {
  let query = supabaseAdmin.from("resources").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (topicId) query = query.eq("topic_id", topicId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Resource[];
}

export async function createResource(input: Omit<ResourceInsert, "user_id">, userId: string) {
  if (input.topic_id) {
    const { data: topic, error: topicError } = await supabaseAdmin
      .from("topics")
      .select("module_id")
      .eq("id", input.topic_id)
      .single();
    if (topicError || !topic) throw new Error("Topic not found");

    const { data: module, error: moduleError } = await supabaseAdmin
      .from("path_modules")
      .select("learning_path_id")
      .eq("id", topic.module_id)
      .single();
    if (moduleError || !module) throw new Error("Topic not found");

    const { data: path, error: pathError } = await supabaseAdmin
      .from("learning_paths")
      .select("goal_id")
      .eq("id", module.learning_path_id)
      .single();
    if (pathError || !path) throw new Error("Topic not found");

    const { data: goal, error: goalError } = await supabaseAdmin
      .from("learning_goals")
      .select("user_id")
      .eq("id", path.goal_id)
      .eq("user_id", userId)
      .single();
    if (goalError || !goal) throw new Error("You cannot attach a resource to this topic");
  }

  const { data, error } = await supabaseAdmin
    .from("resources")
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Resource;
}