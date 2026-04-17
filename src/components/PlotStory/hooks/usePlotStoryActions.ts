"use client";

import { useCallback, useState } from "react";
import type { Editor } from "@tiptap/core";
import { semanticSearchPlot, ingestPlotIndex } from "@/lib/plot-index/ingest";
import { usePlotIndexStore } from "@/stores/plotIndexStore";
import { usePlotStoryStore } from "@/stores/plotStoryStore";
import {
  fetchPlotExtraction,
  fetchPlotExtractionForChunks,
} from "@/lib/plot-index/plot-extract-client";
import {
  computePlotChunks,
  computeSceneChunksFromText,
} from "@/lib/plot-index/chunks";
import { idbGetAllChunks } from "@/lib/plot-index/vector-idb";
import { useProjectStore } from "@/stores/projectStore";
import { notifyMissingCharacterCardsIfNeeded } from "@/lib/project/character-card-toasts";

export type ChunkLookupEntry = { from: number; label: string };
export type ChunkLookup = Record<string, ChunkLookupEntry>;

/**
 * Hook с чистыми действиями PlotStory panel: поиск, переиндексация, анализ.
 * Извлечён из `PlotStoryPanel.tsx` как часть фазы 4 рефакторинга.
 *
 * НЕ включает UI-состояние таба и фильтров — они остаются в компоненте.
 */
export function usePlotStoryActions(params: {
  editor: Editor | null;
  activeSceneId: string | null;
}) {
  const { editor, activeSceneId } = params;

  const getSceneById = useProjectStore((s) => s.getSceneById);
  const getChapterBySceneId = useProjectStore((s) => s.getChapterBySceneId);

  const applyFullExtraction = usePlotStoryStore((s) => s.applyFullExtraction);
  const mergeSceneExtraction = usePlotStoryStore((s) => s.mergeSceneExtraction);
  const setExtractionError = usePlotStoryStore((s) => s.setExtractionError);
  const setAnalysisState = usePlotStoryStore((s) => s.setAnalysisState);

  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [chunkLookup, setChunkLookup] = useState<ChunkLookup>({});
  const [analyzeBusy, setAnalyzeBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hits, setHits] = useState<Awaited<ReturnType<typeof semanticSearchPlot>>>([]);

  const refreshMeta = useCallback(async () => {
    try {
      const rows = await idbGetAllChunks();
      setChunkCount(rows.length);
    } catch {
      setChunkCount(null);
    }
  }, []);

  const refreshChunkLookup = useCallback(() => {
    if (!editor) return;
    const chunks = computePlotChunks(editor);
    const map = chunks.reduce<ChunkLookup>((acc, c) => {
      acc[c.id] = { from: c.from, label: c.label };
      return acc;
    }, {});
    if (activeSceneId) {
      const scene = getSceneById(activeSceneId);
      const chapter = getChapterBySceneId(activeSceneId);
      if (scene && chapter) {
        const sceneScoped = computeSceneChunksFromText({
          sceneId: scene.id,
          sceneTitle: scene.title,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          text: editor.state.doc.textContent,
        });
        for (const c of sceneScoped) {
          if (!map[c.id]) {
            map[c.id] = {
              from: c.from,
              label: c.label,
            };
          }
        }
      }
    }
    setChunkLookup(map);
  }, [activeSceneId, editor, getChapterBySceneId, getSceneById]);

  const runSearch = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) return;
      setSearching(true);
      setSearchError(null);
      try {
        const project = useProjectStore.getState().project;
        const r = await semanticSearchPlot(q, 10, {
          scope: project ? "project" : "all",
          projectId: project?.id ?? null,
        });
        setHits(r);
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : String(e));
        setHits([]);
      } finally {
        setSearching(false);
      }
    },
    [],
  );

  const runRebuildIndex = useCallback(async () => {
    if (!editor) return;
    usePlotIndexStore.getState().setIngestState({
      ingestPhase: "embedding",
      ingestMessage: "Переиндексация…",
      indexError: null,
    });
    try {
      const project = useProjectStore.getState().project;
      const scene = activeSceneId ? getSceneById(activeSceneId) : null;
      const chapter = activeSceneId ? getChapterBySceneId(activeSceneId) : null;
      await ingestPlotIndex(
        editor,
        (p) => {
          if (p.phase === "done") {
            usePlotIndexStore.getState().setIngestState({
              ingestPhase: "done",
              ingestMessage: p.message ?? null,
              lastIndexedAt: Date.now(),
            });
          }
        },
        {
          projectId: project?.id ?? null,
          sceneId: scene?.id ?? null,
          sceneMeta: scene
            ? {
                title: scene.title,
                chapterId: chapter?.id ?? null,
                chapterTitle: chapter?.title ?? null,
              }
            : null,
        },
      );
      await refreshMeta();
    } catch (e) {
      usePlotIndexStore.getState().setIngestState({
        ingestPhase: "error",
        indexError: e instanceof Error ? e.message : String(e),
      });
    }
  }, [editor, refreshMeta, activeSceneId, getSceneById, getChapterBySceneId]);

  const runStoryAnalyze = useCallback(
    async (onDone?: () => void) => {
      if (!editor) return;
      setAnalyzeBusy(true);
      setExtractionError(null);
      setAnalysisState({
        analysisPhase: "analyzing",
        analysisMessage: "Перепроверяю сюжетную логику…",
        analysisError: null,
      });
      try {
        const scene = activeSceneId ? getSceneById(activeSceneId) : null;
        const chapter = activeSceneId ? getChapterBySceneId(activeSceneId) : null;
        if (scene && chapter) {
          const chunks = computeSceneChunksFromText({
            sceneId: scene.id,
            sceneTitle: scene.title,
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            text: editor.state.doc.textContent,
          });
          const data = await fetchPlotExtractionForChunks(chunks);
          mergeSceneExtraction(scene.id, data, chunks);
        } else {
          const data = await fetchPlotExtraction(editor);
          const chunks = computePlotChunks(editor);
          applyFullExtraction(data, chunks);
        }
        refreshChunkLookup();
        await refreshMeta();
        notifyMissingCharacterCardsIfNeeded({ force: true });
        onDone?.();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setExtractionError(message);
        setAnalysisState({
          analysisPhase: "error",
          analysisMessage: "Не удалось обновить сюжетную память",
          analysisError: message,
        });
      } finally {
        setAnalyzeBusy(false);
      }
    },
    [
      activeSceneId,
      applyFullExtraction,
      editor,
      getChapterBySceneId,
      getSceneById,
      mergeSceneExtraction,
      refreshChunkLookup,
      refreshMeta,
      setAnalysisState,
      setExtractionError,
    ],
  );

  return {
    // state
    chunkCount,
    chunkLookup,
    analyzeBusy,
    searching,
    searchError,
    hits,
    // actions
    refreshMeta,
    refreshChunkLookup,
    runSearch,
    runRebuildIndex,
    runStoryAnalyze,
    setHits,
    setSearchError,
  };
}
