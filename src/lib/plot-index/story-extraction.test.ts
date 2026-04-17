import { describe, it, expect } from "vitest";
import { mergeFactsAndDetectConflicts, mergeRelations } from "./story-extraction";

describe("mergeFactsAndDetectConflicts", () => {
  it("detects conflicting attribute values", () => {
    const { facts, warnings } = mergeFactsAndDetectConflicts(
      [],
      [
        {
          entity: "Анна",
          entityType: "character",
          entityConfidence: 0.91,
          narrativeRole: null,
          attribute: "цвет_глаз",
          value: "зелёные",
          chunkIds: ["h-0-p0"],
        },
        {
          entity: "Анна",
          entityType: "character",
          entityConfidence: 0.91,
          narrativeRole: null,
          attribute: "цвет_глаз",
          value: "карие",
          chunkIds: ["h-1-p0"],
        },
      ],
    );
    expect(warnings.length).toBe(1);
    expect(warnings[0].message).toBe(
      `"Анна" / цвет_глаз: was "зелёные", now "карие".`,
    );
    expect(warnings[0].previousValue).toBe("зелёные");
    expect(warnings[0].newValue).toBe("карие");
    expect(warnings[0].kind).toBe("fact_conflict");
    expect(warnings[0].source).toBe("fact_merge");
    expect(warnings[0].confidence).toBeGreaterThan(0.5);
    expect(warnings[0].key).toContain("анна|цвет_глаз");
    expect(facts.length).toBe(1);
    expect(facts[0].value).toBe("карие");
  });

  it("detects timeline conflicts by attribute heuristics", () => {
    const { warnings } = mergeFactsAndDetectConflicts(
      [],
      [
        {
          entity: "Arthur",
          entityType: "character",
          entityConfidence: 0.87,
          narrativeRole: null,
          attribute: "timeline_status",
          value: "после полуночи",
          chunkIds: ["c-1-s-1-p0"],
        },
        {
          entity: "Arthur",
          entityType: "character",
          entityConfidence: 0.87,
          narrativeRole: null,
          attribute: "timeline_status",
          value: "утром того же дня",
          chunkIds: ["c-1-s-2-p0"],
        },
      ],
    );
    expect(warnings.length).toBe(1);
    expect(warnings[0].kind).toBe("timeline_conflict");
  });

  it("keeps higher-confidence entity classification on merge", () => {
    const { facts } = mergeFactsAndDetectConflicts(
      [],
      [
        {
          entity: "Ключ",
          entityType: "object",
          entityConfidence: 0.92,
          narrativeRole: "clue",
          attribute: "owner",
          value: "граф",
          chunkIds: ["c-1"],
        },
        {
          entity: "Ключ",
          entityType: "character",
          entityConfidence: 0.41,
          narrativeRole: null,
          attribute: "owner",
          value: "граф",
          chunkIds: ["c-2"],
        },
      ],
    );
    expect(facts.length).toBe(1);
    expect(facts[0].entityType).toBe("object");
    expect(facts[0].narrativeRole).toBe("clue");
  });
});

describe("mergeRelations", () => {
  it("dedupes same edge", () => {
    const r = mergeRelations(
      [],
      [
        {
          entityA: "А",
          entityB: "Б",
          relation: "friend",
          chunkIds: ["a"],
        },
        {
          entityA: "А",
          entityB: "Б",
          relation: "friend",
          chunkIds: ["b"],
        },
      ],
    );
    expect(r.length).toBe(1);
    expect(r[0].chunkIds.sort()).toEqual(["a", "b"].sort());
  });
});
