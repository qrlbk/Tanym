"use client";

import { useState, useRef, useCallback } from "react";
import { Palette, Droplets, PaintBucket, ChevronDown } from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { PortalColorPicker } from "@/components/ui/PortalDropdown";
import { COLORS } from "@/lib/constants";

export default function DesignTab() {
  const editor = useEditorContext();
  const [showPageColor, setShowPageColor] = useState(false);
  const [pageColor, setPageColor] = useState("#FFFFFF");
  const pageBtnRef = useRef<HTMLDivElement>(null);

  const applyPageColor = useCallback(
    (color: string) => {
      setPageColor(color);
      const canvas = document.querySelector(".page-view") as HTMLElement;
      if (canvas) {
        document.querySelectorAll(".page-view").forEach((el) => {
          (el as HTMLElement).style.backgroundColor = color;
        });
      }
    },
    []
  );

  return (
    <div className="flex items-center h-[74px] px-2 gap-2">
      <button
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100"
        title="Темы оформления (В разработке)"
      >
        <Palette size={20} className="text-gray-600" />
        <span className="text-[9px] text-gray-600">Темы</span>
      </button>

      <div className="w-px h-12 bg-gray-200" />

      <button
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100"
        title="Цветовая схема (В разработке)"
      >
        <Droplets size={20} className="text-gray-600" />
        <span className="text-[9px] text-gray-600">Цвета</span>
      </button>

      <div className="w-px h-12 bg-gray-200" />

      {/* Page color - functional */}
      <div ref={pageBtnRef}>
        <button
          onClick={() => setShowPageColor(!showPageColor)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100"
          title="Изменить цвет фона страницы"
        >
          <div className="relative">
            <PaintBucket size={20} className="text-gray-600" />
            <div
              className="absolute -bottom-0.5 left-0.5 right-0.5 h-[3px] rounded-sm"
              style={{ background: pageColor === "#FFFFFF" ? "#ccc" : pageColor }}
            />
          </div>
          <div className="flex items-center gap-0.5">
            <span className="text-[9px] text-gray-600">Цвет страницы</span>
            <ChevronDown size={8} className="text-gray-400" />
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
    </div>
  );
}
