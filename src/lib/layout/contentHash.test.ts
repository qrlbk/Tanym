import { describe, expect, it } from "vitest";
import { computeContentHash } from "./contentHash";

type FakeMark = {
  type: { name: string };
  attrs: Record<string, unknown>;
};

function makeFakeNode(params: {
  typeName: string;
  text: string;
  marks: FakeMark[];
  attrs?: Record<string, unknown>;
}) {
  return {
    type: { name: params.typeName },
    attrs: params.attrs ?? {},
    textContent: params.text,
    descendants: (cb: (node: { isText: boolean; marks: FakeMark[] }) => boolean) => {
      cb({ isText: true, marks: params.marks });
      return true;
    },
  } as never;
}

describe("computeContentHash", () => {
  it("normalizes whitespace and invisible characters", () => {
    const nodeA = makeFakeNode({
      typeName: "paragraph",
      text: "Hello   \u200Bworld",
      marks: [],
    });
    const nodeB = makeFakeNode({
      typeName: "paragraph",
      text: "Hello world",
      marks: [],
    });
    expect(computeContentHash(nodeA)).toBe(computeContentHash(nodeB));
  });

  it("is stable for different mark order", () => {
    const bold: FakeMark = { type: { name: "bold" }, attrs: {} };
    const italic: FakeMark = { type: { name: "italic" }, attrs: {} };
    const nodeA = makeFakeNode({
      typeName: "paragraph",
      text: "same text",
      marks: [bold, italic],
    });
    const nodeB = makeFakeNode({
      typeName: "paragraph",
      text: "same text",
      marks: [italic, bold],
    });
    expect(computeContentHash(nodeA)).toBe(computeContentHash(nodeB));
  });
});

