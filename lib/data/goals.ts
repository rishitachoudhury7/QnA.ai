import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import type { LearningGoal, LearningGoalInsert } from "@/types/database";

export async function listGoals(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("learning_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as LearningGoal[];
}

export async function createGoal(input: Omit<LearningGoalInsert, "user_id">, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("learning_goals")
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as LearningGoal;
}

export async function updateGoal(id: string, input: Partial<Omit<LearningGoalInsert, "user_id">>, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("learning_goals")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as LearningGoal;
}