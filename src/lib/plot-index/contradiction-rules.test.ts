import { describe, expect, it } from "vitest";
import { detectRuleContradictionsFromChunks } from "./contradiction-rules";
import type { PlotChunk } from "./chunks";

function chunk(id: string, text: string): PlotChunk {
  return {
    id,
    text,
    from: 0,
    to: text.length,
    label: id,
    kind: "heading",
    chapterId: "ch-1",
    chapterTitle: "Chapter 1",
    sceneId: "sc-1",
    sceneTitle: "Scene 1",
    chunkVersion: 2,
    contentHash: `${id}-hash`,
  };
}

describe("detectRuleContradictionsFromChunks", () => {
  it("finds silence/noise contradiction in one chunk", () => {
    const warnings = detectRuleContradictionsFromChunks([
      chunk("c-1", "Стояла абсолютная тишина, которую перебивали громкие крики слуг."),
    ]);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.key.includes("silence-vs-noise"))).toBe(true);
    expect(warnings[0].source).toBe("rule_pass");
  });

  it("finds empty/full contradiction", () => {
    const warnings = detectRuleContradictionsFromChunks([
      chunk("c-2", "Стакан был совершенно пустой, до краев наполненный ядом."),
    ]);
    expect(warnings.some((w) => w.key.includes("empty-vs-full"))).toBe(true);
  });
});
