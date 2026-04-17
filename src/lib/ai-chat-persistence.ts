import type { UIMessage } from "ai";
import { idbGetByKey, idbPutByKey } from "@/lib/doc-persistence";

export const AI_CHATS_PERSIST_VERSION = 1 as const;
export const MAX_AI_CHAT_SESSIONS = 50;

const idbKey = (projectId: string) => `ai-chats-v${AI_CHATS_PERSIST_VERSION}-${projectId}`;

export type AiChatSessionMeta = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  /** Set after `/api/ai/chat-title` succeeds */
  titleGenerated?: boolean;
};

export type PersistedAiChatsV1 = {
  version: typeof AI_CHATS_PERSIST_VERSION;
  activeSessionId: string;
  sessions: AiChatSessionMeta[];
  messagesBySessionId: Record<string, UIMessage[]>;
};

export function createEmptyPersistedState(sessionId: string): PersistedAiChatsV1 {
  const now = new Date().toISOString();
  return {
    version: AI_CHATS_PERSIST_VERSION,
    activeSessionId: sessionId,
    sessions: [
      {
        id: sessionId,
        title: "Новый чат",
        createdAt: now,
        updatedAt: now,
      },
    ],
    messagesBySessionId: { [sessionId]: [] },
  };
}

/**
 * Enforce max session count by dropping oldest sessions (by `updatedAt`).
 * Prefers dropping non-active sessions first; may drop active if necessary.
 */
export function trimSessionsToMax(
  data: PersistedAiChatsV1,
  maxSessions: number,
): PersistedAiChatsV1 {
  if (data.sessions.length <= maxSessions) return data;

  const sortedOldestFirst = [...data.sessions].sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
  );
  const toDrop = data.sessions.length - maxSessions;
  const dropIds: string[] = [];
  const activeId = data.activeSessionId;

  for (const s of sortedOldestFirst) {
    if (dropIds.length >= toDrop) break;
    if (s.id !== activeId) dropIds.push(s.id);
  }
  for (const s of sortedOldestFirst) {
    if (dropIds.length >= toDrop) break;
    if (!dropIds.includes(s.id)) dropIds.push(s.id);
  }

  const dropSet = new Set(dropIds);
  const sessions = data.sessions.filter((s) => !dropSet.has(s.id));
  const messagesBySessionId = { ...data.messagesBySessionId };
  for (const id of dropSet) {
    delete messagesBySessionId[id];
  }

  let activeSessionId = data.activeSessionId;
  if (dropSet.has(activeSessionId)) {
    const newest = [...sessions].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0];
    activeSessionId = newest?.id ?? sessions[0]?.id ?? activeSessionId;
  }

  return {
    ...data,
    sessions,
    messagesBySessionId,
    activeSessionId,
  };
}

export async function loadAiChats(
  projectId: string | null,
): Promise<PersistedAiChatsV1 | null> {
  if (!projectId || typeof indexedDB === "undefined") return null;
  try {
    const raw = await idbGetByKey(idbKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAiChatsV1;
    if (parsed?.version !== AI_CHATS_PERSIST_VERSION || !Array.isArray(parsed.sessions)) {
      return null;
    }
    return trimSessionsToMax(parsed, MAX_AI_CHAT_SESSIONS);
  } catch {
    return null;
  }
}

export async function saveAiChats(
  projectId: string | null,
  data: PersistedAiChatsV1,
): Promise<void> {
  if (!projectId || typeof indexedDB === "undefined") return;
  const trimmed = trimSessionsToMax(data, MAX_AI_CHAT_SESSIONS);
  try {
    await idbPutByKey(JSON.stringify(trimmed), idbKey(projectId));
  } catch (e) {
    console.warn("saveAiChats failed:", e);
  }
}
