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
  CANVAS_STACK_PADDING_V_PX,
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
    // #region agent log
    fetch("http://127.0.0.1:7554/ingest/2f3d836c-06cf-4f5d-9694-189e6dcde093", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "cc8ee0",
      },
      body: JSON.stringify({
        sessionId: "cc8ee0",
        hypothesisId: "H5",
        location: "DocumentCanvas.tsx:runReflow",
        message: "runReflow invoked",
        data: {
          contentHeightPx: geo.contentHeightPx,
          scale,
          docPagesBefore: countDocPages(editor.state.doc),
          textLen: editor.state.doc.textContent.length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const pump = (depth: number) => {
      if (depth > 200) return;
      const again = reflowDocPages(editor, geo.contentHeightPx, scale);
      const n = countDocPages(editor.state.doc);
      setLocalPageCount(n);
      setPageCount(n);
      if (again) requestAnimationFrame(() => pump(depth + 1));
    };
    pump(0);
  }, [editor, geo.contentHeightPx, scale, setPageCount]);

  useEffect(() => {
    if (!editor) return;

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        requestAnimationFrame(runReflow);
      });
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
      const paddingTop = CANVAS_STACK_PADDING_V_PX * scale;
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
  /** В Word лист имеет фиксированный размер (A4); масштаб только уменьшает/увеличивает вид, не ширину окна. */
  const scaledPageW = Math.ceil(geo.pageWidthPx * scale);
  const scaledStackH = Math.ceil(totalSlotHeight * scale);

  return (
    <EditorContextMenu>
      <div
        className="flex-1 overflow-auto relative print-area scroll-smooth overscroll-y-contain"
        style={{
          background: workspaceBg,
          scrollPaddingBottom: `${CANVAS_STACK_PADDING_V_PX}px`,
        } as React.CSSProperties}
        onWheel={handleWheel}
        onScroll={handleScroll}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div
          className="mx-auto flex shrink-0 flex-col"
          style={{
            width: scaledPageW,
            minWidth: scaledPageW,
            maxWidth: scaledPageW,
            paddingTop: CANVAS_STACK_PADDING_V_PX,
            paddingBottom: CANVAS_STACK_PADDING_V_PX,
          }}
        >
          {/*
            Обрезаем по размеру листа после scale(top left), иначе разметка остаётся 793px и растягивает скролл
            (как в Word: видимая ширина = физическая ширина страницы × зум).
          */}
          <div
            style={{
              width: scaledPageW,
              height: scaledStackH,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              ref={editorOuterRef}
              data-show-text-boundaries={showTextBoundaries ? "true" : undefined}
              style={{
                width: geo.pageWidthPx,
                position: "relative",
                minHeight: totalSlotHeight,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
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
      </div>
    </EditorContextMenu>
  );
}
