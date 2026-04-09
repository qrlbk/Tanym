"use client";

import { useEditorState } from "@tiptap/react";
import { useEditorContext } from "@/components/Editor/EditorProvider";

const styles = [
  {
    label: "Обычный",
    cmd: "paragraph",
    preview: { fontWeight: 400, color: "#333" },
  },
  {
    label: "Заголовок 1",
    cmd: "heading-1",
    preview: { fontWeight: 600, color: "#2B579A", fontSize: "14px" },
  },
  {
    label: "Заголовок 2",
    cmd: "heading-2",
    preview: { fontWeight: 600, color: "#2B579A", fontSize: "12px" },
  },
  {
    label: "Заголовок 3",
    cmd: "heading-3",
    preview: { fontWeight: 600, color: "#1F4D78" },
  },
  {
    label: "Название",
    cmd: "heading-1-title",
    preview: { fontWeight: 300, color: "#333", fontSize: "16px" },
  },
  {
    label: "Подзаголовок",
    cmd: "heading-2-subtitle",
    preview: { fontWeight: 400, color: "#666", fontStyle: "italic" as const },
  },
];

export default function StylesGallery() {
  const editor = useEditorContext();

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

  if (!editor) return null;

  const applyStyle = (cmd: string) => {
    if (cmd === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else if (cmd === "heading-1" || cmd === "heading-1-title") {
      editor.chain().focus().setHeading({ level: 1 }).run();
    } else if (cmd === "heading-2" || cmd === "heading-2-subtitle") {
      editor.chain().focus().setHeading({ level: 2 }).run();
    } else if (cmd === "heading-3") {
      editor.chain().focus().setHeading({ level: 3 }).run();
    }
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1">
      {styles.map((s) => {
        const baseCmd = s.cmd.split("-").slice(0, 2).join("-");
        const isActive =
          baseCmd === "paragraph"
            ? activeStyle === "paragraph"
            : activeStyle === baseCmd;

        return (
          <button
            key={s.label}
            onClick={() => applyStyle(s.cmd)}
            className="shrink-0 px-2 py-1 rounded border transition-colors text-center"
            style={{
              background: isActive ? "#D0E0F0" : "#FFFFFF",
              borderColor: isActive ? "#A0C0E0" : "#D1D1D1",
              minWidth: 60,
              maxWidth: 84,
            }}
            onMouseEnter={(e) => {
              if (!isActive)
                e.currentTarget.style.borderColor = "#999";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = isActive
                ? "#A0C0E0"
                : "#D1D1D1";
            }}
          >
            <div
              className="text-[11px] leading-tight whitespace-nowrap overflow-hidden text-ellipsis"
              style={s.preview}
            >
              АаБбВ
            </div>
            <div className="text-[8px] text-gray-500 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
              {s.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
