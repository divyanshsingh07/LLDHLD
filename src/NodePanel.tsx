import { CheckCircle2, ExternalLink, Link2, ListTree, Wrench, X } from "lucide-react";
import type { Concept, ProgressState } from "./types";
import { stageLabel } from "./utils";

interface Props {
  concept: Concept | null;
  all: Map<string, Concept>;
  progress: ProgressState;
  onSelect: (id: string) => void;
  onStatus: (id: string, status: ProgressState[string]) => void;
  onClose?: () => void;
}

export function NodePanel({ concept, all, progress, onSelect, onStatus, onClose }: Props) {
  if (!concept) {
    return (
      <aside id="concept-detail" className="detail-pane empty">
        <p>Select a concept to see prerequisites, resources, and sources.</p>
      </aside>
    );
  }

  const status = progress[concept.id] || "todo";
  const prereqs = (concept.prerequisites || []).map((id) => all.get(id)).filter(Boolean) as Concept[];
  const related = [...all.values()]
    .filter((c) => c.prerequisites?.includes(concept.id) || concept.prerequisites?.includes(c.id))
    .filter((c) => c.id !== concept.id)
    .slice(0, 8);

  return (
    <aside id="concept-detail" className={`detail-pane ${status}`} aria-live="polite">
      <div className="drawer-head">
        <div className="card-top">
          <span className={`pill ${concept.importance.toLowerCase()}`}>{concept.importance}</span>
          <span className="level">{concept.level}</span>
        </div>
        {onClose ? (
          <button type="button" className="icon-btn drawer-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        ) : null}
      </div>

      <div className="detail-head">
        <h2 id="concept-title">
          <span className="title-cut">{concept.canonicalName}</span>
        </h2>
        <p className="meta">
          {stageLabel(concept.category)} · {concept.tracks.join(" · ")}
        </p>
      </div>

      <div className="status-row" role="group" aria-label="Learning status">
        {(["todo", "learning", "done"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={status === s ? "active" : ""}
            aria-pressed={status === s}
            onClick={() => onStatus(concept.id, s)}
          >
            {s === "done" ? (
              <>
                <CheckCircle2 size={14} aria-hidden="true" /> done
              </>
            ) : (
              s
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={`mark-done-btn ${status === "done" ? "is-done" : ""}`}
        onClick={() => onStatus(concept.id, status === "done" ? "todo" : "done")}
      >
        <CheckCircle2 size={18} aria-hidden="true" />
        {status === "done" ? "Marked done — click to undo" : "Mark as done"}
      </button>

      <section>
        <h3>Why learn this</h3>
        <p>{concept.whyLearn || concept.description}</p>
      </section>

      <section>
        <h3>What it is</h3>
        <p>{concept.description}</p>
      </section>

      {concept.technologies?.length ? (
        <section>
          <h3>Example technologies</h3>
          <div className="chips">
            {concept.technologies.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h3>
          <Wrench size={14} aria-hidden="true" /> What to build
        </h3>
        <p>{concept.whatToBuild}</p>
      </section>

      {prereqs.length > 0 && (
        <section>
          <h3>
            <ListTree size={14} aria-hidden="true" /> Prerequisites
          </h3>
          <ul className="link-list">
            {prereqs.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onSelect(p.id)}>
                  {p.canonicalName}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section>
          <h3>Related</h3>
          <ul className="link-list">
            {related.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onSelect(p.id)}>
                  {p.canonicalName}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {concept.resources?.length > 0 && (
        <section>
          <h3>Curated resources</h3>
          <ul className="resources">
            {concept.resources.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} aria-hidden="true" />
                  <span>{r.title}</span>
                  <em>
                    {r.type} · Tier {r.tier}
                  </em>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="sources">
        <summary>
          <Link2 size={14} aria-hidden="true" /> Sources ({concept.sources?.length || 0})
        </summary>
        {concept.sources?.length ? (
          <ul>
            {concept.sources.slice(0, 30).map((s, i) => (
              <li key={`${s.source}-${s.originalName}-${i}`}>
                <strong>{s.source}</strong>: “{s.originalName}”
                {s.url ? (
                  <>
                    {" "}
                    —{" "}
                    <a href={s.url} target="_blank" rel="noreferrer">
                      link
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>Curated synthesis node; provenance attaches after research refresh.</p>
        )}
      </details>
    </aside>
  );
}
