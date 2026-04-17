"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import EditorProvider from "@/components/Editor/EditorProvider";
import WelcomeHome from "@/components/Home/WelcomeHome";
import TitleBar from "@/components/TitleBar/TitleBar";
import WriterChrome from "@/components/Shell/WriterChrome";
import TableContextRibbon from "@/components/Ribbon/TableContextRibbon";
import HorizontalRuler from "@/components/Ruler/HorizontalRuler";
import SceneCanvas from "@/components/Canvas/SceneCanvas";
import DocxPreview from "@/components/Canvas/DocxPreview";
import SceneTabs from "@/components/Editor/SceneTabs";
import StatusBar from "@/components/StatusBar/StatusBar";
import FindReplaceDialog from "@/components/Dialogs/FindReplace";
import FileMenu from "@/components/Dialogs/FileMenu";
import { useUIStore } from "@/stores/uiStore";
import { useAIStore } from "@/stores/aiStore";
import PlotIndexBridge from "@/components/PlotStory/PlotIndexBridge";
import LeftChapterNavigator from "@/components/PlotStory/LeftChapterNavigator";

const RightContextPanel = dynamic(
  () => import("@/components/PlotStory/RightContextPanel"),
  { ssr: false, loading: () => null },
);
import { TooltipProvider } from "@/components/ui/Tooltip";
import Toaster from "@/components/ui/Toaster";
import ShortcutsDialog from "@/components/Dialogs/ShortcutsDialog";

export default function Home() {
  const startScreen = useUIStore((s) => s.startScreen);
  const showRuler = useUIStore((s) => s.showRuler);
  const viewMode = useUIStore((s) => s.viewMode);
  const previewData = useUIStore((s) => s.previewData);
  const writerModeEnabled = useUIStore((s) => s.writerModeEnabled);
  const showChapterNavigator = useUIStore((s) => s.showChapterNavigator);
  const rightPanelTab = useUIStore((s) => s.rightPanelTab);
  const setRightPanelTab = useUIStore((s) => s.setRightPanelTab);
  const aiPanelOpen = useAIStore((s) => s.panelOpen);
  const plotPanelOpen = useUIStore((s) => s.showPlotPanel);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);

  useEffect(() => {
    if (aiPanelOpen && !plotPanelOpen && rightPanelTab !== "ai") {
      setRightPanelTab("ai");
    }
  }, [aiPanelOpen, plotPanelOpen, rightPanelTab, setRightPanelTab]);

  useEffect(() => {
    if (plotPanelOpen && !aiPanelOpen && rightPanelTab !== "story") {
      setRightPanelTab("story");
    }
  }, [plotPanelOpen, aiPanelOpen, rightPanelTab, setRightPanelTab]);

  return (
    <EditorProvider>
      <PlotIndexBridge />
      <TooltipProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <TitleBar onFileMenuOpen={() => setFileMenuOpen(true)} />
        {startScreen === "loading" && (
          <div
            className="flex flex-1 items-center justify-center text-[13px]"
            style={{ color: "var(--color-shell-text, #9ca3af)" }}
          >
            Загрузка…
          </div>
        )}
        {startScreen === "welcome" && <WelcomeHome />}
        {startScreen === "editor" && (
          <>
            {!writerModeEnabled && <WriterChrome />}
            {!writerModeEnabled && <TableContextRibbon />}
            <div className="flex min-h-0 min-w-0 flex-1">
              {showChapterNavigator && <LeftChapterNavigator />}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <SceneTabs />
                {showRuler && viewMode === "edit" && <HorizontalRuler />}
                {viewMode === "preview" && previewData ? (
                  <DocxPreview data={previewData} />
                ) : (
                  <SceneCanvas />
                )}
              </div>
              {(plotPanelOpen || aiPanelOpen) && <RightContextPanel />}
            </div>
            <StatusBar />
            <FindReplaceDialog />
          </>
        )}
        <FileMenu open={fileMenuOpen} onClose={() => setFileMenuOpen(false)} />
        <Toaster />
        <ShortcutsDialog />
      </div>
      </TooltipProvider>
    </EditorProvider>
  );
}
