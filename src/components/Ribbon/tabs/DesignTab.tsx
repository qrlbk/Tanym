"use client";

import { useState, useRef, useCallback } from "react";
import { PaintBucket, ChevronDown } from "lucide-react";
import { PortalColorPicker } from "@/components/ui/PortalDropdown";
import { COLORS } from "@/lib/constants";
import { UI_COLORS } from "@/lib/theme/colors";
import { RibbonIsland } from "@/components/Ribbon/RibbonIsland";

export default function DesignTab() {
  const [showPageColor, setShowPageColor] = useState(false);
  const [pageColor, setPageColor] = useState("#FFFFFF");
  const pageBtnRef = useRef<HTMLDivElement>(null);

  const applyPageColor = useCallback((color: string) => {
    setPageColor(color);
    document.querySelectorAll(".page-view").forEach((el) => {
      (el as HTMLElement).style.backgroundColor = color;
    });
  }, []);

  return (
    <div
      className="flex min-h-0 min-w-0 flex-wrap items-stretch gap-2.5 py-1.5 pl-0.5 pr-1"
      style={{ color: UI_COLORS.shellText, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <RibbonIsland aria-label="Страница">
        <div ref={pageBtnRef}>
          <button
            type="button"
            onClick={() => setShowPageColor(!showPageColor)}
            className="flex flex-col items-center gap-0.5 rounded-[9px] border border-transparent px-3 py-1.5 transition-colors"
            style={{ color: UI_COLORS.shellText }}
            title="Цвет фона страницы (лист)"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
              e.currentTarget.style.borderColor = UI_COLORS.ribbon.controlBorder;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
            }}
          >
            <div className="relative">
              <PaintBucket size={18} style={{ color: UI_COLORS.shellText }} />
              <div
                className="absolute -bottom-0.5 left-0.5 right-0.5 h-[3px] rounded-sm"
                style={{ background: pageColor === "#FFFFFF" ? UI_COLORS.shellBorder : pageColor }}
              />
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[9px]" style={{ color: UI_COLORS.shellTextMuted }}>
                Фон страницы
              </span>
              <ChevronDown size={8} style={{ color: UI_COLORS.shellTextMuted }} />
            </div>
          </button>
          {showPageColor && (
            <PortalColorPicker
              anchorRef={pageBtnRef}
              colors={COLORS}
              onSelect={applyPageColor}
              onClose={() => setShowPageColor(false)}
            />
          )}
        </div>
      </RibbonIsland>
    </div>
  );
}
