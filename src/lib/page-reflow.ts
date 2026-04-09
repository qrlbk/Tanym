import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";

export const PAGE_REFLOW_META = "pageReflow";

type PageInfo = { pos: number; node: PMNode };

function collectDocPages(doc: PMNode): PageInfo[] {
  const pages: PageInfo[] = [];
  let pos = 1;
  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i);
    if (child.type.name === "docPage") {
      pages.push({ pos, node: child });
    }
    pos += child.nodeSize;
  }
  return pages;
}

function pageUsedHeight(body: HTMLElement): number {
  const children = Array.from(body.children) as HTMLElement[];
  let used = 0;
  let prevBottom = 0;
  for (const child of children) {
    const bottom = child.offsetTop + child.offsetHeight;
    const chunk = Math.max(0, bottom - prevBottom);
    used += chunk;
    prevBottom = bottom;
  }
  return used;
}

function pageBodyOverflows(body: HTMLElement, contentH: number): boolean {
  return pageUsedHeight(body) > contentH + 2;
}

function childNodesArray(node: PMNode): PMNode[] {
  const out: PMNode[] = [];
  node.content.forEach((child) => {
    out.push(child);
  });
  return out;
}

function cloneNodeWithContent(node: PMNode, content: PMNode[]): PMNode {
  return node.type.create(node.attrs, content, node.marks);
}

/** Первая строка — строка заголовка (все ячейки tableHeader), как после импорта <th>. */
function rowIsHeaderRow(row: PMNode): boolean {
  if (row.type.name !== "tableRow" || row.childCount === 0) return false;
  for (let i = 0; i < row.childCount; i++) {
    if (row.child(i).type.name !== "tableHeader") return false;
  }
  return true;
}

function withRepeatedTableHeader(
  allRowNodes: PMNode[],
  bottomRows: PMNode[],
  fitCount: number,
): PMNode[] {
  if (allRowNodes.length < 2 || bottomRows.length === 0) return bottomRows;
  const header = allRowNodes[0]!;
  if (!rowIsHeaderRow(header)) return bottomRows;
  // Первая строка разорвана по высоте — нижний фрагмент уже продолжение шапки, не дублируем.
  if (fitCount === 0) return bottomRows;
  if (bottomRows[0] && bottomRows[0]!.eq(header)) return bottomRows;
  return [header.copy(), ...bottomRows];
}

