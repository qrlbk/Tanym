import type { Node as PMNode } from "@tiptap/pm/model";

const WORD_CHAR = /[\p{L}\p{N}_]/u;

export function isWordChar(ch: string): boolean {
  return WORD_CHAR.test(ch);
}

/** Границы «целого слова» в позициях ProseMirror (между символами). */
export function isWholeWordAt(
  doc: PMNode,
  from: number,
  to: number,
): boolean {
  const before = from > 0 ? doc.textBetween(from - 1, from) : "";
  const after = to < doc.content.size ? doc.textBetween(to, to + 1) : "";
  const okBefore = !before || !isWordChar(before);
  const okAfter = !after || !isWordChar(after);
  return okBefore && okAfter;
}

export interface FindMatch {
  from: number;
  to: number;
}

export function collectTextMatches(
  doc: PMNode,
  findText: string,
  matchCase: boolean,
  wholeWord: boolean,
): FindMatch[] {
  if (!findText) return [];
  const positions: FindMatch[] = [];
  const searchStr = matchCase ? findText : findText.toLowerCase();

  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const text = matchCase ? node.text || "" : (node.text || "").toLowerCase();
    let idx = 0;
    while ((idx = text.indexOf(searchStr, idx)) !== -1) {
      const from = pos + idx;
      const to = from + findText.length;
      if (!wholeWord || isWholeWordAt(doc, from, to)) {
        positions.push({ from, to });
      }
      idx += findText.length;
    }
  });
  return positions;
}
