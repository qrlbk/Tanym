"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  X,
  BookOpen,
  Search,
  AlertTriangle,
  Network,
  Target,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock3,
  CircleDot,
  Ban,
  ChevronDown,
  ChevronRight,
  UserCircle,
} from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { useUIStore } from "@/stores/uiStore";
import { usePlotIndexStore } from "@/stores/plotIndexStore";
import { usePlotStoryStore } from "@/stores/plotStoryStore";
import { executeToolCall } from "@/lib/ai/client-tools";
import { THEME, UI_COLORS } from "@/lib/theme/colors";
import CharacterCardsPanel from "@/components/PlotStory/CharacterCardsPanel";
import { computePlotChunks } from "@/lib/plot-index/chunks";
import { buildProblemItems } from "@/lib/plot-index/problem-items";
import { plotFeatures } from "@/lib/plot-index/features";
import {
  getConflictStrictness,
  shouldDisplayWarning,
} from "@/lib/plot-index/conflict-strictness";
import { classifyEntityLifecycle } from "@/lib/project/entity-lifecycle";
import {
  WARNING_STATUS_LABEL as STATUS_LABEL,
  WARNING_SOURCE_LABEL as SOURCE_LABEL,
  type PlotStoryTabId as TabId,
} from "./constants";
import { usePlotStoryActions } from "./hooks/usePlotStoryActions";

