import type { Editor } from "@tiptap/react";
import { cosineSimilarity } from "ai";
import {
  computePlotChunks,
  computeProjectChunks,
  computeSceneChunksFromContent,
  type PlotChunk,
} from "./chunks";
import {
  idbGetAllChunks,
  idbGetChunksByScene,
  idbGetChunksByProject,
  idbPutChunks,
  idbDeleteChunks,
  chunkToSample,
  LEGACY_PROJECT_ID,
  type StoredChunkVector,
} from "./vector-idb";
import { embedTextsOnServer } from "./embeddings-client";
import type { StoryProject } from "@/lib/project/types";

const EMBED_BATCH = 16;

export type IngestProgress = {
  phase: "idle" | "embedding" | "done" | "error";
  indexed: number;
  total: number;
  message?: string;
};

export type IngestScope = "project" | "active-scene" | "scenes";

export type SemanticSearchHit = {
  chunkId: string;
  score: number;
  label: string;
  textSample: string;
  from: number;
  to: number;
  chapterId?: string | null;
  chapterTitle?: string | null;
  sceneId?: string | null;
  sceneTitle?: string | null;
  projectId?: string | null;
};

export type IngestOptions = {
  signal?: AbortSignal;
  projectId?: string | null;
};

async function embedAndStoreChunks(
  chunks: PlotChunk[],
  existingByChunkId: Map<string, StoredChunkVector>,
  projectId: string,
  onProgress: ((p: IngestProgress) => void) | undefined,
  signal: AbortSignal | undefined,
): Promise<number> {
  const toEmbed: PlotChunk[] = [];
  for (const c of chunks) {
    const prev = existingByChunkId.get(c.id);
    if (!prev || prev.contentHash !== c.contentHash) {
      toEmbed.push(c);
    }
  }

  if (toEmbed.length === 0) {
    onProgress?.({
      phase: "done",
      indexed: chunks.length,
      total: chunks.length,
      message: "Индекс актуален.",
    });
    return 0;
  }

  let done = 0;
  for (let i = 0; i < toEmbed.length; i += EMBED_BATCH) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const batch = toEmbed.slice(i, i + EMBED_BATCH);
    onProgress?.({
      phase: "embedding",
      indexed: done,
      total: toEmbed.length,
      message: `Эмбеддинги: ${done}/${toEmbed.length}`,
    });

    const embeddings = await embedTextsOnServer(
      batch.map((b) => b.text),
      signal,
    );
    if (embeddings.length !== batch.length) {
      throw new Error("Embedding count mismatch");
    }

    const rows: StoredChunkVector[] = batch.map((c, j) => ({
      chunkId: c.id,
      embedding: embeddings[j],
      contentHash: c.contentHash,
      from: c.from,
      to: c.to,
      label: c.label,
      textSample: chunkToSample(c),
      chapterId: c.chapterId,
      chapterTitle: c.chapterTitle,
      sceneId: c.sceneId,
      sceneTitle: c.sceneTitle,
      projectId,
    }));
    await idbPutChunks(rows);
    done += batch.length;
  }
  return toEmbed.length;
}

/**
 * Incrementally update vectors for a single scene. Rows for the same
 * `sceneId` that are not present in the new chunk set are removed; rows
 * whose `contentHash` changed are re-embedded.
 */
export async function ingestSceneIndex(
  chunks: PlotChunk[],
  sceneId: string,
  options?: IngestOptions,
  onProgress?: (p: IngestProgress) => void,
): Promise<void> {
  const signal = options?.signal;
  const projectId = options?.projectId ?? LEGACY_PROJECT_ID;
  const existing = await idbGetChunksByScene(sceneId);
  const byId = new Map(existing.map((r) => [r.chunkId, r]));
  const newIds = new Set(chunks.map((c) => c.id));

  const toDelete = existing.filter((row) => !newIds.has(row.chunkId));
  if (toDelete.length > 0) {
    await idbDeleteChunks(toDelete.map((r) => r.chunkId));
  }

  await embedAndStoreChunks(chunks, byId, projectId, onProgress, signal);

  onProgress?.({
    phase: "done",
    indexed: chunks.length,
    total: chunks.length,
    message: `Проиндексировано фрагментов сцены: ${chunks.length}`,
  });
}

/**
 * Ingest an entire project into the vector index. Scene-by-scene, respecting
 * a modest concurrency limit so we don't hammer the embeddings endpoint.
 */
