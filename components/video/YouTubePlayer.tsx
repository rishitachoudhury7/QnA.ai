"use client";

import { useEffect, useRef, useState } from "react";

export type YouTubePlayerProps = {
  url: string;
  currentSeconds: number;
  onTimeChange: (seconds: number) => void;
  onSeekReady?: (seek: (seconds: number) => void) => void;
};

type YouTubePlayerInstance = { getCurrentTime: () => number; seekTo: (seconds: number, allowSeekAhead: boolean) => void; playVideo: () => void; pauseVideo: () => void; destroy: () => void };
type YouTubeNamespace = { Player: new (element: HTMLElement, options: { videoId: string; playerVars?: Record<string, number>; events?: { onReady?: (event: { target: YouTubePlayerInstance }) => void } }) => YouTubePlayerInstance };

declare global { interface Window { YT?: YouTubeNamespace; onYouTubeIframeAPIReady?: () => void; } }

function videoIdFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2] ?? null;
    }
  } catch { return null; }
  return null;
}

export function YouTubePlayer({ url, onTimeChange, onSeekReady }: YouTubePlayerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const [isReady, setIsReady] = useState(false);
  const videoId = videoIdFromUrl(url);

  useEffect(() => {
    setIsReady(false);
    if (!videoId || !mountRef.current) return;
    let cancelled = false;
    const createPlayer = () => {
      if (cancelled || !mountRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(mountRef.current, { videoId, playerVars: { modestbranding: 1, rel: 0, playsinline: 1 }, events: { onReady: (event) => { playerRef.current = event.target; setIsReady(true); onSeekReady?.((seconds) => event.target.seekTo(seconds, true)); } } });
    };
    if (window.YT) createPlayer();
    else {
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { previousReady?.(); createPlayer(); };
      const script = document.querySelector('script[src="https://www.youtube.com/iframe_api"]') ?? document.createElement("script");
      if (!script.parentNode) { script.setAttribute("src", "https://www.youtube.com/iframe_api"); document.head.appendChild(script); }
    }
    return () => { cancelled = true; playerRef.current?.destroy?.(); playerRef.current = null; };
  }, [videoId, onSeekReady]);

  useEffect(() => {
    if (!isReady || !playerRef.current) return;
    const interval = window.setInterval(() => { if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") onTimeChange(playerRef.current.getCurrentTime()); }, 500);
    return () => window.clearInterval(interval);
  }, [isReady, onTimeChange]);

  if (!videoId) return <div className="grid aspect-video place-items-center bg-[#1b1d1a] text-sm text-white/50">This YouTube URL is invalid.</div>;
  return <div className="aspect-video overflow-hidden rounded-t-2xl bg-black"><div ref={mountRef} className="h-full w-full" /></div>;
}
