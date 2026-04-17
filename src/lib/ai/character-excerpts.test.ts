import { describe, expect, it } from "vitest";
import type { PlotFact } from "@/lib/plot-index/story-extraction";
import { buildFactsBlobForDraft, buildCharacterExcerptsBlob } from "@/lib/ai/character-excerpts";

describe("character-excerpts", () => {
  it("buildFactsBlobForDraft joins facts", () => {
    const facts: PlotFact[] = [
      {
        id: "1",
        entity: "A",
        entityType: "character",
        entityConfidence: 0.9,
        narrativeRole: null,
        attribute: "x",
        value: "y",
        chunkIds: [],
      },
    ];
    expect(buildFactsBlobForDraft(facts)).toContain("x: y");
  });

  it("buildCharacterExcerptsBlob returns empty without editor", () => {
    const facts: PlotFact[] = [
      {
        id: "1",
        entity: "A",
        entityType: "character",
        entityConfidence: 0.9,
        narrativeRole: null,
        attribute: "x",
        value: "y",
        chunkIds: ["missing"],
      },
    ];
    const r = buildCharacterExcerptsBlob(null, facts);
    expect(r.excerptsBlob).toBe("");
    expect(r.missingChunkIds).toEqual([]);
  });
});
