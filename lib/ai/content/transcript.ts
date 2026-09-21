import "server-only";
import { YoutubeTranscript } from "youtube-transcript";

export type TranscriptSegment = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

type ProviderSegment = { start?: number; duration?: number; offset?: number; text?: string };

export function normalizeTranscript(segments: ProviderSegment[]): TranscriptSegment[] {
  return segments
    .map((segment) => {
      const startSeconds = Number(segment.start ?? segment.offset ?? 0);
      const duration = Number(segment.duration ?? 0);
      return { startSeconds, endSeconds: Math.max(startSeconds, startSeconds + duration), text: String(segment.text ?? "").replace(/\s+/g, " ").trim() };
    })
    .filter((segment) => segment.text && Number.isFinite(segment.startSeconds) && Number.isFinite(segment.endSeconds))
    .sort((left, right) => left.startSeconds - right.startSeconds);
}

export async function getYouTubeTranscript(videoId: string): Promise<TranscriptSegment[]> {
  try {
    const captions = await YoutubeTranscript.fetchTranscript(videoId);
    const normalized = normalizeTranscript(captions);
    if (!normalized.length) throw new Error("TRANSCRIPT_UNAVAILABLE");
    return normalized;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("TRANSCRIPT_")) throw error;
    throw new Error("TRANSCRIPT_UNAVAILABLE");
  }
}
