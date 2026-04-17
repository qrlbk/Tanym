"use client";

import { useEffect, useRef } from "react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { usePlotIndex } from "@/hooks/usePlotIndex";
import { usePlotStoryAutoAnalyze } from "@/hooks/usePlotStoryAutoAnalyze";
import { useSceneSummaries } from "@/hooks/useSceneSummaries";
import { useUIStore } from "@/stores/uiStore";
import { useProjectStore } from "@/stores/projectStore";
import { ingestProjectIndex } from "@/lib/plot-index/ingest";
import { usePlotIndexStore } from "@/stores/plotIndexStore";
import { usePlotStoryStore } from "@/stores/plotStoryStore";
import { sceneContentToPlainText } from "@/lib/ai/addressing";
import {
  computeSceneChunksFromText,
  sceneTextFingerprint,
} from "@/lib/plot-index/chunks";
import { fetchPlotExtractionForChunks } from "@/lib/plot-index/plot-extract-client";
import { factsForCharacter } from "@/lib/project/character-presence";
import { buildFactsBlobForDraft } from "@/lib/ai/character-excerpts";
import {
  classifyCharacterPatchImpact,
  type CharacterDraftPatch,
} from "@/lib/project/character-auto-policy";
import { useAIStore } from "@/stores/aiStore";
import {
  buildPersistedPlotStory,
  loadPlotStory,
  savePlotStory,
} from "@/lib/plot-story-persistence";

