/**
 * IndexedDB persistence for plot chunk embeddings (browser / Tauri webview).
 *
 * DB version 2 introduces:
 *   - `projectId` on every row (namespaces vectors per-project; no more
 *     cross-project leakage).
 *   - `by-scene` and `by-project` indexes for O(log n) scoped queries.
 *
 * Schema migrates from v1 by re-opening with the new version. Existing rows
 * without `projectId` stay usable and are treated as belonging to the legacy
 * `__no_project__` bucket until reingested.
 */

import type { PlotChunk } from "./chunks";

export const LEGACY_PROJECT_ID = "__no_project__";

export type StoredChunkVector = {
  chunkId: string;
  embedding: number[];
  contentHash: string;
  from: number;
  to: number;
  label: string;
  textSample: string;
  chapterId?: string | null;
  chapterTitle?: string | null;
  sceneId?: string | null;
  sceneTitle?: string | null;
  projectId?: string | null;
};

const DB_NAME = "tanym-plot-index-v1";
const STORE = "vectors";
const DB_VERSION = 2;
const INDEX_BY_SCENE = "by-scene";
const INDEX_BY_PROJECT = "by-project";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE)) {
        store = db.createObjectStore(STORE, { keyPath: "chunkId" });
      } else {
        // upgrade existing store
        store = req.transaction!.objectStore(STORE);
      }
      if (!store.indexNames.contains(INDEX_BY_SCENE)) {
        store.createIndex(INDEX_BY_SCENE, "sceneId", { unique: false });
      }
      if (!store.indexNames.contains(INDEX_BY_PROJECT)) {
        store.createIndex(INDEX_BY_PROJECT, "projectId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB request failed"));
  });
}

export async function idbPutChunk(row: StoredChunkVector): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await reqToPromise(tx.objectStore(STORE).put(row));
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function idbPutChunks(rows: StoredChunkVector[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const row of rows) store.put(row);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function idbDeleteChunk(chunkId: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await reqToPromise(tx.objectStore(STORE).delete(chunkId));
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function idbDeleteChunks(chunkIds: string[]): Promise<void> {
  if (chunkIds.length === 0) return;
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const id of chunkIds) store.delete(id);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function idbGetAllChunks(): Promise<StoredChunkVector[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    return await reqToPromise(req);
  } finally {
    db.close();
  }
}

export async function idbGetChunksByScene(
  sceneId: string,
): Promise<StoredChunkVector[]> {
  if (!sceneId) return [];
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const index = tx.objectStore(STORE).index(INDEX_BY_SCENE);
    const req = index.getAll(sceneId);
    return await reqToPromise(req);
  } finally {
    db.close();
  }
}

export async function idbGetChunksByProject(
  projectId: string,
): Promise<StoredChunkVector[]> {
  if (!projectId) return [];
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const index = tx.objectStore(STORE).index(INDEX_BY_PROJECT);
    const req = index.getAll(projectId);
    return await reqToPromise(req);
  } finally {
    db.close();
  }
}

export async function idbClearAll(): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await reqToPromise(tx.objectStore(STORE).clear());
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function idbClearProject(projectId: string): Promise<void> {
  const rows = await idbGetChunksByProject(projectId);
  await idbDeleteChunks(rows.map((r) => r.chunkId));
}

export function sampleText(text: string, max = 280): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function chunkToSample(chunk: PlotChunk): string {
  return sampleText(chunk.text);
}
