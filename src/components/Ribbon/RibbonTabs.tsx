"use client";

import { useRef, KeyboardEvent } from "react";
import { useUIStore, RibbonTab } from "@/stores/uiStore";

const tabs: { id: RibbonTab; label: string }[] = [
  { id: "home", label: "Главная" },
  { id: "insert", label: "Вставка" },
  { id: "design", label: "Конструктор" },
  { id: "layout", label: "Макет" },
  { id: "references", label: "Ссылки" },
  { id: "mailings", label: "Рассылки" },
  { id: "review", label: "Рецензирование" },
  { id: "view", label: "Вид" },
];

export default function RibbonTabs() {
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTabAt = (index: number) => {
    const len = tabs.length;
    const i = ((index % len) + len) % len;
    setActiveTab(tabs[i].id);
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
      focusTabAt(tabs.length - 1);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Лента команд"
      className="flex items-end h-[30px] px-2 shrink-0 border-b select-none overflow-x-auto [scrollbar-width:thin]"
      style={{ background: "#F3F3F3", borderColor: "#D1D1D1" }}
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`ribbon-tab-${tab.id}`}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls="ribbon-tabpanel"
            tabIndex={isActive ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className="px-3 py-1 text-[12px] relative transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-word-blue/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#F3F3F3]"
            style={{
              background: isActive ? "#FFFFFF" : "transparent",
              borderTopLeftRadius: isActive ? 3 : 0,
              borderTopRightRadius: isActive ? 3 : 0,
              color: isActive ? "#2B579A" : "#444",
              fontWeight: isActive ? 600 : 400,
              borderTop: isActive ? "1px solid #D1D1D1" : "1px solid transparent",
              borderLeft: isActive ? "1px solid #D1D1D1" : "1px solid transparent",
              borderRight: isActive ? "1px solid #D1D1D1" : "1px solid transparent",
              borderBottom: isActive ? "1px solid #FFFFFF" : "none",
              marginBottom: isActive ? -1 : 0,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
