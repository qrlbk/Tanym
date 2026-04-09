"use client";

import { BookOpen, ListTree, Hash, Bookmark } from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";

export default function ReferencesTab() {
  const editor = useEditorContext();

  return (
    <div className="flex items-center h-[74px] px-2 gap-2">
      <button
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100 opacity-50"
        title="Оглавление (В разработке)"
      >
        <ListTree size={20} className="text-gray-600" />
        <span className="text-[9px] text-gray-600">Оглавление</span>
      </button>

      <div className="w-px h-12 bg-gray-200" />

      <button
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100"
        title="Вставить номер страницы (в футер)"
        onClick={() => {
          if (!editor) return;
          editor.chain().focus().insertContent("[ № стр. ]").run();
        }}
      >
        <Hash size={20} className="text-gray-600" />
        <span className="text-[9px] text-gray-600">№ страницы</span>
      </button>

      <div className="w-px h-12 bg-gray-200" />

      <button
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100 opacity-50"
        title="Закладка (В разработке)"
      >
        <Bookmark size={20} className="text-gray-600" />
        <span className="text-[9px] text-gray-600">Закладка</span>
      </button>

      <div className="w-px h-12 bg-gray-200" />

      <button
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100 opacity-50"
        title="Библиография (В разработке)"
      >
        <BookOpen size={20} className="text-gray-600" />
        <span className="text-[9px] text-gray-600">Библиография</span>
      </button>
    </div>
  );
}
