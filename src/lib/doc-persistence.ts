/**
 * Persists the editor document. Uses localStorage for small payloads and
 * IndexedDB when localStorage throws QuotaExceededError or the payload is large.
 */

const LS_KEY = "word-ai-doc";
const LS_TIME_KEY = "word-ai-doc-time";
const LS_LOCATION_KEY = "word-ai-doc-location";

const DB_NAME = "word-ai-editor";
const DB_VERSION = 1;
const STORE = "documents";
const IDB_DOC_KEY = "main";

const LARGE_BYTES = 2 * 1024 * 1024;

function isQuotaExceeded(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "QuotaExceededError") return true;
  if (e instanceof Error && e.name === "QuotaExceededError") return true;
  return false;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

function idbPut(value: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("idb write"));
        tx.onabort = () => reject(tx.error ?? new Error("idb abort"));
        tx.objectStore(STORE).put(value, IDB_DOC_KEY);
      }),
  );
}

function idbGet(): Promise<string | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(IDB_DOC_KEY);
        req.onsuccess = () => {
          const v = req.result;
          resolve(typeof v === "string" ? v : null);
        };
        req.onerror = () => reject(req.error ?? new Error("idb read"));
      }),
  );
}

function idbDelete(): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("idb delete"));
        tx.objectStore(STORE).delete(IDB_DOC_KEY);
      }),
  );
}

export type PersistResult = { ok: true } | { ok: false; reason: string };

function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

/**
 * Save JSON document. Updates last-saved time only on success.
 */
export async function persistDocument(json: unknown): Promise<PersistResult> {
  const payload = JSON.stringify(json);
  const time = new Date().toISOString();

  const tryLocal = (): void => {
    localStorage.setItem(LS_KEY, payload);
    localStorage.removeItem(LS_LOCATION_KEY);
    localStorage.setItem(LS_TIME_KEY, time);
  };

  const useIdb = async (): Promise<void> => {
    await idbPut(payload);
    localStorage.setItem(LS_LOCATION_KEY, "indexeddb");
    localStorage.removeItem(LS_KEY);
    localStorage.setItem(LS_TIME_KEY, time);
  };

  try {
    if (utf8ByteLength(payload) >= LARGE_BYTES) {
      await useIdb();
      return { ok: true };
    }
    tryLocal();
    return { ok: true };
  } catch (e) {
    if (!isQuotaExceeded(e)) {
      console.warn("persistDocument failed:", e);
      return { ok: false, reason: e instanceof Error ? e.message : "unknown" };
    }
    try {
      await useIdb();
      return { ok: true };
    } catch (e2) {
      console.warn("persistDocument IndexedDB fallback failed:", e2);
      return {
        ok: false,
        reason:
          e2 instanceof Error ? e2.message : "quota_and_idb_failed",
      };
    }
  }
}

/**
 * Load raw JSON string for the saved document, or null if none.
 */
export async function loadDocumentRaw(): Promise<string | null> {
  const loc = localStorage.getItem(LS_LOCATION_KEY);
  if (loc === "indexeddb") {
    try {
      return await idbGet();
    } catch (e) {
      console.warn("loadDocumentRaw idb:", e);
      return null;
    }
  }
  return localStorage.getItem(LS_KEY);
}

/**
 * Remove persisted document (e.g. New document).
 */
export async function clearPersistedDocument(): Promise<void> {
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_LOCATION_KEY);
  localStorage.removeItem(LS_TIME_KEY);
  try {
    await idbDelete();
  } catch {
    // ignore
  }
}
