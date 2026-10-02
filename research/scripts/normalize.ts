import path from "node:path";
import {
  AUTHORITY_WEIGHT,
  CanonicalConcept,
  Domain,
  Importance,
  Level,
  NORMALIZED_DIR,
  ObservedConcept,
  REPORTS_DIR,
  Track,
  normalizeName,
  writeJson,
  ensureDirs,
  readJson,
} from "./lib.ts";
import { buildOntology, ontologyAliasIndex } from "./ontology.ts";
import { runParse } from "./parse.ts";

function tokenSet(s: string): Set<string> {
  return new Set(s.split(/\s+/).filter((t) => t.length > 1));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function inferAuthority(sourceId: string): number {
  if (sourceId.startsWith("roadmapsh-")) return AUTHORITY_WEIGHT.high;
  if (["system-design-primer", "kubernetes-docs", "docker-docs", "opentelemetry-docs", "aws-well-architected", "google-sre-book", "postgresql-docs", "redis-docs", "cncf-landscape"].includes(sourceId)) {
    return AUTHORITY_WEIGHT.high;
  }
  return AUTHORITY_WEIGHT.medium;
}

function tracksForHint(hint?: string): Track[] {
  const h = (hint || "").toLowerCase();
  if (h.includes("devops")) return ["DevOps", "Platform Engineer"];
  if (h.includes("full-stack") || h.includes("frontend")) return ["Full Stack"];
  if (h.includes("system-design")) return ["System Design"];
  if (h.includes("architect") || h.includes("design-architecture")) return ["Software Architect"];
  if (h.includes("aws") || h.includes("cloud") || h.includes("terraform") || h.includes("kubernetes")) return ["Cloud", "DevOps"];
  if (h.includes("cyber") || h.includes("security")) return ["Backend", "SRE"];
  if (h.includes("sre")) return ["SRE"];
  return ["Backend"];
}

function categoryFromTokens(name: string): Domain {
  const n = name.toLowerCase();
  if (/kubernet|orchestr/.test(n)) return "ORCHESTRATION";
  if (/docker|container/.test(n)) return "CONTAINERS";
  if (/aws|azure|gcp|cloud/.test(n)) return "CLOUD";
  if (/terraform|iac|infrastructure/.test(n)) return "INFRASTRUCTURE";
  if (/observ|metric|log|trac|prometheus|otel/.test(n)) return "OBSERVABILITY";
  if (/secur|auth|owasp|tls|https/.test(n)) return "SECURITY";
  if (/slo|sli|sla|reliab|incident|failover/.test(n)) return "RELIABILITY";
  if (/distribut|consensus|cap|eventual|shard/.test(n)) return "DISTRIBUTED_SYSTEMS";
  if (/cache|redis|perf|latency|throughput/.test(n)) return "PERFORMANCE";
  if (/sql|postgres|database|index|nosql|mongo|cassandra/.test(n)) return "DATABASES";
  if (/api|rest|graphql|grpc|openapi/.test(n)) return "API_DESIGN";
  if (/load balanc|cdn|dns|tcp|udp|http|network/.test(n)) return "NETWORKING";
  if (/ci.?cd|devops|gitops/.test(n)) return "DEVOPS";
  if (/architect|microservice|monolith|ddd|design pattern/.test(n)) return "SOFTWARE_ARCHITECTURE";
  if (/system design|scalab/.test(n)) return "SYSTEM_DESIGN";
  if (/html|css|react|frontend/.test(n)) return "FRONTEND";
  if (/linux|git|internet|os /.test(n)) return "FOUNDATIONS";
  if (/algorithm|data structure|complexity|big.?o/.test(n)) return "COMPUTER_SCIENCE";
  return "BACKEND";
}

export async function runNormalize(): Promise<{
  concepts: CanonicalConcept[];
  duplicates: unknown[];
  unmatchedTop: { name: string; count: number }[];
}> {
  await ensureDirs();
  let observed: ObservedConcept[] = [];
  try {
    const file = await readJson<{ concepts: ObservedConcept[] }>(path.join(REPORTS_DIR, "observed-concepts.json"));
    observed = file.concepts;
  } catch {
    observed = await runParse();
  }

  const ontology = buildOntology();
  const aliasIndex = ontologyAliasIndex(ontology);
  const byId = new Map(ontology.map((c) => [c.id, c]));

  const duplicates: {
    canonical: string;
    merged: string[];
    reason: string;
    sources: string[];
  }[] = [];
  const mergeBuckets = new Map<string, Set<string>>();

  const unmatchedCounts = new Map<string, { name: string; count: number; sources: Set<string> }>();

  for (const obs of observed) {
    const norm = obs.normalizedName;
    let matchedId = aliasIndex.get(norm) || aliasIndex.get(obs.originalName.toLowerCase());

    if (!matchedId) {
      // semantic-ish match via token overlap against ontology aliases
      const obsTokens = tokenSet(norm);
      let best = { id: "", score: 0 };
      for (const concept of ontology) {
        for (const alias of concept.aliases) {
          const score = jaccard(obsTokens, tokenSet(normalizeName(alias)));
          if (score > best.score) best = { id: concept.id, score };
        }
      }
      // Strict threshold to avoid over-dedupe
      if (best.score >= 0.72) matchedId = best.id;
    }

    if (!matchedId) {
      // Prevent over-merge: keep distinct advanced variants unmatched for library
      const key = norm;
      const entry = unmatchedCounts.get(key) || { name: obs.originalName, count: 0, sources: new Set<string>() };
      entry.count += 1;
      entry.sources.add(obs.sourceId);
      if (obs.originalName.length < entry.name.length) entry.name = obs.originalName;
      unmatchedCounts.set(key, entry);
      continue;
    }

    const concept = byId.get(matchedId)!;
    const weight = inferAuthority(obs.sourceId);
    concept.confidence += weight;
    concept.sources.push({
      source: obs.sourceId,
      url: obs.sourceUrl,
      originalName: obs.originalName,
    });
    // union tracks from roadmap context
    for (const t of tracksForHint(obs.categoryHint)) {
      if (!concept.tracks.includes(t)) concept.tracks.push(t);
    }
    if (!concept.aliases.includes(obs.originalName.toLowerCase())) {
      concept.aliases.push(obs.originalName.toLowerCase());
    }
    const bucket = mergeBuckets.get(matchedId) || new Set<string>();
    bucket.add(obs.originalName);
    mergeBuckets.set(matchedId, bucket);
  }

  for (const [id, names] of mergeBuckets) {
    if (names.size < 2) continue;
    duplicates.push({
      canonical: byId.get(id)!.canonicalName,
      merged: [...names].sort(),
      reason: "same core concept across sources (alias + semantic match)",
      sources: [...new Set(byId.get(id)!.sources.map((s) => s.source))],
    });
  }

  // Promote high-frequency unmatched concepts into OPTIONAL library nodes (cap)
  const unmatchedTop = [...unmatchedCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 80)
    .map((u) => ({ name: u.name, count: u.count }));

  let libraryAdded = 0;
  for (const u of [...unmatchedCounts.values()].sort((a, b) => b.count - a.count)) {
    if (libraryAdded >= 40) break;
    if (u.count < 3) continue;
    // Skip tiny vocabulary fragments
    if (u.name.split(/\s+/).length === 1 && u.name.length < 5) continue;
    const id = `lib-${normalizeName(u.name).replace(/\s+/g, "-")}`.slice(0, 70);
    if (byId.has(id)) continue;
    const category = categoryFromTokens(u.name);
    const concept: CanonicalConcept = {
      id,
      canonicalName: u.name,
      aliases: [u.name.toLowerCase(), normalizeName(u.name)],
      category,
      description: `Supplementary topic observed across research sources. Explore after core curriculum coverage of ${category.replace(/_/g, " ").toLowerCase()}.`,
      prerequisites: [],
      sources: [...u.sources].map((s) => ({ source: s, url: "", originalName: u.name })),
      confidence: u.count,
      tracks: ["Backend"],
      importance: "OPTIONAL",
      level: "INTERMEDIATE",
      resources: [],
      whyLearn: "Appears in multiple public learning sources but is not part of the primary spine.",
      whatToBuild: `Spike a short note or lab covering ${u.name}.`,
      onSpine: false,
    };
    ontology.push(concept);
    byId.set(id, concept);
    libraryAdded++;
  }

  // Deduplicate provenance entries
  for (const c of ontology) {
    const seen = new Set<string>();
    c.sources = c.sources.filter((s) => {
      const key = `${s.source}|${s.originalName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  await writeJson(path.join(NORMALIZED_DIR, "canonical-concepts.json"), ontology);
  await writeJson(path.join(REPORTS_DIR, "duplicates.json"), duplicates);
  await writeJson(path.join(REPORTS_DIR, "deduplication.json"), {
    ontologySize: ontology.length,
    duplicateGroups: duplicates.length,
    unmatchedConsidered: unmatchedTop.length,
    libraryAdded,
  });
  await writeJson(path.join(REPORTS_DIR, "unmatched-top.json"), unmatchedTop);

  console.log(`Normalized ${ontology.length} canonical concepts; ${duplicates.length} duplicate groups`);
  return { concepts: ontology, duplicates, unmatchedTop };
}

if (process.argv[1]?.endsWith("normalize.ts")) {
  runNormalize().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
