import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Boxes, Cloud, Compass, Filter, Layers, Moon, Search, Server, Sun, X } from "lucide-react";
import { useRoadmap } from "../RoadmapContext";
import { NodePanel } from "../NodePanel";

const NAV = [
  { to: "/", label: "Plan", end: true },
  { to: "/roadmaps/backend", label: "Backend", icon: Server },
  { to: "/roadmaps/full-stack", label: "Full Stack", icon: Layers },
  { to: "/roadmaps/devops", label: "DevOps", icon: Cloud },
  { to: "/roadmaps/system-design", label: "System Design", icon: Boxes },
] as const;

export function Layout() {
  const location = useLocation();
  const isCloned = location.pathname.startsWith("/roadmaps/");
  const {
    data,
    query,
    setQuery,
    track,
    setTrack,
    importance,
    setImportance,
    drawerOpen,
    setDrawerOpen,
    clear,
    theme,
    toggleTheme,
    filtered,
    selected,
    progress,
    setStatus,
    byId,
    openConcept,
  } = useRoadmap();

  return (
    <div className={`app${isCloned ? " graph-mode" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="topbar">
        <NavLink to="/" end className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Compass size={18} />
          </div>
          <strong>Engineering Path</strong>
        </NavLink>

        <nav className="page-nav" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : undefined}
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              {"icon" in item && item.icon ? <item.icon size={14} aria-hidden="true" /> : null}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="top-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {!isCloned ? (
        <div className="toolbar" role="search">
          <label className="search" htmlFor="search">
            <Search size={16} aria-hidden="true" />
            <input
              id="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics"
              autoComplete="off"
            />
            {query ? (
              <button type="button" className="clear" onClick={() => setQuery("")} aria-label="Clear search">
                <X size={14} />
              </button>
            ) : null}
          </label>

          <label className="select">
            <Filter size={14} aria-hidden="true" />
            <select value={track} onChange={(e) => setTrack(e.target.value)} aria-label="Filter by track">
              <option value="All">All tracks</option>
              {Object.keys(data.specializations).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="select">
            <select
              value={importance}
              onChange={(e) => setImportance(e.target.value)}
              aria-label="Filter by importance"
            >
              <option value="ALL">All</option>
              <option value="CORE">Core</option>
              <option value="SUPPORTING">Supporting</option>
              <option value="OPTIONAL">Optional</option>
              <option value="SPECIALIZATION">Specialization</option>
            </select>
          </label>

          <button
            type="button"
            className="ghost"
            onClick={() => {
              if (window.confirm("Reset all local learning progress?")) clear();
            }}
          >
            Reset
          </button>

          <span className="result-count">{filtered.length}</span>
        </div>
      ) : null}

      <main id="main-content">
        <Outlet />
      </main>

      {drawerOpen && !isCloned ? (
        <>
          <button
            type="button"
            className="drawer-backdrop"
            aria-label="Close details"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="concept-title">
            <NodePanel
              concept={selected}
              all={byId}
              progress={progress}
              onSelect={openConcept}
              onStatus={setStatus}
              onClose={() => setDrawerOpen(false)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
