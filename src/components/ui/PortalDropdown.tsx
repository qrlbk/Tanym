"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UI_COLORS } from "@/lib/theme/colors";

function useAnchorPos(anchorRef: React.RefObject<HTMLElement | null>, isOpen: boolean) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, anchorH: 0 });
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 2, left: rect.left, width: rect.width, anchorH: rect.height });
  }, [isOpen, anchorRef]);
  return pos;
}

export function PortalDropdown({
  anchorRef,
  isOpen,
  onClose,
  width,
  maxHeight = 320,
  variant = "light",
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  width: number;
  maxHeight?: number;
  variant?: "light" | "dark";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useAnchorPos(anchorRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen || typeof window === "undefined") return null;

  const spaceBelow = window.innerHeight - pos.top - 8;
  const flipUp = spaceBelow < 120;
  let top = pos.top;
  let finalMaxH = Math.min(maxHeight, Math.max(100, spaceBelow));

  if (flipUp && anchorRef.current) {
    const rect = anchorRef.current.getBoundingClientRect();
    top = rect.top - 2;
    finalMaxH = Math.min(maxHeight, rect.top - 8);
  }

  let left = pos.left;
  if (left + width > window.innerWidth - 8) {
    left = window.innerWidth - width - 8;
  }

  const panelStyle =
    variant === "dark"
      ? {
          borderColor: UI_COLORS.shellBorder,
          background: UI_COLORS.shellBgElevated,
          boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        }
      : {};

  return createPortal(
    <div
      ref={ref}
      className={
        variant === "dark"
          ? "overflow-y-auto rounded-[10px] border shadow-xl"
          : "overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-xl"
      }
      style={{
        position: "fixed",
        top: flipUp ? undefined : top,
        bottom: flipUp ? window.innerHeight - top : undefined,
        left: Math.max(4, left),
        width,
        maxHeight: finalMaxH,
        zIndex: 10050,
        ...panelStyle,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

export function PortalColorPicker({
  anchorRef,
  colors,
  onSelect,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  colors: string[];
  onSelect: (color: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useAnchorPos(anchorRef, true);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  if (typeof window === "undefined") return null;

  const spaceBelow = window.innerHeight - pos.top - 8;
  const flipUp = spaceBelow < 180;
  let top = pos.top;
  if (flipUp && anchorRef.current) {
    const rect = anchorRef.current.getBoundingClientRect();
    top = rect.top - 2;
  }
  let left = pos.left;
  if (left + 220 > window.innerWidth - 8) left = window.innerWidth - 228;

  return createPortal(
    <div
      ref={ref}
      className="p-2 bg-white border border-gray-300 rounded-lg shadow-xl"
      style={{
        position: "fixed",
        top: flipUp ? undefined : top,
        bottom: flipUp ? window.innerHeight - top : undefined,
        left: Math.max(4, left),
        width: 220,
        zIndex: 9999,
      }}
    >
      <div className="grid grid-cols-10 gap-0.5">
        {colors.map((color) => (
          <button
            key={color}
            className="w-5 h-5 rounded-sm border border-gray-200 hover:scale-125 transition-transform"
            style={{ background: color }}
            onClick={() => { onSelect(color); onClose(); }}
          />
        ))}
      </div>
    </div>,
    document.body
  );
}
