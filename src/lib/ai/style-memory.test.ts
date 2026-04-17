import { describe, expect, it } from "vitest";
import {
  createEmptyStyleMemory,
  renderStyleMemoryForPrompt,
} from "./style-memory";

describe("renderStyleMemoryForPrompt", () => {
  it("returns empty string when memory is null", () => {
    expect(renderStyleMemoryForPrompt(null)).toBe("");
    expect(renderStyleMemoryForPrompt(undefined)).toBe("");
  });

  it("returns empty string when memory is structurally empty", () => {
    expect(renderStyleMemoryForPrompt(createEmptyStyleMemory())).toBe("");
  });

  it("renders description when present", () => {
    const out = renderStyleMemoryForPrompt({
      description: "Короткие фразы, настоящее время.",
      examples: [],
      rules: [],
      avoid: [],
      updatedAt: "2026-01-01",
    });
    expect(out).toContain("Style memory");
    expect(out).toContain("Короткие фразы, настоящее время.");
  });

  it("renders rules and avoid as bullet lists", () => {
    const out = renderStyleMemoryForPrompt({
      description: "",
      examples: [],
      rules: ["Без наречий на -ly", "Активный залог"],
      avoid: ["вдруг", "внезапно"],
      updatedAt: "2026-01-01",
    });
    expect(out).toContain("- Без наречий на -ly");
    expect(out).toContain("- Активный залог");
    expect(out).toContain("- вдруг");
    expect(out).toContain("- внезапно");
  });

  it("truncates examples to first 5", () => {
    const memory = {
      description: "",
      examples: ["a", "b", "c", "d", "e", "f", "g"],
      rules: [],
      avoid: [],
      updatedAt: "2026-01-01",
    };
    const out = renderStyleMemoryForPrompt(memory);
    expect(out).toContain("> a");
    expect(out).toContain("> e");
    expect(out).not.toContain("> f");
    expect(out).not.toContain("> g");
  });

  it("flattens multi-line examples to one quoted line", () => {
    const out = renderStyleMemoryForPrompt({
      description: "",
      examples: ["Строка один.\nСтрока два."],
      rules: [],
      avoid: [],
      updatedAt: "2026-01-01",
    });
    expect(out).toContain("> Строка один. Строка два.");
    expect(out).not.toMatch(/>.*\n.*Строка два/);
  });
});
