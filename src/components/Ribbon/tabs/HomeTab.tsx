"use client";

import { Clipboard } from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import FontGroup from "@/components/Toolbar/FontGroup";
import ParagraphGroup from "@/components/Toolbar/ParagraphGroup";
import StylesGallery from "@/components/Toolbar/StylesGallery";

function SectionWrapper({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col h-full border-r border-gray-200 ${className}`}>
      <div className="flex-1 flex items-center px-1">
        {children}
      </div>
      <div className="text-[9px] text-gray-400 text-center pb-0.5 select-none">
        {label}
      </div>
    </div>
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
    <div className="flex items-stretch h-full px-1">
      <SectionWrapper label="Буфер обмена">
        <button
          onClick={handlePaste}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100"
          title="Вставить"
        >
          <Clipboard size={22} className="text-gray-600" />
          <span className="text-[9px] text-gray-600">Вставить</span>
        </button>
      </SectionWrapper>

      <SectionWrapper label="Шрифт" className="min-w-[160px]">
        <FontGroup />
      </SectionWrapper>

      <SectionWrapper label="Абзац">
        <ParagraphGroup />
      </SectionWrapper>

      <SectionWrapper label="Стили" className="flex-1 min-w-0 border-r-0">
        <StylesGallery />
      </SectionWrapper>
    </div>
  );
}
