import { create } from "zustand";

export type PlotIngestPhase =
  | "idle"
  | "embedding"
  | "extracting"
  | "done"
  | "error";

interface PlotIndexState {
  ingestPhase: PlotIngestPhase;
  ingestMessage: string | null;
  lastIndexedAt: number | null;
  indexError: string | null;
  sceneCache: Record<
    string,
    {
      fingerprint: string;
      embeddings?: number[] | null;
      entities?: string[];
      lastAnalyzedAt: number;
    }
  >;
  setIngestState: (p: {
    ingestPhase?: PlotIngestPhase;
    ingestMessage?: string | null;
    lastIndexedAt?: number | null;
    indexError?: string | null;
  }) => void;
  setSceneCacheEntry: (
    sceneId: string,
    entry: {
      fingerprint: string;
      embeddings?: number[] | null;
      entities?: string[];
      lastAnalyzedAt: number;
    },
  ) => void;
}

export const usePlotIndexStore = create<PlotIndexState>((set) => ({
  ingestPhase: "idle",
  ingestMessage: null,
  lastIndexedAt: null,
  indexError: null,
  sceneCache: {},
  setIngestState: (p) =>
    set((s) => {
      const next = { ...s, ...p };
      return next;
    }),
  setSceneCacheEntry: (sceneId, entry) =>
    set((state) => ({
      ...state,
      sceneCache: {
        ...state.sceneCache,
        [sceneId]: entry,
      },
    })),
}));
