/**
 * Persists the editor document. Uses localStorage for small payloads and
 * IndexedDB when localStorage throws QuotaExceededError or the payload is large.
 */

const LS_KEY = "tanym-doc";
const LS_PROJECT_KEY = "tanym-project";
const LS_TIME_KEY = "tanym-doc-time";
const LS_LOCATION_KEY = "tanym-doc-location";

/** Прежние ключи до переименования продукта — только чтение и очистка при сохранении. */
const LEGACY_LS_KEY = "word-ai-doc";
const LEGACY_LS_PROJECT_KEY = "word-ai-project";
const LEGACY_LS_TIME_KEY = "word-ai-doc-time";
const LEGACY_LS_LOCATION_KEY = "word-ai-doc-location";

const DB_NAME = "tanym-editor";
const LEGACY_DB_NAME = "word-ai-editor";
const DB_VERSION = 1;
const STORE = "documents";
const IDB_DOC_KEY = "main";
const IDB_PROJECT_KEY = "project-v2";

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

/** Чтение из старой БД IndexedDB (до переименования). */
function idbGetLegacyStore(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(LEGACY_DB_NAME, DB_VERSION);
    req.onerror = () => resolve(null);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.close();
        resolve(null);
        return;
      }
      const tx = db.transaction(STORE, "readonly");
      const g = tx.objectStore(STORE).get(key);
      g.onsuccess = () => {
        const v = g.result;
        resolve(typeof v === "string" ? v : null);
      };
      g.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
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

export function idbPutByKey(value: string, key: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("idb write"));
        tx.onabort = () => reject(tx.error ?? new Error("idb abort"));
        tx.objectStore(STORE).put(value, key);
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

export function idbGetByKey(key: string): Promise<string | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(key);
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

function idbDeleteByKey(key: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("idb delete"));
        tx.objectStore(STORE).delete(key);
      }),
  );
}

function clearLegacyLocalStorage(): void {
  localStorage.removeItem(LEGACY_LS_KEY);
  localStorage.removeItem(LEGACY_LS_PROJECT_KEY);
  localStorage.removeItem(LEGACY_LS_LOCATION_KEY);
  localStorage.removeItem(LEGACY_LS_TIME_KEY);
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
    clearLegacyLocalStorage();
  };

  const writeIdb = async (): Promise<void> => {
    await idbPut(payload);
    localStorage.setItem(LS_LOCATION_KEY, "indexeddb");
    localStorage.removeItem(LS_KEY);
    localStorage.setItem(LS_TIME_KEY, time);
    clearLegacyLocalStorage();
  };

  try {
    if (utf8ByteLength(payload) >= LARGE_BYTES) {
      await writeIdb();
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
      await writeIdb();
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

export async function persistProject(project: unknown): Promise<PersistResult> {
  const payload = JSON.stringify(project);
  const time = new Date().toISOString();

  const tryLocal = (): void => {
    localStorage.setItem(LS_PROJECT_KEY, payload);
    localStorage.removeItem(LS_LOCATION_KEY);
    localStorage.setItem(LS_TIME_KEY, time);
    clearLegacyLocalStorage();
  };

  const writeIdb = async (): Promise<void> => {
    await idbPutByKey(payload, IDB_PROJECT_KEY);
    localStorage.setItem(LS_LOCATION_KEY, "indexeddb");
    localStorage.removeItem(LS_PROJECT_KEY);
    localStorage.setItem(LS_TIME_KEY, time);
    clearLegacyLocalStorage();
  };

  try {
    if (utf8ByteLength(payload) >= LARGE_BYTES) {
      await writeIdb();
      return { ok: true };
    }
    tryLocal();
    return { ok: true };
  } catch (e) {
    if (!isQuotaExceeded(e)) {
      console.warn("persistProject failed:", e);
      return { ok: false, reason: e instanceof Error ? e.message : "unknown" };
    }
    try {
      await writeIdb();
      return { ok: true };
    } catch (e2) {
      console.warn("persistProject IndexedDB fallback failed:", e2);
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
  const loc =
    localStorage.getItem(LS_LOCATION_KEY) ??
    localStorage.getItem(LEGACY_LS_LOCATION_KEY);
  if (loc === "indexeddb") {
    try {
      const cur = await idbGet();
      if (cur) return cur;
      return idbGetLegacyStore(IDB_DOC_KEY);
    } catch (e) {
      console.warn("loadDocumentRaw idb:", e);
      return idbGetLegacyStore(IDB_DOC_KEY);
    }
  }
  return localStorage.getItem(LS_KEY) ?? localStorage.getItem(LEGACY_LS_KEY);
}

export async function loadProjectRaw(): Promise<string | null> {
  const loc =
    localStorage.getItem(LS_LOCATION_KEY) ??
    localStorage.getItem(LEGACY_LS_LOCATION_KEY);
  if (loc === "indexeddb") {
    try {
      const cur = await idbGetByKey(IDB_PROJECT_KEY);
      if (cur) return cur;
      return idbGetLegacyStore(IDB_PROJECT_KEY);
    } catch (e) {
      console.warn("loadProjectRaw idb:", e);
      return idbGetLegacyStore(IDB_PROJECT_KEY);
    }
  }
  return (
    localStorage.getItem(LS_PROJECT_KEY) ??
    localStorage.getItem(LEGACY_LS_PROJECT_KEY)
  );
}

/**
 * Remove persisted document (e.g. New document).
 */
export async function clearPersistedDocument(): Promise<void> {
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_PROJECT_KEY);
  localStorage.removeItem(LS_LOCATION_KEY);
  localStorage.removeItem(LS_TIME_KEY);
  clearLegacyLocalStorage();
  try {
    await idbDelete();
  } catch {
    // ignore
  }
  try {
    await idbDeleteByKey(IDB_PROJECT_KEY);
  } catch {
    // ignore
  }
  try {
    if (typeof indexedDB !== "undefined") {
      indexedDB.deleteDatabase(LEGACY_DB_NAME);
    }
  } catch {
    // ignore
  }
}
