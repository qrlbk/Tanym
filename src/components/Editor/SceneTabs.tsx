"use client";

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useProjectStore } from "@/stores/projectStore";

export default function SceneTabs() {
  const tabs = useUIStore((s) => s.sceneTabs);
  const activeSceneId = useUIStore((s) => s.activeSceneId);
  const setActiveSceneId = useUIStore((s) => s.setActiveSceneId);
  const closeSceneTab = useUIStore((s) => s.closeSceneTab);
  const setSceneTabTitle = useUIStore((s) => s.setSceneTabTitle);
  const renameScene = useProjectStore((s) => s.renameScene);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const commitTitle = useCallback(() => {
    if (!editingId) return;
    const t = draft.trim();
    if (t) {
      renameScene(editingId, t);
      setSceneTabTitle(editingId, t);
    }
    setEditingId(null);
  }, [draft, editingId, renameScene, setSceneTabTitle]);

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center border-b border-[#25272f] bg-[#101218] px-2">
      {tabs.map((tab) => {
        const active = tab.sceneId === activeSceneId;
        return (
          <div
            key={tab.sceneId}
            className={`group mr-1 inline-flex max-w-[240px] items-center gap-1 rounded-t-md border border-b-0 px-2 py-1 text-xs ${
              active
                ? "border-[#3b4253] bg-[#1b2230] text-[#f3f4f6]"
                : "border-transparent bg-[#131722] text-[#9ca3af]"
            }`}
          >
            {editingId === tab.sceneId ? (
              <input
                autoFocus
                className="min-w-0 flex-1 rounded border border-[#4b5568] bg-[#0c0f16] px-1 py-0.5 text-xs text-[#f3f4f6]"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTitle();
                  }
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setActiveSceneId(tab.sceneId)}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  setEditingId(tab.sceneId);
                  setDraft(tab.title);
                }}
                className="min-w-0 flex-1 truncate text-left"
                title="Щелчок — активировать · двойной щелчок — переименовать"
              >
                {tab.title}
              </button>
            )}
            <button
              type="button"
              onClick={() => closeSceneTab(tab.sceneId)}
              className="rounded p-0.5 text-[#6b7280] hover:bg-[#202938] hover:text-[#e5e7eb]"
              aria-label={`Закрыть вкладку «${tab.title}»`}
              title="Закрыть вкладку (сцена остаётся в проекте; удалить — в Story Structure)"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
