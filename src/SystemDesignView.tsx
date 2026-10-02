import { useCallback, useEffect, useMemo, useState, memo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  Handle,
  Position,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { X } from "lucide-react";

export type SdKind = "topic" | "subtopic" | "title" | "label" | "section";

export interface SdNode {
  id: string;
  kind: SdKind;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
  interactive: boolean;
}

export interface SdData {
  version: string;
  generatedAt: string;
  slug?: string;
  title: string;
  subtitle: string;
  sourceNote: string;
  sourceUrl: string;
  stats: { nodes: number; interactive: number; edges: number };
  nodes: SdNode[];
  edges: { id: string; from: string; to: string }[];
}

type Progress = Record<string, "todo" | "done">;

function storageKey(slug: string) {
  return `ep-roadmap-progress-${slug}-v1`;
}

function loadProgress(slug: string): Progress {
  try {
    return JSON.parse(localStorage.getItem(storageKey(slug)) || "{}") as Progress;
  } catch {
    return {};
  }
}

function SdTopicNode({ data, selected }: NodeProps) {
  const d = data as {
    label: string;
    kind: SdKind;
    status: "todo" | "done";
  };
  return (
    <div
      className={`sd-node sd-node--${d.kind}${selected ? " sd-node--selected" : ""}${d.status === "done" ? " sd-node--done" : ""}`}
      title={d.label}
    >
      <Handle type="target" position={Position.Top} className="sd-handle" />
      <span>{d.label}</span>
      <Handle type="source" position={Position.Bottom} className="sd-handle" />
    </div>
  );
}

function SdSectionNode({ data }: NodeProps) {
  const d = data as { label: string; width: number; height: number };
  return (
    <div className="sd-section" style={{ width: d.width, height: d.height }} aria-hidden={!d.label}>
      {d.label ? <span>{d.label}</span> : null}
    </div>
  );
}

function SdTitleNode({ data }: NodeProps) {
  const d = data as { label: string };
  return (
    <div className="sd-title-node">
      <h1>{d.label}</h1>
    </div>
  );
}

const nodeTypes = {
  sdTopic: memo(SdTopicNode),
  sdSection: memo(SdSectionNode),
  sdTitle: memo(SdTitleNode),
};

export function SystemDesignView({ data }: { data: SdData }) {
  const slug = data.slug || "system-design";
  const [progress, setProgress] = useState<Progress>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setProgress(loadProgress(slug));
    setSelectedId(null);
  }, [slug]);

  const persist = useCallback(
    (next: Progress) => {
      setProgress(next);
      localStorage.setItem(storageKey(slug), JSON.stringify(next));
    },
    [slug],
  );

  const selected = useMemo(
    () => data.nodes.find((n) => n.id === selectedId && n.interactive) || null,
    [data.nodes, selectedId],
  );

  const doneCount = useMemo(() => {
    const ids = data.nodes.filter((n) => n.interactive).map((n) => n.id);
    return ids.filter((id) => progress[id] === "done").length;
  }, [data.nodes, progress]);

  const interactiveTotal = data.stats.interactive;

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = data.nodes.map((n) => {
      if (n.kind === "section") {
        return {
          id: n.id,
          type: "sdSection",
          position: { x: n.x, y: n.y },
          data: { label: n.label, width: n.width, height: n.height },
          draggable: false,
          selectable: false,
          zIndex: 0,
          style: { width: n.width, height: n.height, pointerEvents: "none" },
        };
      }
      if (n.kind === "title") {
        return {
          id: n.id,
          type: "sdTitle",
          position: { x: n.x, y: n.y },
          data: { label: n.label },
          draggable: false,
          selectable: false,
          zIndex: 2,
        };
      }
      return {
        id: n.id,
        type: "sdTopic",
        position: { x: n.x, y: n.y },
        data: {
          label: n.label,
          kind: n.kind,
          status: progress[n.id] === "done" ? "done" : "todo",
        },
        draggable: false,
        selectable: true,
        zIndex: 3,
        selected: selectedId === n.id,
        style: { width: Math.max(n.width, n.kind === "topic" ? 200 : 160) },
      };
    });

    const edges: Edge[] = data.edges.map((e) => ({
      id: e.id,
      source: e.from,
      target: e.to,
      type: "smoothstep",
      style: { stroke: "var(--muted-stroke)", strokeWidth: 1.1 },
    }));

    return { nodes, edges };
  }, [data, progress, selectedId]);

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    const raw = data.nodes.find((n) => n.id === node.id);
    if (raw?.interactive) setSelectedId(node.id);
  }, [data.nodes]);

  const onNodeDoubleClick = useCallback(
    (_: unknown, node: Node) => {
      const raw = data.nodes.find((n) => n.id === node.id);
      if (!raw?.interactive) return;
      const next = { ...progress };
      next[node.id] = progress[node.id] === "done" ? "todo" : "done";
      persist(next);
    },
    [data.nodes, persist, progress],
  );

  return (
    <div className="sd-layout">
      <div className="sd-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
          minZoom={0.08}
          maxZoom={1.6}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnScroll
          zoomOnDoubleClick={false}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={22} color="var(--grid)" />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            nodeColor={(n) => {
              if (n.type === "sdSection") return "var(--border-soft)";
              if ((n.data as { status?: string })?.status === "done") return "var(--terracotta)";
              return "var(--muted)";
            }}
            maskColor="color-mix(in srgb, var(--brown) 18%, transparent)"
          />
          <Panel position="top-left" className="sd-progress-panel">
            <strong>
              {doneCount}/{interactiveTotal}
            </strong>
          </Panel>
        </ReactFlow>
      </div>

      {selected ? (
        <aside className="sd-detail" aria-label="Topic details">
          <div className="sd-detail-head">
            <h2 id="sd-topic-title">{selected.label}</h2>
            <button type="button" className="icon-btn" aria-label="Close" onClick={() => setSelectedId(null)}>
              <X size={16} />
            </button>
          </div>
          <p>{selected.description}</p>
          <div className="sd-detail-actions">
            <button
              type="button"
              className={`mark-done-btn${progress[selected.id] === "done" ? " is-done" : ""}`}
              onClick={() => {
                const next = { ...progress };
                next[selected.id] = progress[selected.id] === "done" ? "todo" : "done";
                persist(next);
              }}
            >
              {progress[selected.id] === "done" ? "Done" : "Mark done"}
            </button>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
