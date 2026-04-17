"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { useDocumentStore } from "@/stores/documentStore";
import { persistDocument, persistProject } from "@/lib/doc-persistence";
import { useProjectStore } from "@/stores/projectStore";

export function saveDocumentNow(editor?: Editor | null) {
  const project = useProjectStore.getState().project;
  const saveTask = project
    ? persistProject(project)
    : editor
      ? persistDocument(editor.getJSON())
      : Promise.resolve({ ok: false as const, reason: "editor_unavailable" });
  return saveTask.then((r) => {
    if (r.ok) {
      useDocumentStore.getState().setDirty(false);
      useDocumentStore.getState().setLastSaved(new Date());
      useDocumentStore.getState().setSaveError(null);
    } else {
      useDocumentStore.getState().setSaveError(r.reason);
    }
    return r;
  });
}

export function useAutoSave(editor: Editor | null, intervalMs = 30000) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const saveIfDirty = useCallback(() => {
    if (!editor) return;
    const isDirty = useDocumentStore.getState().isDirty;
    if (!isDirty) return;
    void saveDocumentNow(editor).then((r) => {
      if (!r.ok) {
        console.warn("Auto-save failed:", r.reason);
      }
    });
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    timerRef.current = setInterval(() => {
      saveIfDirty();
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [editor, intervalMs, saveIfDirty]);

  useEffect(() => {
    if (!editor) return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        saveIfDirty();
      }
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useDocumentStore.getState().isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [editor, saveIfDirty]);
}
