import { Table, TableView, type TableOptions } from "@tiptap/extension-table";
import { findParentNode, type CommandProps } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { moveTableDown, moveTableUp } from "@/lib/table-move";

export type TableAlign = "left" | "center" | "right";

/**
 * Кастомный NodeView: обёртка .tableWrapper получает margin по выравниванию.
 */
class AlignedTableView extends TableView {
  constructor(node: PMNode, cellMinWidth: number) {
    super(node, cellMinWidth);
    this.applyWrapperLayout(node);
  }

  override update(node: PMNode) {
    const ok = super.update(node);
    this.applyWrapperLayout(node);
    return ok;
  }

  private applyWrapperLayout(node: PMNode) {
    const wrap = this.dom as HTMLDivElement;
    const align = (node.attrs.tableAlign as TableAlign) || "left";
    const indent = Math.min(
      240,
      Math.max(0, Number(node.attrs.tableIndent) || 0),
    );

    wrap.style.marginRight = "";
    wrap.style.marginLeft = "";

    if (align === "center") {
      wrap.style.marginLeft = indent ? `${indent}px` : "auto";
      wrap.style.marginRight = "auto";
      wrap.style.width = "fit-content";
      wrap.style.maxWidth = "100%";
    } else if (align === "right") {
      wrap.style.marginLeft = "auto";
      wrap.style.marginRight = indent ? `${indent}px` : "0";
      wrap.style.width = "fit-content";
      wrap.style.maxWidth = "100%";
    } else {
      wrap.style.width = "";
      wrap.style.maxWidth = "";
      wrap.style.marginLeft = indent ? `${indent}px` : "0";
      wrap.style.marginRight = "0";
    }
  }
}

/**
 * Расширение узла table: выравнивание и отступ слева (таблица «в потоке» текста).
 *
 * Плавающие таблицы с обтеканием текста намеренно не реализованы:
 * это потребовало бы float/absolute, пересчёт page-reflow и расширенный экспорт DOCX.
 */
export const TableLayout = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      tableAlign: {
        default: "left" as TableAlign,
        parseHTML: (element) => {
          const a = element.getAttribute("data-table-align");
          if (a === "center" || a === "right") return a;
          return "left";
        },
        renderHTML: (attributes) => {
          const align = attributes.tableAlign as TableAlign | undefined;
          if (!align || align === "left") return {};
          return { "data-table-align": align };
        },
      },
      tableIndent: {
        default: 0,
        parseHTML: (element) => {
          const v = element.getAttribute("data-table-indent");
          if (v == null) return 0;
          const n = parseInt(v, 10);
          return Number.isFinite(n) ? Math.min(240, Math.max(0, n)) : 0;
        },
        renderHTML: (attributes) => {
          const n = attributes.tableIndent as number | undefined;
          if (!n || n <= 0) return {};
          return { "data-table-indent": String(n) };
        },
      },
    };
  },

  addOptions(): TableOptions {
    const parent = this.parent?.();
    return {
      ...parent,
      HTMLAttributes: parent?.HTMLAttributes ?? {},
      View: AlignedTableView,
    } as TableOptions;
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      "Mod-Alt-ArrowUp": () => this.editor.commands.moveTableUp(),
      "Mod-Alt-ArrowDown": () => this.editor.commands.moveTableDown(),
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      moveTableUp: () => (props: CommandProps) => moveTableUp(props),
      moveTableDown: () => (props: CommandProps) => moveTableDown(props),
      setTableAlign:
        (align: TableAlign) =>
        ({ state, tr, dispatch }: CommandProps) => {
          const f = findParentNode((n) => n.type.name === "table")(
            state.selection,
          );
          if (!f || !dispatch) return false;
          tr.setNodeMarkup(f.pos, undefined, {
            ...f.node.attrs,
            tableAlign: align,
          });
          dispatch(tr);
          return true;
        },
      setTableIndent:
        (px: number) =>
        ({ state, tr, dispatch }: CommandProps) => {
          const f = findParentNode((n) => n.type.name === "table")(
            state.selection,
          );
          if (!f || !dispatch) return false;
          const n = Math.min(240, Math.max(0, Math.round(px)));
          tr.setNodeMarkup(f.pos, undefined, {
            ...f.node.attrs,
            tableIndent: n,
          });
          dispatch(tr);
          return true;
        },
    };
  },
});

declare module "@tiptap/core" {
  /** Отдельная группа: нельзя дополнять `table` — TS требует идентичный тип при merge. */
  interface Commands<ReturnType> {
    tableLayout: {
      moveTableUp: () => ReturnType;
      moveTableDown: () => ReturnType;
      setTableAlign: (align: TableAlign) => ReturnType;
      setTableIndent: (px: number) => ReturnType;
    };
  }
}
