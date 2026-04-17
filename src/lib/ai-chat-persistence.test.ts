import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { trimSessionsToMax, AI_CHATS_PERSIST_VERSION } from "@/lib/ai-chat-persistence";

function makeState(args: {
  sessions: { id: string; updatedAt: string }[];
  activeId: string;
  messages?: Record<string, UIMessage[]>;
}) {
  return {
    version: AI_CHATS_PERSIST_VERSION,
    activeSessionId: args.activeId,
    sessions: args.sessions.map((s) => ({
      id: s.id,
      title: s.id,
      createdAt: s.updatedAt,
      updatedAt: s.updatedAt,
    })),
    messagesBySessionId: args.messages ?? {},
  };
}

describe("trimSessionsToMax", () => {
  it("leaves data unchanged when under max", () => {
    const data = makeState({
      sessions: [
        { id: "a", updatedAt: "2020-01-01T00:00:00.000Z" },
        { id: "b", updatedAt: "2020-01-02T00:00:00.000Z" },
      ],
      activeId: "b",
    });
    const out = trimSessionsToMax(data, 50);
    expect(out.sessions).toHaveLength(2);
    expect(out.activeSessionId).toBe("b");
  });

  it("drops oldest sessions first, preferring non-active", () => {
    const sessions = [
      { id: "old", updatedAt: "2020-01-01T00:00:00.000Z" },
      { id: "mid", updatedAt: "2020-01-02T00:00:00.000Z" },
      { id: "new", updatedAt: "2020-01-03T00:00:00.000Z" },
    ];
    const data = makeState({
      sessions,
      activeId: "mid",
      messages: {
        old: [],
        mid: [],
        new: [],
      },
    });
    const out = trimSessionsToMax(data, 2);
    expect(out.sessions.map((s) => s.id).sort()).toEqual(["mid", "new"]);
    expect(out.activeSessionId).toBe("mid");
    expect(out.messagesBySessionId.old).toBeUndefined();
    expect(out.messagesBySessionId.mid).toEqual([]);
  });

  it("keeps activeSessionId pointing at a remaining session", () => {
    const data = makeState({
      sessions: [
        { id: "a", updatedAt: "2020-01-01T00:00:00.000Z" },
        { id: "b", updatedAt: "2020-01-02T00:00:00.000Z" },
        { id: "c", updatedAt: "2020-01-03T00:00:00.000Z" },
      ],
      activeId: "a",
    });
    const out = trimSessionsToMax(data, 1);
    expect(out.sessions).toHaveLength(1);
    expect(out.sessions.some((s) => s.id === out.activeSessionId)).toBe(true);
  });
});
