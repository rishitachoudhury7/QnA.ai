"use client";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CircleAlert, Sparkles, X } from "lucide-react";
import { useAppState } from "@/lib/state";
const initial = [
  ["Machine Learning", 50, 9, 100, "strong"],
  ["Python", 10, 31, 86, "strong"],
  ["Statistics", 43, 29, 64, "developing"],
  ["Linear Algebra", 75, 29, 46, "attention"],
  ["Linear Regression", 34, 53, 72, "strong"],
  ["Classification", 67, 53, 61, "developing"],
  ["Gradient Descent", 34, 78, 42, "attention"],
  ["Optimization", 68, 78, 29, "attention"],
];
type ConceptNodeData = { name: string; mastery: number; state: string };
function Node({ data }: { data: ConceptNodeData }) {
  const s = data.state;
  const dot =
    s === "strong"
      ? "#35a66d"
      : s === "developing"
        ? "#d4a83b"
        : s === "attention"
          ? "#d35a5a"
          : "#bcbcb5";
  return (
    <div className="relative min-w-[150px] rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(0,0,0,.06)]">
      <Handle type="target" position={Position.Top} className="!invisible" />
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
        <span className="text-xs font-semibold">{data.name}</span>
      </div>
      <div className="mt-2 text-xl font-semibold">{data.mastery}%</div>
      <div className="mt-0.5 text-[10px] capitalize text-neutral-400">
        {s.replace("-", " ")}
      </div>
      <Handle type="source" position={Position.Bottom} className="!invisible" />
    </div>
  );
}
export function KnowledgeMap() {
  const { mastery } = useAppState();
  const [selected, setSelected] = useState<string | null>(null);
  const nodeTypes = useMemo(() => ({ concept: Node }), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initial.map(([name, x, y, m, s], i) => ({
      id: String(i),
      type: "concept",
      position: { x: Number(x) * 7, y: Number(y) * 5 },
      data: {
        name,
        mastery: name === "Gradient Descent" && mastery > 42 ? mastery : m,
        state: s,
      },
    })),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 4],
      [2, 4],
      [2, 5],
      [3, 5],
      [4, 6],
      [4, 7],
    ].map(([a, b], i) => ({
      id: `e${i}`,
      source: String(a),
      target: String(b),
      animated: i === 7,
      style: { stroke: "#cfcfc8" },
    })),
  );
  useEffect(() => {
    let active = true;
    fetch("/api/knowledge-map", { credentials: "include" })
      .then(async (response) => response.ok ? await response.json() as { concepts: Array<{ id: string; name: string; mastery: number }>; relationships: Array<{ id: string; source_concept_id: string; target_concept_id: string; relationship_type: string }> } : null)
      .then((graph) => {
        if (!active || !graph?.concepts.length) return;
        setNodes(graph.concepts.map((concept, index) => ({
          id: concept.id,
          type: "concept",
          position: { x: (index % 4) * 190, y: Math.floor(index / 4) * 150 },
          data: { name: concept.name, mastery: concept.mastery, state: concept.mastery >= 70 ? "strong" : concept.mastery > 0 ? "developing" : "attention" },
        })));
        const conceptIds = new Set(graph.concepts.map((concept) => concept.id));
        setEdges(graph.relationships.filter((relationship) => conceptIds.has(relationship.source_concept_id) && conceptIds.has(relationship.target_concept_id)).map((relationship) => ({
          id: relationship.id,
          source: relationship.source_concept_id,
          target: relationship.target_concept_id,
          animated: relationship.relationship_type === "prerequisite_of",
          label: relationship.relationship_type.replaceAll("_", " "),
          style: { stroke: "#cfcfc8" },
        })));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [setEdges, setNodes]);
  const chosen = nodes.find((n) => n.id === selected);
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow text-neutral-400">Learning intelligence</div>
          <h1 className="mt-2 text-3xl font-semibold">Your Knowledge Map</h1>
          <p className="mt-1 text-neutral-500">
            Machine Learning · 82 concepts
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-right">
          <div>
            <div className="text-xl font-semibold">61</div>
            <div className="text-[10px] text-neutral-400">mastered</div>
          </div>
          <div>
            <div className="text-xl font-semibold">14</div>
            <div className="text-[10px] text-neutral-400">developing</div>
          </div>
          <div>
            <div className="text-xl font-semibold">7</div>
            <div className="text-[10px] text-neutral-400">attention</div>
          </div>
        </div>
      </header>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="surface h-[650px] overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={(_, n) => setSelected(n.id)}
            fitView
          >
            <Background gap={28} color="#ededE8" />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>
        <aside className="surface h-fit p-5">
          <div className="eyebrow text-neutral-400">Map guide</div>
          <h2 className="mt-2 text-lg font-semibold">What your graph means</h2>
          <div className="mt-5 space-y-3 text-sm text-neutral-600">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#35a66d]" />
              Strong / mastered
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#d4a83b]" />
              Developing
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#d35a5a]" />
              Needs attention
            </div>
          </div>
          <div className="mt-6 rounded-2xl bg-[#f5f5ef] p-4">
            <div className="flex gap-2">
              <Sparkles size={16} />
              <div>
                <div className="text-sm font-semibold">Adaptive signal</div>
                <div className="mt-1 text-xs leading-5 text-neutral-500">
                  Gradient Descent is currently limiting progress toward
                  Optimization.
                </div>
              </div>
            </div>
            <button className="mt-4 inline-flex items-center gap-2 text-xs font-semibold">
              Review 7 min <ArrowRight size={13} />
            </button>
          </div>
          {chosen && (
            <div className="mt-5 border-t border-[var(--line)] pt-5">
              <div className="flex justify-between">
                <div>
                  <div className="text-xs text-neutral-400">
                    Selected concept
                  </div>
                  <div className="mt-1 font-semibold">{chosen.data.name}</div>
                </div>
                <button onClick={() => setSelected(null)}>
                  <X size={15} />
                </button>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-2xl font-semibold">
                    {chosen.data.mastery}%
                  </div>
                  <div className="text-xs text-neutral-400">Confidence Low</div>
                </div>
                <CircleAlert size={20} className="text-[#d35a5a]" />
              </div>
              <div className="mt-5 text-xs text-neutral-500">Learned from</div>
              <div className="mt-2 space-y-2 text-xs">
                <div className="rounded-lg bg-neutral-50 p-2">
                  StatQuest — Linear Regression
                </div>
                <div className="rounded-lg bg-neutral-50 p-2">
                  Andrew Ng — ML
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
