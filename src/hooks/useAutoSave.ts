"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { useDocumentStore } from "@/stores/documentStore";

export function useAutoSave(editor: Editor | null, intervalMs = 30000) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!editor) return;

    timerRef.current = setInterval(() => {
      const isDirty = useDocumentStore.getState().isDirty;
      if (!isDirty) return;

      const json = editor.getJSON();
      localStorage.setItem("word-ai-doc", JSON.stringify(json));
      localStorage.setItem("word-ai-doc-time", new Date().toISOString());
      useDocumentStore.getState().setDirty(false);
      useDocumentStore.getState().setLastSaved(new Date());
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [editor, intervalMs]);
}
