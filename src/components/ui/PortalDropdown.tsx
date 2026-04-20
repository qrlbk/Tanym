"use client";

import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UI_COLORS } from "@/lib/theme/colors";

export type AnchoredDropdownLayout = {
  top: number;
  left: number;
  flipUp: boolean;
  finalMaxH: number;
};

/**
 * Measures anchor position in layout effect (not during render) so eslint react-hooks/refs is satisfied.
 */
export function useAnchoredDropdownLayout(
  anchorRef: React.RefObject<HTMLElement | null>,
  active: boolean,
  {
    panelWidth,
    maxHeight,
    flipThreshold,
    anchorGap = 2,
  }: {
    panelWidth: number;
    maxHeight: number;
    flipThreshold: number;
    anchorGap?: number;
  },
): AnchoredDropdownLayout | null {
  const [layout, setLayout] = useState<AnchoredDropdownLayout | null>(null);

  useLayoutEffect(() => {
    /* Layout measurement for fixed positioning; setState here is intentional (before paint). */
    /* eslint-disable react-hooks/set-state-in-effect -- portal anchor geometry */
    if (!active || typeof window === "undefined" || !anchorRef.current) {
      setLayout(null);
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    const posTop = rect.bottom + anchorGap;
    const spaceBelow = window.innerHeight - posTop - 8;
    const flipUp = spaceBelow < flipThreshold;
    let top = posTop;
    let finalMaxH = Math.min(maxHeight, Math.max(100, spaceBelow));
    if (flipUp) {
      top = rect.top - anchorGap;
      finalMaxH = Math.min(maxHeight, Math.max(100, rect.top - 8));
    }
    let left = rect.left;
    if (left + panelWidth > window.innerWidth - 8) {
      left = window.innerWidth - panelWidth - 8;
    }
    setLayout({
      top,
      left: Math.max(4, left),
      flipUp,
      finalMaxH,
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [active, anchorRef, panelWidth, maxHeight, flipThreshold, anchorGap]);

  return layout;
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
  const layout = useAnchoredDropdownLayout(anchorRef, isOpen, {
    panelWidth: width,
    maxHeight,
    flipThreshold: 120,
    anchorGap: 2,
  });

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

  if (!isOpen || typeof window === "undefined" || !layout) return null;

  const { top, left, flipUp, finalMaxH } = layout;

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
        left,
        width,
        maxHeight: finalMaxH,
        zIndex: 10050,
        ...panelStyle,
      }}
    >
      {children}
    </div>,
    document.body,
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
  const layout = useAnchoredDropdownLayout(anchorRef, true, {
    panelWidth: 220,
    maxHeight: 400,
    flipThreshold: 180,
    anchorGap: 2,
  });

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

  if (typeof window === "undefined" || !layout) return null;

  const { top, left, flipUp } = layout;

  return createPortal(
    <div
      ref={ref}
      className="p-2 bg-white border border-gray-300 rounded-lg shadow-xl"
      style={{
        position: "fixed",
        top: flipUp ? undefined : top,
        bottom: flipUp ? window.innerHeight - top : undefined,
        left,
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
    document.body,
  );
}
