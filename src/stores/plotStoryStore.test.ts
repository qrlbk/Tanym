import { beforeEach, describe, expect, it } from "vitest";
import { getWarningSemanticFingerprint, usePlotStoryStore } from "./plotStoryStore";
import type { ContinuityFixSuggestion } from "./plotStoryStore";
import type { PlotChunk } from "@/lib/plot-index/chunks";

describe("plotStoryStore autofix lifecycle", () => {
  beforeEach(() => {
    usePlotStoryStore.getState().resetStory();
  });

  it("stores suggestions and preview, then marks applied", () => {
    const store = usePlotStoryStore.getState();
    const warningKey = "arthur|arm/injured->healthy";
    const suggestion: ContinuityFixSuggestion = {
      id: `${warningKey}:minimal`,
      warningKey,
      title: "Minimal change",
      strategy: "minimal",
      editKind: "replace",
      locatorStrategy: "exact_target",
      spanFingerprint: "fp-1",
      targetChunkId: "c-0-s-2-p0",
      replaceFrom: 10,
      replaceTo: 16,
      windowFromHint: 1,
      windowToHint: 80,
      contextBefore: "Arthur is ",
      contextAfter: " and runs",
      expectedCurrentText: "healthy",
      replacementText: "injured",
      beforeText: "Arthur is healthy",
      afterText: "Arthur is injured",
      reason: "Restore canonical fact",
    };

    store.setFixSuggestions(warningKey, [suggestion]);
    store.setFixPreview(warningKey, suggestion);
    store.setFixApplying(warningKey);
    store.setFixApplied(warningKey, suggestion.id);

    const next = usePlotStoryStore.getState();
    expect(next.fixSuggestionsByWarningKey[warningKey].length).toBe(1);
    expect(next.fixPreviewByWarningKey[warningKey]?.id).toBe(suggestion.id);
    expect(next.fixApplyStateByWarningKey[warningKey].loading).toBe(false);
    expect(next.fixApplyStateByWarningKey[warningKey].lastAppliedSuggestionId).toBe(
      suggestion.id,
    );
    expect(next.warningStatuses[warningKey]).toBe("acknowledged");
    expect(next.fixApplyStateByWarningKey[warningKey].verificationState).toBe(
      "awaiting_recheck",
    );
  });

  it("can store apply error and clear state", () => {
    const store = usePlotStoryStore.getState();
    const warningKey = "arthur|speed/slow->fast";
    store.setFixError(warningKey, "failed");
    let next = usePlotStoryStore.getState();
    expect(next.fixApplyStateByWarningKey[warningKey].error).toBe("failed");
    store.clearFixState(warningKey);
    next = usePlotStoryStore.getState();
    expect(next.fixSuggestionsByWarningKey[warningKey]).toEqual([]);
    expect(next.fixPreviewByWarningKey[warningKey]).toBeNull();
    expect(next.fixApplyStateByWarningKey[warningKey].error).toBeNull();
  });

  it("tracks background analysis state updates", () => {
    const store = usePlotStoryStore.getState();
    store.setAnalysisState({
      analysisPhase: "analyzing",
      analysisMessage: "Проверяю сюжет...",
      analysisError: null,
    });
    let next = usePlotStoryStore.getState();
    expect(next.analysisPhase).toBe("analyzing");
    expect(next.analysisMessage).toContain("Проверяю");

    store.setAnalysisState({
      analysisPhase: "ready",
      analysisMessage: "Сюжетная память обновлена",
      lastAnalyzedAt: 123,
    });
    next = usePlotStoryStore.getState();
    expect(next.analysisPhase).toBe("ready");
    expect(next.lastAnalyzedAt).toBe(123);
  });

  it("tracks automatic analysis/reconcile markers", () => {
    const store = usePlotStoryStore.getState();
    store.setAutoState({
      autoBusy: true,
      lastAutoAnalyzeAt: 111,
    });
    let next = usePlotStoryStore.getState();
    expect(next.autoBusy).toBe(true);
    expect(next.lastAutoAnalyzeAt).toBe(111);

    store.setAutoState({
      autoBusy: false,
      lastProjectReconcileAt: 222,
    });
    next = usePlotStoryStore.getState();
    expect(next.autoBusy).toBe(false);
    expect(next.lastProjectReconcileAt).toBe(222);
  });

  it("marks applied warning as resolved only after recheck", () => {
    const store = usePlotStoryStore.getState();
    const warningKey = "arthur|door/locked->open";
    const chunks: PlotChunk[] = [
      {
        id: "c-locked-1",
        text: "Door is open.",
        from: 0,
        to: 12,
        label: "c-locked-1",
        kind: "heading",
        chapterId: "ch-1",
        chapterTitle: "Ch",
        sceneId: "scene-1",
        sceneTitle: "Scene",
        chunkVersion: 2,
        contentHash: "h-locked",
      },
    ];

    store.applyFullExtraction(
      {
        facts: [
          {
            entity: "Arthur",
            entityType: "character",
            entityConfidence: 0.9,
            narrativeRole: null,
            attribute: "door",
            value: "locked",
            chunkIds: ["c-locked-1"],
          },
          {
            entity: "Arthur",
            entityType: "character",
            entityConfidence: 0.9,
            narrativeRole: null,
            attribute: "door",
            value: "open",
            chunkIds: ["c-locked-1"],
          },
        ],
        relations: [],
        salientObjects: [],
      },
      chunks,
    );

    const warning = usePlotStoryStore
      .getState()
      .consistencyWarnings.find((w) => w.key === warningKey);
    store.setFixApplied(
      warningKey,
      `${warningKey}:minimal`,
      warning ? getWarningSemanticFingerprint(warning) : null,
    );
    let next = usePlotStoryStore.getState();
    expect(next.warningStatuses[warningKey]).toBe("acknowledged");
    expect(next.fixApplyStateByWarningKey[warningKey].verificationState).toBe(
      "awaiting_recheck",
    );

    store.applyFullExtraction(
      {
        facts: [],
        relations: [],
        salientObjects: [],
      },
      [],
    );
    next = usePlotStoryStore.getState();
    expect(next.warningStatuses[warningKey]).toBe("resolved");
    expect(next.fixApplyStateByWarningKey[warningKey].verificationState).toBe(
      "verified_resolved",
    );
  });

  it("stores range validation state for stale suggestions", () => {
    const store = usePlotStoryStore.getState();
    const warningKey = "arthur|window/closed->open";
    store.setFixRangeValidation(
      warningKey,
      "stale",
      "Текст изменился после генерации предложения.",
    );
    const next = usePlotStoryStore.getState();
    expect(next.fixApplyStateByWarningKey[warningKey].rangeValidation).toBe("stale");
    expect(next.fixApplyStateByWarningKey[warningKey].note).toContain("Текст изменился");
  });

  it("resets stale state when new suggestions are generated", () => {
    const store = usePlotStoryStore.getState();
    const warningKey = "arthur|lamp/off->on";
    store.setFixRangeValidation(
      warningKey,
      "stale",
      "Старый диапазон устарел.",
    );
    store.setFixError(warningKey, "stale");
    store.setFixSuggestions(warningKey, []);
    const next = usePlotStoryStore.getState();
    expect(next.fixApplyStateByWarningKey[warningKey].rangeValidation).toBe("idle");
    expect(next.fixApplyStateByWarningKey[warningKey].error).toBeNull();
  });

  it("keeps warning acknowledged on recheck when semantic fingerprint still matches", () => {
    const store = usePlotStoryStore.getState();
    const warningKey = "scene|self_contradiction/quiet-loud";
    const warningFingerprint = "fact_conflict|scene|self_contradiction|loud|quiet";
    store.setFixApplied(warningKey, `${warningKey}:minimal`, warningFingerprint);
    store.applyFullExtraction(
      {
        facts: [],
        relations: [],
        salientObjects: [],
        selfContradictions: [
          {
            kind: "fact_conflict",
            message: "Противоречие в сцене",
            quoteA: "quiet",
            quoteB: "loud",
            chunkIds: ["c-self-1"],
            confidence: 0.9,
          },
        ],
      },
      [
        {
          id: "c-self-1",
          text: "quiet then loud",
          from: 0,
          to: 15,
          label: "c-self-1",
          kind: "heading",
          chapterId: "ch-1",
          chapterTitle: "Ch",
          sceneId: "scene-1",
          sceneTitle: "Scene",
          chunkVersion: 2,
          contentHash: "h-self",
        },
      ],
    );
    const next = usePlotStoryStore.getState();
    expect(next.warningStatuses[warningKey]).toBe("acknowledged");
    expect(next.fixApplyStateByWarningKey[warningKey].verificationState).toBe("idle");
  });

  it("merges fact/rule/llm warnings and keeps status", () => {
    const store = usePlotStoryStore.getState();
    const chunks: PlotChunk[] = [
      {
        id: "c-1",
        text: "В комнате стояла тишина, и в ту же секунду раздались громкие крики.",
        from: 0,
        to: 78,
        label: "c-1",
        kind: "heading",
        chapterId: "ch-1",
        chapterTitle: "Ch",
        sceneId: "scene-1",
        sceneTitle: "Scene",
        chunkVersion: 2,
        contentHash: "h1",
      },
    ];

    store.mergeSceneExtraction(
      "scene-1",
      {
        facts: [
          {
            entity: "Артур",
            entityType: "character",
            entityConfidence: 0.88,
            narrativeRole: null,
            attribute: "состояние",
            value: "спокоен",
            chunkIds: ["c-1"],
          },
          {
            entity: "Артур",
            entityType: "character",
            entityConfidence: 0.88,
            narrativeRole: null,
            attribute: "состояние",
            value: "в панике",
            chunkIds: ["c-1"],
          },
        ],
        relations: [],
        salientObjects: [],
        selfContradictions: [
          {
            kind: "fact_conflict",
            message: "Обнаружено противоречие в состоянии сцены",
            quoteA: "полная тишина",
            quoteB: "громкие крики",
            chunkIds: ["c-1"],
            confidence: 0.92,
          },
        ],
      },
      chunks,
    );

    let next = usePlotStoryStore.getState();
    expect(next.consistencyWarnings.length).toBeGreaterThanOrEqual(2);
    const keepKey = next.consistencyWarnings[0].key;
    store.setWarningStatus(keepKey, "acknowledged");

    store.mergeSceneExtraction(
      "scene-1",
      {
        facts: [],
        relations: [],
        salientObjects: [],
        selfContradictions: [
          {
            kind: "fact_conflict",
            message: "Обнаружено противоречие в состоянии сцены",
            quoteA: "полная тишина",
            quoteB: "громкие крики",
            chunkIds: ["c-1"],
            confidence: 0.91,
          },
        ],
      },
      chunks,
    );
    next = usePlotStoryStore.getState();
    expect(next.warningStatuses[keepKey]).toBe("acknowledged");
  });
});
