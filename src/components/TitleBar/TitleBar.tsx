"use client";

/**
 * TODO (roadmap фаза 4 → «Разбиение god-компонентов»).
 *
 * Вынести в подкомпоненты:
 *   - TitleBar/WindowControls.tsx        (min/max/close Tauri)
 *   - TitleBar/QuickActions.tsx          (save/undo/redo/find)
 *   - TitleBar/ProjectTitleInput.tsx     (editable title)
 *   - TitleBar/WriterModeToggle.tsx
 *   - TitleBar/ThemeToggle.tsx
 * + хук TitleBar/hooks/useWindowState.ts для Tauri max/fullscreen.
 */

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
  BookOpen,
  PanelLeft,
  PenSquare,
  Workflow,
  Sun,
  Moon,
} from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { useDocumentStore } from "@/stores/documentStore";
import { useUIStore } from "@/stores/uiStore";
import { useAIStore } from "@/stores/aiStore";
import { isTauri } from "@/lib/tauri-helpers";
import { saveDocxExplicit } from "@/lib/save-docx-workflow";
import { useToastStore } from "@/stores/toastStore";
import { Tooltip } from "@/components/ui/Tooltip";
import { usePlotIndexStore } from "@/stores/plotIndexStore";
import { getPrimaryModifierLabel } from "@/lib/platform";
import { usePlotStoryStore } from "@/stores/plotStoryStore";
import { UI_COLORS } from "@/lib/theme/colors";

