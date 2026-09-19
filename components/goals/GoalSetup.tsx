"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { GoalForm } from "@/components/goals/GoalForm";
import { useAppState } from "@/lib/state";

const suggestions = ["Machine Learning", "Full-Stack Development", "Python", "Data Structures & Algorithms", "Data Science"];

export function GoalSetup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const { saveGoal } = useAppState();

  const createGoal = async (goal: Parameters<typeof saveGoal>[0]) => {
    setIsSubmitting(true);
    setGenerationError(null);
    const result = await saveGoal(goal);
    setIsSubmitting(false);
    setIsOpen(false);
    if (result.authRequired) {
      setGenerationError("Please sign in with Clerk before creating a learning goal.");
    } else if (result.saveFailed) {
      setGenerationError("We couldn't save your goal. Check your connection and try again.");
    } else if (result.generationError) {
      setGenerationError("Your goal was saved, but we couldn't generate the learning path yet. Try again from Goals.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 lg:px-10">
      <div className="surface p-8 text-center sm:p-14">
        <div className="eyebrow text-neutral-400">Your learning space</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">What do you want to learn?</h1>
        <p className="mx-auto mt-3 max-w-xl text-neutral-500">Set your first learning goal and we&apos;ll help you build a personalized learning path around it.</p>
        {generationError && <p className="mx-auto mt-4 max-w-xl rounded-xl bg-[#fff6dc] px-4 py-3 text-sm text-[#80631b]">{generationError}</p>}
        <button onClick={() => setIsOpen(true)} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">
          <Plus size={16} /> Create Learning Goal
        </button>
        <div className="mx-auto mt-10 max-w-2xl text-left">
          <div className="eyebrow text-neutral-400">Popular goals</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => <button key={suggestion} onClick={() => { setIsOpen(true); }} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm hover:border-neutral-400">{suggestion}</button>)}
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-6" role="dialog" aria-modal="true" aria-labelledby="goal-dialog-title">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div><div className="eyebrow text-neutral-400">New learning goal</div><h2 id="goal-dialog-title" className="mt-1 text-2xl font-semibold">Build your learning path</h2></div>
              <button aria-label="Close" onClick={() => setIsOpen(false)} className="rounded-lg p-1 hover:bg-neutral-100"><X size={18} /></button>
            </div>
            <GoalForm onSave={createGoal} isSubmitting={isSubmitting} onCancel={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
