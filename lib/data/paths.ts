import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import type { LearningPath, PathModule, Topic } from "@/types/database";
import type { GeneratedLearningPath } from "@/lib/ai/path/schemas";

export type LearningPathWithStructure = LearningPath & { modules: Array<PathModule & { topics: Topic[] }> };

export async function createGeneratedPath(goalId: string, curriculum: GeneratedLearningPath): Promise<LearningPathWithStructure> {
  const { data: latest, error: latestError } = await supabaseAdmin
    .from("learning_paths")
    .select("version")
    .eq("goal_id", goalId)
    .order("version", { ascending: false })
    .limit(1);
  if (latestError) throw new Error(latestError.message);

  const version = ((latest?.[0]?.version as number | undefined) ?? 0) + 1;
  const { data: path, error: pathError } = await supabaseAdmin
    .from("learning_paths")
    .insert({ goal_id: goalId, title: curriculum.title, description: curriculum.description, status: "active", version })
    .select()
    .single();
  if (pathError || !path) throw new Error(pathError?.message ?? "Could not create learning path");

  try {
    const { data: modules, error: modulesError } = await supabaseAdmin
      .from("path_modules")
      .insert(curriculum.modules.map((item) => ({ learning_path_id: path.id, title: item.title, description: item.description, position: item.position })))
      .select();
    if (modulesError || !modules) throw new Error(modulesError?.message ?? "Could not create path modules");

    const moduleByPosition = new Map(modules.map((item) => [item.position as number, item]));
    const topicRows = curriculum.modules.flatMap((item) => item.topics.map((topic) => ({
      module_id: moduleByPosition.get(item.position)?.id,
      title: topic.title,
      description: topic.description,
      position: topic.position,
    })));
    if (topicRows.some((item) => !item.module_id)) throw new Error("Could not map generated modules");
    const completeTopicRows = topicRows as Array<{ module_id: string; title: string; description: string; position: number }>;
    const { data: topics, error: topicsError } = await supabaseAdmin.from("topics").insert(completeTopicRows).select();
    if (topicsError || !topics) throw new Error(topicsError?.message ?? "Could not create topics");

    return { ...(path as LearningPath), modules: modules.map((module) => ({ ...(module as PathModule), topics: topics.filter((topic) => topic.module_id === module.id) as Topic[] })) };
  } catch (error) {
    await supabaseAdmin.from("learning_paths").delete().eq("id", path.id);
    throw error;
  }
}

export async function listPaths(userId: string) {
  const { data: goals, error: goalsError } = await supabaseAdmin.from("learning_goals").select("id").eq("user_id", userId);
  if (goalsError) throw new Error(goalsError.message);
  const goalIds = (goals ?? []).map((goal) => goal.id as string);
  if (!goalIds.length) return [] as LearningPathWithStructure[];
  const { data: paths, error: pathsError } = await supabaseAdmin.from("learning_paths").select("*").in("goal_id", goalIds).order("version", { ascending: false });
  if (pathsError) throw new Error(pathsError.message);
  const result: LearningPathWithStructure[] = [];
  for (const path of paths ?? []) {
    const { data: modules, error: modulesError } = await supabaseAdmin.from("path_modules").select("*").eq("learning_path_id", path.id).order("position");
    if (modulesError) throw new Error(modulesError.message);
    const moduleResult: Array<PathModule & { topics: Topic[] }> = [];
    for (const module of modules ?? []) {
      const { data: topics, error: topicsError } = await supabaseAdmin.from("topics").select("*").eq("module_id", module.id).order("position");
      if (topicsError) throw new Error(topicsError.message);
      moduleResult.push({ ...(module as PathModule), topics: (topics ?? []) as Topic[] });
    }
    result.push({ ...(path as LearningPath), modules: moduleResult });
  }
  return result;
}