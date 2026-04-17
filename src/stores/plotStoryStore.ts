import { create } from "zustand";
import type { PlotChunk } from "@/lib/plot-index/chunks";
import {
  mergeFactsAndDetectConflicts,
  mergeRelations,
  computeChekhovWarnings,
  type PlotFact,
  type PlotRelation,
  type SalientObject,
  type ConsistencyWarning,
  type SelfContradictionInput,
  type ChekhovWarning,
  type WarningStatus,
  normalizeConsistencyWarnings,
  normalizePlotFacts,
} from "@/lib/plot-index/story-extraction";
import { detectRuleContradictionsFromChunks } from "@/lib/plot-index/contradiction-rules";
import { getStrictnessProfile } from "@/lib/plot-index/conflict-strictness";

type IncomingFact = Omit<PlotFact, "id">;
type IncomingRelation = Omit<PlotRelation, "id">;
type IncomingExtraction = {
  facts: IncomingFact[];
  relations: IncomingRelation[];
  salientObjects: SalientObject[];
  selfContradictions?: SelfContradictionInput[];
};

function fromSelfContradictions(
  items: SelfContradictionInput[] | undefined,
): ConsistencyWarning[] {
  if (!items?.length) return [];
  return items.map((item, idx) => {
    const previousChunkIds = item.chunkIds.slice(0, 1);
    const newChunkIds = item.chunkIds.slice(1, 2);
    return {
      id: `llm-self-${idx}-${Math.random().toString(36).slice(2, 8)}`,
      key: `llm/${item.kind}/${item.quoteA.slice(0, 48)}-${item.quoteB.slice(0, 48)}`
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-"),
      kind: item.kind,
      source: "llm_self_check",
      confidence: Math.max(0, Math.min(1, item.confidence)),
      message: item.message,
      entity: "scene",
      attribute: "self_contradiction",
      previousValue: item.quoteA,
      newValue: item.quoteB,
      previousChunkIds,
      newChunkIds,
      evidence: {
        quoteA: item.quoteA,
        quoteB: item.quoteB,
      },
    };
  });
}

function dedupeWarnings(warnings: ConsistencyWarning[]): ConsistencyWarning[] {
  const map = new Map<string, ConsistencyWarning>();
  for (const raw of warnings) {
    const warning = raw;
    const prev = map.get(warning.key);
    if (!prev) {
      map.set(warning.key, warning);
      continue;
    }
    const keep = prev.confidence >= warning.confidence ? prev : warning;
    const other = keep === prev ? warning : prev;
    map.set(warning.key, {
      ...keep,
      previousChunkIds: Array.from(
        new Set([...keep.previousChunkIds, ...other.previousChunkIds]),
      ),
      newChunkIds: Array.from(
        new Set([...keep.newChunkIds, ...other.newChunkIds]),
      ),
      evidence: keep.evidence ?? other.evidence,
    });
  }
  return [...map.values()];
}

function debugWarningStats(scope: string, warnings: ConsistencyWarning[]): void {
  if (process.env.NODE_ENV !== "development") return;
  const stats = warnings.reduce<Record<string, number>>((acc, warning) => {
    acc[warning.source] = (acc[warning.source] ?? 0) + 1;
    return acc;
  }, {});
  console.debug(`[plot-story] ${scope} warnings`, stats);
}
export type ContinuityFixSuggestion = {
  id: string;
  warningKey: string;
  title: string;
  strategy: "minimal" | "conservative" | "radical";
  editKind: "replace" | "insert_note";
  locatorStrategy: "exact_target" | "evidence_fuzzy" | "append_only";
  spanFingerprint: string;
  targetChunkId: string;
  replaceFrom: number;
  replaceTo: number;
  windowFromHint: number;
  windowToHint: number;
  contextBefore: string;
  contextAfter: string;
  expectedCurrentText: string;
  replacementText: string;
  beforeText: string;
  afterText: string;
  reason: string;
};

