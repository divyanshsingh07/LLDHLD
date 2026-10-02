import path from "node:path";
import {
  CanonicalConcept,
  GraphEdge,
  Importance,
  NORMALIZED_DIR,
  REPORTS_DIR,
  DATA_DIR,
  RoadmapDataset,
  SPINE_STAGES,
  ensureDirs,
  readJson,
  writeJson,
} from "./lib.ts";
import { runNormalize } from "./normalize.ts";

function classifyImportance(c: CanonicalConcept): Importance {
  if (c.importance === "SPECIALIZATION") return c.importance;
  if (c.id.startsWith("lib-")) return "OPTIONAL";
  if (c.onSpine) return "CORE";
  if (c.confidence >= 12) return "CORE";
  if (c.confidence >= 6) return c.importance === "OPTIONAL" ? "SUPPORTING" : c.importance;
  if (c.confidence >= 3) return c.importance === "CORE" ? "SUPPORTING" : c.importance;
  if (c.confidence === 0 && !c.id.startsWith("lib-")) {
    // curated ontology nodes still kept, but may be supporting if never observed
    return c.importance === "CORE" ? "SUPPORTING" : c.importance;
  }
  return c.importance;
}

function buildEdges(concepts: CanonicalConcept[]): GraphEdge[] {
  const ids = new Set(concepts.map((c) => c.id));
  const edges: GraphEdge[] = [];
  const edgeKey = new Set<string>();

  const add = (from: string, to: string, type: GraphEdge["type"]) => {
    if (!ids.has(from) || !ids.has(to) || from === to) return;
    const key = `${type}:${from}->${to}`;
    if (edgeKey.has(key)) return;
    edgeKey.add(key);
    edges.push({ from, to, type });
  };

  for (const c of concepts) {
    for (const pre of c.prerequisites) add(pre, c.id, "prerequisite");
  }

  // Related edges within same category for CORE nodes (sparse)
  const byCat = new Map<string, CanonicalConcept[]>();
  for (const c of concepts.filter((x) => x.importance === "CORE" || x.onSpine)) {
    const list = byCat.get(c.category) || [];
    list.push(c);
    byCat.set(c.category, list);
  }
  for (const list of byCat.values()) {
    const ordered = [...list].sort((a, b) => (a.spineOrder || 999) - (b.spineOrder || 999));
    for (let i = 0; i < ordered.length - 1; i++) {
      add(ordered[i].id, ordered[i + 1].id, "related");
    }
  }

  // Specialization links from parent concepts to technologies encoded on nodes
  const techParents: Record<string, string> = {
    "docker-workflows": "containerization",
    "aws-core-services": "cloud-fundamentals",
    "kubernetes-fundamentals": "containerization",
    "distributed-caching": "caching-fundamentals",
    "rpc-grpc": "api-fundamentals",
    "graphql-apis": "api-fundamentals",
  };
  for (const [child, parent] of Object.entries(techParents)) {
    add(parent, child, "specialization");
  }

  // Practice edges into real-world design
  for (const id of ["load-balancing", "caching-fundamentals", "messaging-queues", "cap-consistency", "rate-limiting"]) {
    add(id, "real-world-design-practice", "practice");
  }

  add("caching-fundamentals", "cache-strategies", "expands-on");
  add("cache-strategies", "cache-invalidation", "expands-on");
  add("http-fundamentals", "http2-http3", "expands-on");
  add("relational-databases", "nosql-datastores", "alternative");

  return edges;
}

