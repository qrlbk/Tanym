"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { computePageGeometry, PT_TO_PX, CM_TO_PX } from "@/lib/page-layout";

const RULER_HEIGHT = 18;
const TICK_STEP_PT = 10;

export default function HorizontalRuler() {
  const margins = useUIStore((s) => s.margins);
  const zoom = useUIStore((s) => s.zoom);
  const leftIndent = useUIStore((s) => s.leftIndent);
  const rightIndent = useUIStore((s) => s.rightIndent);
  const firstLineIndent = useUIStore((s) => s.firstLineIndent);
  const setLeftIndent = useUIStore((s) => s.setLeftIndent);
  const setRightIndent = useUIStore((s) => s.setRightIndent);
  const setFirstLineIndent = useUIStore((s) => s.setFirstLineIndent);
  const orientation = useUIStore((s) => s.orientation);
  const editor = useEditorContext();

  const rulerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const geo = computePageGeometry(orientation, margins);
  const scale = zoom / 100;
  const scaledPageWidthPx = geo.pageWidthPx * scale;
  const scaledMarginLeftPx = geo.marginLeftPx * scale;
  const scaledMarginRightPx = geo.marginRightPx * scale;
  const scaledContentWidthPx = geo.contentWidthPx * scale;

  const totalPt = geo.pageWidthPt;
  const ticks: { pos: number; label: string; major: boolean }[] = [];
  for (let pt = 0; pt <= totalPt; pt += TICK_STEP_PT) {
    const cm = pt / 28.3465;
    const isCm = Math.abs(cm - Math.round(cm)) < 0.05;
    ticks.push({
      pos: pt * PT_TO_PX * scale,
      label: isCm && Math.round(cm) > 0 ? String(Math.round(cm)) : "",
      major: isCm,
    });
  }

  useEffect(() => {
    if (!editor) return;
    const syncFromEditor = () => {
      const attrs = editor.getAttributes("paragraph");
      const ml = parseCmValue(attrs.marginLeft);
      const mr = parseCmValue(attrs.marginRight);
      const ti = parseCmValue(attrs.textIndent);
      if (ml !== null) setLeftIndent(ml);
      if (mr !== null) setRightIndent(mr);
      if (ti !== null) setFirstLineIndent(ti);
    };
    editor.on("selectionUpdate", syncFromEditor);
    return () => { editor.off("selectionUpdate", syncFromEditor); };
  }, [editor, setLeftIndent, setRightIndent, setFirstLineIndent]);

  const applyToEditor = useCallback(
    (left: number, right: number, firstLine: number) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .updateAttributes("paragraph", {
          marginLeft: left > 0 ? `${left}cm` : null,
          marginRight: right > 0 ? `${right}cm` : null,
          textIndent: firstLine > 0 ? `${firstLine}cm` : null,
        })
        .run();
    },
    [editor],
  );

  const handleMouseDown = useCallback(
    (marker: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(marker);
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const offsetPx = e.clientX - rect.left;
      const rulerCenter = rect.width / 2;
      const pageLeft = rulerCenter - scaledPageWidthPx / 2 + scaledMarginLeftPx;
      const pageRight =
        rulerCenter + scaledPageWidthPx / 2 - scaledMarginRightPx;
      const relPx = Math.max(
        0,
        Math.min(offsetPx - pageLeft, pageRight - pageLeft),
      );
      const relCm = relPx / (CM_TO_PX * scale);

      if (dragging === "left") {
        const v = Math.max(0, Math.round(relCm * 4) / 4);
        setLeftIndent(v);
      } else if (dragging === "right") {
        const contentCm = geo.contentWidthPx / CM_TO_PX;
        const fromRight = contentCm - relCm;
        const v = Math.max(0, Math.round(fromRight * 4) / 4);
        setRightIndent(v);
      } else if (dragging === "firstLine") {
        const v = Math.max(0, Math.round(relCm * 4) / 4);
        setFirstLineIndent(v);
      }
    };

    const handleMouseUp = () => {
      applyToEditor(
        useUIStore.getState().leftIndent,
        useUIStore.getState().rightIndent,
        useUIStore.getState().firstLineIndent,
      );
      setDragging(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    dragging,
    scale,
    scaledPageWidthPx,
    scaledMarginLeftPx,
    scaledMarginRightPx,
    geo.contentWidthPx,
    setLeftIndent,
    setRightIndent,
    setFirstLineIndent,
    applyToEditor,
  ]);

  const leftIndentPx = leftIndent * CM_TO_PX * scale;
  const rightIndentPx = rightIndent * CM_TO_PX * scale;
  const firstLineIndentPx = firstLineIndent * CM_TO_PX * scale;

  return (
    <div
      ref={rulerRef}
      className="shrink-0 relative select-none overflow-hidden"
      style={{
        height: RULER_HEIGHT,
        background: "#F3F3F3",
        borderBottom: "1px solid #D1D1D1",
      }}
    >
      <div
        className="absolute"
        style={{
          left: "50%",
          transform: `translateX(-${scaledPageWidthPx / 2}px)`,
          width: scaledPageWidthPx,
          height: RULER_HEIGHT,
        }}
      >
        <div
          className="absolute top-0 bottom-0"
          style={{ left: 0, width: scaledMarginLeftPx, background: "#E0E0E0" }}
        />
        <div
          className="absolute top-0 bottom-0"
          style={{
            right: 0,
            width: scaledMarginRightPx,
            background: "#E0E0E0",
          }}
        />
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: scaledMarginLeftPx,
            width: scaledContentWidthPx,
            background: "#FFFFFF",
          }}
        />

        {ticks.map((t, i) => (
          <div key={i} className="absolute" style={{ left: t.pos, top: 0 }}>
            <div
              style={{
                width: 1,
                height: t.major ? 10 : 5,
                background: "#888",
                marginLeft: -0.5,
                marginTop: t.major ? 0 : 5,
              }}
            />
            {t.major && t.label && (
              <span
                className="absolute text-[8px] text-gray-500"
                style={{ top: 1, left: 3 }}
              >
                {t.label}
              </span>
            )}
          </div>
        ))}

        {/* First-line indent (top triangle) */}
        <div
          className="absolute cursor-pointer z-10"
          style={{
            left: scaledMarginLeftPx + firstLineIndentPx - 4,
            top: 0,
          }}
          onMouseDown={handleMouseDown("firstLine")}
        >
          <svg width="8" height="6" viewBox="0 0 8 6">
            <polygon points="0,0 8,0 4,6" fill="#555" />
          </svg>
        </div>

        {/* Left indent (bottom triangle) */}
        <div
          className="absolute cursor-pointer z-10"
          style={{
            left: scaledMarginLeftPx + leftIndentPx - 4,
            bottom: 0,
          }}
          onMouseDown={handleMouseDown("left")}
        >
          <svg width="8" height="6" viewBox="0 0 8 6">
            <polygon points="0,6 8,6 4,0" fill="#555" />
          </svg>
        </div>

        {/* Right indent (bottom triangle) */}
        <div
          className="absolute cursor-pointer z-10"
          style={{
            left:
              scaledMarginLeftPx + scaledContentWidthPx - rightIndentPx - 4,
            bottom: 0,
          }}
          onMouseDown={handleMouseDown("right")}
        >
          <svg width="8" height="6" viewBox="0 0 8 6">
            <polygon points="0,6 8,6 4,0" fill="#555" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function parseCmValue(val: unknown): number | null {
  if (typeof val !== "string") return null;
  const m = val.match(/^([\d.]+)cm$/);
  return m ? parseFloat(m[1]) : null;
}