export async function ingestProjectIndex(
  project: StoryProject,
  options?: IngestOptions & { concurrency?: number },
  onProgress?: (p: IngestProgress) => void,
): Promise<void> {
  const signal = options?.signal;
  const projectId = options?.projectId ?? project.id ?? LEGACY_PROJECT_ID;
  const concurrency = Math.max(1, Math.min(options?.concurrency ?? 3, 6));

  const allChunks = computeProjectChunks(project);
  const sceneIdToChunks = new Map<string, PlotChunk[]>();
  for (const c of allChunks) {
    const sid = c.sceneId ?? "";
    if (!sid) continue;
    const list = sceneIdToChunks.get(sid) ?? [];
    list.push(c);
    sceneIdToChunks.set(sid, list);
  }

  // Delete rows for scenes that no longer exist in the project
  const existingForProject = await idbGetChunksByProject(projectId);
  const obsolete = existingForProject
    .filter((row) => !sceneIdToChunks.has(row.sceneId ?? ""))
    .map((r) => r.chunkId);
  if (obsolete.length > 0) await idbDeleteChunks(obsolete);

  const totalChunks = allChunks.length;
  let indexed = 0;
  const sceneEntries = Array.from(sceneIdToChunks.entries());

  const runners = new Array(concurrency).fill(0).map(async () => {
    while (sceneEntries.length > 0) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const next = sceneEntries.shift();
      if (!next) break;
      const [sceneId, sceneChunks] = next;
      await ingestSceneIndex(sceneChunks, sceneId, { signal, projectId }, () => {
        // aggregate progress below
      });
      indexed += sceneChunks.length;
      onProgress?.({
        phase: "embedding",
        indexed,
        total: totalChunks,
        message: `Проект: ${indexed}/${totalChunks}`,
      });
    }
  });
  await Promise.all(runners);

  onProgress?.({
    phase: "done",
    indexed: totalChunks,
    total: totalChunks,
    message: `Проект проиндексирован: ${totalChunks} фрагментов.`,
  });
}

/**
 * Legacy single-editor API kept for backwards compatibility with the
 * existing editor debounce. When a `sceneId` is provided, chunks are
 * re-keyed into the scene-namespaced scheme so they align with the
 * project-wide index.
 */
export async function ingestPlotIndex(
  editor: Editor,
  onProgress?: (p: IngestProgress) => void,
  options?: IngestOptions & { sceneId?: string | null; sceneMeta?: {
    title: string;
    chapterId: string | null;
    chapterTitle: string | null;
  } | null },
): Promise<void> {
  const signal = options?.signal;
  const projectId = options?.projectId ?? LEGACY_PROJECT_ID;
  const sceneId = options?.sceneId ?? null;

  if (sceneId && options?.sceneMeta) {
    const content = editor.getJSON();
    const chunks = computeSceneChunksFromContent(content, {
      sceneId,
      sceneTitle: options.sceneMeta.title,
      chapterId: options.sceneMeta.chapterId,
      chapterTitle: options.sceneMeta.chapterTitle,
    });
    return ingestSceneIndex(chunks, sceneId, { signal, projectId }, onProgress);
  }

  // Legacy path: chunks keyed by outline order, stored under legacy project id.
  const chunks = computePlotChunks(editor);
  const existing = await idbGetAllChunks();
  const byId = new Map(existing.map((r) => [r.chunkId, r]));
  const newIds = new Set(chunks.map((c) => c.id));
  const toDelete = existing
    .filter(
      (row) =>
        (row.projectId ?? LEGACY_PROJECT_ID) === LEGACY_PROJECT_ID &&
        !newIds.has(row.chunkId),
    )
    .map((r) => r.chunkId);
  if (toDelete.length > 0) await idbDeleteChunks(toDelete);
  await embedAndStoreChunks(chunks, byId, LEGACY_PROJECT_ID, onProgress, signal);
  onProgress?.({
    phase: "done",
    indexed: chunks.length,
    total: chunks.length,
    message: `Проиндексировано фрагментов: ${chunks.length}`,
  });
}

export type SemanticSearchOptions = {
  /**
   * 'project'      — limit to rows with matching projectId (default when projectId set)
   * 'active-scene' — limit to rows for a specific sceneId
   * 'scenes'       — limit to rows whose sceneId is in `sceneIds`
   * 'all'          — no filtering (legacy)
   */
  scope?: "project" | "active-scene" | "scenes" | "all";
  projectId?: string | null;
  sceneId?: string | null;
  sceneIds?: string[] | null;
  minScore?: number;
};

export async function semanticSearchPlot(
  query: string,
  topK: number,
  options?: SemanticSearchOptions,
): Promise<SemanticSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const [qEmb] = await embedTextsOnServer([q]);

  let rows: StoredChunkVector[];
  const scope = options?.scope ?? (options?.projectId ? "project" : "all");
  if (scope === "project" && options?.projectId) {
    rows = await idbGetChunksByProject(options.projectId);
  } else if (scope === "active-scene" && options?.sceneId) {
    rows = await idbGetChunksByScene(options.sceneId);
  } else if (scope === "scenes" && options?.sceneIds && options.sceneIds.length > 0) {
    const allRows = await Promise.all(
      options.sceneIds.map((id) => idbGetChunksByScene(id)),
    );
    rows = allRows.flat();
  } else {
    rows = await idbGetAllChunks();
  }

  const scored: SemanticSearchHit[] = [];
  for (const row of rows) {
    const score = cosineSimilarity(qEmb, row.embedding);
    if (typeof options?.minScore === "number" && score < options.minScore) continue;
    scored.push({
      chunkId: row.chunkId,
      score,
      label: row.label,
      textSample: row.textSample,
      from: row.from,
      to: row.to,
      chapterId: row.chapterId,
      chapterTitle: row.chapterTitle,
      sceneId: row.sceneId,
      sceneTitle: row.sceneTitle,
      projectId: row.projectId,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, topK));
}
