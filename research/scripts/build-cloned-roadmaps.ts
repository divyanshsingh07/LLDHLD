/**
 * Build cloned roadmap datasets from roadmap.sh discovery JSON.
 * Discovery-only: layout + topic labels. Original short blurbs only.
 */
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeJson } from "./lib.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RAW_DIR = path.join(ROOT, "research/raw/roadmapsh");
const OUT_DIR = path.join(ROOT, "public/data");

const ROADMAPS = [
  {
    slug: "system-design",
    title: "System Design",
    subtitle: "Large-scale systems — foundations, building blocks, patterns, reliability",
  },
  {
    slug: "backend",
    title: "Backend",
    subtitle: "APIs, data, auth, caching, and server-side foundations",
  },
  {
    slug: "full-stack",
    title: "Full Stack",
    subtitle: "Frontend + backend path for shipping end-to-end products",
  },
  {
    slug: "devops",
    title: "DevOps",
    subtitle: "CI/CD, containers, cloud, observability, and operations",
  },
] as const;

type RawNode = {
  id: string;
  type: string;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
  data?: { label?: string };
};

type RawEdge = {
  id: string;
  source: string;
  target: string;
};

function blurb(label: string, kind: string, roadmapTitle: string): string {
  const l = label.toLowerCase();
  if (kind === "title") {
    return `A structured ${roadmapTitle} learning path. Work top-down: foundations first, then building blocks, then advanced patterns.`;
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
  if (l.includes("docker") || l.includes("container") || l.includes("kubernetes") || l.includes("k8s")) {
    return "Package and orchestrate workloads. Start with containers, then scheduling, networking, and rollout strategy.";
  }
  if (l.includes("ci/cd") || l.includes("pipeline") || l.includes("jenkins") || l.includes("github actions")) {
    return "Automate build, test, and deploy. Keep pipelines fast, gated, and reproducible.";
  }
  if (l.includes("terraform") || l.includes("ansible") || l.includes("infrastructure as code") || l.includes("iac")) {
    return "Declare infrastructure so environments are repeatable, reviewable, and recoverable.";
  }
  if (l.includes("react") || l.includes("vue") || l.includes("angular") || l.includes("frontend") || l.includes("html") || l.includes("css")) {
    return "Ship usable UI: structure, state, accessibility, and performance matter as much as the framework.";
  }
  if (l.includes("node") || l.includes("express") || l.includes("api") || l.includes("rest") || l.includes("graphql") || l.includes("grpc")) {
    return "Design clear contracts, handle errors, and keep services operable under real traffic.";
  }
  if (l.includes("auth") || l.includes("oauth") || l.includes("jwt") || l.includes("security")) {
    return "Authenticate users, authorize actions, and protect data in transit and at rest.";
  }
  if (l.includes("cache")) {
    return "Reduce load and latency with the right placement and write strategy.";
  }
  if (l.includes("sql") || l.includes("nosql") || l.includes("database") || l.includes("postgres") || l.includes("mongo") || l.includes("redis")) {
    return "Pick storage for your access patterns—consistency, query shape, and operational cost.";
  }
  if (l.includes("monitor") || l.includes("observ") || l.includes("logging") || l.includes("tracing") || l.includes("prometheus")) {
    return "Measure health, latency, errors, and saturation. Alerts should be actionable.";
  }
  if (l.includes("test") || l.includes("tdd") || l.includes("unit") || l.includes("integration")) {
    return "Prove behavior with the right layer of tests—fast feedback without brittle suites.";
  }
  if (kind === "topic") {
    return `Core ${roadmapTitle} topic: ${label}. Learn when to use it, what it costs, and how it fails.`;
  }
  if (kind === "label") {
    return `Note under this section: ${label}.`;
  }
  return `Study ${label} in the ${roadmapTitle} path—problem, trade-offs, and a minimal practice task.`;
}

async function buildOne(slug: string, title: string, subtitle: string) {
  const rawPath = path.join(RAW_DIR, `${slug}.json`);
  const raw = JSON.parse(await readFile(rawPath, "utf8")) as {
    source: string;
    url: string;
    content: { nodes?: RawNode[]; edges?: RawEdge[]; title?: { page?: string; card?: string } };
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
      description: label ? blurb(label, kind, title) : "",
      interactive: kind === "topic" || kind === "subtopic" || kind === "label",
    };
  });

  const outEdges = edges
    .filter((e) => idSet.has(e.source) && idSet.has(e.target))
    .map((e) => ({ id: e.id, from: e.source, to: e.target }));

  const interactive = outNodes.filter((n) => n.interactive).length;
  const payload = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    slug,
    title,
    subtitle,
    sourceNote: `Topic map structure discovered via roadmap.sh public API (discovery-only). Descriptions are original. See https://roadmap.sh/${slug}`,
    sourceUrl: `https://roadmap.sh/${slug}`,
    discoveryUrl: raw.url,
    stats: { nodes: outNodes.length, interactive, edges: outEdges.length },
    nodes: outNodes,
    edges: outEdges,
  };

  const out = path.join(OUT_DIR, `${slug}.json`);
  await writeJson(out, payload);
  console.log(`Wrote ${out} (${interactive} topics, ${outEdges.length} edges)`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const r of ROADMAPS) {
    await buildOne(r.slug, r.title, r.subtitle);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
