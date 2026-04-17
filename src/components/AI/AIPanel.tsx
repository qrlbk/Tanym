"use client";

/**
 * TODO (roadmap фаза 4 → «Разбиение god-компонентов»).
 *
 * Целевая структура:
 *   AI/
 *     AIPanel.tsx              (shell + режимы — < 200 строк)
 *     ChatView.tsx             (список сообщений + composer)
 *     QuickCommandsBar.tsx
 *     SessionSidebar.tsx       (история чатов)
 *     hooks/
 *       useAIComposer.ts
 *       useActiveSession.ts
 *
 * Пока не декомпозировано: streaming-чат без визуального e2e рискован.
 * Перед разбиением — поднять smoke-тест на реальном провайдере
 * (моки /api/ai/chat) и только потом распиливать.
 */

import {
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useState,
  useMemo,
} from "react";
import { DefaultChatTransport } from "ai";
import type { ChatStatus, UIMessage } from "ai";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { useAIStore } from "@/stores/aiStore";
import { buildEditorContextPayload } from "@/lib/ai/editor-context";
import { buildCharacterContextSummary } from "@/lib/ai/character-context";
import { buildProjectContextFromStores } from "@/lib/ai/project-context";
import { useProjectStore } from "@/stores/projectStore";
import { usePlotStoryStore } from "@/stores/plotStoryStore";
import { useUIStore } from "@/stores/uiStore";
import { PROVIDERS } from "@/lib/ai/providers";
import {
  X,
  Sparkles,
  Settings2,
  Trash2,
  Loader2,
  MessageSquarePlus,
  History,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { formatShortcut, getPrimaryModifierLabel } from "@/lib/platform";
import { THEME, UI_COLORS } from "@/lib/theme/colors";
import { useAiChatSessionStore } from "@/stores/aiChatSessionStore";
import { loadAiChats, saveAiChats } from "@/lib/ai-chat-persistence";
import {
  AIChatSessionWorker,
  type ChatHandlerEntry,
} from "@/components/AI/AIChatSessionWorker";
import {
  getTextFromAssistantMessage,
  getTextFromUserMessage,
} from "@/lib/ai/chat-message-utils";

const EMPTY_CHAT_MESSAGES: UIMessage[] = [];

export default function AIPanel({
  embedded = false,
  forceOpen = false,
}: {
  embedded?: boolean;
  forceOpen?: boolean;
}) {
  const panelOpen = useAIStore((s) => s.panelOpen);
  const setPanelOpen = useAIStore((s) => s.setPanelOpen);
  const togglePanel = useAIStore((s) => s.togglePanel);
  const providerId = useAIStore((s) => s.providerId);
  const setProviderId = useAIStore((s) => s.setProviderId);
  const aiMode = useAIStore((s) => s.mode);
  const setAiMode = useAIStore((s) => s.setMode);
  const pendingConfirmation = useAIStore((s) => s.pendingConfirmation);
  const setPendingConfirmation = useAIStore((s) => s.setPendingConfirmation);
  const focusedCharacterId = useAIStore((s) => s.focusedCharacterId);
  const setFocusedCharacterId = useAIStore((s) => s.setFocusedCharacterId);
  const focusedName = useProjectStore((s) => {
    if (!focusedCharacterId || !s.project) return null;
    return (
      s.project.characterProfiles.find((c) => c.id === focusedCharacterId)?.displayName ?? null
    );
  });
  const project = useProjectStore((s) => s.project);
  const persistKey = project?.id ?? "__no_project__";

  const sessions = useAiChatSessionStore((s) => s.sessions);
  const activeSessionId = useAiChatSessionStore((s) => s.activeSessionId);
  const hydrate = useAiChatSessionStore((s) => s.hydrate);
  const setProjectIdStore = useAiChatSessionStore((s) => s.setProjectId);
  const createSession = useAiChatSessionStore((s) => s.createSession);
  const deleteSession = useAiChatSessionStore((s) => s.deleteSession);
  const setActiveSession = useAiChatSessionStore((s) => s.setActiveSession);
  const sessionStatus = useAiChatSessionStore((s) => s.sessionStatus);
  const updateSession = useAiChatSessionStore((s) => s.updateSession);

  const editor = useEditorContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showHistorySidebar, setShowHistorySidebar] = useState(!embedded);
  const [bootReady, setBootReady] = useState(false);
  const [bootMessages, setBootMessages] = useState<Record<string, UIMessage[]> | null>(null);
  const modLabel = getPrimaryModifierLabel();

  const editorRef = useRef(editor);
  useLayoutEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const messagesBySessionRef = useRef<Record<string, UIMessage[]>>({});
  const chatHandlersRef = useRef<Map<string, ChatHandlerEntry>>(new Map());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRequestedRef = useRef(new Set<string>());

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const payload = useAiChatSessionStore
        .getState()
        .buildPersistedPayload(messagesBySessionRef.current);
      if (payload) void saveAiChats(persistKey, payload);
    }, 420);
  }, [persistKey]);

  const onMessagesSnapshot = useCallback(
    (id: string, msgs: UIMessage[]) => {
      messagesBySessionRef.current[id] = msgs;
      scheduleSave();
    },
    [scheduleSave],
  );

  const onStatus = useCallback((id: string, status: ChatStatus) => {
    useAiChatSessionStore.getState().setSessionStatus(id, status);
  }, []);

  const onAssistantRoundFinished = useCallback(
    async (sessionId: string, msgs: UIMessage[]) => {
      const meta = useAiChatSessionStore.getState().sessions.find((s) => s.id === sessionId);
      if (!meta || meta.titleGenerated) return;
      const users = msgs.filter((m) => m.role === "user");
      const assistants = msgs.filter((m) => m.role === "assistant");
      if (users.length === 0 || assistants.length === 0) return;
      if (titleRequestedRef.current.has(sessionId)) return;
      titleRequestedRef.current.add(sessionId);
      const firstUserText = getTextFromUserMessage(users[0]);
      const assistantPreview = getTextFromAssistantMessage(assistants[assistants.length - 1]);
      try {
        const res = await fetch("/api/ai/chat-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerId: useAIStore.getState().providerId,
            firstUserText,
            assistantPreview,
          }),
        });
        const data = (await res.json()) as { title?: string };
        if (data.title && typeof data.title === "string") {
          updateSession(sessionId, { title: data.title, titleGenerated: true });
        } else {
          titleRequestedRef.current.delete(sessionId);
        }
      } catch {
        titleRequestedRef.current.delete(sessionId);
      }
    },
    [updateSession],
  );

  useEffect(() => {
    setProjectIdStore(persistKey);
    setBootReady(false);
    let cancelled = false;
    void loadAiChats(persistKey).then((data) => {
      if (cancelled) return;
      hydrate(data);
      const next = { ...(data?.messagesBySessionId ?? {}) };
      messagesBySessionRef.current = next;
      setBootMessages(next);
      setBootReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [persistKey, hydrate, setProjectIdStore]);

  useEffect(() => {
    const ids = new Set(sessions.map((s) => s.id));
    for (const k of Object.keys(messagesBySessionRef.current)) {
      if (!ids.has(k)) delete messagesBySessionRef.current[k];
    }
  }, [sessions]);

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        prepareSendMessagesRequest: async ({
          body,
          id,
          messages: reqMessages,
          trigger,
          messageId,
        }) => {
          const focusedId = useAIStore.getState().focusedCharacterId;
          const proj = useProjectStore.getState().project;
          const prof =
            focusedId && proj?.characterProfiles.find((c) => c.id === focusedId);
          const facts = usePlotStoryStore.getState().facts;
          const characterContext =
            prof ? buildCharacterContextSummary(prof, facts) : null;
          const activeSceneId = useUIStore.getState().activeSceneId;
          const projectContext = buildProjectContextFromStores(
            proj,
            activeSceneId,
            editorRef.current,
          );
          return {
            body: {
              ...(body && typeof body === "object" ? body : {}),
              id,
              messages: reqMessages,
              trigger,
              messageId,
              providerId: useAIStore.getState().providerId,
              editorContext: buildEditorContextPayload(editorRef.current),
              characterContext,
              projectContext,
            },
          };
        },
      }),
    [],
  );

  const confirmReplaceDocument = useCallback(() => {
    const pending = useAIStore.getState().pendingConfirmation;
    const ed = editorRef.current;
    if (!pending || pending.toolName !== "set_document_content" || !ed) {
      setPendingConfirmation(null);
      return;
    }
    ed.commands.setContent(pending.args.html as string);
    const h = chatHandlersRef.current.get(pending.sessionId);
    h?.addToolResult({
      toolCallId: pending.toolCallId,
      tool: pending.toolName,
      output: "Document content replaced successfully.",
    });
    setPendingConfirmation(null);
  }, [setPendingConfirmation]);

  const cancelReplaceDocument = useCallback(() => {
    const pending = useAIStore.getState().pendingConfirmation;
    if (!pending) return;
    const h = chatHandlersRef.current.get(pending.sessionId);
    h?.addToolResult({
      toolCallId: pending.toolCallId,
      tool: pending.toolName,
      output:
        "Пользователь отменил замену всего документа. Документ не изменён.",
    });
    setPendingConfirmation(null);
  }, [setPendingConfirmation]);

  const clearChat = useCallback(() => {
    if (!activeSessionId) return;
    const h = chatHandlersRef.current.get(activeSessionId);
    h?.setMessages([]);
    h?.clearError();
  }, [activeSessionId]);

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

  if (!panelOpen && !forceOpen) return null;

  const activeMeta = sessions.find((s) => s.id === activeSessionId);

  return (
    <div
      className={`relative flex flex-col h-full ${embedded ? "" : "border-l"}`}
      style={{
        background: THEME.surface.cardMuted,
        color: UI_COLORS.storyPanel.textPrimary,
        ...(embedded ? {} : { width: 380, minWidth: 320, borderColor: UI_COLORS.storyPanel.border }),
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b shrink-0"
        style={{
          borderColor: UI_COLORS.storyPanel.border,
          background: `linear-gradient(to right, ${UI_COLORS.storyPanel.headerFrom}, ${UI_COLORS.storyPanel.headerTo})`,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {embedded && (
            <button
              type="button"
              onClick={() => setShowHistorySidebar((v) => !v)}
              className="p-1 rounded shrink-0"
              style={{ color: UI_COLORS.storyPanel.textMuted }}
              title={showHistorySidebar ? "Скрыть историю" : "История чатов"}
            >
              {showHistorySidebar ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>
          )}
          <Sparkles size={16} style={{ color: THEME.accent.primaryBorder }} className="shrink-0" />
          <span
            className="text-sm font-semibold truncate"
            style={{ color: UI_COLORS.storyPanel.textPrimary }}
            title={activeMeta?.title ?? "ИИ Ассистент"}
          >
            {activeMeta?.title ?? "ИИ Ассистент"}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              createSession();
            }}
            className="p-1 rounded"
            style={{ color: UI_COLORS.storyPanel.textMuted }}
            title="Новый чат"
          >
            <MessageSquarePlus size={14} />
          </button>
          <button
            type="button"
            onClick={() => setAiMode(aiMode === "agent" ? "chat" : "agent")}
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{
              color: aiMode === "agent" ? "#fff" : UI_COLORS.storyPanel.textSecondary,
              background:
                aiMode === "agent"
                  ? UI_COLORS.accentPrimaryBg
                  : "transparent",
              border: `1px solid ${
                aiMode === "agent"
                  ? UI_COLORS.accentPrimaryBg
                  : THEME.surface.inputBorder
              }`,
            }}
            title="Режим агента: планирование + подтверждение + выполнение"
          >
            {aiMode === "agent" ? "Агент" : "Чат"}
          </button>
          <button
            type="button"
            onClick={clearChat}
            className="p-1 rounded"
            style={{ color: UI_COLORS.storyPanel.textMuted }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = UI_COLORS.storyPanel.closeHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            title="Очистить чат"
            disabled={!activeSessionId}
          >
            <Trash2 size={14} />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
              style={{ color: UI_COLORS.storyPanel.textSecondary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = UI_COLORS.storyPanel.tabHoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
              title="Выбрать модель"
            >
              <Settings2 size={11} />
              {PROVIDERS.find((p) => p.id === providerId)?.label}
            </button>
            {showModelSelector && (
              <div
                className="absolute right-0 top-full mt-1 rounded-lg shadow-lg z-50 w-[200px] border"
                style={{
                  background: THEME.surface.card,
                  borderColor: THEME.surface.inputBorder,
                }}
              >
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProviderId(p.id);
                      setShowModelSelector(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs border-b last:border-0"
                    style={{
                      borderColor: THEME.surface.inputBorder,
                      background:
                        p.id === providerId ? THEME.accent.subtleBg : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (p.id !== providerId) {
                        e.currentTarget.style.background = THEME.surface.elevated;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (p.id !== providerId) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <div className="font-medium" style={{ color: UI_COLORS.storyPanel.textPrimary }}>
                      {p.label}
                    </div>
                    <div className="text-[10px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                      {p.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {!embedded && (
            <span className="text-[10px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
              {formatShortcut([modLabel, "L"])}
            </span>
          )}
          {!embedded && (
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="p-1 rounded"
              style={{ color: UI_COLORS.storyPanel.textMuted }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = UI_COLORS.storyPanel.closeHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {focusedName && (
        <div
          className="flex items-center justify-between px-3 py-1.5 border-b text-[11px] shrink-0"
          style={{
            borderColor: UI_COLORS.storyPanel.border,
            background: THEME.surface.card,
            color: UI_COLORS.storyPanel.textSecondary,
          }}
        >
          <span className="truncate pr-2">
            Персонаж:{" "}
            <span style={{ color: UI_COLORS.storyPanel.textPrimary }}>{focusedName}</span>
          </span>
          <button
            type="button"
            onClick={() => setFocusedCharacterId(null)}
            className="shrink-0 underline underline-offset-2"
            style={{ color: THEME.accent.primaryBorder }}
          >
            Сбросить
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 flex-row">
        {showHistorySidebar && (
          <div
            className="w-[124px] shrink-0 border-r overflow-y-auto py-1 px-1 flex flex-col gap-0.5"
            style={{
              borderColor: UI_COLORS.storyPanel.border,
              background: THEME.surface.card,
            }}
          >
            <div
              className="text-[9px] uppercase tracking-wide px-1.5 py-1 flex items-center gap-1"
              style={{ color: UI_COLORS.storyPanel.textMuted }}
            >
              <History size={10} />
              Чаты
            </div>
            {sessions.map((s) => {
              const st = sessionStatus[s.id];
              const busy = st === "submitted" || st === "streaming";
              const isSel = s.id === activeSessionId;
              return (
                <div key={s.id} className="flex items-center gap-0.5 group">
                  <button
                    type="button"
                    onClick={() => setActiveSession(s.id)}
                    className="flex-1 min-w-0 text-left text-[10px] px-1.5 py-1 rounded truncate flex items-center gap-1"
                    style={{
                      background: isSel ? THEME.accent.subtleBg : "transparent",
                      color: UI_COLORS.storyPanel.textPrimary,
                      border: isSel ? `1px solid ${THEME.accent.primaryBorder}` : "1px solid transparent",
                    }}
                    title={s.title}
                  >
                    {busy && (
                      <Loader2 size={10} className="animate-spin shrink-0" style={{ color: THEME.accent.primaryBorder }} />
                    )}
                    <span className="truncate">{s.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[9px]"
                    style={{ color: UI_COLORS.storyPanel.textMuted }}
                    title="Удалить"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          {!bootReady || !bootMessages ? (
            <div
              className="flex-1 flex items-center justify-center gap-2 text-xs"
              style={{ color: UI_COLORS.storyPanel.textMuted }}
            >
              <Loader2 size={16} className="animate-spin" />
              Загрузка…
            </div>
          ) : (
            <>
              {sessions.map((s) => (
                <AIChatSessionWorker
                  key={`${persistKey}-${s.id}`}
                  sessionId={s.id}
                  isActive={s.id === activeSessionId}
                  initialMessages={bootMessages[s.id] ?? EMPTY_CHAT_MESSAGES}
                  transport={chatTransport}
                  editorRef={editorRef}
                  chatHandlersRef={chatHandlersRef}
                  messagesEndRef={messagesEndRef}
                  onMessagesSnapshot={onMessagesSnapshot}
                  onStatus={onStatus}
                  onAssistantRoundFinished={onAssistantRoundFinished}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {pendingConfirmation?.toolName === "set_document_content" &&
        pendingConfirmation.sessionId === activeSessionId && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div
            className="rounded-lg shadow-xl border max-w-sm w-full p-4 space-y-3"
            style={{
              background: THEME.surface.card,
              borderColor: THEME.surface.inputBorder,
            }}
          >
            <p className="text-sm font-semibold" style={{ color: UI_COLORS.storyPanel.textPrimary }}>
              Заменить весь документ?
            </p>
            <p className="text-xs leading-relaxed" style={{ color: UI_COLORS.storyPanel.textSecondary }}>
              Текущее содержимое будет полностью удалено и заменено новым HTML.
              Это действие нельзя отменить через ИИ.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={cancelReplaceDocument}
                className="px-3 py-1.5 text-xs rounded-md border"
                style={{
                  borderColor: THEME.surface.inputBorder,
                  color: UI_COLORS.storyPanel.textSecondary,
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmReplaceDocument}
                className="px-3 py-1.5 text-xs rounded-md text-white"
                style={{ background: THEME.danger.text }}
              >
                Заменить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
