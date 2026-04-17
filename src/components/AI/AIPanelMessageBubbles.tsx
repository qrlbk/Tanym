"use client";

import { useState } from "react";
import type { UIMessage } from "ai";
import {
  Bot,
  User,
  Loader2,
  Wrench,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { THEME, UI_COLORS } from "@/lib/theme/colors";

export function MessageBubble({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    const textParts = message.parts.filter((p) => p.type === "text");
    const text = textParts.map((p) => p.text).join("");
    if (!text) return null;

    return (
      <div className="flex gap-2 justify-end">
        <div
          className="rounded-xl rounded-br-sm px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap text-white"
          style={{ background: UI_COLORS.accentPrimaryBg }}
        >
          {text}
        </div>
        <User size={20} className="shrink-0 mt-1" style={{ color: THEME.accent.primaryBorder }} />
      </div>
    );
  }

  if (message.role === "assistant") {
    return (
      <div className="flex gap-2">
        <Bot size={20} className="shrink-0 mt-1" style={{ color: THEME.accent.primaryBorder }} />
        <div className="flex-1 space-y-2">
          {message.parts.map((part, i) => {
            if (part.type === "text" && part.text) {
              return (
                <div
                  key={i}
                  className="rounded-xl rounded-bl-sm px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed"
                  style={{
                    background: THEME.surface.elevated,
                    color: UI_COLORS.storyPanel.textPrimary,
                  }}
                >
                  {part.text}
                </div>
              );
            }

            if (
              part.type === "dynamic-tool" ||
              part.type.startsWith("tool-")
            ) {
              const inv = part as unknown as {
                toolName: string;
                toolCallId: string;
                input?: Record<string, unknown>;
                state: string;
                output?: unknown;
              };
              return (
                <ToolCallCard
                  key={inv.toolCallId || i}
                  toolName={inv.toolName}
                  args={inv.input ?? {}}
                  state={inv.state}
                  result={inv.output}
                />
              );
            }

            return null;
          })}
        </div>
      </div>
    );
  }

  return null;
}

const FRIENDLY_NAMES: Record<string, string> = {
  get_document_stats: "Статистика документа",
  get_plaintext: "Чтение текста",
  get_selection: "Чтение выделения",
  get_outline: "Структура документа",
  get_context_around_cursor: "Контекст у курсора",
  get_section_by_heading: "Секция по заголовку",
  insert_content: "Вставка контента",
  replace_selection: "Замена выделения",
  set_document_content: "Замена документа",
  apply_formatting: "Форматирование",
  find_and_replace: "Найти и заменить",
  set_document_title: "Заголовок документа",
  set_ribbon_tab: "Переключение вкладки",
  set_zoom: "Масштаб",
  toggle_ruler: "Линейка",
  open_find_replace: "Найти и заменить",
  insert_image: "Вставка изображения",
  set_doc_page_style: "Стиль страницы",
  set_table_layout: "Макет таблицы",
  get_story_outline: "Сюжетный outline",
  set_writer_focus_mode: "Режим фокуса",
  jump_to_scene: "Переход к сцене",
  set_continuity_filter: "Фильтр конфликтов",
  set_continuity_warning_status: "Статус конфликта",
  suggest_continuity_fix: "Предложение autofix",
  apply_continuity_fix: "Применение autofix",
};

function ToolCallCard({
  toolName,
  args,
  state,
  result,
}: {
  toolName: string;
  args: Record<string, unknown>;
  state: string;
  result?: unknown;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending = state === "call" || state === "partial-call";

  return (
    <div
      className="border rounded-lg overflow-hidden text-xs"
      style={{
        background: THEME.surface.card,
        borderColor: THEME.surface.inputBorder,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 transition-colors"
        style={{ color: UI_COLORS.storyPanel.textPrimary }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = THEME.surface.elevated;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        {isPending ? (
          <Loader2 size={12} className="animate-spin" style={{ color: THEME.accent.primaryBorder }} />
        ) : (
          <Wrench size={12} style={{ color: THEME.success.text }} />
        )}
        <span className="font-medium">
          {FRIENDLY_NAMES[toolName] || toolName}
        </span>
        <span className="ml-auto">
          {expanded ? (
            <ChevronDown size={12} style={{ color: UI_COLORS.storyPanel.textMuted }} />
          ) : (
            <ChevronRight size={12} style={{ color: UI_COLORS.storyPanel.textMuted }} />
          )}
        </span>
      </button>
      {expanded && (
        <div
          className="px-2.5 pb-2 space-y-1 border-t pt-1.5"
          style={{ borderColor: THEME.surface.inputBorder }}
        >
          {Object.keys(args).length > 0 && (
            <div>
              <span style={{ color: UI_COLORS.storyPanel.textMuted }}>Параметры:</span>
              <pre
                className="text-[10px] rounded p-1.5 mt-0.5 overflow-x-auto max-h-[100px]"
                style={{
                  color: UI_COLORS.storyPanel.textSecondary,
                  background: THEME.surface.input,
                }}
              >
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {result !== undefined && (
            <div>
              <span style={{ color: UI_COLORS.storyPanel.textMuted }}>Результат:</span>
              <pre
                className="text-[10px] rounded p-1.5 mt-0.5 overflow-x-auto max-h-[100px]"
                style={{
                  color: UI_COLORS.storyPanel.textSecondary,
                  background: THEME.surface.input,
                }}
              >
                {typeof result === "string"
                  ? result.slice(0, 500)
                  : JSON.stringify(result, null, 2)?.slice(0, 500)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
