import "server-only";

export type YouTubeMetadata = {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string | null;
  duration: number | null;
  channelTitle: string | null;
  publishedAt: string | null;
};

export function extractYouTubeVideoId(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("INVALID_YOUTUBE_URL");
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  let videoId: string | null = null;
  if (hostname === "youtu.be") videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  if (hostname === "youtube.com" || hostname === "m.youtube.com") {
    if (url.pathname === "/watch") videoId = url.searchParams.get("v");
    if (url.pathname.startsWith("/embed/")) videoId = url.pathname.split("/")[2] ?? null;
    if (url.pathname.startsWith("/shorts/")) videoId = url.pathname.split("/")[2] ?? null;
  }

  if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error("INVALID_YOUTUBE_URL");
  return videoId;
}

function parseDuration(value: string): number {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

export async function getYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured");
  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${encodeURIComponent(apiKey)}`);
  if (!response.ok) throw new Error("YOUTUBE_API_ERROR");
  const payload = await response.json() as { items?: Array<{ snippet?: { title?: string; description?: string; channelTitle?: string; publishedAt?: string; thumbnails?: { high?: { url?: string }; default?: { url?: string } } }; contentDetails?: { duration?: string } }> };
  const item = payload.items?.[0];
  if (!item?.snippet?.title) throw new Error("VIDEO_NOT_FOUND");
  return {
    videoId,
    title: item.snippet.title,
    description: item.snippet.description ?? "",
    thumbnail: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url ?? null,
    duration: item.contentDetails?.duration ? parseDuration(item.contentDetails.duration) : null,
    channelTitle: item.snippet.channelTitle ?? null,
    publishedAt: item.snippet.publishedAt ?? null,
  };
}
