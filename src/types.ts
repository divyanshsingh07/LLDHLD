export type Importance = "CORE" | "SUPPORTING" | "OPTIONAL" | "SPECIALIZATION";
export type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

export interface Provenance {
  source: string;
  url: string;
  originalName: string;
}

export interface Resource {
  title: string;
  url: string;
  type: string;
  tier: number;
}

export interface Concept {
  id: string;
  canonicalName: string;
  aliases: string[];
  category: string;
  description: string;
  prerequisites: string[];
  sources: Provenance[];
  confidence: number;
  tracks: string[];
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
  type: string;
}

export interface RoadmapData {
  version: string;
  generatedAt: string;
  spine: string[];
  specializations: Record<string, string[]>;
  concepts: Concept[];
  edges: GraphEdge[];
  stats: Record<string, number>;
}

export type ProgressState = Record<string, "todo" | "learning" | "done">;
