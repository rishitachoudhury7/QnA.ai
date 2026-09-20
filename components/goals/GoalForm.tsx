"use client";

import { useState } from "react";
import type { LearningGoal } from "@/lib/state";

export function GoalForm({
  initialGoal,
  onSave,
  onCancel,
  isSubmitting = false,
}: {
  initialGoal?: LearningGoal;
  onSave: (goal: Omit<LearningGoal, "id">) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}) {
  const [title, setTitle] = useState(initialGoal?.title ?? "");
  const [level, setLevel] = useState<LearningGoal["level"]>(initialGoal?.level);
  const [objective, setObjective] = useState(initialGoal?.objective ?? "");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), level, objective: objective.trim() || undefined });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="goal-title" className="text-sm font-semibold">What do you want to learn?</label>
        <input
          id="goal-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Machine Learning"
          className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[#fbfbf8] px-4 py-3 outline-none focus:ring-2 focus:ring-black/10"
          autoFocus
          required
        />
      </div>
      <div>
        <label htmlFor="goal-level" className="text-sm font-semibold">Current skill level <span className="font-normal text-neutral-400">(optional)</span></label>
        <select
          id="goal-level"
          value={level ?? ""}
          onChange={(event) => setLevel((event.target.value || undefined) as LearningGoal["level"])}
          className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[#fbfbf8] px-4 py-3 outline-none focus:ring-2 focus:ring-black/10"
        >
          <option value="">Choose a level</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
      <div>
        <label htmlFor="goal-objective" className="text-sm font-semibold">What do you want to achieve? <span className="font-normal text-neutral-400">(optional)</span></label>
        <textarea
          id="goal-objective"
          value={objective}
          onChange={(event) => setObjective(event.target.value)}
          placeholder="e.g. Build ML projects and become job-ready"
          rows={3}
          className="mt-2 w-full resize-none rounded-xl border border-[var(--line)] bg-[#fbfbf8] p-4 outline-none focus:ring-2 focus:ring-black/10"
        />
      </div>
      <div className="flex justify-end gap-3">
        {onCancel && <button type="button" onClick={onCancel} className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold">Cancel</button>}
        <button type="submit" disabled={!title.trim() || isSubmitting} className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{isSubmitting ? "Building your learning path..." : "Create Learning Goal"}</button>
      </div>
    </form>
  );
}