export type ContinuityFixApplyState = {
  loading: boolean;
  error: string | null;
  appliedAt: number | null;
  lastAppliedSuggestionId: string | null;
  rangeValidation: "idle" | "valid" | "stale";
  verificationState: "idle" | "awaiting_recheck" | "verified_resolved";
  pendingFingerprint: string | null;
  note: string | null;
};

function defaultFixApplyState(): ContinuityFixApplyState {
  return {
    loading: false,
    error: null,
    appliedAt: null,
    lastAppliedSuggestionId: null,
    rangeValidation: "idle",
    verificationState: "idle",
    pendingFingerprint: null,
    note: null,
  };
}

function normalizeFingerprintValue(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s:/_-]+/gu, "")
    .trim();
}

export function getWarningSemanticFingerprint(warning: ConsistencyWarning): string {
  const lhs = warning.evidence?.quoteA || warning.previousValue;
  const rhs = warning.evidence?.quoteB || warning.newValue;
  const values = [normalizeFingerprintValue(lhs), normalizeFingerprintValue(rhs)].sort();
  return [
    warning.kind,
    normalizeFingerprintValue(warning.entity),
    normalizeFingerprintValue(warning.attribute),
    values[0],
    values[1],
  ].join("|");
}

function reconcilePostRecheck(
  warningStatuses: Record<string, WarningStatus>,
  fixApplyStateByWarningKey: Record<string, ContinuityFixApplyState>,
  warnings: ConsistencyWarning[],
): {
  warningStatuses: Record<string, WarningStatus>;
  fixApplyStateByWarningKey: Record<string, ContinuityFixApplyState>;
} {
  const warningKeys = new Set(warnings.map((w) => w.key));
  const warningFingerprints = new Set(warnings.map((w) => getWarningSemanticFingerprint(w)));
  const nextStatuses = { ...warningStatuses };
  const nextFixStates = { ...fixApplyStateByWarningKey };

  for (const [warningKey, applyState] of Object.entries(fixApplyStateByWarningKey)) {
    if (applyState.verificationState !== "awaiting_recheck") continue;
    const stillPresentByKey = warningKeys.has(warningKey);
    const stillPresentByFingerprint =
      applyState.pendingFingerprint != null &&
      warningFingerprints.has(applyState.pendingFingerprint);
    if (stillPresentByKey || stillPresentByFingerprint) {
      nextFixStates[warningKey] = {
        ...applyState,
        verificationState: "idle",
        note: "После перепроверки конфликт всё еще обнаружен. Нужна ручная правка.",
      };
      nextStatuses[warningKey] = "acknowledged";
      continue;
    }
    nextFixStates[warningKey] = {
      ...applyState,
      verificationState: "verified_resolved",
      pendingFingerprint: null,
      note: "Конфликт исчез после перепроверки.",
    };
    nextStatuses[warningKey] = "resolved";
  }

  return {
    warningStatuses: nextStatuses,
    fixApplyStateByWarningKey: nextFixStates,
  };
}

export interface PlotStoryState {
  facts: PlotFact[];
  relations: PlotRelation[];
  salientObjects: SalientObject[];
  consistencyWarnings: ConsistencyWarning[];
  chekhovWarnings: ChekhovWarning[];
  analysisPhase: "idle" | "analyzing" | "ready" | "error";
  analysisMessage: string | null;
  lastAnalyzedAt: number | null;
  analysisError: string | null;
  autoBusy: boolean;
  lastAutoAnalyzeAt: number | null;
  lastProjectReconcileAt: number | null;
  lastExtractionAt: number | null;
  extractionError: string | null;
  warningStatuses: Record<string, WarningStatus>;
  chunkSceneMap: Record<
    string,
    { chapterId: string | null; chapterTitle: string | null; sceneId: string | null; sceneTitle: string | null }
  >;
  fixSuggestionsByWarningKey: Record<string, ContinuityFixSuggestion[]>;
  fixPreviewByWarningKey: Record<string, ContinuityFixSuggestion | null>;
  fixApplyStateByWarningKey: Record<string, ContinuityFixApplyState>;

