"use client";

import { useState, useRef } from "react";
import { Ruler, ZoomIn, ZoomOut, Maximize, Grid3X3, ChevronDown, SquareDashed } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { PortalDropdown } from "@/components/ui/PortalDropdown";

const ZOOM_PRESETS = [
  { label: "50%", value: 50 },
  { label: "75%", value: 75 },
  { label: "100%", value: 100 },
  { label: "125%", value: 125 },
  { label: "150%", value: 150 },
  { label: "200%", value: 200 },
  { label: "300%", value: 300 },
];

export default function ViewTab() {
  const showRuler = useUIStore((s) => s.showRuler);
  const setShowRuler = useUIStore((s) => s.setShowRuler);
  const showTextBoundaries = useUIStore((s) => s.showTextBoundaries);
  const setShowTextBoundaries = useUIStore((s) => s.setShowTextBoundaries);
  const zoom = useUIStore((s) => s.zoom);
  const setZoom = useUIStore((s) => s.setZoom);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [isEditingZoom, setIsEditingZoom] = useState(false);
  const [zoomInput, setZoomInput] = useState("");
  const zoomRef = useRef<HTMLDivElement>(null);
  const zoomInputRef = useRef<HTMLInputElement>(null);

  const startZoomEdit = () => {
    setZoomInput(String(zoom));
    setIsEditingZoom(true);
    setTimeout(() => zoomInputRef.current?.select(), 0);
  };

  const commitZoom = (val: string) => {
    const num = parseInt(val);
    if (num >= 10 && num <= 500) setZoom(num);
    setIsEditingZoom(false);
  };

  return (
    <div className="flex items-center h-[74px] px-2 gap-2">
      {/* Ruler toggle */}
      <button
        onClick={() => setShowRuler(!showRuler)}
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100"
        style={{ background: showRuler ? "#D0E0F0" : undefined }}
        title={showRuler ? "Скрыть линейку" : "Показать линейку"}
      >
        <Ruler size={20} className="text-gray-600" />
        <span className="text-[9px] text-gray-600">Линейка</span>
      </button>

      <div className="w-px h-12 bg-gray-200" />

      <button
        type="button"
        onClick={() => setShowTextBoundaries(!showTextBoundaries)}
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100 max-w-[72px]"
        style={{ background: showTextBoundaries ? "#D0E0F0" : undefined }}
        title={
          showTextBoundaries
            ? "Скрыть границы области набора"
            : "Показать границы области набора (как в Word)"
        }
      >
        <SquareDashed size={20} className="text-gray-600 shrink-0" />
        <span className="text-[8px] text-gray-600 text-center leading-tight">
          Границы текста
        </span>
      </button>

      <div className="w-px h-12 bg-gray-200" />

      {/* Zoom - / value / + */}
      <button
        onClick={() => setZoom(zoom - 10)}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100"
        title="Уменьшить масштаб"
      >
        <ZoomOut size={20} className="text-gray-600" />
        <span className="text-[9px] text-gray-600">−</span>
      </button>

      {/* Editable zoom value */}
      <div ref={zoomRef}>
        {isEditingZoom ? (
          <input
            ref={zoomInputRef}
            className="w-[50px] h-[28px] text-center text-[12px] border border-blue-400 rounded outline-none"
            value={zoomInput}
            onChange={(e) => setZoomInput(e.target.value.replace(/[^0-9]/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitZoom(zoomInput);
              if (e.key === "Escape") setIsEditingZoom(false);
            }}
            onBlur={() => commitZoom(zoomInput)}
            autoFocus
          />
        ) : (
          <button
            onClick={startZoomEdit}
            className="w-[50px] h-[28px] text-[12px] text-gray-700 font-medium border border-gray-300 rounded hover:border-gray-400 bg-white flex items-center justify-center gap-0.5"
            title="Нажмите чтобы ввести масштаб"
          >
            {zoom}%
            <ChevronDown size={8} className="text-gray-400" />
          </button>
        )}
        <PortalDropdown
          anchorRef={zoomRef}
          isOpen={showZoomMenu}
          onClose={() => setShowZoomMenu(false)}
          width={100}
        >
          <div className="py-1">
            {ZOOM_PRESETS.map((p) => (
              <button
                key={p.value}
                className="w-full text-left px-3 py-1 text-[12px] hover:bg-blue-50"
                style={{ background: zoom === p.value ? "#E8F0FE" : undefined }}
                onClick={() => { setZoom(p.value); setShowZoomMenu(false); }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </PortalDropdown>
      </div>

      <button
        onClick={() => setZoom(zoom + 10)}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100"
        title="Увеличить масштаб"
      >
        <ZoomIn size={20} className="text-gray-600" />
        <span className="text-[9px] text-gray-600">+</span>
      </button>

      <div className="w-px h-12 bg-gray-200" />

      {/* Presets */}
      <button
        onClick={() => setZoom(100)}
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100"
        style={{ background: zoom === 100 ? "#D0E0F0" : undefined }}
        title="Масштаб 100%"
      >
        <Maximize size={20} className="text-gray-600" />
        <span className="text-[9px] text-gray-600">100%</span>
      </button>

      <button
        onClick={() => setShowZoomMenu(!showZoomMenu)}
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100"
        title="Выбрать масштаб"
      >
        <Grid3X3 size={20} className="text-gray-600" />
        <div className="flex items-center gap-0.5">
          <span className="text-[9px] text-gray-600">Масштаб</span>
          <ChevronDown size={8} className="text-gray-400" />
        </div>
      </button>
    </div>
  );
}
