"use client";

import { useMemo, type CSSProperties } from "react";
import { THEME, UI_COLORS } from "@/lib/theme/colors";

/**
 * Compact line-level diff for destructive AI edit previews.
 * Not a perfect diff (no Myers algorithm) but good enough to communicate
 * "these lines were added/removed" for small scene-level changes.
 */
type DiffRow = { kind: "eq" | "add" | "del"; text: string };

function simpleDiffLines(before: string, after: string): DiffRow[] {
  const a = before.split(/\r?\n/);
  const b = after.split(/\r?\n/);
  const aSet = new Set(a);
  const bSet = new Set(b);
  const rows: DiffRow[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    const left = a[i] ?? "";
    const right = b[i] ?? "";
    if (left === right) {
      rows.push({ kind: "eq", text: left });
      continue;
    }
    if (left && !bSet.has(left)) rows.push({ kind: "del", text: left });
    if (right && !aSet.has(right)) rows.push({ kind: "add", text: right });
    if (left && bSet.has(left) && right && aSet.has(right)) {
      rows.push({ kind: "eq", text: right });
    }
  }
  return rows;
}

export function DiffPreview({
  before,
  after,
  maxRows = 60,
}: {
  before: string;
  after: string;
  maxRows?: number;
}) {
  const rows = useMemo(
    () => simpleDiffLines(before, after).slice(0, maxRows),
    [before, after, maxRows],
  );
  const styleRow = (kind: DiffRow["kind"]): CSSProperties => {
    if (kind === "add") {
      return {
        background: "rgba(52, 211, 153, 0.14)",
        color: THEME.success.text,
      };
    }
    if (kind === "del") {
      return {
        background: "rgba(239, 68, 68, 0.14)",
        color: THEME.danger.text,
        textDecoration: "line-through",
      };
    }
    return { color: UI_COLORS.storyPanel.textSecondary };
  };
  return (
    <div
      className="rounded-md border text-[11px] leading-[1.45] font-mono max-h-[260px] overflow-y-auto"
      style={{
        borderColor: THEME.surface.inputBorder,
        background: THEME.surface.card,
      }}
    >
      {rows.map((row, i) => (
        <div
          key={i}
          className="px-2 py-0.5 whitespace-pre-wrap"
          style={styleRow(row.kind)}
        >
          <span className="mr-1 opacity-50">
            {row.kind === "add" ? "+" : row.kind === "del" ? "−" : " "}
          </span>
          {row.text || " "}
        </div>
      ))}
      {rows.length === 0 && (
        <div
          className="px-2 py-2 text-[11px]"
          style={{ color: UI_COLORS.storyPanel.textMuted }}
        >
          Нет изменений.
        </div>
      )}
    </div>
  );
}
