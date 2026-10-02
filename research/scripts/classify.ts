import path from "node:path";
import { CanonicalConcept, NORMALIZED_DIR, ensureDirs, readJson, writeJson } from "./lib.ts";

/**
 * Explicit classification pass (importance refinement after normalization).
 * Primary scoring also happens in normalize/build-roadmap; this script makes the step refreshable.
 */
export async function runClassify() {
  await ensureDirs();
  const concepts = await readJson<CanonicalConcept[]>(path.join(NORMALIZED_DIR, "canonical-concepts.json"));

  for (const c of concepts) {
    if (c.onSpine) {
      c.importance = "CORE";
      continue;
    }
    if (c.id.startsWith("lib-")) {
      c.importance = "OPTIONAL";
      continue;
    }
    if (c.importance === "SPECIALIZATION") continue;
    if (c.confidence >= 15) c.importance = "CORE";
    else if (c.confidence >= 8) c.importance = c.importance === "OPTIONAL" ? "SUPPORTING" : c.importance;
    else if (c.confidence > 0 && c.importance === "CORE") c.importance = "SUPPORTING";
  }

  await writeJson(path.join(NORMALIZED_DIR, "canonical-concepts.json"), concepts);
  const counts = {
    CORE: concepts.filter((c) => c.importance === "CORE").length,
    SUPPORTING: concepts.filter((c) => c.importance === "SUPPORTING").length,
    OPTIONAL: concepts.filter((c) => c.importance === "OPTIONAL").length,
    SPECIALIZATION: concepts.filter((c) => c.importance === "SPECIALIZATION").length,
  };
  console.log("Classified", counts);
  return counts;
}

if (process.argv[1]?.endsWith("classify.ts")) {
  runClassify().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
