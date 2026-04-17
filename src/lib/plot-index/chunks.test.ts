import { describe, it, expect } from "vitest";
import { fnv1a32, computePlotChunks } from "./chunks";

describe("fnv1a32", () => {
  it("returns stable hex for same input", () => {
    expect(fnv1a32("hello")).toBe(fnv1a32("hello"));
  });

  it("differs for different input", () => {
    expect(fnv1a32("a")).not.toBe(fnv1a32("b"));
  });
});

describe("computePlotChunks", () => {
  it("attaches chapter and scene metadata", () => {
    const headings = [
      { pos: 1, level: 1, text: "Chapter 1" },
      { pos: 120, level: 2, text: "Scene 1.1" },
      { pos: 240, level: 2, text: "Scene 1.2" },
    ];
    const editor = {
      state: {
        doc: {
          content: { size: 500 },
          descendants(
            cb: (node: { type: { name: string }; attrs: { level: number }; textContent: string }, pos: number) => void,
          ) {
            for (const h of headings) {
              cb(
                {
                  type: { name: "heading" },
                  attrs: { level: h.level },
                  textContent: h.text,
                },
                h.pos,
              );
            }
          },
          textBetween(from: number, to: number) {
            return `sample-${from}-${to} text`;
          },
        },
      },
    };
    const chunks = computePlotChunks(editor as never);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].chapterId).toBeTruthy();
    expect(chunks[0].sceneId).toBeTruthy();
    expect(chunks[0].chunkVersion).toBe(2);
  });
});
