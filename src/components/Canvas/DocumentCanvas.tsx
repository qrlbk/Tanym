"use client";

import { useRef, useCallback, useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { EditorContent, useEditorState } from "@tiptap/react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { useUIStore } from "@/stores/uiStore";
import { useDocumentStore } from "@/stores/documentStore";
import { usePlotStoryStore, type PlotStoryState } from "@/stores/plotStoryStore";
import EditorContextMenu from "./ContextMenu";
import { useAutoSave } from "@/hooks/useAutoSave";
import {
  computePageGeometry,
  PAGE_GAP_PX,
  PAGE_CHROME,
  CANVAS_STACK_PADDING_V_PX,
} from "@/lib/page-layout";
import { countDocPages, PAGE_REFLOW_META } from "@/lib/page-reflow";
import { runPageLayout, isPaginationLayoutV2Enabled } from "@/lib/page-layout-engine";
import {
  bumpLayoutVersionHard,
  bumpContextVersion,
  buildPageRanges,
  getLayoutVersion,
  logReflowAction,
  scheduleSoftLayoutVersionBump,
} from "@/lib/layout";
import { THEME } from "@/lib/theme/colors";

const LAYOUT_DEBOUNCE_MS = 16;
const MAX_REFLOW_PUMP_DEPTH = 60;

export default function DocumentCanvas() {
  const editor = useEditorContext();
  const {
    zoom,
    orientation,
    margins,
    showTextBoundaries,
    setCanvasViewportInnerWidth,
    writerFocusMode,
    canvasAppearance,
  } = useUIStore(
    useShallow((s) => ({
      zoom: s.zoom,
      orientation: s.orientation,
      margins: s.margins,
      showTextBoundaries: s.showTextBoundaries,
      setCanvasViewportInnerWidth: s.setCanvasViewportInnerWidth,
      writerFocusMode: s.writerFocusMode,
      canvasAppearance: s.canvasAppearance,
    })),
  );
  const setPageCount = useDocumentStore((s) => s.setPageCount);
  const setCurrentPage = useDocumentStore((s) => s.setCurrentPage);
  const setPageRanges = useDocumentStore((s) => s.setPageRanges);
  const { consistencyWarnings, warningStatuses, chunkSceneMap } = usePlotStoryStore(
    useShallow((s: PlotStoryState) => ({
      consistencyWarnings: s.consistencyWarnings,
      warningStatuses: s.warningStatuses,
      chunkSceneMap: s.chunkSceneMap,
    })),
  );

  const editorOuterRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  /** Doc is source of truth — React state lagged behind reflow and clipped lower pages (overflow:hidden). */
  const docPageCountRaw = useEditorState({
    editor,
    selector: ({ editor: ed }) => (ed ? countDocPages(ed.state.doc) : 1),
  });
  const docPageRangesRaw = useEditorState({
    editor,
    selector: ({ editor: ed }) => (ed ? buildPageRanges(ed.state.doc) : []),
  });
  const docPageCount = docPageCountRaw ?? 1;
  const docPageRanges = useMemo(() => docPageRangesRaw ?? [], [docPageRangesRaw]);
  const editorRafOuterRef = useRef(0);
  const editorRafInnerRef = useRef(0);
  const layoutDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutRafRef = useRef(0);

  useAutoSave(editor, 30000);

  const geo = useMemo(
    () => computePageGeometry(orientation, margins),
    [orientation, margins],
  );
  const scale = zoom / 100;
  const fullPageSlot = geo.pageHeightPx + PAGE_GAP_PX;

  const runReflow = useCallback(() => {
    if (!editor?.state.schema.nodes.docPage) return;
    const versionAtStart = getLayoutVersion();
    logReflowAction("runReflow_start", {
      versionAtStart,
      contentHeightPx: geo.contentHeightPx,
      scale,
    });
    let anyAgain = false;
    const pump = (depth: number) => {
      if (depth > MAX_REFLOW_PUMP_DEPTH) {
        logReflowAction("runReflow_abort_max_depth", {
          depth,
          maxDepth: MAX_REFLOW_PUMP_DEPTH,
          versionAtStart,
        });
        return;
      }
      if (versionAtStart !== getLayoutVersion()) {
        logReflowAction("runReflow_abort_stale", {
          depth,
          versionAtStart,
          actualVersion: getLayoutVersion(),
        });
        return;
      }
      const again = runPageLayout(editor, {
        contentHeightPx: geo.contentHeightPx,
        viewScale: scale,
        expectedLayoutVersion: versionAtStart,
      });
      logReflowAction("runReflow_pump_iteration", {
        depth,
        again,
        versionAtStart,
      });
      if (again) anyAgain = true;
      if (again) requestAnimationFrame(() => pump(depth + 1));
    };
    pump(0);
    if (isPaginationLayoutV2Enabled() && anyAgain) {
      requestAnimationFrame(() => {
        if (versionAtStart !== getLayoutVersion()) return;
        runPageLayout(editor, {
          contentHeightPx: geo.contentHeightPx,
          viewScale: scale,
          expectedLayoutVersion: versionAtStart,
        });
      });
    }
  }, [editor, geo.contentHeightPx, scale]);

  const scheduleReflowFromEditor = useCallback(() => {
    if (layoutDebounceRef.current) {
      clearTimeout(layoutDebounceRef.current);
      layoutDebounceRef.current = null;
    }
    cancelAnimationFrame(layoutRafRef.current);
    cancelAnimationFrame(editorRafOuterRef.current);
    cancelAnimationFrame(editorRafInnerRef.current);
    editorRafOuterRef.current = requestAnimationFrame(() => {
      editorRafInnerRef.current = requestAnimationFrame(() => {
        runReflow();
      });
    });
  }, [runReflow]);

  const scheduleReflowFromLayout = useCallback(() => {
    cancelAnimationFrame(editorRafOuterRef.current);
    cancelAnimationFrame(editorRafInnerRef.current);
    if (layoutDebounceRef.current) clearTimeout(layoutDebounceRef.current);
    layoutDebounceRef.current = setTimeout(() => {
      layoutDebounceRef.current = null;
      cancelAnimationFrame(layoutRafRef.current);
      layoutRafRef.current = requestAnimationFrame(() => runReflow());
    }, LAYOUT_DEBOUNCE_MS);
  }, [runReflow]);

  useEffect(() => {
    if (!editor) return;

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        scheduleReflowFromEditor();
      });
    };

    const onUpdate = ({ transaction }: { transaction: { docChanged?: boolean; getMeta: (k: string) => unknown } }) => {
      if (!transaction.docChanged) return;
      if (transaction.getMeta(PAGE_REFLOW_META)) return;
      logReflowAction("editor_doc_changed_schedule_reflow", {
        currentLayoutVersion: getLayoutVersion(),
      });
      bumpContextVersion();
      scheduleSoftLayoutVersionBump();
      schedule();
    };

    editor.on("update", onUpdate);
    requestAnimationFrame(runReflow);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(editorRafOuterRef.current);
      cancelAnimationFrame(editorRafInnerRef.current);
      editor.off("update", onUpdate);
    };
  }, [editor, runReflow, scheduleReflowFromEditor]);

  useEffect(() => {
    // Hard layout invalidation: geometry / zoom changed.
    bumpLayoutVersionHard();
    scheduleReflowFromLayout();
  }, [geo.contentHeightPx, geo.pageWidthPx, scale, scheduleReflowFromLayout]);

  useEffect(() => {
    const root = editorOuterRef.current;
    if (!root) return;
    const observed = new WeakSet<Element>();
    const ro = new ResizeObserver(() => scheduleReflowFromLayout());
    ro.observe(root);
    const observeBodies = () => {
      root.querySelectorAll(".doc-page-body").forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el);
          ro.observe(el);
        }
      });
    };
    observeBodies();
    const mo = new MutationObserver(observeBodies);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      if (layoutDebounceRef.current) clearTimeout(layoutDebounceRef.current);
      cancelAnimationFrame(layoutRafRef.current);
      mo.disconnect();
      ro.disconnect();
    };
  }, [scheduleReflowFromLayout]);

  useEffect(() => {
    if (!editor) return;
    editor.commands.refreshContinuityMarkers();
  }, [editor, consistencyWarnings, warningStatuses, chunkSceneMap]);

  useEffect(() => {
    setPageCount(docPageCount);
  }, [docPageCount, setPageCount]);

  useEffect(() => {
    setPageRanges(docPageRanges);
  }, [docPageRanges, setPageRanges]);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setCanvasViewportInnerWidth(el.clientWidth);
    });
    ro.observe(el);
    setCanvasViewportInnerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [setCanvasViewportInnerWidth]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollEl = e.currentTarget;
      const scrollTop = scrollEl.scrollTop;
      const pageH = fullPageSlot * scale;
      const canvasPad = CANVAS_STACK_PADDING_V_PX;
      const current = Math.max(1, Math.floor((scrollTop - canvasPad + pageH / 2) / pageH) + 1);
      setCurrentPage(Math.min(current, docPageCount));
    },
    [docPageCount, fullPageSlot, scale, setCurrentPage],
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

  const workspaceBgLight =
    writerFocusMode === "draft"
      ? THEME.canvas.workspaceLight
      : writerFocusMode === "rewrite"
        ? THEME.canvas.workspaceLightWarm
        : "#d0ccc4";
  const workspaceBg =
    canvasAppearance === "dark"
      ? THEME.canvas.workspaceDark
      : workspaceBgLight;

  /** Shell `body` uses light-on-dark text; override here so the sheet inherits dark ink on light parchment. */
  const docForeground =
    canvasAppearance === "light"
      ? THEME.text.onSheetLight
      : THEME.text.onSheetDark;
  const docCaret =
    canvasAppearance === "light" ? "#111827" : THEME.text.onSheetDark;
  const totalSlotHeight =
    docPageCount * geo.pageHeightPx + Math.max(0, docPageCount - 1) * PAGE_GAP_PX;
  /** Лист фиксированного размера (A4); масштаб только меняет вид, не физическую ширину страницы. */
  const scaledPageW = Math.ceil(geo.pageWidthPx * scale);
  /** +2px запас: transform: scale + ceil даёт иногда срез верхней/нижней строки у края клипа. */
  const scaledStackH = Math.ceil(totalSlotHeight * scale) + 2;

  return (
    <EditorContextMenu>
      <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col">
        <div
          ref={scrollAreaRef}
          data-canvas-appearance={canvasAppearance}
          className="flex-1 min-h-0 min-w-0 overflow-auto relative print-area overscroll-y-contain"
          style={
            {
              background: workspaceBg,
              /** Без smooth: иначе колесо/трекпад дают «долгий спуск», как удерживаемая клавиша. */
              scrollBehavior: "auto",
              scrollPaddingBottom: `${CANVAS_STACK_PADDING_V_PX}px`,
              color: docForeground,
              caretColor: docCaret,
            } as React.CSSProperties
          }
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
              (видимая ширина = физическая ширина страницы × масштаб).
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
                data-canvas-appearance={canvasAppearance}
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
                  "--doc-foreground": docForeground,
                  "--doc-caret": docCaret,
                  color: docForeground,
                  caretColor: docCaret,
                } as React.CSSProperties}
              >
                <div className="relative z-[1]">
                  {editor && <EditorContent editor={editor} />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </EditorContextMenu>
  );
}