export default function TitleBar({
  onFileMenuOpen,
}: {
  onFileMenuOpen: () => void;
}) {
  const titleBarBg = UI_COLORS.titleBarBg;
  const editor = useEditorContext();
  const title = useDocumentStore((s) => s.title);
  const setTitle = useDocumentStore((s) => s.setTitle);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const setShowFindReplace = useUIStore((s) => s.setShowFindReplace);
  const showPlotPanel = useUIStore((s) => s.showPlotPanel);
  const setShowPlotPanel = useUIStore((s) => s.setShowPlotPanel);
  const showChapterNavigator = useUIStore((s) => s.showChapterNavigator);
  const setShowChapterNavigator = useUIStore((s) => s.setShowChapterNavigator);
  const setRightPanelTab = useUIStore((s) => s.setRightPanelTab);
  const writerModeEnabled = useUIStore((s) => s.writerModeEnabled);
  const setWriterModeEnabled = useUIStore((s) => s.setWriterModeEnabled);
  const writerFocusMode = useUIStore((s) => s.writerFocusMode);
  const setWriterFocusMode = useUIStore((s) => s.setWriterFocusMode);
  const setContinuityFilter = useUIStore((s) => s.setContinuityFilter);
  const canvasAppearance = useUIStore((s) => s.canvasAppearance);
  const setCanvasAppearance = useUIStore((s) => s.setCanvasAppearance);
  const ingestPhase = usePlotIndexStore((s) => s.ingestPhase);
  const lastIndexedAt = usePlotIndexStore((s) => s.lastIndexedAt);
  const indexError = usePlotIndexStore((s) => s.indexError);
  const consistencyWarnings = usePlotStoryStore((s) => s.consistencyWarnings);
  const warningStatuses = usePlotStoryStore((s) => s.warningStatuses);
  const analysisPhase = usePlotStoryStore((s) => s.analysisPhase);
  const autoBusy = usePlotStoryStore((s) => s.autoBusy);
  const pushToast = useToastStore((s) => s.push);
  const [isEditing, setIsEditing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [inTauri, setInTauri] = useState(false);
  /** Клиентское время для тултипа — избегаем hydration mismatch (toLocaleTimeString SSR vs client). */
  const [indexTimeLabel, setIndexTimeLabel] = useState<string | null>(null);
  const modLabel = getPrimaryModifierLabel();
  const inputRef = useRef<HTMLInputElement>(null);
  const unresolvedCount = consistencyWarnings.filter((w) => {
    const status = warningStatuses[w.key] ?? "new";
    return status !== "resolved" && status !== "ignored";
  }).length;

  useEffect(() => {
    setInTauri(isTauri());
  }, []);

  useEffect(() => {
    if (!lastIndexedAt) {
      setIndexTimeLabel(null);
      return;
    }
    setIndexTimeLabel(new Date(lastIndexedAt).toLocaleTimeString());
  }, [lastIndexedAt]);

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
        const isMac =
          typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);
        if (isMac) {
          const fs = await win.isFullscreen();
          if (!cancelled) setIsMaximized(fs);
          // После `set_simple_fullscreen` из Rust состояние иногда приходит с задержкой.
          await new Promise((r) => setTimeout(r, 450));
          if (!cancelled) {
            try {
              setIsMaximized(await win.isFullscreen());
            } catch {
              /* ignore */
            }
          }
        } else {
          const maximized = await win.isMaximized();
          if (!cancelled) setIsMaximized(maximized);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [inTauri]);

  const handleSave = () => {
    void saveDocxExplicit(editor ?? null, { saveAs: false }).then((r) => {
      if (r.ok) {
        pushToast("Документ сохранён", "info");
      } else if (!r.cancelled) {
        pushToast("Не удалось сохранить: " + r.reason, "error");
      }
    });
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
      const isMac =
        typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);
      if (isMac) {
        const on = await win.isFullscreen();
        await win.setSimpleFullscreen(!on);
        setIsMaximized(!on);
      } else {
        await win.toggleMaximize();
        setIsMaximized(await win.isMaximized());
      }
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
      style={{ background: titleBarBg }}
    >
      {/* Left controls */}
      <div className="flex items-center gap-1">
        <Tooltip content="Writer Mode: интерфейс для романиста">
          <button
            type="button"
            className={`p-1 rounded text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E] ${
              writerModeEnabled ? "bg-white/20 hover:bg-white/30" : "hover:bg-white/20"
            }`}
            onClick={() => setWriterModeEnabled(!writerModeEnabled)}
          >
            <Workflow size={14} />
          </button>
        </Tooltip>
        <Tooltip content="Показать или скрыть левый навигатор глав">
          <button
            type="button"
            className={`p-1 rounded text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E] ${
              showChapterNavigator ? "bg-white/20 hover:bg-white/30" : "hover:bg-white/20"
            }`}
            onClick={() => setShowChapterNavigator(!showChapterNavigator)}
          >
            <PanelLeft size={14} />
          </button>
        </Tooltip>
        <Tooltip
          content={
            canvasAppearance === "light"
              ? "Тёмный лист документа (меньше бликов с тёмным интерфейсом)"
              : "Светлый пергаментный лист"
          }
        >
          <button
            type="button"
            className={`p-1 rounded text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E] ${
              canvasAppearance === "dark" ? "bg-white/20 hover:bg-white/30" : "hover:bg-white/20"
            }`}
            onClick={() =>
              setCanvasAppearance(canvasAppearance === "light" ? "dark" : "light")
            }
            aria-pressed={canvasAppearance === "dark"}
          >
            {canvasAppearance === "light" ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </Tooltip>
        <Tooltip content="Меню «Файл»: создать, открыть, экспорт">
          <button
            type="button"
            className="p-1 rounded hover:bg-white/20 text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E]"
            onClick={onFileMenuOpen}
          >
            <FileText size={14} />
          </button>
        </Tooltip>
        <Tooltip content="Создать новую сцену (H2) ниже курсора">
          <button
            type="button"
            className="p-1 rounded hover:bg-white/20 text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E]"
            onClick={() => {
              if (!editor) return;
              editor
                .chain()
                .focus()
                .insertContent(`<h2>New Scene</h2><p></p>`)
                .run();
            }}
          >
            <PenSquare size={14} />
          </button>
        </Tooltip>
        <Tooltip content={`Сохранить .docx (${modLabel}+S; первый раз — выберите имя и папку)`}>
          <button
            type="button"
            className="p-1 rounded hover:bg-white/20 text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E]"
            onClick={handleSave}
          >
            <Save size={14} />
          </button>
        </Tooltip>
        <Tooltip content={`Отменить (${modLabel}+Z)`}>
          <button
            type="button"
            className="p-1 rounded hover:bg-white/20 text-white/90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E]"
            disabled={!editor?.can().undo()}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 size={14} />
          </button>
        </Tooltip>
        <Tooltip content={`Повторить (${modLabel}+Y)`}>
          <button
            type="button"
            className="p-1 rounded hover:bg-white/20 text-white/90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E]"
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
        <Tooltip content={`Найти в документе (${modLabel}+F). Замена: ${modLabel}+H`}>
          <button
            type="button"
            className="flex items-center bg-white/15 rounded px-2 py-0.5 gap-1 hover:bg-white/25 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E]"
            onClick={() => setShowFindReplace(true)}
          >
            <Search size={12} className="text-white/70" />
            <span className="text-white/60 text-[11px] hidden sm:inline">Поиск</span>
          </button>
        </Tooltip>
        <Tooltip content="Скоро: общий доступ к документу">
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-white/50 text-[11px] cursor-not-allowed opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E]"
            aria-disabled
            onClick={(e) => e.preventDefault()}
          >
            <Share2 size={12} />
            <span className="hidden md:inline">Поделиться</span>
          </button>
        </Tooltip>
        <Tooltip
          content={
            indexError
              ? `Индекс сюжета: ошибка (${indexError})`
              : lastIndexedAt && indexTimeLabel
                ? `Индекс обновлён в ${indexTimeLabel}`
                : "Память сюжета: связи, факты и конфликты обновляются в фоне"
          }
        >
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-white text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E]"
            style={{
              background: showPlotPanel
                ? UI_COLORS.accentPrimaryHover
                : UI_COLORS.accentSubtleBg,
              border: `1px solid ${
                showPlotPanel
                  ? UI_COLORS.accentPrimaryBorder
                  : "transparent"
              }`,
            }}
            onClick={() => {
              setShowPlotPanel(!showPlotPanel);
              if (!showPlotPanel) setRightPanelTab("story");
            }}
          >
            <BookOpen size={12} />
            <span className="hidden sm:inline">Story Memory</span>
            <span className="hidden lg:inline text-white/80">
              {indexError
                ? "ошибка"
                : unresolvedCount > 0
                  ? `${unresolvedCount} конфликтов`
                  : autoBusy || analysisPhase === "analyzing"
                    ? "авто-проверка..."
                : ingestPhase === "embedding"
                  ? "синх..."
                  : ingestPhase === "extracting"
                    ? "анализ..."
                    : "готово"}
            </span>
          </button>
        </Tooltip>
        <Tooltip content={`Панель ИИ: вопросы по тексту и команды (${modLabel}+L)`}>
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-white text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E]"
            style={{
              background: UI_COLORS.accentSubtleBg,
              border: `1px solid transparent`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = UI_COLORS.accentPrimaryHover;
              e.currentTarget.style.borderColor = UI_COLORS.accentPrimaryBorder;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = UI_COLORS.accentSubtleBg;
              e.currentTarget.style.borderColor = "transparent";
            }}
            onClick={() => {
              useAIStore.getState().togglePanel();
              setRightPanelTab("ai");
            }}
          >
            <Sparkles size={12} />
            ИИ
          </button>
        </Tooltip>
        <div className="hidden xl:flex items-center rounded overflow-hidden ml-1" style={{ background: UI_COLORS.shellBgElevated }}>
          {(
            [
              ["draft", "Draft"],
              ["rewrite", "Rewrite"],
              ["continuity", "Continuity"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() =>
                setWriterFocusMode(mode)
              }
              className={`px-2 py-0.5 text-[10px] ${
                writerFocusMode === mode
                  ? "text-white"
                  : "text-white/80 hover:bg-gray-700"
              }`}
              style={
                writerFocusMode === mode
                  ? { background: UI_COLORS.accentSubtleBg }
                  : undefined
              }
            >
              {label}
            </button>
          ))}
        </div>
        <Tooltip content="Открыть нерешённые конфликты сюжета">
          <button
            type="button"
            className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded text-white text-[10px]"
            style={{ background: UI_COLORS.accentSubtleBg }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = UI_COLORS.accentPrimaryHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = UI_COLORS.accentSubtleBg;
            }}
            onClick={() => {
              setShowPlotPanel(true);
              setRightPanelTab("story");
              setContinuityFilter("new");
              setWriterFocusMode("continuity");
            }}
          >
            <Workflow size={11} />
            {unresolvedCount} конфликтов
          </button>
        </Tooltip>

        {inTauri && (
          <div className="flex items-center ml-2">
            <Tooltip content="Свернуть окно">
              <button
                type="button"
                className="w-[28px] h-[28px] flex items-center justify-center rounded hover:bg-white/20 text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E]"
                onClick={handleMinimize}
              >
                <Minus size={14} />
              </button>
            </Tooltip>
            <Tooltip
              content={
                typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent)
                  ? isMaximized
                    ? "Выйти из полноэкранного режима"
                    : "Развернуть на весь экран"
                  : isMaximized
                    ? "Восстановить размер окна"
                    : "Развернуть на весь экран"
              }
            >
              <button
                type="button"
                className="w-[28px] h-[28px] flex items-center justify-center rounded hover:bg-white/20 text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E]"
                onClick={handleToggleMaximize}
              >
                {isMaximized ? <Maximize2 size={12} /> : <Square size={12} />}
              </button>
            </Tooltip>
            <Tooltip content="Закрыть приложение">
              <button
                type="button"
                className="w-[28px] h-[28px] flex items-center justify-center rounded hover:bg-red-500/75 text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E]"
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
