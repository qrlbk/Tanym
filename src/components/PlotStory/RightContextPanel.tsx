"use client";

import { Sparkles, BookOpen, X } from "lucide-react";
import { useAIStore } from "@/stores/aiStore";
import { useUIStore } from "@/stores/uiStore";
import AIPanel from "@/components/AI/AIPanel";
import PlotStoryPanel from "@/components/PlotStory/PlotStoryPanel";
import { UI_COLORS } from "@/lib/theme/colors";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { useProjectStore } from "@/stores/projectStore";
import { useEditorState } from "@tiptap/react";

export default function RightContextPanel() {
  const panelOpen = useAIStore((s) => s.panelOpen);
  const setPanelOpen = useAIStore((s) => s.setPanelOpen);
  const showPlotPanel = useUIStore((s) => s.showPlotPanel);
  const setShowPlotPanel = useUIStore((s) => s.setShowPlotPanel);
  const rightPanelTab = useUIStore((s) => s.rightPanelTab);
  const setRightPanelTab = useUIStore((s) => s.setRightPanelTab);
  const activeSceneId = useUIStore((s) => s.activeSceneId);
  const getSceneById = useProjectStore((s) => s.getSceneById);
  const editor = useEditorContext();
  const selectionPreview = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed) return "";
      const { from, to } = ed.state.selection;
      if (to <= from) return "";
      return ed.state.doc.textBetween(from, to, " ").slice(0, 90);
    },
  }) ?? "";
  const sceneTitle = activeSceneId ? getSceneById(activeSceneId)?.title ?? null : null;

  const visible = panelOpen || showPlotPanel;
  if (!visible) return null;

  return (
    <>
      <div className="lg:hidden fixed inset-0 z-[130] bg-black/35" onClick={() => {
        setPanelOpen(false);
        setShowPlotPanel(false);
      }} />
      <aside
        className="fixed z-[140] inset-y-0 right-0 w-[88vw] max-w-[460px] border-l flex flex-col lg:static lg:z-auto lg:w-[420px] lg:min-w-[340px] lg:max-w-[520px]"
        style={{
          background: UI_COLORS.storyPanel.surface,
          borderColor: UI_COLORS.storyPanel.border,
        }}
      >
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{
          borderColor: UI_COLORS.storyPanel.border,
          background: UI_COLORS.storyPanel.headerFrom,
        }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: UI_COLORS.storyPanel.textMuted }}
        >
          Story Workspace
        </p>
        <button
          type="button"
          onClick={() => {
            setPanelOpen(false);
            setShowPlotPanel(false);
          }}
          className="p-1 rounded"
          style={{ color: UI_COLORS.storyPanel.textMuted }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = UI_COLORS.storyPanel.closeHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
          title="Закрыть правую панель"
        >
          <X size={14} />
        </button>
      </div>

      <div
        className="grid grid-cols-2 border-b"
        style={{
          borderColor: UI_COLORS.storyPanel.border,
          background: UI_COLORS.storyPanel.surface,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setPanelOpen(false);
            setShowPlotPanel(true);
            setRightPanelTab("story");
          }}
          className="inline-flex items-center justify-center gap-1.5 py-2 text-xs border-b-2 transition-colors"
          style={
            rightPanelTab === "story"
              ? {
                  borderColor: UI_COLORS.rightContext.storyTabActiveBorder,
                  color: UI_COLORS.rightContext.storyTabActiveText,
                  background: UI_COLORS.rightContext.storyTabActiveBg,
                }
              : {
                  borderColor: "transparent",
                  color: UI_COLORS.rightContext.tabIdleText,
                }
          }
          onMouseEnter={(e) => {
            if (rightPanelTab !== "story") {
              e.currentTarget.style.background = UI_COLORS.rightContext.tabIdleHoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (rightPanelTab !== "story") {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <BookOpen size={13} />
          Story Memory
        </button>
        <button
          type="button"
          onClick={() => {
            setShowPlotPanel(false);
            setPanelOpen(true);
            setRightPanelTab("ai");
          }}
          className="inline-flex items-center justify-center gap-1.5 py-2 text-xs border-b-2 transition-colors"
          style={
            rightPanelTab === "ai"
              ? {
                  borderColor: UI_COLORS.rightContext.aiTabActiveBorder,
                  color: UI_COLORS.rightContext.aiTabActiveText,
                  background: UI_COLORS.rightContext.aiTabActiveBg,
                }
              : {
                  borderColor: "transparent",
                  color: UI_COLORS.rightContext.tabIdleText,
                }
          }
          onMouseEnter={(e) => {
            if (rightPanelTab !== "ai") {
              e.currentTarget.style.background = UI_COLORS.rightContext.tabIdleHoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (rightPanelTab !== "ai") {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <Sparkles size={13} />
          AI Co-writer
        </button>
      </div>

      <div
        className="border-b px-3 py-2 text-[11px]"
        style={{ borderColor: UI_COLORS.storyPanel.border, color: UI_COLORS.storyPanel.textMuted }}
      >
        <div className="truncate">
          Scene: <span style={{ color: UI_COLORS.storyPanel.textPrimary }}>{sceneTitle ?? "—"}</span>
        </div>
        <div className="truncate">
          Cursor:{" "}
          <span style={{ color: UI_COLORS.storyPanel.textPrimary }}>
            {selectionPreview || "Нет выделения"}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {rightPanelTab === "ai" ? (
          <AIPanel embedded forceOpen />
        ) : (
          <PlotStoryPanel embedded />
        )}
      </div>
      </aside>
    </>
  );
}
