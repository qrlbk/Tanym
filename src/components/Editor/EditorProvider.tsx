"use client";

import React, { createContext, useContext, useCallback, useEffect } from "react";
import { useEditor, Editor } from "@tiptap/react";
import { getExtensions } from "./extensions";
import { useDocumentStore } from "@/stores/documentStore";
import { EMPTY_DOC_JSON, migrateDocJson } from "@/lib/migrate-doc-pages";
import { loadDocumentRaw, persistDocument } from "@/lib/doc-persistence";
import { useFontStore } from "@/stores/fontStore";

const EditorContext = createContext<Editor | null>(null);

export function useEditorContext() {
  return useContext(EditorContext);
}

export default function EditorProvider({ children }: { children: React.ReactNode }) {
  const setWordCount = useDocumentStore((s) => s.setWordCount);
  const setCharCount = useDocumentStore((s) => s.setCharCount);
  const setDirty = useDocumentStore((s) => s.setDirty);

  const updateCounts = useCallback(
    (editor: Editor) => {
      const text = editor.state.doc.textContent;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      setCharCount(text.length);
    },
    [setWordCount, setCharCount]
  );

  const editor = useEditor({
    extensions: getExtensions(),
    content: EMPTY_DOC_JSON,
    editorProps: {
      attributes: {
        class: "tiptap",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor }) => {
      setDirty(true);
      updateCounts(editor as Editor);
    },
    onCreate: ({ editor }) => {
      updateCounts(editor as Editor);
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        const json = editor.getJSON();
        void persistDocument(json).then((r) => {
          if (r.ok) {
            useDocumentStore.getState().setDirty(false);
            useDocumentStore.getState().setLastSaved(new Date());
          } else {
            alert("Не удалось сохранить документ: " + r.reason);
          }
        });
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        window.print();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor]);

  useEffect(() => {
    useFontStore.getState().loadSystemFonts();
  }, []);

  useEffect(() => {
    if (!editor) return;
    let cancelled = false;
    void loadDocumentRaw().then((saved) => {
      if (cancelled || !saved) return;
      try {
        editor.commands.setContent(migrateDocJson(JSON.parse(saved)));
        useDocumentStore.getState().setDirty(false);
      } catch {
        // ignore parse errors
      }
    });
    return () => {
      cancelled = true;
    };
  }, [editor]);

  return (
    <EditorContext.Provider value={editor}>
      {children}
    </EditorContext.Provider>
  );
}
