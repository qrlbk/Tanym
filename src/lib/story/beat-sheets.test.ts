import { describe, expect, it } from "vitest";
import {
  BEAT_SHEET_TEMPLATES,
  HEROS_JOURNEY,
  SAVE_THE_CAT,
  THREE_ACT,
  getBeatSheetTemplate,
  renderBeatSheetTemplateForPrompt,
} from "./beat-sheets";

describe("beat sheet templates", () => {
  it("exports exactly the three roadmap templates", () => {
    expect(BEAT_SHEET_TEMPLATES).toHaveLength(3);
    expect(BEAT_SHEET_TEMPLATES.map((t) => t.id).sort()).toEqual(
      ["heros-journey", "save-the-cat", "three-act"].sort(),
    );
  });

  it.each([
    ["save-the-cat" as const, SAVE_THE_CAT, 15],
    ["three-act" as const, THREE_ACT, 8],
    ["heros-journey" as const, HEROS_JOURNEY, 12],
  ])("%s has the canonical number of beats", (_id, template, expectedCount) => {
    expect(template.beats).toHaveLength(expectedCount);
  });

  it("beats are sorted by position", () => {
    for (const template of BEAT_SHEET_TEMPLATES) {
      const positions = template.beats.map((b) => b.position);
      const sorted = [...positions].sort((a, b) => a - b);
      expect(positions).toEqual(sorted);
      expect(positions[0]).toBeGreaterThanOrEqual(0);
      expect(positions[positions.length - 1]).toBeLessThanOrEqual(1);
    }
  });

  it("beat ids are unique within a template", () => {
    for (const template of BEAT_SHEET_TEMPLATES) {
      const ids = template.beats.map((b) => b.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("getBeatSheetTemplate throws on unknown id", () => {
    expect(() =>
      // @ts-expect-error — сознательно передаём невалидный id
      getBeatSheetTemplate("unknown"),
    ).toThrow();
  });

  it("renders a template as markdown with premise", () => {
    const md = renderBeatSheetTemplateForPrompt(THREE_ACT, "Детектив расследует убийство");
    expect(md).toContain("Трёх");
    expect(md).toContain("Детектив расследует убийство");
    expect(md).toContain("Inciting Incident");
    expect(md).toContain("%");
  });

  it("renders placeholder when premise empty", () => {
    const md = renderBeatSheetTemplateForPrompt(THREE_ACT, "");
    expect(md).toContain("премиса не задана");
  });
});
