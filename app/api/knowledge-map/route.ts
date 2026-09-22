import { auth } from "@clerk/nextjs/server";
import { ensureCurrentUser } from "@/lib/data/users";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const user = await ensureCurrentUser();
    const { data: resources, error: resourceError } = await supabaseAdmin.from("resources").select("id, topic_id").eq("user_id", user.id);
    if (resourceError) throw resourceError;
    const resourceIds = (resources ?? []).map((resource) => resource.id as string);
    if (!resourceIds.length) return Response.json({ modules: [], concepts: [], relationships: [] });
    const topicIds = [...new Set((resources ?? []).map(r => r.topic_id).filter(Boolean))] as string[];
    const { data: topics, error: topicsError } = await supabaseAdmin.from("topics").select("id, module_id").in("id", topicIds);
    if (topicsError) throw topicsError;
    const moduleIds = [...new Set((topics ?? []).map(t => t.module_id).filter(Boolean))] as string[];
    const { data: modules, error: modulesError } = await supabaseAdmin.from("path_modules").select("id, title, position").in("id", moduleIds).order("position", { ascending: true });
    if (modulesError) throw modulesError;
    const topicIdByResource = new Map((resources ?? []).map(r => [r.id as string, r.topic_id as string]));
    const moduleIdByTopic = new Map((topics ?? []).map(t => [t.id as string, t.module_id as string]));
    const { data: links, error: linksError } = await supabaseAdmin.from("resource_concepts").select("concept_id, resource_id").in("resource_id", resourceIds);
    if (linksError) throw linksError;
    const conceptIds = [...new Set((links ?? []).map((link) => link.concept_id as string))];
    if (!conceptIds.length) return Response.json({ modules: (modules ?? []), concepts: [], relationships: [] });
    const [{ data: concepts, error: conceptsError }, { data: relationships, error: relationshipsError }, { data: mastery, error: masteryError }] = await Promise.all([
      supabaseAdmin.from("concepts").select("*").in("id", conceptIds),
      supabaseAdmin.from("concept_relationships").select("*").or(`source_concept_id.in.(${conceptIds.join(",")}),target_concept_id.in.(${conceptIds.join(",")})`),
      supabaseAdmin.from("student_concept_mastery").select("concept_id,mastery_score").eq("user_id", user.id).in("concept_id", conceptIds),
    ]);
    if (conceptsError || relationshipsError || masteryError) throw conceptsError ?? relationshipsError ?? masteryError;
    const masteryByConcept = new Map((mastery ?? []).map((item) => [item.concept_id as string, Number(item.mastery_score)]));
    const modulesByConceptId = new Map<string, Set<string>>();
    for (const link of (links ?? [])) {
      const topicId = topicIdByResource.get(link.resource_id as string);
      const moduleId = topicId ? moduleIdByTopic.get(topicId) : null;
      if (moduleId) {
        if (!modulesByConceptId.has(link.concept_id as string)) modulesByConceptId.set(link.concept_id as string, new Set());
        modulesByConceptId.get(link.concept_id as string)!.add(moduleId);
      }
    }
    const modulesWithMastery = (modules ?? []).map(module => {
      let totalMastery = 0;
      let conceptCount = 0;
      for (const [conceptId, conceptModules] of modulesByConceptId.entries()) {
        if (conceptModules.has(module.id as string)) {
          totalMastery += masteryByConcept.get(conceptId) ?? 0;
          conceptCount++;
        }
      }
      return { id: module.id as string, title: module.title as string, position: Number(module.position), mastery: conceptCount > 0 ? Math.round(totalMastery / conceptCount) : 0 };
    });
    console.info("Knowledge Map API graph counts", { moduleCount: modules?.length ?? 0, conceptCount: concepts?.length ?? 0, relationshipCount: relationships?.length ?? 0 });
    return Response.json({
      modules: modulesWithMastery,
      concepts: (concepts ?? []).map((concept) => ({ ...concept, mastery: masteryByConcept.get(concept.id as string) ?? 0, moduleIds: Array.from(modulesByConceptId.get(concept.id as string) ?? []) })),
      relationships: relationships ?? []
    });
  } catch (error) {
    console.error("GET /api/knowledge-map failed", error);
    return Response.json({ error: "Could not load knowledge map" }, { status: 500 });
  }
}
