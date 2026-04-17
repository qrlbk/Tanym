"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import {
  formatShortcut,
  getAltModifierLabel,
  getPrimaryModifierLabel,
  getShiftModifierLabel,
  isMacPlatform,
} from "@/lib/platform";

export default function ShortcutsDialog() {
  const show = useUIStore((s) => s.showShortcutsHelp);
  const setShow = useUIStore((s) => s.setShowShortcutsHelp);
  const mod = getPrimaryModifierLabel();
  const alt = getAltModifierLabel();
  const shift = getShiftModifierLabel();
  const rows: { action: string; keys: string }[] = useMemo(
    () => [
      { action: "Найти", keys: formatShortcut([mod, "F"]) },
      { action: "Найти и заменить", keys: formatShortcut([mod, "H"]) },
      { action: "Сохранить .docx", keys: formatShortcut([mod, "S"]) },
      { action: "Сохранить как…", keys: formatShortcut([mod, shift, "S"]) },
      { action: "Печать", keys: formatShortcut([mod, "P"]) },
      { action: "Жирный", keys: formatShortcut([mod, "B"]) },
      { action: "Курсив", keys: formatShortcut([mod, "I"]) },
      { action: "Подчёркнутый", keys: formatShortcut([mod, "U"]) },
      { action: "Масштаб (колёсико)", keys: formatShortcut([mod, "колёсико"]) },
      { action: "Закрыть панель / диалог", keys: "Esc" },
      { action: "Справка по клавишам", keys: formatShortcut([mod, "/"]) },
      { action: "В таблице: следующая ячейка", keys: "Tab" },
      { action: "В таблице: предыдущая ячейка", keys: formatShortcut([shift, "Tab"]) },
      {
        action: "Переместить таблицу вверх / вниз",
        keys: `${formatShortcut([mod, alt, "↑"])} / ${formatShortcut([mod, alt, "↓"])}`,
      },
    ],
    [alt, mod, shift],
  );

  const subtitle = useMemo(() => {
    return isMacPlatform()
      ? "На Mac используйте клавишу ⌘ (Command) вместо Ctrl."
      : "На Windows и Linux основной модификатор — Ctrl.";
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setShow(true);
      }
      if (show && e.key === "Escape") {
        setShow(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, setShow]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal
      aria-labelledby="shortcuts-title"
      onClick={() => setShow(false)}
    >
      <div
        className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md max-h-[min(80vh,520px)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 id="shortcuts-title" className="text-[14px] font-semibold text-gray-800">
            Горячие клавиши
          </h2>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="p-1 rounded hover:bg-gray-100 text-gray-600"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>
        <p className="px-4 pt-2 text-[11px] text-gray-600">{subtitle}</p>
        <div className="overflow-y-auto px-2 py-2">
          <table className="w-full text-[12px]">
            <tbody>
              {rows.map((row) => (
                <tr key={row.action} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 px-2 text-gray-700">{row.action}</td>
                  <td className="py-2 px-2 text-right font-mono text-gray-600 whitespace-nowrap">
                    {row.keys}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
