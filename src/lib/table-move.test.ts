import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/react";
import { CellSelection } from "@tiptap/pm/tables";
import type { Node as PMNode } from "@tiptap/pm/model";
import { getExtensions } from "@/components/Editor/extensions";

function collectCellAnchors(doc: PMNode): number[] {
  const anchors: number[] = [];
  doc.descendants((node, pos) => {
    if (
      node.type.spec.tableRole === "cell" ||
      node.type.spec.tableRole === "header_cell"
    ) {
      anchors.push(pos);
    }
    return true;
  });
  return anchors;
}

function tableChildIndex(doc: PMNode): number {
  const page = doc.child(0);
  for (let i = 0; i < page.childCount; i++) {
    if (page.child(i).type.name === "table") return i;
  }
  return -1;
}

function makeEditor() {
  return new Editor({
    element: document.createElement("div"),
    extensions: getExtensions(),
    content: {
      type: "doc",
      content: [
        {
          type: "docPage",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "before" }],
            },
            { type: "paragraph" },
            {
              type: "paragraph",
              content: [{ type: "text", text: "after" }],
            },
          ],
        },
      ],
    },
  });
}

/** Один абзац на странице — insertTable заменяет его, остаётся только таблица. */
function makeEditorSingleParagraph() {
  return new Editor({
    element: document.createElement("div"),
    extensions: getExtensions(),
    content: {
      type: "doc",
      content: [
        {
          type: "docPage",
          content: [{ type: "paragraph" }],
        },
      ],
    },
  });
}

describe("table-move", () => {
  it("moveTableDown swaps table with following paragraph (text selection in cell)", () => {
    const editor = makeEditor();
    const docPage = editor.state.doc.child(0);
    const posSecondBlock = docPage.child(0).nodeSize + 1;
    editor.commands.setTextSelection(posSecondBlock + 1);
    expect(editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false })).toBe(
      true,
    );

    expect(tableChildIndex(editor.state.doc)).toBe(1);

    const ok = editor.commands.moveTableDown();
    expect(ok).toBe(true);
    expect(tableChildIndex(editor.state.doc)).toBe(2);

    editor.destroy();
  });

  it("moveTableUp swaps table with previous paragraph (text selection in cell)", () => {
    const editor = makeEditor();
    const docPage = editor.state.doc.child(0);
    const posSecondBlock = docPage.child(0).nodeSize + 1;
    editor.commands.setTextSelection(posSecondBlock + 1);
    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });
    editor.commands.moveTableDown();
    expect(tableChildIndex(editor.state.doc)).toBe(2);

    const [a0] = collectCellAnchors(editor.state.doc);
    expect(a0).toBeDefined();
    editor.commands.setTextSelection(a0! + 2);

    const ok = editor.commands.moveTableUp();
    expect(ok).toBe(true);
    expect(tableChildIndex(editor.state.doc)).toBe(1);

    editor.destroy();
  });

  it("moveTableUp works when selection is CellSelection (multi-cell)", () => {
    const editor = makeEditor();
    const docPage = editor.state.doc.child(0);
    const posSecondBlock = docPage.child(0).nodeSize + 1;
    editor.commands.setTextSelection(posSecondBlock + 1);
    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });

    const anchors = collectCellAnchors(editor.state.doc);
    expect(anchors.length).toBeGreaterThanOrEqual(2);

    const sel = CellSelection.create(
      editor.state.doc,
      anchors[0]!,
      anchors[1]!,
    );
    editor.view.dispatch(editor.state.tr.setSelection(sel));

    expect(editor.commands.moveTableUp()).toBe(true);
    expect(tableChildIndex(editor.state.doc)).toBe(0);

    editor.destroy();
  });

  it("moveTableDown works when table is the only block in docPage (insertTable replaces paragraph)", () => {
    const editor = makeEditorSingleParagraph();
    editor.commands.setTextSelection(2);
    expect(editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false })).toBe(true);
    expect(editor.state.doc.child(0).childCount).toBe(1);

    expect(editor.commands.moveTableDown()).toBe(true);
    const page = editor.state.doc.child(0);
    expect(page.childCount).toBe(2);
    expect(page.child(0).type.name).toBe("paragraph");
    expect(page.child(1).type.name).toBe("table");

    editor.destroy();
  });

  it("moveTableUp works when table is the only block (pads with paragraph then swaps)", () => {
    const editor = makeEditorSingleParagraph();
    editor.commands.setTextSelection(2);
    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });
    expect(editor.state.doc.child(0).childCount).toBe(1);

    expect(editor.commands.moveTableUp()).toBe(true);
    const page = editor.state.doc.child(0);
    expect(page.childCount).toBe(2);
    expect(page.child(0).type.name).toBe("table");
    expect(page.child(1).type.name).toBe("paragraph");

    editor.destroy();
  });

  it("chain().focus().moveTableUp() applies one transaction (no mismatched tr)", () => {
    const editor = makeEditor();
    const docPage = editor.state.doc.child(0);
    const posSecondBlock = docPage.child(0).nodeSize + 1;
    editor.commands.setTextSelection(posSecondBlock + 1);
    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });

    const [a0] = collectCellAnchors(editor.state.doc);
    expect(a0).toBeDefined();
    editor.commands.setTextSelection(a0! + 2);

    expect(() =>
      editor.chain().focus().moveTableUp().run(),
    ).not.toThrow();
    expect(tableChildIndex(editor.state.doc)).toBe(0);

    editor.destroy();
  });
});