  resetStory: () => void;
  /** Replace the in-memory store with data previously persisted on disk. */
  hydrateFromPersistence: (payload: Partial<PlotStoryState>) => void;
  applyFullExtraction: (
    payload: IncomingExtraction,
    chunks: PlotChunk[],
  ) => void;
  mergeSceneExtraction: (
    sceneId: string,
    payload: IncomingExtraction,
    chunks: PlotChunk[],
  ) => void;
  setExtractionError: (msg: string | null) => void;
  setWarningStatus: (warningKey: string, status: WarningStatus) => void;
  getWarningStatus: (warningKey: string) => WarningStatus;
  setFixSuggestions: (warningKey: string, suggestions: ContinuityFixSuggestion[]) => void;
  setFixPreview: (warningKey: string, suggestion: ContinuityFixSuggestion | null) => void;
  setFixApplying: (warningKey: string) => void;
  setFixApplied: (
    warningKey: string,
    suggestionId: string,
    warningFingerprint?: string | null,
  ) => void;
  setFixRangeValidation: (
    warningKey: string,
    validation: ContinuityFixApplyState["rangeValidation"],
    note?: string | null,
  ) => void;
  setFixError: (warningKey: string, message: string) => void;
  clearFixState: (warningKey: string) => void;
  setAnalysisState: (patch: {
    analysisPhase?: "idle" | "analyzing" | "ready" | "error";
    analysisMessage?: string | null;
    lastAnalyzedAt?: number | null;
    analysisError?: string | null;
  }) => void;
  setAutoState: (patch: {
    autoBusy?: boolean;
    lastAutoAnalyzeAt?: number | null;
    lastProjectReconcileAt?: number | null;
  }) => void;
}

