import { describe, expect, it } from "vitest";
import { buildContinuityFixSuggestions } from "./autofix";
import type { ConsistencyWarning } from "./story-extraction";

const warning: ConsistencyWarning = {
  id: "w1",
  key: "arthur|arm/injured->healthy",
  kind: "fact_conflict",
  source: "fact_merge",
  confidence: 0.9,
  message: "Arthur arm status conflict",
  entity: "Arthur",
  attribute: "arm_status",
  previousValue: "injured",
  newValue: "healthy",
  previousChunkIds: ["c-0-s-0-p0"],
  newChunkIds: ["c-0-s-2-p0"],
};

describe("buildContinuityFixSuggestions", () => {
  it("returns three strategy variants", () => {
    const suggestions = buildContinuityFixSuggestions({
      warning,
      chunkId: "c-0-s-2-p0",
      chunkText: "Arthur is healthy and runs quickly.",
      chunkFrom: 100,
    });
    expect(suggestions.length).toBe(3);
    expect(suggestions.map((s) => s.strategy)).toEqual([
      "minimal",
      "conservative",
      "radical",
    ]);
    expect(suggestions.map((s) => s.title)).toEqual([
      "Точечная замена",
      "Добавить пояснение",
      "Авторская заметка (вставка в текст)",
    ]);
    expect(suggestions[0].expectedCurrentText).toBe("healthy");
    expect(suggestions[0].editKind).toBe("replace");
    expect(suggestions[0].locatorStrategy).toBe("exact_target");
    expect(suggestions[0].spanFingerprint.length).toBeGreaterThan(5);
  });

  it("produces valid absolute replacement range", () => {
    const [minimal] = buildContinuityFixSuggestions({
      warning,
      chunkId: "c-0-s-2-p0",
      chunkText: "Arthur is healthy and runs quickly.",
      chunkFrom: 42,
    });
    expect(minimal.replaceFrom).toBeGreaterThanOrEqual(42);
    expect(minimal.replaceTo).toBeGreaterThan(minimal.replaceFrom);
  });

  it("keeps suggestions meaningful when target text is absent", () => {
    const [minimal] = buildContinuityFixSuggestions({
      warning,
      chunkId: "c-0-s-2-p0",
      chunkText: "Arthur runs quickly and says nothing about his arm.",
      chunkFrom: 10,
    });
    expect(minimal.beforeText).not.toEqual(minimal.afterText);
    expect(minimal.replacementText.toLowerCase()).toContain("continuity note");
    expect(minimal.replaceTo).toBe(minimal.replaceFrom);
    expect(minimal.expectedCurrentText).toBe("");
    expect(minimal.locatorStrategy).toBe("evidence_fuzzy");
  });
});
