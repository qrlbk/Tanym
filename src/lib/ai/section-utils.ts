/** Heading row in document order (positions are ProseMirror document positions). */
export type HeadingEntry = {
  pos: number;
  level: number;
  text: string;
};

/**
 * Find [from, to) slice positions for the section under a heading:
 * from the heading node through content until the next heading of the same or higher outline level
 * (numerically smaller or equal `level`, e.g. H2 closes under H2, H1 closes under H2).
 */
export function findSectionRange(
  headings: HeadingEntry[],
  docContentSize: number,
  opts: { headingIndex?: number; headingTextMatch?: string },
): { from: number; to: number } | null {
  if (headings.length === 0) return null;

  let targetIdx: number;

  if (opts.headingIndex !== undefined) {
    if (opts.headingIndex < 0 || opts.headingIndex >= headings.length) {
      return null;
    }
    targetIdx = opts.headingIndex;
  } else if (
    opts.headingTextMatch !== undefined &&
    opts.headingTextMatch.trim().length > 0
  ) {
    const m = opts.headingTextMatch.trim().toLowerCase();
    const found = headings.findIndex((h) =>
      h.text.toLowerCase().includes(m),
    );
    if (found < 0) return null;
    targetIdx = found;
  } else {
    return null;
  }

  const target = headings[targetIdx];
  const from = target.pos;
  let to = docContentSize;

  for (let i = targetIdx + 1; i < headings.length; i++) {
    if (headings[i].level <= target.level) {
      to = headings[i].pos;
      break;
    }
  }

  return { from, to };
}
