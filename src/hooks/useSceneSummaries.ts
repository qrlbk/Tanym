"use client";

import { useEffect, useRef } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { sceneContentToPlainText } from "@/lib/ai/addressing";
import {
  computeSceneSummaryHash,
  fetchSceneSummary,
} from "@/lib/ai/summaries";

const MIN_CHARS_FOR_SUMMARY = 160;
const DEBOUNCE_MS = 4_000;
const MAX_PARALLEL = 1;

/**
 * Background auto-summariser. Watches the `projectStore` and lazily generates
 * one-sentence synopses for scenes whose text has changed since the last
 * summarisation, up to a small concurrency budget to stay friendly to the
 * API quota.
 */
export function useSceneSummaries() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const run = async () => {
      const project = useProjectStore.getState().project;
      if (!project) return;
      const todo: Array<{
        sceneId: string;
        chapterTitle: string | null;
        sceneTitle: string;
        text: string;
        hash: string;
      }> = [];
      for (const chapter of project.chapters) {
        for (const scene of chapter.scenes) {
          if (inflightRef.current.has(scene.id)) continue;
          const text = sceneContentToPlainText(scene.content);
          if (text.length < MIN_CHARS_FOR_SUMMARY) continue;
          const hash = computeSceneSummaryHash(text);
          if (scene.summary && scene.summaryHash === hash) continue;
          todo.push({
            sceneId: scene.id,
            chapterTitle: chapter.title,
            sceneTitle: scene.title,
            text,
            hash,
          });
          if (todo.length >= MAX_PARALLEL) break;
        }
        if (todo.length >= MAX_PARALLEL) break;
      }
      if (todo.length === 0) return;

      await Promise.all(
        todo.map(async (item) => {
          inflightRef.current.add(item.sceneId);
          try {
            const summary = await fetchSceneSummary({
              text: item.text,
              sceneTitle: item.sceneTitle,
              chapterTitle: item.chapterTitle,
            });
            useProjectStore
              .getState()
              .setSceneSummary(item.sceneId, summary, item.hash);
          } catch {
            // Silent. The next change will retry.
          } finally {
            inflightRef.current.delete(item.sceneId);
          }
        }),
      );
      // keep draining
      schedule();
    };

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void run(), DEBOUNCE_MS);
    };

    const unsub = useProjectStore.subscribe(() => schedule());
    schedule();
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
