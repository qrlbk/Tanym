"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { ingestPlotIndex } from "@/lib/plot-index/ingest";
import { usePlotIndexStore } from "@/stores/plotIndexStore";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";

const DEBOUNCE_MS = 2200;

/**
 * Debounced vector re-index after edits (semantic search / RAG foundation).
 * Scene-scoped when possible: we only re-embed chunks of the active scene,
 * leaving other scenes' vectors untouched so the project-wide index stays
 * intact after every edit.
 */
export function usePlotIndex(editor: Editor | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!editor) return;

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        const { signal } = abortRef.current;
        if (runningRef.current) return;
        runningRef.current = true;
        usePlotIndexStore.getState().setIngestState({
          ingestPhase: "embedding",
          ingestMessage: "Обновление индекса…",
          indexError: null,
        });

        const project = useProjectStore.getState().project;
        const activeSceneId = useUIStore.getState().activeSceneId;
        const chapter = activeSceneId
          ? useProjectStore.getState().getChapterBySceneId(activeSceneId)
          : null;
        const scene = activeSceneId
          ? useProjectStore.getState().getSceneById(activeSceneId)
          : null;

        void ingestPlotIndex(
          editor,
          (p) => {
            if (p.phase === "embedding") {
              usePlotIndexStore.getState().setIngestState({
                ingestPhase: "embedding",
                ingestMessage: p.message ?? null,
              });
            } else if (p.phase === "done") {
              usePlotIndexStore.getState().setIngestState({
                ingestPhase: "done",
                ingestMessage: p.message ?? null,
                lastIndexedAt: Date.now(),
                indexError: null,
              });
            }
          },
          {
            signal,
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
        )
          .catch((e: unknown) => {
            if (e instanceof DOMException && e.name === "AbortError") return;
            const msg = e instanceof Error ? e.message : String(e);
            usePlotIndexStore.getState().setIngestState({
              ingestPhase: "error",
              indexError: msg,
              ingestMessage: null,
            });
          })
          .finally(() => {
            runningRef.current = false;
          });
      }, DEBOUNCE_MS);
    };

    const onUpdate = () => schedule();
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [editor]);
}
