import { describe, expect, it } from "vitest";
import { buildStoryOutlineFromDoc, findSceneByPosition } from "./outline";

function makeMockDoc() {
  const headings = [
    { pos: 1, level: 1, text: "Chapter 1" },
    { pos: 120, level: 2, text: "Scene 1.1" },
    { pos: 240, level: 2, text: "Scene 1.2" },
    { pos: 360, level: 1, text: "Chapter 2" },
    { pos: 480, level: 2, text: "Scene 2.1" },
  ];
  return {
    content: { size: 700 },
    descendants(cb: (node: { type: { name: string }; attrs: { level: number }; textContent: string }, pos: number) => void) {
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
      return `text-${from}-${to}`;
    },
  };
}

describe("buildStoryOutlineFromDoc", () => {
  it("builds chapter->scene structure from headings", () => {
    const outline = buildStoryOutlineFromDoc(makeMockDoc() as never);
    expect(outline.chapters.length).toBe(2);
    expect(outline.chapters[0].scenes.length).toBe(2);
    expect(outline.chapters[1].scenes.length).toBe(1);
    expect(outline.chapters[0].title).toBe("Chapter 1");
    expect(outline.chapters[0].scenes[0].title).toBe("Scene 1.1");
  });

  it("finds scene by position", () => {
    const outline = buildStoryOutlineFromDoc(makeMockDoc() as never);
    const scene = findSceneByPosition(outline, 250);
    expect(scene?.title).toBe("Scene 1.2");
  });

  it("merges H3+ into the previous H2 scene instead of creating many scenes", () => {
    const headings = [
      { pos: 1, level: 1, text: "Part I" },
      { pos: 50, level: 2, text: "Opening" },
      { pos: 100, level: 3, text: "Beat A" },
      { pos: 150, level: 3, text: "Beat B" },
    ];
    const doc = {
      content: { size: 400 },
      descendants(cb: (node: { type: { name: string }; attrs: { level: number }; textContent: string }, pos: number) => void) {
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
        return `text-${from}-${to}`;
      },
    };
    const outline = buildStoryOutlineFromDoc(doc as never);
    expect(outline.chapters.length).toBe(1);
    expect(outline.chapters[0].scenes.length).toBe(1);
    expect(outline.chapters[0].scenes[0].title).toBe("Opening");
  });
});
