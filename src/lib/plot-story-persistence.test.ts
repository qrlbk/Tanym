import { describe, expect, it } from "vitest";
import { buildPersistedPlotStory } from "./plot-story-persistence";
import type { PlotStoryState } from "@/stores/plotStoryStore";

function mkState(): PlotStoryState {
  const fact = {
    id: "f1",
    entity: "Алтын",
    entityType: "character",
    entityConfidence: 0.9,
    narrativeRole: null,
    attribute: "цель",
    value: "найти отца",
    chunkIds: ["c-1"],
  };
  return {
    facts: [fact],
    relations: [],
    salientObjects: [],
    consistencyWarnings: [],
    chekhovWarnings: [],
    analysisPhase: "ready",
    analysisMessage: null,
    lastAnalyzedAt: 1,
    analysisError: null,
    lastExtractionAt: 2,
    extractionError: null,
    warningStatuses: {},
    chunkSceneMap: {},
    fixSuggestionsByWarningKey: {},
    fixPreviewByWarningKey: {},
    fixApplyStateByWarningKey: {},
    resetStory: () => {},
    hydrateFromPersistence: () => {},
    applyFullExtraction: () => {},
    mergeSceneExtraction: () => {},
    setExtractionError: () => {},
    setWarningStatus: () => {},
    getWarningStatus: () => "new",
    setFixSuggestions: () => {},
    setFixPreview: () => {},
    setFixApplying: () => {},
    setFixApplied: () => {},
    setFixError: () => {},
    clearFixState: () => {},
    setAnalysisState: () => {},
  } as unknown as PlotStoryState;
}

describe("plot-story-persistence", () => {
  it("serialises only whitelisted keys", () => {
    const payload = buildPersistedPlotStory(mkState());
    expect(payload.version).toBe(2);
    expect(payload.facts[0].entity).toBe("Алтын");
    expect(payload.lastAnalyzedAt).toBe(1);
    expect((payload as unknown as Record<string, unknown>).resetStory).toBeUndefined();
    expect((payload as unknown as Record<string, unknown>).fixSuggestionsByWarningKey).toBeUndefined();
  });
});
