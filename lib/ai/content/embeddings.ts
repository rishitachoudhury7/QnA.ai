import "server-only";

export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
export const GEMINI_EMBEDDING_DIMENSIONS = 768;

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: `models/${GEMINI_EMBEDDING_MODEL}`, content: { parts: [{ text }] }, outputDimensionality: GEMINI_EMBEDDING_DIMENSIONS }),
  });
  if (!response.ok) throw new Error("EMBEDDING_ERROR");
  const payload = await response.json() as { embedding?: { values?: number[] } };
  if (!payload.embedding?.values?.length) throw new Error("EMBEDDING_ERROR");
  return payload.embedding.values;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) embeddings.push(await generateEmbedding(text));
  return embeddings;
}
