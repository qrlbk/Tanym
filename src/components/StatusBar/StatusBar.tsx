"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDocumentStore } from "@/stores/documentStore";
import { useUIStore, ViewMode } from "@/stores/uiStore";
import { FileText, BookOpen, Monitor, Minus, Plus } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

function WordCountPopup({ onClose }: { onClose: () => void }) {
  const wordCount = useDocumentStore((s) => s.wordCount);
  const charCount = useDocumentStore((s) => s.charCount);
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
      className="absolute bottom-full left-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-xl p-3 z-50"
      style={{ width: 200 }}
    >
      <p className="text-[12px] font-medium text-gray-700 mb-2">
        Статистика
      </p>
      <div className="space-y-1 text-[11px] text-gray-600">
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
          <span className="font-medium">
            {charCount - (wordCount > 0 ? wordCount - 1 : 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;

export default function StatusBar() {
  const pageCount = useDocumentStore((s) => s.pageCount);
  const currentPage = useDocumentStore((s) => s.currentPage);
  const wordCount = useDocumentStore((s) => s.wordCount);
  const zoom = useUIStore((s) => s.zoom);
  const setZoom = useUIStore((s) => s.setZoom);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const [showWordCount, setShowWordCount] = useState(false);
  const zoomBarRef = useRef<HTMLDivElement>(null);

  const zoomFromClientX = useCallback(
    (clientX: number) => {
      const bar = zoomBarRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setZoom(Math.round(ZOOM_MIN + pct * (ZOOM_MAX - ZOOM_MIN)));
    },
    [setZoom],
  );

  const onZoomBarMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      zoomFromClientX(e.clientX);
      const move = (ev: MouseEvent) => zoomFromClientX(ev.clientX);
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    },
    [zoomFromClientX],
  );

  return (
    <div
      className="flex items-center justify-between min-h-[28px] py-0.5 px-3 shrink-0 select-none gap-2"
      style={{
        background: "#F3F3F3",
        borderTop: "1px solid #D1D1D1",
      }}
    >
      {/* Left side */}
      <div className="flex items-center gap-4 text-[11px] text-gray-600">
        <span>
          Страница {currentPage} из {pageCount}
        </span>
        <div className="relative">
          <span
            className="cursor-pointer hover:text-gray-900"
            onClick={() => setShowWordCount(!showWordCount)}
          >
            Число слов: {wordCount}
          </span>
          {showWordCount && (
            <WordCountPopup onClose={() => setShowWordCount(false)} />
          )}
        </div>
        <span className="text-gray-400 hidden sm:inline" title="Язык проверки орфографии (скоро)">
          Русский
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {/* View mode icons */}
        <div className="flex items-center gap-0.5 mr-1 sm:mr-3">
          <ViewModeBtn
            mode="preview"
            current={viewMode}
            setMode={setViewMode}
            icon={BookOpen}
            title="Предпросмотр экспорта (без редактирования)"
          />
          <ViewModeBtn
            mode="edit"
            current={viewMode}
            setMode={setViewMode}
            icon={FileText}
            title="Обычное редактирование с разметкой страницы"
          />
          <Tooltip content="Режим веб-документа в разработке">
            <button
              type="button"
              className="p-0.5 rounded hover:bg-gray-200 text-gray-400 cursor-not-allowed opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-word-blue/35 focus-visible:ring-offset-1"
              aria-disabled
              onClick={(e) => e.preventDefault()}
            >
              <Monitor size={13} />
            </button>
          </Tooltip>
        </div>

        {/* Zoom controls */}
        <Tooltip content="Уменьшить масштаб страницы">
          <button
            type="button"
            onClick={() => setZoom(zoom - 10)}
            className="p-0.5 rounded hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-word-blue/35 focus-visible:ring-offset-1"
            aria-label="Уменьшить масштаб"
          >
            <Minus size={12} className="text-gray-500" />
          </button>
        </Tooltip>

        <Tooltip
          content={
            <span>
              Масштаб {zoom}%. Удерживайте Ctrl (⌘) и крутите колёсико мыши над страницей — быстрее.
            </span>
          }
        >
          <div
            ref={zoomBarRef}
            role="slider"
            aria-valuemin={ZOOM_MIN}
            aria-valuemax={ZOOM_MAX}
            aria-valuenow={zoom}
            aria-label="Масштаб документа"
            className="relative w-[72px] sm:w-[100px] h-5 flex items-center cursor-pointer group"
            onMouseDown={onZoomBarMouseDown}
          >
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-gray-300 rounded-full group-hover:bg-gray-400/90 transition-colors" />
            <div
              className="absolute top-1/2 h-2.5 w-2.5 bg-gray-600 rounded-full -translate-y-1/2 -translate-x-1/2 shadow-sm pointer-events-none ring-1 ring-white/80 group-hover:bg-gray-700 group-hover:scale-110 transition-transform"
              style={{
                left: `${((zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100}%`,
              }}
            />
          </div>
        </Tooltip>

        <Tooltip content="Увеличить масштаб страницы">
          <button
            type="button"
            onClick={() => setZoom(zoom + 10)}
            className="p-0.5 rounded hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-word-blue/35 focus-visible:ring-offset-1"
            aria-label="Увеличить масштаб"
          >
            <Plus size={12} className="text-gray-500" />
          </button>
        </Tooltip>

        <span className="text-[11px] text-gray-600 min-w-[38px] text-right tabular-nums">
          {zoom}%
        </span>
      </div>
    </div>
  );
}

function ViewModeBtn({
  mode,
  current,
  setMode,
  icon: Icon,
  title,
}: {
  mode: ViewMode;
  current: ViewMode;
  setMode: (m: ViewMode) => void;
  icon: React.ElementType;
  title: string;
}) {
  const active = mode === current;
  return (
    <Tooltip content={title}>
      <button
        type="button"
        className={`p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-word-blue/35 focus-visible:ring-offset-1 ${
          active ? "bg-gray-200" : "hover:bg-gray-200"
        }`}
        aria-pressed={active}
        aria-label={title}
        onClick={() => setMode(mode)}
      >
        <Icon size={13} className={active ? "text-gray-600" : "text-gray-400"} />
      </button>
    </Tooltip>
  );
}
