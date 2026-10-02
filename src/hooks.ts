import { useCallback, useEffect, useState } from "react";
import type { ProgressState } from "./types";

const KEY = "engineering-path-progress-v1";
const THEME_KEY = "engineering-path-theme";

function readProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>(() => readProgress());

  useEffect(() => {
    // Re-sync if another tab updated storage
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setProgress(readProgress());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setStatus = useCallback((id: string, status: ProgressState[string]) => {
    setProgress((prev) => {
      const next = { ...prev, [id]: status };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleDone = useCallback((id: string) => {
    setProgress((prev) => {
      const current = prev[id] || "todo";
      const nextStatus: ProgressState[string] = current === "done" ? "todo" : "done";
      const next = { ...prev, [id]: nextStatus };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(KEY);
    setProgress({});
  }, []);

  return { progress, setStatus, toggleDone, clear };
}

export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem(THEME_KEY) as "dark" | "light" | null;
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}
