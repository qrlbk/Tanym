import { clearPersistedDocument } from "@/lib/doc-persistence";
import { idbClearAll } from "@/lib/plot-index/vector-idb";
import { clearRecentFilePaths } from "@/lib/recent-files";
import { resetDocxSaveTarget } from "@/lib/save-docx-workflow";
import { useAiChatSessionStore } from "@/stores/aiChatSessionStore";
import { useDocumentStore } from "@/stores/documentStore";
import { usePlotIndexStore } from "@/stores/plotIndexStore";
import { usePlotStoryStore } from "@/stores/plotStoryStore";

function deleteIdbDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

/** Сброс RAM-состояния, завязанного на прошлую сессию (после очистки хранилища). */
export function resetInMemoryClientState(): void {
  usePlotStoryStore.getState().resetStory();
  usePlotIndexStore.setState({
    ingestPhase: "idle",
    ingestMessage: null,
    lastIndexedAt: null,
    indexError: null,
    sceneCache: {},
  });
  const ai = useAiChatSessionStore.getState();
  ai.setProjectId(null);
  ai.hydrate(null);
  const doc = useDocumentStore.getState();
  doc.setTitle("Документ1");
  doc.setDirty(false);
  doc.setSaveError(null);
  resetDocxSaveTarget();
}

/**
 * Полная очистка локальных данных приложения: документ/проект, IndexedDB редактора
 * (включая чаты ИИ и кэш сюжета), векторный индекс сюжета, список недавних файлов.
 */
export async function clearAllTanymClientData(): Promise<void> {
  await clearPersistedDocument();
  await deleteIdbDatabase("tanym-editor");
  try {
    await idbClearAll();
  } catch (e) {
    console.warn("clearAllTanymClientData: plot vectors", e);
  }
  clearRecentFilePaths();
  resetInMemoryClientState();
}

export function consumeWelcomeResetSearchParams(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const welcome = url.searchParams.get("welcome") === "1";
  const reset = url.searchParams.get("reset") === "1";
  if (!welcome && !reset) return false;
  url.searchParams.delete("welcome");
  url.searchParams.delete("reset");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
  return true;
}
