"use client";

import { useState, useRef } from "react";
import { useEditorState } from "@tiptap/react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  IndentDecrease,
  IndentIncrease,
  ChevronDown,
} from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { LINE_SPACINGS } from "@/lib/constants";
import { PortalDropdown } from "@/components/ui/PortalDropdown";
import { UI_COLORS } from "@/lib/theme/colors";

const BTN = "rounded-[9px]";

function ToolBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`${BTN} flex h-8 w-8 shrink-0 items-center justify-center transition-colors`}
      style={{
        color: UI_COLORS.shellText,
        background: active ? UI_COLORS.accentSubtleBg : "transparent",
        border: active ? `1px solid ${UI_COLORS.accentPrimaryBorder}` : "1px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
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

export default function ParagraphGroup({ compact = false }: { compact?: boolean }) {
  const editor = useEditorContext();
  const [showSpacing, setShowSpacing] = useState(false);
  const spacingRef = useRef<HTMLDivElement>(null);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return {
          isBulletList: false,
          isOrderedList: false,
          isAlignLeft: true,
          isAlignCenter: false,
          isAlignRight: false,
          isAlignJustify: false,
          lineHeight: "",
        };
      }
      const e = ctx.editor;
      const paraAttrs = e.getAttributes("paragraph");
      const textAlign = (paraAttrs.textAlign as string) || null;
      return {
        isBulletList: e.isActive("bulletList"),
        isOrderedList: e.isActive("orderedList"),
        isAlignLeft: textAlign === "left" || !textAlign,
        isAlignCenter: textAlign === "center",
        isAlignRight: textAlign === "right",
        isAlignJustify: textAlign === "justify",
        lineHeight: (paraAttrs.lineHeight as string) || "",
      };
    },
  });

  if (!editor || !editorState) return null;

  const {
    isBulletList,
    isOrderedList,
    isAlignLeft,
    isAlignCenter,
    isAlignRight,
    isAlignJustify,
    lineHeight,
  } = editorState;

  const spacingBtn = (
    <div ref={spacingRef}>
      <button
        type="button"
        className={`${BTN} flex h-8 items-center gap-0.5 px-1.5 text-[10px]`}
        style={{
          color: UI_COLORS.shellTextMuted,
          background: "transparent",
        }}
        title="Межстрочный интервал"
        onClick={() => setShowSpacing(!showSpacing)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="5" y1="3" x2="14" y2="3" />
          <line x1="5" y1="8" x2="14" y2="8" />
          <line x1="5" y1="13" x2="14" y2="13" />
          <polyline points="2,5 1,3 2,1" fill="none" />
          <polyline points="2,11 1,13 2,15" fill="none" />
        </svg>
        {lineHeight ? <span className="max-w-[28px] truncate text-[9px] font-medium">{lineHeight}</span> : null}
        <ChevronDown size={8} />
      </button>
      <PortalDropdown
        anchorRef={spacingRef}
        isOpen={showSpacing}
        onClose={() => setShowSpacing(false)}
        width={120}
        variant="dark"
      >
        <div className="py-1">
          {LINE_SPACINGS.map((sp) => (
            <button
              key={sp.value}
              type="button"
              className="w-full px-3 py-1.5 text-left text-[12px]"
              style={{
                background: lineHeight === String(sp.value) ? UI_COLORS.accentSubtleBg : "transparent",
                color: UI_COLORS.shellText,
                fontWeight: lineHeight === String(sp.value) ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (lineHeight !== String(sp.value)) e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
              }}
              onMouseLeave={(e) => {
                if (lineHeight !== String(sp.value)) e.currentTarget.style.background = "transparent";
              }}
              onClick={() => {
                editor.chain().focus().updateAttributes("paragraph", { lineHeight: String(sp.value) }).run();
                setShowSpacing(false);
              }}
            >
              {sp.label}
            </button>
          ))}
        </div>
      </PortalDropdown>
    </div>
  );

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-0.5 py-0.5">
        <ToolBtn title="Маркированный список" active={isBulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={14} />
        </ToolBtn>
        <ToolBtn title="Нумерованный список" active={isOrderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={14} />
        </ToolBtn>
        <div className="mx-0.5 h-5 w-px shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
        <ToolBtn title="Уменьшить отступ" onClick={() => editor.chain().focus().liftListItem("listItem").run()}>
          <IndentDecrease size={14} />
        </ToolBtn>
        <ToolBtn title="Увеличить отступ" onClick={() => editor.chain().focus().sinkListItem("listItem").run()}>
          <IndentIncrease size={14} />
        </ToolBtn>
        <div className="mx-0.5 h-5 w-px shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
        <ToolBtn title="По левому краю" active={isAlignLeft} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft size={14} />
        </ToolBtn>
        <ToolBtn title="По центру" active={isAlignCenter} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter size={14} />
        </ToolBtn>
        <ToolBtn title="По правому краю" active={isAlignRight} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight size={14} />
        </ToolBtn>
        <ToolBtn title="По ширине" active={isAlignJustify} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
          <AlignJustify size={14} />
        </ToolBtn>
        <div className="mx-0.5 h-5 w-px shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
        {spacingBtn}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 px-1 py-1">
      <div className="flex items-center gap-0.5">
        <ToolBtn title="Маркированный список" active={isBulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={13} />
        </ToolBtn>
        <ToolBtn title="Нумерованный список" active={isOrderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={13} />
        </ToolBtn>
        <div className="mx-0.5 h-4 w-px shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
        <ToolBtn title="Уменьшить отступ" onClick={() => editor.chain().focus().liftListItem("listItem").run()}>
          <IndentDecrease size={13} />
        </ToolBtn>
        <ToolBtn title="Увеличить отступ" onClick={() => editor.chain().focus().sinkListItem("listItem").run()}>
          <IndentIncrease size={13} />
        </ToolBtn>
      </div>
      <div className="flex items-center gap-0.5">
        <ToolBtn title="По левому краю" active={isAlignLeft} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft size={13} />
        </ToolBtn>
        <ToolBtn title="По центру" active={isAlignCenter} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter size={13} />
        </ToolBtn>
        <ToolBtn title="По правому краю" active={isAlignRight} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight size={13} />
        </ToolBtn>
        <ToolBtn title="По ширине" active={isAlignJustify} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
          <AlignJustify size={13} />
        </ToolBtn>
        <div className="mx-0.5 h-4 w-px shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
        {spacingBtn}
      </div>
    </div>
  );
}
