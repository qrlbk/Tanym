import type { Editor } from "@tiptap/react";

export type EditorContextPayload = {
  mode: "selection" | "full";
  text: string;
  truncated: boolean;
  charCount: number;
};

const DEFAULT_MAX_SELECTION_CHARS = 50_000;
const DEFAULT_MAX_FULL_CHARS = 24_000;

/**
 * Snapshot of what the writer is looking at: selection if any, otherwise the full current editor document (active scene).
 */
export function buildEditorContextPayload(
  editor: Editor | null,
  opts?: { maxSelectionChars?: number; maxFullChars?: number },
): EditorContextPayload | null {
  if (!editor) return null;
  const maxSel = opts?.maxSelectionChars ?? DEFAULT_MAX_SELECTION_CHARS;
  const maxFull = opts?.maxFullChars ?? DEFAULT_MAX_FULL_CHARS;
  const { from, to, empty } = editor.state.selection;

  if (!empty && from !== to) {
    const raw = editor.state.doc.textBetween(from, to, "\n");
    const truncated = raw.length > maxSel;
    const text = truncated
      ? `${raw.slice(0, maxSel)}\n\n[Truncated — selection is ${raw.length} characters; showing first ${maxSel}.]`
      : raw;
    return {
      mode: "selection",
      text: text || "(empty selection)",
      truncated,
      charCount: raw.length,
    };
  }

  const full = editor.state.doc.textContent;
  const truncated = full.length > maxFull;
  const text = truncated
    ? `${full.slice(0, maxFull)}\n\n[Truncated — scene is ${full.length} characters; showing first ${maxFull}.]`
    : full || "(Document is empty)";
  return {
    mode: "full",
    text,
    truncated,
    charCount: full.length,
  };
}