export default function PlotStoryPanel({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const editor = useEditorContext();
  const setShowPlotPanel = useUIStore((s) => s.setShowPlotPanel);
  const continuityFilter = useUIStore((s) => s.continuityFilter);
  const setContinuityFilter = useUIStore((s) => s.setContinuityFilter);
  const setActiveSceneId = useUIStore((s) => s.setActiveSceneId);
  const activeSceneId = useUIStore((s) => s.activeSceneId);
  const workspaceView = useUIStore((s) => s.workspaceView);
  const setWorkspaceView = useUIStore((s) => s.setWorkspaceView);

  const ingestPhase = usePlotIndexStore((s) => s.ingestPhase);
  const lastIndexedAt = usePlotIndexStore((s) => s.lastIndexedAt);
  const indexError = usePlotIndexStore((s) => s.indexError);

  const facts = usePlotStoryStore((s) => s.facts);
  const relations = usePlotStoryStore((s) => s.relations);
  const salientObjects = usePlotStoryStore((s) => s.salientObjects);
  const consistencyWarnings = usePlotStoryStore((s) => s.consistencyWarnings);
  const chekhovWarnings = usePlotStoryStore((s) => s.chekhovWarnings);
  const motivationAssessments = usePlotStoryStore((s) => s.motivationAssessments);
  const consequenceAssessments = usePlotStoryStore((s) => s.consequenceAssessments);
  const lastExtractionAt = usePlotStoryStore((s) => s.lastExtractionAt);
  const extractionError = usePlotStoryStore((s) => s.extractionError);
  const analysisPhase = usePlotStoryStore((s) => s.analysisPhase);
  const analysisMessage = usePlotStoryStore((s) => s.analysisMessage);
  const analysisError = usePlotStoryStore((s) => s.analysisError);
  const lastAnalyzedAt = usePlotStoryStore((s) => s.lastAnalyzedAt);
  const autoBusy = usePlotStoryStore((s) => s.autoBusy);
  const lastAutoAnalyzeAt = usePlotStoryStore((s) => s.lastAutoAnalyzeAt);
  const lastProjectReconcileAt = usePlotStoryStore((s) => s.lastProjectReconcileAt);
  const resetStory = usePlotStoryStore((s) => s.resetStory);
  const warningStatuses = usePlotStoryStore((s) => s.warningStatuses);
  const setWarningStatus = usePlotStoryStore((s) => s.setWarningStatus);
  const chunkSceneMap = usePlotStoryStore((s) => s.chunkSceneMap);
  const fixSuggestionsByWarningKey = usePlotStoryStore((s) => s.fixSuggestionsByWarningKey);
  const fixPreviewByWarningKey = usePlotStoryStore((s) => s.fixPreviewByWarningKey);
  const fixApplyStateByWarningKey = usePlotStoryStore((s) => s.fixApplyStateByWarningKey);
  const setFixPreview = usePlotStoryStore((s) => s.setFixPreview);
  const clearFixState = usePlotStoryStore((s) => s.clearFixState);

  const [tab, setTab] = useState<TabId>("characters");
  const [query, setQuery] = useState("");
  const [showTechDetails, setShowTechDetails] = useState(false);
  const conflictStrictness = getConflictStrictness();

  const {
    chunkCount,
    chunkLookup,
    analyzeBusy,
    searching,
    searchError,
    hits,
    refreshMeta,
    refreshChunkLookup,
    runSearch: runSearchAction,
    runRebuildIndex,
    runStoryAnalyze: runStoryAnalyzeAction,
  } = usePlotStoryActions({ editor, activeSceneId });

  const runSearch = useCallback(() => runSearchAction(query), [runSearchAction, query]);
  const runStoryAnalyze = useCallback(
    () => runStoryAnalyzeAction(() => setTab("conflicts")),
    [runStoryAnalyzeAction],
  );

  const goToPosition = useCallback(
    (from: number) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .setTextSelection(from)
        .scrollIntoView()
        .run();
    },
    [editor],
  );

  useEffect(() => {
    void refreshMeta();
    refreshChunkLookup();
  }, [refreshMeta, refreshChunkLookup]);

  useEffect(() => {
    if (activeSceneId) {
      queueMicrotask(() => setTab("conflicts"));
    }
  }, [activeSceneId]);

  useEffect(() => {
    if (!plotFeatures.storyGraphV1) return;
    if (tab === "graph") {
      if (workspaceView !== "graph") setWorkspaceView("graph");
      return;
    }
    if (workspaceView === "graph") {
      setWorkspaceView("scene");
    }
  }, [setWorkspaceView, tab, workspaceView]);

  const filteredWarnings = consistencyWarnings.filter((warning) => {
    if (!shouldDisplayWarning(warning, conflictStrictness)) return false;
    const status = warningStatuses[warning.key] ?? "new";
    if (continuityFilter === "all") return true;
    return continuityFilter === status;
  });
  const hiddenWarningsCount = Math.max(0, consistencyWarnings.length - filteredWarnings.length);

  const unresolvedWarnings = consistencyWarnings.filter((warning) => {
    const status = warningStatuses[warning.key] ?? "new";
    return status !== "resolved" && status !== "ignored";
  });
  const manuscriptChars = editor?.state.doc.textContent.trim().length ?? 0;
  const showDemoInsights =
    manuscriptChars < 120 && facts.length === 0 && consistencyWarnings.length === 0;
  const visibleFacts = showDemoInsights
    ? [
        {
          id: "demo-f-1",
          entity: "Герой",
          entityType: "character",
          entityConfidence: 0.8,
          narrativeRole: null,
          attribute: "цель",
          value: "доказать невиновность",
          chunkIds: [] as string[],
        },
        {
          id: "demo-f-2",
          entity: "Антагонист",
          entityType: "character",
          entityConfidence: 0.8,
          narrativeRole: null,
          attribute: "мотив",
          value: "скрыть прошлое",
          chunkIds: [] as string[],
        },
      ]
    : facts;
  const lifecycleBuckets = useMemo(
    () => classifyEntityLifecycle(facts, chunkSceneMap),
    [facts, chunkSceneMap],
  );

  const warningsByKind = {
    fact: filteredWarnings.filter((w) => w.kind === "fact_conflict"),
    timeline: filteredWarnings.filter((w) => w.kind === "timeline_conflict"),
    causal: filteredWarnings.filter((w) => w.kind === "causal_conflict"),
  };
  const allChunks = useMemo(() => (editor ? computePlotChunks(editor) : []), [editor]);
  const problemItems = useMemo(
    () =>
      buildProblemItems({
        consistencyWarnings,
        chekhovWarnings,
        salientObjects,
        facts,
        chunks: allChunks,
        warningStatuses,
        motivationAssessments,
        consequenceAssessments,
      }),
    [
      allChunks,
      chekhovWarnings,
      consistencyWarnings,
      facts,
      salientObjects,
      warningStatuses,
      motivationAssessments,
      consequenceAssessments,
    ],
  );

  const jumpToChunk = useCallback(
    (chunkId: string) => {
      const chunk = chunkLookup[chunkId];
      const sceneId = chunkSceneMap[chunkId]?.sceneId ?? null;
      if (sceneId) {
        setActiveSceneId(sceneId);
      }
      if (chunk) {
        goToPosition(chunk.from);
        return;
      }
      // Fallback: if exact chunk offset is unavailable, at least focus the target scene.
      if (sceneId) {
        requestAnimationFrame(() => {
          goToPosition(1);
        });
      }
    },
    [chunkLookup, chunkSceneMap, setActiveSceneId, goToPosition],
  );

  const suggestFix = useCallback(
    async (warningKey: string) => {
      if (!editor) return;
      await executeToolCall("suggest_continuity_fix", { warningKey }, editor);
    },
    [editor],
  );

  const applyFix = useCallback(
    async (warningKey: string, suggestionId: string) => {
      if (!editor || !suggestionId) return;
      await executeToolCall(
        "apply_continuity_fix",
        { warningKey, suggestionId },
        editor,
      );
    },
    [editor],
  );

  return (
    <div
      className={`relative flex flex-col h-full ${embedded ? "" : "border-l"}`}
      style={{
        width: embedded ? undefined : 380,
        minWidth: embedded ? undefined : 300,
        borderColor: embedded ? undefined : UI_COLORS.storyPanel.border,
        background: UI_COLORS.storyPanel.surface,
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{
          borderColor: UI_COLORS.storyPanel.border,
          background: `linear-gradient(to right, ${UI_COLORS.storyPanel.headerFrom}, ${UI_COLORS.storyPanel.headerTo})`,
        }}
      >
        <div className="flex items-center gap-2">
          <BookOpen size={16} style={{ color: THEME.accent.primaryBorder }} />
          <span className="text-sm font-semibold" style={{ color: UI_COLORS.storyPanel.textPrimary }}>
            Индекс сюжета
          </span>
        </div>
        {!embedded && (
          <button
            type="button"
            onClick={() => setShowPlotPanel(false)}
            className="p-1 rounded"
            style={{ color: UI_COLORS.storyPanel.textMuted }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = UI_COLORS.storyPanel.closeHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            title="Закрыть"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div
        className="grid grid-cols-4 border-b text-[10px]"
        style={{ borderColor: UI_COLORS.storyPanel.border }}
      >
        {(
          [
            ["characters", "Факты", AlertTriangle],
            ["cards", "Карточки", UserCircle],
            ...(plotFeatures.storyGraphV1
              ? ([["graph", "Graph", Network]] as const)
              : []),
            ...(plotFeatures.problemPanelV2
              ? ([["problems", "Problems", AlertTriangle]] as const)
              : []),
            ["conflicts", "Конфликты", Network],
            ["timeline", "Таймлайн", Target],
            ["resolutions", "Исправления", CheckCircle2],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              if (!plotFeatures.storyGraphV1) return;
              if (id === "graph") {
                setWorkspaceView("graph");
              } else if (workspaceView === "graph") {
                setWorkspaceView("scene");
              }
            }}
            className="flex items-center justify-center gap-1 py-2 px-1.5 border-b-2 transition-colors min-w-0"
            style={
              tab === id
                ? {
                    borderColor: UI_COLORS.storyPanel.tabActiveBorder,
                    color: UI_COLORS.storyPanel.textPrimary,
                    background: UI_COLORS.storyPanel.tabActiveBg,
                  }
                : {
                    borderColor: "transparent",
                    color: UI_COLORS.storyPanel.textMuted,
                  }
            }
            onMouseEnter={(e) => {
              if (tab !== id) {
                e.currentTarget.style.background = UI_COLORS.storyPanel.tabHoverBg;
              }
            }}
            onMouseLeave={(e) => {
              if (tab !== id) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div
        className="px-3 py-2.5 text-[11px] border-b space-y-2 leading-[1.5]"
        style={{
          color: UI_COLORS.storyPanel.textSecondary,
          borderColor: UI_COLORS.storyPanel.borderSoft,
        }}
      >
        <div className="flex justify-between gap-2">
          <span>
            Память сюжета:{" "}
            {chunkCount !== null ? `${chunkCount} фрагм.` : "—"}
          </span>
          {lastIndexedAt != null && (
            <span>обновлён {new Date(lastIndexedAt).toLocaleTimeString()}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px]"
            style={{
              border: `1px solid ${THEME.surface.inputBorder}`,
              color: autoBusy
                ? THEME.warning.text
                : unresolvedWarnings.length > 0
                  ? THEME.danger.text
                  : THEME.success.text,
              background: THEME.surface.input,
            }}
          >
            {autoBusy
              ? "Авто: проверка..."
              : unresolvedWarnings.length > 0
                ? `Авто: ${unresolvedWarnings.length} конфликтов`
                : "Авто: всё чисто"}
          </span>
          <span
            style={
              analysisPhase === "error" || indexError
                ? { color: THEME.danger.text }
                : undefined
            }
          >
            {analysisMessage ||
              analysisError ||
              indexError ||
              (analysisPhase === "analyzing"
                ? "Проверка логики сюжета…"
                : ingestPhase === "embedding"
                  ? "Синхронизация контекста…"
                  : "Готово к проверке")}
          </span>
          {(lastAutoAnalyzeAt || lastProjectReconcileAt) && (
            <span className="text-[10px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
              авто-сцена: {lastAutoAnalyzeAt ? new Date(lastAutoAnalyzeAt).toLocaleTimeString() : "—"} ·
              проект: {lastProjectReconcileAt ? new Date(lastProjectReconcileAt).toLocaleTimeString() : "—"}
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void runRebuildIndex()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border"
            style={{
              borderColor: THEME.accent.primaryBorder,
              color: THEME.accent.primaryBorder,
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = THEME.accent.subtleBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <RefreshCw size={10} />
            Обновить контекст (вручную)
          </button>
          <button
            type="button"
            disabled={analyzeBusy}
            onClick={() => void runStoryAnalyze()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-white disabled:opacity-50"
            style={{ background: UI_COLORS.accentPrimaryBg }}
            onMouseEnter={(e) => {
              if (!analyzeBusy) e.currentTarget.style.background = UI_COLORS.accentPrimaryHover;
            }}
            onMouseLeave={(e) => {
              if (!analyzeBusy) e.currentTarget.style.background = UI_COLORS.accentPrimaryBg;
            }}
          >
            {analyzeBusy ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <BookOpen size={10} />
            )}
            Проверить сейчас (вручную)
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runSearch();
            }}
            placeholder="Найти эпизод или факт в рукописи"
            className="flex-1 min-w-0 rounded px-2 py-1.5 text-[11px] outline-none"
            style={{
              border: `1px solid ${THEME.surface.inputBorder}`,
              background: THEME.surface.input,
              color: UI_COLORS.storyPanel.textPrimary,
            }}
          />
          <button
            type="button"
            disabled={searching}
            onClick={() => void runSearch()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-white disabled:opacity-50"
            style={{ background: UI_COLORS.accentPrimaryBg }}
            onMouseEnter={(e) => {
              if (!searching) e.currentTarget.style.background = UI_COLORS.accentPrimaryHover;
            }}
            onMouseLeave={(e) => {
              if (!searching) e.currentTarget.style.background = UI_COLORS.accentPrimaryBg;
            }}
            title="Поиск по сюжетной памяти"
          >
            <Search size={10} />
          </button>
        </div>
        {hits.length > 0 && (
          <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
            {hits.slice(0, 5).map((h) => (
              <button
                key={h.chunkId}
                type="button"
                onClick={() => jumpToChunk(h.chunkId)}
                className="block w-full text-left rounded px-2 py-1.5 transition-colors"
                style={{
                  border: `1px solid ${THEME.surface.inputBorder}`,
                  background: THEME.surface.card,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = THEME.surface.elevated;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = THEME.surface.card;
                }}
              >
                <p
                  className="text-[11px] truncate leading-[1.45]"
                  style={{ color: UI_COLORS.storyPanel.textPrimary }}
                >
                  {h.label}
                </p>
                <p className="text-[10px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                  {(h.score * 100).toFixed(1)}%
                </p>
              </button>
            ))}
          </div>
        )}
        {searchError && (
          <p style={{ color: THEME.danger.text }}>{searchError}</p>
        )}
        {extractionError && (
          <p style={{ color: THEME.danger.text }}>{extractionError}</p>
        )}
        {lastAnalyzedAt != null && (
          <p style={{ color: UI_COLORS.storyPanel.textMuted }}>
            сюжет проверен:{" "}
            {new Date(lastAnalyzedAt).toLocaleString()}
          </p>
        )}
        <button
          type="button"
          onClick={() => setShowTechDetails((prev) => !prev)}
          className="inline-flex items-center gap-1 text-[10px]"
          style={{ color: UI_COLORS.storyPanel.textMuted }}
        >
          {showTechDetails ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          Технические детали
        </button>
        {showTechDetails && (
          <div
            className="rounded p-2.5 space-y-1 text-[11px] leading-[1.5]"
            style={{
              border: `1px solid ${THEME.surface.inputBorder}`,
              background: THEME.surface.card,
              color: UI_COLORS.storyPanel.textSecondary,
            }}
          >
            <p>Vector store: IndexedDB (local)</p>
            <p>Embeddings: text-embedding-3-small (API)</p>
            {lastExtractionAt != null && (
              <p>Last extraction raw timestamp: {new Date(lastExtractionAt).toISOString()}</p>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => resetStory()}
          className="text-[10px] underline underline-offset-2"
          style={{ color: UI_COLORS.storyPanel.textMuted }}
        >
          Очистить сюжетную память
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 text-sm">
        {tab === "cards" && <CharacterCardsPanel />}

        {tab === "characters" && (
          <div className="space-y-4">
            <h3
              className="text-[13px] font-semibold tracking-tight"
              style={{ color: UI_COLORS.storyPanel.textPrimary }}
            >
              Персонажи и факты
            </h3>
            {showDemoInsights && (
              <p
                className="text-[12px] rounded-md px-3 py-2 leading-[1.5]"
                style={{
                  border: `1px solid ${THEME.surface.inputBorder}`,
                  borderLeftWidth: 3,
                  borderLeftStyle: "solid",
                  borderLeftColor: THEME.accent.primary,
                  background: THEME.surface.card,
                  color: UI_COLORS.storyPanel.textSecondary,
                }}
              >
                Демо-инсайты: начните писать сцену, и панель автоматически заменит примеры реальным анализом.
              </p>
            )}
            <h3
              className="text-xs font-semibold uppercase tracking-wide pt-1"
              style={{ color: UI_COLORS.storyPanel.textMuted }}
            >
              Факты ({visibleFacts.length})
            </h3>
            <ul className="space-y-1.5 max-h-40 overflow-y-auto text-[12px] leading-[1.5]">
              {visibleFacts.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className="w-full text-left rounded-md px-2 py-1.5 transition-colors"
                    style={{ color: UI_COLORS.storyPanel.textSecondary }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = THEME.surface.elevated;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                    onClick={() => {
                      if (f.chunkIds[0]) jumpToChunk(f.chunkIds[0]);
                    }}
                  >
                    <span className="font-semibold" style={{ color: UI_COLORS.storyPanel.textPrimary }}>
                      {f.entity}
                    </span>
                    : {f.attribute} = {f.value}
                  </button>
                </li>
              ))}
            </ul>
            <div className="pt-2 space-y-2">
              <h3
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: UI_COLORS.storyPanel.textMuted }}
              >
                Объекты по жизненному циклу
              </h3>
              {(
                [
                  ["ephemeral", "Временные", lifecycleBuckets.ephemeral],
                  ["recurring", "Повторяющиеся", lifecycleBuckets.recurring],
                  ["long_term", "Долгосрочные", lifecycleBuckets.long_term],
                ] as const
              ).map(([key, title, list]) => (
                <section key={key} className="space-y-1.5">
                  <p className="text-[11px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                    {title} ({list.length})
                  </p>
                  {list.length === 0 ? (
                    <p className="text-[11px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                      —
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {list.slice(0, 8).map((item: (typeof list)[number]) => (
                        <li
                          key={item.key}
                          className="rounded px-2 py-1.5 text-[11px]"
                          style={{
                            border: `1px solid ${THEME.surface.inputBorder}`,
                            background: THEME.surface.card,
                            color: UI_COLORS.storyPanel.textSecondary,
                          }}
                        >
                          <span style={{ color: UI_COLORS.storyPanel.textPrimary }} className="font-semibold">
                            {item.name}
                          </span>{" "}
                          · {item.entityType}
                          {item.narrativeRole ? ` · ${item.narrativeRole}` : ""}
                          {` · scenes: ${item.sceneCount}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </div>
        )}

        {tab === "conflicts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3
                className="text-[13px] font-semibold tracking-tight"
                style={{ color: UI_COLORS.storyPanel.textPrimary }}
              >
                Конфликты сюжета
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                  режим: {conflictStrictness}
                </span>
                {hiddenWarningsCount > 0 && (
                  <span className="text-[10px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                    скрыто фильтром: {hiddenWarningsCount}
                  </span>
                )}
                <select
                  value={continuityFilter}
                  onChange={(e) => setContinuityFilter(e.target.value as typeof continuityFilter)}
                  className="text-[11px] rounded px-2 py-1 max-w-[140px]"
                  style={{
                    border: `1px solid ${THEME.surface.inputBorder}`,
                    background: THEME.surface.input,
                    color: UI_COLORS.storyPanel.textPrimary,
                  }}
                >
                  <option value="all">все</option>
                  <option value="new">новые</option>
                  <option value="acknowledged">приняты в работу</option>
                  <option value="resolved">решённые</option>
                  <option value="ignored">игнор</option>
                </select>
              </div>
            </div>
            {filteredWarnings.length === 0 ? (
              <p className="text-[12px] leading-[1.5]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                {showDemoInsights
                  ? "Когда появится больше текста, система начнет показывать потенциальные конфликты автоматически."
                  : "Нет конфликтов для выбранного фильтра."}
              </p>
            ) : (
              <div className="space-y-4">
                {(
                  [
                    ["fact", "Факты", warningsByKind.fact],
                    ["timeline", "Таймлайн", warningsByKind.timeline],
                    ["causal", "Причинность", warningsByKind.causal],
                  ] as const
                ).map(([key, title, list]) => (
                  <section key={key} className="space-y-2">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: UI_COLORS.storyPanel.textMuted }}
                    >
                      {title} ({list.length})
                    </p>
                    {list.map((w) => {
                      const status = warningStatuses[w.key] ?? "new";
                      const uniqueSourceChunkIds = [
                        ...new Set([...w.previousChunkIds, ...w.newChunkIds]),
                      ].slice(0, 4);
                      return (
                        <div
                          key={w.id}
                          className="rounded-md pl-0 pr-3 py-3 text-[12px] space-y-2 leading-[1.5]"
                          style={{
                            borderTop: `1px solid ${THEME.surface.inputBorder}`,
                            borderRight: `1px solid ${THEME.surface.inputBorder}`,
                            borderBottom: `1px solid ${THEME.surface.inputBorder}`,
                            borderLeft: `3px solid ${THEME.warning.stripe}`,
                            background: THEME.surface.card,
                            color: UI_COLORS.storyPanel.textSecondary,
                          }}
                        >
                          <p style={{ color: UI_COLORS.storyPanel.textPrimary }}>{w.message}</p>
                          <div className="flex items-center gap-2 text-[10px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                            <span>
                              источник:{" "}
                              {SOURCE_LABEL[w.source]}
                            </span>
                            <span>уверенность: {(w.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <div
                            className="rounded px-2 py-1 text-[11px]"
                            style={{
                              border: `1px solid ${THEME.surface.inputBorder}`,
                              background: THEME.surface.input,
                              color: UI_COLORS.storyPanel.textSecondary,
                            }}
                          >
                            <strong>Почему конфликт:</strong> было «{w.previousValue}», стало «{w.newValue}».
                          </div>
                          {w.evidence && (
                            <div
                              className="rounded px-2 py-1.5 text-[11px] space-y-1"
                              style={{
                                border: `1px dashed ${THEME.surface.inputBorder}`,
                                background: THEME.surface.input,
                              }}
                            >
                              <p>«{w.evidence.quoteA}»</p>
                              <p>«{w.evidence.quoteB}»</p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {uniqueSourceChunkIds.map((chunkId) => (
                              <button
                                key={`${w.id}-${chunkId}`}
                                type="button"
                                onClick={() => jumpToChunk(chunkId)}
                                className="px-2 py-1 rounded text-[10px] font-medium border transition-colors"
                                style={{
                                  borderColor: THEME.warning.border,
                                  color: THEME.warning.text,
                                  background: THEME.warning.subtleBg,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "rgba(251, 191, 36, 0.14)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = THEME.warning.subtleBg;
                                }}
                              >
                                фрагмент: {chunkLookup[chunkId]?.label ?? chunkId}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                              статус:
                            </span>
                            <span className="text-[10px] font-medium" style={{ color: UI_COLORS.storyPanel.textSecondary }}>
                              {STATUS_LABEL[status]}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 pt-0.5">
                            <button
                              type="button"
                              onClick={() => void suggestFix(w.key)}
                              disabled={!editor}
                              className="px-2.5 py-1 rounded text-white text-[11px] font-medium"
                              style={{ background: UI_COLORS.accentPrimaryBg }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = UI_COLORS.accentPrimaryHover;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = UI_COLORS.accentPrimaryBg;
                              }}
                            >
                              {editor ? "предложить правку" : "редактор недоступен"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </section>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "graph" && (
          <div className="space-y-3">
            <h3
              className="text-[13px] font-semibold tracking-tight"
              style={{ color: UI_COLORS.storyPanel.textPrimary }}
            >
              Story Graph
            </h3>
            <p className="text-[12px] leading-[1.45]" style={{ color: UI_COLORS.storyPanel.textSecondary }}>
              Открыт полноэкранный визуальный граф. Выбирайте узлы, смотрите связи и переходите к нужным фрагментам.
            </p>
          </div>
        )}

        {tab === "problems" && (
          <div className="space-y-4">
            <h3
              className="text-[13px] font-semibold tracking-tight"
              style={{ color: UI_COLORS.storyPanel.textPrimary }}
            >
              Problem Panel
            </h3>
            <p className="text-[11px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
              Автоматический аудит логики сцены и проекта.
            </p>
            <ul className="space-y-2">
              {problemItems.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md p-3 space-y-1.5"
                  style={{
                    border: `1px solid ${THEME.surface.inputBorder}`,
                    background: THEME.surface.card,
                  }}
                >
                  <p className="text-[12px] font-semibold" style={{ color: UI_COLORS.storyPanel.textPrimary }}>
                    {item.category}: {item.title}
                  </p>
                  <p className="text-[11px]" style={{ color: UI_COLORS.storyPanel.textSecondary }}>
                    {item.explanation}
                  </p>
                  {item.reasoningTrace && (
                    <p className="text-[10px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                      {item.reasoningTrace}
                    </p>
                  )}
                  {item.evidenceQuote && (
                    <p className="text-[10px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                      «{item.evidenceQuote}»
                    </p>
                  )}
                  <div className="flex gap-1.5 flex-wrap">
                    {item.relatedChunkIds.slice(0, 3).map((chunkId) => (
                      <button
                        key={`${item.id}-${chunkId}`}
                        type="button"
                        onClick={() => jumpToChunk(chunkId)}
                        className="px-2 py-1 rounded text-[10px] border"
                        style={{
                          borderColor: THEME.warning.border,
                          color: THEME.warning.text,
                          background: THEME.warning.subtleBg,
                        }}
                      >
                        сцена/фрагмент
                      </button>
                    ))}
                    {item.warningKey && (
                      <button
                        type="button"
                        onClick={() => {
                          setTab("conflicts");
                          const match = consistencyWarnings.find((w) => w.key === item.warningKey);
                          const chunkId = match?.newChunkIds[0] ?? match?.previousChunkIds[0];
                          if (chunkId) jumpToChunk(chunkId);
                        }}
                        className="px-2 py-1 rounded text-[10px] border"
                        style={{
                          borderColor: THEME.surface.inputBorder,
                          color: UI_COLORS.storyPanel.textSecondary,
                          background: "transparent",
                        }}
                      >
                        открыть конфликт
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {problemItems.length === 0 && (
              <p className="text-[12px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                Проблем не обнаружено для текущего контекста.
              </p>
            )}
          </div>
        )}

        {tab === "timeline" && (
          <div className="space-y-4">
            <h3
              className="text-[13px] font-semibold tracking-tight"
              style={{ color: UI_COLORS.storyPanel.textPrimary }}
            >
              Таймлайн / Радар ружей
            </h3>
            {relations.length > 0 && (
              <ul className="space-y-2">
                {relations.slice(0, 10).map((r) => (
                  <li
                    key={r.id}
                    className="rounded-md p-3 text-[12px] leading-[1.5]"
                    style={{
                      border: `1px solid ${THEME.surface.inputBorder}`,
                      background: THEME.surface.card,
                    }}
                  >
                    <span className="font-semibold" style={{ color: UI_COLORS.storyPanel.textPrimary }}>
                      {r.entityA}
                    </span>
                    <span className="mx-1" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                      —
                    </span>
                    <span style={{ color: THEME.warning.text }}>{r.relation}</span>
                    <span className="mx-1" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                      →
                    </span>
                    <span className="font-semibold" style={{ color: UI_COLORS.storyPanel.textPrimary }}>
                      {r.entityB}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {chekhovWarnings.length === 0 ? (
              <p className="text-[12px] leading-[1.5]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                Нет предупреждений или запустите «Анализ сюжета».
              </p>
            ) : (
              <ul className="space-y-2">
                {chekhovWarnings.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-md pl-0 pr-3 py-3 text-[12px] leading-[1.5]"
                    style={{
                      borderTop: `1px solid ${THEME.surface.inputBorder}`,
                      borderRight: `1px solid ${THEME.surface.inputBorder}`,
                      borderBottom: `1px solid ${THEME.surface.inputBorder}`,
                      borderLeft: `3px solid ${THEME.warning.stripe}`,
                      background: THEME.surface.card,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => jumpToChunk(c.introducedChunkId)}
                      className="font-semibold underline decoration-dotted text-left"
                      style={{ color: THEME.accent.primaryBorder }}
                    >
                      {c.objectName}
                    </button>
                    <p className="text-[12px] mt-1.5" style={{ color: UI_COLORS.storyPanel.textSecondary }}>
                      {c.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "resolutions" && (
          <div className="space-y-4">
            <h3
              className="text-[13px] font-semibold tracking-tight"
              style={{ color: UI_COLORS.storyPanel.textPrimary }}
            >
              Очередь исправлений ({unresolvedWarnings.length})
            </h3>
            {consistencyWarnings.length === 0 ? (
              <p className="text-[12px] leading-[1.5]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                Пока нет предупреждений для разрешения.
              </p>
            ) : (
              <ul className="space-y-3">
                {consistencyWarnings.map((w) => {
                  const status = warningStatuses[w.key] ?? "new";
                  const suggestions = fixSuggestionsByWarningKey[w.key] ?? [];
                  const preview = fixPreviewByWarningKey[w.key] ?? null;
                  const applyState = fixApplyStateByWarningKey[w.key];
                  const secondaryBtn =
                    "px-2 py-1 rounded-md text-[11px] font-medium border transition-colors";
                  const secondaryStyle: CSSProperties = {
                    borderColor: THEME.surface.inputBorder,
                    color: UI_COLORS.storyPanel.textSecondary,
                    background: "transparent",
                  };
                  return (
                    <li
                      key={w.id}
                      className="rounded-md p-3 text-[12px] space-y-2 leading-[1.5]"
                      style={{
                        border: `1px solid ${THEME.surface.inputBorder}`,
                        background: THEME.surface.card,
                      }}
                    >
                      <p style={{ color: UI_COLORS.storyPanel.textPrimary }}>{w.message}</p>
                      <div
                        className="flex items-center gap-1 text-[10px]"
                        style={{ color: UI_COLORS.storyPanel.textMuted }}
                      >
                        {status === "new" && <CircleDot size={11} />}
                        {status === "acknowledged" && <Clock3 size={11} />}
                        {status === "resolved" && <CheckCircle2 size={11} />}
                        {status === "ignored" && <Ban size={11} />}
                        <span style={{ color: UI_COLORS.storyPanel.textSecondary }}>
                          {STATUS_LABEL[status]}
                        </span>
                        {applyState?.verificationState === "awaiting_recheck" && (
                          <span style={{ color: THEME.warning.text }}>
                            · перепроверка после правки
                          </span>
                        )}
                        {applyState?.verificationState === "verified_resolved" && (
                          <span style={{ color: THEME.success.text }}>
                            · подтверждено повторной проверкой
                          </span>
                        )}
                      </div>
                      <p className="text-[11px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                        Почему конфликт: было «{w.previousValue}», стало «{w.newValue}».
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setWarningStatus(w.key, "acknowledged")}
                          className={secondaryBtn}
                          style={secondaryStyle}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = THEME.accent.subtleBg;
                            e.currentTarget.style.borderColor = THEME.accent.primaryBorder;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.borderColor = THEME.surface.inputBorder;
                          }}
                        >
                          в работу
                        </button>
                        <button
                          type="button"
                          onClick={() => setWarningStatus(w.key, "ignored")}
                          className={secondaryBtn}
                          style={secondaryStyle}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = THEME.surface.elevated;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          игнор
                        </button>
                        {w.newChunkIds[0] && (
                          <button
                            type="button"
                            onClick={() => jumpToChunk(w.newChunkIds[0])}
                            className={secondaryBtn}
                            style={{
                              ...secondaryStyle,
                              borderColor: THEME.warning.border,
                              color: THEME.warning.text,
                              background: THEME.warning.subtleBg,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(251, 191, 36, 0.14)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = THEME.warning.subtleBg;
                            }}
                          >
                            к фрагменту
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void suggestFix(w.key)}
                          disabled={!editor}
                          className="px-2.5 py-1 rounded-md text-white text-[11px] font-medium"
                          style={{ background: UI_COLORS.accentPrimaryBg }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = UI_COLORS.accentPrimaryHover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = UI_COLORS.accentPrimaryBg;
                          }}
                        >
                          {editor ? "предложить правку" : "редактор недоступен"}
                        </button>
                      </div>
                      {(applyState?.error || suggestions.length > 0) && (
                        <div
                          className="rounded-md p-3 space-y-2"
                          style={{
                            border: `1px solid ${THEME.accent.primaryBorder}`,
                            background: THEME.accent.subtleBg,
                          }}
                        >
                          {applyState?.error && (
                            <p className="text-[11px] leading-[1.45]" style={{ color: THEME.danger.text }}>
                              {applyState.error}
                            </p>
                          )}
                          {applyState?.note && (
                            <p className="text-[11px] leading-[1.45]" style={{ color: UI_COLORS.storyPanel.textSecondary }}>
                              {applyState.note}
                            </p>
                          )}
                          {suggestions.length > 0 && (
                            <div className="space-y-1.5">
                              {suggestions.map((suggestion) => {
                                const selected = preview?.id === suggestion.id;
                                return (
                                  <button
                                    key={suggestion.id}
                                    type="button"
                                    onClick={() => setFixPreview(w.key, suggestion)}
                                    className="w-full text-left rounded-md border px-2.5 py-2 text-[11px] leading-[1.45] transition-colors"
                                    style={{
                                      borderColor: selected
                                        ? THEME.accent.primaryBorder
                                        : THEME.surface.inputBorder,
                                      background: selected ? THEME.surface.card : THEME.surface.input,
                                      color: UI_COLORS.storyPanel.textSecondary,
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!selected) e.currentTarget.style.background = THEME.surface.elevated;
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!selected) e.currentTarget.style.background = THEME.surface.input;
                                    }}
                                  >
                                    <p className="font-semibold" style={{ color: UI_COLORS.storyPanel.textPrimary }}>
                                      {suggestion.title}
                                    </p>
                                    <p style={{ color: UI_COLORS.storyPanel.textMuted }}>
                                      Тип:{" "}
                                      {suggestion.editKind === "replace"
                                        ? "точечная замена"
                                        : "вставка заметки в текст"}
                                    </p>
                                    <p style={{ color: UI_COLORS.storyPanel.textMuted }}>{suggestion.reason}</p>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {preview && (
                            <div
                              className="rounded-md p-3 space-y-2"
                              style={{
                                border: `1px solid ${THEME.surface.inputBorder}`,
                                background: THEME.surface.card,
                              }}
                            >
                              <p
                                className="text-[11px] font-semibold"
                                style={{ color: UI_COLORS.storyPanel.textPrimary }}
                              >
                                Предпросмотр правки
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-[10px] mb-1" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                                    До
                                  </p>
                                  <p
                                    className="text-[11px] whitespace-pre-wrap max-h-24 overflow-y-auto leading-[1.45]"
                                    style={{ color: UI_COLORS.storyPanel.textSecondary }}
                                  >
                                    {preview.beforeText}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] mb-1" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                                    После
                                  </p>
                                  <p
                                    className="text-[11px] whitespace-pre-wrap max-h-24 overflow-y-auto leading-[1.45]"
                                    style={{ color: UI_COLORS.storyPanel.textSecondary }}
                                  >
                                    {preview.afterText}
                                  </p>
                                </div>
                              </div>
                              <p className="text-[10px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                                Проверка диапазона:{" "}
                                {applyState?.rangeValidation === "valid"
                                  ? "валиден"
                                  : applyState?.rangeValidation === "stale"
                                    ? "устарел, пересоздайте предложение"
                                    : "ожидает проверки"}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  disabled={
                                    applyState?.loading ||
                                    applyState?.rangeValidation === "stale"
                                  }
                                  onClick={() => void applyFix(w.key, preview.id)}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-medium border disabled:opacity-50"
                                  style={{
                                    borderColor: THEME.success.border,
                                    color: THEME.success.text,
                                    background: THEME.success.subtleBg,
                                  }}
                                >
                                  {applyState?.loading ? "применяю..." : "применить вручную"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => clearFixState(w.key)}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-medium border"
                                  style={secondaryStyle}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = THEME.surface.elevated;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "transparent";
                                  }}
                                >
                                  отклонить
                                </button>
                                {applyState?.appliedAt && (
                                  <span
                                    className="text-[10px] inline-flex items-center px-1"
                                    style={{ color: THEME.success.text }}
                                  >
                                    исправлено
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
