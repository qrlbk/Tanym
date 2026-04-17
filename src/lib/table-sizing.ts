import type { Editor } from "@tiptap/react";
import { findParentNode } from "@tiptap/core";
import { TableMap } from "@tiptap/pm/tables";

/** Убирает сохранённые ширины колонок — таблица снова делит ширину поровну. */
export function resetTableColumnWidths(editor: Editor): boolean {
  const { state } = editor;
  const found = findParentNode((n) => n.type.name === "table")(state.selection);
  if (!found) return false;

  const tr = state.tr;
  const { node: tableNode, pos: tablePos } = found;
  let changed = false;

  tableNode.descendants((node, pos) => {
    if (node.type.name !== "tableCell" && node.type.name !== "tableHeader") {
      return;
    }
    if (node.attrs.colwidth == null) return;
    const absPos = tablePos + 1 + pos;
    tr.setNodeMarkup(absPos, undefined, {
      ...node.attrs,
      colwidth: null,
    });
    changed = true;
  });

  if (!changed) return false;
  editor.view.dispatch(tr);
  return true;
}

/**
 * Одинаковая ширина колонок (px) по ширине обёртки таблицы в DOM.
 */
export function distributeTableColumnWidths(editor: Editor): boolean {
  const { state, view } = editor;
  const found = findParentNode((n) => n.type.name === "table")(state.selection);
  if (!found) return false;

  const { node: table, pos: tablePos } = found;
  const map = TableMap.get(table);
  if (map.width === 0) return false;

  const dom = view.nodeDOM(tablePos) as HTMLElement | null;
  const wrap = dom?.closest(".tableWrapper") ?? dom?.parentElement;
  const clientW = wrap?.clientWidth ?? dom?.clientWidth ?? 0;
  const inner = Math.max(map.width * 40, clientW > 0 ? clientW - 8 : map.width * 72);
  const perCol = Math.max(40, Math.floor(inner / map.width));

  const tr = state.tr;
  let c = 0;
  while (c < map.width) {
    const rel = map.map[c];
    const cell = table.nodeAt(rel);
    if (!cell) {
      c += 1;
      continue;
    }
    const { top } = map.findCell(rel);
    if (top !== 0) break;
    const colspan = cell.attrs.colspan ?? 1;
    tr.setNodeMarkup(tablePos + 1 + rel, undefined, {
      ...cell.attrs,
      colwidth: Array.from({ length: colspan }, () => perCol),
    });
    c += colspan;
  }

  if (!tr.docChanged) return false;
  editor.view.dispatch(tr);
  return true;
}
