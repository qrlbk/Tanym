"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import {
  computeSceneChunksFromText,
  sceneTextFingerprint,
} from "@/lib/plot-index/chunks";
import { fetchPlotExtractionForChunks } from "@/lib/plot-index/plot-extract-client";
import { usePlotStoryStore } from "@/stores/plotStoryStore";
import { usePlotIndexStore } from "@/stores/plotIndexStore";
import { notifyMissingCharacterCardsIfNeeded } from "@/lib/project/character-card-toasts";

const DEBOUNCE_MS = 2800;
const MIN_TEXT_CHARS = 120;

/**
 * Keeps story memory refreshed in the background after typing pauses.
 */
export function usePlotStoryAutoAnalyze(
  editor: Editor | null,
  sceneContext: {
    sceneId: string | null;
    sceneTitle: string | null;
    chapterId: string | null;
    chapterTitle: string | null;
  },
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);
  const rerunRequestedRef = useRef(false);
  const lastDoneFingerprintBySceneRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!editor || !sceneContext.sceneId) return;

    const sceneId = sceneContext.sceneId;
    let disposed = false;

    const execute = () => {
      if (disposed) return;
      const text = editor.state.doc.textContent.trim();
      if (text.length < MIN_TEXT_CHARS) {
        return;
      }
      const fp = sceneTextFingerprint(text);
      if (fp === lastDoneFingerprintBySceneRef.current[sceneId]) {
        return;
      }
      const cached = usePlotIndexStore.getState().sceneCache[sceneId];
      if (cached?.fingerprint === fp) return;
      if (runningRef.current) {
        rerunRequestedRef.current = true;
        return;
      }
      runningRef.current = true;
      usePlotStoryStore.getState().setAutoState({ autoBusy: true });
      usePlotStoryStore.getState().setAnalysisState({
        analysisPhase: "analyzing",
        analysisMessage: "Проверяю сцену в фоне…",
        analysisError: null,
      });
      const chunks = computeSceneChunksFromText({
        sceneId,
        sceneTitle: sceneContext.sceneTitle ?? "Scene",
        chapterId: sceneContext.chapterId,
        chapterTitle: sceneContext.chapterTitle,
        text,
      });
      void fetchPlotExtractionForChunks(chunks)
        .then((data) => {
          usePlotStoryStore
            .getState()
            .mergeSceneExtraction(sceneId, data, chunks);
          lastDoneFingerprintBySceneRef.current[sceneId] = fp;
          usePlotIndexStore.getState().setSceneCacheEntry(sceneId, {
            fingerprint: fp,
            entities: data.facts.map((fact) => fact.entity),
            lastAnalyzedAt: Date.now(),
          });
          usePlotStoryStore.getState().setAutoState({
            autoBusy: false,
            lastAutoAnalyzeAt: Date.now(),
          });
          notifyMissingCharacterCardsIfNeeded();
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          usePlotStoryStore.getState().setExtractionError(message);
          usePlotStoryStore.getState().setAnalysisState({
            analysisPhase: "error",
            analysisMessage: "Не удалось обновить сюжетную память",
            analysisError: message,
          });
          usePlotStoryStore.getState().setAutoState({
            autoBusy: false,
          });
        })
        .finally(() => {
          runningRef.current = false;
          if (rerunRequestedRef.current) {
            rerunRequestedRef.current = false;
            schedule(450);
          }
        });
    };

    const schedule = (delay = DEBOUNCE_MS) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        execute();
      }, delay);
    };

    const onUpdate = ({
      transaction,
    }: {
      transaction: { docChanged?: boolean };
    }) => {
      if (!transaction.docChanged) return;
      schedule();
    };

    editor.on("update", onUpdate);
    schedule(320);

    return () => {
      disposed = true;
      editor.off("update", onUpdate);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    editor,
    sceneContext.chapterId,
    sceneContext.chapterTitle,
    sceneContext.sceneId,
    sceneContext.sceneTitle,
  ]);
}
