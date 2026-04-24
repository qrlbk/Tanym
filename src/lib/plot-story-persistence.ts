/**
 * IndexedDB persistence for `usePlotStoryStore`. Keeps facts, relations,
 * salient objects, and continuity warnings across reloads so the AI does not
 * re-extract every time the app boots.
 */

import { idbGetByKey, idbPutByKey } from "@/lib/doc-persistence";
import { isTauri } from "@/lib/tauri-helpers";
import type { PlotStoryState } from "@/stores/plotStoryStore";
import {
  normalizeConsistencyWarnings,
  normalizePlotFacts,
} from "@/lib/plot-index/story-extraction";

export const PLOT_STORY_PERSIST_VERSION = 3 as const;
export const PLOT_STORY_IDB_KEY = (projectId: string) =>
  `tanym-plot-story-v${PLOT_STORY_PERSIST_VERSION}-${projectId}`;

const LEGACY_PLOT_STORY_V2_KEY = (projectId: string) =>
  `word-plot-story-v${PLOT_STORY_PERSIST_VERSION}-${projectId}`;

type PersistKeys =
  | "facts"
  | "relations"
  | "salientObjects"
  | "consistencyWarnings"
  | "chekhovWarnings"
  | "reasoningSignals"
  | "causalChains"
  | "motivationAssessments"
  | "consequenceAssessments"
  | "warningStatuses"
  | "chunkSceneMap"
  | "lastExtractionAt"
  | "lastAnalyzedAt";

export type PersistedPlotStoryV2 = {
  version: typeof PLOT_STORY_PERSIST_VERSION;
  savedAt: string;
} & Pick<PlotStoryState, PersistKeys>;

type PersistedPlotStoryV1Legacy = Omit<PersistedPlotStoryV2, "version"> & {
  version: 1;
};

export function buildPersistedPlotStory(
  state: PlotStoryState,
): PersistedPlotStoryV2 {
  return {
    version: PLOT_STORY_PERSIST_VERSION,
    savedAt: new Date().toISOString(),
    facts: state.facts,
    relations: state.relations,
    salientObjects: state.salientObjects,
    consistencyWarnings: state.consistencyWarnings,
    chekhovWarnings: state.chekhovWarnings,
    reasoningSignals: state.reasoningSignals,
    causalChains: state.causalChains,
    motivationAssessments: state.motivationAssessments,
    consequenceAssessments: state.consequenceAssessments,
    warningStatuses: state.warningStatuses,
    chunkSceneMap: state.chunkSceneMap,
    lastExtractionAt: state.lastExtractionAt,
    lastAnalyzedAt: state.lastAnalyzedAt,
  };
}

export async function loadPlotStory(
  projectId: string | null,
): Promise<PersistedPlotStoryV2 | null> {
  if (!projectId) return null;
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const raw = await invoke<string | null>("get_plot_memory", {
        projectId,
      });
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedPlotStoryV2;
      if (parsed?.version !== PLOT_STORY_PERSIST_VERSION) return null;
      return {
        ...parsed,
        facts: normalizePlotFacts(parsed.facts ?? []),
        consistencyWarnings: normalizeConsistencyWarnings(
          parsed.consistencyWarnings ?? [],
        ),
      };
    } catch {
      // fallback to IDB path below
    }
  }
  if (typeof indexedDB === "undefined") return null;
  try {
    const latestRaw =
      (await idbGetByKey(PLOT_STORY_IDB_KEY(projectId))) ??
      (await idbGetByKey(LEGACY_PLOT_STORY_V2_KEY(projectId)));
    if (latestRaw) {
      const parsed = JSON.parse(latestRaw) as PersistedPlotStoryV2;
      if (parsed?.version !== PLOT_STORY_PERSIST_VERSION) return null;
      return {
        ...parsed,
        facts: normalizePlotFacts(parsed.facts ?? []),
        consistencyWarnings: normalizeConsistencyWarnings(
          parsed.consistencyWarnings ?? [],
        ),
      };
    }
    const legacyKey = `word-plot-story-v1-${projectId}`;
    const legacyRaw = await idbGetByKey(legacyKey);
    if (!legacyRaw) return null;
    const legacy = JSON.parse(legacyRaw) as PersistedPlotStoryV1Legacy;
    if (legacy?.version !== 1) return null;
    return {
      ...legacy,
      version: PLOT_STORY_PERSIST_VERSION,
      facts: normalizePlotFacts(legacy.facts ?? []),
      consistencyWarnings: normalizeConsistencyWarnings(
        legacy.consistencyWarnings ?? [],
      ),
    };
  } catch {
    return null;
  }
}

export async function savePlotStory(
  projectId: string | null,
  data: PersistedPlotStoryV2,
): Promise<void> {
  if (!projectId) return;
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("set_plot_memory", {
        projectId,
        payloadJson: JSON.stringify(data),
      });
      return;
    } catch {
      // fallback to IDB path below
    }
  }
  if (typeof indexedDB === "undefined") return;
  try {
    await idbPutByKey(JSON.stringify(data), PLOT_STORY_IDB_KEY(projectId));
  } catch (e) {
    console.warn("savePlotStory failed:", e);
  }
}

export type PersistedSceneCacheEntry = {
  sceneId: string;
  fingerprint: string;
  entities: string[];
  lastAnalyzedAt: number;
};

export async function loadSceneCacheFromSqlite(
  projectId: string | null,
): Promise<Record<string, PersistedSceneCacheEntry>> {
  if (!projectId || !isTauri()) return {};
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const rows = await invoke<
      Array<{
        scene_id: string;
        fingerprint: string;
        entities: string[];
        last_analyzed_at: number;
      }>
    >("get_scene_cache_entries", {
      projectId,
    });
    return rows.reduce<Record<string, PersistedSceneCacheEntry>>((acc, row) => {
      acc[row.scene_id] = {
        sceneId: row.scene_id,
        fingerprint: row.fingerprint,
        entities: row.entities ?? [],
        lastAnalyzedAt: row.last_analyzed_at,
      };
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export async function saveSceneCacheEntryToSqlite(args: {
  projectId: string | null;
  sceneId: string;
  fingerprint: string;
  entities: string[];
  lastAnalyzedAt: number;
}): Promise<void> {
  const { projectId, sceneId, fingerprint, entities, lastAnalyzedAt } = args;
  if (!projectId || !isTauri()) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("upsert_scene_cache_entry", {
      projectId,
      sceneId,
      fingerprint,
      entities,
      lastAnalyzedAt: Math.trunc(lastAnalyzedAt),
    });
  } catch {
    // keep UI responsive even if persistence fails
  }
}

export async function loadSceneFingerprintFromSqlite(args: {
  projectId: string | null;
  sceneId: string;
}): Promise<string | null> {
  const { projectId, sceneId } = args;
  if (!projectId || !isTauri()) return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const value = await invoke<string | null>("get_scene_fingerprint", {
      projectId,
      sceneId,
    });
    return value ?? null;
  } catch {
    return null;
  }
}
