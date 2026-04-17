"use client";

import { UI_COLORS } from "@/lib/theme/colors";

export function RibbonIsland({
  children,
  "aria-label": ariaLabel,
  className = "",
}: {
  children: React.ReactNode;
  "aria-label"?: string;
  className?: string;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className={`flex shrink-0 items-center gap-2 rounded-[12px] border px-2.5 py-2 font-sans shadow-[0_4px_20px_rgba(0,0,0,0.28)] ${className}`}
      style={{
        borderColor: UI_COLORS.shellBorder,
        background: UI_COLORS.shellBgElevated,
        boxShadow: `0 4px 18px rgba(0,0,0,0.35), inset 0 1px 0 ${UI_COLORS.ribbon.controlBorder}`,
      }}
    >
      {children}
    </div>
  );
}
