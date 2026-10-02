import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Fuse from "fuse.js";
import type { Concept, ProgressState, RoadmapData } from "./types";
import { useProgress, useTheme } from "./hooks";
import { groupByStage, nextConcepts, progressStats } from "./utils";

interface RoadmapContextValue {
  data: RoadmapData;
  error: string | null;
  loading: boolean;
  query: string;
  setQuery: (q: string) => void;
  track: string;
  setTrack: (t: string) => void;
  importance: string;
  setImportance: (i: string) => void;
  selectedId: string | null;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  progress: ProgressState;
  setStatus: (id: string, status: ProgressState[string]) => void;
  toggleDone: (id: string) => void;
  clear: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  filtered: Concept[];
  stages: { stage: string; items: Concept[] }[];
  selected: Concept | null;
  stats: { total: number; done: number; learning: number; pct: number };
  next: Concept[];
  byId: Map<string, Concept>;
  openConcept: (id: string) => void;
  onToggleDone: (id: string, e?: { stopPropagation(): void; preventDefault(): void }) => void;
}

const RoadmapContext = createContext<RoadmapContextValue | null>(null);

export function useRoadmap() {
  const ctx = useContext(RoadmapContext);
  if (!ctx) throw new Error("useRoadmap must be used within RoadmapProvider");
  return ctx;
}

export function RoadmapProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState("All");
  const [importance, setImportance] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { progress, setStatus, toggleDone, clear } = useProgress();
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    fetch("/data/roadmap.json")
      .then((r) => {
        if (!r.ok) throw new Error("Roadmap dataset missing. Run npm run research first.");
        return r.json();
      })
      .then((json: RoadmapData) => {
        setData(json);
        setSelectedId(json.spine[0] || json.concepts[0]?.id || null);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        document.getElementById("search")?.focus();
      }
      if (e.key === "Escape") {
        if (drawerOpen) setDrawerOpen(false);
        else setQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const fuse = useMemo(() => {
    if (!data) return null;
    return new Fuse(data.concepts, {
      keys: ["canonicalName", "aliases", "category", "description", "tracks"],
      threshold: 0.35,
    });
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [] as Concept[];
    let list = data.concepts;
    if (track !== "All") {
      const branch = new Set(data.specializations[track] || []);
      list = list.filter((c) => c.tracks.some((t) => track.includes(t)) || branch.has(c.id) || c.onSpine);
    }
    if (importance !== "ALL") list = list.filter((c) => c.importance === importance);
    if (query.trim() && fuse) {
      const hits = new Set(fuse.search(query.trim()).map((r) => r.item.id));
      list = list.filter((c) => hits.has(c.id));
    }
    return list;
  }, [data, track, importance, query, fuse]);

  const stages = useMemo(() => groupByStage(filtered), [filtered]);
  const selected = data?.concepts.find((c) => c.id === selectedId) || null;
  const stats = data
    ? progressStats(data.concepts, progress)
    : { total: 0, done: 0, learning: 0, pct: 0 };
  const next = data ? nextConcepts(data, progress, track === "All" ? undefined : track) : [];
  const byId = useMemo(() => new Map(data?.concepts.map((c) => [c.id, c]) || []), [data]);

  const openConcept = (id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
  };

  const onToggleDone = (id: string, e?: { stopPropagation(): void; preventDefault(): void }) => {
    e?.stopPropagation();
    e?.preventDefault();
    toggleDone(id);
  };

  if (error) {
    return (
      <div className="center-screen">
        <h1>Engineering Path</h1>
        <p>{error}</p>
        <code>npm run research && npm run dev</code>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="center-screen">
        <div className="loader" aria-hidden="true" />
        <p>Loading synthesized roadmap…</p>
      </div>
    );
  }

  const value: RoadmapContextValue = {
    data,
    error,
    loading: false,
    query,
    setQuery,
    track,
    setTrack,
    importance,
    setImportance,
    selectedId,
    drawerOpen,
    setDrawerOpen,
    progress,
    setStatus,
    toggleDone,
    clear,
    theme,
    toggleTheme,
    filtered,
    stages,
    selected,
    stats,
    next,
    byId,
    openConcept,
    onToggleDone,
  };

  return <RoadmapContext.Provider value={value}>{children}</RoadmapContext.Provider>;
}
