import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Play,
  Workflow,
} from "lucide-react";
export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen gradient-orb">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link
          href="/sign-in"
          className="flex items-center gap-3 font-semibold"
        >
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-black text-white">
            <BrainCircuit size={17} />
          </div>
          QnA.ai
        </Link>
        <Link
          href="/sign-in"
          className="text-sm font-medium text-neutral-600 hover:text-black"
        >
          Open demo
        </Link>
      </header>
      <main className="mx-auto max-w-7xl px-6 pb-16 pt-10 lg:px-10 lg:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              Adaptive learning, built around understanding
            </div>
            <h1 className="mt-7 max-w-xl text-5xl font-semibold tracking-[-.04em] sm:text-6xl">
              Learn what you watch.
              <br />
              Know what you know.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-500">
              Turn educational videos into personalized learning experiences
              that understand what you&apos;ve learned, detect where you&apos;re
              struggling, and guide you toward what to learn next.
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white"
              >
                Start Learning <ArrowRight size={16} />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold"
              >
                <Play size={16} />
                Explore Demo
              </Link>
            </div>
          </div>
          <div className="surface grid-paper overflow-hidden p-5 shadow-[0_25px_80px_rgba(0,0,0,.08)]">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
              <div>
                <div className="text-sm font-semibold">
                  Learning Intelligence
                </div>
                <div className="mt-1 text-xs text-neutral-400">
                  Machine Learning · 82 concepts
                </div>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-[10px] font-semibold">
                ⌘ K
              </div>
            </div>
            <div className="relative my-5 h-[360px] overflow-hidden rounded-2xl bg-white/80">
              <div className="absolute left-[41%] top-[39%] flex flex-col items-center">
                <div className="grid h-24 w-24 place-items-center rounded-full border-8 border-[#dfeee7] bg-white shadow-sm">
                  <BrainCircuit size={28} className="text-[var(--accent)]" />
                </div>
                <div className="mt-2 text-xs font-semibold">
                  Machine Learning
                </div>
              </div>
              {[
                ["Python", 18, 22, "#d9eee3"],
                ["Statistics", 67, 18, "#fff0bf"],
                ["Linear Algebra", 20, 68, "#f7d8d8"],
                ["Linear Regression", 66, 66, "#d9eee3"],
                ["Classification", 79, 46, "#fff0bf"],
                ["Gradient Descent", 52, 82, "#f7d8d8"],
              ].map(([t, x, y, b]) => (
                <div
                  key={t as string}
                  className="absolute"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <div className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 shadow-sm">
                    <div className="text-xs font-medium">{t as string}</div>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-neutral-400">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: b as string }}
                      />
                      mastery tracked
                    </div>
                  </div>
                </div>
              ))}
              <svg className="absolute inset-0 h-full w-full pointer-events-none">
                <path
                  d="M47% 42% L25% 27% M53% 42% L72% 23% M46% 49% L28% 72% M54% 49% L72% 70% M60% 51% L80% 49% M52% 53% L55% 82%"
                  stroke="#cfcfc8"
                  strokeWidth="1.2"
                  fill="none"
                  strokeDasharray="5 5"
                />
              </svg>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Understand", "Contextual tutor", CheckCircle2],
                ["Assess", "Micro-checks", Workflow],
                ["Adapt", "Next-best step", ArrowRight],
              ].map(([a, b, I]) => (
                <div key={a as string} className="rounded-xl bg-white p-3">
                  <I size={15} />
                  <div className="mt-2 text-xs font-semibold">
                    {a as string}
                  </div>
                  <div className="mt-0.5 text-[10px] text-neutral-400">
                    {b as string}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
