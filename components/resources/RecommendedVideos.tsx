"use client";

import { Check, Play } from "lucide-react";
import { getRecommendedVideos } from "@/lib/mock-data/recommendedVideos";

export type RecommendedVideosProps = {
  topic: string;
  onChoose: (video: ReturnType<typeof getRecommendedVideos>[number]) => void;
};

export function RecommendedVideos({ topic, onChoose }: RecommendedVideosProps) {
  const videos = getRecommendedVideos(topic);

  return (
    <section className="mt-8">
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">Recommended for you</div>
      <h2 className="mt-2 text-xl font-semibold">Resources for {topic.replaceAll("-", " ")}</h2>
      {videos.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {videos.map((video) => (
            <article key={video.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#171916]">
              <div className="flex h-28 items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#41675a,#20231f_58%)]">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"><Play size={18} fill="currentColor" /></div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{video.title}</h3>
                <div className="mt-2 flex items-center gap-2 text-xs text-white/45"><span>{video.channel}</span><span>·</span><span>{video.level}</span><span>·</span><span>{video.duration}</span></div>
                <button onClick={() => onChoose(video)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-white/90"><Check size={14} /> Choose</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/50">We couldn&apos;t find recommendations yet. Try adding your own resource.</p>
      )}
    </section>
  );
}