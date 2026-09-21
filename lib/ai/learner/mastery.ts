import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import type { StudentConceptMastery } from "@/types/database";

export async function updateConceptMastery(input: { userId: string; conceptId: string; evidenceType: "observation" | "assessment" | "explanation"; score?: number }): Promise<StudentConceptMastery> {
  const { data: current, error: readError } = await supabaseAdmin.from("student_concept_mastery").select("*").eq("user_id", input.userId).eq("concept_id", input.conceptId).maybeSingle();
  if (readError) throw new Error(readError.message);
  const score = Math.max(0, Math.min(100, input.score ?? (input.evidenceType === "observation" ? 15 : 0)));
  const weights = { observation: 0.1, assessment: 0.55, explanation: 0.35 };
  const previous = current as StudentConceptMastery | null;
  const mastery = previous ? Math.round((Number(previous.mastery_score) * (1 - weights[input.evidenceType]) + score * weights[input.evidenceType]) * 100) / 100 : score * weights[input.evidenceType];
  const payload = { user_id: input.userId, concept_id: input.conceptId, mastery_score: Math.round(mastery * 100) / 100, confidence_score: Math.min(100, Math.round(((previous ? Number(previous.confidence_score) : 0) + score * weights[input.evidenceType]) * 100) / 100), evidence_count: (previous?.evidence_count ?? 0) + 1, last_assessed_at: input.evidenceType === "observation" ? previous?.last_assessed_at ?? null : new Date().toISOString() };
  const { data, error } = await supabaseAdmin.from("student_concept_mastery").upsert(payload, { onConflict: "user_id,concept_id" }).select().single();
  if (error || !data) throw new Error(error?.message ?? "Could not update concept mastery");
  return data as StudentConceptMastery;
}