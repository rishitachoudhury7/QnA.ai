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
  Plus,
  ClipboardList,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddResource } from "@/components/resources/AddResource";
import { YouTubePlayer } from "@/components/video/YouTubePlayer";
import { RecommendedVideos, type RecommendedVideosProps } from "@/components/resources/RecommendedVideos";
import { ResourceUnavailableState } from "@/components/learning/ResourceUnavailableState";
import { useAppState, type LearningResource } from "@/lib/state";
function topicLabel(topicId: string) {
  return topicId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toLearningResource(resource: { id: string; topic_id: string | null; type: LearningResource["type"]; title: string; url: string | null; duration_seconds: number | null; status: LearningResource["status"]; metadata?: Record<string, unknown> }): LearningResource {
  return {
    id: resource.id,
    topicId: resource.topic_id,
    type: resource.type,
    title: resource.title,
    url: resource.url ?? undefined,
    duration: resource.duration_seconds ? `${Math.round(resource.duration_seconds / 60)} min` : undefined,
    status: resource.status,
    timestamp: typeof resource.metadata?.timestamp === "string" ? resource.metadata.timestamp : undefined,
    source: typeof resource.metadata?.source === "string" ? resource.metadata.source : undefined,
    error: typeof resource.metadata?.ingestionError === "string" ? resource.metadata.ingestionError : undefined,
    knowledgeStatus: resource.metadata?.knowledgeStatus === "completed" ? "completed" : undefined,
    knowledgeConcepts: typeof resource.metadata?.knowledgeConcepts === "number" ? resource.metadata.knowledgeConcepts : undefined,
    knowledgeRelationships: typeof resource.metadata?.knowledgeRelationships === "number" ? resource.metadata.knowledgeRelationships : undefined,
    knowledgeError: typeof resource.metadata?.knowledgeError === "string" ? resource.metadata.knowledgeError : undefined,
  };
}

type TutorMessage = { question: string; answer: string; citations: Array<{ segment_id: string; label: string; startSeconds: number }> };
type QuickCheckState = { assessmentId: string; conceptId: string; conceptName: string; question: string; options: string[]; correctAnswer: string; explanation: string };
type TeachBackResult = { score: number; feedback: string; misconceptions: string[]; strengths: string[]; followUpQuestions?: string[] };
type LearningConcept = { id: string; name: string; description: string | null; relevance: number; mastery: number; confidence: number; evidenceCount: number; lastAssessedAt: string | null };
type LearningContext = { resource: { id: string; title: string; status: LearningResource["status"]; topic_id: string | null }; topic: { id: string; title: string; description: string | null } | null; concepts: LearningConcept[]; currentConcept: LearningConcept | null };

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
          <Link href="/paths" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white"><ArrowLeft size={16} /> Learning Path</Link>
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
  const routeId = String(params.resourceId ?? "linear-regression").toLowerCase();
  const isResourceRoute = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(routeId);
  const { mastery, setMastery, resources, isResourcesLoading, createResource, updateResource } = useAppState();
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [directResource, setDirectResource] = useState<LearningResource | null>(null);
  const [resourceAccessError, setResourceAccessError] = useState<string | null>(null);
  const [resolvedTopic, setResolvedTopic] = useState<{ id: string; title: string; description: string | null } | null>(null);
  const [learningContext, setLearningContext] = useState<LearningContext | null>(null);
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [isAnalyzingConcepts, setIsAnalyzingConcepts] = useState(false);
  const [conceptError, setConceptError] = useState<string | null>(null);
  const topicResources = useMemo(() => resources.filter((resource) => resource.topicId === routeId || resource.id === routeId), [resources, routeId]);
  const activeResource = topicResources.find((resource) => resource.id === selectedResourceId) ?? topicResources[0] ?? directResource;
  const isDirectResourceLoading = isResourceRoute && !activeResource && !resolvedTopic && !resourceAccessError;
  const contextForActiveResource = learningContext?.resource.id === activeResource?.id ? learningContext : null;
  const isLearningContextLoading = Boolean(activeResource && !contextForActiveResource);
  const topicId = contextForActiveResource?.topic?.id ?? activeResource?.topicId ?? resolvedTopic?.id ?? routeId;
  const topic = contextForActiveResource?.topic?.title ?? resolvedTopic?.title ?? (activeResource?.topicId ? "Learning topic" : topicLabel(routeId));
  const currentConcept = contextForActiveResource?.currentConcept ?? null;
  const currentMastery = contextForActiveResource ? mastery : 0;
  const masteryLabel = currentMastery >= 70 ? "Strong" : currentMastery >= 40 ? "Developing" : "Needs work";
  const current = currentConcept?.name ?? (isLearningContextLoading ? "Loading concept..." : "No concept analyzed yet");
  useEffect(() => {
    if (!isResourceRoute || topicResources.some((resource) => resource.id === routeId)) {
      return;
    }
    let active = true;
    void fetch(`/api/resources/${routeId}`, { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json() as { kind?: "resource" | "topic"; topic?: { id: string; title: string; description: string | null }; error?: string; id?: string; topic_id?: string | null; type?: LearningResource["type"]; title?: string; url?: string | null; duration_seconds?: number | null; status?: LearningResource["status"]; metadata?: Record<string, unknown> };
        if (response.ok && payload.kind === "topic" && payload.topic) {
          setResolvedTopic(payload.topic);
          return null;
        }
        if (!response.ok) throw Object.assign(new Error(payload.error ?? "Could not load resource"), { status: response.status });
        if (!payload.id || !payload.type || !payload.title || !payload.status) throw new Error("Resource response was incomplete");
        return toLearningResource({ id: payload.id, topic_id: payload.topic_id ?? null, type: payload.type, title: payload.title, url: payload.url ?? null, duration_seconds: payload.duration_seconds ?? null, status: payload.status, metadata: payload.metadata });
      })
      .then((resource) => { if (active && resource) setDirectResource(resource); })
      .catch((error: unknown) => { if (active) setResourceAccessError(error instanceof Error ? error.message : "Could not load resource"); });
    return () => { active = false; };
  }, [isResourceRoute, routeId, topicResources]);
  useEffect(() => {
    if (!activeResource?.id) return;
    void fetch(`/api/resources/${activeResource.id}/learning-context`, { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json() as LearningContext & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Could not load learning context");
        return payload;
      })
      .then((context) => {
        setLearningContext(context);
        setMastery(context.currentConcept?.mastery ?? 0);
      })
      .catch((error) => setConceptError(error instanceof Error ? error.message : "Could not load learning context"));
  }, [activeResource?.id, setMastery]);
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
  const [time, setTime] = useState(0);
  const [quick, setQuick] = useState(false);
  const [teach, setTeach] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [quickChecks, setQuickChecks] = useState<QuickCheckState[] | null>(null);
  const [quickCheckIndex, setQuickCheckIndex] = useState(0);
  const [isQuickLoading, setIsQuickLoading] = useState(false);
  const [quickResult, setQuickResult] = useState<boolean | null>(null);
  const [learnerError, setLearnerError] = useState<string | null>(null);
  const [teachResult, setTeachResult] = useState<TeachBackResult | null>(null);
  const [isTeachSubmitting, setIsTeachSubmitting] = useState(false);
  const [question, setQuestion] = useState("");
  const [explanation, setExplanation] = useState("");
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);
  
  // Assignment state
  const [assignment, setAssignment] = useState(false);
  const [assignmentChecks, setAssignmentChecks] = useState<QuickCheckState[] | null>(null);
  const [assignmentAnswers, setAssignmentAnswers] = useState<Record<number, number>>({});
  const [isAssignmentLoading, setIsAssignmentLoading] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<{ isCorrect: boolean; score: number } | null>(null);
  const [completedQuickChecks, setCompletedQuickChecks] = useState<Set<string>>(new Set());

  const seekPlayerRef = useRef<(seconds: number) => void>(() => undefined);
  const lastWatchedBucketRef = useRef(0);
  useEffect(() => {
    if (!activeResource?.id || activeResource.status !== "ready") return;
    void fetch("/api/learning/interactions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ interactionType: "RESOURCE_OPENED", resourceId: activeResource.id, topicId: activeResource.topicId, metadata: { title: activeResource.title } }) }).catch(() => undefined);
  }, [activeResource?.id, activeResource?.status, activeResource?.topicId, activeResource?.title]);
  useEffect(() => {
    if (!activeResource?.id || activeResource.status !== "ready") return;
    const bucket = Math.floor(time / 30);
    if (bucket < 1 || bucket === lastWatchedBucketRef.current) return;
    lastWatchedBucketRef.current = bucket;
    void fetch("/api/learning/interactions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ interactionType: "VIDEO_WATCH", resourceId: activeResource.id, topicId: activeResource.topicId, conceptId: currentConcept?.id, metadata: { start_seconds: (bucket - 1) * 30, end_seconds: bucket * 30, duration_seconds: 30 } }) }).catch(() => undefined);
  }, [activeResource?.id, activeResource?.status, activeResource?.topicId, currentConcept?.id, time]);
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
      void fetch("/api/learning/interactions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ interactionType: "QUESTION", resourceId: activeResource.id, topicId: activeResource.topicId, metadata: { question: submittedQuestion, current_time: time } }) }).catch(() => undefined);
      const contextById = new Map((payload.context ?? []).map((segment) => [segment.id, segment.startSeconds]));
      setTutorMessages((messages) => [...messages, { question: submittedQuestion, answer: payload.answer!, citations: (payload.citations ?? []).map((citation) => ({ ...citation, startSeconds: contextById.get(citation.segment_id) ?? 0 })) }]);
      setQuestion("");
    } catch (error) {
      setTutorError(error instanceof Error ? error.message : "Could not answer from this video");
    } finally { setIsTutorLoading(false); }
  };
  const openQuickCheck = async () => {
    setQuick(true);
    setAnswer(null);
    setQuickResult(null);
    setLearnerError(null);
    setIsQuickLoading(true);
    try {
      const response = await fetch(`/api/resources/${activeResource.id}/quick-check`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conceptId: currentConcept?.id }) });
      const payload = await response.json() as { quickChecks?: Array<{ question: string; options: string[]; correctAnswer: string; explanation: string }>; assessments?: Array<{ id: string }>; concept?: { id: string; name: string }; error?: string };
      if (!response.ok || !payload.quickChecks || !payload.assessments || !payload.concept) throw new Error(payload.error ?? "Could not create Quick Check");
      setQuickChecks(payload.quickChecks.map((qc, i) => ({ ...qc, assessmentId: payload.assessments![i].id, conceptId: payload.concept!.id, conceptName: payload.concept!.name })));
      setQuickCheckIndex(0);
    } catch (error) { setLearnerError(error instanceof Error ? error.message : "Could not create Quick Check"); }
    finally { setIsQuickLoading(false); }
  };
  const submit = async () => {
    const currentQuickCheck = quickChecks?.[quickCheckIndex];
    if (!currentQuickCheck || answer === null) return;
    setLearnerError(null);
    try {
      const response = await fetch(`/api/resources/${activeResource.id}/quick-check/attempt`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assessmentId: currentQuickCheck.assessmentId, answer: currentQuickCheck.options[answer] }) });
      const payload = await response.json() as { isCorrect?: boolean; explanation?: string; mastery?: { mastery_score: number }; error?: string };
      if (!response.ok || typeof payload.isCorrect !== "boolean") throw new Error(payload.error ?? "Could not submit Quick Check");
      setQuickResult(payload.isCorrect);
      setMastery(Number(payload.mastery?.mastery_score ?? mastery));
      setLearnerError(payload.explanation ?? currentQuickCheck.explanation);
    } catch (error) { setLearnerError(error instanceof Error ? error.message : "Could not submit Quick Check"); }
  };
  const handleNextQuickCheck = () => {
    if (quickChecks && quickCheckIndex < quickChecks.length - 1) {
      setQuickCheckIndex(quickCheckIndex + 1);
      setAnswer(null);
      setQuickResult(null);
      setLearnerError(null);
    } else {
      if (currentConcept) {
        setCompletedQuickChecks((prev) => new Set(prev).add(currentConcept.id));
      }
      setQuick(false);
    }
  };

  const prefetchAssignment = useCallback(async () => {
    if (assignmentChecks || isAssignmentLoading) return;
    setIsAssignmentLoading(true);
    try {
      const response = await fetch(`/api/resources/${activeResource?.id}/assignment`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conceptId: currentConcept?.id }) });
      const payload = await response.json() as { assignments?: Array<{ question: string; options: string[]; correctAnswer: string; explanation: string }>; assessments?: Array<{ id: string }>; concept?: { id: string; name: string }; error?: string };
      if (!response.ok || !payload.assignments || !payload.assessments || !payload.concept) throw new Error(payload.error ?? "Could not create Assignment");
      setAssignmentChecks(payload.assignments.map((qc, i) => ({ ...qc, assessmentId: payload.assessments![i].id, conceptId: payload.concept!.id, conceptName: payload.concept!.name })));
    } catch (error) { console.error("Prefetch assignment error", error); }
    finally { setIsAssignmentLoading(false); }
  }, [activeResource?.id, currentConcept?.id, assignmentChecks, isAssignmentLoading]);

  useEffect(() => {
    let active = true;
    if (currentMastery >= 50 && !assignmentChecks && !isAssignmentLoading && activeResource?.id && currentConcept?.id) {
       setTimeout(() => {
         if (active) void prefetchAssignment();
       }, 0);
    }
    return () => { active = false; };
  }, [currentMastery, assignmentChecks, isAssignmentLoading, activeResource?.id, currentConcept?.id, prefetchAssignment]);

  const openAssignment = async () => {
    setAssignment(true);
    setAssignmentAnswers({});
    setAssignmentResult(null);
    setLearnerError(null);
    if (!assignmentChecks) {
       await prefetchAssignment();
    }
  };

  const submitAssignment = async () => {
    if (!assignmentChecks || Object.keys(assignmentAnswers).length < assignmentChecks.length) {
      setLearnerError("Please answer all questions before submitting.");
      return;
    }
    setLearnerError(null);
    try {
      const answersList = assignmentChecks.map((check, index) => ({
        assessmentId: check.assessmentId,
        answer: check.options[assignmentAnswers[index]]
      }));
      const response = await fetch(`/api/resources/${activeResource.id}/assignment/attempt`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: answersList, conceptId: currentConcept?.id }) });
      const payload = await response.json() as { isCorrect?: boolean; score?: number; mastery?: { mastery_score: number }; error?: string };
      if (!response.ok || typeof payload.isCorrect !== "boolean") throw new Error(payload.error ?? "Could not submit Assignment");
      setAssignmentResult({ isCorrect: payload.isCorrect, score: payload.score ?? 0 });
      setMastery(Number(payload.mastery?.mastery_score ?? mastery));
    } catch (error) { setLearnerError(error instanceof Error ? error.message : "Could not submit Assignment"); }
  };

  const submitTeach = async () => {
    if (!explanation.trim() || isTeachSubmitting) return;
    setIsTeachSubmitting(true);
    setLearnerError(null);
    try {
      const response = await fetch(`/api/resources/${activeResource.id}/teach-back`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ explanation, conceptId: currentConcept?.id ?? quickChecks?.[0]?.conceptId }) });
      const payload = await response.json() as { evaluation?: TeachBackResult; mastery?: { mastery_score: number }; error?: string };
      if (!response.ok || !payload.evaluation) throw new Error(payload.error ?? "Could not evaluate teach-back");
      setTeachResult(payload.evaluation);
      setMastery(Number(payload.mastery?.mastery_score ?? mastery));
    } catch (error) { setLearnerError(error instanceof Error ? error.message : "Could not evaluate teach-back"); }
    finally { setIsTeachSubmitting(false); }
  };
  if (isResourcesLoading) {
    return <div className="grid min-h-screen place-items-center bg-[#111210] text-sm text-white/50">Preparing your learning room...</div>;
  }
  if (!activeResource && isDirectResourceLoading) {
    return <div className="grid min-h-screen place-items-center bg-[#111210] text-sm text-white/50">Loading your learning resource...</div>;
  }
  if (!activeResource && resolvedTopic) {
    return <ResourceRequiredState topicId={resolvedTopic.id} topic={resolvedTopic.title} onResourceAdded={chooseResource} onChoose={chooseRecommended} />;
  }
  if (!activeResource && isResourceRoute && !isDirectResourceLoading) {
    return <ResourceUnavailableState resourceId={routeId} unauthorized={resourceAccessError === "Unauthorized"} />;
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
    return <div className="grid min-h-screen place-items-center bg-[#111210] px-6 text-center text-white"><div><BookOpen className="mx-auto text-[#c9a338]" size={30} /><h1 className="mt-5 text-2xl font-semibold">We couldn&apos;t prepare this resource.</h1><p className="mt-2 max-w-md text-sm leading-6 text-white/50">{activeResource.error ?? "The transcript or video could not be processed."}</p><div className="mt-6 flex flex-wrap justify-center gap-3"><button onClick={() => setIsAddingResource(true)} className="inline-flex items-center rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10">Add a different resource</button><button onClick={() => void retry()} className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black">Try processing it again</button></div></div></div>;
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
            href="/paths"
            className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{activeResource.title}</div>
            <div className="text-xs text-white/40">
              {topic} · Learning Room
            </div>
          </div>
          {activeResource.status === "ready" && <button onClick={() => void analyzeConcepts()} disabled={isAnalyzingConcepts} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/5 disabled:opacity-50">{isAnalyzingConcepts ? "Building knowledge map..." : activeResource.knowledgeStatus === "completed" ? "Rebuild Knowledge Map" : "Analyze Concepts"}</button>}
          <div className="hidden items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs sm:flex">
            Mastery{" "}
            <span className="font-semibold text-[#8cd5af]">{isLearningContextLoading ? "..." : `${currentMastery}%`}</span>
          </div>
        </header>
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {topicResources.map((resource) => (
            <button
              key={resource.id}
              onClick={() => chooseResource(resource)}
              className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium ${activeResource.id === resource.id ? "border-white bg-white text-black" : "border-white/10 text-white/60 hover:bg-white/5 hover:text-white"}`}
            >
              {resource.title}
            </button>
          ))}
          <button
            onClick={() => setIsAddingResource(true)}
            className="flex items-center gap-1 whitespace-nowrap rounded-lg border border-dashed border-white/20 px-3 py-1.5 text-xs font-medium text-white/60 hover:border-white/40 hover:text-white"
          >
            <Plus size={14} /> Add Resource
          </button>
        </div>
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
                  <p className="mt-1 max-w-xl text-sm leading-6 text-white/45">{currentConcept?.description ?? (isLearningContextLoading ? "Loading the concepts linked to this resource." : "Analyze this resource to unlock grounded learner checks.")}</p>
                </div>
                <div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${currentMastery >= 70 ? "bg-[#244338] text-[#bcebd0]" : currentMastery >= 40 ? "bg-[#4b4021] text-[#ead58c]" : "bg-[#3b2727] text-[#e39a9a]"}`}>
                  {isLearningContextLoading ? "Loading" : `${currentMastery}% · ${masteryLabel}`}
                </div>
              </div>
              {currentConcept && <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-white/40"><span>Evidence: {currentConcept.evidenceCount}</span><span>Confidence: {currentConcept.confidence}%</span>{currentConcept.lastAssessedAt && <span>Assessed {new Date(currentConcept.lastAssessedAt).toLocaleDateString()}</span>}</div>}
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <button
                  onClick={() => setQuestion("What is happening at this moment?")}
                  className="rounded-xl border border-white/10 px-3 py-3 text-left text-xs font-semibold hover:bg-white/5"
                >
                  <Sparkles size={14} className="mb-2 text-[#8cd5af]" />
                  Ask about this moment
                </button>
                <button
                  onClick={() => void openQuickCheck()}
                  disabled={!currentConcept || isLearningContextLoading || (currentConcept && completedQuickChecks.has(currentConcept.id)) as boolean}
                  className="rounded-xl border border-white/10 px-3 py-3 text-left text-xs font-semibold hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Check size={14} className={`mb-2 ${(currentConcept && completedQuickChecks.has(currentConcept.id)) ? "text-[#8cd5af]" : "text-[#c9a338]"}`} />
                  {(currentConcept && completedQuickChecks.has(currentConcept.id)) ? "Quick Check Done" : "Quick Check"}
                </button>
                <button
                  onClick={() => { setTeachResult(null); setLearnerError(null); setTeach(true); }}
                  disabled={!currentConcept || isLearningContextLoading}
                  className="rounded-xl border border-white/10 px-3 py-3 text-left text-xs font-semibold hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Mic size={14} className="mb-2 text-[#9ab0ff]" />
                  Teach Back
                </button>
                <button
                  onClick={() => void openAssignment()}
                  disabled={!currentConcept || isLearningContextLoading || currentMastery < 75}
                  className="rounded-xl border border-white/10 px-3 py-3 text-left text-xs font-semibold hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ClipboardList size={14} className="mb-2 text-[#bcebd0]" />
                  Assignment
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
        {isAddingResource && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }} className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-[#f7f7f4] p-5 text-left text-neutral-900 sm:p-8">
              <AddResource topic={topicId} compact onCancel={() => setIsAddingResource(false)} onResourceAdded={(resource) => { setIsAddingResource(false); chooseResource(resource); }} />
            </motion.div>
          </div>
        )}
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
                  <h2 className="mt-1 text-xl font-semibold">{quickChecks?.[quickCheckIndex]?.question ?? (isQuickLoading ? "Creating a grounded question..." : "Quick Check unavailable")}</h2>
                </div>
                <button onClick={() => setQuick(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="mt-5 space-y-2">
                {(quickChecks?.[quickCheckIndex]?.options ?? []).map((option, i) => (
                  <button
                    key={option}
                    onClick={() => setAnswer(i)}
                    className={`w-full rounded-xl border p-3 text-left text-sm ${answer === i ? "border-black bg-neutral-50" : "border-neutral-200"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {quickResult !== null && <div className="mt-4 rounded-xl bg-[#edf6f1] p-4"><div className="font-semibold text-[#1f7a5a]">{quickResult ? "Correct" : "Not quite"}</div><div className="mt-1 text-sm text-neutral-600">{learnerError ?? quickChecks?.[quickCheckIndex]?.explanation}</div></div>}
              {answer !== null && (
                <div className="mt-5 rounded-xl bg-[#edf6f1] p-4">
                  <div className="font-semibold text-[#1f7a5a]">Answer selected</div>
                  <div className="mt-1 text-sm text-neutral-600">Submit to see grounded feedback and update evidence-based mastery.</div>
                </div>
              )}
              {answer !== null && quickResult === null && (
                <button
                  onClick={() => void submit()}
                  disabled={!quickChecks?.[quickCheckIndex] || quickResult !== null}
                  className="mt-4 w-full rounded-xl bg-black py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Submit answer
                </button>
              )}
              {quickResult !== null && (
                <button
                  onClick={handleNextQuickCheck}
                  className="mt-4 w-full rounded-xl bg-black py-3 text-sm font-semibold text-white"
                >
                  {quickChecks && quickCheckIndex < quickChecks.length - 1 ? "Next question" : "Finish"}
                </button>
              )}
            </motion.div>
          </div>
        )}
        {assignment && (
          <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/70 p-4 py-12 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="w-full max-w-2xl rounded-2xl bg-white p-6 text-neutral-900 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="eyebrow text-neutral-400">Concept Assignment</div>
                  <h2 className="mt-1 text-xl font-semibold">
                    {isAssignmentLoading ? "Creating your assignment..." : assignmentChecks ? "Complete all questions" : "Assignment unavailable"}
                  </h2>
                </div>
                <button onClick={() => setAssignment(false)}>
                  <X size={18} />
                </button>
              </div>
              
              {assignmentChecks && assignmentResult === null && (
                <div className="mt-5 space-y-8">
                  {assignmentChecks.map((check, index) => (
                    <div key={check.assessmentId} className="space-y-3">
                      <div className="font-medium">{index + 1}. {check.question}</div>
                      <div className="space-y-2">
                        {check.options.map((option, optIdx) => (
                          <button
                            key={option}
                            onClick={() => setAssignmentAnswers(prev => ({ ...prev, [index]: optIdx }))}
                            className={`w-full rounded-xl border p-3 text-left text-sm ${assignmentAnswers[index] === optIdx ? "border-black bg-neutral-50" : "border-neutral-200"}`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {learnerError && <div className="text-sm text-red-500">{learnerError}</div>}
                  <button
                    onClick={() => void submitAssignment()}
                    className="mt-6 w-full rounded-xl bg-black py-3 text-sm font-semibold text-white"
                  >
                    Submit Assignment
                  </button>
                </div>
              )}

              {assignmentResult !== null && (
                <div className="mt-5 rounded-xl bg-[#edf6f1] p-6 text-center">
                  <div className="text-4xl font-bold text-[#1f7a5a]">
                    {assignmentResult.score}%
                  </div>
                  <div className="mt-2 font-semibold text-[#1f7a5a]">
                    {assignmentResult.isCorrect ? "Perfect! Mastery updated to 100%." : "Good effort. Review the material and try again to reach 100% mastery."}
                  </div>
                  <button
                    onClick={() => setAssignment(false)}
                    className="mt-6 w-full rounded-xl bg-black py-3 text-sm font-semibold text-white"
                  >
                    Close
                  </button>
                </div>
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
                Explain {quickChecks?.[0]?.conceptName ?? "this concept"}
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
                  onClick={() => void submitTeach()}
                  disabled={!explanation.trim() || isTeachSubmitting}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {isTeachSubmitting ? "Evaluating..." : "Submit explanation"} <ChevronRight size={16} />
                </button>
              </div>
              {teachResult && <div className="mt-5 rounded-xl bg-[#edf6f1] p-4 text-sm"><div className="font-semibold">Understanding score: {Math.round(teachResult.score * 100)}%</div><p className="mt-2 text-neutral-700">{teachResult.feedback}</p>{teachResult.misconceptions.length > 0 && <p className="mt-2 text-[#8b3a3a]">Review: {teachResult.misconceptions.join(" ")}</p>}{teachResult.followUpQuestions && teachResult.followUpQuestions.length > 0 && <div className="mt-4 border-t border-[#1f7a5a]/20 pt-3"><div className="font-semibold text-[#1f7a5a]">Follow-up questions to ponder:</div><ul className="mt-2 list-inside list-disc text-neutral-700">{teachResult.followUpQuestions.map((q, i) => <li key={i} className="mt-1">{q}</li>)}</ul></div>}</div>}
              {learnerError && <div className="mt-4 rounded-xl border border-[#c9a338]/30 bg-[#c9a338]/10 p-3 text-xs text-[#8b6500]">{learnerError}</div>}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
