"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  FileText,
  Save,
  Undo2,
  Redo2,
  Search,
  Share2,
  Minus,
  Square,
  Maximize2,
  X,
  Sparkles,
} from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { useDocumentStore } from "@/stores/documentStore";
import { useUIStore } from "@/stores/uiStore";
import { useAIStore } from "@/stores/aiStore";
import { isTauri } from "@/lib/tauri-helpers";
import { Tooltip } from "@/components/ui/Tooltip";

export default function TitleBar({
  onFileMenuOpen,
}: {
  onFileMenuOpen: () => void;
}) {
  const editor = useEditorContext();
  const title = useDocumentStore((s) => s.title);
  const setTitle = useDocumentStore((s) => s.setTitle);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const setShowFindReplace = useUIStore((s) => s.setShowFindReplace);
  const [isEditing, setIsEditing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [inTauri, setInTauri] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInTauri(isTauri());
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!inTauri) return;
    let cancelled = false;
    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        const maximized = await win.isMaximized();
        if (!cancelled) setIsMaximized(maximized);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [inTauri]);

  const handleSave = () => {
    if (!editor) return;
    const json = editor.getJSON();
    localStorage.setItem("word-ai-doc", JSON.stringify(json));
    localStorage.setItem("word-ai-doc-time", new Date().toISOString());
    useDocumentStore.getState().setDirty(false);
    useDocumentStore.getState().setLastSaved(new Date());
  };

  const handleMinimize = useCallback(async () => {
    if (!inTauri) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().minimize();
    } catch {}
  }, [inTauri]);

  const handleToggleMaximize = useCallback(async () => {
    if (!inTauri) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      await win.toggleMaximize();
      setIsMaximized(await win.isMaximized());
    } catch {}
  }, [inTauri]);

  const handleClose = useCallback(async () => {
    if (!inTauri) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch {}
  }, [inTauri]);

  return (
    <div
      className="flex items-center h-[32px] px-2 shrink-0 select-none"
      style={{ background: "#2B579A" }}
      data-tauri-drag-region=""
    >
      {/* Left controls */}
      <div className="flex items-center gap-1">
        <Tooltip content="Меню «Файл»: создать, открыть, экспорт">
          <button
            type="button"
            className="p-1 rounded hover:bg-white/20 text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2B579A]"
            onClick={onFileMenuOpen}
          >
            <FileText size={14} />
          </button>
        </Tooltip>
        <Tooltip content="Сохранить в этот браузер (Ctrl+S)">
          <button
            type="button"
            className="p-1 rounded hover:bg-white/20 text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2B579A]"
            onClick={handleSave}
          >
            <Save size={14} />
          </button>
        </Tooltip>
        <Tooltip content="Отменить (Ctrl+Z)">
          <button
            type="button"
            className="p-1 rounded hover:bg-white/20 text-white/90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2B579A]"
            disabled={!editor?.can().undo()}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 size={14} />
          </button>
        </Tooltip>
        <Tooltip content="Повторить (Ctrl+Y)">
          <button
            type="button"
            className="p-1 rounded hover:bg-white/20 text-white/90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2B579A]"
            disabled={!editor?.can().redo()}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 size={14} />
          </button>
        </Tooltip>
      </div>

      {/* Center: document title */}
      <div className="flex-1 flex justify-center items-center" data-tauri-drag-region="">
        {isEditing ? (
          <input
            ref={inputRef}
            className="bg-white/20 text-white text-[12px] px-2 py-0.5 rounded border border-white/30 text-center outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setIsEditing(false);
            }}
          />
        ) : (
          <span
            className="text-white text-[12px] cursor-pointer hover:bg-white/10 px-2 py-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            title="Дважды нажмите, чтобы переименовать документ"
            onDoubleClick={() => setIsEditing(true)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsEditing(true);
              }
            }}
          >
            {title}
            {isDirty ? " *" : ""}
          </span>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1">
        <Tooltip content="Найти в документе (Ctrl+F). Замена: Ctrl+H">
          <button
            type="button"
            className="flex items-center bg-white/15 rounded px-2 py-0.5 gap-1 hover:bg-white/25 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2B579A]"
            onClick={() => setShowFindReplace(true)}
          >
            <Search size={12} className="text-white/70" />
            <span className="text-white/60 text-[11px] hidden sm:inline">Поиск</span>
          </button>
        </Tooltip>
        <Tooltip content="Скоро: общий доступ к документу">
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-white/50 text-[11px] cursor-not-allowed opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2B579A]"
            aria-disabled
            onClick={(e) => e.preventDefault()}
          >
            <Share2 size={12} />
            <span className="hidden md:inline">Поделиться</span>
          </button>
        </Tooltip>
        <Tooltip content="Панель ИИ: вопросы по тексту и команды (Ctrl+L)">
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/30 hover:bg-purple-500/50 text-white text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2B579A]"
            onClick={() => useAIStore.getState().togglePanel()}
          >
            <Sparkles size={12} />
            ИИ
          </button>
        </Tooltip>

        {inTauri && (
          <div className="flex items-center ml-2">
            <Tooltip content="Свернуть окно">
              <button
                type="button"
                className="w-[28px] h-[28px] flex items-center justify-center rounded hover:bg-white/20 text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2B579A]"
                onClick={handleMinimize}
              >
                <Minus size={14} />
              </button>
            </Tooltip>
            <Tooltip content={isMaximized ? "Восстановить размер окна" : "Развернуть на весь экран"}>
              <button
                type="button"
                className="w-[28px] h-[28px] flex items-center justify-center rounded hover:bg-white/20 text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2B579A]"
                onClick={handleToggleMaximize}
              >
                {isMaximized ? <Maximize2 size={12} /> : <Square size={12} />}
              </button>
            </Tooltip>
            <Tooltip content="Закрыть приложение">
              <button
                type="button"
                className="w-[28px] h-[28px] flex items-center justify-center rounded hover:bg-red-500/80 text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2B579A]"
                onClick={handleClose}
              >
                <X size={14} />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
