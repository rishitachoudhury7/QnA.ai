"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AddResource } from "@/components/resources/AddResource";
import { RecommendedVideos, type RecommendedVideosProps } from "@/components/resources/RecommendedVideos";
import { useAppState, type LearningResource } from "@/lib/state";
const markers = [
  { at: 6, label: "Features" },
  { at: 21, label: "Gradient Descent" },
  { at: 35, label: "Normalization" },
];

function topicLabel(topicId: string) {
  return topicId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function ResourceRequiredState({
  topicId,
  topic,
  onResourceAdded,
  onChoose,
}: {
  topicId: string;
  topic: string;
  onResourceAdded: (resource: LearningResource) => void;
  onChoose: RecommendedVideosProps["onChoose"];
}) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="min-h-screen bg-[#111210] px-4 py-4 text-white lg:px-6">
      <div className="mx-auto max-w-[1100px]">
        <header className="border-b border-white/10 pb-5">
          <Link href="/paths/ml" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white"><ArrowLeft size={16} /> Learning Path</Link>
          <div className="mt-6 text-xs text-white/40">Supervised Learning · Learning Room</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{topic}</h1>
        </header>
        <section className="mt-8 rounded-2xl border border-white/10 bg-[#171916] px-6 py-12 text-center sm:px-12">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#8cd5af]/10 text-[#8cd5af]"><BookOpen size={24} /></div>
          <h2 className="mt-5 text-2xl font-semibold">Let&apos;s add something to learn from.</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/50">Add a YouTube video, course, PDF or another resource and we&apos;ll turn it into an interactive learning experience.</p>
          <button onClick={() => setIsAdding(true)} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"><Sparkles size={16} /> Add Learning Resource</button>
        </section>
        <RecommendedVideos topic={topicId} onChoose={onChoose} />
      </div>
      <AnimatePresence>
        {isAdding && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }} className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-[#f7f7f4] p-5 text-neutral-900 sm:p-8"><AddResource topic={topicId} compact onCancel={() => setIsAdding(false)} onResourceAdded={(resource) => { setIsAdding(false); onResourceAdded(resource); }} /></motion.div></div>}
      </AnimatePresence>
    </div>
  );
}

