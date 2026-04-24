import { describe, expect, it } from "vitest";
import { buildStoryGraph } from "./story-graph";

describe("buildStoryGraph", () => {
  it("projects facts, relations and warnings into graph nodes/edges", () => {
    const graph = buildStoryGraph({
      facts: [
        {
          id: "f-1",
          entity: "Hero",
          entityType: "character",
          entityConfidence: 0.9,
          narrativeRole: null,
          attribute: "goal",
          value: "find truth",
          chunkIds: ["c-1"],
        },
      ],
      relations: [
        {
          id: "r-1",
          entityA: "Hero",
          entityB: "Mentor",
          relation: "friend",
          chunkIds: ["c-1"],
        },
      ],
      salientObjects: [{ name: "Amulet", description: "Old amulet", chunkId: "c-1" }],
      warnings: [
        {
          id: "w-1",
          key: "hero|fear/afraid->calm",
          kind: "fact_conflict",
          source: "fact_merge",
          confidence: 0.9,
          message: "Hero contradiction",
          entity: "Hero",
          attribute: "fear",
          previousValue: "afraid",
          newValue: "calm",
          previousChunkIds: ["c-1"],
          newChunkIds: ["c-2"],
        },
      ],
      reasoningSignals: [
        {
          id: "rs-1",
          type: "motive",
          entity: "Hero",
          summary: "hide family secret",
          evidenceQuote: "I must hide it",
          chunkIds: ["c-2"],
          confidence: 0.82,
        },
      ],
      causalChains: [
        {
          id: "cc-1",
          trigger: "letter found",
          decision: "Hero runs",
          action: "escapes city",
          consequence: "Mentor is exposed",
          involvedEntities: ["Hero", "Mentor"],
          chunkIds: ["c-3"],
          confidence: 0.74,
          evidenceQuote: "After reading the letter, he fled",
        },
      ],
      motivationAssessments: [],
      consequenceAssessments: [],
    });

    expect(graph.nodes.some((n) => n.label === "Hero")).toBe(true);
    expect(graph.nodes.some((n) => n.kind === "object" && n.label === "Amulet")).toBe(true);
    expect(graph.nodes.some((n) => n.kind === "conflict")).toBe(true);
    expect(graph.nodes.some((n) => n.kind === "motive")).toBe(true);
    expect(graph.edges.some((e) => e.kind === "connected")).toBe(true);
    expect(graph.edges.some((e) => e.kind === "leads_to")).toBe(true);
  });
});
