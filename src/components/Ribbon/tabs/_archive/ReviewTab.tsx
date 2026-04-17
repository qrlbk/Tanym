"use client";

import { useState, useRef } from "react";
import { SpellCheck, MessageSquare, Languages, ChevronDown, BarChart3 } from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { useDocumentStore } from "@/stores/documentStore";
import { PortalDropdown } from "@/components/ui/PortalDropdown";

const LANGUAGES = [
  { code: "ru", name: "Русский" },
  { code: "kk", name: "Қазақша" },
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
];

export default function ReviewTab() {
  const editor = useEditorContext();
  const wordCount = useDocumentStore((s) => s.wordCount);
  const charCount = useDocumentStore((s) => s.charCount);
  const [showLang, setShowLang] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [spellcheck, setSpellcheck] = useState(true);
  const langRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex items-center h-[74px] px-2 gap-2">
      {/* Spell check toggle */}
      <button
        onClick={() => {
          setSpellcheck(!spellcheck);
          const el = document.querySelector(".tiptap") as HTMLElement;
          if (el) el.setAttribute("spellcheck", String(!spellcheck));
        }}
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100"
        style={{ background: spellcheck ? "#D0E0F0" : undefined }}
        title={spellcheck ? "Выключить проверку" : "Включить проверку правописания"}
      >
        <SpellCheck size={20} className="text-gray-600" />
        <span className="text-[9px] text-gray-600">Правописание</span>
      </button>

      <div className="w-px h-12 bg-gray-200" />

      {/* Language */}
      <div ref={langRef}>
        <button
          onClick={() => setShowLang(!showLang)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100"
          title="Выбрать язык проверки"
        >
          <Languages size={20} className="text-gray-600" />
          <div className="flex items-center gap-0.5">
            <span className="text-[9px] text-gray-600">Язык</span>
            <ChevronDown size={8} className="text-gray-400" />
          </div>
        </button>
        <PortalDropdown
          anchorRef={langRef}
          isOpen={showLang}
          onClose={() => setShowLang(false)}
          width={160}
        >
          <div className="py-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-blue-50"
                onClick={() => {
                  const el = document.querySelector(".tiptap") as HTMLElement;
                  if (el) el.setAttribute("lang", lang.code);
                  setShowLang(false);
                }}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </PortalDropdown>
      </div>

      <div className="w-px h-12 bg-gray-200" />

      {/* Статистика текста */}
      <div ref={statsRef}>
        <button
          onClick={() => setShowStats(!showStats)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100"
          title="Статистика документа"
        >
          <BarChart3 size={20} className="text-gray-600" />
          <span className="text-[9px] text-gray-600">Статистика</span>
        </button>
        <PortalDropdown
          anchorRef={statsRef}
          isOpen={showStats}
          onClose={() => setShowStats(false)}
          width={220}
        >
          <div className="p-3">
            <p className="text-[12px] font-medium text-gray-700 mb-2">Статистика документа</p>
            <div className="space-y-1.5 text-[11px] text-gray-600">
              <div className="flex justify-between"><span>Слов:</span><span className="font-semibold">{wordCount}</span></div>
              <div className="flex justify-between"><span>Символов (с пробелами):</span><span className="font-semibold">{charCount}</span></div>
              <div className="flex justify-between"><span>Символов (без пробелов):</span><span className="font-semibold">{Math.max(0, charCount - (wordCount > 0 ? wordCount - 1 : 0))}</span></div>
            </div>
          </div>
        </PortalDropdown>
      </div>

      <div className="w-px h-12 bg-gray-200" />

      <button
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100 opacity-50"
        title="Комментарии (В разработке)"
      >
        <MessageSquare size={20} className="text-gray-600" />
        <span className="text-[9px] text-gray-600">Комментарий</span>
      </button>
    </div>
  );
}
