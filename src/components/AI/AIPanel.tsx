"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import type { UIMessage } from "ai";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { useAIStore } from "@/stores/aiStore";
import { executeToolCall } from "@/lib/ai/client-tools";
import { QUICK_COMMANDS } from "@/lib/ai/system-prompt";
import { PROVIDERS } from "@/lib/ai/providers";
import type { ProviderId } from "@/lib/ai/providers";
import {
  X,
  Send,
  Bot,
  User,
  Loader2,
  Wrench,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Settings2,
} from "lucide-react";

export default function AIPanel() {
  const panelOpen = useAIStore((s) => s.panelOpen);
  const setPanelOpen = useAIStore((s) => s.setPanelOpen);
  const togglePanel = useAIStore((s) => s.togglePanel);
  const providerId = useAIStore((s) => s.providerId);
  const setProviderId = useAIStore((s) => s.setProviderId);
  const editor = useEditorContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [showQuickCommands, setShowQuickCommands] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);

  const editorRef = useRef(editor);
  editorRef.current = editor;

  const { messages, sendMessage, status, stop, addToolResult, error, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      body: { providerId },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: async ({ toolCall }) => {
      const input = "input" in toolCall ? toolCall.input : {};
      const result = await executeToolCall(
        toolCall.toolName,
        input as Record<string, unknown>,
        editorRef.current,
      );
      // Must not await addToolResult: onToolCall runs inside the chat jobExecutor;
      // awaiting would deadlock (queued job waits for the current job to finish).
      void addToolResult({
        toolCallId: toolCall.toolCallId,
        tool: toolCall.toolName,
        output: result,
      });
    },
    onError: (err) => {
      console.error("AI chat error:", err);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "l") {
        e.preventDefault();
        togglePanel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePanel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (panelOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [panelOpen]);

  const handleSend = useCallback(
    (text?: string) => {
      const msg = text ?? inputValue.trim();
      if (!msg || isLoading) return;
      setInputValue("");
      sendMessage({ text: msg });
    },
    [inputValue, isLoading, sendMessage],
  );

  const handleQuickCommand = useCallback(
    (prompt: string) => {
      setShowQuickCommands(false);
      handleSend(prompt);
    },
    [handleSend],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (!panelOpen) return null;

  return (
    <div
      className="flex flex-col h-full border-l border-gray-300 bg-white"
      style={{ width: 380, minWidth: 320 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">
            ИИ Ассистент
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-gray-500 hover:bg-gray-200"
              title="Выбрать модель"
            >
              <Settings2 size={11} />
              {PROVIDERS.find((p) => p.id === providerId)?.label}
            </button>
            {showModelSelector && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-[200px]">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProviderId(p.id);
                      setShowModelSelector(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-100 last:border-0 ${
                      p.id === providerId ? "bg-blue-50 font-medium" : ""
                    }`}
                  >
                    <div className="font-medium text-gray-700">{p.label}</div>
                    <div className="text-gray-400 text-[10px]">{p.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-[10px] text-gray-400">Ctrl+L</span>
          <button
            onClick={() => setPanelOpen(false)}
            className="p-1 rounded hover:bg-gray-200"
          >
            <X size={14} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            <p className="font-medium">Ошибка запроса</p>
            <p className="mt-1 break-words">{error.message}</p>
            <button
              type="button"
              onClick={() => clearError()}
              className="mt-2 text-red-600 underline hover:text-red-800"
            >
              Закрыть
            </button>
          </div>
        )}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3 py-8">
            <Sparkles size={32} className="text-blue-300" />
            <p className="text-sm">Спросите что-нибудь или выберите команду</p>
            <div className="grid grid-cols-2 gap-1.5 w-full max-w-[300px]">
              {QUICK_COMMANDS.slice(0, 6).map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => handleQuickCommand(cmd.prompt)}
                  className="text-[11px] text-left px-2 py-1.5 rounded-md border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-600 transition-colors"
                >
                  {cmd.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm pl-7">
            <Loader2 size={14} className="animate-spin" />
            <span>Думаю...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick commands dropdown */}
      {showQuickCommands && (
        <div className="mx-3 mb-1 max-h-[200px] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => handleQuickCommand(cmd.prompt)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-gray-700 border-b border-gray-100 last:border-0"
            >
              {cmd.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-2">
        <div className="flex items-end gap-1.5">
          <button
            type="button"
            onClick={() => setShowQuickCommands(!showQuickCommands)}
            className="p-1.5 rounded hover:bg-gray-100 shrink-0 mb-0.5"
            title="Быстрые команды"
          >
            <Sparkles size={16} className="text-blue-500" />
          </button>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Спросите ИИ..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
            style={{ maxHeight: 120, minHeight: 36 }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              className="p-1.5 rounded bg-red-500 text-white hover:bg-red-600 shrink-0 mb-0.5"
              title="Остановить"
            >
              <X size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!inputValue.trim()}
              className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 mb-0.5"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    const textParts = message.parts.filter((p) => p.type === "text");
    const text = textParts.map((p) => p.text).join("");
    if (!text) return null;

    return (
      <div className="flex gap-2 justify-end">
        <div className="bg-blue-600 text-white rounded-xl rounded-br-sm px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap">
          {text}
        </div>
        <User size={20} className="text-blue-600 shrink-0 mt-1" />
      </div>
    );
  }

  if (message.role === "assistant") {
    return (
      <div className="flex gap-2">
        <Bot size={20} className="text-purple-600 shrink-0 mt-1" />
        <div className="flex-1 space-y-2">
          {message.parts.map((part, i) => {
            if (part.type === "text" && part.text) {
              return (
                <div
                  key={i}
                  className="bg-gray-100 rounded-xl rounded-bl-sm px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap"
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
    <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-100 transition-colors"
      >
        {isPending ? (
          <Loader2 size={12} className="animate-spin text-blue-500" />
        ) : (
          <Wrench size={12} className="text-green-600" />
        )}
        <span className="font-medium text-gray-700">
          {FRIENDLY_NAMES[toolName] || toolName}
        </span>
        <span className="ml-auto">
          {expanded ? (
            <ChevronDown size={12} className="text-gray-400" />
          ) : (
            <ChevronRight size={12} className="text-gray-400" />
          )}
        </span>
      </button>
      {expanded && (
        <div className="px-2.5 pb-2 space-y-1 border-t border-gray-200 pt-1.5">
          {Object.keys(args).length > 0 && (
            <div>
              <span className="text-gray-400">Параметры:</span>
              <pre className="text-[10px] text-gray-600 bg-white rounded p-1.5 mt-0.5 overflow-x-auto max-h-[100px]">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {result !== undefined && (
            <div>
              <span className="text-gray-400">Результат:</span>
              <pre className="text-[10px] text-gray-600 bg-white rounded p-1.5 mt-0.5 overflow-x-auto max-h-[100px]">
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
