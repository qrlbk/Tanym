import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

/**
 * Сохраняет inline `style` у <td>/<th> (границы пунктиром, ширины и т.д. из Word / mammoth).
 * Иначе TipTap отбрасывает атрибут, и таблица выглядит «плоско».
 */
const cellStyleAttr = {
  cellStyle: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => element.getAttribute("style") || null,
    renderHTML: (attributes: { cellStyle?: string | null }) => {
      if (!attributes.cellStyle) return {};
      return { style: attributes.cellStyle };
    },
  },
};

export const TableCellPreservingStyle = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...cellStyleAttr,
    };
  },
});

export const TableHeaderPreservingStyle = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...cellStyleAttr,
    };
  },
});
