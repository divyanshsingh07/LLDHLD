import { BookOpen, CheckCircle2, Circle } from "lucide-react";
import { useRoadmap } from "../RoadmapContext";
import { stageLabel } from "../utils";

export function PlanPage() {
  const {
    data,
    progress,
    stats,
    next,
    stages,
    byId,
    selectedId,
    drawerOpen,
    openConcept,
    onToggleDone,
  } = useRoadmap();

  return (
    <div className="page plan-route">
      <section className="hero" aria-label="Overview">
        <div>
          <p className="eyebrow">Plan</p>
          <h1>Know where you are. Know what to learn next.</h1>

          <div className="progress-wrap" aria-label="Core progress">
            <div className="progress-meta">
              <span>Progress</span>
              <span>
                {stats.done}/{stats.total} · {stats.pct}%
              </span>
            </div>
            <div
              className="progress-bar"
              role="progressbar"
              aria-valuenow={stats.pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="progress-fill" style={{ width: `${stats.pct}%` }} />
            </div>
          </div>
        </div>

        <div className="next-card">
          <h2>Next</h2>
          {next.length === 0 ? (
            <p>All unlocked core topics are done or in progress.</p>
          ) : (
            <ul>
              {next.map((c) => {
                const status = progress[c.id] || "todo";
                return (
                  <li key={c.id}>
                    <div className={`next-row ${status}`}>
                      <button
                        type="button"
                        className={`done-check ${status}`}
                        aria-label={
                          status === "done" ? `Mark ${c.canonicalName} as not done` : `Mark ${c.canonicalName} as done`
                        }
                        onClick={(e) => onToggleDone(c.id, e)}
                      >
                        {status === "done" ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <button type="button" className="next-open" onClick={() => openConcept(c.id)}>
                        <BookOpen size={16} aria-hidden="true" />
                        <span className="title-cut">{c.canonicalName}</span>
                        <em>{stageLabel(c.category)}</em>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="map-pane plan-page" aria-label="Learning plan">
        <div className="path-view">
          <div className="spine-rail" aria-label="Recommended spine">
            <h3>Recommended spine</h3>
            <ol>
              {data.spine.map((id) => {
                const c = byId.get(id);
                if (!c) return null;
                const status = progress[id] || "todo";
                return (
                  <li key={id}>
                    <div className={`spine-row ${selectedId === id && drawerOpen ? "selected" : ""} ${status}`}>
                      <button
                        type="button"
                        className={`done-check ${status}`}
                        aria-label={
                          status === "done" ? `Mark ${c.canonicalName} as not done` : `Mark ${c.canonicalName} as done`
                        }
                        onClick={(e) => onToggleDone(id, e)}
                      >
                        {status === "done" ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <button
                        type="button"
                        className="spine-open"
                        onClick={() => openConcept(id)}
                        aria-current={selectedId === id && drawerOpen ? "true" : undefined}
                      >
                        <span className="title-cut">{c.canonicalName}</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="stages">
            {stages.length === 0 ? (
              <div className="empty-stages">
                <p>No concepts match these filters. Clear search or widen filters.</p>
              </div>
            ) : (
              stages.map(({ stage, items }) => (
                <div key={stage} className="stage-block">
                  <h3>{stageLabel(stage)}</h3>
                  <div className="node-grid">
                    {items.map((c) => {
                      const status = progress[c.id] || "todo";
                      return (
                        <div
                          key={c.id}
                          className={`concept-card ${selectedId === c.id && drawerOpen ? "selected" : ""} ${status} ${c.onSpine ? "spine" : ""}`}
                        >
                          <div className="card-top">
                            <button
                              type="button"
                              className={`done-check ${status}`}
                              aria-label={
                                status === "done"
                                  ? `Mark ${c.canonicalName} as not done`
                                  : `Mark ${c.canonicalName} as done`
                              }
                              onClick={(e) => onToggleDone(c.id, e)}
                            >
                              {status === "done" ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            </button>
                            <span className={`pill ${c.importance.toLowerCase()}`}>{c.importance}</span>
                            <span className="level">{c.level}</span>
                          </div>
                          <button type="button" className="card-open" onClick={() => openConcept(c.id)}>
                            <strong className="title-cut">{c.canonicalName}</strong>
                            <p>{c.description}</p>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
