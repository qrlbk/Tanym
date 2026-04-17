import { mergeAttributes } from "@tiptap/core";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

export type CellBorderMode = "default" | "none";

function mergeCellInlineStyle(attrs: {
  cellStyle?: string | null;
  cellBackground?: string | null;
  borderMode?: CellBorderMode | null;
}): string | undefined {
  const parts: string[] = [];
  if (attrs.cellStyle?.trim()) parts.push(attrs.cellStyle.trim());
  if (attrs.cellBackground) {
    parts.push(`background-color: ${attrs.cellBackground}`);
  }
  if (attrs.borderMode === "none") {
    parts.push("border: none");
  }
  const s = parts.join("; ").replace(/;;+/g, ";").trim();
  return s || undefined;
}

const extraCellAttrs = {
  cellBackground: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => {
      const d = element.getAttribute("data-cell-bg");
      if (d) return d;
      const bg = element.style.backgroundColor;
      if (!bg || bg === "transparent") return null;
      return bg.startsWith("#") ? bg : null;
    },
    renderHTML: () => ({}),
  },
  borderMode: {
    default: "default" as CellBorderMode,
    parseHTML: (element: HTMLElement) =>
      element.getAttribute("data-cell-border") === "none"
        ? ("none" as CellBorderMode)
        : ("default" as CellBorderMode),
    renderHTML: () => ({}),
  },
};

/**
 * Сохраняет inline `style` у <td>/<th> (границы пунктиром, ширины и т.д. из импорта DOCX / mammoth).
 * Добавляет структурированные `cellBackground` и `borderMode` с единым render в `style`.
 */
export const TableCellPreservingStyle = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      cellStyle: {
        default: null as string | null,
        parseHTML: (element: HTMLElement) => element.getAttribute("style") || null,
        renderHTML: () => ({}),
      },
      ...extraCellAttrs,
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as {
      cellStyle?: string | null;
      cellBackground?: string | null;
      borderMode?: CellBorderMode | null;
    };
    const style = mergeCellInlineStyle(attrs);
    const bgHex =
      attrs.cellBackground?.startsWith("#") ? attrs.cellBackground : null;
    return [
      "td",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        ...(style ? { style } : {}),
        ...(bgHex ? { "data-cell-bg": bgHex } : {}),
        ...(attrs.borderMode === "none" ? { "data-cell-border": "none" } : {}),
      }),
      0,
    ];
  },
});

export const TableHeaderPreservingStyle = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      cellStyle: {
        default: null as string | null,
        parseHTML: (element: HTMLElement) => element.getAttribute("style") || null,
        renderHTML: () => ({}),
      },
      ...extraCellAttrs,
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as {
      cellStyle?: string | null;
      cellBackground?: string | null;
      borderMode?: CellBorderMode | null;
    };
    const style = mergeCellInlineStyle(attrs);
    const bgHex =
      attrs.cellBackground?.startsWith("#") ? attrs.cellBackground : null;
    return [
      "th",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        ...(style ? { style } : {}),
        ...(bgHex ? { "data-cell-bg": bgHex } : {}),
        ...(attrs.borderMode === "none" ? { "data-cell-border": "none" } : {}),
      }),
      0,
    ];
  },
});
