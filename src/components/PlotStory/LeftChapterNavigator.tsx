"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { useToastStore } from "@/stores/toastStore";
import { Tooltip } from "@/components/ui/Tooltip";

export default function LeftChapterNavigator() {
  const project = useProjectStore((s) => s.project);
  const createScene = useProjectStore((s) => s.createScene);
  const createChapter = useProjectStore((s) => s.createChapter);
  const renameChapter = useProjectStore((s) => s.renameChapter);
  const renameScene = useProjectStore((s) => s.renameScene);
  const deleteScene = useProjectStore((s) => s.deleteScene);
  const reorderScene = useProjectStore((s) => s.reorderScene);
  const getSceneById = useProjectStore((s) => s.getSceneById);
  const activeSceneId = useUIStore((s) => s.activeSceneId);
  const setActiveSceneId = useUIStore((s) => s.setActiveSceneId);
  const openSceneTab = useUIStore((s) => s.openSceneTab);
  const closeSceneTab = useUIStore((s) => s.closeSceneTab);
  const setSceneTabTitle = useUIStore((s) => s.setSceneTabTitle);
  const pushToast = useToastStore((s) => s.push);
  const [dragSceneId, setDragSceneId] = useState<string | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterDraft, setChapterDraft] = useState("");
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [sceneDraft, setSceneDraft] = useState("");

  const chapters = useMemo(() => project?.chapters ?? [], [project]);

  const openScene = useCallback(
    (sceneId: string, title: string) => {
      setActiveSceneId(sceneId);
      openSceneTab({ sceneId, title });
    },
    [openSceneTab, setActiveSceneId],
  );

  const commitChapterTitle = useCallback(() => {
    if (!editingChapterId) return;
    const t = chapterDraft.trim();
    if (t) renameChapter(editingChapterId, t);
    setEditingChapterId(null);
  }, [chapterDraft, editingChapterId, renameChapter]);

  const commitSceneTitle = useCallback(() => {
    if (!editingSceneId) return;
    const t = sceneDraft.trim();
    if (t) {
      renameScene(editingSceneId, t);
      setSceneTabTitle(editingSceneId, t);
    }
    setEditingSceneId(null);
  }, [editingSceneId, renameScene, sceneDraft, setSceneTabTitle]);

  useEffect(() => {
    if (!editingChapterId && !editingSceneId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingChapterId(null);
        setEditingSceneId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingChapterId, editingSceneId]);

  const handleAddChapter = () => {
    const chapterId = createChapter();
    if (!chapterId) return;
    const ch = useProjectStore.getState().project?.chapters.find((c) => c.id === chapterId);
    const first = ch?.scenes[0];
    if (first) openScene(first.id, first.title);
  };

  const handleDeleteScene = (sceneId: string, title: string) => {
    if (!window.confirm(`Удалить сцену «${title}» из проекта? Вкладка будет закрыта.`)) return;
    const ok = deleteScene(sceneId);
    if (!ok) {
      pushToast("Должна остаться хотя бы одна сцена в проекте.", "error");
      return;
    }
    closeSceneTab(sceneId);
  };

  return (
    <aside className="hidden h-full w-[280px] min-w-[250px] border-r border-[#25272f] bg-[#121620] text-[#d1d5db] lg:block">
      <div className="flex items-center justify-between gap-2 border-b border-[#25272f] px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">
          Story Structure
        </span>
        <button
          type="button"
          onClick={handleAddChapter}
          className="inline-flex shrink-0 items-center gap-1 rounded bg-[#253047] px-2 py-1 text-xs text-[#dbe4f5] hover:bg-[#2d3b56]"
          title="Новая глава"
        >
          <Plus size={12} />
          Глава
        </button>
      </div>
      <div className="h-[calc(100%-40px)] overflow-auto p-2">
        {chapters.map((chapter) => (
          <section key={chapter.id} className="mb-2 rounded-md border border-[#2b3140] bg-[#161b27]">
            <div className="flex items-center justify-between gap-2 border-b border-[#2b3140] px-2 py-1.5">
              {editingChapterId === chapter.id ? (
                <input
                  autoFocus
                  className="min-w-0 flex-1 rounded border border-[#3b4a6a] bg-[#0f131c] px-1.5 py-0.5 text-sm text-[#f3f4f6]"
                  value={chapterDraft}
                  onChange={(e) => setChapterDraft(e.target.value)}
                  onBlur={commitChapterTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitChapterTitle();
                    }
                  }}
                />
              ) : (
                <p
                  role="button"
                  tabIndex={0}
                  className="min-w-0 flex-1 cursor-default truncate text-sm font-semibold text-[#f3f4f6]"
                  title="Двойной щелчок — переименовать главу"
                  onDoubleClick={() => {
                    setEditingChapterId(chapter.id);
                    setChapterDraft(chapter.title);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setEditingChapterId(chapter.id);
                      setChapterDraft(chapter.title);
                    }
                  }}
                >
                  {chapter.title}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  const createdId = createScene(chapter.id);
                  if (!createdId) return;
                  const created = getSceneById(createdId);
                  if (!created) return;
                  openScene(created.id, created.title);
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded bg-[#253047] px-2 py-1 text-xs text-[#dbe4f5] hover:bg-[#2d3b56]"
              >
                <Plus size={12} />
                Сцена
              </button>
            </div>
            <div className="py-1">
              {chapter.scenes.map((scene, index) => {
                const isActive = scene.id === activeSceneId;
                return (
                  <div
                    key={scene.id}
                    className={`group flex items-stretch gap-0.5 border-l-2 ${
                      isActive ? "border-[#60a5fa] bg-[#1e2635]" : "border-transparent hover:bg-[#1a2130]"
                    }`}
                  >
                    {editingSceneId === scene.id ? (
                      <input
                        autoFocus
                        className="mx-1 my-0.5 min-w-0 flex-1 rounded border border-[#3b4a6a] bg-[#0f131c] px-1.5 py-1 text-sm text-[#f8fafc]"
                        value={sceneDraft}
                        onChange={(e) => setSceneDraft(e.target.value)}
                        onBlur={commitSceneTitle}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitSceneTitle();
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        draggable
                        onDragStart={() => setDragSceneId(scene.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!dragSceneId || dragSceneId === scene.id) return;
                          reorderScene(dragSceneId, chapter.id, index);
                        }}
                        onDragEnd={() => setDragSceneId(null)}
                        onClick={() => openScene(scene.id, scene.title)}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          setEditingSceneId(scene.id);
                          setSceneDraft(scene.title);
                        }}
                        className={`min-w-0 flex-1 truncate px-2 py-1.5 text-left text-sm ${
                          isActive ? "text-[#f8fafc]" : "text-[#cbd5e1]"
                        }`}
                        title="Щелчок — открыть · двойной щелчок — переименовать · перетащить — порядок"
                      >
                        {scene.title}
                      </button>
                    )}
                    {editingSceneId !== scene.id && (
                      <Tooltip content="Удалить сцену из проекта (не закрывает вкладку)" side="left">
                        <button
                          type="button"
                          draggable={false}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScene(scene.id, scene.title);
                          }}
                          className="shrink-0 px-1.5 text-[#6b7280] hover:text-[#f87171]"
                          aria-label={`Удалить сцену ${scene.title}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
