import { runFetch } from "./fetch.ts";
import { runParse } from "./parse.ts";
import { runNormalize } from "./normalize.ts";
import { runBuildRoadmap } from "./build-roadmap.ts";
import { runValidate } from "./validate.ts";
import { runReport } from "./report.ts";

async function main() {
  console.log("=== 1) Fetch / cache ===");
  const fetchResult = await runFetch();
  console.log(fetchResult);

  console.log("=== 2) Parse ===");
  await runParse();

  console.log("=== 3) Normalize + dedupe + classify signals ===");
  await runNormalize();

  console.log("=== 4) Build roadmap graph ===");
  await runBuildRoadmap();

  console.log("=== 5) Validate ===");
  const validation = await runValidate();

  console.log("=== 6) Report ===");
  await runReport();

  if (!validation.ok) {
    console.error("Research pipeline completed with validation errors.");
    process.exit(1);
  }
  console.log("Research pipeline completed successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
