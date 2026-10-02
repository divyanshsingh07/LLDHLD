import path from "node:path";
import { writeFile } from "node:fs/promises";
import {
  DATA_DIR,
  REPORTS_DIR,
  RESEARCH,
  RoadmapDataset,
  SPINE_STAGES,
  ensureDirs,
  readJson,
} from "./lib.ts";

export async function runReport(): Promise<void> {
  await ensureDirs();
  const registry = await readJson<{ sources: { id: string; retrievalStatus?: string; name: string; url: string; license?: string }[]; fetched?: number; failed?: number }>(
    path.join(RESEARCH, "sources", "registry.json"),
  ).catch(() => ({ sources: [] }));
  const observed = await readJson<{ count: number }>(path.join(REPORTS_DIR, "observed-concepts.json")).catch(() => ({ count: 0 }));
  const dedupe = await readJson<{ ontologySize: number; duplicateGroups: number; libraryAdded: number }>(path.join(REPORTS_DIR, "deduplication.json")).catch(
    () => ({ ontologySize: 0, duplicateGroups: 0, libraryAdded: 0 }),
  );
  const dataset = await readJson<RoadmapDataset>(path.join(DATA_DIR, "roadmap.json"));
  const validation = await readJson<{ ok: boolean; errors: string[]; warnings: string[] }>(path.join(REPORTS_DIR, "validation.json")).catch(() => ({
    ok: false,
    errors: [],
    warnings: [],
  }));

  const used = registry.sources.filter((s) => s.retrievalStatus === "ok");
  const rejected = registry.sources.filter((s) => s.retrievalStatus && s.retrievalStatus !== "ok");

  const md = `# Research Source Summary

Generated: ${new Date().toISOString()}

## Pipeline overview

Public sources → fetch/cache → parse → normalize → deduplicate → classify → validate → synthesize → unified roadmap.

## Sources discovered

- Registry entries: **${registry.sources.length}**
- Successfully fetched: **${used.length}**
- Failed / rejected: **${rejected.length}**

## Sources used

${used.map((s) => `- **${s.name}** (\`${s.id}\`) — ${s.url}${s.license ? ` — license: ${s.license}` : ""}`).join("\n") || "_none_"}

## Sources rejected

${rejected.map((s) => `- **${s.name}** (\`${s.id}\`) — ${s.retrievalStatus} — ${s.url}`).join("\n") || "_none_"}

### Rejection policy notes

- roadmap.sh content is **proprietary/restricted**: used for **concept discovery & ordering only**. Product descriptions are original synthesis; copyrighted body text is not republished.
- Search engine result pages are **not** scraped as knowledge. Queries are recorded for discovery extensibility only.
- Failed HTTP fetches are skipped; fallback to other official docs / GitHub raw sources.

## Concept statistics

| Metric | Count |
| --- | ---: |
| Observed concept mentions collected | ${observed.count} |
| Canonical concepts after normalization | ${dedupe.ontologySize} |
| Duplicate groups merged | ${dedupe.duplicateGroups} |
| Optional library concepts added | ${dedupe.libraryAdded} |
| Final roadmap nodes | ${dataset.stats.totalConcepts} |
| CORE | ${dataset.stats.core} |
| SUPPORTING | ${dataset.stats.supporting} |
| OPTIONAL | ${dataset.stats.optional} |
| SPECIALIZATION | ${dataset.stats.specialization} |
| Graph edges | ${dataset.stats.edges} |
| Spine nodes | ${dataset.stats.spineNodes} |

## Major learning stages (recommended spine)

${SPINE_STAGES.map((s, i) => `${i + 1}. **${s.name}** — domains: ${s.domains.join(", ")}`).join("\n")}

Spine node IDs:

${dataset.spine.map((id, i) => `${i + 1}. \`${id}\``).join("\n")}

## Major conflicts / positioning decisions

- **Redis timing**: treated as an implementation of *Distributed Caching* after *Caching Fundamentals*, not an early beginner language topic.
- **Microservices vs monolith**: Modular Monolith precedes Microservices; microservices are not framed as universally correct.
- **HTTP vs HTTP/2/3**: kept distinct — fundamentals vs protocol evolution.
- **Caching family**: Caching Fundamentals, Cache Strategies, Cache Invalidation, and Distributed Caching remain separate nodes.
- **Docker vs containerization**: conceptual containerization is core; Docker is the primary implementation technology.

## Validation

- Status: **${validation.ok ? "PASSED" : "FAILED"}**
- Errors: ${validation.errors.length}
- Warnings: ${validation.warnings.length}

## Refresh commands

\`\`\`bash
npm run research
npm run normalize
npm run validate-roadmap
npm run build-roadmap
npm run check-links
\`\`\`

## Notes on originality

Descriptions, learning rationales, and project prompts are synthesized. Sources contribute discovery, consensus scoring, ordering signals, and attribution URLs.
`;

  await writeFile(path.join(REPORTS_DIR, "source-summary.md"), md, "utf8");
  console.log(`Wrote ${path.join(REPORTS_DIR, "source-summary.md")}`);
}

if (process.argv[1]?.endsWith("report.ts")) {
  runReport().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
