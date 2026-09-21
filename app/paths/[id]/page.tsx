"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  LockKeyhole,
  PlayCircle,
} from "lucide-react";
import { ProgressRing } from "@/components/common/ProgressRing";
import { useAppState } from "@/lib/state";
export default function PathDetail() {
  const { id } = useParams<{ id: string }>();
  const { paths, isStateLoading } = useAppState();
  const path = paths.find((item) => item.id === id);

  if (isStateLoading) {
    return <div className="grid min-h-[70vh] place-items-center px-6 text-sm text-neutral-500">Loading your learning path...</div>;
  }

  if (!path) {
    return <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10"><Link href="/paths" className="text-sm text-neutral-500">Back to learning paths</Link><p className="mt-8 text-neutral-500">That learning path could not be found.</p></div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
      <Link
        href="/paths"
        className="inline-flex items-center gap-2 text-sm text-neutral-500"
      >
        <ArrowLeft size={15} />
        Learning Paths
      </Link>
      <header className="mt-7 flex items-end justify-between gap-6">
        <div>
          <div className="eyebrow text-neutral-400">Learning path</div>
          <h1 className="mt-2 text-3xl font-semibold">{path.title}</h1>
          <p className="mt-1 text-neutral-500">{path.description ?? "A guided path that adapts around your understanding."}</p>
        </div>
        <ProgressRing value={68} label="68%" />
      </header>
      <div className="mt-8 space-y-4">
        {path.modules.map((module, i) => (
          <section
            key={module.id}
            className={`surface p-5 ${i === 0 ? "ring-1 ring-[#dcebe4]" : ""}`}
          >
            <div className="flex items-center gap-4">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-neutral-100 font-semibold text-sm">
                {i === 0 ? (
                  <PlayCircle size={18} className="text-[var(--accent)]" />
                ) : (
                  <LockKeyhole size={16} className="text-neutral-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-xs text-neutral-400">Module {i + 1}</div>
                <h2 className="font-semibold">{module.title}</h2>
              </div>
              <div className="text-sm text-neutral-500">{i === 0 ? "In Progress" : "Upcoming"}</div>
            </div>
            {module.description || module.topics.length > 0 ? (
              <div className="mt-5 border-t border-[var(--line)] pt-5">
                {module.description && <p className="mb-4 text-sm text-neutral-500">{module.description}</p>}
                <div className="grid gap-3 sm:grid-cols-2">
                  {module.topics.map((topic) => (
                    <Link key={topic.id} href={`/learn/${topic.id}`} className="rounded-xl border border-[var(--line)] p-4 hover:bg-neutral-50">
                      <div className="flex items-start gap-3">
                        <BookOpen size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                        <div>
                          <div className="font-medium">{topic.title}</div>
                          {topic.description && <div className="mt-2 text-xs leading-5 text-neutral-500">{topic.description}</div>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <Link
          href="/knowledge-map"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-medium"
        >
          View Knowledge Map <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