export default function PlotIndexBridge() {
  const editor = useEditorContext();
  const activeSceneId = useUIStore((s) => s.activeSceneId);
  const project = useProjectStore((s) => s.project);
  const getSceneById = useProjectStore((s) => s.getSceneById);
  const getChapterBySceneId = useProjectStore((s) => s.getChapterBySceneId);
  const scene = activeSceneId ? getSceneById(activeSceneId) : null;
  const chapter = activeSceneId ? getChapterBySceneId(activeSceneId) : null;

  usePlotIndex(editor);
  useSceneSummaries();
  usePlotStoryAutoAnalyze(editor, {
    sceneId: scene?.id ?? null,
    sceneTitle: scene?.title ?? null,
    chapterId: chapter?.id ?? null,
    chapterTitle: chapter?.title ?? null,
  });

  // Hydrate plot story memory from IDB when switching projects.
  const hydratedProjectRef = useRef<string | null>(null);
  useEffect(() => {
    if (!project) return;
    if (hydratedProjectRef.current === project.id) return;
    hydratedProjectRef.current = project.id;
    let cancelled = false;
    void loadPlotStory(project.id).then((data) => {
      if (cancelled || !data) return;
      usePlotStoryStore.getState().hydrateFromPersistence(data);
    });
    return () => {
      cancelled = true;
    };
  }, [project]);

  // Debounced save of plot story memory to IDB on change.
  useEffect(() => {
    if (!project) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = usePlotStoryStore.subscribe((state) => {
      if (!project) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void savePlotStory(project.id, buildPersistedPlotStory(state));
      }, 800);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [project]);

  const ranInitialProjectIngest = useRef<string | null>(null);
  useEffect(() => {
    if (!project) return;
    if (ranInitialProjectIngest.current === project.id) return;
    ranInitialProjectIngest.current = project.id;
    const abort = new AbortController();
    void ingestProjectIndex(
      project,
      { projectId: project.id, signal: abort.signal, concurrency: 3 },
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
    ).catch((e: unknown) => {
      if (e instanceof DOMException && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : String(e);
      usePlotIndexStore.getState().setIngestState({
        ingestPhase: "error",
        indexError: msg,
      });
    });
    return () => {
      abort.abort();
    };
  }, [project]);

  const lastAutoAnalyzeAt = usePlotStoryStore((s) => s.lastAutoAnalyzeAt);
  const lastProjectReconcileAt = usePlotStoryStore((s) => s.lastProjectReconcileAt);
  const reconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconcilingRef = useRef(false);
  const reconcileCursorRef = useRef(0);
  useEffect(() => {
    if (!project || !lastAutoAnalyzeAt) return;
    if (reconcileTimerRef.current) clearTimeout(reconcileTimerRef.current);
    reconcileTimerRef.current = setTimeout(() => {
      if (reconcilingRef.current) return;
      const now = Date.now();
      if (
        lastProjectReconcileAt &&
        now - lastProjectReconcileAt < 12_000
      ) {
        return;
      }
      const allScenes = project.chapters.flatMap((chapter) =>
        chapter.scenes.map((scene) => ({ scene, chapter })),
      );
      if (allScenes.length === 0) return;
      reconcilingRef.current = true;
      usePlotStoryStore.getState().setAutoState({ autoBusy: true });
      usePlotStoryStore.getState().setAnalysisState({
        analysisPhase: "analyzing",
        analysisMessage: "Сверяю контекст между сценами…",
        analysisError: null,
      });
      const batchSize = Math.min(4, allScenes.length);
      const selected: Array<(typeof allScenes)[number]> = [];
      for (let i = 0; i < batchSize; i++) {
        const idx = (reconcileCursorRef.current + i) % allScenes.length;
        selected.push(allScenes[idx]);
      }
      reconcileCursorRef.current =
        (reconcileCursorRef.current + batchSize) % allScenes.length;

      void (async () => {
        try {
          for (const { scene, chapter } of selected) {
            const text = sceneContentToPlainText(scene.content).trim();
            if (text.length < 120) continue;
            const fp = sceneTextFingerprint(text);
            const cached = usePlotIndexStore.getState().sceneCache[scene.id];
            if (cached?.fingerprint === fp) continue;
            const chunks = computeSceneChunksFromText({
              sceneId: scene.id,
              sceneTitle: scene.title,
              chapterId: chapter.id,
              chapterTitle: chapter.title,
              text,
            });
            const data = await fetchPlotExtractionForChunks(chunks);
            usePlotStoryStore
              .getState()
              .mergeSceneExtraction(scene.id, data, chunks);
            usePlotIndexStore.getState().setSceneCacheEntry(scene.id, {
              fingerprint: fp,
              entities: data.facts.map((fact) => fact.entity),
              lastAnalyzedAt: Date.now(),
            });
          }
          usePlotStoryStore.getState().setAutoState({
            autoBusy: false,
            lastProjectReconcileAt: Date.now(),
          });
          usePlotStoryStore.getState().setAnalysisState({
            analysisPhase: "ready",
            analysisMessage: "Автосверка сцен обновлена",
            analysisError: null,
            lastAnalyzedAt: Date.now(),
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          usePlotStoryStore.getState().setAutoState({ autoBusy: false });
          usePlotStoryStore.getState().setAnalysisState({
            analysisPhase: "error",
            analysisMessage: "Автосверка сцен временно недоступна",
            analysisError: message,
          });
        } finally {
          reconcilingRef.current = false;
        }
      })();
    }, 2200);
    return () => {
      if (reconcileTimerRef.current) clearTimeout(reconcileTimerRef.current);
    };
  }, [lastAutoAnalyzeAt, lastProjectReconcileAt, project]);

  const patchRunRef = useRef<string>("");
  useEffect(() => {
    if (!project || !lastAutoAnalyzeAt || !activeSceneId) return;
    const key = `${project.id}:${activeSceneId}:${lastAutoAnalyzeAt}`;
    if (patchRunRef.current === key) return;
    patchRunRef.current = key;
    const profiles = project.characterProfiles.slice(0, 8);
    if (profiles.length === 0) return;
    const facts = usePlotStoryStore.getState().facts;
    const providerId = useAIStore.getState().providerId;
    const run = async () => {
      for (const profile of profiles) {
        const rel = factsForCharacter(facts, profile.displayName, profile.aliases);
        if (rel.length === 0) continue;
        const res = await fetch("/api/ai/character-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerId,
            displayName: profile.displayName,
            factsBlob: buildFactsBlobForDraft(rel),
            excerptsBlob: "",
            mode: "structure",
          }),
        });
        if (!res.ok) continue;
        const data = (await res.json()) as {
          sections?: CharacterDraftPatch["sections"];
          role?: string | null;
          confidence?: number;
          reasons?: string[];
        };
        const draftPatch: CharacterDraftPatch = {
          profileId: profile.id,
          sections: data.sections ?? {},
          role: data.role ?? null,
          confidence:
            typeof data.confidence === "number"
              ? Math.max(0, Math.min(1, data.confidence))
              : 0.5,
          reasons: data.reasons ?? [],
          generatedAt: Date.now(),
        };
        const impact = classifyCharacterPatchImpact(profile, draftPatch);
        if (impact.impact === "important") {
          useProjectStore.getState().queuePendingCharacterPatch({
            id: `pending-${profile.id}-${Date.now()}`,
            profileId: profile.id,
            sections: draftPatch.sections,
            role: draftPatch.role,
            confidence: draftPatch.confidence,
            reasons: [
              ...draftPatch.reasons,
              ...impact.reasons,
            ],
            impact: "important",
            sourceSceneId: activeSceneId,
            createdAt: Date.now(),
          });
        } else {
          useProjectStore.getState().updateCharacterProfile(profile.id, {
            sections: {
              ...profile.sections,
              ...draftPatch.sections,
            },
            role: draftPatch.role ?? profile.role,
          });
        }
      }
    };
    void run();
  }, [activeSceneId, lastAutoAnalyzeAt, project]);

  return null;
}
