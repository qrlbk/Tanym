"use client";

import { useState, useRef } from "react";
import {
  Ruler,
  SquareDashed,
  Sun,
  Moon,
  SpellCheck,
  Languages,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useDocumentStore } from "@/stores/documentStore";
import { PortalDropdown } from "@/components/ui/PortalDropdown";
import { UI_COLORS } from "@/lib/theme/colors";
import { RibbonIsland } from "@/components/Ribbon/RibbonIsland";

const LANGUAGES = [
  { code: "ru", name: "Русский" },
  { code: "kk", name: "Қазақша" },
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
];

const BTN =
  "flex flex-col items-center gap-0.5 rounded-[9px] border px-2.5 py-1.5 transition-colors min-w-[52px]";

export default function ViewTab() {
  const showRuler = useUIStore((s) => s.showRuler);
  const setShowRuler = useUIStore((s) => s.setShowRuler);
  const showTextBoundaries = useUIStore((s) => s.showTextBoundaries);
  const setShowTextBoundaries = useUIStore((s) => s.setShowTextBoundaries);
  const canvasAppearance = useUIStore((s) => s.canvasAppearance);
  const setCanvasAppearance = useUIStore((s) => s.setCanvasAppearance);
  const wordCount = useDocumentStore((s) => s.wordCount);
  const charCount = useDocumentStore((s) => s.charCount);
  const [showLang, setShowLang] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [spellcheck, setSpellcheck] = useState(true);
  const langRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const base = {
    background: UI_COLORS.ribbon.controlBg,
    borderColor: UI_COLORS.ribbon.controlBorder,
    color: UI_COLORS.ribbon.controlText,
  } as const;

  return (
    <div
      className="flex min-h-0 min-w-0 flex-wrap items-stretch gap-2.5 py-1.5 pl-0.5 pr-1"
      style={{ color: UI_COLORS.shellText, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <RibbonIsland aria-label="Вид страницы">
        <button
          type="button"
          onClick={() => setShowRuler(!showRuler)}
          className={BTN}
          style={{
            ...base,
            ...(showRuler
              ? {
                  background: UI_COLORS.accentSubtleBg,
                  borderColor: UI_COLORS.accentPrimaryBorder,
                }
              : {}),
          }}
          onMouseEnter={(e) => {
            if (!showRuler) e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
          }}
          onMouseLeave={(e) => {
            if (!showRuler) e.currentTarget.style.background = UI_COLORS.ribbon.controlBg;
          }}
          title={showRuler ? "Скрыть линейку" : "Показать линейку"}
        >
          <Ruler size={18} style={{ color: UI_COLORS.shellText }} />
          <span className="text-[9px]" style={{ color: UI_COLORS.shellTextMuted }}>
            Линейка
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowTextBoundaries(!showTextBoundaries)}
          className={BTN}
          style={{
            ...base,
            ...(showTextBoundaries
              ? {
                  background: UI_COLORS.accentSubtleBg,
                  borderColor: UI_COLORS.accentPrimaryBorder,
                }
              : {}),
          }}
          onMouseEnter={(e) => {
            if (!showTextBoundaries) e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
          }}
          onMouseLeave={(e) => {
            if (!showTextBoundaries) e.currentTarget.style.background = UI_COLORS.ribbon.controlBg;
          }}
          title={
            showTextBoundaries ? "Скрыть границы области набора" : "Показать границы области набора"
          }
        >
          <SquareDashed size={18} className="shrink-0" style={{ color: UI_COLORS.shellText }} />
          <span className="max-w-[64px] text-center text-[8px] leading-tight" style={{ color: UI_COLORS.shellTextMuted }}>
            Границы
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCanvasAppearance(canvasAppearance === "light" ? "dark" : "light")}
          className={BTN}
          style={{
            ...base,
            ...(canvasAppearance === "dark"
              ? {
                  background: UI_COLORS.accentSubtleBg,
                  borderColor: UI_COLORS.accentPrimaryBorder,
                }
              : {}),
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              canvasAppearance === "dark" ? UI_COLORS.accentSubtleBg : UI_COLORS.ribbon.controlBg;
          }}
          title={
            canvasAppearance === "light"
              ? "Тёмный лист документа"
              : "Светлый лист документа"
          }
        >
          {canvasAppearance === "light" ? (
            <Moon size={18} style={{ color: UI_COLORS.shellText }} />
          ) : (
            <Sun size={18} style={{ color: UI_COLORS.shellText }} />
          )}
          <span className="max-w-[72px] text-center text-[8px] leading-tight" style={{ color: UI_COLORS.shellTextMuted }}>
            {canvasAppearance === "light" ? "Тёмный лист" : "Светлый лист"}
          </span>
        </button>
      </RibbonIsland>

      <RibbonIsland aria-label="Правописание и текст">
        <button
          type="button"
          onClick={() => {
            const next = !spellcheck;
            setSpellcheck(next);
            const el = document.querySelector(".tiptap") as HTMLElement | null;
            if (el) el.setAttribute("spellcheck", String(next));
          }}
          className={BTN}
          style={{
            ...base,
            ...(spellcheck
              ? {
                  background: UI_COLORS.accentSubtleBg,
                  borderColor: UI_COLORS.accentPrimaryBorder,
                }
              : {}),
          }}
          onMouseEnter={(e) => {
            if (!spellcheck) e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
          }}
          onMouseLeave={(e) => {
            if (!spellcheck) e.currentTarget.style.background = UI_COLORS.ribbon.controlBg;
          }}
          title={spellcheck ? "Выключить проверку правописания" : "Включить проверку правописания"}
        >
          <SpellCheck size={18} style={{ color: UI_COLORS.shellText }} />
          <span className="text-[9px]" style={{ color: UI_COLORS.shellTextMuted }}>
            Орфография
          </span>
        </button>

        <div ref={langRef}>
          <button
            type="button"
            onClick={() => setShowLang(!showLang)}
            className={BTN}
            style={base}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = UI_COLORS.ribbon.controlBg;
            }}
            title="Язык (lang)"
          >
            <Languages size={18} style={{ color: UI_COLORS.shellText }} />
            <div className="flex items-center gap-0.5">
              <span className="text-[9px]" style={{ color: UI_COLORS.shellTextMuted }}>
                Язык
              </span>
              <ChevronDown size={8} style={{ color: UI_COLORS.shellTextMuted }} />
            </div>
          </button>
          <PortalDropdown
            anchorRef={langRef}
            isOpen={showLang}
            onClose={() => setShowLang(false)}
            width={160}
            variant="dark"
          >
            <div className="py-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-[12px]"
                  style={{ color: UI_COLORS.shellText }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                  onClick={() => {
                    const el = document.querySelector(".tiptap") as HTMLElement | null;
                    if (el) el.setAttribute("lang", lang.code);
                    setShowLang(false);
                  }}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </PortalDropdown>
        </div>

        <div ref={statsRef}>
          <button
            type="button"
            onClick={() => setShowStats(!showStats)}
            className={BTN}
            style={base}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = UI_COLORS.ribbon.controlBg;
            }}
            title="Статистика"
          >
            <BarChart3 size={18} style={{ color: UI_COLORS.shellText }} />
            <span className="text-[9px]" style={{ color: UI_COLORS.shellTextMuted }}>
              Статистика
            </span>
          </button>
          <PortalDropdown
            anchorRef={statsRef}
            isOpen={showStats}
            onClose={() => setShowStats(false)}
            width={220}
            variant="dark"
          >
            <div className="p-3" style={{ color: UI_COLORS.shellText }}>
              <p className="mb-2 text-[12px] font-medium" style={{ color: UI_COLORS.shellTextStrong }}>
                Статистика документа
              </p>
              <div className="space-y-1.5 text-[11px]" style={{ color: UI_COLORS.shellTextMuted }}>
                <div className="flex justify-between gap-4">
                  <span>Слов</span>
                  <span className="font-semibold tabular-nums" style={{ color: UI_COLORS.shellText }}>
                    {wordCount}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Символов (с пробелами)</span>
                  <span className="font-semibold tabular-nums" style={{ color: UI_COLORS.shellText }}>
                    {charCount}
                  </span>
                </div>
              </div>
            </div>
          </PortalDropdown>
        </div>
      </RibbonIsland>
    </div>
  );
}
