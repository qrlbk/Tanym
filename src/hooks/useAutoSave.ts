"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { useDocumentStore } from "@/stores/documentStore";
import { persistDocument } from "@/lib/doc-persistence";

export function useAutoSave(editor: Editor | null, intervalMs = 30000) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!editor) return;

    timerRef.current = setInterval(() => {
      const isDirty = useDocumentStore.getState().isDirty;
      if (!isDirty) return;

      const json = editor.getJSON();
      void persistDocument(json).then((r) => {
        if (r.ok) {
          useDocumentStore.getState().setDirty(false);
          useDocumentStore.getState().setLastSaved(new Date());
        } else {
          console.warn("Auto-save failed:", r.reason);
        }
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [editor, intervalMs]);
}