export const usePlotStoryStore = create<PlotStoryState>((set, get) => ({
  facts: [],
  relations: [],
  salientObjects: [],
  consistencyWarnings: [],
  chekhovWarnings: [],
  analysisPhase: "idle",
  analysisMessage: null,
  lastAnalyzedAt: null,
  analysisError: null,
  autoBusy: false,
  lastAutoAnalyzeAt: null,
  lastProjectReconcileAt: null,
  lastExtractionAt: null,
  extractionError: null,
  warningStatuses: {},
  chunkSceneMap: {},
  fixSuggestionsByWarningKey: {},
  fixPreviewByWarningKey: {},
  fixApplyStateByWarningKey: {},

  resetStory: () =>
    set({
      facts: [],
      relations: [],
      salientObjects: [],
      consistencyWarnings: [],
      chekhovWarnings: [],
      analysisPhase: "idle",
      analysisMessage: null,
      lastAnalyzedAt: null,
      analysisError: null,
      autoBusy: false,
      lastAutoAnalyzeAt: null,
      lastProjectReconcileAt: null,
      lastExtractionAt: null,
      extractionError: null,
      warningStatuses: {},
      chunkSceneMap: {},
      fixSuggestionsByWarningKey: {},
      fixPreviewByWarningKey: {},
      fixApplyStateByWarningKey: {},
    }),

  hydrateFromPersistence: (payload) =>
    set((state) => ({
      ...state,
      facts: payload.facts ? normalizePlotFacts(payload.facts) : state.facts,
      relations: payload.relations ?? state.relations,
      salientObjects: payload.salientObjects ?? state.salientObjects,
      consistencyWarnings: payload.consistencyWarnings
        ? normalizeConsistencyWarnings(payload.consistencyWarnings)
        : state.consistencyWarnings,
      chekhovWarnings: payload.chekhovWarnings ?? state.chekhovWarnings,
      warningStatuses: payload.warningStatuses ?? state.warningStatuses,
      chunkSceneMap: payload.chunkSceneMap ?? state.chunkSceneMap,
      lastExtractionAt: payload.lastExtractionAt ?? state.lastExtractionAt,
      lastAnalyzedAt: payload.lastAnalyzedAt ?? state.lastAnalyzedAt,
      analysisPhase: "ready",
      analysisMessage: "Сюжетная память восстановлена из IDB",
      analysisError: null,
      extractionError: null,
      autoBusy: false,
    })),

  applyFullExtraction: (payload, chunks) =>
    set((state) => {
    const strictness = getStrictnessProfile();
    const { facts, warnings } = mergeFactsAndDetectConflicts(
      [],
      payload.facts,
    );
    const ruleWarnings = detectRuleContradictionsFromChunks(chunks).filter(
      (warning) => warning.confidence >= strictness.minRuleConfidence,
    );
    const llmWarnings = fromSelfContradictions(payload.selfContradictions).filter(
      (warning) => warning.confidence >= strictness.minLlmConfidence,
    );
    const normalizedWarnings = normalizeConsistencyWarnings([
      ...warnings,
      ...ruleWarnings,
      ...llmWarnings,
    ]);
    const dedupedWarnings = dedupeWarnings(normalizedWarnings);
    debugWarningStats("applyFullExtraction", dedupedWarnings);
    const relations = mergeRelations([], payload.relations);
    const chekhov = computeChekhovWarnings(chunks, payload.salientObjects);
    const nextStatuses = { ...state.warningStatuses };
    for (const warning of dedupedWarnings) {
      if (!nextStatuses[warning.key]) {
        nextStatuses[warning.key] = "new";
      }
    }
    const postRecheck = reconcilePostRecheck(
      nextStatuses,
      state.fixApplyStateByWarningKey,
      dedupedWarnings,
    );
    const chunkSceneMap = chunks.reduce<Record<string, { chapterId: string | null; chapterTitle: string | null; sceneId: string | null; sceneTitle: string | null }>>((acc, chunk) => {
      acc[chunk.id] = {
        chapterId: chunk.chapterId,
        chapterTitle: chunk.chapterTitle,
        sceneId: chunk.sceneId,
        sceneTitle: chunk.sceneTitle,
      };
      return acc;
    }, {});
    return {
      facts,
      relations,
      salientObjects: payload.salientObjects,
      consistencyWarnings: dedupedWarnings,
      chekhovWarnings: chekhov,
      analysisPhase: "ready",
      analysisMessage: "Сюжетная память обновлена",
      lastAnalyzedAt: Date.now(),
      analysisError: null,
      lastExtractionAt: Date.now(),
      extractionError: null,
      warningStatuses: postRecheck.warningStatuses,
      fixApplyStateByWarningKey: postRecheck.fixApplyStateByWarningKey,
      chunkSceneMap,
    };
  }),

  mergeSceneExtraction: (sceneId, payload, chunks) =>
    set((state) => {
      const strictness = getStrictnessProfile();
      const previousChunkIds = new Set<string>();
      for (const [chunkId, binding] of Object.entries(state.chunkSceneMap)) {
        if (binding.sceneId === sceneId) {
          previousChunkIds.add(chunkId);
        }
      }

      const filteredFacts = state.facts
        .map((fact) => ({
          ...fact,
          chunkIds: fact.chunkIds.filter((chunkId) => !previousChunkIds.has(chunkId)),
        }))
        .filter((fact) => fact.chunkIds.length > 0);
      const filteredRelations = state.relations
        .map((relation) => ({
          ...relation,
          chunkIds: relation.chunkIds.filter((chunkId) => !previousChunkIds.has(chunkId)),
        }))
        .filter((relation) => relation.chunkIds.length > 0);
      const filteredSalient = state.salientObjects.filter(
        (item) => !previousChunkIds.has(item.chunkId),
      );
      const filteredWarnings = state.consistencyWarnings.filter((warning) => {
        const hasOldChunk = [...warning.newChunkIds, ...warning.previousChunkIds].some((chunkId) =>
          previousChunkIds.has(chunkId),
        );
        return !hasOldChunk;
      });

      const mergedFactsResult = mergeFactsAndDetectConflicts(filteredFacts, payload.facts);
      const mergedRelations = mergeRelations(filteredRelations, payload.relations);
      const mergedSalient = [...filteredSalient, ...payload.salientObjects];
      const ruleWarnings = detectRuleContradictionsFromChunks(chunks).filter(
        (warning) => warning.confidence >= strictness.minRuleConfidence,
      );
      const llmWarnings = fromSelfContradictions(payload.selfContradictions).filter(
        (warning) => warning.confidence >= strictness.minLlmConfidence,
      );
      const mergedWarnings = dedupeWarnings(
        normalizeConsistencyWarnings([
          ...filteredWarnings,
          ...mergedFactsResult.warnings,
          ...ruleWarnings,
          ...llmWarnings,
        ]),
      );
      debugWarningStats("mergeSceneExtraction", mergedWarnings);
      const combinedChunks = [
        ...Object.entries(state.chunkSceneMap)
          .filter(([, binding]) => binding.sceneId !== sceneId)
          .map(([id, binding]) => ({
            id,
            text: "",
            from: 0,
            to: 0,
            label: "",
            kind: "heading" as const,
            chapterId: binding.chapterId,
            chapterTitle: binding.chapterTitle,
            sceneId: binding.sceneId,
            sceneTitle: binding.sceneTitle,
            chunkVersion: 2,
            contentHash: "",
          })),
        ...chunks,
      ];
      const chekhov = computeChekhovWarnings(chunks, payload.salientObjects);
      const nextStatuses = { ...state.warningStatuses };
      for (const warning of mergedWarnings) {
        if (!nextStatuses[warning.key]) {
          nextStatuses[warning.key] = "new";
        }
      }
      const postRecheck = reconcilePostRecheck(
        nextStatuses,
        state.fixApplyStateByWarningKey,
        mergedWarnings,
      );

      const chunkSceneMap = combinedChunks.reduce<
        Record<
          string,
          {
            chapterId: string | null;
            chapterTitle: string | null;
            sceneId: string | null;
            sceneTitle: string | null;
          }
        >
      >((acc, chunk) => {
        acc[chunk.id] = {
          chapterId: chunk.chapterId,
          chapterTitle: chunk.chapterTitle,
          sceneId: chunk.sceneId,
          sceneTitle: chunk.sceneTitle,
        };
        return acc;
      }, {});

      return {
        facts: mergedFactsResult.facts,
        relations: mergedRelations,
        salientObjects: mergedSalient,
        consistencyWarnings: mergedWarnings,
        chekhovWarnings: chekhov,
        analysisPhase: "ready",
        analysisMessage: "Сцена проанализирована",
        lastAnalyzedAt: Date.now(),
        analysisError: null,
        lastExtractionAt: Date.now(),
        extractionError: null,
        warningStatuses: postRecheck.warningStatuses,
        fixApplyStateByWarningKey: postRecheck.fixApplyStateByWarningKey,
        chunkSceneMap,
      };
    }),

  setExtractionError: (extractionError) => set({ extractionError }),
  setWarningStatus: (warningKey, status) =>
    set((state) => ({
      warningStatuses: {
        ...state.warningStatuses,
        [warningKey]: status,
      },
    })),
  getWarningStatus: (warningKey) => {
    const status = get().warningStatuses[warningKey];
    return status ?? "new";
  },
  setFixSuggestions: (warningKey, suggestions) =>
    set((state) => ({
      fixSuggestionsByWarningKey: {
        ...state.fixSuggestionsByWarningKey,
        [warningKey]: suggestions,
      },
      fixApplyStateByWarningKey: {
        ...state.fixApplyStateByWarningKey,
        [warningKey]: {
          ...(state.fixApplyStateByWarningKey[warningKey] ?? defaultFixApplyState()),
          loading: false,
          error: null,
          rangeValidation: "idle",
          verificationState: "idle",
          note: null,
          pendingFingerprint: null,
        },
      },
    })),
  setFixPreview: (warningKey, suggestion) =>
    set((state) => ({
      fixPreviewByWarningKey: {
        ...state.fixPreviewByWarningKey,
        [warningKey]: suggestion,
      },
    })),
  setFixApplying: (warningKey) =>
    set((state) => ({
      fixApplyStateByWarningKey: {
        ...state.fixApplyStateByWarningKey,
        [warningKey]: {
          loading: true,
          error: null,
          appliedAt: state.fixApplyStateByWarningKey[warningKey]?.appliedAt ?? null,
          lastAppliedSuggestionId:
            state.fixApplyStateByWarningKey[warningKey]?.lastAppliedSuggestionId ?? null,
          rangeValidation:
            state.fixApplyStateByWarningKey[warningKey]?.rangeValidation ?? "idle",
          verificationState:
            state.fixApplyStateByWarningKey[warningKey]?.verificationState ?? "idle",
          pendingFingerprint:
            state.fixApplyStateByWarningKey[warningKey]?.pendingFingerprint ?? null,
          note: null,
        },
      },
    })),
  setFixApplied: (warningKey, suggestionId, warningFingerprint = null) =>
    set((state) => ({
      warningStatuses: {
        ...state.warningStatuses,
        [warningKey]: "acknowledged",
      },
      fixApplyStateByWarningKey: {
        ...state.fixApplyStateByWarningKey,
        [warningKey]: {
          loading: false,
          error: null,
          appliedAt: Date.now(),
          lastAppliedSuggestionId: suggestionId,
          rangeValidation: "valid",
          verificationState: "awaiting_recheck",
          pendingFingerprint: warningFingerprint,
          note: "Правка применена. Проверяю конфликт повторным анализом…",
        },
      },
    })),
  setFixRangeValidation: (warningKey, validation, note = null) =>
    set((state) => ({
      fixApplyStateByWarningKey: {
        ...state.fixApplyStateByWarningKey,
        [warningKey]: {
          ...(state.fixApplyStateByWarningKey[warningKey] ?? defaultFixApplyState()),
          rangeValidation: validation,
          note,
        },
      },
    })),
  setFixError: (warningKey, message) =>
    set((state) => ({
      fixApplyStateByWarningKey: {
        ...state.fixApplyStateByWarningKey,
        [warningKey]: {
          loading: false,
          error: message,
          appliedAt: state.fixApplyStateByWarningKey[warningKey]?.appliedAt ?? null,
          lastAppliedSuggestionId:
            state.fixApplyStateByWarningKey[warningKey]?.lastAppliedSuggestionId ?? null,
          rangeValidation:
            state.fixApplyStateByWarningKey[warningKey]?.rangeValidation ?? "idle",
          verificationState:
            state.fixApplyStateByWarningKey[warningKey]?.verificationState ?? "idle",
          pendingFingerprint:
            state.fixApplyStateByWarningKey[warningKey]?.pendingFingerprint ?? null,
          note: null,
        },
      },
    })),
  clearFixState: (warningKey) =>
    set((state) => ({
      fixSuggestionsByWarningKey: {
        ...state.fixSuggestionsByWarningKey,
        [warningKey]: [],
      },
      fixPreviewByWarningKey: {
        ...state.fixPreviewByWarningKey,
        [warningKey]: null,
      },
      fixApplyStateByWarningKey: {
        ...state.fixApplyStateByWarningKey,
        [warningKey]: defaultFixApplyState(),
      },
    })),
  setAnalysisState: (patch) =>
    set((state) => ({
      analysisPhase: patch.analysisPhase ?? state.analysisPhase,
      analysisMessage:
        patch.analysisMessage === undefined
          ? state.analysisMessage
          : patch.analysisMessage,
      lastAnalyzedAt:
        patch.lastAnalyzedAt === undefined
          ? state.lastAnalyzedAt
          : patch.lastAnalyzedAt,
      analysisError:
        patch.analysisError === undefined
          ? state.analysisError
          : patch.analysisError,
    })),
  setAutoState: (patch) =>
    set((state) => ({
      autoBusy: patch.autoBusy ?? state.autoBusy,
      lastAutoAnalyzeAt:
        patch.lastAutoAnalyzeAt === undefined
          ? state.lastAutoAnalyzeAt
          : patch.lastAutoAnalyzeAt,
      lastProjectReconcileAt:
        patch.lastProjectReconcileAt === undefined
          ? state.lastProjectReconcileAt
          : patch.lastProjectReconcileAt,
    })),
}));
