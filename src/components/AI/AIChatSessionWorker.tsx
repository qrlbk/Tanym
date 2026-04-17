"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import type { ChatStatus, DefaultChatTransport, UIMessage } from "ai";
import type { Editor } from "@tiptap/react";
import { useAiChatSessionStore } from "@/stores/aiChatSessionStore";
import {
  executeToolCall,
  isDeferredToolResult,
} from "@/lib/ai/client-tools";
import { MessageBubble } from "@/components/AI/AIPanelMessageBubbles";
import {
  Send,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { QUICK_COMMANDS } from "@/lib/ai/system-prompt";
import { THEME, UI_COLORS } from "@/lib/theme/colors";
import { useAIStore } from "@/stores/aiStore";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { buildProjectContextFromStores } from "@/lib/ai/project-context";
import { fetchPlan, planToExecutionInstruction } from "@/lib/ai/plan-client";

export type ChatHandlerEntry = {
  addToolResult: (o: {
    toolCallId: string;
    tool: string;
    output: unknown;
  }) => void;
  setMessages: (messages: UIMessage[] | ((m: UIMessage[]) => UIMessage[])) => void;
  clearError: () => void;
};

type AIChatSessionWorkerProps = {
  sessionId: string;
  isActive: boolean;
  initialMessages: UIMessage[];
  transport: DefaultChatTransport<UIMessage>;
  editorRef: React.MutableRefObject<Editor | null>;
  chatHandlersRef: React.MutableRefObject<Map<string, ChatHandlerEntry>>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onMessagesSnapshot: (id: string, messages: UIMessage[]) => void;
  onStatus: (id: string, status: ChatStatus) => void;
  onAssistantRoundFinished: (id: string, messages: UIMessage[]) => void;
};

export function AIChatSessionWorker({
  sessionId,
  isActive,
  initialMessages,
  transport,
  editorRef,
  chatHandlersRef,
  messagesEndRef,
  onMessagesSnapshot,
  onStatus,
  onAssistantRoundFinished,
}: AIChatSessionWorkerProps) {
  const [inputValue, setInputValue] = useState("");
  const [showQuickCommands, setShowQuickCommands] = useState(false);
  const pendingPlan = useAIStore((s) => s.pendingPlan);
  const mode = useAIStore((s) => s.mode);

  const { messages, sendMessage, status, stop, addToolResult, error, clearError, setMessages } =
    useChat({
      id: sessionId,
      messages: initialMessages,
      transport,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      onToolCall: async ({ toolCall }) => {
        const input = "input" in toolCall ? toolCall.input : {};
        const result = await executeToolCall(
          toolCall.toolName,
          input as Record<string, unknown>,
          editorRef.current,
          toolCall.toolCallId,
          sessionId,
          "ai",
        );
        if (isDeferredToolResult(result)) {
          useAiChatSessionStore.getState().setActiveSession(sessionId);
          return;
        }
        void addToolResult({
          toolCallId: toolCall.toolCallId,
          tool: toolCall.toolName,
          output: result,
        });
      },
      onError: (err) => {
        console.error("AI chat error:", err);
      },
      onFinish: ({ messages: nextMessages }) => {
        onAssistantRoundFinished(sessionId, nextMessages);
      },
    });

  useEffect(() => {
    chatHandlersRef.current.set(sessionId, { addToolResult, setMessages, clearError });
    return () => {
      chatHandlersRef.current.delete(sessionId);
    };
  }, [sessionId, addToolResult, setMessages, clearError, chatHandlersRef]);

  useEffect(() => {
    onStatus(sessionId, status);
  }, [sessionId, status, onStatus]);

  useEffect(() => {
    onMessagesSnapshot(sessionId, messages);
  }, [sessionId, messages, onMessagesSnapshot]);

  const isLoading = status === "streaming" || status === "submitted";
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = text ?? inputValue.trim();
      if (!msg || isLoading) return;
      const mode = useAIStore.getState().mode;

      if (mode === "agent") {
        setInputValue("");
        setPlanError(null);
        setPlanning(true);
        try {
          const project = useProjectStore.getState().project;
          const activeSceneId = useUIStore.getState().activeSceneId;
          const projectContext = buildProjectContextFromStores(
            project,
            activeSceneId,
            editorRef.current,
          );
          const plan = await fetchPlan({
            instruction: msg,
            projectContext,
            providerId: useAIStore.getState().providerId,
          });
          useAIStore.getState().setPendingPlan(plan);
        } catch (e) {
          setPlanError(e instanceof Error ? e.message : String(e));
        } finally {
          setPlanning(false);
        }
        return;
      }

      setInputValue("");
      useAiChatSessionStore.getState().touchSession(sessionId);
      sendMessage({ text: msg });
    },
    [inputValue, isLoading, sendMessage, sessionId, editorRef],
  );

  const approvePlan = useCallback(() => {
    const plan = useAIStore.getState().pendingPlan;
    if (!plan) return;
    useAIStore.getState().setPendingPlan(null);
    useAiChatSessionStore.getState().touchSession(sessionId);
    sendMessage({ text: planToExecutionInstruction(plan) });
  }, [sendMessage, sessionId]);

  const rejectPlan = useCallback(() => {
    useAIStore.getState().setPendingPlan(null);
  }, []);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, messagesEndRef]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (isActive) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isActive, sessionId]);

  if (!isActive) {
    return null;
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {mode === "agent" && pendingPlan && (
          <div
            className="rounded-md border p-3 space-y-2"
            style={{
              borderColor: THEME.accent.primaryBorder,
              background: THEME.accent.subtleBg,
            }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: THEME.accent.primaryBorder }}
            >
              План от агента
            </p>
            <p
              className="text-[12px] leading-[1.45]"
              style={{ color: UI_COLORS.storyPanel.textPrimary }}
            >
              {pendingPlan.goal}
            </p>
            {pendingPlan.notes && (
              <p
                className="text-[11px]"
                style={{ color: UI_COLORS.storyPanel.textSecondary }}
              >
                {pendingPlan.notes}
              </p>
            )}
            <ol
              className="list-decimal pl-4 space-y-1 text-[11px]"
              style={{ color: UI_COLORS.storyPanel.textSecondary }}
            >
              {pendingPlan.steps.map((step) => (
                <li key={step.id}>
                  <span style={{ color: UI_COLORS.storyPanel.textPrimary }}>
                    {step.action}
                  </span>
                  {step.sceneRef && (
                    <span className="ml-1 font-mono text-[10px] opacity-70">
                      [{step.sceneRef}]
                    </span>
                  )}
                  <div className="opacity-70">{step.rationale}</div>
                </li>
              ))}
            </ol>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={approvePlan}
                className="px-2.5 py-1 rounded-md text-white text-[11px] font-medium"
                style={{ background: UI_COLORS.accentPrimaryBg }}
              >
                Применить план
              </button>
              <button
                type="button"
                onClick={rejectPlan}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium border"
                style={{
                  borderColor: THEME.surface.inputBorder,
                  color: UI_COLORS.storyPanel.textSecondary,
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
        {planError && (
          <div
            className="rounded-lg border px-3 py-2 text-xs"
            style={{
              borderColor: THEME.danger.border,
              background: THEME.danger.subtleBg,
              color: THEME.danger.text,
            }}
          >
            Не удалось построить план: {planError}
          </div>
        )}
        {error && (
          <div
            className="rounded-lg border px-3 py-2 text-xs"
            style={{
              borderColor: THEME.danger.border,
              background: THEME.danger.subtleBg,
              color: THEME.danger.text,
            }}
          >
            <p className="font-medium">Ошибка запроса</p>
            <p className="mt-1 break-words">{error.message}</p>
            <button
              type="button"
              onClick={() => clearError()}
              className="mt-2 underline underline-offset-2"
              style={{ color: THEME.danger.text }}
            >
              Закрыть
            </button>
          </div>
        )}
        {messages.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-full text-center gap-3 py-8"
            style={{ color: UI_COLORS.storyPanel.textSecondary }}
          >
            <Sparkles size={32} style={{ color: THEME.accent.primaryBorder }} />
            <p className="text-sm leading-relaxed">Спросите что-нибудь или выберите команду</p>
            <div className="grid grid-cols-2 gap-1.5 w-full max-w-[300px]">
              {QUICK_COMMANDS.slice(0, 6).map((cmd) => (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => handleQuickCommand(cmd.prompt)}
                  className="text-[11px] text-left px-2 py-1.5 rounded-md border transition-colors"
                  style={{
                    borderColor: THEME.surface.inputBorder,
                    color: UI_COLORS.storyPanel.textSecondary,
                    background: THEME.surface.card,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = THEME.surface.elevated;
                    e.currentTarget.style.borderColor = THEME.accent.primaryBorder;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = THEME.surface.card;
                    e.currentTarget.style.borderColor = THEME.surface.inputBorder;
                  }}
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

        {(isLoading || planning) && (
          <div
            className="flex items-center gap-2 text-sm pl-7"
            style={{ color: UI_COLORS.storyPanel.textMuted }}
          >
            <Loader2 size={14} className="animate-spin" />
            <span>{planning ? "Составляю план…" : "Думаю..."}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {showQuickCommands && (
        <div
          className="mx-3 mb-1 max-h-[200px] overflow-y-auto rounded-lg shadow-lg border"
          style={{
            background: THEME.surface.card,
            borderColor: THEME.surface.inputBorder,
          }}
        >
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd.id}
              type="button"
              onClick={() => handleQuickCommand(cmd.prompt)}
              className="w-full text-left px-3 py-2 text-sm border-b last:border-0"
              style={{
                borderColor: THEME.surface.inputBorder,
                color: UI_COLORS.storyPanel.textPrimary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = THEME.surface.elevated;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {cmd.label}
            </button>
          ))}
        </div>
      )}

      <div className="border-t p-2" style={{ borderColor: UI_COLORS.storyPanel.border }}>
        <div className="flex items-end gap-1.5">
          <button
            type="button"
            onClick={() => setShowQuickCommands(!showQuickCommands)}
            className="p-1.5 rounded shrink-0 mb-0.5"
            style={{ color: THEME.accent.primaryBorder }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = UI_COLORS.storyPanel.tabHoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            title="Быстрые команды"
          >
            <Sparkles size={16} />
          </button>
          <textarea
            ref={inputRef}
            data-ai-chat-active-input={isActive ? "1" : undefined}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={mode === "agent" ? "Задача для агента…" : "Спросите ИИ..."}
            rows={1}
            className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#A78BFA]/50 focus:border-[#A78BFA] placeholder:text-[#9CA3AF]"
            style={{
              maxHeight: 120,
              minHeight: 36,
              borderColor: THEME.surface.inputBorder,
              background: THEME.surface.input,
              color: UI_COLORS.storyPanel.textPrimary,
              caretColor: UI_COLORS.storyPanel.textPrimary,
            }}
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
    </>
  );
}