export function LearningRoom() {
  const params = useParams<{ resourceId: string }>();
  const topicId = String(params.resourceId ?? "linear-regression").toLowerCase();
  const topic = topicLabel(topicId);
  const { mastery, setMastery, resources, isResourcesLoading, addResource } = useAppState();
  const topicResources = useMemo(() => resources.filter((resource) => resource.topicId === topicId), [resources, topicId]);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const activeResource = topicResources.find((resource) => resource.id === selectedResourceId) ?? topicResources[0];
  const [resourceFeedback, setResourceFeedback] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(23.7);
  const [quick, setQuick] = useState(false);
  const [teach, setTeach] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState(false);
  const [explanation, setExplanation] = useState("");
  const chooseResource = (resource: LearningResource) => {
    setSelectedResourceId(resource.id);
    setResourceFeedback(true);
    window.setTimeout(() => setResourceFeedback(false), 1200);
  };
  const chooseRecommended: RecommendedVideosProps["onChoose"] = (video) => {
    const resource = addResource({
      topicId,
      type: "youtube",
      title: video.title,
      url: video.url,
      duration: video.duration,
      source: video.source ?? video.title,
    });
    chooseResource(resource);
  };
  const minutes = Math.floor(time),
    seconds = Math.floor((time - minutes) * 60);
  const current = useMemo(
    () => (time >= 21 ? "Gradient Descent" : "Features"),
    [time],
  );
  const submit = () => {
    setAnswer(1);
    setMastery(51);
  };
  const submitTeach = () => {
    setTeach(false);
    setMastery(58);
  };
  if (isResourcesLoading) {
    return <div className="grid min-h-screen place-items-center bg-[#111210] text-sm text-white/50">Preparing your learning room...</div>;
  }
  if (!activeResource) {
    return <ResourceRequiredState topicId={topicId} topic={topic} onResourceAdded={chooseResource} onChoose={chooseRecommended} />;
  }
  return (
    <div className="min-h-screen bg-[#111210] text-white">
      {resourceFeedback && <div className="fixed right-5 top-5 z-50 rounded-xl bg-[#8cd5af] px-4 py-3 text-sm font-semibold text-[#111210]">✓ Added to your learning room</div>}
      <div className="mx-auto max-w-[1500px] px-4 py-4 lg:px-6">
        <header className="flex items-center gap-4 border-b border-white/10 pb-4">
          <Link
            href="/paths/ml"
            className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {topic}
            </div>
            <div className="text-xs text-white/40">
              Supervised Learning · Learning Room
            </div>
          </div>
          {topicResources.length > 1 && <select value={activeResource.id} onChange={(event) => setSelectedResourceId(event.target.value)} className="max-w-[210px] rounded-lg border border-white/10 bg-[#171916] px-3 py-2 text-xs text-white/70 outline-none"><option value={activeResource.id}>{activeResource.title}</option>{topicResources.filter((resource) => resource.id !== activeResource.id).map((resource) => <option key={resource.id} value={resource.id}>{resource.title}</option>)}</select>}
          <div className="hidden items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs sm:flex">
            Mastery{" "}
            <span className="font-semibold text-[#8cd5af]">{mastery}%</span>
          </div>
        </header>
        <div className="grid gap-4 pt-4 lg:grid-cols-[1.55fr_.85fr]">
          <section className="min-w-0">
            <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#1b1d1a] shadow-2xl">
              <div className="grid h-full place-items-center">
                <div className="text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/10">
                    <Play size={25} fill="white" />
                  </div>
                  <div className="mt-3 text-sm text-white/50">
                    Mock YouTube player
                  </div>
                </div>
              </div>
              <div className="border-t border-white/10 bg-[#171916] p-3">
                <div className="relative h-5">
                  <div className="absolute top-2 h-1 w-full rounded-full bg-white/10" />
                  <div
                    className="absolute top-2 h-1 rounded-full bg-[#8cd5af]"
                    style={{ width: `${(time / 48.35) * 100}%` }}
                  />
                  <div className="absolute inset-0">
                    {markers.map((m) => (
                      <button
                        key={m.at}
                        title={`${m.label} · ${m.at}:42`}
                        onClick={() => setTime(m.at)}
                        className="absolute top-0 h-5 w-5 -translate-x-1/2 rounded-full border-4 border-[#171916] bg-[#c9a338] hover:scale-125"
                        style={{ left: `${(m.at / 48.35) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => setPlaying((v) => !v)}
                    className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/5"
                  >
                    {playing ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                  <button
                    onClick={() => setTime(0)}
                    className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/5"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <span className="text-xs text-white/50">
                    {minutes}:{String(seconds).padStart(2, "0")} / 48:21
                  </span>
                  <div className="ml-auto text-[10px] text-white/30">
                    ● concept markers
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#171916] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                    Current concept
                  </div>
                  <div className="mt-1 text-lg font-semibold">{current}</div>
                </div>
                <div className="rounded-full bg-[#3b2727] px-2.5 py-1 text-xs font-semibold text-[#e39a9a]">
                  {mastery}% · Needs work
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  onClick={() => setAsked(true)}
                  className="rounded-xl border border-white/10 px-3 py-3 text-left text-xs font-semibold hover:bg-white/5"
                >
                  <Sparkles size={14} className="mb-2 text-[#8cd5af]" />
                  Ask about this moment
                </button>
                <button
                  onClick={() => setQuick(true)}
                  className="rounded-xl border border-white/10 px-3 py-3 text-left text-xs font-semibold hover:bg-white/5"
                >
                  <Check size={14} className="mb-2 text-[#c9a338]" />
                  Quick Check
                </button>
                <button
                  onClick={() => setTeach(true)}
                  className="rounded-xl border border-white/10 px-3 py-3 text-left text-xs font-semibold hover:bg-white/5"
                >
                  <Mic size={14} className="mb-2 text-[#9ab0ff]" />
                  Teach Back
                </button>
              </div>
            </div>
          </section>
          <aside className="flex min-h-[540px] flex-col rounded-2xl border border-white/10 bg-[#171916]">
            <div className="border-b border-white/10 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">AI Tutor</div>
                  <div className="mt-0.5 text-xs text-white/40">
                    Context: {minutes}:{String(seconds).padStart(2, "0")}
                  </div>
                </div>
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-white/50">
                  ● Using 22:42–24:42
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-5 overflow-auto p-5">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white px-4 py-3 text-sm leading-6 text-neutral-800">
                Why did the instructor use normalization here?
              </div>
              <div className="max-w-[92%]">
                <div className="mb-2 flex items-center gap-2 text-xs text-white/40">
                  <div className="grid h-6 w-6 place-items-center rounded-md bg-white/10">
                    <Sparkles size={12} />
                  </div>
                  AI Tutor
                </div>
                <div className="rounded-2xl rounded-tl-md bg-[#20231f] px-4 py-4 text-sm leading-6 text-white/75">
                  The instructor normalized the features because they have
                  different scales. Without normalization, larger-valued
                  features can disproportionately influence gradient-based
                  optimization.
                </div>
                <div className="mt-3 rounded-xl border border-white/10 p-3 text-[11px] text-white/40">
                  <div className="font-semibold text-white/60">Based on</div>
                  <div className="mt-1">23:10 — Feature Scaling</div>
                  <div>23:34 — Normalization</div>
                </div>
              </div>
              {asked && (
                <div className="max-w-[92%] rounded-2xl bg-[#20231f] px-4 py-3 text-sm leading-6 text-white/75">
                  Think of normalization as putting every feature onto a
                  comparable scale so the optimizer can move fairly in every
                  direction.
                </div>
              )}
            </div>
            <div className="border-t border-white/10 p-4">
              <div className="flex flex-wrap gap-2 pb-3">
                {[
                  "Explain this simply",
                  "Give me an example",
                  "What should I remember?",
                  "Test me",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuestion(s)}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-white/55 hover:bg-white/5"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111210] p-2">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setAsked(true)}
                  placeholder="Ask about this moment..."
                  className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-white/25"
                />
                <button
                  onClick={() => setAsked(true)}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-white text-black"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <AnimatePresence>
        {quick && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="w-full max-w-lg rounded-2xl bg-white p-6 text-neutral-900 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="eyebrow text-neutral-400">Quick check</div>
                  <h2 className="mt-1 text-xl font-semibold">
                    What happens when the learning rate is too large?
                  </h2>
                </div>
                <button onClick={() => setQuick(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="mt-5 space-y-2">
                {[
                  "Training becomes slower",
                  "The optimizer may overshoot",
                  "The model always overfits",
                  "Nothing changes",
                ].map((x, i) => (
                  <button
                    key={x}
                    onClick={() => setAnswer(i)}
                    className={`w-full rounded-xl border p-3 text-left text-sm ${answer === i ? "border-black bg-neutral-50" : "border-neutral-200"}`}
                  >
                    {x}
                  </button>
                ))}
              </div>
              {answer !== null && (
                <div className="mt-5 rounded-xl bg-[#edf6f1] p-4">
                  <div className="font-semibold text-[#1f7a5a]">
                    ✓ {answer === 1 ? "Correct" : "Not quite"}
                  </div>
                  <div className="mt-1 text-sm text-neutral-600">
                    Your understanding of Learning Rate has{" "}
                    {answer === 1
                      ? "improved."
                      : "a gap. Review how step size affects optimization."}
                  </div>
                  <div className="mt-2 text-xs text-neutral-500">
                    Mastery {mastery === 42 ? "42% → 51%" : `${mastery}%`}
                  </div>
                </div>
              )}
              {answer !== null && (
                <button
                  onClick={submit}
                  className="mt-4 w-full rounded-xl bg-black py-3 text-sm font-semibold text-white"
                >
                  Continue
                </button>
              )}
            </motion.div>
          </div>
        )}
        {teach && (
          <div className="fixed inset-0 z-50 bg-[#f7f7f4] p-5 text-neutral-900">
            <div className="mx-auto max-w-3xl pt-6">
              <div className="flex justify-end">
                <button onClick={() => setTeach(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="eyebrow text-neutral-400">Teach it back</div>
              <h2 className="mt-2 text-4xl font-semibold">
                Explain Gradient Descent
                <br />
                in your own words.
              </h2>
              <p className="mt-3 text-neutral-500">
                Don’t worry about being perfect.
              </p>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Write your explanation here..."
                className="mt-8 h-56 w-full resize-none rounded-2xl border border-[var(--line)] bg-white p-5 outline-none focus:ring-2 focus:ring-black/10"
              />
              <div className="mt-3 flex gap-3">
                <button className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold">
                  <Mic size={16} />
                  Start Speaking
                </button>
                <button
                  onClick={submitTeach}
                  disabled={!explanation.trim()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Submit explanation <ChevronRight size={16} />
                </button>
              </div>
              <div className="mt-5 text-xs text-neutral-400">
                Mock evaluation returns a simulated understanding analysis and
                updates mastery.
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
