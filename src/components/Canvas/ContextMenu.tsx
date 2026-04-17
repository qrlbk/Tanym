"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import * as CM from "@radix-ui/react-context-menu";
import {
  Copy,
  Scissors,
  Clipboard,
  Bold,
  Italic,
  Underline,
  Link2,
  Trash2,
  Plus,
  Search,
  Columns2,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  IndentIncrease,
  Combine,
  SplitSquareHorizontal,
  Heading1,
  LayoutGrid,
  Rows3,
  ChevronRight,
} from "lucide-react";
import { findParentNode } from "@tiptap/core";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { useUIStore } from "@/stores/uiStore";
import {
  distributeTableColumnWidths,
  resetTableColumnWidths,
} from "@/lib/table-sizing";

function useModLabel() {
  return useMemo(() => {
    if (typeof navigator === "undefined") return "Ctrl";
    return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "⌘" : "Ctrl";
  }, []);
}

export default function EditorContextMenu({
  children,
}: {
  children: React.ReactNode;
}) {
  const editor = useEditorContext();
  const mod = useModLabel();
  const setShowFindReplace = useUIStore((s) => s.setShowFindReplace);
  const setFindSeedText = useUIStore((s) => s.setFindSeedText);

  const handleCut = useCallback(() => {
    document.execCommand("cut");
  }, []);

  const handleCopy = useCallback(() => {
    document.execCommand("copy");
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      editor?.chain().focus().insertContent(text).run();
    } catch {
      document.execCommand("paste");
    }
  }, [editor]);

  const isInTable = editor?.isActive("table") || false;
  const canMerge = editor?.can().mergeCells() ?? false;
  const canSplit = editor?.can().splitCell() ?? false;

  return (
    <CM.Root>
      <CM.Trigger asChild>{children}</CM.Trigger>
      <CM.Portal>
        <CM.Content
          className="min-w-[200px] bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50"
        >
          <MenuItem
            icon={Scissors}
            label="Вырезать"
            shortcut={`${mod}+X`}
            onClick={handleCut}
          />
          <MenuItem
            icon={Copy}
            label="Копировать"
            shortcut={`${mod}+C`}
            onClick={handleCopy}
          />
          <MenuItem
            icon={Clipboard}
            label="Вставить"
            shortcut={`${mod}+V`}
            onClick={handlePaste}
          />

          <CM.Separator className="h-px bg-gray-200 my-1" />

          <MenuItem
            icon={Bold}
            label="Жирный"
            shortcut={`${mod}+B`}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          />
          <MenuItem
            icon={Italic}
            label="Курсив"
            shortcut={`${mod}+I`}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          />
          <MenuItem
            icon={Underline}
            label="Подчёркнутый"
            shortcut={`${mod}+U`}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          />

          <CM.Separator className="h-px bg-gray-200 my-1" />

          <MenuItem
            icon={Search}
            label="Найти…"
            shortcut={`${mod}+F`}
            onClick={() => {
              const { from, to, empty } = editor?.state.selection ?? {
                from: 0,
                to: 0,
                empty: true,
              };
              const q =
                !empty && editor
                  ? editor.state.doc.textBetween(from, to)
                  : "";
              setFindSeedText(q || null);
              setShowFindReplace(true);
            }}
          />

          <MenuItem
            icon={Link2}
            label="Вставить ссылку"
            onClick={() => {
              const url = window.prompt("URL:");
              if (url) editor?.chain().focus().setLink({ href: url }).run();
            }}
          />

          {isInTable && (
            <>
              <CM.Separator className="h-px bg-gray-200 my-1" />
              <CM.Label className="px-3 py-1 text-[10px] text-gray-400 font-medium">
                Таблица
              </CM.Label>
              <p className="px-3 pb-1 text-[10px] text-gray-500 leading-snug">
                Ширину столбца меняйте у правой границы ячейки; Tab — следующая
                ячейка, Shift+Tab — предыдущая.
              </p>
              <MenuItem
                icon={Combine}
                label="Объединить ячейки"
                disabled={!canMerge}
                onClick={() => editor?.chain().focus().mergeCells().run()}
              />
              <MenuItem
                icon={SplitSquareHorizontal}
                label="Разбить ячейку"
                disabled={!canSplit}
                onClick={() => editor?.chain().focus().splitCell().run()}
              />
              <MenuItem
                icon={Heading1}
                label="Строка заголовка"
                onClick={() => editor?.chain().focus().toggleHeaderRow().run()}
              />
              <MenuItem
                icon={LayoutGrid}
                label="Столбец заголовка"
                onClick={() =>
                  editor?.chain().focus().toggleHeaderColumn().run()
                }
              />
              <MenuItem
                icon={Rows3}
                label="Ячейка заголовка"
                onClick={() => editor?.chain().focus().toggleHeaderCell().run()}
              />
              <MenuItem
                icon={Columns2}
                label="Одинаковая ширина колонок"
                onClick={() => {
                  if (editor) distributeTableColumnWidths(editor);
                }}
              />
              <MenuItem
                icon={RotateCcw}
                label="Сбросить ширины колонок"
                onClick={() => {
                  if (editor) resetTableColumnWidths(editor);
                }}
              />
              <CM.Separator className="h-px bg-gray-200 my-1" />
              <MenuItem
                icon={ArrowUp}
                label="Переместить таблицу вверх"
                shortcut="⌘⌥↑"
                onClick={() =>
                  editor?.chain().focus().moveTableUp().run()
                }
              />
              <MenuItem
                icon={ArrowDown}
                label="Переместить таблицу вниз"
                shortcut="⌘⌥↓"
                onClick={() =>
                  editor?.chain().focus().moveTableDown().run()
                }
              />
              <CM.Separator className="h-px bg-gray-200 my-1" />
              <MenuItem
                icon={AlignLeft}
                label="Таблица: влево"
                onClick={() =>
                  editor?.chain().focus().setTableAlign("left").run()
                }
              />
              <MenuItem
                icon={AlignCenter}
                label="Таблица: по центру"
                onClick={() =>
                  editor?.chain().focus().setTableAlign("center").run()
                }
              />
              <MenuItem
                icon={AlignRight}
                label="Таблица: вправо"
                onClick={() =>
                  editor?.chain().focus().setTableAlign("right").run()
                }
              />
              <CM.Sub>
                <CM.SubTrigger
                  className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-gray-700 hover:bg-blue-50 cursor-pointer outline-none rounded-sm data-[state=open]:bg-blue-50"
                  onPointerDown={(e) => e.preventDefault()}
                >
                  <IndentIncrease size={14} className="text-gray-500" />
                  <span className="flex-1 text-left">Отступ таблицы слева</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </CM.SubTrigger>
                <CM.Portal>
                  <CM.SubContent
                    className="min-w-[200px] bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-[60]"
                    sideOffset={4}
                    alignOffset={-4}
                  >
                    {editor && <TableIndentSubmenu editor={editor} />}
                  </CM.SubContent>
                </CM.Portal>
              </CM.Sub>
              <CM.Separator className="h-px bg-gray-200 my-1" />
              <MenuItem
                icon={Plus}
                label="Строка сверху"
                onClick={() => editor?.chain().focus().addRowBefore().run()}
              />
              <MenuItem
                icon={Plus}
                label="Строка снизу"
                onClick={() => editor?.chain().focus().addRowAfter().run()}
              />
              <MenuItem
                icon={Plus}
                label="Столбец слева"
                onClick={() => editor?.chain().focus().addColumnBefore().run()}
              />
              <MenuItem
                icon={Plus}
                label="Столбец справа"
                onClick={() => editor?.chain().focus().addColumnAfter().run()}
              />
              <CM.Separator className="h-px bg-gray-200 my-1" />
              <MenuItem
                icon={Trash2}
                label="Удалить строку"
                onClick={() => editor?.chain().focus().deleteRow().run()}
              />
              <MenuItem
                icon={Trash2}
                label="Удалить столбец"
                onClick={() => editor?.chain().focus().deleteColumn().run()}
              />
              <MenuItem
                icon={Trash2}
                label="Удалить таблицу"
                onClick={() => editor?.chain().focus().deleteTable().run()}
              />
            </>
          )}
        </CM.Content>
      </CM.Portal>
    </CM.Root>
  );
}

