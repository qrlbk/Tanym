import { describe, expect, it } from "vitest";
import { PROVIDERS, getProvider, pickModelFor } from "./providers";

describe("providers", () => {
  it("exposes at least OpenAI + Anthropic + Google families", () => {
    const families = new Set(PROVIDERS.map((p) => p.family));
    expect(families.has("openai")).toBe(true);
    expect(families.has("anthropic")).toBe(true);
    expect(families.has("google")).toBe(true);
  });

  it("getProvider returns a sensible fallback", () => {
    const p = getProvider("unknown");
    expect(p).toBeDefined();
    expect(p.id).toBeTruthy();
  });

  it("pickModelFor('planner') prefers a reasoning-capable model", () => {
    const planner = pickModelFor("planner");
    expect(
      planner.capability === "reasoning" || planner.id === "openai-gpt4o",
    ).toBe(true);
  });

  it("pickModelFor('long-read') prefers a long-context model", () => {
    const lr = pickModelFor("long-read");
    expect(lr.capability).toBe("long-context");
  });

  it("explicit preferredId overrides router choice", () => {
    const p = pickModelFor("draft", "openai-gpt4o");
    expect(p.id).toBe("openai-gpt4o");
  });
});
