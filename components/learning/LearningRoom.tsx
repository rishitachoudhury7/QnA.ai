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
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddResource } from "@/components/resources/AddResource";
import { YouTubePlayer } from "@/components/video/YouTubePlayer";
import { RecommendedVideos, type RecommendedVideosProps } from "@/components/resources/RecommendedVideos";
import { useAppState, type LearningResource } from "@/lib/state";
function topicLabel(topicId: string) {
  return topicId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type TutorMessage = { question: string; answer: string; citations: Array<{ segment_id: string; label: string; startSeconds: number }> };

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
  const { mastery, setMastery, resources, isResourcesLoading, createResource, updateResource } = useAppState();
  const topicResources = useMemo(() => resources.filter((resource) => resource.topicId === topicId || resource.id === topicId), [resources, topicId]);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [isAnalyzingConcepts, setIsAnalyzingConcepts] = useState(false);
  const [conceptError, setConceptError] = useState<string | null>(null);
  const activeResource = topicResources.find((resource) => resource.id === selectedResourceId) ?? topicResources[0];
  useEffect(() => {
    if (!activeResource?.id || activeResource.status !== "processing") return;
    const poll = window.setInterval(() => {
      void fetch(`/api/resources/${activeResource.id}/status`, { credentials: "include" })
        .then(async (response) => response.ok ? await response.json() as { status: LearningResource["status"]; error?: string } : null)
        .then((status) => { if (status) updateResource(activeResource.id, { status: status.status, error: status.error }); })
        .catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(poll);
  }, [activeResource?.id, activeResource?.status, updateResource]);
  const [resourceFeedback, setResourceFeedback] = useState(false);
  const [time, setTime] = useState(23.7);
  const [quick, setQuick] = useState(false);
  const [teach, setTeach] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [explanation, setExplanation] = useState("");
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const seekPlayerRef = useRef<(seconds: number) => void>(() => undefined);
  const chooseResource = (resource: LearningResource) => {
    setSelectedResourceId(resource.id);
    setResourceFeedback(true);
    window.setTimeout(() => setResourceFeedback(false), 1200);
  };
  const chooseRecommended: RecommendedVideosProps["onChoose"] = async (video) => {
    const resource = await createResource({
      topicId,
      type: "youtube",
      title: video.title,
      url: video.url,
      duration: video.duration,
      source: video.source ?? video.title,
    });
    if (resource) chooseResource(resource);
  };
  const minutes = Math.floor(time),
    seconds = Math.floor((time - minutes) * 60);
  const current = "Video context";
  const handleTimeChange = useCallback((secondsValue: number) => setTime(secondsValue), []);
  const handleSeekReady = useCallback((seek: (seconds: number) => void) => { seekPlayerRef.current = seek; }, []);
  const askTutor = async () => {
    const submittedQuestion = question.trim();
    if (!submittedQuestion || isTutorLoading) return;
    setIsTutorLoading(true);
    setTutorError(null);
    try {
      const response = await fetch(`/api/resources/${activeResource.id}/tutor`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: submittedQuestion, currentSeconds: time }) });
      const payload = await response.json() as { answer?: string; citations?: Array<{ segment_id: string; label: string }>; context?: Array<{ id: string; startSeconds: number }>; error?: string };
      if (!response.ok || !payload.answer) throw new Error(payload.error ?? "Could not answer from this video");
      const contextById = new Map((payload.context ?? []).map((segment) => [segment.id, segment.startSeconds]));
      setTutorMessages((messages) => [...messages, { question: submittedQuestion, answer: payload.answer!, citations: (payload.citations ?? []).map((citation) => ({ ...citation, startSeconds: contextById.get(citation.segment_id) ?? 0 })) }]);
      setQuestion("");
    } catch (error) {
      setTutorError(error instanceof Error ? error.message : "Could not answer from this video");
    } finally { setIsTutorLoading(false); }
  };
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
  if (activeResource.status === "processing" || activeResource.status === "pending") {
    return <div className="grid min-h-screen place-items-center bg-[#111210] px-6 text-center text-white"><div><BookOpen className="mx-auto text-[#8cd5af]" size={30} /><h1 className="mt-5 text-2xl font-semibold">Preparing your learning material...</h1><p className="mt-2 max-w-md text-sm leading-6 text-white/50">We&apos;re fetching the transcript, preserving timestamps, and indexing this video for learning.</p></div></div>;
  }
  if (activeResource.status === "failed") {
    const retry = async () => {
      updateResource(activeResource.id, { status: "processing", error: undefined });
      await fetch(`/api/resources/${activeResource.id}/ingest`, { method: "POST", credentials: "include" }).catch(() => undefined);
    };
    return <div className="grid min-h-screen place-items-center bg-[#111210] px-6 text-center text-white"><div><BookOpen className="mx-auto text-[#c9a338]" size={30} /><h1 className="mt-5 text-2xl font-semibold">We couldn&apos;t prepare this resource.</h1><p className="mt-2 max-w-md text-sm leading-6 text-white/50">{activeResource.error ?? "The transcript or video could not be processed."}</p><div className="mt-6 flex flex-wrap justify-center gap-3"><button onClick={() => setIsAddingResource(true)} className="inline-flex items-center rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10">Add a different resource</button><button onClick={() => void retry()} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black">Try processing it again</button></div></div>{isAddingResource && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-[#f7f7f4] p-5 text-left text-neutral-900 sm:p-8"><AddResource topic={topicId} compact onCancel={() => setIsAddingResource(false)} onResourceAdded={(resource) => { setIsAddingResource(false); chooseResource(resource); }} /></div></div>}</div>;
  }
  const analyzeConcepts = async () => {
    setIsAnalyzingConcepts(true);
    setConceptError(null);
    try {
      const response = await fetch(`/api/resources/${activeResource.id}/concepts`, { method: "POST", credentials: "include" });
      const payload = await response.json() as { error?: string; knowledgeConcepts?: number; knowledgeRelationships?: number; conceptsCreated?: number; relationshipsCreated?: number };
      if (!response.ok) throw new Error(payload.error ?? "Could not analyze concepts");
      updateResource(activeResource.id, { knowledgeStatus: "completed", knowledgeConcepts: payload.conceptsCreated, knowledgeRelationships: payload.relationshipsCreated });
    } catch (error) {
      setConceptError(error instanceof Error ? error.message : "Could not analyze concepts");
    } finally {
      setIsAnalyzingConcepts(false);
    }
  };
  const reprocessResource = async () => {
    updateResource(activeResource.id, { status: "processing", knowledgeError: undefined });
    await fetch(`/api/resources/${activeResource.id}/ingest`, { method: "POST", credentials: "include" }).catch(() => undefined);
  };
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
          {activeResource.status === "ready" && <button onClick={() => void analyzeConcepts()} disabled={isAnalyzingConcepts} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/5 disabled:opacity-50">{isAnalyzingConcepts ? "Building knowledge map..." : activeResource.knowledgeStatus === "completed" ? "Rebuild Knowledge Map" : "Analyze Concepts"}</button>}
          {topicResources.length > 1 && <select value={activeResource.id} onChange={(event) => setSelectedResourceId(event.target.value)} className="max-w-[210px] rounded-lg border border-white/10 bg-[#171916] px-3 py-2 text-xs text-white/70 outline-none"><option value={activeResource.id}>{activeResource.title}</option>{topicResources.filter((resource) => resource.id !== activeResource.id).map((resource) => <option key={resource.id} value={resource.id}>{resource.title}</option>)}</select>}
          <div className="hidden items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs sm:flex">
            Mastery{" "}
            <span className="font-semibold text-[#8cd5af]">{mastery}%</span>
          </div>
        </header>
        {conceptError && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#c9a338]/30 bg-[#c9a338]/10 px-4 py-3 text-xs text-[#ead58c]"><span>{conceptError}</span>{conceptError.includes("no processed transcript segments") && <button onClick={() => void reprocessResource()} className="rounded-lg bg-[#ead58c] px-3 py-2 font-semibold text-[#111210]">Reprocess video</button>}</div>}
        {activeResource.knowledgeStatus === "completed" && <div className="mt-3 rounded-xl border border-[#8cd5af]/20 bg-[#8cd5af]/10 px-4 py-3 text-xs text-[#bcebd0]">Knowledge map updated: {activeResource.knowledgeConcepts ?? 0} concepts and {activeResource.knowledgeRelationships ?? 0} relationships.</div>}
        <div className="grid gap-4 pt-4 lg:grid-cols-[1.55fr_.85fr]">
          <section className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1b1d1a] shadow-2xl">
              <YouTubePlayer url={activeResource.url ?? ""} currentSeconds={time} onTimeChange={handleTimeChange} onSeekReady={handleSeekReady} />
              <div className="border-t border-white/10 bg-[#171916] p-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/50">Context timestamp: {minutes}:{String(seconds).padStart(2, "0")}</span>
                  <div className="ml-auto text-[10px] text-white/30">● live YouTube playback</div>
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
                  onClick={() => setQuestion("What is happening at this moment?")}
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
                  ● Hybrid context retrieval
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-5 overflow-auto p-5">
              {!tutorMessages.length && <div className="rounded-2xl border border-white/10 p-4 text-sm leading-6 text-white/50">Ask a question about the current moment. Answers are grounded in this video&apos;s timestamped transcript.</div>}
              {tutorMessages.map((message, index) => <div key={`${message.question}-${index}`} className="space-y-3"><div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white px-4 py-3 text-sm leading-6 text-neutral-800">{message.question}</div><div className="max-w-[92%]"><div className="mb-2 flex items-center gap-2 text-xs text-white/40"><div className="grid h-6 w-6 place-items-center rounded-md bg-white/10"><Sparkles size={12} /></div>AI Tutor</div><div className="rounded-2xl rounded-tl-md bg-[#20231f] px-4 py-4 text-sm leading-6 text-white/75">{message.answer}</div>{message.citations.length > 0 && <div className="mt-3 rounded-xl border border-white/10 p-3 text-[11px] text-white/40"><div className="font-semibold text-white/60">Based on</div>{message.citations.map((citation) => <button key={citation.segment_id} onClick={() => seekPlayerRef.current(citation.startSeconds)} className="mt-1 block text-left text-[#bcebd0] hover:underline">{citation.label}</button>)}</div>}</div></div>)}
              {isTutorLoading && <div className="rounded-2xl bg-[#20231f] px-4 py-3 text-sm text-white/50">Searching the transcript around this moment...</div>}
              {tutorError && <div className="rounded-xl border border-[#c9a338]/30 bg-[#c9a338]/10 px-4 py-3 text-xs text-[#ead58c]">{tutorError}</div>}
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
                  onKeyDown={(e) => e.key === "Enter" && void askTutor()}
                  placeholder="Ask about this moment..."
                  className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-white/25"
                />
                <button
                  onClick={() => void askTutor()}
                  disabled={isTutorLoading || !question.trim()}
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
