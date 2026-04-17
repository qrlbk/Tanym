import { describe, expect, it } from "vitest";
import { classifyEntityLifecycle } from "./entity-lifecycle";
import type { PlotFact } from "@/lib/plot-index/story-extraction";

describe("classifyEntityLifecycle", () => {
  it("splits entities into ephemeral/recurring/long_term", () => {
    const facts: PlotFact[] = [
      {
        id: "f1",
        entity: "Окурок сигареты",
        entityType: "object",
        entityConfidence: 0.8,
        narrativeRole: "other",
        attribute: "state",
        value: "дымящийся",
        chunkIds: ["c1"],
      },
      {
        id: "f2",
        entity: "Ключ",
        entityType: "object",
        entityConfidence: 0.92,
        narrativeRole: "clue",
        attribute: "owner",
        value: "граф",
        chunkIds: ["c2", "c3"],
      },
      {
        id: "f3",
        entity: "Комната",
        entityType: "location",
        entityConfidence: 0.85,
        narrativeRole: null,
        attribute: "state",
        value: "заперта",
        chunkIds: ["c1", "c2"],
      },
    ];
    const buckets = classifyEntityLifecycle(facts, {
      c1: { chapterId: "ch", chapterTitle: "ch", sceneId: "s1", sceneTitle: "s1" },
      c2: { chapterId: "ch", chapterTitle: "ch", sceneId: "s2", sceneTitle: "s2" },
      c3: { chapterId: "ch", chapterTitle: "ch", sceneId: "s3", sceneTitle: "s3" },
    });
    expect(buckets.ephemeral.some((x) => x.name === "Окурок сигареты")).toBe(true);
    expect(buckets.recurring.some((x) => x.name === "Комната")).toBe(true);
    expect(buckets.long_term.some((x) => x.name === "Ключ")).toBe(true);
  });
});
