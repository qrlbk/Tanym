import { describe, expect, it } from "vitest";
import { serverTools } from "./tools";

describe("autofix tool surface", () => {
  it("exposes continuity autofix tools", () => {
    expect(serverTools.suggest_continuity_fix).toBeDefined();
    expect(serverTools.apply_continuity_fix).toBeDefined();
  });
});
