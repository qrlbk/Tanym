"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowUp,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Columns2,
  RotateCcw,
  Combine,
  SplitSquareHorizontal,
  Rows3,
  LayoutGrid,
  Heading1,
  IndentIncrease,
  PaintBucket,
  Grid3x3,
  SquareDashed,
} from "lucide-react";
import { findParentNode } from "@tiptap/core";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { useUIStore } from "@/stores/uiStore";
import {
  distributeTableColumnWidths,
  resetTableColumnWidths,
} from "@/lib/table-sizing";
import { UI_COLORS } from "@/lib/theme/colors";

function Btn({
  onClick,
  title,
  icon: Icon,
  label,
  disabled,
}: {
  onClick: () => void;
  title: string;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="flex flex-col items-center gap-0.5 px-2 py-0.5 rounded disabled:opacity-35 disabled:cursor-default shrink-0"
      onMouseEnter={(e) => {
        e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <Icon size={18} style={{ color: UI_COLORS.shellText }} />
      <span className="text-[9px] max-w-[72px] text-center leading-tight" style={{ color: UI_COLORS.shellTextMuted }}>
        {label}
      </span>
    </button>
  );
}

export default function TableContextRibbon() {
  const viewMode = useUIStore((s) => s.viewMode);
  const editor = useEditorContext();
  const [, tick] = useState(0);
  const bump = useCallback(() => tick((n) => n + 1), []);

  useEffect(() => {
    if (!editor) return;
    editor.on("selectionUpdate", bump);
    editor.on("transaction", bump);
    return () => {
      editor.off("selectionUpdate", bump);
      editor.off("transaction", bump);
    };
  }, [editor, bump]);

  if (viewMode !== "edit" || !editor || !editor.isEditable) return null;
  if (!editor.isActive("table")) return null;

  const canMerge = editor.can().mergeCells();
  const canSplit = editor.can().splitCell();
  const canMoveUp = editor.can().moveTableUp();
  const canMoveDown = editor.can().moveTableDown();

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 border-b shrink-0 overflow-x-auto [scrollbar-width:thin]"
      style={{
        background: UI_COLORS.ribbon.panelBg,
        borderColor: UI_COLORS.ribbon.panelBorder,
        minHeight: 44,
      }}
      role="toolbar"
      aria-label="Работа с таблицей"
    >
      <span className="text-[10px] font-semibold px-1 shrink-0 whitespace-nowrap" style={{ color: UI_COLORS.accentPrimaryBorder }}>
        Таблица
      </span>
      <div className="w-px h-7 shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />

      <Btn
        label="Вверх"
        title="Переместить таблицу вверх (⌘⌥↑)"
        icon={ArrowUp}
        disabled={!canMoveUp}
        onClick={() => editor.chain().focus().moveTableUp().run()}
      />
      <Btn
        label="Вниз"
        title="Переместить таблицу вниз (⌘⌥↓)"
        icon={ArrowDown}
        disabled={!canMoveDown}
        onClick={() => editor.chain().focus().moveTableDown().run()}
      />

      <div className="w-px h-7 shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
      <Btn
        label="Влево"
        title="Выравнивание таблицы влево"
        icon={AlignLeft}
        onClick={() => editor.chain().focus().setTableAlign("left").run()}
      />
      <Btn
        label="Центр"
        title="По центру"
        icon={AlignCenter}
        onClick={() => editor.chain().focus().setTableAlign("center").run()}
      />
      <Btn
        label="Вправо"
        title="Вправо"
        icon={AlignRight}
        onClick={() => editor.chain().focus().setTableAlign("right").run()}
      />

      <div className="w-px h-7 shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
      <TableIndentControl editor={editor} />

      <div className="w-px h-7 shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
      <Btn
        label="Объединить"
        title="Объединить выделенные ячейки"
        icon={Combine}
        disabled={!canMerge}
        onClick={() => editor.chain().focus().mergeCells().run()}
      />
      <Btn
        label="Разбить"
        title="Разбить ячейку"
        icon={SplitSquareHorizontal}
        disabled={!canSplit}
        onClick={() => editor.chain().focus().splitCell().run()}
      />

      <div className="w-px h-7 shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
      <Btn
        label="Строка заголовка"
        title="Переключить строку заголовка"
        icon={Heading1}
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
      />
      <Btn
        label="Столбец заголовка"
        title="Переключить первый столбец как заголовок"
        icon={LayoutGrid}
        onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
      />
      <Btn
        label="Ячейка заголовка"
        title="Переключить тип выбранных ячеек (заголовок/обычная)"
        icon={Rows3}
        onClick={() => editor.chain().focus().toggleHeaderCell().run()}
      />

      <div className="w-px h-7 shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
      <Btn
        label="Равные колонки"
        title="Одинаковая ширина колонок"
        icon={Columns2}
        onClick={() => distributeTableColumnWidths(editor)}
      />
      <Btn
        label="Сброс ширин"
        title="Сбросить заданные ширины колонок"
        icon={RotateCcw}
        onClick={() => resetTableColumnWidths(editor)}
      />

      <div className="w-px h-7 shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
      <TableCellStyleGroup editor={editor} />
    </div>
  );
}

function TableCellStyleGroup({ editor }: { editor: NonNullable<ReturnType<typeof useEditorContext>> }) {
  return (
    <div className="flex items-center gap-1 shrink-0 px-1" title="Оформление ячеек">
      <label className="flex items-center gap-1 cursor-pointer">
        <PaintBucket size={14} style={{ color: UI_COLORS.shellText }} />
        <input
          type="color"
          className="w-7 h-6 p-0 border rounded cursor-pointer"
          style={{ borderColor: UI_COLORS.ribbon.separator }}
          aria-label="Цвет заливки ячейки"
          defaultValue="#E8E8E8"
          onMouseDown={(e) => e.preventDefault()}
          onChange={(e) => {
            editor.chain().focus().setCellAttribute("cellBackground", e.target.value).run();
          }}
        />
      </label>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        className="flex flex-col items-center gap-0.5 px-2 py-0.5 rounded shrink-0"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
        title="Убрать заливку"
        onClick={() =>
          editor.chain().focus().setCellAttribute("cellBackground", null).run()
        }
      >
        <SquareDashed size={18} style={{ color: UI_COLORS.shellText }} />
        <span className="text-[9px]" style={{ color: UI_COLORS.shellTextMuted }}>Без заливки</span>
      </button>
      <Btn
        label="Сетка"
        title="Границы ячеек (как по умолчанию)"
        icon={Grid3x3}
        onClick={() =>
          editor.chain().focus().setCellAttribute("borderMode", "default").run()
        }
      />
      <Btn
        label="Без линий"
        title="Скрыть границы у выбранных ячеек"
        icon={SquareDashed}
        onClick={() =>
          editor.chain().focus().setCellAttribute("borderMode", "none").run()
        }
      />
    </div>
  );
}

function TableIndentControl({ editor }: { editor: NonNullable<ReturnType<typeof useEditorContext>> }) {
  const f = findParentNode((n) => n.type.name === "table")(editor.state.selection);
  const indent = f
    ? Math.min(240, Math.max(0, Number(f.node.attrs.tableIndent) || 0))
    : 0;

  return (
    <div
      className="flex items-center gap-1 px-1 shrink-0"
      title="Отступ таблицы слева (0–240 px)"
    >
      <IndentIncrease size={14} className="shrink-0" style={{ color: UI_COLORS.shellText }} />
      <input
        type="range"
        min={0}
        max={240}
        value={indent}
        onChange={(e) => {
          const v = Number(e.target.value);
          editor.chain().focus().setTableIndent(v).run();
        }}
        className="w-[100px] h-1 cursor-pointer"
        style={{ accentColor: UI_COLORS.accentPrimaryBg }}
      />
      <input
        type="number"
        min={0}
        max={240}
        value={indent}
        onChange={(e) => {
          const v = Math.min(240, Math.max(0, parseInt(e.target.value, 10) || 0));
          editor.chain().focus().setTableIndent(v).run();
        }}
        className="w-11 h-6 text-[11px] border rounded px-1 text-center"
        style={{
          borderColor: UI_COLORS.ribbon.separator,
          background: UI_COLORS.shellBgElevated,
          color: UI_COLORS.shellText,
        }}
      />
    </div>
  );
}
