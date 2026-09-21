import "server-only";
import { createTemporalChunks, createSemanticChunks } from "./chunking";
import { generateEmbeddings } from "./embeddings";
import { getYouTubeTranscript } from "./transcript";
import { extractYouTubeVideoId, getYouTubeMetadata } from "./youtube";
import { supabaseAdmin } from "@/lib/supabase";
import type { Resource } from "@/types/database";

function safeMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Content preparation failed";
  if (/INVALID_YOUTUBE_URL|VIDEO_NOT_FOUND|YOUTUBE_API_ERROR|TRANSCRIPT_UNAVAILABLE|EMBEDDING_ERROR/.test(error.message)) return error.message;
  if (error.message.includes("configured")) return "Content service is not configured";
  return "Content preparation failed";
}

function categoryFor(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message === "INVALID_YOUTUBE_URL") return "INVALID_YOUTUBE_URL";
  if (message === "VIDEO_NOT_FOUND") return "VIDEO_NOT_FOUND";
  if (message === "YOUTUBE_API_ERROR") return "YOUTUBE_API_ERROR";
  if (message === "TRANSCRIPT_UNAVAILABLE") return "TRANSCRIPT_UNAVAILABLE";
  if (message === "EMBEDDING_ERROR") return "EMBEDDING_ERROR";
  return "DATABASE_ERROR";
}

export async function processYouTubeResource(resourceId: string): Promise<void> {
  const { data: resource, error: loadError } = await supabaseAdmin.from("resources").select("*").eq("id", resourceId).single();
  if (loadError || !resource) throw new Error("Resource not found");
  const typedResource = resource as Resource;
  if (typedResource.type !== "youtube") throw new Error("Resource is not a YouTube video");

  try {
    await supabaseAdmin.from("resources").update({ status: "processing" }).eq("id", resourceId);
    const videoId = extractYouTubeVideoId(typedResource.url ?? "");
    const metadata = await getYouTubeMetadata(videoId);
    const transcript = await getYouTubeTranscript(videoId);
    const temporalChunks = createTemporalChunks(transcript);
    const chunks = createSemanticChunks(temporalChunks);
    if (!chunks.length) throw new Error("TRANSCRIPT_UNAVAILABLE");
    const embeddings = await generateEmbeddings(chunks.map((chunk) => chunk.text));

    const { error: deleteError } = await supabaseAdmin.from("video_segments").delete().eq("resource_id", resourceId);
    if (deleteError) {
      console.error("Could not clear existing video segments", { resourceId, error: deleteError });
      throw new Error("DATABASE_ERROR");
    }
    const { error: insertError } = await supabaseAdmin.from("video_segments").insert(chunks.map((chunk, index) => ({
      resource_id: resourceId,
      start_seconds: chunk.startSeconds,
      end_seconds: chunk.endSeconds,
      text: chunk.text,
      embedding: embeddings[index],
    })));
    if (insertError) {
      console.error("Could not save embedded video segments", { resourceId, error: insertError });
      throw new Error("DATABASE_ERROR");
    }

    const currentMetadata = typedResource.metadata && typeof typedResource.metadata === "object" && !Array.isArray(typedResource.metadata) ? typedResource.metadata as Record<string, unknown> : {};
    await supabaseAdmin.from("resources").update({
      title: metadata.title,
      thumbnail_url: metadata.thumbnail,
      duration_seconds: metadata.duration,
      status: "ready",
      metadata: { ...currentMetadata, videoId, channelTitle: metadata.channelTitle, publishedAt: metadata.publishedAt, transcriptSegments: transcript.length, contentChunks: chunks.length },
    }).eq("id", resourceId);
  } catch (error) {
    const category = categoryFor(error);
    console.error(`YouTube ingestion failed for ${resourceId}`, { category, error });
    const currentMetadata = typedResource.metadata && typeof typedResource.metadata === "object" && !Array.isArray(typedResource.metadata) ? typedResource.metadata as Record<string, unknown> : {};
    await supabaseAdmin.from("resources").update({ status: "failed", metadata: { ...currentMetadata, ingestionError: safeMessage(error), ingestionErrorCategory: category } }).eq("id", resourceId);
    throw error;
  }
}
