import type { Node as PMNode } from "@tiptap/pm/model";

export type PageRange = {
  page: number;
  startOffset: number;
  endOffset: number;
};

export function buildPageRanges(doc: PMNode): PageRange[] {
  const ranges: PageRange[] = [];
  let pos = 0;
  let page = 1;
  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i);
    if (child.type.name !== "docPage") {
      pos += child.nodeSize;
      continue;
    }
    const startOffset = pos + 1;
    const endOffset = pos + child.nodeSize - 1;
    ranges.push({ page, startOffset, endOffset });
    page += 1;
    pos += child.nodeSize;
  }
  return ranges;
}

