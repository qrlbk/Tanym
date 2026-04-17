/**
 * Greedy section packer for system-prompt style blocks.
 * Sections are given in priority order (most important first). Lower-priority
 * sections are dropped until the combined character length fits within the
 * budget. A soft tail is allowed for truncation notes.
 */

export type BudgetSection = {
  id: string;
  /** Higher = drop later. */
  priority: number;
  text: string;
};

export type FitBudgetResult = {
  combined: string;
  keptIds: string[];
  droppedIds: string[];
  chars: number;
  truncated: boolean;
};

const JOINER = "\n\n---\n\n";
const TRUNCATE_MARK = "\n\n[Truncated for size.]";

export function fitToBudget(
  sections: BudgetSection[],
  budgetChars: number,
): FitBudgetResult {
  const ordered = [...sections].sort((a, b) => b.priority - a.priority);
  const kept: BudgetSection[] = [];
  const dropped: BudgetSection[] = [];

  let running = 0;
  for (const section of ordered) {
    const extra = section.text.length + (kept.length > 0 ? JOINER.length : 0);
    if (running + extra <= budgetChars) {
      kept.push(section);
      running += extra;
    } else {
      dropped.push(section);
    }
  }

  // Re-order kept sections by their original index so output is stable.
  const originalIndex = new Map(sections.map((s, i) => [s.id, i]));
  kept.sort(
    (a, b) =>
      (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0),
  );

  let combined = kept.map((s) => s.text).join(JOINER);
  let truncated = dropped.length > 0;
  if (combined.length > budgetChars) {
    combined = combined.slice(0, Math.max(0, budgetChars - TRUNCATE_MARK.length));
    combined += TRUNCATE_MARK;
    truncated = true;
  }
  return {
    combined,
    keptIds: kept.map((s) => s.id),
    droppedIds: dropped.map((s) => s.id),
    chars: combined.length,
    truncated,
  };
}
