"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useDocumentStore } from "@/stores/documentStore";
import { loadDocumentRaw, loadProjectRaw } from "@/lib/doc-persistence";
import { useFontStore } from "@/stores/fontStore";
import { useProjectStore } from "@/stores/projectStore";
import { migrateLegacyDocToProject } from "@/lib/project/migrate-legacy-to-project";
import { createDefaultProject } from "@/lib/project/defaults";
import { migrateProjectToLatest } from "@/lib/project/migrate-project";
import type { StoryProject } from "@/lib/project/types";
import {
  clearAllTanymClientData,
  consumeWelcomeResetSearchParams,
} from "@/lib/app-session-reset";
import { useUIStore } from "@/stores/uiStore";

type EditorRuntimeContextValue = {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
};

const EditorContext = createContext<Editor | null>(null);
const EditorRuntimeContext = createContext<EditorRuntimeContextValue | null>(null);

export function useEditorContext() {
  return useContext(EditorContext);
}

export function useEditorRuntime() {
  const ctx = useContext(EditorRuntimeContext);
  if (!ctx) {
    throw new Error("useEditorRuntime must be used inside EditorProvider");
  }
  return ctx;
}

export default function EditorProvider({ children }: { children: React.ReactNode }) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const setProject = useProjectStore((s) => s.setProject);
  const setSceneTabs = useUIStore((s) => s.setSceneTabs);
  const setActiveSceneId = useUIStore((s) => s.setActiveSceneId);

  useEffect(() => {
    useFontStore.getState().loadSystemFonts();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const forceWelcome = consumeWelcomeResetSearchParams();
      if (forceWelcome) {
        try {
          await clearAllTanymClientData();
        } catch (e) {
          console.warn("Session reset failed:", e);
        }
      }

      let project: StoryProject | null = null;
      const projectRaw = await loadProjectRaw();
      const hadProjectRaw = (projectRaw?.trim().length ?? 0) > 0;
      if (projectRaw) {
        try {
          project = migrateProjectToLatest(JSON.parse(projectRaw));
        } catch {
          project = null;
        }
      }
      let legacyRaw: string | null = null;
      if (!project) {
        legacyRaw = await loadDocumentRaw();
        if (legacyRaw) {
          try {
            project = migrateLegacyDocToProject(
              JSON.parse(legacyRaw) as Record<string, unknown>,
            );
          } catch {
            project = createDefaultProject();
          }
        }
      }
      const hadLegacyRaw = (legacyRaw?.trim().length ?? 0) > 0;
      if (!project) project = createDefaultProject();
      if (cancelled) return;

      setProject(project);
      const firstScene = project.chapters[0]?.scenes[0];
      if (firstScene) {
        setSceneTabs([{ sceneId: firstScene.id, title: firstScene.title }]);
        setActiveSceneId(firstScene.id);
      } else {
        setSceneTabs([]);
        setActiveSceneId(null);
      }
      useDocumentStore.getState().setDirty(false);
      const hadPersistedSession = !forceWelcome && (hadProjectRaw || hadLegacyRaw);
      useUIStore.getState().setStartScreen(hadPersistedSession ? "editor" : "welcome");
    })();

    return () => {
      cancelled = true;
    };
  }, [setActiveSceneId, setProject, setSceneTabs]);

  const runtimeValue = useMemo(
    () => ({
      editor,
      setEditor,
    }),
    [editor],
  );

  return (
    <EditorRuntimeContext.Provider value={runtimeValue}>
      <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
    </EditorRuntimeContext.Provider>
  );
}
