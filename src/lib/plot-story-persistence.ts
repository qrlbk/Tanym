/**
 * IndexedDB persistence for `usePlotStoryStore`. Keeps facts, relations,
 * salient objects, and continuity warnings across reloads so the AI does not
 * re-extract every time the app boots.
 */

import { idbGetByKey, idbPutByKey } from "@/lib/doc-persistence";
import type { PlotStoryState } from "@/stores/plotStoryStore";
import {
  normalizeConsistencyWarnings,
  normalizePlotFacts,
} from "@/lib/plot-index/story-extraction";

export const PLOT_STORY_PERSIST_VERSION = 2 as const;
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
    warningStatuses: state.warningStatuses,
    chunkSceneMap: state.chunkSceneMap,
    lastExtractionAt: state.lastExtractionAt,
    lastAnalyzedAt: state.lastAnalyzedAt,
  };
}

export async function loadPlotStory(
  projectId: string | null,
): Promise<PersistedPlotStoryV2 | null> {
  if (!projectId || typeof indexedDB === "undefined") return null;
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
  if (!projectId || typeof indexedDB === "undefined") return;
  try {
    await idbPutByKey(JSON.stringify(data), PLOT_STORY_IDB_KEY(projectId));
  } catch (e) {
    console.warn("savePlotStory failed:", e);
  }
}
