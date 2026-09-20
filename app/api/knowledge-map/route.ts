import { auth } from "@clerk/nextjs/server";
import { ensureCurrentUser } from "@/lib/data/users";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const user = await ensureCurrentUser();
    const { data: resources, error: resourceError } = await supabaseAdmin.from("resources").select("id").eq("user_id", user.id);
    if (resourceError) throw resourceError;
    const resourceIds = (resources ?? []).map((resource) => resource.id as string);
    if (!resourceIds.length) return Response.json({ concepts: [], relationships: [] });
    const { data: links, error: linksError } = await supabaseAdmin.from("resource_concepts").select("concept_id").in("resource_id", resourceIds);
    if (linksError) throw linksError;
    const conceptIds = [...new Set((links ?? []).map((link) => link.concept_id as string))];
    if (!conceptIds.length) return Response.json({ concepts: [], relationships: [] });
    const [{ data: concepts, error: conceptsError }, { data: relationships, error: relationshipsError }, { data: mastery, error: masteryError }] = await Promise.all([
      supabaseAdmin.from("concepts").select("*").in("id", conceptIds),
      supabaseAdmin.from("concept_relationships").select("*").or(`source_concept_id.in.(${conceptIds.join(",")}),target_concept_id.in.(${conceptIds.join(",")})`),
      supabaseAdmin.from("student_concept_mastery").select("concept_id,mastery_score").eq("user_id", user.id).in("concept_id", conceptIds),
    ]);
    if (conceptsError || relationshipsError || masteryError) throw conceptsError ?? relationshipsError ?? masteryError;
    const masteryByConcept = new Map((mastery ?? []).map((item) => [item.concept_id as string, Number(item.mastery_score)]));
    return Response.json({ concepts: (concepts ?? []).map((concept) => ({ ...concept, mastery: masteryByConcept.get(concept.id as string) ?? 0 })), relationships: relationships ?? [] });
  } catch (error) {
    console.error("GET /api/knowledge-map failed", error);
    return Response.json({ error: "Could not load knowledge map" }, { status: 500 });
  }
}
