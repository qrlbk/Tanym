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
import { UI_COLORS } from "@/lib/theme/colors";
import { RibbonIsland } from "@/components/Ribbon/RibbonIsland";

function ToolButton({
  onClick,
  title,
  icon: Icon,
  label,
  disabled,
  holdEditorFocus,
}: {
  onClick: () => void;
  title: string;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
  holdEditorFocus?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={holdEditorFocus ? (e) => e.preventDefault() : undefined}
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="flex flex-col items-center gap-0.5 rounded-[9px] border border-transparent px-2.5 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{ color: UI_COLORS.shellText }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
        e.currentTarget.style.borderColor = UI_COLORS.ribbon.controlBorder;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "transparent";
      }}
    >
      <Icon size={18} style={{ color: UI_COLORS.shellText }} />
      <span className="text-[9px]" style={{ color: UI_COLORS.shellTextMuted }}>
        {label}
      </span>
    </button>
  );
}

const TABLE_GRID_ROWS = 10;
const TABLE_GRID_COLS = 12;

function TableInsertPanel({
  onSelect,
}: {
  onSelect: (rows: number, cols: number) => void;
}) {
  const [hover, setHover] = useState({ row: 0, col: 0 });
  const [customRows, setCustomRows] = useState("5");
  const [customCols, setCustomCols] = useState("4");

  const applyCustom = () => {
    const r = Math.min(32, Math.max(1, parseInt(customRows, 10) || 1));
    const c = Math.min(32, Math.max(1, parseInt(customCols, 10) || 1));
    onSelect(r, c);
  };

  return (
    <div className="w-[240px] p-2">
      <p className="mb-1.5 text-[11px] font-medium" style={{ color: UI_COLORS.shellText }}>
        Вставить таблицу{hover.row > 0 ? `: ${hover.row} × ${hover.col}` : ""}
      </p>
      <div
        className="mb-2 grid gap-[2px]"
        style={{
          gridTemplateRows: `repeat(${TABLE_GRID_ROWS}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: TABLE_GRID_ROWS }, (_, r) => (
          <div key={r} className="flex gap-[2px]">
            {Array.from({ length: TABLE_GRID_COLS }, (_, c) => (
              <button
                key={c}
                type="button"
                className="h-[18px] w-[18px] rounded-sm border transition-all"
                style={{
                  background:
                    r < hover.row && c < hover.col
                      ? UI_COLORS.accentPrimaryBg
                      : UI_COLORS.shellBgElevated,
                  borderColor:
                    r < hover.row && c < hover.col
                      ? UI_COLORS.accentPrimaryBorder
                      : UI_COLORS.ribbon.separator,
                }}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHover({ row: r + 1, col: c + 1 })}
                onClick={() => onSelect(r + 1, c + 1)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-1 border-t pt-2" style={{ borderColor: UI_COLORS.ribbon.separator }}>
        <p className="mb-1 text-[10px]" style={{ color: UI_COLORS.shellTextMuted }}>
          Точный размер
        </p>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={32}
            value={customRows}
            onChange={(e) => setCustomRows(e.target.value)}
            className="h-7 w-12 rounded-[8px] border px-1 text-[11px]"
            style={{
              borderColor: UI_COLORS.ribbon.separator,
              background: UI_COLORS.shellBgElevated,
              color: UI_COLORS.shellText,
            }}
            aria-label="Строк"
          />
          <span className="text-[11px]" style={{ color: UI_COLORS.shellTextMuted }}>
            ×
          </span>
          <input
            type="number"
            min={1}
            max={32}
            value={customCols}
            onChange={(e) => setCustomCols(e.target.value)}
            className="h-7 w-12 rounded-[8px] border px-1 text-[11px]"
            style={{
              borderColor: UI_COLORS.ribbon.separator,
              background: UI_COLORS.shellBgElevated,
              color: UI_COLORS.shellText,
            }}
            aria-label="Столбцов"
          />
          <button
            type="button"
            onClick={applyCustom}
            className="ml-auto h-7 rounded-[8px] px-2 text-[11px] text-white"
            style={{ background: UI_COLORS.accentPrimaryBg }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = UI_COLORS.accentPrimaryHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = UI_COLORS.accentPrimaryBg;
            }}
          >
            OK
          </button>
        </div>
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
    <div className="w-[280px] p-3">
      <p className="mb-2 text-[12px] font-medium" style={{ color: UI_COLORS.shellTextStrong }}>
        Вставить ссылку
      </p>
      <div className="space-y-2">
        <div>
          <label className="mb-0.5 block text-[10px]" style={{ color: UI_COLORS.shellTextMuted }}>
            URL
          </label>
          <input
            ref={inputRef}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-[28px] w-full rounded-[8px] border px-2 text-[12px] outline-none"
            style={{
              borderColor: UI_COLORS.ribbon.separator,
              background: UI_COLORS.shellBgElevated,
              color: UI_COLORS.shellText,
            }}
            placeholder="https://example.com"
            onKeyDown={(e) => {
              if (e.key === "Enter") onInsert(url, text);
              if (e.key === "Escape") onClose();
            }}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px]" style={{ color: UI_COLORS.shellTextMuted }}>
            Текст (необязательно)
          </label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-[28px] w-full rounded-[8px] border px-2 text-[12px] outline-none"
            style={{
              borderColor: UI_COLORS.ribbon.separator,
              background: UI_COLORS.shellBgElevated,
              color: UI_COLORS.shellText,
            }}
            placeholder="Отображаемый текст"
            onKeyDown={(e) => {
              if (e.key === "Enter") onInsert(url, text);
              if (e.key === "Escape") onClose();
            }}
          />
        </div>
        <div className="flex justify-end gap-1 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-[26px] rounded-[8px] border px-3 text-[11px]"
            style={{
              borderColor: UI_COLORS.ribbon.separator,
              background: UI_COLORS.shellBgElevated,
              color: UI_COLORS.shellText,
            }}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => onInsert(url, text)}
            className="h-[26px] rounded-[8px] px-3 text-[11px] text-white"
            style={{ background: UI_COLORS.accentPrimaryBg }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = UI_COLORS.accentPrimaryHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = UI_COLORS.accentPrimaryBg;
            }}
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
  const [, bumpRibbon] = useState(0);
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
    [editor],
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
    [editor],
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
    [editor],
  );

  useEffect(() => {
    if (!editor) return;
    const onChange = () => bumpRibbon((n) => n + 1);
    editor.on("selectionUpdate", onChange);
    editor.on("transaction", onChange);
    return () => {
      editor.off("selectionUpdate", onChange);
      editor.off("transaction", onChange);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className="flex min-h-0 min-w-0 flex-wrap items-stretch gap-2.5 py-1.5 pl-0.5 pr-1"
      style={{ color: UI_COLORS.shellText, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <RibbonIsland aria-label="Таблица">
        <div ref={tableRef}>
          <ToolButton
            onClick={() => setShowTableGrid(!showTableGrid)}
            title="Вставить таблицу"
            icon={Table2}
            label="Таблица"
            holdEditorFocus
          />
          <PortalDropdown
            anchorRef={tableRef}
            isOpen={showTableGrid}
            onClose={() => setShowTableGrid(false)}
            width={250}
            variant="dark"
          >
            <TableInsertPanel onSelect={insertTable} />
          </PortalDropdown>
        </div>
      </RibbonIsland>

      <RibbonIsland aria-label="Медиа и ссылки">
        <ToolButton
          onClick={() => fileInputRef.current?.click()}
          title="Вставить изображение"
          icon={ImageIcon}
          label="Рисунок"
        />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
        <div className="h-6 w-px shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
        <div ref={linkRef}>
          <ToolButton
            onClick={() => setShowLinkDialog(!showLinkDialog)}
            title="Вставить ссылку (Ctrl+K)"
            icon={Link2}
            label="Ссылка"
            holdEditorFocus
          />
          <PortalDropdown
            anchorRef={linkRef}
            isOpen={showLinkDialog}
            onClose={() => setShowLinkDialog(false)}
            width={280}
            variant="dark"
          >
            <LinkDialog onInsert={insertLink} onClose={() => setShowLinkDialog(false)} />
          </PortalDropdown>
        </div>
      </RibbonIsland>

      <RibbonIsland aria-label="Элементы">
        <ToolButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Горизонтальная линия"
          icon={Minus}
          label="Линия"
        />
        <div className="h-6 w-px shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
        <ToolButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Цитата"
          icon={Quote}
          label="Цитата"
        />
        <div className="h-6 w-px shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
        <ToolButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          title="Список задач"
          icon={CheckSquare}
          label="Задачи"
        />
        <div className="h-6 w-px shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
        <ToolButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Блок кода"
          icon={Code}
          label="Код"
        />
        <div className="h-6 w-px shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
        <ToolButton
          onClick={() => {
            (editor.commands as unknown as { insertDocPageAfter: () => boolean }).insertDocPageAfter();
          }}
          title="Следующая страница (Ctrl+Enter)"
          icon={SeparatorHorizontal}
          label="Разрыв"
        />
      </RibbonIsland>
    </div>
  );
}