function findWordSplitIndex(
  paraEl: HTMLElement,
  maxHeight: number,
  width: number,
): number {
  const full = paraEl.textContent || "";
  if (!full || maxHeight < 8) return 0;

  const clone = paraEl.cloneNode(false) as HTMLElement;
  clone.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${Math.max(1, width)}px`,
    "visibility:hidden",
    "pointer-events:none",
    "white-space:normal",
    "overflow-wrap:break-word",
    "word-wrap:break-word",
  ].join(";");

  const cs = getComputedStyle(paraEl);
  clone.style.font = cs.font;
  clone.style.lineHeight = cs.lineHeight;
  clone.style.letterSpacing = cs.letterSpacing;

  document.body.appendChild(clone);

  let lo = 0;
  let hi = full.length;
  let best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    clone.textContent = full.slice(0, mid);
    const h = clone.offsetHeight;
    if (h <= maxHeight) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  document.body.removeChild(clone);

  let i = best;
  while (i > 0 && !/\s/.test(full[i - 1]!)) i--;
  if (i === 0 && best > 0) i = best;
  return i;
}

/** Смещение внутри para.content (для Fragment.cut) по индексу символа в textContent. */
function fragmentTextSplitOffset(para: PMNode, textIdx: number): number {
  let acc = 0;
  let splitAt = 0;
  let done = false;
  para.content.forEach((child, offset) => {
    if (done) return;
    if (child.isText) {
      const L = child.text?.length ?? 0;
      if (acc + L >= textIdx) {
        splitAt = offset + (textIdx - acc);
        done = true;
        return;
      }
      acc += L;
    }
  });
  return splitAt;
}

function moveLastBlockToNextPage(
  state: import("@tiptap/pm/state").EditorState,
  pages: PageInfo[],
  pageIndex: number,
): Transaction | null {
  const { pos, node } = pages[pageIndex];
  const cc = node.childCount;
  if (cc < 1) return null;

  const innerStart = pos + 1;
  let childPos = innerStart;
  for (let j = 0; j < cc - 1; j++) {
    childPos += node.child(j).nodeSize;
  }

  const lastChild = node.child(cc - 1);
  const from = childPos;
  const to = childPos + lastChild.nodeSize;
  const slice = state.doc.slice(from, to);
  const delSize = to - from;

  let tr = state.tr.delete(from, to);

  if (pageIndex + 1 < pages.length) {
    const nextPos = pages[pageIndex + 1]!.pos;
    const mappedNext = nextPos > from ? nextPos - delSize : nextPos;
    const insertInner = mappedNext + 1;
    tr = tr.insert(insertInner, slice.content);
  } else {
    const docPage = state.schema.nodes.docPage;
    const posAfterPage = pos + node.nodeSize;
    const insPage = posAfterPage > from ? posAfterPage - delSize : posAfterPage;
    const newPg = docPage.create(null, slice.content);
    tr = tr.insert(insPage, newPg);
  }
  tr.setMeta(PAGE_REFLOW_META, true);
  return tr;
}

function getLastBlockRange(pagePos: number, pageNode: PMNode): {
  lastChild: PMNode;
  from: number;
  to: number;
} | null {
  const cc = pageNode.childCount;
  if (cc < 1) return null;

  const innerStart = pagePos + 1;
  let childPos = innerStart;
  for (let i = 0; i < cc - 1; i++) {
    childPos += pageNode.child(i).nodeSize;
  }

  const lastChild = pageNode.child(cc - 1);
  return {
    lastChild,
    from: childPos,
    to: childPos + lastChild.nodeSize,
  };
}

function insertIntoNextPageOrCreate(
  tr: Transaction,
  state: import("@tiptap/pm/state").EditorState,
  pages: PageInfo[],
  pageIndex: number,
  content: PMNode[],
): Transaction {
  if (pageIndex + 1 < pages.length) {
    const nextPos = pages[pageIndex + 1]!.pos;
    const mappedNext = tr.mapping.map(nextPos);
    return tr.insert(mappedNext + 1, content);
  }

  const docPage = state.schema.nodes.docPage;
  const currentPagePos = pages[pageIndex]!.pos;
  const currentPageNode = pages[pageIndex]!.node;
  const afterPage = currentPagePos + currentPageNode.nodeSize;
  const mappedAfter = tr.mapping.map(afterPage);
  const newPage = docPage.create(null, content);
  return tr.insert(mappedAfter, newPage);
}

function splitOnlyParagraphOverflow(
  state: import("@tiptap/pm/state").EditorState,
  pages: PageInfo[],
  pageIndex: number,
  body: HTMLElement,
  contentH: number,
): Transaction | null {
  const { pos, node } = pages[pageIndex];
  if (node.childCount !== 1) return null;
  const para = node.child(0);
  if (para.type.name !== "paragraph") return null;
  const fullText = para.textContent;
  if (!fullText.trim()) return null;

  const paraEl = Array.from(body.children).find(
    (c) => c.tagName === "P",
  ) as HTMLElement | undefined;
  if (!paraEl) return null;
  if (paraEl.offsetHeight <= contentH + 2) return null;

  const w = paraEl.clientWidth || body.clientWidth;
  const splitTextIdx = findWordSplitIndex(paraEl, contentH - 6, w);
  if (splitTextIdx <= 0 || splitTextIdx >= fullText.length) return null;

  const splitOff = fragmentTextSplitOffset(para, splitTextIdx);
  const schema = state.schema;
  const p1c = para.content.cut(0, splitOff);
  const p2c = para.content.cut(splitOff, para.content.size);
  const p1 = schema.nodes.paragraph.create(para.attrs, p1c);
  const p2 = schema.nodes.paragraph.create(para.attrs, p2c);

  const innerStart = pos + 1;
  const innerEnd = innerStart + para.nodeSize;

  let tr = state.tr.replaceWith(innerStart, innerEnd, p1);

  if (pageIndex + 1 < pages.length) {
    const nextPos = pages[pageIndex + 1]!.pos;
    const mapped = tr.mapping.map(nextPos);
    tr = tr.insert(mapped + 1, p2);
  } else {
    const afterPage = pos + node.nodeSize;
    const mappedEnd = tr.mapping.map(afterPage, -1);
    const docPage = schema.nodes.docPage;
    const newPg = docPage.create(null, [p2]);
    tr = tr.insert(mappedEnd, newPg);
  }

  tr.setMeta(PAGE_REFLOW_META, true);
  return tr;
}

function splitParagraphNodeByWords(
  paraNode: PMNode,
  paraEl: HTMLElement,
  maxHeight: number,
  width: number,
): { top: PMNode; bottom: PMNode } | null {
  const fullText = paraNode.textContent;
  if (!fullText.trim()) return null;

  const splitTextIdx = findWordSplitIndex(paraEl, maxHeight, width);
  if (splitTextIdx <= 0 || splitTextIdx >= fullText.length) return null;

  const splitOff = fragmentTextSplitOffset(paraNode, splitTextIdx);
  const topContent = paraNode.content.cut(0, splitOff);
  const bottomContent = paraNode.content.cut(splitOff, paraNode.content.size);
  const top = paraNode.type.create(paraNode.attrs, topContent, paraNode.marks);
  const bottom = paraNode.type.create(paraNode.attrs, bottomContent, paraNode.marks);

  return { top, bottom };
}

function splitTableCellContent(
  cellNode: PMNode,
  cellEl: HTMLElement,
  availableHeight: number,
  schema: import("@tiptap/pm/model").Schema,
): { top: PMNode; bottom: PMNode } | null {
  const childEls = Array.from(cellEl.children) as HTMLElement[];
  const childNodes = childNodesArray(cellNode);

  if (!childNodes.length) {
    const empty = schema.nodes.paragraph.create();
    return {
      top: cellNode.type.create(cellNode.attrs, [empty], cellNode.marks),
      bottom: cellNode.type.create(cellNode.attrs, [empty], cellNode.marks),
    };
  }

  if (!childEls.length) {
    return null;
  }

  const cellTop = cellEl.getBoundingClientRect().top;
  let fitCount = 0;
  for (const el of childEls) {
    const bottom = el.getBoundingClientRect().bottom - cellTop;
    if (bottom <= availableHeight + 2) {
      fitCount += 1;
    } else {
      break;
    }
  }

  if (fitCount >= childNodes.length) {
    const empty = schema.nodes.paragraph.create();
    return {
      top: cellNode.type.create(cellNode.attrs, childNodes, cellNode.marks),
      bottom: cellNode.type.create(cellNode.attrs, [empty], cellNode.marks),
    };
  }

  const topNodes = childNodes.slice(0, fitCount);
  const bottomNodes = childNodes.slice(fitCount);
  const overflowEl = childEls[fitCount];
  const overflowNode = childNodes[fitCount];

  if (
    overflowEl &&
    overflowNode?.type.name === "paragraph" &&
    overflowEl.tagName === "P"
  ) {
    const paraTopOffset = overflowEl.getBoundingClientRect().top - cellTop;
    const remaining = availableHeight - paraTopOffset;
    const width = overflowEl.clientWidth || cellEl.clientWidth;
    if (remaining > 8 && width > 0) {
      const split = splitParagraphNodeByWords(
        overflowNode,
        overflowEl,
        remaining - 2,
        width,
      );
      if (split) {
        return {
          top: cellNode.type.create(
            cellNode.attrs,
            [...topNodes, split.top],
            cellNode.marks,
          ),
          bottom: cellNode.type.create(
            cellNode.attrs,
            [split.bottom, ...childNodes.slice(fitCount + 1)],
            cellNode.marks,
          ),
        };
      }
    }
  }

  if (fitCount > 0) {
    return {
      top: cellNode.type.create(cellNode.attrs, topNodes, cellNode.marks),
      bottom: cellNode.type.create(cellNode.attrs, bottomNodes, cellNode.marks),
    };
  }

  return null;
}

function splitTableRowByHeight(
  rowNode: PMNode,
  rowEl: HTMLTableRowElement,
  availableHeight: number,
  schema: import("@tiptap/pm/model").Schema,
): { top: PMNode; bottom: PMNode } | null {
  const cells = Array.from(rowEl.cells) as HTMLElement[];
  if (!cells.length || cells.length !== rowNode.childCount) return null;

  const topCells: PMNode[] = [];
  const bottomCells: PMNode[] = [];
  let hasBottomOverflow = false;

  for (let i = 0; i < rowNode.childCount; i++) {
    const cellNode = rowNode.child(i);
    const split = splitTableCellContent(cellNode, cells[i]!, availableHeight, schema);
    if (!split) return null;
    topCells.push(split.top);
    bottomCells.push(split.bottom);
    if (split.bottom.textContent.trim().length > 0) {
      hasBottomOverflow = true;
    }
  }

  if (!hasBottomOverflow) return null;

  return {
    top: rowNode.type.create(rowNode.attrs, topCells, rowNode.marks),
    bottom: rowNode.type.create(rowNode.attrs, bottomCells, rowNode.marks),
  };
}

function splitTableOverflow(
  state: import("@tiptap/pm/state").EditorState,
  pages: PageInfo[],
  pageIndex: number,
  body: HTMLElement,
  contentH: number,
): Transaction | null {
  const page = pages[pageIndex];
  const lastRange = getLastBlockRange(page.pos, page.node);
  if (!lastRange || lastRange.lastChild.type.name !== "table") return null;

  const tableBlockEl = body.lastElementChild as HTMLElement | null;
  if (!tableBlockEl) return null;
  const tableEl = (
    tableBlockEl.matches("table")
      ? tableBlockEl
      : tableBlockEl.querySelector("table")
  ) as HTMLTableElement | null;
  if (!tableEl) return null;

  const rows = Array.from(tableEl.rows);
  const rowNodes = childNodesArray(lastRange.lastChild);
  if (!rows.length || rows.length !== rowNodes.length) return null;

  const bodyTop = body.getBoundingClientRect().top;
  let fitCount = 0;
  for (const row of rows) {
    const bottom = row.getBoundingClientRect().bottom - bodyTop;
    if (bottom <= contentH + 2) {
      fitCount += 1;
    } else {
      break;
    }
  }

  const schema = state.schema;
  const topRows = rowNodes.slice(0, fitCount);
  let bottomRows = rowNodes.slice(fitCount);

  if (fitCount < rows.length) {
    const rowEl = rows[fitCount]!;
    const rowNode = rowNodes[fitCount]!;
    const rowTop = rowEl.getBoundingClientRect().top - bodyTop;
    const availableHeight = contentH - rowTop;

    const splitRow =
      availableHeight > 8
        ? splitTableRowByHeight(rowNode, rowEl, availableHeight, schema)
        : null;

    if (splitRow) {
      topRows.push(splitRow.top);
      bottomRows = [splitRow.bottom, ...rowNodes.slice(fitCount + 1)];
    }
  }

  if (!topRows.length || !bottomRows.length) {
    return null;
  }

  bottomRows = withRepeatedTableHeader(rowNodes, bottomRows, fitCount);

  const topTable = cloneNodeWithContent(lastRange.lastChild, topRows);
  const bottomTable = cloneNodeWithContent(lastRange.lastChild, bottomRows);

  let tr = state.tr.replaceWith(lastRange.from, lastRange.to, topTable);
  tr = insertIntoNextPageOrCreate(tr, state, pages, pageIndex, [bottomTable]);
  tr.setMeta(PAGE_REFLOW_META, true);
  return tr;
}

/**
 * Переливает блоки между docPage так, чтобы высота .doc-page-body не превышала contentHeightPx.
 * При одном длинном абзаце — разрыв по слову (по ширине области набора).
 */
export function reflowDocPages(editor: Editor, contentHeightPx: number): void {
  const view = editor.view;
  if (!view) return;

  let guard = 0;
  while (guard < 60) {
    guard += 1;
    const state = editor.state;
    if (!state.schema.nodes.docPage) return;

    const pages = collectDocPages(state.doc);
    if (!pages.length) return;

    let tr: Transaction | null = null;

    for (let pi = 0; pi < pages.length; pi++) {
      const { pos, node } = pages[pi];
      const dom = view.nodeDOM(pos);
      if (!(dom instanceof HTMLElement)) continue;

      const body = dom.querySelector(".doc-page-body") as HTMLElement | null;
      if (!body) continue;

      if (!pageBodyOverflows(body, contentHeightPx)) continue;

      if (node.childCount > 0 && node.child(node.childCount - 1)?.type.name === "table") {
        tr = splitTableOverflow(state, pages, pi, body, contentHeightPx);
        if (tr) break;
      }

      if (node.childCount > 1) {
        tr = moveLastBlockToNextPage(state, pages, pi);
        break;
      }

      if (node.childCount === 1 && node.child(0).type.name === "paragraph") {
        tr = splitOnlyParagraphOverflow(state, pages, pi, body, contentHeightPx);
        if (tr) break;
      }

      tr = moveLastBlockToNextPage(state, pages, pi);
      break;
    }

    if (!tr) return;

    view.dispatch(tr);
  }
}

export function countDocPages(doc: PMNode): number {
  let n = 0;
  for (let i = 0; i < doc.childCount; i++) {
    if (doc.child(i).type.name === "docPage") n += 1;
  }
  return Math.max(1, n);
}
