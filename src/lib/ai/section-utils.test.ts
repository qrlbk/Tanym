import { describe, it, expect } from "vitest";
import { findSectionRange } from "./section-utils";

describe("findSectionRange", () => {
  const sample = [
    { pos: 1, level: 1, text: "Intro" },
    { pos: 10, level: 2, text: "Part A" },
    { pos: 20, level: 3, text: "Detail" },
    { pos: 30, level: 2, text: "Part B" },
  ];

  it("resolves section by headingIndex; H2 closes at next H2 or H1", () => {
    expect(findSectionRange(sample, 100, { headingIndex: 1 })).toEqual({
      from: 10,
      to: 30,
    });
  });

  it("H3 section closes at next heading with level <= 3", () => {
    expect(findSectionRange(sample, 100, { headingIndex: 2 })).toEqual({
      from: 20,
      to: 30,
    });
  });

  it("H1 section runs to document end when no later H1", () => {
    expect(findSectionRange(sample, 100, { headingIndex: 0 })).toEqual({
      from: 1,
      to: 100,
    });
  });

  it("last heading section runs to doc end", () => {
    expect(findSectionRange(sample, 100, { headingIndex: 3 })).toEqual({
      from: 30,
      to: 100,
    });
  });

  it("finds by headingTextMatch (case-insensitive substring)", () => {
    expect(findSectionRange(sample, 100, { headingTextMatch: "part b" })).toEqual({
      from: 30,
      to: 100,
    });
  });

  it("returns null for out-of-range headingIndex", () => {
    expect(findSectionRange(sample, 100, { headingIndex: 10 })).toBeNull();
  });

  it("returns null when no headings", () => {
    expect(findSectionRange([], 50, { headingIndex: 0 })).toBeNull();
  });

  it("prefers headingIndex when both match fields could apply", () => {
    const headings = [
      { pos: 0, level: 2, text: "First" },
      { pos: 5, level: 2, text: "Second" },
    ];
    expect(
      findSectionRange(headings, 50, {
        headingIndex: 1,
        headingTextMatch: "First",
      }),
    ).toEqual({ from: 5, to: 50 });
  });
});
