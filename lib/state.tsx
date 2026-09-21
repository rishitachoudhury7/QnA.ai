"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";

export type LearningGoal = {
  id: string;
  title: string;
  level?: "beginner" | "intermediate" | "advanced";
  objective?: string;
};

export type LearningPath = {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  version: number;
  modules: Array<{ id: string; title: string; description?: string; position: number; topics: Array<{ id: string; title: string; description?: string; position: number }> }>;
};

export type LearningResource = {
  id: string;
  topicId: string | null;
  type: "youtube" | "pdf" | "excel" | "file";
  title: string;
  url?: string;
  duration?: string;
  timestamp?: string;
  source?: string;
  status?: "pending" | "processing" | "ready" | "failed";
  error?: string;
  knowledgeStatus?: "completed";
  knowledgeConcepts?: number;
  knowledgeRelationships?: number;
  knowledgeError?: string;
};

type Ctx = {
  mastery: number;
  setMastery: (n: number) => void;
  showTutor: boolean;
  setShowTutor: (v: boolean) => void;
  recommendation: string;
  addResource: (
    resource: Omit<LearningResource, "id"> | string,
    topicId?: string,
  ) => LearningResource;
  createResource: (resource: Omit<LearningResource, "id" | "status">) => Promise<LearningResource | null>;
  updateResource: (id: string, updates: Partial<LearningResource>) => void;
  resources: LearningResource[];
  getResourcesForTopic: (topicId: string) => LearningResource[];
  isResourcesLoading: boolean;
  goal: LearningGoal | null;
  goals: LearningGoal[];
  isStateLoading: boolean;
  saveGoal: (goal: Omit<LearningGoal, "id">) => Promise<{ generationError?: string; authRequired?: boolean; saveFailed?: boolean }>;
  updateGoal: (goal: LearningGoal) => void;
  paths: LearningPath[];
};
const StateContext = createContext<Ctx | null>(null);
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [mastery, setMastery] = useState(42);
  const [showTutor, setShowTutor] = useState(true);
  const [recommendation, setRecommendation] = useState(
    "Review Gradient Descent — 7 min",
  );
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [isResourcesLoading, setIsResourcesLoading] = useState(true);
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [isStateLoading, setIsStateLoading] = useState(true);
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setIsResourcesLoading(false);
      return;
    }
    let active = true;
    const loadResources = async () => {
      try {
        const stored = window.localStorage.getItem("qna-ai-resources") ?? window.localStorage.getItem("learnwise-resources");
        if (stored) setResources(JSON.parse(stored) as LearningResource[]);
        const response = await fetch("/api/resources", { credentials: "include" });
        if (response.ok && active) {
          const remote = (await response.json()) as Array<{ id: string; topic_id: string | null; type: LearningResource["type"]; title: string; url: string | null; duration_seconds: number | null; status: LearningResource["status"]; metadata: Record<string, unknown> }>;
          setResources(remote.map((resource) => ({
            id: resource.id,
            topicId: resource.topic_id,
            type: resource.type,
            title: resource.title,
            url: resource.url ?? undefined,
            duration: resource.duration_seconds ? `${Math.round(resource.duration_seconds / 60)} min` : undefined,
            timestamp: typeof resource.metadata.timestamp === "string" ? resource.metadata.timestamp : undefined,
            source: typeof resource.metadata.source === "string" ? resource.metadata.source : undefined,
            status: resource.status,
            error: typeof resource.metadata.ingestionError === "string" ? resource.metadata.ingestionError : undefined,
            knowledgeStatus: resource.metadata.knowledgeStatus === "completed" ? "completed" : undefined,
            knowledgeConcepts: typeof resource.metadata.knowledgeConcepts === "number" ? resource.metadata.knowledgeConcepts : undefined,
            knowledgeRelationships: typeof resource.metadata.knowledgeRelationships === "number" ? resource.metadata.knowledgeRelationships : undefined,
            knowledgeError: typeof resource.metadata.knowledgeError === "string" ? resource.metadata.knowledgeError : undefined,
          })));
        }
      } catch {
        window.localStorage.removeItem("qna-ai-resources");
        window.localStorage.removeItem("learnwise-resources");
      } finally {
        if (active) setIsResourcesLoading(false);
      }
    };
    void loadResources();
    return () => { active = false; };
  }, [isLoaded, isSignedIn]);
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setIsStateLoading(false);
      return;
    }
    let active = true;
    fetch("/api/paths", { credentials: "include" })
      .then(async (response) => response.ok ? await response.json() as Array<{ id: string; goal_id: string; title: string; description: string | null; version: number; modules: LearningPath["modules"] }> : [])
      .then((remote) => {
        if (active) setPaths(remote.map((path) => ({ ...path, goalId: path.goal_id, description: path.description ?? undefined })));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [isLoaded, isSignedIn]);
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let active = true;
    const loadGoals = async () => {
      try {
        const stored = window.localStorage.getItem("qna-ai-goals") ?? window.localStorage.getItem("learnwise-goals");
        if (stored) setGoals(JSON.parse(stored) as LearningGoal[]);
        const response = await fetch("/api/goals", { credentials: "include" });
        if (response.ok && active) {
          const remote = (await response.json()) as Array<{ id: string; title: string; skill_level: LearningGoal["level"] | null; objective: string | null }>;
          setGoals(remote.map((goal) => ({ id: goal.id, title: goal.title, level: goal.skill_level ?? undefined, objective: goal.objective ?? undefined })));
        }
      } catch {
        window.localStorage.removeItem("qna-ai-goals");
        window.localStorage.removeItem("learnwise-goals");
      } finally {
        if (active) setIsStateLoading(false);
      }
    };
    void loadGoals();
    return () => { active = false; };
  }, [isLoaded, isSignedIn]);
  useEffect(() => {
    if (!isStateLoading) {
      window.localStorage.setItem("qna-ai-goals", JSON.stringify(goals));
    }
  }, [goals, isStateLoading]);
  useEffect(() => {
    window.localStorage.setItem("qna-ai-resources", JSON.stringify(resources));
  }, [resources]);
  const saveGoal = async (input: Omit<LearningGoal, "id">) => {
    if (!isLoaded || !isSignedIn) return { authRequired: true };
    const temporaryId = crypto.randomUUID();
    setGoals((current) => [...current, { ...input, id: temporaryId }]);
    try {
      const response = await fetch("/api/goals", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const payload = await response.json() as { goal?: { id: string }; generationError?: string; error?: string; code?: string; path?: LearningPath & { goal_id?: string } };
      if (response.status === 401 || payload.code === "AUTH_REQUIRED") {
        setGoals((current) => current.filter((item) => item.id !== temporaryId));
        return { authRequired: true };
      }
      if (!response.ok || !payload.goal) throw new Error(payload.error ?? "Could not save goal");
      setGoals((current) => current.map((item) => item.id === temporaryId ? { ...item, id: payload.goal!.id } : item));
      if (payload.path) {
        const generatedPath = { ...payload.path, goalId: payload.path.goal_id ?? payload.path.goalId };
        setPaths((current) => [generatedPath, ...current.filter((path) => path.id !== generatedPath.id)]);
      }
      return { generationError: payload.generationError };
    } catch (error) {
      setGoals((current) => current.filter((item) => item.id !== temporaryId));
      return { generationError: error instanceof Error ? error.message : "Could not save goal", saveFailed: true };
    }
  };
  const updateGoal = (updated: LearningGoal) => {
    setGoals((current) =>
      current.map((goal) => (goal.id === updated.id ? updated : goal)),
    );
    void fetch(`/api/goals/${updated.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    }).catch(() => undefined);
  };
  const addResource = (
    input: Omit<LearningResource, "id"> | string,
    topicId = "general",
  ) => {
    const resource: LearningResource =
      typeof input === "string"
        ? {
            id: crypto.randomUUID(),
            topicId,
            type: "youtube",
            title: input.trim(),
            url: input.trim(),
          }
        : { ...input, id: crypto.randomUUID(), status: "ready" };
    if (!resource.title.trim()) return resource;
    setResources((current) => [resource, ...current]);
    void fetch("/api/resources", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topicId: resource.topicId,
        type: resource.type,
        title: resource.title,
        url: resource.url,
        metadata: { timestamp: resource.timestamp, source: resource.source },
      }),
    }).then(async (response) => {
      if (!response.ok) return;
      const saved = await response.json() as { id: string; topic_id: string | null };
      setResources((current) => current.map((item) => item.id === resource.id ? { ...item, id: saved.id, topicId: saved.topic_id ?? item.topicId } : item));
    }).catch(() => undefined);
    setRecommendation("Continue with your newly added resource");
    return resource;
  };
  const createResource = async (input: Omit<LearningResource, "id" | "status">) => {
    try {
      const response = await fetch("/api/resources", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: input.topicId,
          type: input.type,
          title: input.title,
          url: input.url,
          metadata: { timestamp: input.timestamp, source: input.source },
        }),
      });
      if (!response.ok) return null;
      const saved = await response.json() as { id: string; topic_id: string | null; type: LearningResource["type"]; title: string; url: string | null; status: LearningResource["status"] };
      const resource = { ...input, id: saved.id, topicId: saved.topic_id, status: saved.status };
      setResources((current) => [resource, ...current.filter((item) => item.id !== resource.id)]);
      return resource;
    } catch {
      return null;
    }
  };
  const updateResource = (id: string, updates: Partial<LearningResource>) => {
    setResources((current) => current.map((resource) => resource.id === id ? { ...resource, ...updates } : resource));
  };
  const getResourcesForTopic = useCallback(
    (topicId: string) => resources.filter((resource) => resource.topicId === topicId),
    [resources],
  );
  const value = useMemo(
    () => ({
      mastery,
      setMastery,
      showTutor,
      setShowTutor,
      recommendation,
      addResource,
      createResource,
      updateResource,
      resources,
      getResourcesForTopic,
      isResourcesLoading,
      goal: goals[0] ?? null,
      goals,
      paths,
      isStateLoading,
      saveGoal,
      updateGoal,
    }),
    [mastery, showTutor, recommendation, resources, goals, paths, isStateLoading, isResourcesLoading, getResourcesForTopic],
  );
  return (
    <StateContext.Provider value={value}>{children}</StateContext.Provider>
  );
}
export function useAppState() {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error("useAppState must be inside AppStateProvider");
  return ctx;
}
