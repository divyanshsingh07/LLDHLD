import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  ObservedConcept,
  RAW_DIR,
  REPORTS_DIR,
  normalizeName,
  writeJson,
  ensureDirs,
} from "./lib.ts";

interface RawWrapper {
  source: string;
  url: string;
  content: unknown;
  meta?: Record<string, unknown>;
}

function extractRoadmapLabels(content: unknown, sourceId: string, sourceUrl: string): ObservedConcept[] {
  if (!content || typeof content !== "object") return [];
  const nodes = (content as { nodes?: unknown[] }).nodes;
  if (!Array.isArray(nodes)) return [];
  const out: ObservedConcept[] = [];
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const n = node as { type?: string; data?: { label?: string } };
    const type = n.type || "";
    if (!["topic", "subtopic", "todo"].includes(type)) continue;
    const label = n.data?.label?.trim();
    if (!label || label.length < 2) continue;
    // Skip pure UI chrome
    if (/^(vertical|horizontal)\s+node$/i.test(label)) continue;
    out.push({
      name: label,
      normalizedName: normalizeName(label),
      sourceId,
      sourceUrl,
      originalName: label,
      context: type,
      categoryHint: sourceId.replace(/^roadmapsh-/, ""),
    });
  }
  return out;
}

function extractMarkdownHeadings(text: string, sourceId: string, sourceUrl: string): ObservedConcept[] {
  const out: ObservedConcept[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (!m) continue;
    const title = m[2].replace(/[*_`]/g, "").trim();
    if (!title || title.length < 3) continue;
    if (/^(motivation|contributing|license|index|table of contents|anki)/i.test(title)) continue;
    out.push({
      name: title,
      normalizedName: normalizeName(title),
      sourceId,
      sourceUrl,
      originalName: title,
      context: `h${m[1].length}`,
    });
  }
  return out;
}

function extractHtmlHeadings(html: string, sourceId: string, sourceUrl: string): ObservedConcept[] {
  const out: ObservedConcept[] = [];
  const re = /<h([1-3])[^>]*>(.*?)<\/h\1>/gis;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const title = match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!title || title.length < 3 || title.length > 120) continue;
    out.push({
      name: title,
      normalizedName: normalizeName(title),
      sourceId,
      sourceUrl,
      originalName: title,
      context: `h${match[1]}`,
    });
  }
  return out;
}

function extractCncfItems(content: unknown, sourceId: string, sourceUrl: string): ObservedConcept[] {
  if (!Array.isArray(content)) return [];
  const out: ObservedConcept[] = [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const o = item as { name?: string; category?: string };
    if (!o.name) continue;
    // Only graduated-ish conceptual categories, not every tool
    const category = String(o.category || "");
    if (!/orchestrat|observab|app definition|provision|runtim|schedul|service mesh|ci.?cd|security/i.test(category + o.name)) {
      continue;
    }
    out.push({
      name: o.name,
      normalizedName: normalizeName(o.name),
      sourceId,
      sourceUrl,
      originalName: o.name,
      context: category,
      categoryHint: "cloud-native",
    });
  }
  return out;
}

async function walkRawFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkRawFiles(full)));
    else if (entry.name.endsWith(".json") || entry.name.endsWith(".html") || entry.name.endsWith(".txt")) {
      files.push(full);
    }
  }
  return files;
}

export async function runParse(): Promise<ObservedConcept[]> {
  await ensureDirs();
  const files = await walkRawFiles(RAW_DIR);
  const observed: ObservedConcept[] = [];

  for (const file of files) {
    if (file.includes(`${path.sep}robots${path.sep}`)) continue;
    if (file.includes(`${path.sep}search${path.sep}`)) continue;

    const raw = await readFile(file, "utf8");
    let wrapper: RawWrapper | null = null;
    try {
      wrapper = JSON.parse(raw) as RawWrapper;
    } catch {
      // plain text snapshot
      const sourceId = path.basename(path.dirname(file));
      observed.push(...extractMarkdownHeadings(raw, sourceId, file));
      continue;
    }

    if (!wrapper?.source) continue;
    const sourceId = wrapper.source;
    const sourceUrl = wrapper.url || file;
    const content = wrapper.content;

    if (sourceId.startsWith("roadmapsh-") || file.includes(`${path.sep}roadmapsh${path.sep}`)) {
      if (sourceId.includes("catalog") || path.basename(file) === "catalog.json") continue;
      observed.push(...extractRoadmapLabels(content, sourceId, sourceUrl.includes("roadmap.sh") ? sourceUrl : `https://roadmap.sh/${sourceId.replace("roadmapsh-", "")}`));
      continue;
    }

    if (sourceId === "system-design-primer" || file.includes("system-design-primer")) {
      const text = typeof content === "string" ? content : JSON.stringify(content);
      observed.push(...extractMarkdownHeadings(text, "system-design-primer", "https://github.com/donnemartin/system-design-primer"));
      continue;
    }

    if (sourceId === "cncf-landscape") {
      observed.push(...extractCncfItems(content, sourceId, sourceUrl));
      continue;
    }

    if (typeof content === "string") {
      if (content.includes("<html") || content.includes("<h1") || content.includes("<h2")) {
        observed.push(...extractHtmlHeadings(content, sourceId, sourceUrl));
      } else {
        observed.push(...extractMarkdownHeadings(content, sourceId, sourceUrl));
      }
    }
  }

  const filtered = observed.filter((o) => o.normalizedName.length >= 2);
  await writeJson(path.join(REPORTS_DIR, "observed-concepts.json"), {
    count: filtered.length,
    concepts: filtered,
  });
  console.log(`Parsed ${filtered.length} observed concept mentions`);
  return filtered;
}

if (process.argv[1]?.endsWith("parse.ts")) {
  runParse().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
