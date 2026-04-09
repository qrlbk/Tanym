"use client";

import { useCallback } from "react";
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
} from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";

export default function EditorContextMenu({
  children,
}: {
  children: React.ReactNode;
}) {
  const editor = useEditorContext();

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

  return (
    <CM.Root>
      <CM.Trigger asChild>{children}</CM.Trigger>
      <CM.Portal>
        <CM.Content
          className="min-w-[180px] bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50"
        >
          <MenuItem icon={Scissors} label="Вырезать" shortcut="Ctrl+X" onClick={handleCut} />
          <MenuItem icon={Copy} label="Копировать" shortcut="Ctrl+C" onClick={handleCopy} />
          <MenuItem icon={Clipboard} label="Вставить" shortcut="Ctrl+V" onClick={handlePaste} />

          <CM.Separator className="h-px bg-gray-200 my-1" />

          <MenuItem
            icon={Bold}
            label="Жирный"
            shortcut="Ctrl+B"
            onClick={() => editor?.chain().focus().toggleBold().run()}
          />
          <MenuItem
            icon={Italic}
            label="Курсив"
            shortcut="Ctrl+I"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          />
          <MenuItem
            icon={Underline}
            label="Подчёркнутый"
            shortcut="Ctrl+U"
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          />

          <CM.Separator className="h-px bg-gray-200 my-1" />

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

function MenuItem({
  icon: Icon,
  label,
  shortcut,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <CM.Item
      className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-gray-700 hover:bg-blue-50 cursor-pointer outline-none"
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
