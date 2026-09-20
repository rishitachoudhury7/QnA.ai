import type { TranscriptSegment } from "./transcript";

export const CONTENT_CHUNK_CONFIG = {
  targetSeconds: 45,
  maxCharacters: 1400,
  overlapSeconds: 8,
};

export type ContentChunk = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export function createTemporalChunks(transcript: TranscriptSegment[], targetSeconds = CONTENT_CHUNK_CONFIG.targetSeconds): ContentChunk[] {
  const chunks: ContentChunk[] = [];
  let current: TranscriptSegment[] = [];
  let start = 0;
  for (const segment of transcript) {
    if (!current.length) start = segment.startSeconds;
    const projectedEnd = segment.endSeconds;
    const projectedText = [...current, segment].map((item) => item.text).join(" ");
    if (current.length && (projectedEnd - start > targetSeconds || projectedText.length > CONTENT_CHUNK_CONFIG.maxCharacters)) {
      chunks.push({ startSeconds: start, endSeconds: current[current.length - 1].endSeconds, text: current.map((item) => item.text).join(" ") });
      const overlapStart = Math.max(start, current[current.length - 1].endSeconds - CONTENT_CHUNK_CONFIG.overlapSeconds);
      current = current.filter((item) => item.endSeconds > overlapStart);
      start = current[0]?.startSeconds ?? segment.startSeconds;
    }
    current.push(segment);
  }
  if (current.length) chunks.push({ startSeconds: start, endSeconds: current[current.length - 1].endSeconds, text: current.map((item) => item.text).join(" ") });
  return chunks;
}

export function createSemanticChunks(temporalChunks: ContentChunk[]): ContentChunk[] {
  const result: ContentChunk[] = [];
  let current: ContentChunk | null = null;
  for (const chunk of temporalChunks) {
    if (!current) {
      current = { ...chunk };
      continue;
    }
    const gap = chunk.startSeconds - current.endSeconds;
    const endsSentence = /[.!?]["')\]]?$/.test(current.text);
    const startsNewThought = /^[A-Z][^:]{0,50}:/.test(chunk.text);
    if (endsSentence && (gap > 3 || startsNewThought || current.text.length > 900)) {
      result.push(current);
      current = { ...chunk };
    } else {
      current = { startSeconds: current.startSeconds, endSeconds: chunk.endSeconds, text: `${current.text} ${chunk.text}`.trim() };
    }
  }
  if (current) result.push(current);
  return result;
}
