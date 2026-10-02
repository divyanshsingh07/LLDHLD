import path from "node:path";
import { REPORTS_DIR, ensureDirs, readJson, writeJson } from "./lib.ts";

/** Compatibility entrypoint — dedupe report already produced by normalize.ts */
export async function runDeduplicate() {
  await ensureDirs();
  const duplicates = await readJson(path.join(REPORTS_DIR, "duplicates.json"));
  const summary = await readJson(path.join(REPORTS_DIR, "deduplication.json"));
  await writeJson(path.join(REPORTS_DIR, "deduplication.json"), summary);
  console.log(`Deduplication report ready: ${(duplicates as unknown[]).length} groups`);
  return { duplicates, summary };
}

if (process.argv[1]?.endsWith("deduplicate.ts")) {
  runDeduplicate().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
