"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
  MoreHorizontal,
} from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { FONT_SIZES, COLORS } from "@/lib/constants";
import { useFontStore } from "@/stores/fontStore";
import { UI_COLORS, THEME } from "@/lib/theme/colors";

const BTN = "rounded-[9px]";

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
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${BTN} flex h-8 w-8 shrink-0 items-center justify-center transition-colors disabled:opacity-30`}
      style={{
        color: UI_COLORS.shellText,
        background: active ? UI_COLORS.accentSubtleBg : "transparent",
        border: active ? `1px solid ${UI_COLORS.accentPrimaryBorder}` : "1px solid transparent",
        boxShadow: active ? `0 0 0 1px ${UI_COLORS.accentSubtleBg}` : undefined,
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled) e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
      }}
      onMouseLeave={(e) => {
        if (!active)
          e.currentTarget.style.background = active ? UI_COLORS.accentSubtleBg : "transparent";
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
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [isOpen, anchorRef]);
  return pos;
}

function PortalDropdownDark({
  anchorRef,
  isOpen,
  onClose,
  width,
  children,
  maxHeight = 280,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  width: number;
  children: React.ReactNode;
  maxHeight?: number;
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

  const spaceBelow = window.innerHeight - pos.top - 8;
  const flipUp = spaceBelow < 120;
  let top = pos.top;
  let finalMaxH = Math.min(maxHeight, Math.max(120, spaceBelow));

  if (flipUp && anchorRef.current) {
    const rect = anchorRef.current.getBoundingClientRect();
    top = rect.top - 4;
    finalMaxH = Math.min(maxHeight, Math.max(120, rect.top - 8));
  }

  return createPortal(
    <div
      ref={ref}
      className={`${BTN} overflow-y-auto border py-1 shadow-xl`}
      style={{
        position: "fixed",
        top: flipUp ? undefined : top,
        bottom: flipUp ? window.innerHeight - top + 4 : undefined,
        left: pos.left,
        width,
        maxHeight: finalMaxH,
        zIndex: 10050,
        borderColor: UI_COLORS.shellBorder,
        background: UI_COLORS.shellBgElevated,
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
      }}
    >
      {children}
    </div>,
    document.body,
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
    top = rect.top - 4;
  }

  return createPortal(
    <div
      ref={ref}
      className={`${BTN} border p-2 shadow-xl`}
      style={{
        position: "fixed",
        top: flipUp ? undefined : top,
        bottom: flipUp ? window.innerHeight - top : undefined,
        left: pos.left,
        width: 220,
        zIndex: 10050,
        borderColor: UI_COLORS.shellBorder,
        background: UI_COLORS.shellBgElevated,
      }}
    >
      <div className="grid grid-cols-10 gap-0.5">
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className="h-5 w-5 rounded border transition-transform hover:scale-110"
            style={{ background: color, borderColor: UI_COLORS.shellBorder }}
            onClick={() => {
              onSelect(color);
              onClose();
            }}
          />
        ))}
      </div>
    </div>,
    document.body,
  );
}

export default function FontGroup() {
  const editor = useEditorContext();
  const fontFamilies = useFontStore((s) => s.fonts);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [fontQuery, setFontQuery] = useState("");

  const fontTriggerRef = useRef<HTMLButtonElement>(null);
  const sizeRef = useRef<HTMLDivElement>(null);
  const colorBtnRef = useRef<HTMLDivElement>(null);
  const highlightBtnRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const firstMatchRef = useRef<HTMLButtonElement | null>(null);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return {
          fontFamily: "Calibri",
          fontSize: "11pt",
          fontColor: "#e5e7eb",
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
        fontColor: (ts.color as string) || "#e5e7eb",
        isBold: e.isActive("bold"),
        isItalic: e.isActive("italic"),
        isUnderline: e.isActive("underline"),
        isStrike: e.isActive("strike"),
        isSubscript: e.isActive("subscript"),
        isSuperscript: e.isActive("superscript"),
      };
    },
  });

  const q = fontQuery.trim().toLowerCase();
  const firstMatchingFont = useMemo(() => {
    if (!q) return null;
    return fontFamilies.find((f) => f.toLowerCase().includes(q)) ?? null;
  }, [q, fontFamilies]);

  const scrollTargetFont = useMemo(() => {
    if (q && firstMatchingFont) return firstMatchingFont;
    return fontFamilies.includes(editorState?.fontFamily ?? "")
      ? (editorState?.fontFamily ?? "")
      : fontFamilies[0] ?? "";
  }, [q, firstMatchingFont, fontFamilies, editorState?.fontFamily]);

  useEffect(() => {
    if (!showFontDropdown) return;
    requestAnimationFrame(() => {
      firstMatchRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [fontQuery, showFontDropdown, scrollTargetFont]);

  const openFontPicker = useCallback(() => {
    setFontQuery("");
    setShowFontDropdown(true);
  }, []);

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

  return (
    <div className="flex min-w-0 flex-col gap-1.5 py-0.5">
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <div className="relative min-w-0 flex-1" style={{ minWidth: "120px", maxWidth: "220px" }}>
          <button
            ref={fontTriggerRef}
            type="button"
            onClick={() => {
              if (showFontDropdown) {
                setShowFontDropdown(false);
              } else {
                openFontPicker();
              }
            }}
            className={`${BTN} flex h-8 w-full min-w-0 items-center gap-1 border px-2 text-left text-[12px]`}
            style={{
              borderColor: UI_COLORS.ribbon.controlBorder,
              background: UI_COLORS.shellBgElevated,
              color: UI_COLORS.shellText,
            }}
            title="Шрифт"
          >
            <span className="min-w-0 flex-1 truncate" style={{ fontFamily }}>
              {fontFamily}
            </span>
            <ChevronDown size={14} className="shrink-0 opacity-70" />
          </button>
          <PortalDropdownDark
            anchorRef={fontTriggerRef}
            isOpen={showFontDropdown}
            onClose={() => {
              setFontQuery("");
              setShowFontDropdown(false);
            }}
            width={Math.max(220, fontTriggerRef.current?.offsetWidth ?? 220)}
            maxHeight={320}
          >
            <div className="sticky top-0 z-[1] border-b px-2 pb-2 pt-1" style={{ borderColor: UI_COLORS.shellBorder, background: UI_COLORS.shellBgElevated }}>
              <input
                type="search"
                placeholder="Поиск шрифта…"
                className={`${BTN} w-full border px-2 py-1.5 text-[12px] outline-none`}
                style={{
                  borderColor: UI_COLORS.ribbon.controlBorder,
                  background: THEME.surface.input,
                  color: UI_COLORS.shellText,
                }}
                value={fontQuery}
                onChange={(e) => setFontQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowFontDropdown(false);
                }}
                autoFocus
              />
            </div>
            {fontFamilies.map((font) => {
              const match = !q || font.toLowerCase().includes(q);
              return (
                <button
                  key={font}
                  ref={font === scrollTargetFont ? (el) => { firstMatchRef.current = el; } : undefined}
                  type="button"
                  className="w-full px-2.5 py-1.5 text-left text-[12px] transition-opacity"
                  style={{
                    fontFamily: font,
                    opacity: match ? 1 : 0.32,
                    background: font === fontFamily ? UI_COLORS.accentSubtleBg : "transparent",
                    color: UI_COLORS.shellText,
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor.chain().focus().setFontFamily(font).run();
                    setShowFontDropdown(false);
                    setFontQuery("");
                  }}
                >
                  {font}
                </button>
              );
            })}
          </PortalDropdownDark>
        </div>

        <div className="relative shrink-0" ref={sizeRef}>
          <button
            type="button"
            onClick={() => setShowSizeDropdown((v) => !v)}
            className={`${BTN} flex h-8 w-[56px] items-center justify-center gap-0.5 border px-1 text-[12px]`}
            style={{
              borderColor: UI_COLORS.ribbon.controlBorder,
              background: UI_COLORS.shellBgElevated,
              color: UI_COLORS.shellText,
            }}
            title="Размер"
          >
            {fontSize.replace("pt", "")}
            <ChevronDown size={12} className="opacity-70" />
          </button>
          <PortalDropdownDark
            anchorRef={sizeRef}
            isOpen={showSizeDropdown}
            onClose={() => setShowSizeDropdown(false)}
            width={72}
            maxHeight={240}
          >
            {FONT_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                className="w-full px-2 py-1.5 text-left text-[12px]"
                style={{
                  background:
                    parseFloat(fontSize) === parseFloat(size) ? UI_COLORS.accentSubtleBg : "transparent",
                  color: UI_COLORS.shellText,
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().setMark("textStyle", { fontSize: `${size}pt` }).run();
                  setShowSizeDropdown(false);
                }}
              >
                {size}
              </button>
            ))}
          </PortalDropdownDark>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 rounded-[9px] border px-0.5 py-0.5" style={{ borderColor: UI_COLORS.ribbon.controlBorder }}>
          <ToolBtn
            title="Увеличить размер"
            onClick={() =>
              editor.chain().focus().setMark("textStyle", { fontSize: `${Math.min(sizeNum + 1, 72)}pt` }).run()
            }
          >
            <AArrowUp size={14} />
          </ToolBtn>
          <ToolBtn
            title="Уменьшить размер"
            onClick={() =>
              editor.chain().focus().setMark("textStyle", { fontSize: `${Math.max(sizeNum - 1, 1)}pt` }).run()
            }
          >
            <AArrowDown size={14} />
          </ToolBtn>
          <ToolBtn
            title="Очистить форматирование"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          >
            <RemoveFormatting size={14} />
          </ToolBtn>
        </div>

        <div className="relative shrink-0" ref={moreRef}>
          <ToolBtn title="Дополнительно" onClick={() => setShowMore(!showMore)}>
            <MoreHorizontal size={16} />
          </ToolBtn>
          <PortalDropdownDark
            anchorRef={moreRef}
            isOpen={showMore}
            onClose={() => {
              setShowMore(false);
              setShowColorPicker(false);
              setShowHighlightPicker(false);
            }}
            width={200}
            maxHeight={360}
          >
            <div className="flex flex-col gap-1 px-1 py-1" onMouseDown={(e) => e.stopPropagation()}>
              <div className="flex justify-center gap-0.5">
                <ToolBtn title="Подстрочный" active={isSubscript} onClick={() => editor.chain().focus().toggleSubscript().run()}>
                  <Subscript size={14} />
                </ToolBtn>
                <ToolBtn title="Надстрочный" active={isSuperscript} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
                  <Superscript size={14} />
                </ToolBtn>
              </div>
              <div className="flex items-center justify-center gap-1 border-t pt-1" style={{ borderColor: UI_COLORS.shellBorder }}>
                <div ref={colorBtnRef}>
                  <ToolBtn title="Цвет текста" onClick={() => setShowColorPicker(!showColorPicker)}>
                    <div className="flex flex-col items-center">
                      <Type size={12} />
                      <div className="mt-[-1px] h-[2px] w-3 rounded-sm" style={{ background: fontColor }} />
                    </div>
                  </ToolBtn>
                  {showColorPicker && (
                    <ColorPickerPortal
                      anchorRef={colorBtnRef}
                      onSelect={(color) => editor.chain().focus().setColor(color).run()}
                      onClose={() => setShowColorPicker(false)}
                    />
                  )}
                </div>
                <div ref={highlightBtnRef}>
                  <ToolBtn title="Цвет выделения" onClick={() => setShowHighlightPicker(!showHighlightPicker)}>
                    <Paintbrush size={14} />
                  </ToolBtn>
                  {showHighlightPicker && (
                    <ColorPickerPortal
                      anchorRef={highlightBtnRef}
                      onSelect={(color) => editor.chain().focus().toggleHighlight({ color }).run()}
                      onClose={() => setShowHighlightPicker(false)}
                    />
                  )}
                </div>
              </div>
            </div>
          </PortalDropdownDark>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-0.5">
        <ToolBtn title="Жирный (Ctrl+B)" active={isBold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={14} />
        </ToolBtn>
        <ToolBtn title="Курсив (Ctrl+I)" active={isItalic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={14} />
        </ToolBtn>
        <ToolBtn title="Подчёркнутый (Ctrl+U)" active={isUnderline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <Underline size={14} />
        </ToolBtn>
        <ToolBtn title="Зачёркнутый" active={isStrike} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={14} />
        </ToolBtn>
      </div>
    </div>
  );
}
