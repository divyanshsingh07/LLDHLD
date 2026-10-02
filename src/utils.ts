import type { Concept, RoadmapData } from "./types";

const STAGE_ORDER = [
  "FOUNDATIONS",
  "PROGRAMMING",
  "COMPUTER_SCIENCE",
  "NETWORKING",
  "API_DESIGN",
  "BACKEND",
  "DATABASES",
  "FRONTEND",
  "FULL_STACK",
  "SOFTWARE_ARCHITECTURE",
  "DEVOPS",
  "CONTAINERS",
  "INFRASTRUCTURE",
  "CLOUD",
  "ORCHESTRATION",
  "DISTRIBUTED_SYSTEMS",
  "PERFORMANCE",
  "SECURITY",
  "OBSERVABILITY",
  "RELIABILITY",
  "SYSTEM_DESIGN",
  "DATA_ENGINEERING",
  "ADVANCED_ARCHITECTURE",
];

export function stageLabel(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function groupByStage(concepts: Concept[]): { stage: string; items: Concept[] }[] {
  const map = new Map<string, Concept[]>();
  for (const c of concepts) {
    const list = map.get(c.category) || [];
    list.push(c);
    map.set(c.category, list);
  }
  return STAGE_ORDER.filter((s) => map.has(s)).map((stage) => ({
    stage,
    items: (map.get(stage) || []).sort(
      (a, b) =>
        Number(b.onSpine) - Number(a.onSpine) ||
        (a.spineOrder || 999) - (b.spineOrder || 999) ||
        a.canonicalName.localeCompare(b.canonicalName),
    ),
  }));
}

export function nextConcepts(data: RoadmapData, progress: Record<string, string>, selectedTrack?: string): Concept[] {
  const byId = new Map(data.concepts.map((c) => [c.id, c]));
  const done = new Set(Object.entries(progress).filter(([, s]) => s === "done").map(([id]) => id));

  const candidates = data.concepts.filter((c) => {
    if (done.has(c.id) || progress[c.id] === "learning") return false;
    if (c.importance === "OPTIONAL" && !c.onSpine) return false;
    if (selectedTrack && selectedTrack !== "All") {
      const branch = data.specializations[selectedTrack];
      if (branch && !branch.includes(c.id) && !c.onSpine) return false;
    }
    return (c.prerequisites || []).every((p) => done.has(p) || !byId.has(p));
  });

  return candidates
    .sort((a, b) => Number(b.onSpine) - Number(a.onSpine) || (a.spineOrder || 999) - (b.spineOrder || 999))
    .slice(0, 5);
}

export function progressStats(concepts: Concept[], progress: Record<string, string>) {
  const core = concepts.filter((c) => c.importance === "CORE" || c.onSpine);
  const done = core.filter((c) => progress[c.id] === "done").length;
  const learning = core.filter((c) => progress[c.id] === "learning").length;
  return { total: core.length, done, learning, pct: core.length ? Math.round((done / core.length) * 100) : 0 };
}
