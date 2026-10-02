# Engineering Path — Research-Driven Roadmap Engine

A complete system that **researches** public engineering roadmaps, **normalizes** them into a knowledge graph, and serves an interactive learning UI.

This is **not** a scrape-and-mirror of another site. roadmap.sh and similar sources are used for concept discovery, ordering signals, and attribution. Product copy is original synthesis.

## Quick start

```bash
npm install
npm run research      # fetch → parse → normalize → build → validate → report
npm run dev
```

Then open **http://localhost:5173** in your browser.

## Refresh pipeline

```bash
npm run research          # full pipeline
npm run fetch             # download/cache sources only
npm run parse             # extract observed concepts
npm run normalize         # canonicalize + dedupe + score
npm run build-roadmap     # emit public/data/roadmap.json
npm run validate-roadmap  # graph integrity checks
npm run check-links       # HEAD/GET curated resource URLs
npm run test
npm run build             # production web build
```

## Architecture

```
Public sources (roadmap.sh API, GitHub raw, official docs)
        ↓
research/scripts/fetch.ts (+ cache + raw snapshots)
        ↓
parse → normalize/dedupe → classify → validate
        ↓
public/data/roadmap.json
        ↓
React UI (path + graph + progress + sources)
```

### Research layout

- `research/sources.yaml` — source registry + discovery queries
- `research/raw/` — raw snapshots with URL, timestamp, content hash
- `research/normalized/` — canonical concepts + graph
- `research/reports/` — source-summary, duplicates, validation, concept-map
- `research/scripts/` — pipeline implementation

## Copyright policy

- Do **not** republish proprietary roadmap body text.
- Prefer official docs / permissive licenses for resources.
- Store attribution URLs; write original descriptions.

## License

Application code: MIT (see LICENSE). Third-party sources retain their own licenses.
