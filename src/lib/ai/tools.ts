import { z } from "zod";
import { tool } from "ai";

export const serverTools = {
  get_document_stats: tool({
    description:
      "Get document metadata: title, word count, character count, page count, current page.",
    inputSchema: z.object({}),
  }),

  get_plaintext: tool({
    description:
      "Get the document's plain text content. Use maxChars to limit size. " +
      "If the text exceeds maxChars it will be truncated with a note.",
    inputSchema: z.object({
      maxChars: z
        .number()
        .optional()
        .describe("Maximum characters to return. Defaults to 8000."),
    }),
  }),

  get_selection: tool({
    description:
      "Get the user's current text selection. Use format 'html' when the selection may contain tables, " +
      "merged cells, or any structure you must preserve (translation, rewrites). Use 'text' only for plain snippets. " +
      "Returns empty if nothing is selected.",
    inputSchema: z.object({
      format: z
        .enum(["text", "html"])
        .optional()
        .describe(
          "'html' returns the selection as HTML (keeps table markup); 'text' is plain text only (default).",
        ),
    }),
  }),

  get_outline: tool({
    description:
      "Get the document outline — all headings (H1–H6) with their text and level.",
    inputSchema: z.object({}),
  }),

  insert_content: tool({
    description:
      "Insert HTML content at the current cursor position, or at the end of the document " +
      "if atEnd is true. Supports full HTML: headings, lists, tables, bold, italic, links, etc.",
    inputSchema: z.object({
      html: z.string().describe("HTML content to insert."),
      atEnd: z
        .boolean()
        .optional()
        .describe("If true, append at the end of the document."),
    }),
  }),

  replace_selection: tool({
    description:
      "Replace the current selection with HTML. If the selection came from get_selection with format 'html', " +
      "you MUST return valid HTML that preserves the same structure: keep all <table>, <tbody>, <tr>, <th>, <td> " +
      "tags and only change text inside cells. Never replace a table with a plain paragraph. " +
      "If nothing is selected, inserts at cursor.",
    inputSchema: z.object({
      html: z.string().describe("HTML for the replacement; preserve tables when editing table content."),
    }),
  }),

  set_document_content: tool({
    description:
      "Replace the ENTIRE document content. This is a destructive operation — " +
      "use only when explicitly asked to rewrite or generate a whole document from scratch.",
    inputSchema: z.object({
      html: z.string().describe("Full HTML content for the new document."),
    }),
  }),

  apply_formatting: tool({
    description:
      "Apply formatting to the current selection: bold, italic, underline, strikethrough, " +
      "heading level, text alignment, font family, font size, text color, highlight color.",
    inputSchema: z.object({
      bold: z.boolean().optional(),
      italic: z.boolean().optional(),
      underline: z.boolean().optional(),
      strike: z.boolean().optional(),
      heading: z
        .number()
        .min(0)
        .max(6)
        .optional()
        .describe("Heading level 1-6, or 0 to remove heading."),
      align: z
        .enum(["left", "center", "right", "justify"])
        .optional(),
      fontFamily: z.string().optional(),
      fontSize: z.string().optional().describe("e.g. '14px', '18pt'"),
      color: z.string().optional().describe("CSS color, e.g. '#ff0000'"),
      highlightColor: z.string().optional().describe("Highlight color"),
    }),
  }),

  find_and_replace: tool({
    description:
      "Find and replace plain text in the document. Replacement runs in text nodes only (tables and structure are kept). " +
      "Avoid very short 'find' strings that could match inside many cells.",
    inputSchema: z.object({
      find: z.string().describe("Text to search for."),
      replace: z.string().describe("Replacement text."),
      caseSensitive: z.boolean().optional().describe("Default false."),
    }),
  }),

  set_document_title: tool({
    description: "Set the document title displayed in the title bar.",
    inputSchema: z.object({
      title: z.string().describe("New document title."),
    }),
  }),

  set_ribbon_tab: tool({
    description:
      "Switch the ribbon tab in the UI. Valid values: home, insert, design, layout, references, mailings, review, view.",
    inputSchema: z.object({
      tab: z.enum([
        "home",
        "insert",
        "design",
        "layout",
        "references",
        "mailings",
        "review",
        "view",
      ]),
    }),
  }),

  set_zoom: tool({
    description: "Set the editor zoom level (50–200%).",
    inputSchema: z.object({
      zoom: z.number().min(50).max(200),
    }),
  }),

  toggle_ruler: tool({
    description: "Show or hide the horizontal ruler.",
    inputSchema: z.object({
      show: z.boolean(),
    }),
  }),

  open_find_replace: tool({
    description: "Open the Find & Replace dialog.",
    inputSchema: z.object({}),
  }),
};
