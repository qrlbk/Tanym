import { describe, expect, it } from "vitest";
import type { PlotFact } from "@/lib/plot-index/story-extraction";
import { createDefaultProject } from "@/lib/project/defaults";
import {
  buildSceneOrderIndex,
  computeCharacterLastPresence,
  isCharacterLongAbsent,
} from "@/lib/project/character-presence";

describe("character presence", () => {
  it("buildSceneOrderIndex follows chapter and scene order", () => {
    const project = createDefaultProject();
    const idx = buildSceneOrderIndex(project);
    expect(idx.length).toBeGreaterThan(0);
    expect(idx[0]?.linearIndex).toBe(0);
  });

  it("computeCharacterLastPresence picks latest scene from facts", () => {
    const project = createDefaultProject();
    const sceneId = project.chapters[0]!.scenes[0]!.id;
    const facts: PlotFact[] = [
      {
        id: "f1",
        entity: "Anna",
        entityType: "character",
        entityConfidence: 0.9,
        narrativeRole: null,
        attribute: "mood",
        value: "calm",
        chunkIds: ["chunk-a"],
      },
    ];
    const chunkSceneMap = {
      "chunk-a": {
        chapterId: project.chapters[0]!.id,
        chapterTitle: project.chapters[0]!.title,
        sceneId,
        sceneTitle: project.chapters[0]!.scenes[0]!.title,
      },
    };
    const p = computeCharacterLastPresence(
      project,
      facts,
      "Anna",
      [],
      chunkSceneMap,
    );
    expect(p.lastSceneId).toBe(sceneId);
    expect(p.linearIndex).toBe(0);
  });

  it("isCharacterLongAbsent is false when unknown presence", () => {
    const project = createDefaultProject();
    const p = computeCharacterLastPresence(project, [], "Nobody", [], {});
    expect(isCharacterLongAbsent(p, project, 3)).toBe(false);
  });
});
