import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/react";
import { getExtensions } from "@/components/Editor/extensions";

function makeEditor() {
  return new Editor({
    element: document.createElement("div"),
    extensions: getExtensions(),
    content: {
      type: "doc",
      content: [
        {
          type: "docPage",
          content: [{ type: "paragraph", content: [{ type: "text", text: "hello world" }] }],
        },
      ],
    },
  });
}

describe("BlockId extension", () => {
  it("assigns unique ids after split", () => {
    const editor = makeEditor();
    editor.commands.setTextSelection(8);
    editor.commands.splitBlock();

    const page = editor.state.doc.child(0);
    expect(page.childCount).toBeGreaterThanOrEqual(2);
    const a = (page.child(0).attrs as Record<string, unknown>).blockId;
    const b = (page.child(1).attrs as Record<string, unknown>).blockId;
    expect(typeof a).toBe("string");
    expect(typeof b).toBe("string");
    expect(a).not.toBe(b);
    editor.destroy();
  });

  it("deduplicates ids after inserting copied block attrs", () => {
    const editor = makeEditor();
    editor.commands.setTextSelection(8);
    editor.commands.splitBlock();
    const page = editor.state.doc.child(0);
    const originalAttrs = page.child(0).attrs as Record<string, unknown>;
    const duplicatedId = originalAttrs.blockId;

    editor
      .chain()
      .focus()
      .insertContent({
        type: "paragraph",
        attrs: { ...originalAttrs, blockId: duplicatedId },
        content: [{ type: "text", text: "copy" }],
      })
      .run();

    const ids = new Set<string>();
    for (let i = 0; i < editor.state.doc.child(0).childCount; i++) {
      const id = (editor.state.doc.child(0).child(i).attrs as Record<string, unknown>)
        .blockId;
      expect(typeof id).toBe("string");
      expect(ids.has(id as string)).toBe(false);
      ids.add(id as string);
    }
    editor.destroy();
  });
});

