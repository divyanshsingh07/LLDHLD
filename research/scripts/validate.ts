import path from "node:path";
import {
  CanonicalConcept,
  DATA_DIR,
  GraphEdge,
  REPORTS_DIR,
  RoadmapDataset,
  ensureDirs,
  readJson,
  writeJson,
} from "./lib.ts";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export async function runValidate(datasetPath = path.join(DATA_DIR, "roadmap.json")): Promise<ValidationResult> {
  await ensureDirs();
  const data = await readJson<RoadmapDataset>(datasetPath);
  const errors: string[] = [];
  const warnings: string[] = [];

  const ids = new Set<string>();
  const aliasToId = new Map<string, string>();

  for (const c of data.concepts) {
    if (ids.has(c.id)) errors.push(`duplicate id: ${c.id}`);
    ids.add(c.id);

    if (!c.canonicalName?.trim()) errors.push(`missing name: ${c.id}`);
    if (!c.description?.trim()) errors.push(`missing description: ${c.id}`);
    if (!c.level) errors.push(`missing level: ${c.id}`);
    if (!c.importance) errors.push(`missing importance: ${c.id}`);
    if (!c.tracks?.length) errors.push(`missing tracks: ${c.id}`);
    if (!c.sources?.length && !c.id.startsWith("lib-")) warnings.push(`missing sources: ${c.id}`);

    for (const alias of c.aliases || []) {
      const key = alias.toLowerCase();
      const existing = aliasToId.get(key);
      if (existing && existing !== c.id) errors.push(`duplicate alias "${alias}" on ${c.id} and ${existing}`);
      aliasToId.set(key, c.id);
    }

    for (const pre of c.prerequisites || []) {
      if (!ids.has(pre) && !data.concepts.some((x) => x.id === pre)) {
        // checked after loop too
      }
    }
  }

  // Broken prerequisite references
  for (const c of data.concepts) {
    for (const pre of c.prerequisites || []) {
      if (!ids.has(pre)) errors.push(`broken prerequisite ${pre} -> ${c.id}`);
    }
  }

  // Edge checks + cycle detection on prerequisite edges
  const prereqAdj = new Map<string, string[]>();
  for (const e of data.edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) errors.push(`broken edge ${e.type}: ${e.from} -> ${e.to}`);
    if (e.type === "prerequisite") {
      const list = prereqAdj.get(e.from) || [];
      list.push(e.to);
      prereqAdj.set(e.from, list);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const visit = (node: string): boolean => {
    if (visiting.has(node)) {
      errors.push(`circular prerequisites involving ${[...stack, node].join(" -> ")}`);
      return true;
    }
    if (visited.has(node)) return false;
    visiting.add(node);
    stack.push(node);
    for (const next of prereqAdj.get(node) || []) {
      if (visit(next)) return true;
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
    return false;
  };
  for (const id of ids) visit(id);

  // Orphans: no edges and not on spine
  const connected = new Set<string>();
  for (const e of data.edges) {
    connected.add(e.from);
    connected.add(e.to);
  }
  for (const id of data.spine) connected.add(id);
  for (const c of data.concepts) {
    if (!connected.has(c.id) && c.importance === "CORE") warnings.push(`orphan core node: ${c.id}`);
  }

  // Disconnected components on undirected graph of core nodes
  const coreIds = data.concepts.filter((c) => c.importance === "CORE").map((c) => c.id);
  const undirected = new Map<string, Set<string>>();
  for (const id of coreIds) undirected.set(id, new Set());
  for (const e of data.edges) {
    if (!undirected.has(e.from) || !undirected.has(e.to)) continue;
    undirected.get(e.from)!.add(e.to);
    undirected.get(e.to)!.add(e.from);
  }
  const seen = new Set<string>();
  let components = 0;
  for (const id of coreIds) {
    if (seen.has(id)) continue;
    components++;
    const q = [id];
    seen.add(id);
    while (q.length) {
      const cur = q.pop()!;
      for (const n of undirected.get(cur) || []) {
        if (!seen.has(n)) {
          seen.add(n);
          q.push(n);
        }
      }
    }
  }
  if (components > 5) warnings.push(`core graph has ${components} disconnected components`);

  const result: ValidationResult = { ok: errors.length === 0, errors, warnings };
  await writeJson(path.join(REPORTS_DIR, "validation.json"), result);
  console.log(`Validation ${result.ok ? "PASSED" : "FAILED"}: ${errors.length} errors, ${warnings.length} warnings`);
  for (const e of errors.slice(0, 20)) console.error("  ERR", e);
  for (const w of warnings.slice(0, 20)) console.warn("  WARN", w);
  return result;
}

if (process.argv[1]?.endsWith("validate.ts")) {
  runValidate()
    .then((r) => process.exit(r.ok ? 0 : 1))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
