"use client";

import { useState, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { MARGIN_PRESETS } from "@/lib/constants";
import { PortalDropdown } from "@/components/ui/PortalDropdown";

const PAPER_SIZES = [
  { name: "A4", desc: "21 × 29.7 см", w: 21, h: 29.7 },
  { name: "A3", desc: "29.7 × 42 см", w: 29.7, h: 42 },
  { name: "A5", desc: "14.8 × 21 см", w: 14.8, h: 21 },
  { name: "Letter", desc: "21.59 × 27.94 см", w: 21.59, h: 27.94 },
  { name: "Legal", desc: "21.59 × 35.56 см", w: 21.59, h: 35.56 },
];

const marginPresets = [
  { name: "Обычные", key: "normal" as const, desc: "Верх: 2  Низ: 2  Лево: 2  Право: 2 см" },
  { name: "Узкие", key: "narrow" as const, desc: "1.27 см со всех сторон" },
  { name: "Средние", key: "moderate" as const, desc: "Верх: 2.54  Лево: 1.91 см" },
  { name: "Широкие", key: "wide" as const, desc: "Верх: 2.54  Лево: 3.17 см" },
];

function RibbonButton({
  onClick,
  icon,
  label,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100"
    >
      {icon}
      <div className="flex items-center gap-0.5">
        <span className="text-[9px] text-gray-600">{label}</span>
        {children}
      </div>
    </button>
  );
}

export default function LayoutTab() {
  const orientation = useUIStore((s) => s.orientation);
  const setOrientation = useUIStore((s) => s.setOrientation);
  const margins = useUIStore((s) => s.margins);
  const setMargins = useUIStore((s) => s.setMargins);
  const [showMargins, setShowMargins] = useState(false);
  const [showOrientation, setShowOrientation] = useState(false);
  const [showSize, setShowSize] = useState(false);
  const marginsRef = useRef<HTMLDivElement>(null);
  const orientRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex items-center h-[74px] px-2 gap-2">
      {/* Margins */}
      <div ref={marginsRef}>
        <RibbonButton
          onClick={() => setShowMargins(!showMargins)}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#555" strokeWidth="1.2">
              <rect x="2" y="2" width="16" height="16" rx="1" />
              <rect x="5" y="5" width="10" height="10" strokeDasharray="2 1" />
            </svg>
          }
          label="Поля"
        >
          <ChevronDown size={8} className="text-gray-400" />
        </RibbonButton>
        <PortalDropdown
          anchorRef={marginsRef}
          isOpen={showMargins}
          onClose={() => setShowMargins(false)}
          width={220}
        >
          <div className="py-1">
            <p className="px-3 py-1 text-[10px] text-gray-400 font-medium">ПОЛЯ СТРАНИЦЫ</p>
            {marginPresets.map((mp) => {
              const active = JSON.stringify(margins) === JSON.stringify(MARGIN_PRESETS[mp.key]);
              return (
                <button
                  key={mp.key}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 flex flex-col"
                  style={{ background: active ? "#E8F0FE" : undefined }}
                  onClick={() => { setMargins(MARGIN_PRESETS[mp.key]); setShowMargins(false); }}
                >
                  <span className="text-[12px] font-medium">{mp.name}</span>
                  <span className="text-[10px] text-gray-500">{mp.desc}</span>
                </button>
              );
            })}
          </div>
        </PortalDropdown>
      </div>

      <div className="w-px h-12 bg-gray-200" />

      {/* Orientation */}
      <div ref={orientRef}>
        <RibbonButton
          onClick={() => setShowOrientation(!showOrientation)}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#555" strokeWidth="1.2">
              {orientation === "portrait" ? (
                <rect x="4" y="2" width="12" height="16" rx="1" />
              ) : (
                <rect x="2" y="4" width="16" height="12" rx="1" />
              )}
            </svg>
          }
          label="Ориентация"
        >
          <ChevronDown size={8} className="text-gray-400" />
        </RibbonButton>
        <PortalDropdown
          anchorRef={orientRef}
          isOpen={showOrientation}
          onClose={() => setShowOrientation(false)}
          width={180}
        >
          <div className="py-1">
            {[
              { id: "portrait" as const, label: "Книжная", desc: "Вертикальная" },
              { id: "landscape" as const, label: "Альбомная", desc: "Горизонтальная" },
            ].map((o) => (
              <button
                key={o.id}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-3"
                style={{ background: orientation === o.id ? "#E8F0FE" : undefined }}
                onClick={() => { setOrientation(o.id); setShowOrientation(false); }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#555" strokeWidth="1">
                  {o.id === "portrait" ? <rect x="5" y="2" width="10" height="16" rx="1" /> : <rect x="2" y="5" width="16" height="10" rx="1" />}
                </svg>
                <div>
                  <div className="text-[12px] font-medium">{o.label}</div>
                  <div className="text-[10px] text-gray-500">{o.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </PortalDropdown>
      </div>

      <div className="w-px h-12 bg-gray-200" />

      {/* Paper size */}
      <div ref={sizeRef}>
        <RibbonButton
          onClick={() => setShowSize(!showSize)}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#555" strokeWidth="1.2">
              <rect x="3" y="2" width="14" height="16" rx="1" />
              <text x="10" y="12" textAnchor="middle" fontSize="6" fill="#555" stroke="none">A4</text>
            </svg>
          }
          label="Размер"
        >
          <ChevronDown size={8} className="text-gray-400" />
        </RibbonButton>
        <PortalDropdown
          anchorRef={sizeRef}
          isOpen={showSize}
          onClose={() => setShowSize(false)}
          width={200}
        >
          <div className="py-1">
            <p className="px-3 py-1 text-[10px] text-gray-400 font-medium">РАЗМЕР БУМАГИ</p>
            {PAPER_SIZES.map((s) => (
              <button
                key={s.name}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 flex flex-col"
                onClick={() => setShowSize(false)}
              >
                <span className="text-[12px] font-medium">{s.name}</span>
                <span className="text-[10px] text-gray-500">{s.desc}</span>
              </button>
            ))}
          </div>
        </PortalDropdown>
      </div>
    </div>
  );
}
