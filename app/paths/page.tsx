"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, LockKeyhole, PlayCircle } from "lucide-react";
import { useAppState } from "@/lib/state";
export default function Paths() {
  const { paths, isStateLoading } = useAppState();

  if (isStateLoading) {
    return <div className="grid min-h-[70vh] place-items-center px-6 text-sm text-neutral-500">Loading your learning paths...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
      <div className="eyebrow text-neutral-400">My learning</div>
      <div className="mt-2 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Learning Paths</h1>
          <p className="mt-1 text-neutral-500">
            Structured routes from where you are to where you want to be.
          </p>
        </div>
        <Link
          href="/goals"
          className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white"
        >
          Create goal
        </Link>
      </div>
      {paths.length ? paths.map((path) => (
        <Link key={path.id} href={`/paths/${path.id}`} className="surface mt-8 block overflow-hidden p-6 hover:shadow-md">
          <div className="flex items-start justify-between gap-5">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf6f1]"><BookOpen className="text-[var(--accent)]" size={22} /></div>
              <div>
                <div className="eyebrow text-[var(--accent)]">Active path</div>
                <h2 className="mt-1 text-2xl font-semibold">{path.title}</h2>
                <p className="mt-1 text-sm text-neutral-500">{path.description ?? "A guided path built around your learning goal."}</p>
              </div>
            </div>
            <ArrowRight size={20} />
          </div>
          <div className="mt-7 space-y-2">
            {path.modules.map((module, index) => {
              const status = index === 0 ? "In Progress" : "Upcoming";
              return (
                <div key={module.id} className="flex items-center gap-4 rounded-xl px-3 py-3 hover:bg-neutral-50">
                  <span className="w-7 text-xs font-semibold text-neutral-400">{String(index + 1).padStart(2, "0")}</span>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-neutral-100">{index === 0 ? <PlayCircle size={14} /> : <LockKeyhole size={13} />}</span>
                  <span className="text-sm font-medium">{module.title}</span>
                  <span className="ml-auto text-xs text-neutral-400">{status}</span>
                </div>
              );
            })}
          </div>
        </Link>
      )) : (
        <div className="surface mt-8 p-8 text-center text-sm text-neutral-500">Create a learning goal to generate your first path.</div>
      )}
    </div>
  );
}
