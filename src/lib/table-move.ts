import { findParentNode, type CommandProps } from "@tiptap/core";

function getTableFromSelection(selection: CommandProps["state"]["selection"]) {
  return findParentNode((n) => n.type.name === "table")(selection);
}

/**
 * Переместить таблицу на одну позицию вверх среди соседей в родителе.
 * Должен работать только через `tr` из CommandProps (в т.ч. внутри chain().focus()…),
 * без отдельного view.dispatch — иначе ProseMirror: «Applying a mismatched transaction».
 *
 * insertTable в TipTap заменяет текущий блок — часто таблица оказывается единственным
 * блоком в docPage. Тогда соседей нет: добавляем пустой абзац перед таблицей и затем
 * меняем местами (аналогично для «вниз»).
 */
export function moveTableUp(props: CommandProps): boolean {
  const { state, tr } = props;
  if (props.dispatch === undefined) {
    return !!getTableFromSelection(state.selection);
  }

  const found = getTableFromSelection(state.selection);
  if (!found) return false;

  const { schema } = state;
  let doc = state.doc;
  let tablePos = found.pos;
  const tableNode = found.node;
  const tableDepth = found.depth;
  const tableSize = tableNode.nodeSize;

  const parentDepth = tableDepth - 1;
  if (parentDepth < 0) return false;

  let $inTable = doc.resolve(tablePos + 1);
  let parent = $inTable.node(parentDepth);
  let index = $inTable.index(parentDepth);

  if (index === 0) {
    tr.insert(tablePos, schema.nodes.paragraph.create());
    tablePos = tr.mapping.map(tablePos);
    doc = tr.doc;
    $inTable = doc.resolve(tablePos + 1);
    parent = $inTable.node(parentDepth);
    index = $inTable.index(parentDepth);
  }

  if (index === 0) return false;

  const parentContentStart = $inTable.start(parentDepth);
  let insertPos = parentContentStart;
  for (let i = 0; i < index - 1; i++) {
    insertPos += parent.child(i).nodeSize;
  }

  const slice = doc.slice(tablePos, tablePos + tableSize);
  tr.delete(tablePos, tablePos + tableSize);
  tr.insert(insertPos, slice.content);
  return true;
}

export function moveTableDown(props: CommandProps): boolean {
  const { state, tr } = props;
  if (props.dispatch === undefined) {
    return !!getTableFromSelection(state.selection);
  }

  const found = getTableFromSelection(state.selection);
  if (!found) return false;

  const { schema } = state;
  let doc = state.doc;
  let tablePos = found.pos;
  const tableNode = found.node;
  const tableDepth = found.depth;
  const tableSize = tableNode.nodeSize;

  const parentDepth = tableDepth - 1;
  if (parentDepth < 0) return false;

  let $inTable = doc.resolve(tablePos + 1);
  let parent = $inTable.node(parentDepth);
  let index = $inTable.index(parentDepth);

  if (index >= parent.childCount - 1) {
    tr.insert(tablePos + tableSize, schema.nodes.paragraph.create());
    tablePos = tr.mapping.map(tablePos);
    doc = tr.doc;
    $inTable = doc.resolve(tablePos + 1);
    parent = $inTable.node(parentDepth);
    index = $inTable.index(parentDepth);
  }

  if (index >= parent.childCount - 1) return false;

  const nextSiblingSize = parent.child(index + 1).nodeSize;

  const slice = doc.slice(tablePos, tablePos + tableSize);
  tr.delete(tablePos, tablePos + tableSize);
  tr.insert(tablePos + nextSiblingSize, slice.content);
  return true;
}
