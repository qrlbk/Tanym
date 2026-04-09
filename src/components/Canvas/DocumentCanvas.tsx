"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { EditorContent } from "@tiptap/react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { useUIStore } from "@/stores/uiStore";
import { useDocumentStore } from "@/stores/documentStore";
import EditorContextMenu from "./ContextMenu";
import { useAutoSave } from "@/hooks/useAutoSave";
import {
  computePageGeometry,
  PAGE_GAP_PX,
  PAGE_CHROME,
} from "@/lib/page-layout";
import { reflowDocPages, countDocPages, PAGE_REFLOW_META } from "@/lib/page-reflow";

export default function DocumentCanvas() {
  const editor = useEditorContext();
  const zoom = useUIStore((s) => s.zoom);
  const setZoom = useUIStore((s) => s.setZoom);
  const orientation = useUIStore((s) => s.orientation);
  const margins = useUIStore((s) => s.margins);
  const showTextBoundaries = useUIStore((s) => s.showTextBoundaries);
  const setPageCount = useDocumentStore((s) => s.setPageCount);
  const setCurrentPage = useDocumentStore((s) => s.setCurrentPage);

  const editorOuterRef = useRef<HTMLDivElement>(null);
  const [pageCount, setLocalPageCount] = useState(1);

  useAutoSave(editor, 30000);

  const geo = computePageGeometry(orientation, margins);
  const scale = zoom / 100;
  const fullPageSlot = geo.pageHeightPx + PAGE_GAP_PX;

  const runReflow = useCallback(() => {
    if (!editor?.state.schema.nodes.docPage) return;
    reflowDocPages(editor, geo.contentHeightPx);
    const n = countDocPages(editor.state.doc);
    setLocalPageCount(n);
    setPageCount(n);
  }, [editor, geo.contentHeightPx, setPageCount]);

  useEffect(() => {
    if (!editor) return;

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(runReflow);
    };

    const onUpdate = ({ transaction }: { transaction: { docChanged?: boolean; getMeta: (k: string) => unknown } }) => {
      if (!transaction.docChanged) return;
      if (transaction.getMeta(PAGE_REFLOW_META)) return;
      schedule();
    };

    editor.on("update", onUpdate);
    requestAnimationFrame(runReflow);

    return () => {
      cancelAnimationFrame(raf);
      editor.off("update", onUpdate);
    };
  }, [editor, runReflow]);

  useEffect(() => {
    if (!editorOuterRef.current) return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(runReflow);
    });
    ro.observe(editorOuterRef.current);
    return () => ro.disconnect();
  }, [runReflow]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(zoom + (e.deltaY < 0 ? 5 : -5));
      }
    },
    [zoom, setZoom],
  );

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop;
      const pageH = fullPageSlot * scale;
      const paddingTop = 24 * scale;
      const current = Math.max(
        1,
        Math.floor((scrollTop - paddingTop + pageH / 2) / pageH) + 1,
      );
      setCurrentPage(Math.min(current, pageCount));
    },
    [fullPageSlot, scale, pageCount, setCurrentPage],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!editor) return;
      const files = e.dataTransfer.files;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = () => {
            editor.chain().focus().setImage({ src: reader.result as string }).run();
          };
          reader.readAsDataURL(file);
        }
      }
    },
    [editor],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const workspaceBg = PAGE_CHROME.workspaceBackground;
  const totalSlotHeight = pageCount * geo.pageHeightPx + Math.max(0, pageCount - 1) * PAGE_GAP_PX;

  return (
    <EditorContextMenu>
      <div
        className="flex-1 overflow-auto relative print-area scroll-smooth overscroll-y-contain"
        style={{
          background: workspaceBg,
          scrollPaddingBottom: "24px",
          "--page-zoom": String(scale),
        } as React.CSSProperties}
        onWheel={handleWheel}
        onScroll={handleScroll}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div
          className="mx-auto py-6"
          style={{
            width: geo.pageWidthPx * scale,
            minWidth: geo.pageWidthPx * scale,
          }}
        >
          <div
            ref={editorOuterRef}
            data-show-text-boundaries={showTextBoundaries ? "true" : undefined}
            style={{
              transform: `scale(var(--page-zoom, ${scale}))`,
              transformOrigin: "top center",
              width: geo.pageWidthPx,
              margin: "0 auto",
              position: "relative",
              minHeight: totalSlotHeight,
              "--doc-page-width-px": `${geo.pageWidthPx}px`,
              "--doc-page-height-px": `${geo.pageHeightPx}px`,
              "--doc-page-gap-px": `${PAGE_GAP_PX}px`,
              "--doc-sheet-shadow": PAGE_CHROME.sheetShadow,
              "--doc-margin-top": `${geo.marginTopPx}px`,
              "--doc-margin-right": `${geo.marginRightPx}px`,
              "--doc-margin-bottom": `${geo.marginBottomPx}px`,
              "--doc-margin-left": `${geo.marginLeftPx}px`,
              "--doc-content-height": `${geo.contentHeightPx}px`,
            } as React.CSSProperties}
          >
            <div className="relative z-[1]">
              {editor && <EditorContent editor={editor} />}
            </div>
          </div>
        </div>
      </div>
    </EditorContextMenu>
  );
}
