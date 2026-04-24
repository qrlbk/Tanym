import { beforeEach, describe, expect, it } from "vitest";
import { usePlotStoryStore } from "./plotStoryStore";
import { buildProblemItems } from "@/lib/plot-index/problem-items";
import type { PlotChunk } from "@/lib/plot-index/chunks";

describe("plot story -> problem panel pipeline", () => {
  beforeEach(() => {
    usePlotStoryStore.getState().resetStory();
  });

  it("produces problem items from extracted conflicts", () => {
    const chunks: PlotChunk[] = [
      {
        id: "c-1",
        text: "Hero fears water.",
        from: 0,
        to: 16,
        label: "1",
        kind: "heading",
        chapterId: "ch-1",
        chapterTitle: "Chapter",
        sceneId: "s-1",
        sceneTitle: "Scene",
        chunkVersion: 2,
        contentHash: "h1",
      },
      {
        id: "c-2",
        text: "Hero calmly swims across the river.",
        from: 17,
        to: 49,
        label: "2",
        kind: "heading",
        chapterId: "ch-1",
        chapterTitle: "Chapter",
        sceneId: "s-2",
        sceneTitle: "Scene 2",
        chunkVersion: 2,
        contentHash: "h2",
      },
    ];

    usePlotStoryStore.getState().applyFullExtraction(
      {
        facts: [
          {
            entity: "Hero",
            entityType: "character",
            entityConfidence: 0.9,
            narrativeRole: null,
            attribute: "water_state",
            value: "fears water",
            chunkIds: ["c-1"],
          },
          {
            entity: "Hero",
            entityType: "character",
            entityConfidence: 0.9,
            narrativeRole: null,
            attribute: "water_state",
            value: "calm swimmer",
            chunkIds: ["c-2"],
          },
        ],
        relations: [],
        salientObjects: [{ name: "Amulet", description: "Mystery", chunkId: "c-1" }],
      },
      chunks,
    );

    const state = usePlotStoryStore.getState();
    const items = buildProblemItems({
      consistencyWarnings: state.consistencyWarnings,
      chekhovWarnings: state.chekhovWarnings,
      salientObjects: state.salientObjects,
      facts: state.facts,
      chunks,
      warningStatuses: state.warningStatuses,
    });
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((item) => item.category === "Contradictions")).toBe(true);
  });
});
