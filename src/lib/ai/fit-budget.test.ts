import { describe, expect, it } from "vitest";
import { fitToBudget } from "./fit-budget";

describe("fitToBudget", () => {
  it("keeps every section when budget is generous", () => {
    const result = fitToBudget(
      [
        { id: "a", priority: 10, text: "aaa" },
        { id: "b", priority: 5, text: "bbb" },
      ],
      1000,
    );
    expect(result.keptIds).toEqual(["a", "b"]);
    expect(result.droppedIds).toEqual([]);
    expect(result.truncated).toBe(false);
    expect(result.combined).toContain("aaa");
    expect(result.combined).toContain("bbb");
  });

  it("drops lower priority sections when over budget", () => {
    const result = fitToBudget(
      [
        { id: "outline", priority: 100, text: "x".repeat(40) },
        { id: "chars", priority: 50, text: "y".repeat(40) },
        { id: "synopses", priority: 10, text: "z".repeat(200) },
      ],
      120,
    );
    expect(result.keptIds).toEqual(["outline", "chars"]);
    expect(result.droppedIds).toEqual(["synopses"]);
    expect(result.truncated).toBe(true);
  });

  it("preserves original order of kept sections", () => {
    const result = fitToBudget(
      [
        { id: "first", priority: 1, text: "AAA" },
        { id: "second", priority: 100, text: "BBB" },
      ],
      1000,
    );
    expect(result.keptIds).toEqual(["first", "second"]);
    expect(result.combined.indexOf("AAA")).toBeLessThan(
      result.combined.indexOf("BBB"),
    );
  });

  it("hard-truncates when a single section is bigger than the budget", () => {
    const result = fitToBudget(
      [{ id: "huge", priority: 1, text: "x".repeat(500) }],
      100,
    );
    expect(result.combined.length).toBeLessThanOrEqual(100);
    expect(result.truncated).toBe(true);
  });
});
