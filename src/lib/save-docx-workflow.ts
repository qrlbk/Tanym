import type { Editor } from "@tiptap/react";
import { saveAs } from "file-saver";
import { saveDocumentNow } from "@/hooks/useAutoSave";
import { buildEditorDocxBlob, buildProjectDocxBlob } from "@/lib/file-io";
import { isTauri, tauriSaveDialog, tauriWriteFile } from "@/lib/tauri-helpers";
import { useDocumentStore } from "@/stores/documentStore";
import { useProjectStore } from "@/stores/projectStore";
import { addRecentFilePath } from "@/lib/recent-files";

export type SaveDocxResult =
  | { ok: true }
  | { ok: false; reason: string; cancelled?: boolean };

/** После «Сохранить как» в браузере с File System Access API — повторные Ctrl+S пишут в тот же файл. */
let browserDocxHandle: FileSystemFileHandle | null = null;

export function resetDocxSaveTarget(): void {
  useDocumentStore.getState().setActiveDocxPath(null);
  browserDocxHandle = null;
}

export function setDocxSaveTargetFromOpen(path: string): void {
  useDocumentStore.getState().setActiveDocxPath(path);
  browserDocxHandle = null;
}

/** Имя файла для диалога: без запрещённых символов, с расширением .docx */
export function suggestedDocxFileName(title: string): string {
  const base = title
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  const stem = base.length > 0 ? base : "Документ";
  return stem.toLowerCase().endsWith(".docx") ? stem : `${stem}.docx`;
}

async function writeBlobWithWebPicker(
  blob: Blob,
  suggestedName: string,
  forceNewTarget: boolean,
): Promise<SaveDocxResult> {
  if (typeof window === "undefined") {
    return { ok: false, reason: "no_window" };
  }
  const w = window as Window & {
    showSaveFilePicker?: (opts: {
      suggestedName?: string;
      types?: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<FileSystemFileHandle>;
  };
  if (typeof w.showSaveFilePicker !== "function") {
    saveAs(blob, suggestedName);
    return { ok: true };
  }
  try {
    if (forceNewTarget) {
      browserDocxHandle = null;
    }
    let handle = browserDocxHandle;
    if (!handle) {
      handle = await w.showSaveFilePicker!({
        suggestedName,
        types: [
          {
            description: "Документ DOCX",
            accept: {
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
            },
          },
        ],
      });
      browserDocxHandle = handle;
    }
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { ok: true };
  } catch (e) {
    const name = e instanceof DOMException ? e.name : (e as Error)?.name;
    if (name === "AbortError") {
      return { ok: false, reason: "cancelled", cancelled: true };
    }
    return { ok: false, reason: e instanceof Error ? e.message : "write_failed" };
  }
}

/**
 * Сохранение в .docx на диск: при первом сохранении или «Сохранить как» — диалог с именем;
 * далее «Сохранить» перезаписывает тот же файл (Tauri: путь; Chrome: handle).
 * После успеха дублирует автосохранение в IndexedDB/localStorage.
 */
export async function saveDocxExplicit(
  editor: Editor | null | undefined,
  opts: { saveAs: boolean },
): Promise<SaveDocxResult> {
  const project = useProjectStore.getState().project;
  const title = useDocumentStore.getState().title;
  const suggested = suggestedDocxFileName(title);

  let blob: Blob;
  try {
    if (project) {
      blob = await buildProjectDocxBlob(project);
    } else if (editor) {
      blob = await buildEditorDocxBlob(editor);
    } else {
      return { ok: false, reason: "no_editor" };
    }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "pack_failed" };
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());

  if (isTauri()) {
    const storedPath = useDocumentStore.getState().activeDocxPath;
    let path: string | null = null;
    if (!opts.saveAs && storedPath) {
      path = storedPath;
    } else {
      path = await tauriSaveDialog(suggested);
      if (!path) {
        return { ok: false, reason: "cancelled", cancelled: true };
      }
      useDocumentStore.getState().setActiveDocxPath(path);
    }
    const writeResult = await tauriWriteFile(path, bytes);
    if (!writeResult.ok) {
      return { ok: false, reason: writeResult.message };
    }
    addRecentFilePath(path);
  } else {
    const r = await writeBlobWithWebPicker(blob, suggested, opts.saveAs);
    if (!r.ok) return r;
  }

  const persist = await saveDocumentNow(editor ?? null);
  if (!persist.ok) {
    return { ok: false, reason: `docx_ok_persist_failed:${persist.reason}` };
  }
  useDocumentStore.getState().setSaveError(null);
  return { ok: true };
}
