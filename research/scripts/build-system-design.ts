/**
 * Build a System Design roadmap for the UI from roadmap.sh discovery JSON.
 * Discovery-only: keep layout + topic labels. Write original short blurbs.
 * Do NOT copy proprietary topic markdown from roadmap.sh.
 */
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeJson } from "./lib.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RAW = path.join(ROOT, "research/raw/roadmapsh/system-design.json");
const OUT = path.join(ROOT, "public/data/system-design.json");

type RawNode = {
  id: string;
  type: string;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
  data?: { label?: string; style?: Record<string, unknown> };
};

type RawEdge = {
  id: string;
  source: string;
  target: string;
  type?: string;
};

function blurb(label: string, kind: string): string {
  const l = label.toLowerCase();
  if (kind === "title") {
    return "A structured path through foundations, building blocks, patterns, and reliability for designing large-scale systems.";
  }
  if (l.includes("cap theorem")) {
    return "In a partitioned network you trade among consistency, availability, and partition tolerance—name the trade-off you are making.";
  }
  if (l.includes("load balanc")) {
    return "Distribute traffic across instances. Know L4 vs L7, algorithms, and how balancing differs from reverse proxies.";
  }
  if (l.includes("cdn")) {
    return "Push or pull edge caches to cut latency for static and semi-static content close to users.";
  }
  if (l.includes("cache")) {
    return "Reduce load and latency with the right placement and write strategy: aside, through, behind, or refresh-ahead.";
  }
  if (l.includes("shard") || l.includes("replication") || l.includes("sql") || l.includes("nosql") || l.includes("database")) {
    return "Choose storage and data distribution for your access patterns—replication, sharding, and model fit matter more than brand names.";
  }
  if (l.includes("microservice") || l.includes("service discovery")) {
    return "Split by bounded context only when the operational cost is worth it; discovery and contracts keep services callable.";
  }
  if (l.includes("queue") || l.includes("asynchron") || l.includes("message") || l.includes("back pressure")) {
    return "Decouple producers and consumers. Queues absorb spikes; back pressure and idempotency keep systems stable.";
  }
  if (l.includes("circuit breaker") || l.includes("bulkhead") || l.includes("retry") || l.includes("throttl")) {
    return "Contain failure: isolate faults, shed load, and retry with budgets so one dependency cannot take everything down.";
  }
  if (l.includes("cqrs") || l.includes("event sourcing") || l.includes("choreograph")) {
    return "Separate write and read models or capture facts as events when collaboration and auditability need it.";
  }
  if (l.includes("security") || l.includes("identity") || l.includes("gatekeeper") || l.includes("valet")) {
    return "Least privilege at the edge: authenticate, authorize, and hand out short-lived access to protected resources.";
  }
  if (l.includes("monitor") || l.includes("instrument") || l.includes("alert")) {
    return "Measure health, latency, errors, and saturation. Alerts should be actionable; dashboards should explain failure.";
  }
  if (l.includes("latency") || l.includes("throughput") || l.includes("scalability") || l.includes("performance")) {
    return "Define the metric first. Scaling and optimization look different for latency-sensitive vs throughput-sensitive systems.";
  }
  if (l.includes("http") || l.includes("tcp") || l.includes("udp") || l.includes("grpc") || l.includes("graphql") || l.includes("rest") || l.includes("rpc")) {
    return "Pick the protocol for your coupling and payload needs—request/response, streaming, or schema-driven RPC.";
  }
  if (kind === "topic") {
    return `Core building block: ${label}. Learn when to use it, what it costs, and how it fails under load.`;
  }
  if (kind === "label") {
    return `Variant or note under this section: ${label}.`;
  }
  return `Study ${label} as part of the system design path—what problem it solves, trade-offs, and a minimal design sketch.`;
}

async function main() {
  const raw = JSON.parse(await readFile(RAW, "utf8")) as {
    source: string;
    url: string;
    content: { nodes?: RawNode[]; edges?: RawEdge[]; title?: { page?: string; card?: string }; description?: string };
  };

  const nodes = raw.content.nodes || [];
  const edges = raw.content.edges || [];

  const keepTypes = new Set(["topic", "subtopic", "title", "label", "section"]);
  const visible = nodes.filter((n) => keepTypes.has(n.type));
  const idSet = new Set(visible.map((n) => n.id));

  const outNodes = visible.map((n) => {
    const label = n.data?.label?.trim() || (n.type === "section" ? "" : n.id);
    const kind = n.type;
    return {
      id: n.id,
      kind,
      label,
      x: Math.round(n.position?.x ?? 0),
      y: Math.round(n.position?.y ?? 0),
      width: Math.round(n.width ?? (kind === "topic" ? 220 : kind === "section" ? 280 : 180)),
      height: Math.round(n.height ?? (kind === "section" ? 200 : 40)),
      description: label ? blurb(label, kind) : "",
      interactive: kind === "topic" || kind === "subtopic" || kind === "label",
    };
  });

  const outEdges = edges
    .filter((e) => idSet.has(e.source) && idSet.has(e.target))
    .map((e) => ({
      id: e.id,
      from: e.source,
      to: e.target,
    }));

  const topics = outNodes.filter((n) => n.interactive);

  const payload = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    title: "System Design",
    subtitle: "Large-scale systems path — layout discovered from public roadmap sources",
    sourceNote:
      "Topic map structure discovered via roadmap.sh public API (discovery-only). Descriptions are original. See https://roadmap.sh/system-design",
    sourceUrl: "https://roadmap.sh/system-design",
    discoveryUrl: raw.url,
    stats: {
      nodes: outNodes.length,
      interactive: topics.length,
      edges: outEdges.length,
    },
    nodes: outNodes,
    edges: outEdges,
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeJson(OUT, payload);
  console.log(`Wrote ${OUT} (${topics.length} interactive topics, ${outEdges.length} edges)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
