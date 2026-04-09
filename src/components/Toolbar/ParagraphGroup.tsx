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
      onClick={onClick}
      title={title}
      className="w-[24px] h-[22px] flex items-center justify-center rounded transition-colors"
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

export default function ParagraphGroup() {
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

  return (
    <div className="flex flex-col gap-0.5 py-1 px-1">
      {/* Row 1: Lists + Indent */}
      <div className="flex items-center gap-0.5">
        <ToolBtn
          title="Маркированный список"
          active={isBulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={13} />
        </ToolBtn>
        <ToolBtn
          title="Нумерованный список"
          active={isOrderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={13} />
        </ToolBtn>
        <div className="w-px h-4 bg-gray-300 mx-0.5" />
        <ToolBtn
          title="Уменьшить отступ"
          onClick={() => editor.chain().focus().liftListItem("listItem").run()}
        >
          <IndentDecrease size={13} />
        </ToolBtn>
        <ToolBtn
          title="Увеличить отступ"
          onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
        >
          <IndentIncrease size={13} />
        </ToolBtn>
      </div>

      {/* Row 2: Alignment + Spacing */}
      <div className="flex items-center gap-0.5">
        <ToolBtn title="По левому краю" active={isAlignLeft}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft size={13} />
        </ToolBtn>
        <ToolBtn title="По центру" active={isAlignCenter}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter size={13} />
        </ToolBtn>
        <ToolBtn title="По правому краю" active={isAlignRight}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight size={13} />
        </ToolBtn>
        <ToolBtn title="По ширине" active={isAlignJustify}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
          <AlignJustify size={13} />
        </ToolBtn>
        <div className="w-px h-4 bg-gray-300 mx-0.5" />

        {/* Line spacing - portal dropdown */}
        <div ref={spacingRef}>
          <button
            className="h-[22px] flex items-center gap-0.5 px-1 rounded hover:bg-gray-200 text-[10px] text-gray-600"
            title="Межстрочный интервал"
            onClick={() => setShowSpacing(!showSpacing)}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="5" y1="3" x2="14" y2="3" />
              <line x1="5" y1="8" x2="14" y2="8" />
              <line x1="5" y1="13" x2="14" y2="13" />
              <polyline points="2,5 1,3 2,1" fill="none" />
              <polyline points="2,11 1,13 2,15" fill="none" />
            </svg>
            {lineHeight && <span className="text-[9px] font-medium">{lineHeight}</span>}
            <ChevronDown size={8} />
          </button>
          <PortalDropdown
            anchorRef={spacingRef}
            isOpen={showSpacing}
            onClose={() => setShowSpacing(false)}
            width={100}
          >
            <div className="py-1">
              {LINE_SPACINGS.map((sp) => (
                <button
                  key={sp.value}
                  className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-blue-50"
                  style={{
                    background: lineHeight === String(sp.value) ? "#E8F0FE" : undefined,
                    fontWeight: lineHeight === String(sp.value) ? 600 : undefined,
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
      </div>
    </div>
  );
}
