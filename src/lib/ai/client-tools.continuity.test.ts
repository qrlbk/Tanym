import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import { executeToolCall } from "./client-tools";
import { usePlotStoryStore, type ContinuityFixSuggestion } from "@/stores/plotStoryStore";
import { useProjectStore } from "@/stores/projectStore";

vi.mock("@/lib/plot-index/plot-extract-client", () => ({
  fetchPlotExtraction: vi.fn(async () => ({
    facts: [],
    relations: [],
    salientObjects: [],
  })),
  fetchPlotExtractionForChunks: vi.fn(async () => ({
    facts: [],
    relations: [],
    salientObjects: [],
  })),
}));

function makeEditorWithMap(textMap: Record<string, string>): Editor {
  const tr = {
    insertText: vi.fn(),
  };
  const editor = {
    state: {
      doc: {
        content: { size: 200 },
        textContent: "door is open",
        textBetween: vi.fn((from: number, to: number) => {
          const key = `${from}-${to}`;
          if (key in textMap) return textMap[key];
          return "";
        }),
      },
      tr,
    },
    view: {
      dispatch: vi.fn(),
    },
  };
  return editor as unknown as Editor;
}

function putSuggestion(warningKey: string, suggestion: ContinuityFixSuggestion): void {
  const store = usePlotStoryStore.getState();
  store.setFixSuggestions(warningKey, [suggestion]);
  store.setFixPreview(warningKey, suggestion);
}

describe("continuity apply safety", () => {
  beforeEach(() => {
    usePlotStoryStore.getState().resetStory();
    useProjectStore.getState().resetProject();
  });

  it("blocks apply_continuity_fix when called from AI tool chain", async () => {
    const warningKey = "w-ai";
    putSuggestion(warningKey, {
      id: "w-ai:minimal",
      warningKey,
      title: "Точечная замена",
      strategy: "minimal",
      editKind: "replace",
      locatorStrategy: "exact_target",
      spanFingerprint: "fp-w-ai",
      targetChunkId: "c-1",
      replaceFrom: 10,
      replaceTo: 16,
      windowFromHint: 1,
      windowToHint: 100,
      contextBefore: "door is ",
      contextAfter: "",
      expectedCurrentText: "open",
      replacementText: "locked",
      beforeText: "door is open",
      afterText: "door is locked",
      reason: "canonical state",
    });

    const result = await executeToolCall(
      "apply_continuity_fix",
      { warningKey, suggestionId: "w-ai:minimal" },
      makeEditorWithMap({ "10-16": "open" }),
      undefined,
      undefined,
      "ai",
    );
    expect(String(result)).toContain("manual-only");
  });

  it("marks suggestion as stale when target slice changed", async () => {
    const warningKey = "w-stale";
    putSuggestion(warningKey, {
      id: "w-stale:minimal",
      warningKey,
      title: "Точечная замена",
      strategy: "minimal",
      editKind: "replace",
      locatorStrategy: "exact_target",
      spanFingerprint: "fp-w-stale",
      targetChunkId: "c-1",
      replaceFrom: 10,
      replaceTo: 14,
      windowFromHint: 1,
      windowToHint: 100,
      contextBefore: "door ",
      contextAfter: "",
      expectedCurrentText: "open",
      replacementText: "lock",
      beforeText: "door open",
      afterText: "door lock",
      reason: "canonical state",
    });

    const result = await executeToolCall(
      "apply_continuity_fix",
      { warningKey, suggestionId: "w-stale:minimal" },
      makeEditorWithMap({
        "10-14": "wide",
      }),
      undefined,
      undefined,
      "ui",
    );
    expect(String(result)).toContain("stale replace range");

    const applyState = usePlotStoryStore.getState().fixApplyStateByWarningKey[warningKey];
    expect(applyState.rangeValidation).toBe("stale");
    expect(applyState.error).toContain("Пересоздайте предложение");
  });

  it("applies a valid suggestion and marks awaiting_recheck", async () => {
    const warningKey = "w-ok";
    putSuggestion(warningKey, {
      id: "w-ok:minimal",
      warningKey,
      title: "Точечная замена",
      strategy: "minimal",
      editKind: "replace",
      locatorStrategy: "exact_target",
      spanFingerprint: "fp-w-ok",
      targetChunkId: "c-1",
      replaceFrom: 10,
      replaceTo: 14,
      windowFromHint: 1,
      windowToHint: 100,
      contextBefore: "door ",
      contextAfter: "",
      expectedCurrentText: "open",
      replacementText: "lock",
      beforeText: "door open",
      afterText: "door lock",
      reason: "canonical state",
    });
    usePlotStoryStore.setState({
      consistencyWarnings: [
        {
          id: "w1",
          key: warningKey,
          kind: "fact_conflict",
          source: "fact_merge",
          confidence: 0.9,
          message: "door state conflict",
          entity: "door",
          attribute: "state",
          previousValue: "lock",
          newValue: "open",
          previousChunkIds: ["c-1"],
          newChunkIds: ["c-1"],
        },
      ],
    });

    const editor = makeEditorWithMap({ "10-14": "open" });
    const result = await executeToolCall(
      "apply_continuity_fix",
      { warningKey, suggestionId: "w-ok:minimal" },
      editor,
      undefined,
      undefined,
      "ui",
    );
    expect(String(result)).toContain("\"ok\":true");
    const tr = (editor.state as unknown as { tr: { insertText: ReturnType<typeof vi.fn> } }).tr;
    expect(tr.insertText).toHaveBeenCalledWith("lock", 10, 14);
    const applyState = usePlotStoryStore.getState().fixApplyStateByWarningKey[warningKey];
    expect(applyState.verificationState).toBe("verified_resolved");
  });
});
