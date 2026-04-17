import { create } from "zustand";
import type { ChatStatus } from "ai";
import type { PersistedAiChatsV1, AiChatSessionMeta } from "@/lib/ai-chat-persistence";
import { MAX_AI_CHAT_SESSIONS, trimSessionsToMax } from "@/lib/ai-chat-persistence";
import { randomUUID } from "@/lib/randomUuid";

export type { AiChatSessionMeta };

function newSessionMeta(): AiChatSessionMeta {
  const id = randomUUID();
  const now = new Date().toISOString();
  return {
    id,
    title: "Новый чат",
    createdAt: now,
    updatedAt: now,
  };
}

type AiChatSessionState = {
  projectId: string | null;
  hydrated: boolean;
  sessions: AiChatSessionMeta[];
  activeSessionId: string | null;
  /** Ephemeral — not persisted */
  sessionStatus: Record<string, ChatStatus>;

  setProjectId: (projectId: string | null) => void;
  /** Replace state from IndexedDB (or null → one empty session) */
  hydrate: (data: PersistedAiChatsV1 | null) => void;
  createSession: () => string;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  updateSession: (id: string, patch: Partial<AiChatSessionMeta>) => void;
  touchSession: (id: string) => void;
  setSessionStatus: (id: string, status: ChatStatus) => void;
  /** Snapshot for persistence */
  buildPersistedPayload: (
    messagesBySessionId: Record<string, PersistedAiChatsV1["messagesBySessionId"][string]>,
  ) => PersistedAiChatsV1 | null;
};

export const useAiChatSessionStore = create<AiChatSessionState>((set, get) => ({
  projectId: null,
  hydrated: false,
  sessions: [],
  activeSessionId: null,
  sessionStatus: {},

  setProjectId: (projectId) => set({ projectId, hydrated: false }),

  hydrate: (data) => {
    if (!data) {
      const m = newSessionMeta();
      set({
        hydrated: true,
        sessions: [m],
        activeSessionId: m.id,
        sessionStatus: {},
      });
      return;
    }
    const trimmed = trimSessionsToMax(data, MAX_AI_CHAT_SESSIONS);
    set({
      hydrated: true,
      sessions: trimmed.sessions,
      activeSessionId: trimmed.activeSessionId,
      sessionStatus: {},
    });
  },

  createSession: () => {
    const m = newSessionMeta();
    set((s) => {
      const combined: PersistedAiChatsV1 = {
        version: 1,
        activeSessionId: m.id,
        sessions: [m, ...s.sessions],
        messagesBySessionId: {},
      };
      const trimmed = trimSessionsToMax(combined, MAX_AI_CHAT_SESSIONS);
      return {
        sessions: trimmed.sessions,
        activeSessionId: m.id,
      };
    });
    return m.id;
  },

  deleteSession: (id) => {
    set((s) => {
      const sessions = s.sessions.filter((x) => x.id !== id);
      const sessionStatus = { ...s.sessionStatus };
      delete sessionStatus[id];
      if (sessions.length === 0) {
        const m = newSessionMeta();
        return {
          sessions: [m],
          activeSessionId: m.id,
          sessionStatus,
        };
      }
      let activeSessionId = s.activeSessionId;
      if (activeSessionId === id) {
        activeSessionId = sessions[0].id;
      }
      return { sessions, activeSessionId, sessionStatus };
    });
  },

  setActiveSession: (id) => set({ activeSessionId: id }),

  updateSession: (id, patch) => {
    set((s) => ({
      sessions: s.sessions.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    }));
  },

  touchSession: (id) => {
    const now = new Date().toISOString();
    get().updateSession(id, { updatedAt: now });
  },

  setSessionStatus: (id, status) => {
    set((s) => ({
      sessionStatus: { ...s.sessionStatus, [id]: status },
    }));
  },

  buildPersistedPayload: (messagesBySessionId) => {
    const { projectId, activeSessionId, sessions } = get();
    if (!projectId || !activeSessionId) return null;
    return trimSessionsToMax(
      {
        version: 1,
        activeSessionId,
        sessions,
        messagesBySessionId,
      },
      MAX_AI_CHAT_SESSIONS,
    );
  },
}));
