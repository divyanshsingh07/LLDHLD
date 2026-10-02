import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const RESEARCH = path.join(ROOT, "research");
export const RAW_DIR = path.join(RESEARCH, "raw");
export const CACHE_DIR = path.join(RESEARCH, "cache");
export const NORMALIZED_DIR = path.join(RESEARCH, "normalized");
export const REPORTS_DIR = path.join(RESEARCH, "reports");
export const DATA_DIR = path.join(ROOT, "public", "data");
export const SOURCES_FILE = path.join(RESEARCH, "sources.yaml");

export type Authority = "high" | "medium" | "low";
export type Importance = "CORE" | "SUPPORTING" | "OPTIONAL" | "SPECIALIZATION";
export type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
export type EdgeType =
  | "prerequisite"
  | "related"
  | "specialization"
  | "practice"
  | "expands-on"
  | "alternative";

export type Domain =
  | "FOUNDATIONS"
  | "PROGRAMMING"
  | "COMPUTER_SCIENCE"
  | "NETWORKING"
  | "BACKEND"
  | "DATABASES"
  | "API_DESIGN"
  | "FRONTEND"
  | "FULL_STACK"
  | "DEVOPS"
  | "CLOUD"
  | "INFRASTRUCTURE"
  | "CONTAINERS"
  | "ORCHESTRATION"
  | "SOFTWARE_ARCHITECTURE"
  | "DISTRIBUTED_SYSTEMS"
  | "RELIABILITY"
  | "SECURITY"
  | "OBSERVABILITY"
  | "SYSTEM_DESIGN"
  | "PERFORMANCE"
  | "DATA_ENGINEERING"
  | "ADVANCED_ARCHITECTURE";

export type Track =
  | "Backend"
  | "Full Stack"
  | "DevOps"
  | "Cloud"
  | "Software Architect"
  | "System Design"
  | "Platform Engineer"
  | "SRE"
  | "Security"
  | "Performance"
  | "Data Engineering"
  | "Distributed Systems"
  | "API Design";

export interface SourceRegistryEntry {
  id: string;
  name: string;
  url: string;
  type: string;
  category: string;
  authority: Authority;
  license: string;
  usage: string;
  enabled: boolean;
  parser: string;
  lastFetched?: string;
  contentHash?: string;
  retrievalStatus?: string;
}

export interface RawArtifact {
  source: string;
  url: string;
  retrievedAt: string;
  contentHash: string;
  contentType: string;
  content: unknown;
  meta?: Record<string, unknown>;
}

export interface ObservedConcept {
  name: string;
  normalizedName: string;
  sourceId: string;
  sourceUrl: string;
  originalName: string;
  context?: string;
  categoryHint?: string;
}

export interface Provenance {
  source: string;
  url: string;
  originalName: string;
}

export interface Resource {
  title: string;
  url: string;
  type: "DOCS" | "ARTICLE" | "VIDEO" | "COURSE" | "BOOK" | "GITHUB" | "PRACTICE";
  tier: 1 | 2 | 3 | 4;
}

export interface CanonicalConcept {
  id: string;
  canonicalName: string;
  aliases: string[];
  category: Domain;
  description: string;
  prerequisites: string[];
  sources: Provenance[];
  confidence: number;
  tracks: Track[];
  importance: Importance;
  level: Level;
  resources: Resource[];
  technologies?: string[];
  whyLearn?: string;
  whatToBuild?: string;
  onSpine?: boolean;
  spineOrder?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: EdgeType;
}

export interface RoadmapDataset {
  version: string;
  generatedAt: string;
  spine: string[];
  specializations: Record<string, string[]>;
  concepts: CanonicalConcept[];
  edges: GraphEdge[];
  stats: Record<string, number>;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .replace(/\b(learn|basics?|fundamentals?|introduction|intro|overview|understanding|what is|how to)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function contentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function ensureDirs(): Promise<void> {
  for (const dir of [RAW_DIR, CACHE_DIR, NORMALIZED_DIR, REPORTS_DIR, DATA_DIR, path.join(RESEARCH, "sources")]) {
    await mkdir(dir, { recursive: true });
  }
}

export async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

export const AUTHORITY_WEIGHT: Record<Authority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export const TRACKS: Track[] = [
  "Backend",
  "Full Stack",
  "DevOps",
  "Cloud",
  "Software Architect",
  "System Design",
  "Platform Engineer",
  "SRE",
  "Security",
  "Performance",
  "Data Engineering",
  "Distributed Systems",
  "API Design",
];

export const SPINE_STAGES: { id: string; name: string; domains: Domain[] }[] = [
  { id: "foundations", name: "Foundations", domains: ["FOUNDATIONS", "PROGRAMMING", "COMPUTER_SCIENCE"] },
  { id: "networking", name: "Networking", domains: ["NETWORKING"] },
  { id: "backend", name: "Backend", domains: ["BACKEND", "API_DESIGN"] },
  { id: "databases", name: "Databases", domains: ["DATABASES"] },
  { id: "architecture", name: "Software Architecture", domains: ["SOFTWARE_ARCHITECTURE"] },
  { id: "devops", name: "DevOps", domains: ["DEVOPS", "CONTAINERS", "INFRASTRUCTURE"] },
  { id: "cloud", name: "Cloud", domains: ["CLOUD", "ORCHESTRATION"] },
  { id: "distributed", name: "Distributed Systems", domains: ["DISTRIBUTED_SYSTEMS"] },
  { id: "reliability", name: "Reliability", domains: ["RELIABILITY", "OBSERVABILITY", "SECURITY"] },
  { id: "system-design", name: "Advanced System Design", domains: ["SYSTEM_DESIGN", "PERFORMANCE", "ADVANCED_ARCHITECTURE"] },
];