function specializationBranches(concepts: CanonicalConcept[]): Record<string, string[]> {
  const pick = (pred: (c: CanonicalConcept) => boolean) =>
    concepts
      .filter((c) => (c.importance === "CORE" || c.importance === "SUPPORTING" || c.onSpine) && pred(c))
      .sort((a, b) => (a.spineOrder || 500) - (b.spineOrder || 500) || b.confidence - a.confidence)
      .slice(0, 24)
      .map((c) => c.id);

  return {
    "Backend Engineer": pick((c) => c.tracks.includes("Backend") && ["API_DESIGN", "BACKEND", "DATABASES", "PERFORMANCE", "SOFTWARE_ARCHITECTURE"].includes(c.category)),
    "Full Stack Engineer": pick((c) => c.tracks.includes("Full Stack") || ["FRONTEND", "FULL_STACK", "API_DESIGN", "SECURITY"].includes(c.category)),
    "DevOps Engineer": pick((c) => c.tracks.includes("DevOps") || ["DEVOPS", "CONTAINERS", "INFRASTRUCTURE", "ORCHESTRATION"].includes(c.category)),
    "Cloud Engineer": pick((c) => c.tracks.includes("Cloud") || c.category === "CLOUD"),
    "Software Architect": pick((c) => c.tracks.includes("Software Architect") || ["SOFTWARE_ARCHITECTURE", "ADVANCED_ARCHITECTURE"].includes(c.category)),
    "System Design": pick((c) => c.tracks.includes("System Design") || ["SYSTEM_DESIGN", "DISTRIBUTED_SYSTEMS"].includes(c.category)),
    "Platform Engineer": pick((c) => c.tracks.includes("Platform Engineer") || ["ORCHESTRATION", "DEVOPS", "OBSERVABILITY"].includes(c.category)),
    "SRE / Reliability": pick((c) => c.tracks.includes("SRE") || ["RELIABILITY", "OBSERVABILITY", "SECURITY"].includes(c.category)),
  };
}

export async function runBuildRoadmap(): Promise<RoadmapDataset> {
  await ensureDirs();
  let concepts: CanonicalConcept[];
  try {
    concepts = await readJson<CanonicalConcept[]>(path.join(NORMALIZED_DIR, "canonical-concepts.json"));
  } catch {
    concepts = (await runNormalize()).concepts;
  }

  for (const c of concepts) {
    c.importance = classifyImportance(c);
    // Keep curated CORE on spine even if confidence classification softened
    if (c.onSpine) c.importance = "CORE";
  }

  // Limit primary roadmap size: keep ontology + selective library
  const coreish = concepts.filter((c) => !c.id.startsWith("lib-"));
  const library = concepts
    .filter((c) => c.id.startsWith("lib-"))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 40);
  concepts = [...coreish, ...library];

  const edges = buildEdges(concepts);
  const spine = [...concepts]
    .filter((c) => c.onSpine)
    .sort((a, b) => (a.spineOrder || 0) - (b.spineOrder || 0))
    .map((c) => c.id);

  const dataset: RoadmapDataset = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    spine,
    specializations: specializationBranches(concepts),
    concepts,
    edges,
    stats: {
      totalConcepts: concepts.length,
      core: concepts.filter((c) => c.importance === "CORE").length,
      supporting: concepts.filter((c) => c.importance === "SUPPORTING").length,
      optional: concepts.filter((c) => c.importance === "OPTIONAL").length,
      specialization: concepts.filter((c) => c.importance === "SPECIALIZATION").length,
      edges: edges.length,
      spineNodes: spine.length,
      stages: SPINE_STAGES.length,
    },
  };

  await writeJson(path.join(NORMALIZED_DIR, "roadmap-graph.json"), dataset);
  await writeJson(path.join(DATA_DIR, "roadmap.json"), dataset);
  await writeJson(path.join(REPORTS_DIR, "concept-map.json"), {
    nodes: concepts.map((c) => ({
      id: c.id,
      name: c.canonicalName,
      category: c.category,
      importance: c.importance,
      level: c.level,
      tracks: c.tracks,
      confidence: c.confidence,
      onSpine: !!c.onSpine,
    })),
    edges,
    spine,
    stages: SPINE_STAGES,
  });

  console.log(`Built roadmap: ${dataset.stats.totalConcepts} nodes, ${dataset.stats.edges} edges, spine=${dataset.stats.spineNodes}`);
  return dataset;
}

if (process.argv[1]?.endsWith("build-roadmap.ts")) {
  runBuildRoadmap().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
