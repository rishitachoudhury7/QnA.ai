import "server-only";
import { generateEmbedding } from "./embeddings";
import { supabaseAdmin } from "@/lib/supabase";

type SegmentRow = { id: string; start_seconds: number; end_seconds: number; text: string; similarity?: number };
export type RetrievedSegment = { id: string; startSeconds: number; endSeconds: number; text: string; similarity: number; temporalScore: number; hybridScore: number };

function temporalScore(segment: SegmentRow, currentSeconds: number, windowSeconds: number): number {
  const midpoint = (Number(segment.start_seconds) + Number(segment.end_seconds)) / 2;
  const distance = Math.abs(midpoint - currentSeconds);
  return Math.max(0, 1 - distance / Math.max(windowSeconds, 1));
}

export async function retrieveTutorContext(resourceId: string, question: string, currentSeconds: number, options?: { windowSeconds?: number; limit?: number }): Promise<RetrievedSegment[]> {
  const windowSeconds = options?.windowSeconds ?? 90;
  const limit = options?.limit ?? 6;
  const [temporalResult, embedding] = await Promise.all([
    supabaseAdmin.from("video_segments").select("id,start_seconds,end_seconds,text").eq("resource_id", resourceId).lte("start_seconds", currentSeconds + windowSeconds).gte("end_seconds", Math.max(0, currentSeconds - windowSeconds)).order("start_seconds").limit(limit * 2),
    generateEmbedding(question),
  ]);
  if (temporalResult.error) throw new Error("RETRIEVAL_DATABASE_ERROR");
  const { data: semantic, error: semanticError } = await supabaseAdmin.rpc("match_video_segments", { query_embedding: embedding, match_resource_id: resourceId, match_count: limit * 2, match_threshold: 0.15 });
  if (semanticError) {
    const errorText = `${semanticError.code ?? ""} ${semanticError.message}`;
    if (/match_video_segments|schema cache|PGRST202|42883/i.test(errorText)) {
      console.warn("Semantic tutor retrieval is unavailable; using temporal context only. Apply 003_tutor_retrieval.sql.", { code: semanticError.code });
    } else {
      console.error("Semantic tutor retrieval failed", { code: semanticError.code });
      throw new Error("RETRIEVAL_DATABASE_ERROR");
    }
  }
  const merged = new Map<string, { row: SegmentRow; semanticScore: number; temporal: number }>();
  for (const row of (temporalResult.data ?? []) as SegmentRow[]) merged.set(row.id, { row, semanticScore: 0, temporal: temporalScore(row, currentSeconds, windowSeconds) });
  for (const row of (semantic ?? []) as SegmentRow[]) {
    const existing = merged.get(row.id);
    merged.set(row.id, { row, semanticScore: Number(row.similarity ?? 0), temporal: existing?.temporal ?? temporalScore(row, currentSeconds, windowSeconds) });
  }
  return [...merged.values()].map(({ row, semanticScore, temporal }) => ({ id: row.id, startSeconds: Number(row.start_seconds), endSeconds: Number(row.end_seconds), text: row.text, similarity: semanticScore, temporalScore: temporal, hybridScore: semanticScore * 0.65 + temporal * 0.35 })).sort((left, right) => right.hybridScore - left.hybridScore).slice(0, limit);
}