function TableIndentSubmenu({ editor }: { editor: Editor }) {
  const readIndent = () => {
    const f = findParentNode((n) => n.type.name === "table")(
      editor.state.selection,
    );
    return f
      ? Math.min(240, Math.max(0, Number(f.node.attrs.tableIndent) || 0))
      : 0;
  };

  const [val, setVal] = useState(readIndent);

  useEffect(() => {
    const sync = () => setVal(readIndent());
    editor.on("transaction", sync);
    return () => {
      editor.off("transaction", sync);
    };
  }, [editor]);

  return (
    <>
      <p className="text-[10px] text-gray-500 mb-2">0–240 px (текущее: {val})</p>
      <input
        type="range"
        min={0}
        max={240}
        value={val}
        onChange={(e) => {
          const v = Number(e.target.value);
          setVal(v);
          editor.chain().focus().setTableIndent(v).run();
        }}
        className="w-full h-1 accent-[#2B579A] mb-2"
      />
      <input
        type="number"
        min={0}
        max={240}
        value={val}
        onChange={(e) => {
          const v = Math.min(240, Math.max(0, parseInt(e.target.value, 10) || 0));
          setVal(v);
          editor.chain().focus().setTableIndent(v).run();
        }}
        className="w-full h-7 text-[12px] border border-gray-300 rounded px-2"
      />
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  shortcut,
  onClick,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <CM.Item
      className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-gray-700 hover:bg-blue-50 cursor-pointer outline-none data-[disabled]:opacity-40 data-[disabled]:pointer-events-none"
      disabled={disabled}
      onSelect={onClick}
    >
      <Icon size={14} className="text-gray-500" />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-[10px] text-gray-400">{shortcut}</span>
      )}
    </CM.Item>
  );
}
