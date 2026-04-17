"use client";

import { useCallback, useEffect, useMemo, type CSSProperties } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { useShallow } from "zustand/react/shallow";
import { getExtensions } from "@/components/Editor/extensions";
import { useEditorRuntime } from "@/components/Editor/EditorProvider";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { useDocumentStore } from "@/stores/documentStore";
import EditorContextMenu from "./ContextMenu";
import { useAutoSave } from "@/hooks/useAutoSave";
import { saveDocxExplicit } from "@/lib/save-docx-workflow";
import { useToastStore } from "@/stores/toastStore";
import { EMPTY_SCENE_DOC } from "@/lib/project/defaults";
import { usePlotStoryStore } from "@/stores/plotStoryStore";
import { THEME } from "@/lib/theme/colors";

function applyWarningMarks(editor: Editor, sceneId: string) {
  const state = usePlotStoryStore.getState();
  const markType = editor.state.schema.marks.warning;
  if (!markType) return;
  const unresolved = state.consistencyWarnings.filter((warning) => {
    const status = state.warningStatuses[warning.key] ?? "new";
    if (status === "resolved" || status === "ignored") return false;
    return warning.newChunkIds.some((chunkId) => state.chunkSceneMap[chunkId]?.sceneId === sceneId);
  });

  const tr = editor.state.tr;
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    tr.removeMark(pos, pos + node.nodeSize, markType);
  });

  for (const warning of unresolved) {
    const needle = warning.entity.trim();
    if (!needle) continue;
    const needleLower = needle.toLowerCase();
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      const textLower = node.text.toLowerCase();
      let fromIndex = 0;
      while (fromIndex < textLower.length) {
        const hit = textLower.indexOf(needleLower, fromIndex);
        if (hit < 0) break;
        const from = pos + hit;
        const to = from + needle.length;
        tr.addMark(
          from,
          to,
          markType.create({
            warningKey: warning.key,
            message: warning.message,
          }),
        );
        fromIndex = hit + needle.length;
      }
    });
  }

  if (tr.docChanged) {
    editor.view.dispatch(tr);
  }
}

function SceneEditorPane({
  sceneId,
  active,
}: {
  sceneId: string;
  active: boolean;
}) {
  const setSceneContent = useProjectStore((s) => s.setSceneContent);
  const getSceneById = useProjectStore((s) => s.getSceneById);
  const setDirty = useDocumentStore((s) => s.setDirty);
  const setWordCount = useDocumentStore((s) => s.setWordCount);
  const setCharCount = useDocumentStore((s) => s.setCharCount);
  const setCharCountNoSpaces = useDocumentStore((s) => s.setCharCountNoSpaces);
  const setActiveSceneId = useUIStore((s) => s.setActiveSceneId);
  const { setEditor } = useEditorRuntime();

  const scene = getSceneById(sceneId);
  const content = scene?.content ?? EMPTY_SCENE_DOC;

  const updateCounts = useCallback(
    (editor: Editor) => {
      const text = editor.state.doc.textContent;
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
      setCharCount(text.length);
      setCharCountNoSpaces(text.replace(/\s/g, "").length);
    },
    [setCharCount, setCharCountNoSpaces, setWordCount],
  );

  const editor = useEditor({
    extensions: getExtensions({ paged: false }),
    content,
    editorProps: {
      attributes: {
        class: "tiptap",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: instance, transaction }) => {
      if (!scene) return;
      if (!transaction.docChanged) return;
      setSceneContent(scene.id, instance.getJSON());
      setDirty(true);
      updateCounts(instance as Editor);
      applyWarningMarks(instance as Editor, scene.id);
    },
    onCreate: ({ editor: instance }) => {
      updateCounts(instance as Editor);
      if (scene) {
        applyWarningMarks(instance as Editor, scene.id);
      }
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor || !scene) return;
    const onSelectionUpdate = () => {
      setActiveSceneId(scene.id);
    };
    editor.on("selectionUpdate", onSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", onSelectionUpdate);
    };
  }, [editor, scene, setActiveSceneId]);

  useEffect(() => {
    if (!editor) return;
    if (!active) return;
    setEditor(editor as Editor);
    return () => {
      setEditor(null);
    };
  }, [active, editor, setEditor]);

  useEffect(() => {
    if (!editor || !scene) return;
    if (!active) return;
    applyWarningMarks(editor as Editor, scene.id);
  }, [active, editor, scene]);

  return (
    <div
      className={active ? "block h-full" : "hidden"}
      data-scene-id={sceneId}
    >
      {editor && <EditorContent editor={editor} />}
    </div>
  );
}

export default function SceneCanvas() {
  const pushToast = useToastStore((s) => s.push);
  const { activeSceneId, sceneTabs, canvasAppearance } = useUIStore(
    useShallow((s) => ({
      activeSceneId: s.activeSceneId,
      sceneTabs: s.sceneTabs,
      canvasAppearance: s.canvasAppearance,
    })),
  );
  const editor = useEditorRuntime().editor;
  useAutoSave(editor, 30000);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        const saveAs = e.shiftKey;
        void saveDocxExplicit(editor, { saveAs }).then((r) => {
          if (r.ok) {
            pushToast(saveAs ? "Сохранено в выбранный файл" : "Документ сохранён", "info");
          } else if (!r.cancelled) {
            pushToast("Не удалось сохранить: " + r.reason, "error");
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
  }, [editor, pushToast]);

  const tabs = useMemo(() => sceneTabs.map((tab) => tab.sceneId), [sceneTabs]);
  const lightMode = canvasAppearance === "light";
  const workspaceBg = lightMode ? THEME.canvas.workspaceLightWarm : "#11141c";
  const sheetBg = lightMode
    ? `linear-gradient(180deg, ${THEME.canvas.sheetLight} 0%, ${THEME.canvas.sheetLightGradientEnd} 100%)`
    : "#171c26";
  const sheetBorder = lightMode ? "#d8d0c4" : "#2b3140";
  const foreground = lightMode ? THEME.text.onSheetLight : THEME.text.onSheetDark;

  return (
    <EditorContextMenu>
      <div
        data-canvas-appearance={canvasAppearance}
        className="h-full min-h-0 overflow-auto px-6 py-6"
        style={{
          background: workspaceBg,
        }}
      >
        <div
          className="mx-auto max-w-[800px] rounded-md border p-6 shadow-sm"
          style={
            {
              borderColor: sheetBorder,
              background: sheetBg,
              color: foreground,
              caretColor: foreground,
              "--doc-foreground": foreground,
              "--doc-caret": foreground,
            } as CSSProperties
          }
        >
          {tabs.length === 0 ? (
            <div className="text-sm" style={{ color: lightMode ? "#6b7280" : "#9ca3af" }}>
              Откройте сцену слева, чтобы начать редактирование.
            </div>
          ) : (
            tabs.map((sceneId) => (
              <SceneEditorPane
                key={sceneId}
                sceneId={sceneId}
                active={sceneId === activeSceneId}
              />
            ))
          )}
        </div>
      </div>
    </EditorContextMenu>
  );
}
