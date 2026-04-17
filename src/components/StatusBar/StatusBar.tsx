"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useEditorState } from "@tiptap/react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { useDocumentStore } from "@/stores/documentStore";
import { useUIStore } from "@/stores/uiStore";
import { usePlotStoryStore } from "@/stores/plotStoryStore";
import { UI_COLORS } from "@/lib/theme/colors";
import { useProjectStore } from "@/stores/projectStore";

function TextMetricsPopup({ onClose }: { onClose: () => void }) {
  const wordCount = useDocumentStore((s) => s.wordCount);
  const charCount = useDocumentStore((s) => s.charCount);
  const charCountNoSpaces = useDocumentStore((s) => s.charCountNoSpaces);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 rounded-lg shadow-xl p-3 z-50"
      style={{
        width: 220,
        background: UI_COLORS.shellBgElevated,
        border: `1px solid ${UI_COLORS.shellBorder}`,
      }}
    >
      <p
        className="text-[12px] font-semibold mb-2 leading-[1.4]"
        style={{ color: UI_COLORS.shellTextStrong }}
      >
        Статистика
      </p>
      <div className="space-y-1.5 text-[11px] leading-[1.45]" style={{ color: UI_COLORS.shellText }}>
        <div className="flex justify-between">
          <span>Слов:</span>
          <span className="font-medium">{wordCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Символов (с пробелами):</span>
          <span className="font-medium">{charCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Символов (без пробелов):</span>
          <span className="font-medium">{charCountNoSpaces}</span>
        </div>
      </div>
    </div>
  );
}

export default function StatusBar() {
  const wordCount = useDocumentStore((s) => s.wordCount);
  const setShowShortcutsHelp = useUIStore((s) => s.setShowShortcutsHelp);
  const [showTextMetrics, setShowTextMetrics] = useState(false);
  const lastSaved = useDocumentStore((s) => s.lastSaved);
  const saveError = useDocumentStore((s) => s.saveError);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const writerFocusMode = useUIStore((s) => s.writerFocusMode);
  const activeSceneId = useUIStore((s) => s.activeSceneId);
  const project = useProjectStore((s) => s.project);
  const editor = useEditorContext();
  const docTick = useEditorState({
    editor,
    selector: ({ editor: ed }) => (ed ? ed.state.doc.content.size : 0),
  });
  /** Не показываем «scene-379» — это внутр. id; при смене страницы/курсора меняется активная сцена, не «число сцен». */
  const sceneStatus = useMemo(() => {
    if (!activeSceneId || !project) return null;
    const scenes = project.chapters.flatMap((chapter) =>
      chapter.scenes.map((scene) => ({
        id: scene.id,
        title: scene.title,
      })),
    );
    const total = scenes.length;
    const idx = scenes.findIndex((s) => s.id === activeSceneId);
    if (idx < 0) {
      return { line: "—", hint: activeSceneId, titleShort: "" as string };
    }
    const title = scenes[idx]!.title;
    const titleShort = title.length > 26 ? `${title.slice(0, 26)}…` : title;
    return {
      line: `${idx + 1} из ${total}`,
      hint: title,
      titleShort,
    };
  }, [activeSceneId, docTick, project]);
  const consistencyWarnings = usePlotStoryStore((s) => s.consistencyWarnings);
  const warningStatuses = usePlotStoryStore((s) => s.warningStatuses);
  const unresolvedCount = consistencyWarnings.filter((warning) => {
    const status = warningStatuses[warning.key] ?? "new";
    return status !== "resolved" && status !== "ignored";
  }).length;

  return (
    <div
      className="flex min-h-[28px] shrink-0 select-none items-center gap-2 px-3 py-0.5"
      style={{
        background: UI_COLORS.statusBarBg,
        borderTop: `1px solid ${UI_COLORS.statusBarBorder}`,
      }}
    >
      <div
        className="flex min-w-0 flex-1 flex-wrap items-center gap-4 text-[11px] leading-[1.45]"
        style={{ color: UI_COLORS.shellText }}
      >
        <span>Сцена {sceneStatus?.line ?? "—"}</span>
        <span className="hidden md:inline" style={{ color: UI_COLORS.shellTextMuted }}>
          Фокус: {writerFocusMode}
        </span>
        <span
          className="hidden md:inline max-w-[min(280px,28vw)] truncate"
          style={{ color: UI_COLORS.shellTextMuted }}
          title={
            sceneStatus?.hint
              ? `Текущая сцена по заголовкам: ${sceneStatus.hint}`
              : "Сцена строится по заголовкам вне таблицы; при прокрутке меняется активная сцена под курсором."
          }
        >
          Сцена:{" "}
          {sceneStatus
            ? `${sceneStatus.line}${sceneStatus.titleShort ? ` · ${sceneStatus.titleShort}` : ""}`
            : "—"}
        </span>
        <span style={{ color: unresolvedCount > 0 ? UI_COLORS.accentPrimaryBorder : UI_COLORS.shellTextMuted }}>
          Логика сюжета: {unresolvedCount} нереш.
        </span>
        <div className="relative">
          <span className="cursor-pointer" onClick={() => setShowTextMetrics(!showTextMetrics)}>
            Число слов: {wordCount}
          </span>
          {showTextMetrics && (
            <TextMetricsPopup onClose={() => setShowTextMetrics(false)} />
          )}
        </div>
        <span className="hidden sm:inline" style={{ color: UI_COLORS.shellTextMuted }} title="Язык проверки орфографии (скоро)">
          Русский
        </span>
        {saveError ? (
          <span
            className="text-red-600 max-w-[200px] truncate"
            title={saveError}
          >
            Ошибка сохранения
          </span>
        ) : lastSaved && !isDirty ? (
          <span className="hidden md:inline tabular-nums" style={{ color: UI_COLORS.shellTextMuted }}>
            Сохранено{" "}
            {lastSaved.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ) : isDirty ? (
          <span className="hidden md:inline" style={{ color: UI_COLORS.accentPrimaryBorder }}>Не сохранено</span>
        ) : null}
        <button
          type="button"
          onClick={() => setShowShortcutsHelp(true)}
          className="hidden sm:inline text-[11px] underline-offset-2 hover:underline"
          style={{ color: UI_COLORS.shellTextMuted }}
        >
          Горячие клавиши
        </button>
      </div>
    </div>
  );
}
