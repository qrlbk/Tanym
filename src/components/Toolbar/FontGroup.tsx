"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  Paintbrush,
  ChevronDown,
  AArrowUp,
  AArrowDown,
  RemoveFormatting,
  Type,
} from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { FONT_SIZES, COLORS } from "@/lib/constants";
import { useFontStore } from "@/stores/fontStore";

function ToolBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-[24px] h-[22px] flex items-center justify-center rounded transition-colors disabled:opacity-30"
      style={{
        background: active ? "#D0E0F0" : "transparent",
        border: active ? "1px solid #A0C0E0" : "1px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "#E8E8E8";
      }}
      onMouseLeave={(e) => {
        if (!active)
          e.currentTarget.style.background = active ? "#D0E0F0" : "transparent";
      }}
    >
      {children}
    </button>
  );
}

function useDropdownPosition(anchorRef: React.RefObject<HTMLElement | null>, isOpen: boolean) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 2, left: rect.left, width: rect.width });
  }, [isOpen, anchorRef]);
  return pos;
}

function PortalDropdown({
  anchorRef,
  isOpen,
  onClose,
  width,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  width: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useDropdownPosition(anchorRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen || typeof window === "undefined") return null;

  const maxH = window.innerHeight - pos.top - 8;
  const flipUp = maxH < 150;
  let top = pos.top;
  let finalMaxH = Math.max(100, maxH);

  if (flipUp && anchorRef.current) {
    const rect = anchorRef.current.getBoundingClientRect();
    top = rect.top - 2;
    finalMaxH = Math.min(300, rect.top - 8);
  }

  return createPortal(
    <div
      ref={ref}
      className="bg-white border border-gray-300 rounded shadow-lg overflow-y-auto"
      style={{
        position: "fixed",
        top: flipUp ? undefined : top,
        bottom: flipUp ? window.innerHeight - top : undefined,
        left: pos.left,
        width,
        maxHeight: finalMaxH,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

function ColorPickerPortal({
  anchorRef,
  onSelect,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  onSelect: (color: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useDropdownPosition(anchorRef, true);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  if (typeof window === "undefined") return null;

  const maxH = window.innerHeight - pos.top - 8;
  const flipUp = maxH < 180;
  let top = pos.top;

  if (flipUp && anchorRef.current) {
    const rect = anchorRef.current.getBoundingClientRect();
    top = rect.top - 2;
  }

  return createPortal(
    <div
      ref={ref}
      className="p-2 bg-white border border-gray-300 rounded shadow-lg"
      style={{
        position: "fixed",
        top: flipUp ? undefined : top,
        bottom: flipUp ? window.innerHeight - top : undefined,
        left: pos.left,
        width: 220,
        zIndex: 9999,
      }}
    >
      <div className="grid grid-cols-10 gap-0.5">
        {COLORS.map((color) => (
          <button
            key={color}
            className="w-5 h-5 rounded-sm border border-gray-200 hover:scale-110 transition-transform"
            style={{ background: color }}
            onClick={() => {
              onSelect(color);
              onClose();
            }}
          />
        ))}
      </div>
    </div>,
    document.body
  );
}

export default function FontGroup() {
  const editor = useEditorContext();
  const fontFamilies = useFontStore((s) => s.fonts);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [fontInputValue, setFontInputValue] = useState("");
  const [sizeInputValue, setSizeInputValue] = useState("");
  const [isFontEditing, setIsFontEditing] = useState(false);
  const [isSizeEditing, setIsSizeEditing] = useState(false);

  const fontRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<HTMLDivElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const sizeInputRef = useRef<HTMLInputElement>(null);
  const colorBtnRef = useRef<HTMLDivElement>(null);
  const highlightBtnRef = useRef<HTMLDivElement>(null);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return {
          fontFamily: "Calibri",
          fontSize: "11pt",
          fontColor: "#000000",
          isBold: false,
          isItalic: false,
          isUnderline: false,
          isStrike: false,
          isSubscript: false,
          isSuperscript: false,
        };
      }
      const e = ctx.editor;
      const ts = e.getAttributes("textStyle");
      return {
        fontFamily: (ts.fontFamily as string) || "Calibri",
        fontSize: (ts.fontSize as string) || "11pt",
        fontColor: (ts.color as string) || "#000000",
        isBold: e.isActive("bold"),
        isItalic: e.isActive("italic"),
        isUnderline: e.isActive("underline"),
        isStrike: e.isActive("strike"),
        isSubscript: e.isActive("subscript"),
        isSuperscript: e.isActive("superscript"),
      };
    },
  });

  if (!editor || !editorState) return null;

  const {
    fontFamily,
    fontSize,
    fontColor,
    isBold,
    isItalic,
    isUnderline,
    isStrike,
    isSubscript,
    isSuperscript,
  } = editorState;
  const sizeNum = parseFloat(fontSize) || 11;

  const filteredFonts = isFontEditing && fontInputValue
    ? fontFamilies.filter((f) =>
        f.toLowerCase().includes(fontInputValue.toLowerCase())
      )
    : fontFamilies;

  const startFontEdit = () => {
    setFontInputValue(fontFamily);
    setIsFontEditing(true);
    setShowFontDropdown(true);
    setTimeout(() => fontInputRef.current?.select(), 0);
  };

  const commitFont = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      editor.chain().focus().setFontFamily(trimmed).run();
    }
    setIsFontEditing(false);
    setShowFontDropdown(false);
  };

  const startSizeEdit = () => {
    setSizeInputValue(String(sizeNum));
    setIsSizeEditing(true);
    setShowSizeDropdown(true);
    setTimeout(() => sizeInputRef.current?.select(), 0);
  };

  const commitSize = (value: string) => {
    const num = parseFloat(value);
    if (num && num > 0 && num <= 999) {
      editor
        .chain()
        .focus()
        .setMark("textStyle", { fontSize: `${num}pt` })
        .run();
    }
    setIsSizeEditing(false);
    setShowSizeDropdown(false);
  };

  return (
    <div className="flex flex-col gap-0.5 py-1 px-1">
      {/* Row 1: Font family, size, increase/decrease */}
      <div className="flex items-center gap-0.5">
        {/* Font family - editable combobox */}
        <div className="relative" ref={fontRef}>
          {isFontEditing ? (
            <input
              ref={fontInputRef}
              className="h-[22px] px-1.5 text-[11px] border border-blue-400 rounded bg-white w-[110px] outline-none"
              value={fontInputValue}
              onChange={(e) => {
                setFontInputValue(e.target.value);
                setShowFontDropdown(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitFont(fontInputValue);
                if (e.key === "Escape") {
                  setIsFontEditing(false);
                  setShowFontDropdown(false);
                }
              }}
              onBlur={() => {
                setTimeout(() => {
                  if (!fontRef.current?.contains(document.activeElement)) {
                    setIsFontEditing(false);
                    setShowFontDropdown(false);
                  }
                }, 150);
              }}
              autoFocus
            />
          ) : (
            <button
              className="flex items-center gap-0.5 h-[22px] px-1.5 text-[11px] border border-gray-300 rounded bg-white hover:border-gray-400 w-[110px]"
              onClick={startFontEdit}
            >
              <span className="truncate flex-1 text-left" style={{ fontFamily }}>
                {fontFamily}
              </span>
              <ChevronDown size={10} className="shrink-0" />
            </button>
          )}
          <PortalDropdown
            anchorRef={fontRef}
            isOpen={showFontDropdown}
            onClose={() => {
              setShowFontDropdown(false);
              setIsFontEditing(false);
            }}
            width={180}
          >
            {filteredFonts.map((font) => (
              <button
                key={font}
                className="w-full text-left px-2 py-1 text-[12px] hover:bg-blue-50"
                style={{
                  fontFamily: font,
                  background: font === fontFamily ? "#E8F0FE" : undefined,
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().setFontFamily(font).run();
                  setShowFontDropdown(false);
                  setIsFontEditing(false);
                }}
              >
                {font}
              </button>
            ))}
            {filteredFonts.length === 0 && (
              <div className="px-2 py-2 text-[11px] text-gray-400">
                Не найдено
              </div>
            )}
          </PortalDropdown>
        </div>

        {/* Font size - editable input */}
        <div className="relative" ref={sizeRef}>
          {isSizeEditing ? (
            <input
              ref={sizeInputRef}
              className="h-[22px] px-1 text-[11px] border border-blue-400 rounded bg-white w-[48px] outline-none text-center"
              value={sizeInputValue}
              onChange={(e) => {
                setSizeInputValue(e.target.value);
                setShowSizeDropdown(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitSize(sizeInputValue);
                if (e.key === "Escape") {
                  setIsSizeEditing(false);
                  setShowSizeDropdown(false);
                }
              }}
              onBlur={() => {
                setTimeout(() => {
                  if (!sizeRef.current?.contains(document.activeElement)) {
                    commitSize(sizeInputValue);
                  }
                }, 150);
              }}
              autoFocus
            />
          ) : (
            <button
              className="flex items-center gap-0.5 h-[22px] px-1 text-[11px] border border-gray-300 rounded bg-white hover:border-gray-400 w-[48px]"
              onClick={startSizeEdit}
            >
              <span className="truncate flex-1 text-left">
                {fontSize.replace("pt", "")}
              </span>
              <ChevronDown size={10} className="shrink-0" />
            </button>
          )}
          <PortalDropdown
            anchorRef={sizeRef}
            isOpen={showSizeDropdown}
            onClose={() => {
              setShowSizeDropdown(false);
              setIsSizeEditing(false);
            }}
            width={60}
          >
            {FONT_SIZES.map((size) => (
              <button
                key={size}
                className="w-full text-left px-2 py-1 text-[12px] hover:bg-blue-50"
                style={{
                  background:
                    parseFloat(fontSize) === parseFloat(size)
                      ? "#E8F0FE"
                      : undefined,
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor
                    .chain()
                    .focus()
                    .setMark("textStyle", { fontSize: `${size}pt` })
                    .run();
                  setShowSizeDropdown(false);
                  setIsSizeEditing(false);
                }}
              >
                {size}
              </button>
            ))}
          </PortalDropdown>
        </div>

        <ToolBtn
          title="Увеличить размер"
          onClick={() => {
            editor
              .chain()
              .focus()
              .setMark("textStyle", {
                fontSize: `${Math.min(sizeNum + 1, 72)}pt`,
              })
              .run();
          }}
        >
          <AArrowUp size={13} />
        </ToolBtn>
        <ToolBtn
          title="Уменьшить размер"
          onClick={() => {
            editor
              .chain()
              .focus()
              .setMark("textStyle", {
                fontSize: `${Math.max(sizeNum - 1, 1)}pt`,
              })
              .run();
          }}
        >
          <AArrowDown size={13} />
        </ToolBtn>
      </div>

      {/* Row 2: B I U S, subscript, superscript, colors, clear */}
      <div className="flex items-center gap-0.5">
        <ToolBtn
          title="Жирный (Ctrl+B)"
          active={isBold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={13} />
        </ToolBtn>
        <ToolBtn
          title="Курсив (Ctrl+I)"
          active={isItalic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={13} />
        </ToolBtn>
        <ToolBtn
          title="Подчёркнутый (Ctrl+U)"
          active={isUnderline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline size={13} />
        </ToolBtn>
        <ToolBtn
          title="Зачёркнутый"
          active={isStrike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={13} />
        </ToolBtn>
        <ToolBtn
          title="Подстрочный"
          active={isSubscript}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        >
          <Subscript size={13} />
        </ToolBtn>
        <ToolBtn
          title="Надстрочный"
          active={isSuperscript}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        >
          <Superscript size={13} />
        </ToolBtn>

        <div className="w-px h-4 bg-gray-300 mx-0.5" />

        {/* Font color */}
        <div className="relative" ref={colorBtnRef}>
          <ToolBtn
            title="Цвет текста"
            onClick={() => setShowColorPicker(!showColorPicker)}
          >
            <div className="flex flex-col items-center">
              <Type size={12} />
              <div
                className="w-3 h-[2px] rounded-sm mt-[-1px]"
                style={{ background: fontColor }}
              />
            </div>
          </ToolBtn>
          {showColorPicker && (
            <ColorPickerPortal
              anchorRef={colorBtnRef}
              onSelect={(color) => {
                editor.chain().focus().setColor(color).run();
              }}
              onClose={() => setShowColorPicker(false)}
            />
          )}
        </div>

        {/* Highlight */}
        <div className="relative" ref={highlightBtnRef}>
          <ToolBtn
            title="Цвет выделения"
            onClick={() => setShowHighlightPicker(!showHighlightPicker)}
          >
            <Paintbrush size={13} />
          </ToolBtn>
          {showHighlightPicker && (
            <ColorPickerPortal
              anchorRef={highlightBtnRef}
              onSelect={(color) =>
                editor.chain().focus().toggleHighlight({ color }).run()
              }
              onClose={() => setShowHighlightPicker(false)}
            />
          )}
        </div>

        <div className="w-px h-4 bg-gray-300 mx-0.5" />

        <ToolBtn
          title="Очистить форматирование"
          onClick={() =>
            editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
        >
          <RemoveFormatting size={13} />
        </ToolBtn>
      </div>
    </div>
  );
}
