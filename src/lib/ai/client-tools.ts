import type { Editor } from "@tiptap/react";
import { DOMSerializer, type Node as PMNode } from "@tiptap/pm/model";
import { useDocumentStore } from "@/stores/documentStore";
import { wrapHtmlInDocPage } from "@/lib/migrate-doc-pages";
import { useUIStore } from "@/stores/uiStore";
import { useAIStore } from "@/stores/aiStore";

type ToolResult = string;

export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  editor: Editor | null,
): Promise<ToolResult> {
  const docStore = useDocumentStore.getState();
  const uiStore = useUIStore.getState();
  const aiStore = useAIStore.getState();

  switch (toolName) {
    case "get_document_stats": {
      return JSON.stringify({
        title: docStore.title,
        wordCount: docStore.wordCount,
        charCount: docStore.charCount,
        pageCount: docStore.pageCount,
        currentPage: docStore.currentPage,
      });
    }

    case "get_plaintext": {
      if (!editor) return "Editor not available.";
      const text = editor.state.doc.textContent;
      const maxChars = (args.maxChars as number) || 8000;
      if (text.length > maxChars) {
        return text.slice(0, maxChars) + `\n\n[Truncated — showing ${maxChars} of ${text.length} characters]`;
      }
      return text || "(Document is empty)";
    }

    case "get_selection": {
      if (!editor) return "Editor not available.";
      const { from, to, empty } = editor.state.selection;
      if (empty || from === to) return "(No text selected)";
      const format = (args.format as string | undefined) ?? "text";
      if (format === "html") {
        const slice = editor.state.selection.content();
        const serializer = DOMSerializer.fromSchema(editor.schema);
        const wrap = document.createElement("div");
        serializer.serializeFragment(slice.content, { document }, wrap);
        return wrap.innerHTML || "(empty selection)";
      }
      return editor.state.doc.textBetween(from, to, "\n");
    }

    case "get_outline": {
      if (!editor) return "Editor not available.";
      const headings: { level: number; text: string }[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "heading") {
          headings.push({
            level: node.attrs.level as number,
            text: node.textContent,
          });
        }
      });
      if (headings.length === 0) return "(No headings found in the document)";
      return JSON.stringify(headings);
    }

    case "insert_content": {
      if (!editor) return "Editor not available.";
      const html = args.html as string;
      const atEnd = args.atEnd as boolean;
      if (atEnd) {
        editor.commands.focus("end");
        editor.commands.insertContent(html);
      } else {
        editor.commands.insertContent(html);
      }
      return "Content inserted successfully.";
    }

    case "replace_selection": {
      if (!editor) return "Editor not available.";
      const { from, to } = editor.state.selection;
      if (from === to) {
        editor.commands.insertContent(args.html as string);
        return "No selection found — content inserted at cursor.";
      }
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent(args.html as string)
        .run();
      return "Selection replaced successfully.";
    }

    case "set_document_content": {
      if (!editor) return "Editor not available.";
      aiStore.setPendingConfirmation({
        toolCallId: "",
        toolName: "set_document_content",
        args,
      });
      editor.commands.setContent(wrapHtmlInDocPage(args.html as string));
      return "Document content replaced successfully.";
    }

    case "apply_formatting": {
      if (!editor) return "Editor not available.";
      const chain = editor.chain().focus();

      if (args.bold !== undefined)
        args.bold ? chain.setBold() : chain.unsetBold();
      if (args.italic !== undefined)
        args.italic ? chain.setItalic() : chain.unsetItalic();
      if (args.underline !== undefined)
        args.underline ? chain.setUnderline() : chain.unsetUnderline();
      if (args.strike !== undefined)
        args.strike ? chain.setStrike() : chain.unsetStrike();
      if (args.heading !== undefined) {
        const level = args.heading as number;
        if (level === 0) {
          chain.setParagraph();
        } else {
          chain.setHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 });
        }
      }
      if (args.align)
        chain.setTextAlign(args.align as string);
      if (args.fontFamily)
        chain.setFontFamily(args.fontFamily as string);
      if (args.fontSize)
        chain.setMark("textStyle", { fontSize: args.fontSize as string });
      if (args.color)
        chain.setColor(args.color as string);
      if (args.highlightColor)
        chain.setHighlight({ color: args.highlightColor as string });

      chain.run();
      return "Formatting applied.";
    }

    case "find_and_replace": {
      if (!editor) return "Editor not available.";
      const findText = args.find as string;
      const replaceText = args.replace as string;
      const caseSensitive = args.caseSensitive as boolean ?? false;

      if (!findText) return "find string must not be empty.";

      const matches = collectTextOccurrences(
        editor.state.doc,
        findText,
        caseSensitive,
      );
      if (matches.length === 0) {
        return `No occurrences of "${findText}" found.`;
      }

      const tr = editor.state.tr;
      for (const { from, to } of [...matches].sort((a, b) => b.from - a.from)) {
        tr.insertText(replaceText, from, to);
      }
      editor.view.dispatch(tr);

      return `Replaced ${matches.length} occurrence(s) of "${findText}" with "${replaceText}".`;
    }

    case "set_document_title": {
      docStore.setTitle(args.title as string);
      return `Document title set to "${args.title}".`;
    }

    case "set_ribbon_tab": {
      uiStore.setActiveTab(args.tab as "home");
      return `Switched to "${args.tab}" tab.`;
    }

    case "set_zoom": {
      uiStore.setZoom(args.zoom as number);
      return `Zoom set to ${args.zoom}%.`;
    }

    case "toggle_ruler": {
      uiStore.setShowRuler(args.show as boolean);
      return args.show ? "Ruler shown." : "Ruler hidden.";
    }

    case "open_find_replace": {
      uiStore.setShowFindReplace(true);
      return "Find & Replace dialog opened.";
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}

function collectTextOccurrences(
  doc: PMNode,
  find: string,
  caseSensitive: boolean,
): { from: number; to: number }[] {
  const matches: { from: number; to: number }[] = [];
  const needle = caseSensitive ? find : find.toLowerCase();
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const haystack = caseSensitive ? node.text : node.text.toLowerCase();
    let start = 0;
    let idx = haystack.indexOf(needle, start);
    while (idx !== -1) {
      matches.push({ from: pos + idx, to: pos + idx + find.length });
      start = idx + needle.length;
      idx = haystack.indexOf(needle, start);
    }
  });
  return matches;
}
