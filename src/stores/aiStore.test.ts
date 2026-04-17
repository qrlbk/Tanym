import { describe, expect, it } from "vitest";
import { listAvailableProviders } from "./aiStore";

describe("listAvailableProviders", () => {
  it("returns all providers when offlineOnly=false", () => {
    const all = listAvailableProviders(false);
    expect(all.length).toBeGreaterThan(0);
    const families = new Set(all.map((p) => p.family));
    expect(families.has("openai")).toBe(true);
    expect(families.has("anthropic")).toBe(true);
    expect(families.has("local-ollama")).toBe(true);
  });

  it("keeps only local providers when offlineOnly=true", () => {
    const local = listAvailableProviders(true);
    expect(local.length).toBeGreaterThan(0);
    for (const p of local) {
      expect(p.family).toBe("local-ollama");
    }
  });
});
