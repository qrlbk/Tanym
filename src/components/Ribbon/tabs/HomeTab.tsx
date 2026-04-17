"use client";

import { Clipboard, Undo2, Redo2 } from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import FontGroup from "@/components/Toolbar/FontGroup";
import ParagraphGroup from "@/components/Toolbar/ParagraphGroup";
import StylesDropdown from "@/components/Toolbar/StylesDropdown";
import { UI_COLORS } from "@/lib/theme/colors";
import { RibbonIsland } from "@/components/Ribbon/RibbonIsland";

function IconIslandBtn({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
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
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border transition-colors disabled:cursor-not-allowed disabled:opacity-35"
      style={{
        borderColor: "transparent",
        background: "transparent",
        color: UI_COLORS.shellText,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

export default function HomeTab() {
  const editor = useEditorContext();

  const handlePaste = async () => {
    if (!editor) return;
    try {
      const text = await navigator.clipboard.readText();
      editor.chain().focus().insertContent(text).run();
    } catch {}
  };

  return (
    <div
      className="flex min-h-0 min-w-0 flex-wrap items-stretch gap-2.5 py-1.5 pl-0.5 pr-1 font-sans"
      style={{ color: UI_COLORS.shellText, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <RibbonIsland aria-label="Буфер обмена">
        <IconIslandBtn title="Вставить" onClick={handlePaste} disabled={!editor}>
          <Clipboard size={18} />
        </IconIslandBtn>
        <div className="h-6 w-px shrink-0" style={{ background: UI_COLORS.ribbon.separator }} />
        <IconIslandBtn
          title="Отменить"
          disabled={!editor || !editor.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 size={17} />
        </IconIslandBtn>
        <IconIslandBtn
          title="Повторить"
          disabled={!editor || !editor.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 size={17} />
        </IconIslandBtn>
      </RibbonIsland>

      <RibbonIsland aria-label="Текст">
        <FontGroup />
      </RibbonIsland>

      <RibbonIsland aria-label="Абзац">
        <ParagraphGroup compact />
      </RibbonIsland>

      <RibbonIsland aria-label="Стили">
        <StylesDropdown />
      </RibbonIsland>
    </div>
  );
}
