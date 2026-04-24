import { describe, expect, it } from "vitest";
import { buildProblemItems } from "./problem-items";

describe("buildProblemItems", () => {
  it("builds contradictions and unresolved thread items", () => {
    const items = buildProblemItems({
      consistencyWarnings: [
        {
          id: "w-1",
          key: "hero|water/fear->swim",
          kind: "fact_conflict",
          source: "fact_merge",
          confidence: 0.9,
          message: "Hero fears water then swims calmly",
          entity: "Hero",
          attribute: "water",
          previousValue: "fears water",
          newValue: "swims calmly",
          previousChunkIds: ["c-1"],
          newChunkIds: ["c-8"],
        },
      ],
      chekhovWarnings: [
        {
          id: "ch-1",
          objectName: "Amulet",
          introducedChunkId: "c-1",
          lastMentionChunkId: "c-2",
          message: "Amulet disappears from narrative",
        },
      ],
      salientObjects: [{ name: "Amulet", description: "Artifact", chunkId: "c-1" }],
      facts: [],
      chunks: [
        { id: "c-1", text: "Amulet appears.", from: 0, to: 15, label: "1", kind: "heading", chapterId: null, chapterTitle: null, sceneId: null, sceneTitle: null, chunkVersion: 2, contentHash: "1" },
      ],
      warningStatuses: { "hero|water/fear->swim": "new" },
      motivationAssessments: [
        {
          id: "m-1",
          entity: "Hero",
          motivation: "betray mentor",
          verdict: "weak",
          reason: "No prior pressure is shown",
          evidenceQuote: "He betrays him suddenly",
          chunkIds: ["c-1"],
          confidence: 0.8,
        },
      ],
      consequenceAssessments: [
        {
          id: "c-1",
          event: "city explosion",
          verdict: "missing",
          reason: "World reaction not shown",
          evidenceQuote: "The city exploded",
          chunkIds: ["c-1"],
          confidence: 0.78,
        },
      ],
    });

    expect(items.some((item) => item.category === "Contradictions")).toBe(true);
    expect(items.some((item) => item.category === "UnresolvedThreads")).toBe(true);
    expect(items.some((item) => item.category === "WeakMotivation")).toBe(true);
    expect(items.some((item) => item.category === "MissingConsequences")).toBe(true);
  });
});
