"use client";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
import { useAppState } from "@/lib/state";
import { ProgressRing } from "@/components/common/ProgressRing";
import { GoalSetup } from "@/components/goals/GoalSetup";
import { useEffect, useState } from "react";

type DashboardSummary = {
  overallMastery: number;
  masteredConcepts: number;
  encounteredConcepts: number;
  learningSeconds: number;
  retention: number;
  pathProgress: Array<{ id: string; title: string; description: string | null; state: "done" | "progress" | "locked"; progress: number }>;
  weakConcepts: Array<{ id: string; name: string; mastery: number }>;
  recommendation: { concept: { id: string; name: string; mastery: number }; resource: { id: string; title: string } | null } | null;
};

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Dashboard() {
  const { goal, paths, isStateLoading } = useAppState();
  const currentPath = paths.find((path) => path.goalId === goal?.id) ?? paths[0];
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/dashboard", { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json() as DashboardSummary & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Could not load dashboard");
        return payload;
      })
      .then((payload) => { if (active) setSummary(payload); })
      .catch((error) => { if (active) setDashboardError(error instanceof Error ? error.message : "Could not load dashboard"); });
    return () => { active = false; };
  }, []);
  if (isStateLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6 text-sm text-neutral-500">
        Loading your learning space...
      </div>
    );
  }
  if (!goal) return <GoalSetup />;
  const overallMastery = summary?.overallMastery ?? 0;
  const recommendation = summary?.recommendation;
  const today = new Date();
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
      {dashboardError && <div className="mb-5 rounded-xl border border-[#c9a338]/30 bg-[#fff6dc] px-4 py-3 text-sm text-[#80631b]">{dashboardError}</div>}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow text-neutral-400">{today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {greeting(today.getHours())}
          </h1>
          <p className="mt-1 text-neutral-500">What are you learning today?</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/quick-learn"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-medium hover:bg-neutral-50"
          >
            <Plus size={16} />
            Add Resource
          </Link>
          <Link
            href="/quick-learn"
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            <Sparkles size={16} />
            Quick Learn
          </Link>
        </div>
      </header>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <section className="surface overflow-hidden p-6 sm:p-7">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#edf6f1] px-2.5 py-1 text-xs font-semibold text-[#1f7a5a]">
                Current Learning
              </span>
              <h2 className="mt-5 text-2xl font-semibold">{goal.title}</h2>
              <p className="mt-1 text-sm text-neutral-500">
                {currentPath ? currentPath.title : "Your learning path is being prepared"}
              </p>
            </div>
            <ProgressRing value={overallMastery} size={78} />
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="mb-2 flex justify-between text-xs text-neutral-500">
                <span>Overall mastery</span>
                <span>{summary ? `${overallMastery}%` : "Loading..."}</span>
              </div>
              <div className="h-2 rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${overallMastery}%` }} />
              </div>
            </div>
            <Link
              href={currentPath ? `/paths/${currentPath.id}` : "/paths"}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Continue Learning <ArrowRight size={15} />
            </Link>
          </div>
        </section>
        <section className="surface p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Target size={17} />
            Your next best step
          </div>
          <div className="mt-5 rounded-2xl bg-[#f5f5ef] p-5">
            <div className="eyebrow text-neutral-400">Recommendation</div>
            <h3 className="mt-2 text-lg font-semibold">{recommendation ? `Review ${recommendation.concept.name}` : "Complete a learning check"}</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-500">{recommendation ? `${recommendation.concept.mastery}% mastery. Practice this concept to strengthen your next step.` : "Add a resource and complete a Quick Check to unlock a focused recommendation."}</p>
            <div className="mt-5 flex items-center gap-2 text-xs text-neutral-500">
              <Timer size={14} />
              {recommendation?.resource ? `Continue: ${recommendation.resource.title}` : "No review selected yet"}
            </div>
            {recommendation?.resource && <Link href={`/learn/${recommendation.resource.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">Review now <ArrowRight size={15} /></Link>}
          </div>
        </section>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <section className="surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="eyebrow text-neutral-400">Learning path</div>
              <h2 className="mt-1 text-xl font-semibold">{currentPath?.title ?? goal.title}</h2>
            </div>
            <Link
              href={currentPath ? `/paths/${currentPath.id}` : "/paths"}
              className="text-sm font-medium text-neutral-500 hover:text-black"
            >
              Open path
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {(summary?.pathProgress ?? []).map((topic) => (
              <div
                key={topic.id}
                className="flex min-w-[150px] flex-1 items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4"
              >
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${topic.state === "done" ? "bg-[#e9f5ef] text-[#1f7a5a]" : topic.state === "progress" ? "bg-[#fff6dc] text-[#9a7519]" : "bg-neutral-100 text-neutral-400"}`}
                >
                  {topic.state === "done" ? "✓" : topic.state === "progress" ? "◐" : "-"}
                </div>
                <div>
                  <div className="text-sm font-medium">{topic.title}</div>
                  <div className="mt-0.5 text-xs text-neutral-400">
                    {topic.state === "done" ? `${topic.progress}% mastered` : topic.state === "progress" ? `${topic.progress}% in progress` : "Not started"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="surface p-6">
          <div className="flex items-center gap-2">
            <RotateCcw size={17} />
            <div>
              <div className="eyebrow text-neutral-400">Needs attention</div>
              <h2 className="mt-1 text-xl font-semibold">Weak concepts</h2>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {(summary?.weakConcepts ?? []).map((concept) => (
              <div key={concept.id}>
                <div className="flex justify-between text-sm">
                  <span>{concept.name}</span>
                  <span className="font-semibold">{concept.mastery}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-[#d8a829]"
                    style={{ width: `${concept.mastery}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
            <p className="mt-5 text-xs text-neutral-400">{summary?.weakConcepts.length ? "These concepts may block your next topic." : "Complete assessments to identify concepts that need attention."}</p>
        </section>
      </div>
      <section className="mt-5 surface p-6">
        <div className="eyebrow text-neutral-400">
          Weekly learning intelligence
        </div>
        <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {[
            [summary ? formatDuration(summary.learningSeconds) : "Loading...", "Learning time", Clock3],
            [summary?.encounteredConcepts.toString() ?? "Loading...", "Concepts encountered", Sparkles],
            [summary?.masteredConcepts.toString() ?? "Loading...", "Concepts mastered", Target],
            [summary ? `${summary.retention}%` : "Loading...", "Assessment accuracy", RotateCcw],
          ].map(([v, l, Icon]) => (
            <div
              key={l as string}
              className="border-l border-[var(--line)] pl-4 first:border-l-0 first:pl-0"
            >
              <Icon size={16} className="text-neutral-400" />
              <div className="mt-3 text-2xl font-semibold">{v as string}</div>
              <div className="mt-1 text-xs text-neutral-500">{l as string}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
