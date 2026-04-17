"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { useEditorState } from "@tiptap/react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { UI_COLORS } from "@/lib/theme/colors";

const STYLES = [
  { label: "Обычный", cmd: "paragraph", preview: { fontWeight: 400 as const, color: "#e5e7eb" } },
  { label: "Заголовок 1", cmd: "heading-1", preview: { fontWeight: 600 as const, color: "#a5b4fc", fontSize: "15px" } },
  { label: "Заголовок 2", cmd: "heading-2", preview: { fontWeight: 600 as const, color: "#a5b4fc", fontSize: "13px" } },
  { label: "Заголовок 3", cmd: "heading-3", preview: { fontWeight: 600 as const, color: "#93c5fd" } },
  { label: "Название", cmd: "heading-1-title", preview: { fontWeight: 300 as const, color: "#f3f4f6", fontSize: "16px" } },
  { label: "Подзаголовок", cmd: "heading-2-subtitle", preview: { fontWeight: 400 as const, color: "#9ca3af", fontStyle: "italic" as const } },
];

function useDropdownPosition(anchorRef: React.RefObject<HTMLElement | null>, isOpen: boolean) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 200) });
  }, [isOpen, anchorRef]);
  return pos;
}

export default function StylesDropdown() {
  const editor = useEditorContext();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pos = useDropdownPosition(anchorRef, open);

  const activeStyle = useEditorState({
    editor,
    selector: (ctx): string => {
      if (!ctx.editor) return "paragraph";
      const e = ctx.editor;
      if (e.isActive("heading", { level: 1 })) return "heading-1";
      if (e.isActive("heading", { level: 2 })) return "heading-2";
      if (e.isActive("heading", { level: 3 })) return "heading-3";
      return "paragraph";
    },
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!editor) return null;

  const current =
    STYLES.find((s) => {
      const base = s.cmd.split("-").slice(0, 2).join("-");
      return base === "paragraph"
        ? activeStyle === "paragraph"
        : activeStyle === base;
    }) ?? STYLES[0];

  const applyStyle = (cmd: string) => {
    if (cmd === "paragraph") editor.chain().focus().setParagraph().run();
    else if (cmd === "heading-1" || cmd === "heading-1-title")
      editor.chain().focus().setHeading({ level: 1 }).run();
    else if (cmd === "heading-2" || cmd === "heading-2-subtitle")
      editor.chain().focus().setHeading({ level: 2 }).run();
    else if (cmd === "heading-3") editor.chain().focus().setHeading({ level: 3 }).run();
    setOpen(false);
  };

  const maxH = typeof window !== "undefined" ? window.innerHeight - pos.top - 12 : 280;

  return (
    <div className="relative min-w-[148px]">
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full min-w-[148px] items-center justify-between gap-2 rounded-[9px] border px-2.5 py-2 text-left transition-colors"
        style={{
          borderColor: UI_COLORS.ribbon.controlBorder,
          background: UI_COLORS.shellBgElevated,
          color: UI_COLORS.shellText,
        }}
        title="Стиль абзаца"
      >
        <div className="min-w-0 flex-1">
          <div className="text-[11px] leading-tight" style={current.preview}>
            АаБбВ
          </div>
          <div className="truncate text-[10px]" style={{ color: UI_COLORS.shellTextMuted }}>
            {current.label}
          </div>
        </div>
        <ChevronDown size={14} className="shrink-0 opacity-70" />
      </button>
      {open &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="overflow-y-auto rounded-[10px] border py-1 shadow-xl"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: Math.min(320, maxH),
              zIndex: 10050,
              borderColor: UI_COLORS.shellBorder,
              background: UI_COLORS.shellBgElevated,
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            }}
          >
            {STYLES.map((s) => {
              const baseCmd = s.cmd.split("-").slice(0, 2).join("-");
              const isActive =
                baseCmd === "paragraph"
                  ? activeStyle === "paragraph"
                  : activeStyle === baseCmd;
              return (
                <button
                  key={s.cmd}
                  type="button"
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors"
                  style={{
                    background: isActive ? UI_COLORS.accentSubtleBg : "transparent",
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyStyle(s.cmd)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] leading-tight" style={s.preview}>
                      АаБбВ
                    </div>
                    <div className="text-[10px]" style={{ color: UI_COLORS.shellTextMuted }}>
                      {s.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
