import { z } from "zod";
import { tool } from "ai";

/** Canonical scene reference used by cross-scene tools. */
const sceneRefSchema = z
  .string()
  .describe(
    "Canonical scene reference: 'scene:<uuid>' (preferred) or StoryScene.id. Legacy outline ids like 'scene-0' also accepted.",
  );

/** Canonical block reference used by block-level tools. */
const blockRefSchema = z
  .string()
  .describe("Canonical block reference: 'scene:<uuid>#block:<blockId>'.");

export const serverTools = {
  // ─────────────────────────────────────────────────────────────────────────
  // Project-wide read tools
  // ─────────────────────────────────────────────────────────────────────────

  list_scenes: tool({
    description:
      "Return a flat list of every scene in the project (reading order), with canonical refs, word counts and short synopses. Use this to plan cross-scene work.",
    inputSchema: z.object({}),
  }),

  list_characters: tool({
    description:
      "Return the full character roster for the project (id, ref, display name, aliases, role, tags).",
    inputSchema: z.object({}),
  }),

  read_scene: tool({
    description:
      "Return the full plain text of a scene by its canonical reference. Does NOT open the scene in the editor (use jump_to_scene for that).",
    inputSchema: z.object({
      sceneRef: sceneRefSchema,
      maxChars: z
        .number()
        .int()
        .min(100)
        .max(200_000)
        .optional()
        .describe("Truncate output to this many characters (default 16000)."),
    }),
  }),

  read_scene_outline: tool({
    description:
      "Return headings inside a scene with their level and an optional stable blockId anchor.",
    inputSchema: z.object({
      sceneRef: sceneRefSchema,
    }),
  }),

  read_block: tool({
    description:
      "Return the plain text of one block inside a scene, addressed by its blockId.",
    inputSchema: z.object({
      blockRef: blockRefSchema,
    }),
  }),

  read_character: tool({
    description:
      "Return a character profile (card sections, aliases, role) by id or canonical 'character:<uuid>' ref.",
    inputSchema: z.object({
      characterRef: z.string().describe("Character ref or raw CharacterProfile.id."),
    }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Project-wide write tools (structural)
  // ─────────────────────────────────────────────────────────────────────────

  edit_scene: tool({
    description:
      "Modify a scene in the project directly, even when it is not the active editor tab. Always prefer replace_selection / insert_content for the active scene. " +
      "Body can be plain text (paragraphs split by blank lines) via `text` or a TipTap JSONContent via `json`. " +
      "'replace' overwrites the whole scene; 'append' adds to the end; 'prepend' inserts at the top; 'rename' only changes the title.",
    inputSchema: z
      .object({
        sceneRef: sceneRefSchema,
        op: z.enum(["replace", "append", "prepend", "rename"]),
        text: z.string().optional().describe("Plain text body. Blank lines split paragraphs."),
        json: z.unknown().optional().describe("A TipTap JSONContent doc. Takes priority over text."),
        title: z.string().optional().describe("New title (required for op='rename')."),
      })
      .refine(
        (d) =>
          d.op === "rename"
            ? Boolean(d.title)
            : Boolean(d.text !== undefined || d.json !== undefined),
        { message: "Provide text/json for replace/append/prepend or title for rename." },
      ),
  }),

  edit_block: tool({
    description:
      "Replace the text content of a single block inside a scene, addressed by `scene:<uuid>#block:<blockId>`. Preserves the block's type (paragraph, heading, list item, etc.).",
    inputSchema: z.object({
      blockRef: blockRefSchema,
      newText: z.string().describe("New plain text content for the block."),
    }),
  }),

  create_scene: tool({
    description:
      "Create a new empty scene at the end of a chapter. Returns the new scene's canonical ref.",
    inputSchema: z.object({
      chapterRef: z
        .string()
        .optional()
        .describe("Canonical chapter ref or StoryChapter.id. If omitted, uses the first chapter."),
      title: z.string().optional(),
    }),
  }),

  create_chapter: tool({
    description:
      "Create a new chapter at the end of the project. The chapter gets one default empty scene.",
    inputSchema: z.object({
      title: z.string().optional(),
    }),
  }),

  undo_last_edit: tool({
    description:
      "Revert the most recent project-level edit performed by the AI (edit_scene, edit_block, create/move_scene/chapter). Uses a 20-snapshot undo stack.",
    inputSchema: z.object({}),
  }),

  move_scene: tool({
    description:
      "Move an existing scene to another chapter and/or position.",
    inputSchema: z.object({
      sceneRef: sceneRefSchema,
      toChapterRef: z.string().describe("Target chapter ref or id."),
      position: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("0-based position in the target chapter. Defaults to end."),
    }),
  }),


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

  get_context_around_cursor: tool({
    description:
      "Get plain text before and after the cursor without loading the full document. " +
      "Prefer this over get_plaintext for large documents.",
    inputSchema: z.object({
      beforeChars: z
        .number()
        .optional()
        .describe("Maximum characters before cursor (default 2000)."),
      afterChars: z
        .number()
        .optional()
        .describe("Maximum characters after cursor (default 2000)."),
    }),
  }),

  get_section_by_heading: tool({
    description:
      "Get HTML for one section starting at a heading (by 0-based index matching get_outline order) " +
      "or the first heading whose text contains headingTextMatch. " +
      "The section runs until the next heading of the same or higher outline level (e.g. the next H2 or H1 ends an H2 section).",
    inputSchema: z
      .object({
        headingIndex: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("0-based index in document heading order (aligns with get_outline)."),
        headingTextMatch: z
          .string()
          .optional()
          .describe("Substring to find in heading text; first match wins."),
      })
      .refine(
        (d) =>
          d.headingIndex !== undefined ||
          (d.headingTextMatch !== undefined &&
            d.headingTextMatch.trim().length > 0),
        { message: "Provide headingIndex or non-empty headingTextMatch." },
      ),
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
      "Switch the writer toolbar tab in the UI. Valid values: home, insert, design, view.",
    inputSchema: z.object({
      tab: z.enum(["home", "insert", "design", "view"]),
    }),
  }),

  set_zoom: tool({
    description: "Set the editor zoom level (50–300%).",
    inputSchema: z.object({
      zoom: z.number().min(50).max(300),
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

  insert_image: tool({
    description:
      "Insert an image at the current cursor position from a URL. Use for figures, logos, or remote images.",
    inputSchema: z.object({
      src: z.string().describe("Image URL (https recommended)."),
      alt: z.string().optional().describe("Alt text for accessibility."),
      title: z.string().optional().describe("Optional title tooltip."),
    }),
  }),

  set_doc_page_style: tool({
    description:
      "Apply a decorative style to the current document page (the page containing the cursor): soft gradient, tinted paper, minimal border, or default.",
    inputSchema: z.object({
      variant: z
        .enum(["default", "soft", "tinted", "minimal"])
        .describe(
          "default: standard white sheet; soft: warm gradient + deeper shadow; tinted: subtle blue-gray paper; minimal: flat thin border.",
        ),
    }),
  }),

  set_table_layout: tool({
    description:
      "Adjust layout of the table containing the cursor: horizontal alignment on the page and optional left indent (px).",
    inputSchema: z
      .object({
        align: z.enum(["left", "center", "right"]).optional(),
        indentPx: z
          .number()
          .min(0)
          .max(240)
          .optional()
          .describe("Left indent in pixels (0–240), typical for in-flow table layout in DOCX."),
      })
      .refine((d) => d.align !== undefined || d.indentPx !== undefined, {
        message: "Provide align and/or indentPx.",
      }),
  }),

  plot_semantic_search: tool({
    description:
      "Semantic search over the indexed manuscript (meaning, not just keywords). " +
      "Returns scene fragments with similarity scores across the whole project by default. " +
      "Use scope='active-scene' when you want to search only inside the currently open scene, " +
      "or scope='scenes' with sceneRefs=['scene:<uuid>', …] to restrict to specific scenes.",
    inputSchema: z.object({
      query: z.string().describe("What to find, e.g. letter from father, last time phone was mentioned."),
      topK: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe("Number of results (default 8)."),
      scope: z
        .enum(["project", "active-scene", "scenes"])
        .optional()
        .describe(
          "Search scope. Default 'project' = entire manuscript. 'active-scene' limits to the open scene; 'scenes' requires sceneRefs.",
        ),
      sceneRefs: z
        .array(z.string())
        .optional()
        .describe("Required when scope='scenes'. Canonical scene refs (scene:<uuid>) to restrict the search."),
    }),
  }),

  rebuild_plot_index: tool({
    description:
      "Rebuild the plot vector index. Pass scope='project' (default) to reingest every scene in the StoryProject, " +
      "or scope='active-scene' to only refresh the currently open scene. Use after large paste or if search seems stale.",
    inputSchema: z.object({
      scope: z
        .enum(["project", "active-scene"])
        .optional()
        .describe("Ingest scope. Default 'project' = whole project."),
    }),
  }),

  get_plot_index_status: tool({
    description:
      "Get plot indexing status: chunk count in the vector store, last index time, and any error.",
    inputSchema: z.object({}),
  }),

  plot_story_analyze: tool({
    description:
      "Run LLM extraction over the currently open scene and MERGE results into the project story memory. " +
      "Safe to call repeatedly: existing facts/relations are preserved and only chunks from this scene are re-analysed. " +
      "Use plot_story_analyze_project to analyse every scene. Use plot_story_reset to wipe memory (user confirmation advised).",
    inputSchema: z.object({
      sceneRef: z
        .string()
        .optional()
        .describe("Optional canonical scene ref. Defaults to the active scene."),
    }),
  }),

  plot_story_analyze_project: tool({
    description:
      "Run LLM extraction over EVERY scene in the project (background, may take minutes on long works). " +
      "Merges results incrementally into story memory. Returns a summary.",
    inputSchema: z.object({
      force: z
        .boolean()
        .optional()
        .describe("If true, re-analyse every scene even when nothing obvious changed."),
    }),
  }),

  plot_story_reset: tool({
    description:
      "Erase all extracted plot memory (facts, relations, warnings) for the current project. Destructive.",
    inputSchema: z.object({}),
  }),

  get_story_outline: tool({
    description:
      "Get writer-oriented outline: chapters and scenes with ranges and word counts.",
    inputSchema: z.object({}),
  }),

  set_writer_focus_mode: tool({
    description:
      "Switch writer focus mode in the UI: draft, rewrite, or continuity.",
    inputSchema: z.object({
      mode: z.enum(["draft", "rewrite", "continuity"]),
    }),
  }),

  jump_to_scene: tool({
    description:
      "Open a scene in the editor by its canonical reference. Accepts a project scene UUID " +
      "(e.g. 'scene-123e…' or 'scene:123e…'), a legacy heading-outline id ('scene-0'), or a StoryScene.id. " +
      "If the scene is not already open in a tab, it is opened and focused.",
    inputSchema: z.object({
      sceneRef: z
        .string()
        .optional()
        .describe("Canonical scene reference: 'scene:<uuid>' or a StoryScene.id."),
      sceneId: z
        .string()
        .optional()
        .describe("Legacy alias for sceneRef (outline id or StoryScene.id)."),
    }).refine((d) => Boolean(d.sceneRef || d.sceneId), {
      message: "Provide sceneRef (preferred) or sceneId.",
    }),
  }),

  set_continuity_filter: tool({
    description:
      "Set continuity warning filter in the right panel.",
    inputSchema: z.object({
      filter: z.enum(["all", "new", "acknowledged", "resolved", "ignored"]),
    }),
  }),

  set_continuity_warning_status: tool({
    description:
      "Update lifecycle state of a continuity warning by its warning key.",
    inputSchema: z.object({
      warningKey: z.string(),
      status: z.enum(["new", "acknowledged", "resolved", "ignored"]),
    }),
  }),

  suggest_continuity_fix: tool({
    description:
      "Generate 2-3 autofix suggestions for a specific continuity warning.",
    inputSchema: z.object({
      warningKey: z.string(),
    }),
  }),

  apply_continuity_fix: tool({
    description:
      "Apply one chosen continuity autofix suggestion to manuscript text.",
    inputSchema: z.object({
      warningKey: z.string(),
      suggestionId: z.string(),
    }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Structure / beat sheet planner (roadmap фаза 5)
  // ─────────────────────────────────────────────────────────────────────────

  generate_beat_sheet: tool({
    description:
      "Produce a beat-sheet draft for the current novel using a known template. " +
      "Use when the writer asks for structure help ('set up acts', 'outline the story', " +
      "'plan Save-the-Cat beats'). The caller receives the rendered template + premise " +
      "and must return a beat list filled with concrete scene ideas that fit the premise, " +
      "in the same language as the writer.",
    inputSchema: z.object({
      template: z
        .enum(["save-the-cat", "three-act", "heros-journey"])
        .describe(
          "save-the-cat: 15 beats, жанровая проза. three-act: 8 beats, классика. heros-journey: 12 beats, миф/фэнтези.",
        ),
      premise: z
        .string()
        .min(0)
        .max(2000)
        .describe("Короткая премиса романа. Пустая строка — спросить автора перед генерацией."),
      targetWordCount: z
        .number()
        .int()
        .min(5_000)
        .max(500_000)
        .optional()
        .describe("Ориентир по длине рукописи; помогает пропорционально разнести beat'ы."),
    }),
  }),
};
