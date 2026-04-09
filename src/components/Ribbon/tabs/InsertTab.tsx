"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Table2,
  ImageIcon,
  Link2,
  Minus,
  CheckSquare,
  SeparatorHorizontal,
  Quote,
  Code,
} from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { PortalDropdown } from "@/components/ui/PortalDropdown";

function ToolButton({
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
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-default"
    >
      <Icon size={20} className="text-gray-600" />
      <span className="text-[9px] text-gray-600">{label}</span>
    </button>
  );
}

function TableGrid({ onSelect }: { onSelect: (rows: number, cols: number) => void }) {
  const [hover, setHover] = useState({ row: 0, col: 0 });

  return (
    <div className="p-2">
      <p className="text-[11px] text-gray-600 mb-1.5 font-medium">
        Вставить таблицу{hover.row > 0 ? `: ${hover.row} × ${hover.col}` : ""}
      </p>
      <div className="grid grid-rows-8 gap-[2px]">
        {Array.from({ length: 8 }, (_, r) => (
          <div key={r} className="flex gap-[2px]">
            {Array.from({ length: 10 }, (_, c) => (
              <button
                key={c}
                className="w-[18px] h-[18px] border rounded-sm transition-all"
                style={{
                  background: r < hover.row && c < hover.col ? "#4A86E8" : "#fff",
                  borderColor: r < hover.row && c < hover.col ? "#4A86E8" : "#D1D1D1",
                }}
                onMouseEnter={() => setHover({ row: r + 1, col: c + 1 })}
                onClick={() => onSelect(r + 1, c + 1)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkDialog({
  onInsert,
  onClose,
}: {
  onInsert: (url: string, text: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("https://");
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="p-3 w-[280px]">
      <p className="text-[12px] font-medium text-gray-700 mb-2">Вставить ссылку</p>
      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-gray-500 block mb-0.5">URL</label>
          <input
            ref={inputRef}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full h-[28px] px-2 text-[12px] border border-gray-300 rounded outline-none focus:border-blue-400"
            placeholder="https://example.com"
            onKeyDown={(e) => {
              if (e.key === "Enter") onInsert(url, text);
              if (e.key === "Escape") onClose();
            }}
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-0.5">Текст (необязательно)</label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-[28px] px-2 text-[12px] border border-gray-300 rounded outline-none focus:border-blue-400"
            placeholder="Отображаемый текст"
            onKeyDown={(e) => {
              if (e.key === "Enter") onInsert(url, text);
              if (e.key === "Escape") onClose();
            }}
          />
        </div>
        <div className="flex justify-end gap-1 pt-1">
          <button
            onClick={onClose}
            className="px-3 h-[26px] text-[11px] border border-gray-300 rounded hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={() => onInsert(url, text)}
            className="px-3 h-[26px] text-[11px] bg-[#2B579A] text-white rounded hover:bg-[#1E3F70]"
          >
            Вставить
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InsertTab() {
  const editor = useEditorContext();
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLDivElement>(null);

  const insertTable = useCallback(
    (rows: number, cols: number) => {
      if (!editor) return;
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
      setShowTableGrid(false);
    },
    [editor]
  );

  const handleImageFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;
      const reader = new FileReader();
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result as string }).run();
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [editor]
  );

  const insertLink = useCallback(
    (url: string, text: string) => {
      if (!editor || !url) return;
      if (text) {
        editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run();
      } else {
        editor.chain().focus().setLink({ href: url }).run();
      }
      setShowLinkDialog(false);
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <div className="flex items-center h-[74px] px-2 gap-1">
      {/* Table */}
      <div ref={tableRef}>
        <ToolButton
          onClick={() => setShowTableGrid(!showTableGrid)}
          title="Вставить таблицу"
          icon={Table2}
          label="Таблица"
        />
        <PortalDropdown
          anchorRef={tableRef}
          isOpen={showTableGrid}
          onClose={() => setShowTableGrid(false)}
          width={210}
        >
          <TableGrid onSelect={insertTable} />
        </PortalDropdown>
      </div>

      <div className="w-px h-12 bg-gray-200" />

      {/* Image */}
      <ToolButton
        onClick={() => fileInputRef.current?.click()}
        title="Вставить изображение"
        icon={ImageIcon}
        label="Рисунок"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFile}
      />

      <div className="w-px h-12 bg-gray-200" />

      {/* Link */}
      <div ref={linkRef}>
        <ToolButton
          onClick={() => setShowLinkDialog(!showLinkDialog)}
          title="Вставить ссылку (Ctrl+K)"
          icon={Link2}
          label="Ссылка"
        />
        <PortalDropdown
          anchorRef={linkRef}
          isOpen={showLinkDialog}
          onClose={() => setShowLinkDialog(false)}
          width={280}
        >
          <LinkDialog
            onInsert={insertLink}
            onClose={() => setShowLinkDialog(false)}
          />
        </PortalDropdown>
      </div>

      <div className="w-px h-12 bg-gray-200" />

      <ToolButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Горизонтальная линия"
        icon={Minus}
        label="Линия"
      />

      <div className="w-px h-12 bg-gray-200" />

      <ToolButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Цитата"
        icon={Quote}
        label="Цитата"
      />

      <div className="w-px h-12 bg-gray-200" />

      <ToolButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Список задач"
        icon={CheckSquare}
        label="Задачи"
      />

      <div className="w-px h-12 bg-gray-200" />

      <ToolButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Блок кода"
        icon={Code}
        label="Код"
      />

      <div className="w-px h-12 bg-gray-200" />

      <ToolButton
        onClick={() => {
          (editor.commands as unknown as { insertDocPageAfter: () => boolean }).insertDocPageAfter();
        }}
        title="Следующая страница (Ctrl+Enter)"
        icon={SeparatorHorizontal}
        label="Разрыв"
      />
    </div>
  );
}
