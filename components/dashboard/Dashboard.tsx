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
const path = [
  ["Python", "done"],
  ["Mathematics", "progress"],
  ["ML Fundamentals", "done"],
  ["Supervised Learning", "progress"],
  ["Deep Learning", "locked"],
];
export function Dashboard() {
  const { recommendation, goal, paths, isStateLoading } = useAppState();
  const currentPath = paths.find((path) => path.goalId === goal?.id) ?? paths[0];
  if (isStateLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6 text-sm text-neutral-500">
        Loading your learning space...
      </div>
    );
  }
  if (!goal) return <GoalSetup />;
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow text-neutral-400">
            Wednesday · September 9
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Good evening 👋
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
            <ProgressRing value={68} size={78} />
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="mb-2 flex justify-between text-xs text-neutral-500">
                <span>Overall mastery</span>
                <span>68%</span>
              </div>
              <div className="h-2 rounded-full bg-neutral-100">
                <div className="h-full w-[68%] rounded-full bg-[var(--accent)]" />
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
            <h3 className="mt-2 text-lg font-semibold">{recommendation}</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Your recent answers show uncertainty around optimization and
              learning rate.
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-neutral-500">
              <Timer size={14} />
              Estimated time: 7 min
            </div>
            <Link
              href="/learn/linear-regression"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]"
            >
              Review now <ArrowRight size={15} />
            </Link>
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
            {(currentPath ? currentPath.modules.map((module) => [module.title, "progress"] as [string, string]) : path).map(([name, state], i) => (
              <div
                key={name}
                className="flex min-w-[150px] flex-1 items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4"
              >
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${state === "done" ? "bg-[#e9f5ef] text-[#1f7a5a]" : state === "progress" ? "bg-[#fff6dc] text-[#9a7519]" : "bg-neutral-100 text-neutral-400"}`}
                >
                  {state === "done" ? "✓" : state === "progress" ? "◐" : "🔒"}
                </div>
                <div>
                  <div className="text-sm font-medium">{name}</div>
                  <div className="mt-0.5 text-xs text-neutral-400">
                    {i < 3 ? "Available" : "Upcoming"}
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
            {[
              ["Gradient Descent", 42],
              ["Matrix Multiplication", 38],
              ["Probability", 54],
            ].map(([n, v]) => (
              <div key={n}>
                <div className="flex justify-between text-sm">
                  <span>{n}</span>
                  <span className="font-semibold">{v}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-[#d8a829]"
                    style={{ width: `${v}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-neutral-400">
            These concepts may block your next topic.
          </p>
        </section>
      </div>
      <section className="mt-5 surface p-6">
        <div className="eyebrow text-neutral-400">
          Weekly learning intelligence
        </div>
        <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {[
            ["6h 42m", "Learning time", Clock3],
            ["34", "Concepts encountered", Sparkles],
            ["26", "Concepts mastered", Target],
            ["78%", "Retention", RotateCcw],
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
