"use client";

import { useState } from "react";
import EditorProvider from "@/components/Editor/EditorProvider";
import TitleBar from "@/components/TitleBar/TitleBar";
import RibbonTabs from "@/components/Ribbon/RibbonTabs";
import RibbonContent from "@/components/Ribbon/RibbonContent";
import HorizontalRuler from "@/components/Ruler/HorizontalRuler";
import DocumentCanvas from "@/components/Canvas/DocumentCanvas";
import DocxPreview from "@/components/Canvas/DocxPreview";
import StatusBar from "@/components/StatusBar/StatusBar";
import FindReplaceDialog from "@/components/Dialogs/FindReplace";
import FileMenu from "@/components/Dialogs/FileMenu";
import { useUIStore } from "@/stores/uiStore";
import { useAIStore } from "@/stores/aiStore";
import AIPanel from "@/components/AI/AIPanel";
import { TooltipProvider } from "@/components/ui/Tooltip";

export default function Home() {
  const showRuler = useUIStore((s) => s.showRuler);
  const viewMode = useUIStore((s) => s.viewMode);
  const previewData = useUIStore((s) => s.previewData);
  const aiPanelOpen = useAIStore((s) => s.panelOpen);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);

  return (
    <EditorProvider>
      <TooltipProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <TitleBar onFileMenuOpen={() => setFileMenuOpen(true)} />
        <RibbonTabs />
        <RibbonContent />
        <div className="flex flex-1 min-h-0 min-w-0">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {showRuler && viewMode === "edit" && <HorizontalRuler />}
            {viewMode === "preview" && previewData ? (
              <DocxPreview data={previewData} />
            ) : (
              <DocumentCanvas />
            )}
          </div>
          {aiPanelOpen && <AIPanel />}
        </div>
        <StatusBar />
        <FindReplaceDialog />
        <FileMenu open={fileMenuOpen} onClose={() => setFileMenuOpen(false)} />
      </div>
      </TooltipProvider>
    </EditorProvider>
  );
}
