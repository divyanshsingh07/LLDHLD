import path from "node:path";
import { DATA_DIR, REPORTS_DIR, RoadmapDataset, ensureDirs, readJson, sleep, writeJson } from "./lib.ts";

export async function runCheckLinks(): Promise<{ checked: number; broken: { url: string; status: number | string; conceptId: string }[] }> {
  await ensureDirs();
  const data = await readJson<RoadmapDataset>(path.join(DATA_DIR, "roadmap.json"));
  const broken: { url: string; status: number | string; conceptId: string }[] = [];
  let checked = 0;

  const urls = new Map<string, string>();
  for (const c of data.concepts) {
    for (const r of c.resources || []) {
      urls.set(r.url, c.id);
    }
  }

  for (const [url, conceptId] of urls) {
    checked++;
    try {
      await sleep(150);
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        headers: { "User-Agent": "EngineeringRoadmapLinkChecker/1.0" },
      });
      // some docs block HEAD — retry GET lightly
      if (res.status === 405 || res.status === 403) {
        const res2 = await fetch(url, {
          method: "GET",
          redirect: "follow",
          headers: { "User-Agent": "EngineeringRoadmapLinkChecker/1.0" },
        });
        if (!res2.ok) broken.push({ url, status: res2.status, conceptId });
      } else if (!res.ok) {
        broken.push({ url, status: res.status, conceptId });
      }
    } catch (err) {
      broken.push({ url, status: String(err), conceptId });
    }
  }

  const result = { checked, broken, ok: broken.length === 0 };
  await writeJson(path.join(REPORTS_DIR, "link-check.json"), result);
  console.log(`Checked ${checked} links; broken=${broken.length}`);
  for (const b of broken) console.warn("  BROKEN", b.status, b.url);
  return result;
}

if (process.argv[1]?.endsWith("check-links.ts")) {
  runCheckLinks()
    .then((r) => process.exit(r.broken.length ? 1 : 0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
