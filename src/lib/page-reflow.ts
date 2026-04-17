import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import {
  REFLOW_VIEWPORT_EPS_PX,
  contentAreaBottomScreen,
  effectiveContentH,
  pageBodyOverflows,
} from "./page-layout-engine/layout-metrics";
import {
  getLayoutVersion,
  logReflowAction,
  measurePageBlocks,
  paginatePageBlocks,
} from "./layout";

export { REFLOW_VIEWPORT_EPS_PX } from "./page-layout-engine/layout-metrics";

export const PAGE_REFLOW_META = "pageReflow";

type PageInfo = { pos: number; node: PMNode };

function mapInsertPosForward(tr: Transaction, pos: number): number {
  const m = tr.mapping.map(pos, 1);
  return Math.max(0, Math.min(m, tr.doc.content.size));
}

function collectDocPages(doc: PMNode): PageInfo[] {
  const pages: PageInfo[] = [];
  let pos = 0;
  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i);
    if (child.type.name === "docPage") {
      pages.push({ pos, node: child });
    }
    pos += child.nodeSize;
  }
  return pages;
}

/**
 * Resolve .doc-page-body from the DOM node returned by view.nodeDOM().
 * ProseMirror may return either the outer sheet (dom) or the contentDOM (body)
 * depending on the node-view implementation and PM version.
 */
function resolvePageBody(dom: HTMLElement): HTMLElement | null {
  if (dom.classList.contains("doc-page-body")) return dom;
  const inner = dom.querySelector(".doc-page-body") as HTMLElement | null;
  if (inner) return inner;
  /** nodeDOM(pagePos) часто указывает на блок внутри листа (p, h1…), а не на sheet. */
  return dom.closest(".doc-page-body") as HTMLElement | null;
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

/**
 * Move ALL children from index `keepCount` onwards to the next page (or a new page).
 * Much more efficient than moving one block at a time.
 */
function moveExcessBlocksToNextPage(
  state: import("@tiptap/pm/state").EditorState,
  pages: PageInfo[],
  pageIndex: number,
  keepCount: number,
): Transaction | null {
  const page = pages[pageIndex];
  if (!page) return null;
  const { node } = page;
  const cc = node.childCount;
  if (keepCount >= cc) return null;
  if (keepCount < 1) keepCount = 1;

  const keptNodes: PMNode[] = [];
  const movedNodes: PMNode[] = [];
  for (let j = 0; j < cc; j++) {
    const child = node.child(j);
    if (j < keepCount) keptNodes.push(child);
    else movedNodes.push(child);
  }
  if (!movedNodes.length) return null;

  const currentPageUpdated = node.type.create(node.attrs, keptNodes, node.marks);
  const topChildren: PMNode[] = [];
  for (let i = 0; i < state.doc.childCount; i++) topChildren.push(state.doc.child(i));

  // Resolve top-level child index for current docPage.
  let currentDocPageOrdinal = 0;
  let currentTopIndex = -1;
  for (let i = 0; i < topChildren.length; i++) {
    if (topChildren[i]!.type.name !== "docPage") continue;
    if (currentDocPageOrdinal === pageIndex) {
      currentTopIndex = i;
      break;
    }
    currentDocPageOrdinal += 1;
  }
  if (currentTopIndex < 0) return null;
  topChildren[currentTopIndex] = currentPageUpdated;

  // Find next docPage in top-level order.
  let nextTopIndex = -1;
  for (let i = currentTopIndex + 1; i < topChildren.length; i++) {
    if (topChildren[i]!.type.name === "docPage") {
      nextTopIndex = i;
      break;
    }
  }
  if (nextTopIndex >= 0) {
    const nextPageNode = topChildren[nextTopIndex]!;
    const nextUpdated = nextPageNode.type.create(
      nextPageNode.attrs,
      [...movedNodes, ...childNodesArray(nextPageNode)],
      nextPageNode.marks,
    );
    topChildren[nextTopIndex] = nextUpdated;
  } else {
    const newPage = state.schema.nodes.docPage.create(null, movedNodes);
    topChildren.splice(currentTopIndex + 1, 0, newPage);
  }

  const tr = state.tr.replaceWith(0, state.doc.content.size, topChildren);

  tr.setMeta(PAGE_REFLOW_META, true);
  return tr;
}

function getBlockRangeForChild(
  pagePos: number,
  pageNode: PMNode,
  childIndex: number,
): { child: PMNode; from: number; to: number } | null {
  if (childIndex < 0 || childIndex >= pageNode.childCount) return null;
  const innerStart = pagePos + 1;
  let childPos = innerStart;
  for (let j = 0; j < childIndex; j++) {
    childPos += pageNode.child(j).nodeSize;
  }
  const child = pageNode.child(childIndex);
  return { child, from: childPos, to: childPos + child.nodeSize };
}

/** Последняя по документу таблица, нижний край которой ниже области набора. */
function findOverflowingTableChildIndex(
  pageNode: PMNode,
  body: HTMLElement,
  contentH: number,
  scale: number,
): number {
  const limit = contentAreaBottomScreen(body, contentH, scale);
  for (let i = pageNode.childCount - 1; i >= 0; i--) {
    if (pageNode.child(i).type.name !== "table") continue;
    const wrap = body.children[i];
    if (!(wrap instanceof HTMLElement)) continue;
    const tableEl = (
      wrap.matches("table") ? wrap : wrap.querySelector("table")
    ) as HTMLTableElement | null;
    if (!tableEl) continue;
    if (tableEl.getBoundingClientRect().bottom > limit + REFLOW_VIEWPORT_EPS_PX) return i;
  }
  return -1;
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
    const nextInner = mapInsertPosForward(tr, nextPos + 1);
    return tr.insert(nextInner, content);
  }

  const docPage = state.schema.nodes.docPage;
  const currentPagePos = pages[pageIndex]!.pos;
  const currentPageNode = pages[pageIndex]!.node;
  const afterPage = currentPagePos + currentPageNode.nodeSize;
  const mappedAfter = mapInsertPosForward(tr, afterPage);
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
    const nextInner = mapInsertPosForward(tr, nextPos + 1);
    tr = tr.insert(nextInner, p2);
  } else {
    const afterPage = pos + node.nodeSize;
    const mappedEnd = mapInsertPosForward(tr, afterPage);
    const docPage = schema.nodes.docPage;
    const newPg = docPage.create(null, [p2]);
    tr = tr.insert(mappedEnd, newPg);
  }

  tr.setMeta(PAGE_REFLOW_META, true);
  return tr;
}

