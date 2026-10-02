import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SystemDesignView, type SdData } from "../SystemDesignView";

const ALLOWED = new Set(["system-design", "backend", "full-stack", "devops"]);

const TITLES: Record<string, string> = {
  "system-design": "System Design",
  backend: "Backend",
  "full-stack": "Full Stack",
  devops: "DevOps",
};

export function ClonedRoadmapPage() {
  const { slug = "" } = useParams();
  const [data, setData] = useState<SdData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ALLOWED.has(slug)) {
      setError(`Unknown roadmap: ${slug}`);
      setData(null);
      return;
    }

    let cancelled = false;
    setData(null);
    setError(null);

    fetch(`/data/${slug}.json`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load ${slug}.json (${res.status})`);
        return res.json() as Promise<SdData>;
      })
      .then((json) => {
        if (!cancelled) setData({ ...json, slug: json.slug || slug });
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const nice = TITLES[slug] || slug;

  if (error) {
    return (
      <div className="center-screen">
        <h1>Could not load {nice}</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="center-screen">
        <div className="loader" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="page graph-route sd-route">
      <section className="map-pane graph-page sd-page" aria-label={`${data.title} roadmap`}>
        <SystemDesignView data={data} />
      </section>
    </div>
  );
}
