import { describe, expect, it } from "vitest";
import { buildOntology, ontologyAliasIndex } from "../research/scripts/ontology.ts";
import { normalizeName, slugify } from "../research/scripts/lib.ts";

describe("ontology integrity", () => {
  const concepts = buildOntology();

  it("has unique ids", () => {
    const ids = concepts.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("targets a coherent curriculum size", () => {
    expect(concepts.length).toBeGreaterThanOrEqual(80);
    expect(concepts.length).toBeLessThanOrEqual(250);
  });

  it("keeps a recommended spine", () => {
    const spine = concepts.filter((c) => c.onSpine);
    expect(spine.length).toBeGreaterThanOrEqual(15);
  });

  it("has valid prerequisite references", () => {
    const ids = new Set(concepts.map((c) => c.id));
    for (const c of concepts) {
      for (const pre of c.prerequisites) {
        expect(ids.has(pre), `${c.id} missing prereq ${pre}`).toBe(true);
      }
    }
  });

  it("maps common aliases without colliding ids incorrectly", () => {
    const index = ontologyAliasIndex(concepts);
    expect(index.get("http")).toBe("http-fundamentals");
    expect(index.get("load balancer")).toBe("load-balancing");
    expect(index.get("kubernetes")).toBe("kubernetes-fundamentals");
  });
});

describe("normalize helpers", () => {
  it("normalizes concept labels", () => {
    expect(normalizeName("Learn about APIs")).toContain("apis");
    expect(normalizeName("HTTP Fundamentals")).toBe("http");
  });

  it("slugifies ids", () => {
    expect(slugify("HTTP/2 & HTTP/3")).toMatch(/http/);
  });
});