function isListBlock(n: PMNode): boolean {
  const t = n.type.name;
  return t === "bulletList" || t === "orderedList";
}

/** Делит список в ячейке: по видимым пунктам li или по первому абзацу в первом пункте. */
function splitListInCellByLayout(
  listNode: PMNode,
  listEl: HTMLElement,
  cellTopScreen: number,
  maxBottomFromCellTop: number,
  schema: import("@tiptap/pm/model").Schema,
  scale: number,
): { top: PMNode; bottom: PMNode } | null {
  const itemNodes = childNodesArray(listNode);
  const lis = Array.from(listEl.children) as HTMLElement[];
  if (!itemNodes.length || itemNodes.length !== lis.length) return null;

  let fit = 0;
  for (let i = 0; i < lis.length; i++) {
    const liBottom = lis[i]!.getBoundingClientRect().bottom - cellTopScreen;
    if (liBottom <= maxBottomFromCellTop + REFLOW_VIEWPORT_EPS_PX) fit++;
    else break;
  }

  if (fit > 0 && fit < itemNodes.length) {
    return {
      top: listNode.type.create(
        listNode.attrs,
        itemNodes.slice(0, fit),
        listNode.marks,
      ),
      bottom: listNode.type.create(
        listNode.attrs,
        itemNodes.slice(fit),
        listNode.marks,
      ),
    };
  }

  if (fit === 0 && itemNodes.length > 0) {
    const liEl = lis[0]!;
    const liNode = itemNodes[0]!;
    const pEl = liEl.querySelector("p") as HTMLElement | null;
    if (!pEl || liNode.childCount < 1) return null;
    const paraNode = liNode.child(0);
    if (paraNode.type.name !== "paragraph") return null;
    const paraTopOff = pEl.getBoundingClientRect().top - cellTopScreen;
    const remaining = maxBottomFromCellTop - paraTopOff;
    const width = pEl.clientWidth || listEl.clientWidth;
    const s = scale > 0 ? scale : 1;
    if (remaining <= 8 * s || width <= 0) return null;
    const split = splitParagraphNodeByWords(
      paraNode,
      pEl,
      (remaining - REFLOW_VIEWPORT_EPS_PX) / s,
      width,
    );
    if (!split) return null;
    const liRest = childNodesArray(liNode).slice(1);
    const liTop = liNode.type.create(liNode.attrs, [split.top], liNode.marks);
    const liBot = liNode.type.create(
      liNode.attrs,
      [split.bottom, ...liRest],
      liNode.marks,
    );
    return {
      top: listNode.type.create(listNode.attrs, [liTop], listNode.marks),
      bottom: listNode.type.create(
        listNode.attrs,
        [liBot, ...itemNodes.slice(1)],
        listNode.marks,
      ),
    };
  }

  return null;
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
  /** Нижняя граница области набора в координатах viewport (как в splitTableOverflow). */
  pageBottomScreen: number,
  schema: import("@tiptap/pm/model").Schema,
  scale: number,
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
    if (bottom <= availableHeight + REFLOW_VIEWPORT_EPS_PX) {
      fitCount += 1;
    } else {
      break;
    }
  }

  const cellBottomScreen = cellEl.getBoundingClientRect().bottom;
  if (cellBottomScreen <= pageBottomScreen + REFLOW_VIEWPORT_EPS_PX) {
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
    const s = scale > 0 ? scale : 1;
    if (remaining > 8 * s && width > 0) {
      const split = splitParagraphNodeByWords(
        overflowNode,
        overflowEl,
        (remaining - REFLOW_VIEWPORT_EPS_PX) / s,
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

  if (
    overflowEl &&
    overflowNode &&
    isListBlock(overflowNode) &&
    (overflowEl.tagName === "UL" || overflowEl.tagName === "OL")
  ) {
    const listSplit = splitListInCellByLayout(
      overflowNode,
      overflowEl,
      cellTop,
      availableHeight,
      schema,
      scale,
    );
    if (listSplit) {
      return {
        top: cellNode.type.create(
          cellNode.attrs,
          [...topNodes, listSplit.top],
          cellNode.marks,
        ),
        bottom: cellNode.type.create(
          cellNode.attrs,
          [listSplit.bottom, ...childNodes.slice(fitCount + 1)],
          cellNode.marks,
        ),
      };
    }
  }

  if (fitCount > 0) {
    return {
      top: cellNode.type.create(cellNode.attrs, topNodes, cellNode.marks),
      bottom: cellNode.type.create(cellNode.attrs, bottomNodes, cellNode.marks),
    };
  }

  /** Ни один блок в ячейке не помещается — список или абзац. */
  if (childNodes.length > 0 && childEls.length > 0) {
    const n0 = childNodes[0]!;
    const el0 = childEls[0]! as HTMLElement;
    if (
      isListBlock(n0) &&
      (el0.tagName === "UL" || el0.tagName === "OL")
    ) {
      const listSplit = splitListInCellByLayout(
        n0,
        el0,
        cellTop,
        availableHeight,
        schema,
        scale,
      );
      if (listSplit) {
        return {
          top: cellNode.type.create(cellNode.attrs, [listSplit.top], cellNode.marks),
          bottom: cellNode.type.create(
            cellNode.attrs,
            [listSplit.bottom, ...childNodes.slice(1)],
            cellNode.marks,
          ),
        };
      }
    }
    const paraTopOffset = el0.getBoundingClientRect().top - cellTop;
    const remaining = availableHeight - paraTopOffset;
    const width = el0.clientWidth || cellEl.clientWidth;
    const sc = scale > 0 ? scale : 1;
    if (
      remaining > 8 * sc &&
      width > 0 &&
      n0.type.name === "paragraph" &&
      el0.tagName === "P"
    ) {
      const split = splitParagraphNodeByWords(
        n0,
        el0,
        (remaining - REFLOW_VIEWPORT_EPS_PX) / sc,
        width,
      );
      if (split) {
        return {
          top: cellNode.type.create(cellNode.attrs, [split.top], cellNode.marks),
          bottom: cellNode.type.create(
            cellNode.attrs,
            [split.bottom, ...childNodes.slice(1)],
            cellNode.marks,
          ),
        };
      }
    }
  }

  return null;
}

function splitTableRowByHeight(
  rowNode: PMNode,
  rowEl: HTMLTableRowElement,
  availableHeight: number,
  pageBottomScreen: number,
  schema: import("@tiptap/pm/model").Schema,
  scale: number,
): { top: PMNode; bottom: PMNode } | null {
  const cells = Array.from(rowEl.cells) as HTMLElement[];
  if (!cells.length || cells.length !== rowNode.childCount) return null;

  const topCells: PMNode[] = [];
  const bottomCells: PMNode[] = [];

  for (let i = 0; i < rowNode.childCount; i++) {
    const cellNode = rowNode.child(i);
    const split = splitTableCellContent(
      cellNode,
      cells[i]!,
      availableHeight,
      pageBottomScreen,
      schema,
      scale,
    );
    if (!split) return null;
    topCells.push(split.top);
    bottomCells.push(split.bottom);
  }

  const hasBottomOverflow = topCells.some((tc, i) => !tc.eq(bottomCells[i]!));
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
  scale: number,
  tableChildIndex: number,
): Transaction | null {
  const page = pages[pageIndex];
  const tableRange = getBlockRangeForChild(page.pos, page.node, tableChildIndex);
  if (!tableRange || tableRange.child.type.name !== "table") return null;

  const tableBlockEl = body.children[tableChildIndex];
  if (!(tableBlockEl instanceof HTMLElement)) return null;
  const tableEl = (
    tableBlockEl.matches("table")
      ? tableBlockEl
      : tableBlockEl.querySelector("table")
  ) as HTMLTableElement | null;
  if (!tableEl) return null;

  const rows = Array.from(tableEl.rows);
  const rowNodes = childNodesArray(tableRange.child);
  if (!rows.length || rows.length !== rowNodes.length) return null;

  const s = scale > 0 ? scale : 1;
  const contentBottomScreen = contentAreaBottomScreen(body, contentH, scale);
  let fitCount = 0;
  for (const row of rows) {
    const rowBottom = row.getBoundingClientRect().bottom;
    if (rowBottom <= contentBottomScreen + REFLOW_VIEWPORT_EPS_PX) {
      fitCount += 1;
    } else {
      break;
    }
  }

  const schema = state.schema;
  let topRows = rowNodes.slice(0, fitCount);
  let bottomRows = rowNodes.slice(fitCount);

  if (fitCount < rows.length) {
    const rowEl = rows[fitCount]!;
    const rowNode = rowNodes[fitCount]!;
    const rowTopScreen = rowEl.getBoundingClientRect().top;
    const availableHeight = contentBottomScreen - rowTopScreen;

    const splitRow =
      availableHeight > 8 * s
        ? splitTableRowByHeight(
            rowNode,
            rowEl,
            availableHeight,
            contentBottomScreen,
            schema,
            s,
          )
        : null;

    if (splitRow) {
      topRows.push(splitRow.top);
      bottomRows = [splitRow.bottom, ...rowNodes.slice(fitCount + 1)];
    }
  }

  /**
   * Ни одна строка целиком не помещается (fitCount === 0) — режем первую строку
   * по высоте ячеек, а не переносим всю таблицу.
   */
  if (topRows.length === 0 && rows.length > 0) {
    const rowEl = rows[0]!;
    const rowNode = rowNodes[0]!;
    const rowTopScreen = rowEl.getBoundingClientRect().top;
    const availableHeight = contentBottomScreen - rowTopScreen;
    const splitFirst =
      availableHeight > 8 * s
        ? splitTableRowByHeight(
            rowNode,
            rowEl,
            availableHeight,
            contentBottomScreen,
            schema,
            s,
          )
        : null;
    if (splitFirst) {
      topRows = [splitFirst.top];
      bottomRows = [splitFirst.bottom, ...rowNodes.slice(1)];
    }
  }

  /**
   * Строковый сплит иногда даёт нижнюю «полосу» без текста (все ячейки пустые в PM),
   * хотя визуально строка переполнена — тогда переносим целые строки с индекса fitCount.
   */
  const bottomPlain = bottomRows.map((r) => r.textContent).join("").trim();
  if (bottomRows.length > 0 && bottomPlain.length === 0 && fitCount > 0) {
    topRows = rowNodes.slice(0, fitCount);
    bottomRows = rowNodes.slice(fitCount);
  }

  if (!topRows.length || !bottomRows.length) {
    return null;
  }

  bottomRows = withRepeatedTableHeader(rowNodes, bottomRows, fitCount);

  const topTable = cloneNodeWithContent(tableRange.child, topRows);
  const bottomTable = cloneNodeWithContent(tableRange.child, bottomRows);

  let tr = state.tr.replaceWith(tableRange.from, tableRange.to, topTable);
  tr = insertIntoNextPageOrCreate(tr, state, pages, pageIndex, [bottomTable]);
  tr.setMeta(PAGE_REFLOW_META, true);
  return tr;
}

/**
 * Single overflowing block (table, list, blockquote, heading, etc.) — move it
 * to the next page entirely.  The current page gets an empty paragraph so
 * that the docPage schema requirement (block+) is satisfied.
 */
function moveSingleBlockToNextPage(
  state: import("@tiptap/pm/state").EditorState,
  pages: PageInfo[],
  pageIndex: number,
): Transaction | null {
  const { pos, node } = pages[pageIndex];
  if (node.childCount !== 1) return null;
  const block = node.child(0);

  const schema = state.schema;
  const innerStart = pos + 1;
  const innerEnd = innerStart + block.nodeSize;
  const emptyP = schema.nodes.paragraph.create();
  const pageEndBefore = pos + node.nodeSize;

  let tr = state.tr.replaceWith(innerStart, innerEnd, emptyP);
  const mappedPageEnd = mapInsertPosForward(tr, pageEndBefore);
  const blockCopy = block.copy(block.content);
  const newPg = schema.nodes.docPage.create(null, [blockCopy]);
  tr = tr.insert(mappedPageEnd, newPg);
  tr.setMeta(PAGE_REFLOW_META, true);
  return tr;
}

/**
 * Distribute blocks across docPage nodes so that no page body exceeds contentHeightPx.
 * Uses getBoundingClientRect for overflow detection (works regardless of CSS overflow).
 * Moves excess blocks in batch (not one-at-a-time) for efficiency.
 * @returns whether any transaction was dispatched (caller may schedule another pass — reflow meta skips editor "update").
 */
export function reflowDocPages(
  editor: Editor,
  contentHeightPx: number,
  viewScale = 1,
  expectedLayoutVersion?: number,
): boolean {
  const view = editor.view;
  if (!view) return false;
  if (
    typeof expectedLayoutVersion === "number" &&
    expectedLayoutVersion !== getLayoutVersion()
  ) {
    logReflowAction("skip_stale_before_start", {
      expectedLayoutVersion,
      actualLayoutVersion: getLayoutVersion(),
    });
    return false;
  }

  const state = view.state;
  if (!state.schema.nodes.docPage) return false;

  const pages = collectDocPages(state.doc);
  if (!pages.length) return false;

  let tr: Transaction | null = null;

  for (let pi = 0; pi < pages.length; pi++) {
      const { pos, node } = pages[pi];
      const dom = view.nodeDOM(pos);
      if (!(dom instanceof HTMLElement)) continue;

      const body = resolvePageBody(dom);
      if (!body) continue;

      const ch = effectiveContentH(body, contentHeightPx);
      if (!pageBodyOverflows(body, ch, viewScale)) continue;

      logReflowAction("page_overflow_detected", {
        pageIndex: pi,
        pagePos: pos,
        childCount: node.childCount,
        contentHeight: ch,
        scale: viewScale,
      });

      const tblIdx = findOverflowingTableChildIndex(node, body, ch, viewScale);
      if (tblIdx >= 0) {
        logReflowAction("table_overflow_detected", {
          pageIndex: pi,
          tableChildIndex: tblIdx,
        });
        tr = splitTableOverflow(state, pages, pi, body, ch, viewScale, tblIdx);
        if (tr) {
          logReflowAction("table_split_applied", {
            pageIndex: pi,
            tableChildIndex: tblIdx,
          });
          break;
        }
        if (node.childCount === 1) {
          logReflowAction("fallback_single_block_move_after_table_split_fail", {
            pageIndex: pi,
          });
          tr = moveSingleBlockToNextPage(state, pages, pi);
          if (tr) break;
        }
      }

      if (node.childCount > 1) {
        const measured = measurePageBlocks({
          doc: state.doc,
          pageNode: node,
          pagePos: pos,
          bodyEl: body,
          zoom: viewScale,
          preferredChildIndex: 0,
        });
        const keep = paginatePageBlocks(
          measured.map((m) => ({
            blockId: m.blockId,
            height: m.height,
            complexLayout: m.complexLayout,
          })),
          Math.round(ch),
        ).fitCount;
        logReflowAction("pagination_fit_count", {
          pageIndex: pi,
          totalBlocks: node.childCount,
          keepCount: keep,
          measuredBlocks: measured.length,
        });
        if (keep < node.childCount) {
          tr = moveExcessBlocksToNextPage(state, pages, pi, keep);
          if (tr) {
            logReflowAction("move_excess_blocks", {
              pageIndex: pi,
              keepCount: keep,
              movedCount: node.childCount - keep,
            });
            break;
          }
          /** Первый перенос не удался — пробуем оставить один блок (не вызываем при keep === childCount). */
          tr = moveExcessBlocksToNextPage(state, pages, pi, node.childCount - 1);
          if (tr) {
            logReflowAction("move_excess_blocks_fallback_keep_last", {
              pageIndex: pi,
              keepCount: node.childCount - 1,
            });
            break;
          }
        }
        break;
      }

      if (node.childCount === 1 && node.child(0).type.name === "paragraph") {
        tr = splitOnlyParagraphOverflow(state, pages, pi, body, ch);
        if (tr) {
          logReflowAction("split_single_paragraph", {
            pageIndex: pi,
          });
          break;
        }
      }

      if (node.childCount === 1) {
        logReflowAction("move_single_block", {
          pageIndex: pi,
          nodeType: node.child(0).type.name,
        });
        tr = moveSingleBlockToNextPage(state, pages, pi);
      }
      break;
    }

  if (!tr) return false;
  if (
    typeof expectedLayoutVersion === "number" &&
    expectedLayoutVersion !== getLayoutVersion()
  ) {
    logReflowAction("skip_stale_before_dispatch", {
      expectedLayoutVersion,
      actualLayoutVersion: getLayoutVersion(),
    });
    return false;
  }

  logReflowAction("dispatch_reflow_transaction", {
    stepCount: tr.steps.length,
  });
  view.dispatch(tr);
  return true;
}

export function countDocPages(doc: PMNode): number {
  let n = 0;
  for (let i = 0; i < doc.childCount; i++) {
    if (doc.child(i).type.name === "docPage") n += 1;
  }
  return Math.max(1, n);
}
