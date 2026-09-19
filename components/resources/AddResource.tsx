"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  File,
  FileSpreadsheet,
  FileText,
  Link2,
  LoaderCircle,
  Plus,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useAppState, type LearningResource } from "@/lib/state";

type ResourceType = LearningResource["type"];
type Stage = "idle" | "loading" | "done";

type AddResourceProps = {
  topic?: string;
  compact?: boolean;
  onResourceAdded?: (resource: LearningResource) => void;
  onCancel?: () => void;
};

export function AddResource({
  topic = "linear-regression",
  compact = false,
  onResourceAdded,
  onCancel,
}: AddResourceProps) {
  const router = useRouter();
  const [resourceType, setResourceType] = useState<ResourceType>("youtube");
  const [url, setUrl] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addResource } = useAppState();

  const resourceTypes = [
    { id: "youtube" as ResourceType, label: "YouTube", description: "Learn from a video", icon: Upload },
    { id: "pdf" as ResourceType, label: "PDF", description: "Books, notes or documents", icon: FileText },
    { id: "excel" as ResourceType, label: "Excel / CSV", description: "Datasets and spreadsheets", icon: FileSpreadsheet },
    { id: "file" as ResourceType, label: "File", description: "Other learning resources", icon: File },
  ];

  const canAnalyze = resourceType === "youtube" ? Boolean(url.trim()) : Boolean(selectedFile);

  const analyze = () => {
    if (!canAnalyze) return;
    setStage("loading");
    window.setTimeout(() => setStage("done"), 900);
  };

  const createResource = () => {
    if (resourceType === "youtube" && !url.trim()) return null;
    if (resourceType !== "youtube" && !selectedFile) return null;
    return addResource({
      topicId: topic,
      type: resourceType,
      title: resourceType === "youtube" ? "YouTube Learning Resource" : selectedFile!.name,
      url: resourceType === "youtube" ? url.trim() : undefined,
      timestamp: timestamp.trim() || undefined,
      duration: "42 min",
      source: resourceType === "youtube" ? "YouTube" : selectedFile!.name,
    });
  };

  const finish = (navigate: boolean) => {
    const resource = createResource();
    if (!resource) return;
    onResourceAdded?.(resource);
    if (navigate && !onResourceAdded) router.push(`/learn/${topic}`);
  };

  return (
    <div className={compact ? "p-1" : "mx-auto max-w-4xl px-6 py-10 lg:px-10"}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow text-neutral-400">Add resource</div>
          <h1 className={`${compact ? "mt-1 text-2xl" : "mt-2 text-4xl"} font-semibold tracking-tight`}>What do you want to learn from?</h1>
          <p className="mt-2 max-w-2xl text-neutral-500">Add a video, document, spreadsheet, or any other learning resource and turn it into an interactive learning experience.</p>
        </div>
        {onCancel && <button aria-label="Close" onClick={onCancel} className="rounded-lg p-2 hover:bg-neutral-100"><X size={18} /></button>}
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {resourceTypes.map(({ id, label, description, icon: Icon }) => {
          const isActive = resourceType === id;
          return <button key={id} type="button" onClick={() => { setResourceType(id); setStage("idle"); setUrl(""); setTimestamp(""); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className={`rounded-2xl border p-4 text-left transition ${isActive ? "border-black bg-black text-white" : "border-[var(--line)] bg-white hover:border-neutral-400"}`}><div className={`grid h-10 w-10 place-items-center rounded-xl ${isActive ? "bg-white/10" : "bg-neutral-100"}`}><Icon size={18} /></div><div className="mt-4 font-semibold">{label}</div><div className={`mt-1 text-xs ${isActive ? "text-white/60" : "text-neutral-400"}`}>{description}</div></button>;
        })}
      </div>
      <div className="surface mt-6 p-5">
        {resourceType === "youtube" ? <div><div className="flex gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-100"><Link2 size={18} /></div><input value={url} onChange={(event) => { setUrl(event.target.value); setStage("idle"); }} placeholder="Paste YouTube URL" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><button onClick={analyze} disabled={!canAnalyze || stage === "loading"} className="rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{stage === "loading" ? <LoaderCircle className="animate-spin" size={16} /> : "Analyze"}</button></div><div className="mt-4 border-t border-[var(--line)] pt-4"><label className="text-xs font-medium text-neutral-500">Start timestamp</label><div className="mt-2 flex items-center gap-3"><input value={timestamp} onChange={(event) => setTimestamp(event.target.value)} placeholder="00:00" className="w-32 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-400" /><span className="text-xs text-neutral-400">Optional - e.g. 12:45</span></div></div></div> : <div><input ref={fileInputRef} type="file" onChange={(event) => { setSelectedFile(event.target.files?.[0] ?? null); setStage("idle"); }} className="hidden" accept={resourceType === "pdf" ? ".pdf,application/pdf" : resourceType === "excel" ? ".xlsx,.xls,.csv" : undefined} /><button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--line)] px-6 py-10 text-center transition hover:border-neutral-400"><div className="grid h-12 w-12 place-items-center rounded-xl bg-neutral-100"><Upload size={20} /></div><div className="mt-4 font-semibold">{selectedFile ? selectedFile.name : `Upload ${resourceType === "pdf" ? "a PDF" : resourceType === "excel" ? "an Excel or CSV file" : "your file"}`}</div><div className="mt-1 text-xs text-neutral-400">Click to browse files from your computer</div></button><button onClick={analyze} disabled={!canAnalyze || stage === "loading"} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{stage === "loading" ? <><LoaderCircle className="animate-spin" size={16} /> Analyzing...</> : <>Analyze Resource <ArrowRight size={15} /></>}</button></div>}
        {stage === "loading" && <div className="mt-5 rounded-xl bg-neutral-50 p-4 text-sm">Preparing your learning room... <span className="ml-2 text-neutral-400">✓ Resource identified · ● Building learning context</span></div>}
        {stage === "done" && <div className="mt-5 border-t border-[var(--line)] pt-5"><div className="flex items-center gap-2 text-sm font-semibold text-[#1f7a5a]"><Check size={17} /> Resource analyzed</div><div className="mt-5 grid gap-4 sm:grid-cols-3"><div><div className="text-xs text-neutral-400">Resource</div><div className="mt-1 font-semibold">{resourceType === "youtube" ? "YouTube Video" : selectedFile?.name}</div></div><div><div className="text-xs text-neutral-400">Concepts identified</div><div className="mt-1 font-semibold">27</div></div><div><div className="text-xs text-neutral-400">Estimated learning time</div><div className="mt-1 font-semibold">42 minutes</div></div></div><div className="mt-6 flex flex-wrap gap-2"><button onClick={() => finish(true)} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white">Start Learning <ArrowRight size={15} /></button><button onClick={() => finish(false)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold"><Plus size={15} /> Add to Learning Path</button></div></div>}
      </div>
      {!compact && <div className="mt-8 grid gap-4 sm:grid-cols-3">{[["Context-aware", "Ask questions about the exact moment or section you're studying."], ["Micro-assessments", "Check understanding before misconceptions stick."], ["Adaptive next step", "Turn weak concepts into a concrete revision plan."]].map(([title, description]) => <div key={title} className="surface p-5"><Sparkles size={17} /><div className="mt-4 font-semibold">{title}</div><p className="mt-2 text-sm leading-6 text-neutral-500">{description}</p></div>)}</div>}
    </div>
  );
}