"use client";

import type { KeyboardEvent } from "react";
import { useRef } from "react";
import { useUIStore, type RibbonTab } from "@/stores/uiStore";
import { UI_COLORS } from "@/lib/theme/colors";
import HomeTab from "@/components/Ribbon/tabs/HomeTab";
import InsertTab from "@/components/Ribbon/tabs/InsertTab";
import DesignTab from "@/components/Ribbon/tabs/DesignTab";
import ViewTab from "@/components/Ribbon/tabs/ViewTab";

const SEGMENTS: { id: RibbonTab; label: string }[] = [
  { id: "home", label: "Правка" },
  { id: "insert", label: "Вставка" },
  { id: "design", label: "Конструктор" },
  { id: "view", label: "Вид" },
];

export default function WriterChrome() {
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTabAt = (index: number) => {
    const len = SEGMENTS.length;
    const i = ((index % len) + len) % len;
    setActiveTab(SEGMENTS[i].id);
    requestAnimationFrame(() => tabRefs.current[i]?.focus());
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      focusTabAt(index + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      focusTabAt(index - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusTabAt(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusTabAt(SEGMENTS.length - 1);
    }
  };

  return (
    <div className="shrink-0 select-none" style={{ background: UI_COLORS.ribbon.tabsBg }}>
      <div
        role="tablist"
        aria-label="Панель инструментов"
        className="flex items-center gap-0.5 border-b px-2 py-1 overflow-x-auto [scrollbar-width:thin]"
        style={{ borderColor: UI_COLORS.ribbon.tabsBorder }}
      >
        {SEGMENTS.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`writer-tab-${tab.id}`}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="writer-chrome-tabpanel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className="mb-0.5 mr-0.5 rounded-t-md px-3 py-1 text-[11px] font-medium transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chrome-accent/35 focus-visible:ring-offset-1 focus-visible:ring-offset-[#1E1E1E]"
              style={{
                background: isActive ? UI_COLORS.ribbon.tabActiveBg : "transparent",
                color: isActive ? UI_COLORS.ribbon.tabActiveText : UI_COLORS.ribbon.tabIdleText,
                border: isActive
                  ? `1px solid ${UI_COLORS.ribbon.tabActiveBorder}`
                  : "1px solid transparent",
                boxShadow: isActive
                  ? `inset 0 -1px 0 ${UI_COLORS.ribbon.tabActiveBg}, 0 0 0 1px ${UI_COLORS.ribbon.tabActiveGlow}`
                  : "none",
              }}
              onMouseEnter={(e) => {
                if (isActive) return;
                e.currentTarget.style.background = UI_COLORS.ribbon.tabIdleHoverBg;
                e.currentTarget.style.color = UI_COLORS.ribbon.tabActiveText;
              }}
              onMouseLeave={(e) => {
                if (isActive) return;
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = UI_COLORS.ribbon.tabIdleText;
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        id="writer-chrome-tabpanel"
        role="tabpanel"
        aria-labelledby={`writer-tab-${activeTab}`}
        className="border-b px-2 pb-1.5 pt-1"
        style={{
          background: UI_COLORS.ribbon.panelBg,
          borderColor: UI_COLORS.ribbon.panelBorder,
          minHeight: 104,
          maxHeight: 220,
          overflowX: "auto",
          overflowY: "auto",
          color: UI_COLORS.shellText,
        }}
      >
        <div
          className="min-w-fit rounded-md border px-1 py-1"
          style={{
            borderColor: UI_COLORS.ribbon.panelBorder,
            background: UI_COLORS.ribbon.panelInnerBg,
            color: UI_COLORS.shellText,
          }}
        >
          {activeTab === "home" && <HomeTab />}
          {activeTab === "insert" && <InsertTab />}
          {activeTab === "design" && <DesignTab />}
          {activeTab === "view" && <ViewTab />}
        </div>
      </div>
    </div>
  );
}
