import path from "node:path";
import YAML from "yaml";
import { readFile } from "node:fs/promises";
import { RESEARCH, SOURCES_FILE, ensureDirs, writeJson } from "./lib.ts";

/**
 * Source discovery layer.
 * Search queries are recorded for extensibility; roadmap catalog is fetched dynamically.
 * Search engine HTML is intentionally NOT scraped as a knowledge source.
 */
export async function runSourceDiscovery() {
  await ensureDirs();
  const cfg = YAML.parse(await readFile(SOURCES_FILE, "utf8")) as {
    search_queries: string[];
    roadmapsh_slugs: string[];
    sources: unknown[];
  };

  let catalogSlugs: string[] = [];
  try {
    const res = await fetch("https://roadmap.sh/api/v1-list-official-roadmaps", {
      headers: { Accept: "application/json", "User-Agent": "EngineeringRoadmapResearchBot/1.0" },
    });
    if (res.ok) {
      const json = await res.json();
      const items = Array.isArray(json) ? json : Array.isArray(json?.roadmaps) ? json.roadmaps : [];
      catalogSlugs = items
        .map((item: unknown) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const o = item as Record<string, unknown>;
            return String(o.slug || o.id || "");
          }
          return "";
        })
        .filter(Boolean);
    }
  } catch {
    // discovery is best-effort; fetch.ts also retrieves the catalog
  }

  const relevant = cfg.roadmapsh_slugs.filter((s) => catalogSlugs.length === 0 || catalogSlugs.includes(s));
  const report = {
    discoveredAt: new Date().toISOString(),
    searchQueries: cfg.search_queries,
    configuredRoadmapSlugs: cfg.roadmapsh_slugs,
    catalogSize: catalogSlugs.length,
    relevantSlugs: relevant,
    configuredSources: cfg.sources,
    note: "Google/search is discovery-only. Actual knowledge is fetched from attributed public sources.",
  };

  await writeJson(path.join(RESEARCH, "reports", "source-discovery.json"), report);
  console.log(`Discovered catalog=${catalogSlugs.length}, relevant slugs=${relevant.length}`);
  return report;
}

if (process.argv[1]?.endsWith("source-discovery.ts")) {
  runSourceDiscovery().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
