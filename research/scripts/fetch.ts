import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import {
  AUTHORITY_WEIGHT,
  CACHE_DIR,
  RAW_DIR,
  RESEARCH,
  SOURCES_FILE,
  SourceRegistryEntry,
  contentHash,
  ensureDirs,
  exists,
  sleep,
  writeJson,
} from "./lib.ts";

interface SourcesConfig {
  defaults: { rateLimitMs: number; userAgent: string };
  sources: SourceRegistryEntry[];
  roadmapsh_slugs: string[];
  search_queries: string[];
}

async function fetchText(url: string, userAgent: string): Promise<{ ok: boolean; status: number; body: string; contentType: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      Accept: "application/json,text/html,text/plain,*/*",
    },
    redirect: "follow",
  });
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const body = await res.text();
  return { ok: res.ok, status: res.status, body, contentType };
}

async function writeRaw(sourceId: string, filename: string, artifact: unknown): Promise<string> {
  const dir = path.join(RAW_DIR, sourceId);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await writeFile(filePath, JSON.stringify(artifact, null, 2) + "\n", "utf8");
  return filePath;
}

function parseJsonSafe(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export async function runFetch(): Promise<{ fetched: number; failed: number; registry: SourceRegistryEntry[] }> {
  await ensureDirs();
  const cfg = YAML.parse(await readFile(SOURCES_FILE, "utf8")) as SourcesConfig;
  const registry: SourceRegistryEntry[] = [];
  let fetched = 0;
  let failed = 0;

  const searchDiscovery = {
    source: "search-discovery",
    url: "local://search-queries",
    retrievedAt: new Date().toISOString(),
    contentHash: contentHash(JSON.stringify(cfg.search_queries)),
    contentType: "application/json",
    content: {
      note: "Search engines are discovery-only. Queries recorded for extensibility; results are not scraped as knowledge.",
      queries: cfg.search_queries,
    },
  };
  await writeRaw("search", "queries.json", searchDiscovery);

  // Dynamically discover roadmap.sh catalog
  const catalogUrl = "https://roadmap.sh/api/v1-list-official-roadmaps";
  await sleep(cfg.defaults.rateLimitMs);
  const catalogRes = await fetchText(catalogUrl, cfg.defaults.userAgent);
  let discoveredSlugs = [...cfg.roadmapsh_slugs];
  if (catalogRes.ok) {
    const catalogJson = parseJsonSafe(catalogRes.body);
    await writeRaw("roadmapsh", "catalog.json", {
      source: "roadmapsh-catalog",
      url: catalogUrl,
      retrievedAt: new Date().toISOString(),
      contentHash: contentHash(catalogRes.body),
      contentType: catalogRes.contentType,
      content: catalogJson,
      meta: { usage: "discovery-only", license: "proprietary-restricted" },
    });
    const items = Array.isArray(catalogJson)
      ? catalogJson
      : Array.isArray((catalogJson as { roadmaps?: unknown[] })?.roadmaps)
        ? (catalogJson as { roadmaps: unknown[] }).roadmaps
        : [];
    const slugs = items
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          return String(o.slug || o.id || "");
        }
        return "";
      })
      .filter(Boolean);
    if (slugs.length) {
      const wanted = new Set(cfg.roadmapsh_slugs);
      // Prefer configured relevant slugs; also keep any overlapping discovered ones.
      discoveredSlugs = [...new Set([...cfg.roadmapsh_slugs, ...slugs.filter((s) => wanted.has(s))])];
    }
    registry.push({
      id: "roadmapsh-catalog",
      name: "roadmap.sh Official Roadmap Catalog",
      url: catalogUrl,
      type: "api",
      category: "catalog",
      authority: "high",
      license: "proprietary-restricted",
      usage: "discovery-only",
      enabled: true,
      parser: "roadmapsh-catalog",
      lastFetched: new Date().toISOString(),
      contentHash: contentHash(catalogRes.body),
      retrievalStatus: "ok",
    });
    fetched++;
  } else {
    failed++;
    registry.push({
      id: "roadmapsh-catalog",
      name: "roadmap.sh Official Roadmap Catalog",
      url: catalogUrl,
      type: "api",
      category: "catalog",
      authority: "high",
      license: "proprietary-restricted",
      usage: "discovery-only",
      enabled: true,
      parser: "roadmapsh-catalog",
      lastFetched: new Date().toISOString(),
      retrievalStatus: `failed:${catalogRes.status}`,
    });
  }

  // Fetch each relevant roadmap JSON (node labels for concept discovery; do not republish descriptions)
  for (const slug of discoveredSlugs) {
    const url = `https://roadmap.sh/api/v1-official-roadmap/${slug}`;
    const cacheKey = path.join(CACHE_DIR, `roadmapsh-${slug}.json`);
    await sleep(cfg.defaults.rateLimitMs);
    try {
      const res = await fetchText(url, cfg.defaults.userAgent);
      if (!res.ok) {
        failed++;
        registry.push({
          id: `roadmapsh-${slug}`,
          name: `roadmap.sh ${slug}`,
          url,
          type: "api",
          category: "roadmap",
          authority: "high",
          license: "proprietary-restricted",
          usage: "concept-discovery",
          enabled: true,
          parser: "roadmapsh-json",
          lastFetched: new Date().toISOString(),
          retrievalStatus: `failed:${res.status}`,
        });
        continue;
      }
      const parsed = parseJsonSafe(res.body);
      const artifact = {
        source: `roadmapsh-${slug}`,
        url,
        retrievedAt: new Date().toISOString(),
        contentHash: contentHash(res.body),
        contentType: res.contentType,
        content: parsed,
        meta: {
          usage: "concept-discovery",
          license: "proprietary-restricted",
          note: "Store for research reproducibility. Node labels used for discovery only; descriptions are not copied into the product.",
        },
      };
      await writeRaw("roadmapsh", `${slug}.json`, artifact);
      await writeFile(cacheKey, JSON.stringify(artifact, null, 2));
      registry.push({
        id: `roadmapsh-${slug}`,
        name: `roadmap.sh ${slug}`,
        url: `https://roadmap.sh/${slug}`,
        type: "api",
        category: "roadmap",
        authority: "high",
        license: "proprietary-restricted",
        usage: "concept-discovery",
        enabled: true,
        parser: "roadmapsh-json",
        lastFetched: artifact.retrievedAt,
        contentHash: artifact.contentHash,
        retrievalStatus: "ok",
      });
      fetched++;
      console.log(`✓ roadmap.sh/${slug}`);
    } catch (err) {
      failed++;
      console.warn(`✗ roadmap.sh/${slug}`, err);
    }
  }

  // Fetch configured non-roadmap sources
  for (const source of cfg.sources.filter((s) => s.enabled && s.id !== "roadmapsh-catalog")) {
    await sleep(cfg.defaults.rateLimitMs);
    try {
      const res = await fetchText(source.url, cfg.defaults.userAgent);
      if (!res.ok) {
        failed++;
        registry.push({ ...source, lastFetched: new Date().toISOString(), retrievalStatus: `failed:${res.status}` });
        console.warn(`✗ ${source.id} HTTP ${res.status}`);
        continue;
      }
      const artifact = {
        source: source.id,
        url: source.url,
        retrievedAt: new Date().toISOString(),
        contentHash: contentHash(res.body),
        contentType: res.contentType,
        content: source.parser.includes("json") || res.contentType.includes("json") ? parseJsonSafe(res.body) : res.body,
        meta: { license: source.license, usage: source.usage, authorityWeight: AUTHORITY_WEIGHT[source.authority] },
      };
      const ext = typeof artifact.content === "string" ? "txt" : "json";
      await writeRaw(source.id.split("-")[0] || source.id, `${source.id}.${ext === "txt" ? "html" : "json"}`, artifact);
      if (ext === "txt") {
        // also keep plain text snapshot
        await writeFile(path.join(RAW_DIR, source.id.split("-")[0] || source.id, `${source.id}.txt`), res.body);
      }
      registry.push({
        ...source,
        lastFetched: artifact.retrievedAt,
        contentHash: artifact.contentHash,
        retrievalStatus: "ok",
      });
      fetched++;
      console.log(`✓ ${source.id}`);
    } catch (err) {
      failed++;
      registry.push({ ...source, lastFetched: new Date().toISOString(), retrievalStatus: `error:${String(err)}` });
      console.warn(`✗ ${source.id}`, err);
    }
  }

  // robots.txt checks for key hosts
  const robotsHosts = ["https://roadmap.sh/robots.txt", "https://docs.aws.amazon.com/robots.txt", "https://kubernetes.io/robots.txt"];
  for (const robotsUrl of robotsHosts) {
    await sleep(cfg.defaults.rateLimitMs);
    try {
      const res = await fetchText(robotsUrl, cfg.defaults.userAgent);
      const host = new URL(robotsUrl).hostname.replace(/\./g, "-");
      await writeRaw("robots", `${host}.txt.json`, {
        source: `robots-${host}`,
        url: robotsUrl,
        retrievedAt: new Date().toISOString(),
        contentHash: contentHash(res.body),
        contentType: "text/plain",
        content: res.body,
        meta: { status: res.status },
      });
    } catch {
      // ignore robots fetch failures
    }
  }

  await writeJson(path.join(RESEARCH, "sources", "registry.json"), {
    updatedAt: new Date().toISOString(),
    fetched,
    failed,
    sources: registry,
  });

  return { fetched, failed, registry };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("fetch.ts")) {
  runFetch()
    .then((r) => {
      console.log(`Fetch complete: ${r.fetched} ok, ${r.failed} failed`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
