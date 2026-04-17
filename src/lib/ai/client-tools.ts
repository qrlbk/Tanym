import type { Editor } from "@tiptap/react";
import { findParentNode } from "@tiptap/core";
import { DOMSerializer, type Node as PMNode } from "@tiptap/pm/model";
import type { DocPageVariant } from "@/components/Editor/extensions/DocPage";
import { useDocumentStore } from "@/stores/documentStore";
import { useUIStore, type RibbonTab } from "@/stores/uiStore";
import { useAIStore } from "@/stores/aiStore";
import {
  findSectionRange,
  type HeadingEntry,
} from "@/lib/ai/section-utils";
import {
  semanticSearchPlot,
  ingestPlotIndex,
  ingestProjectIndex,
} from "@/lib/plot-index/ingest";
import { idbGetAllChunks } from "@/lib/plot-index/vector-idb";
import {
  fetchPlotExtraction,
  fetchPlotExtractionForChunks,
} from "@/lib/plot-index/plot-extract-client";
import {
  computePlotChunks,
  computeSceneChunks,
  computeProjectChunks,
  computeSceneChunksFromText,
} from "@/lib/plot-index/chunks";
import { usePlotIndexStore } from "@/stores/plotIndexStore";
import {
  getWarningSemanticFingerprint,
  usePlotStoryStore,
  type ContinuityFixSuggestion,
} from "@/stores/plotStoryStore";
import { buildStoryOutlineFromDoc } from "@/lib/story/outline";
import { buildContinuityFixSuggestions } from "@/lib/plot-index/autofix";
import { useProjectStore } from "@/stores/projectStore";
import {
  findBlockInSceneContent,
  listScenesInOrder,
  makeBlockRef,
  makeSceneRef,
  parseChapterRef,
  parseSceneRef,
  resolveCharacter,
  resolveChapter,
  resolveScene,
  sceneContentToPlainText,
} from "@/lib/ai/addressing";
import type { JSONContent } from "@tiptap/react";

type ToolResult = string;

/** Returned when the UI must confirm before applying (e.g. full document replace). */
export type DeferredToolResult = { deferred: true };
export type ToolInvocationSource = "ui" | "ai";

export function isDeferredToolResult(
  r: ToolResult | DeferredToolResult,
): r is DeferredToolResult {
  return typeof r === "object" && r !== null && "deferred" in r && r.deferred === true;
}

function clampPos(pos: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, pos));
}

function findRangeByScan(
  doc: PMNode,
  expected: string,
  from: number,
  to: number,
): { from: number; to: number } | null {
  if (!expected) return null;
  const maxPos = doc.content.size;
  const start = clampPos(from, 1, maxPos);
  const end = clampPos(to, start, maxPos);
  const len = expected.length;
  if (len === 0 || start + len > end + 1) return null;
  for (let pos = start; pos + len <= end + 1; pos++) {
    const slice = doc.textBetween(pos, pos + len, "\n", "\n");
    if (slice === expected) {
      return { from: pos, to: pos + len };
    }
  }
  return null;
}

function contextScore(
  doc: PMNode,
  range: { from: number; to: number },
  contextBefore: string,
  contextAfter: string,
): number {
  const left = doc.textBetween(Math.max(1, range.from - 48), range.from, "\n", "\n");
  const right = doc.textBetween(range.to, Math.min(doc.content.size, range.to + 48), "\n", "\n");
  let score = 0;
  if (contextBefore && left.includes(contextBefore)) score += 2;
  if (contextAfter && right.includes(contextAfter)) score += 2;
  return score;
}

function relocateSuggestionRange(
  editor: Editor,
  suggestion: ContinuityFixSuggestion,
): { from: number; to: number; note: string } | null {
  const doc = editor.state.doc;
  const expected = suggestion.expectedCurrentText ?? "";
  if (!expected) {
    const insertAt = clampPos(suggestion.windowToHint || suggestion.replaceFrom, 1, doc.content.size);
    return {
      from: insertAt,
      to: insertAt,
      note: "Использован безопасный insert-путь без замены существующего текста.",
    };
  }

  const localScan = findRangeByScan(
    doc,
    expected,
    suggestion.windowFromHint || 1,
    suggestion.windowToHint || doc.content.size,
  );
  if (localScan) {
    return {
      ...localScan,
      note: "Диапазон правки пересчитан в текущем тексте.",
    };
  }

  const docStart = 1;
  const docEnd = doc.content.size;
  const candidates: Array<{ from: number; to: number; score: number }> = [];
  const len = expected.length;
  for (let pos = docStart; pos + len <= docEnd + 1; pos++) {
    const slice = doc.textBetween(pos, pos + len, "\n", "\n");
    if (slice !== expected) continue;
    candidates.push({
      from: pos,
      to: pos + len,
      score: contextScore(doc, { from: pos, to: pos + len }, suggestion.contextBefore, suggestion.contextAfter),
    });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || a.from - b.from);
  return {
    from: candidates[0].from,
    to: candidates[0].to,
    note:
      candidates[0].score > 0
        ? "Диапазон найден по тексту и контексту."
        : "Диапазон найден по точному совпадению текста.",
  };
}

async function runFullContextRecheck(editor: Editor): Promise<{
  data: Awaited<ReturnType<typeof fetchPlotExtractionForChunks>>;
  chunks: ReturnType<typeof computePlotChunks>;
}> {
  const projectStore = useProjectStore.getState();
  const project = projectStore.project;
  const activeSceneId = useUIStore.getState().activeSceneId;
  if (!project) {
    const data = await fetchPlotExtraction(editor);
    const chunks = computePlotChunks(editor);
    return { data, chunks };
  }

  let chunks = computeProjectChunks(project);
  if (activeSceneId) {
    const scene = projectStore.getSceneById(activeSceneId);
    const chapter = projectStore.getChapterBySceneId(activeSceneId);
    if (scene) {
      const liveSceneChunks = computeSceneChunksFromText({
        sceneId: scene.id,
        sceneTitle: scene.title,
        chapterId: chapter?.id ?? null,
        chapterTitle: chapter?.title ?? null,
        text: editor.state.doc.textContent,
      });
      chunks = chunks.filter((c) => c.sceneId !== scene.id);
      chunks.push(...liveSceneChunks);
    }
  }
  const data = await fetchPlotExtractionForChunks(chunks);
  return { data, chunks };
}

export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  editor: Editor | null,
  toolCallId?: string,
  chatSessionId?: string,
  invocationSource: ToolInvocationSource = "ui",
): Promise<ToolResult | DeferredToolResult> {
  const docStore = useDocumentStore.getState();
  const uiStore = useUIStore.getState();
  const aiStore = useAIStore.getState();

  switch (toolName) {
    // ───────────────────────────────────────────────────────────────────
    // Project-wide read tools (do not require the editor).
    // ───────────────────────────────────────────────────────────────────

    case "list_scenes": {
      const project = useProjectStore.getState().project;
      if (!project) return "No project loaded.";
      const entries = listScenesInOrder(project).map((e) => ({
        sceneId: e.scene.id,
        sceneRef: makeSceneRef(e.scene.id),
        title: e.scene.title,
        chapterId: e.chapter.id,
        chapterTitle: e.chapter.title,
        order: e.scene.order,
        globalIndex: e.globalIndex,
        wordCount: countWordsPlain(sceneContentToPlainText(e.scene.content)),
        summary: e.scene.summary ?? null,
      }));
      return JSON.stringify({ count: entries.length, scenes: entries });
    }

    case "list_characters": {
      const project = useProjectStore.getState().project;
      if (!project) return "No project loaded.";
      return JSON.stringify({
        count: project.characterProfiles.length,
        characters: project.characterProfiles.map((c) => ({
          id: c.id,
          ref: `character:${c.id}`,
          displayName: c.displayName,
          aliases: c.aliases,
          role: c.role,
          tags: c.tags,
        })),
      });
    }

    case "read_scene": {
      const project = useProjectStore.getState().project;
      const ref = String(args.sceneRef ?? "").trim();
      const resolved = resolveScene(project, ref);
      if (!resolved) return `Scene ${ref} not found.`;
      const max = Math.max(
        100,
        Math.min(200_000, Number(args.maxChars ?? 16_000)),
      );
      let text = sceneContentToPlainText(resolved.scene.content);
      const total = text.length;
      let truncated = false;
      if (text.length > max) {
        text = `${text.slice(0, max)}\n\n[Truncated — scene is ${total} characters.]`;
        truncated = true;
      }
      return JSON.stringify({
        sceneRef: makeSceneRef(resolved.scene.id),
        sceneTitle: resolved.scene.title,
        chapterId: resolved.chapter.id,
        chapterTitle: resolved.chapter.title,
        updatedAt: resolved.scene.updatedAt,
        summary: resolved.scene.summary ?? null,
        charCount: total,
        truncated,
        text: text || "(Scene is empty)",
      });
    }

    case "read_scene_outline": {
      const project = useProjectStore.getState().project;
      const ref = String(args.sceneRef ?? "").trim();
      const resolved = resolveScene(project, ref);
      if (!resolved) return `Scene ${ref} not found.`;
      const headings: Array<{
        level: number;
        text: string;
        blockId: string | null;
        blockRef: string | null;
      }> = [];
      const walk = (node: JSONContent) => {
        if (!node || typeof node !== "object") return;
        if (node.type === "heading") {
          const blockId =
            typeof node.attrs?.blockId === "string" ? node.attrs.blockId : null;
          headings.push({
            level: Number(node.attrs?.level ?? 1),
            text: sceneContentToPlainText(node),
            blockId,
            blockRef: blockId ? makeBlockRef(resolved.scene.id, blockId) : null,
          });
        }
        const children = (node as { content?: JSONContent[] }).content;
        if (Array.isArray(children)) for (const c of children) walk(c);
      };
      walk(resolved.scene.content);
      return JSON.stringify({
        sceneRef: makeSceneRef(resolved.scene.id),
        headings,
      });
    }

    case "read_block": {
      const project = useProjectStore.getState().project;
      const blockRefStr = String(args.blockRef ?? "").trim();
      const { sceneId, blockId } = parseSceneRef(blockRefStr);
      if (!blockId) return "blockRef must be 'scene:<uuid>#block:<blockId>'.";
      const resolved = resolveScene(project, sceneId);
      if (!resolved) return `Scene for block ${blockRefStr} not found.`;
      const hit = findBlockInSceneContent(resolved.scene.content, blockId);
      if (!hit) return `Block ${blockId} not found in scene ${sceneId}.`;
      return JSON.stringify({
        blockRef: makeBlockRef(resolved.scene.id, blockId),
        type: hit.node.type,
        text: sceneContentToPlainText(hit.node),
      });
    }

    case "read_character": {
      const project = useProjectStore.getState().project;
      const ref = String(args.characterRef ?? "").trim();
      const profile = resolveCharacter(project, ref);
      if (!profile) return `Character ${ref} not found.`;
      return JSON.stringify({
        id: profile.id,
        ref: `character:${profile.id}`,
        displayName: profile.displayName,
        aliases: profile.aliases,
        role: profile.role,
        tags: profile.tags,
        sections: profile.sections,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      });
    }

    // ───────────────────────────────────────────────────────────────────
    // Cross-scene write tools
    // ───────────────────────────────────────────────────────────────────

    case "edit_scene": {
      const project = useProjectStore.getState().project;
      if (!project) return "No project loaded.";
      const ref = String(args.sceneRef ?? "").trim();
      const resolved = resolveScene(project, ref);
      if (!resolved) return `Scene ${ref} not found.`;
      const op = String(args.op ?? "") as
        | "replace"
        | "append"
        | "prepend"
        | "rename";
      useProjectStore
        .getState()
        .pushUndoSnapshot(`edit_scene ${op} ${resolved.scene.title}`);

      if (op === "rename") {
        const title = String(args.title ?? "").trim();
        if (!title) return "title is required for rename.";
        useProjectStore.getState().renameScene(resolved.scene.id, title);
        return JSON.stringify({
          ok: true,
          sceneRef: makeSceneRef(resolved.scene.id),
          title,
        });
      }

      const provided = buildSceneContentFromInput(
        args.json as JSONContent | undefined,
        typeof args.text === "string" ? args.text : undefined,
      );
      if (!provided) return "Provide text or json body for this op.";

      const current = resolved.scene.content ?? { type: "doc", content: [] };
      let next: JSONContent;
      if (op === "replace") next = provided;
      else if (op === "append")
        next = {
          type: "doc",
          content: [
            ...((current.content as JSONContent[] | undefined) ?? []),
            ...((provided.content as JSONContent[] | undefined) ?? []),
          ],
        };
      else
        next = {
          type: "doc",
          content: [
            ...((provided.content as JSONContent[] | undefined) ?? []),
            ...((current.content as JSONContent[] | undefined) ?? []),
          ],
        };

      useProjectStore.getState().setSceneContent(resolved.scene.id, next);

      // If the scene is the active editor tab, mirror the change into TipTap.
      if (
        editor &&
        useUIStore.getState().activeSceneId === resolved.scene.id
      ) {
        try {
          editor.commands.setContent(next as unknown as Record<string, unknown>);
        } catch {
          // ignore — the JSON may not be schema-compatible; project store is source of truth.
        }
      }
      return JSON.stringify({
        ok: true,
        op,
        sceneRef: makeSceneRef(resolved.scene.id),
      });
    }

    case "edit_block": {
      const project = useProjectStore.getState().project;
      if (!project) return "No project loaded.";
      useProjectStore.getState().pushUndoSnapshot("edit_block");
      const blockRefStr = String(args.blockRef ?? "").trim();
      const { sceneId, blockId } = parseSceneRef(blockRefStr);
      if (!blockId) return "blockRef must be 'scene:<uuid>#block:<blockId>'.";
      const resolved = resolveScene(project, sceneId);
      if (!resolved) return `Scene for block ${blockRefStr} not found.`;
      const hit = findBlockInSceneContent(resolved.scene.content, blockId);
      if (!hit) return `Block ${blockId} not found in scene ${sceneId}.`;
      const newText = String(args.newText ?? "");
      const updated = replaceBlockText(resolved.scene.content, blockId, newText);
      useProjectStore.getState().setSceneContent(resolved.scene.id, updated);
      if (editor && useUIStore.getState().activeSceneId === resolved.scene.id) {
        try {
          editor.commands.setContent(updated as unknown as Record<string, unknown>);
        } catch {
          /* ignore */
        }
      }
      return JSON.stringify({
        ok: true,
        blockRef: makeBlockRef(resolved.scene.id, blockId),
      });
    }

    case "create_scene": {
      const project = useProjectStore.getState().project;
      if (!project) return "No project loaded.";
      useProjectStore.getState().pushUndoSnapshot("create_scene");
      const chapterRaw = typeof args.chapterRef === "string" ? args.chapterRef : "";
      const chapter = chapterRaw
        ? resolveChapter(project, chapterRaw) ??
          project.chapters.find((c) => c.id === parseChapterRef(chapterRaw))
        : project.chapters[0];
      if (!chapter) return "No chapter available to host the new scene.";
      const newId = useProjectStore.getState().createScene(chapter.id);
      if (!newId) return "Could not create scene.";
      const title = typeof args.title === "string" ? args.title.trim() : "";
      if (title) useProjectStore.getState().renameScene(newId, title);
      return JSON.stringify({
        ok: true,
        sceneRef: makeSceneRef(newId),
        chapterId: chapter.id,
      });
    }

    case "create_chapter": {
      const project = useProjectStore.getState().project;
      if (!project) return "No project loaded.";
      useProjectStore.getState().pushUndoSnapshot("create_chapter");
      const title = typeof args.title === "string" ? args.title.trim() : "";
      const newId = useProjectStore.getState().createChapter(title || undefined);
      if (!newId) return "Could not create chapter.";
      return JSON.stringify({ ok: true, chapterId: newId });
    }

    case "undo_last_edit": {
      const label = useProjectStore.getState().popUndoSnapshot();
      if (!label) return "Undo stack is empty.";
      return JSON.stringify({ ok: true, reverted: label });
    }

    case "move_scene": {
      const project = useProjectStore.getState().project;
      if (!project) return "No project loaded.";
      useProjectStore.getState().pushUndoSnapshot("move_scene");
      const ref = String(args.sceneRef ?? "").trim();
      const resolved = resolveScene(project, ref);
      if (!resolved) return `Scene ${ref} not found.`;
      const targetChapterRaw = String(args.toChapterRef ?? "").trim();
      const targetChapter = resolveChapter(project, targetChapterRaw);
      if (!targetChapter) return `Chapter ${targetChapterRaw} not found.`;
      const position =
        typeof args.position === "number"
          ? Math.max(0, Math.floor(args.position))
          : targetChapter.scenes.length;
      useProjectStore
        .getState()
        .reorderScene(resolved.scene.id, targetChapter.id, position);
      return JSON.stringify({
        ok: true,
        sceneRef: makeSceneRef(resolved.scene.id),
        toChapterId: targetChapter.id,
        position,
      });
    }

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

    case "get_context_around_cursor": {
      if (!editor) return "Editor not available.";
      const doc = editor.state.doc;
      const pos = editor.state.selection.anchor;
      const maxBefore = Math.min(
        (args.beforeChars as number | undefined) ?? 2000,
        50_000,
      );
      const maxAfter = Math.min(
        (args.afterChars as number | undefined) ?? 2000,
        50_000,
      );
      const fullBefore = doc.textBetween(0, pos, "\n");
      const fullAfter = doc.textBetween(pos, doc.content.size, "\n");
      let before = fullBefore;
      let after = fullAfter;
      let truncatedBefore = false;
      let truncatedAfter = false;
      if (before.length > maxBefore) {
        before = "…" + before.slice(-maxBefore);
        truncatedBefore = true;
      }
      if (after.length > maxAfter) {
        after = after.slice(0, maxAfter) + "…";
        truncatedAfter = true;
      }
      return JSON.stringify({
        before,
        after,
        truncatedBefore,
        truncatedAfter,
      });
    }

    case "get_section_by_heading": {
      if (!editor) return "Editor not available.";
      const doc = editor.state.doc;
      const headings: HeadingEntry[] = [];
      doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          headings.push({
            pos,
            level: node.attrs.level as number,
            text: node.textContent,
          });
        }
      });
      const range = findSectionRange(headings, doc.content.size, {
        headingIndex: args.headingIndex as number | undefined,
        headingTextMatch: args.headingTextMatch as string | undefined,
      });
      if (!range) {
        return "(Section not found: no matching heading or invalid headingIndex.)";
      }
      const slice = doc.slice(range.from, range.to);
      const serializer = DOMSerializer.fromSchema(editor.schema);
      const wrap = document.createElement("div");
      serializer.serializeFragment(slice.content, { document }, wrap);
      return wrap.innerHTML || "(empty section)";
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
      if (!toolCallId) {
        return "Internal error: missing tool call id for document replacement.";
      }
      aiStore.setPendingConfirmation({
        sessionId: chatSessionId ?? "_",
        toolCallId,
        toolName: "set_document_content",
        args,
      });
      return { deferred: true };
    }

    case "apply_formatting": {
      if (!editor) return "Editor not available.";
      const chain = editor.chain().focus();

      if (args.bold !== undefined) {
        if (args.bold) chain.setBold();
        else chain.unsetBold();
      }
      if (args.italic !== undefined) {
        if (args.italic) chain.setItalic();
        else chain.unsetItalic();
      }
      if (args.underline !== undefined) {
        if (args.underline) chain.setUnderline();
        else chain.unsetUnderline();
      }
      if (args.strike !== undefined) {
        if (args.strike) chain.setStrike();
        else chain.unsetStrike();
      }
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
      uiStore.setActiveTab(args.tab as RibbonTab);
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

    case "insert_image": {
      if (!editor) return "Editor not available.";
      const src = (args.src as string)?.trim();
      if (!src) return "src is required.";
      const alt = (args.alt as string | undefined)?.trim() ?? "";
      const titleRaw = (args.title as string | undefined)?.trim();
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: {
            src,
            alt: alt || null,
            title: titleRaw ? titleRaw : null,
          },
        })
        .run();
      return "Image inserted.";
    }

    case "set_doc_page_style": {
      if (!editor) return "Editor not available.";
      const variant = args.variant as DocPageVariant;
      const allowed: DocPageVariant[] = [
        "default",
        "soft",
        "tinted",
        "minimal",
      ];
      if (!allowed.includes(variant)) return "Invalid page variant.";
      const found = findParentNode((n) => n.type.name === "docPage")(
        editor.state.selection,
      );
      if (!found) {
        return "Place the cursor inside a document page first.";
      }
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(found.pos, undefined, {
          ...found.node.attrs,
          pageVariant: variant,
        }),
      );
      return `Page appearance set to "${variant}".`;
    }

    case "set_table_layout": {
      if (!editor) return "Editor not available.";
      const align = args.align as "left" | "center" | "right" | undefined;
      const indentPx = args.indentPx as number | undefined;
      if (align === undefined && indentPx === undefined) {
        return "Provide align and/or indentPx.";
      }
      const chain = editor.chain().focus();
      if (align !== undefined) chain.setTableAlign(align);
      if (indentPx !== undefined) chain.setTableIndent(Math.round(indentPx));
      const ok = chain.run();
      return ok
        ? "Table layout updated."
        : "Could not apply — place the cursor inside a table.";
    }

    case "plot_semantic_search": {
      const query = String(args.query ?? "").trim();
      const topK = (args.topK as number | undefined) ?? 8;
      if (!query) return "query is required.";

      const project = useProjectStore.getState().project;
      const scope =
        (args.scope as "project" | "active-scene" | "scenes" | undefined) ??
        "project";
      const activeSceneId = uiStore.activeSceneId;

      let sceneIds: string[] | null = null;
      if (scope === "scenes" && Array.isArray(args.sceneRefs)) {
        sceneIds = (args.sceneRefs as string[])
          .map((ref) => parseSceneRef(String(ref)).sceneId)
          .filter((x) => x.length > 0);
      }

      try {
        const hits = await semanticSearchPlot(query, topK, {
          scope:
            scope === "scenes"
              ? "scenes"
              : scope === "active-scene"
                ? "active-scene"
                : "project",
          projectId: project?.id ?? null,
          sceneId: scope === "active-scene" ? activeSceneId : null,
          sceneIds,
        });
        if (hits.length === 0) {
          return JSON.stringify({
            results: [],
            note: "No indexed chunks or no matches. Try rebuild_plot_index after editing.",
          });
        }
        return JSON.stringify({
          scope,
          results: hits.map((h) => ({
            chunkId: h.chunkId,
            score: Math.round(h.score * 1000) / 1000,
            label: h.label,
            excerpt: h.textSample,
            sceneId: h.sceneId,
            sceneRef: h.sceneId ? `scene:${h.sceneId}` : null,
            sceneTitle: h.sceneTitle,
            chapterId: h.chapterId,
            chapterTitle: h.chapterTitle,
            positionFrom: h.from,
            positionTo: h.to,
          })),
        });
      } catch (e) {
        return `Semantic search failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "rebuild_plot_index": {
      const scope =
        (args.scope as "project" | "active-scene" | undefined) ?? "project";
      const project = useProjectStore.getState().project;

      const onProgress = (p: {
        phase: string;
        message?: string;
      }) => {
        if (p.phase === "done") {
          usePlotIndexStore.getState().setIngestState({
            ingestPhase: "done",
            ingestMessage: p.message ?? null,
            lastIndexedAt: Date.now(),
            indexError: null,
          });
        } else if (p.phase === "embedding") {
          usePlotIndexStore.getState().setIngestState({
            ingestPhase: "embedding",
            ingestMessage: p.message ?? null,
          });
        }
      };

      try {
        if (scope === "project" && project) {
          await ingestProjectIndex(
            project,
            { projectId: project.id },
            onProgress,
          );
          return `Project plot index rebuilt (${project.chapters.reduce((n, c) => n + c.scenes.length, 0)} scene(s)).`;
        }

        if (!editor) return "Editor not available.";
        const activeSceneId = uiStore.activeSceneId;
        const resolved = activeSceneId
          ? resolveScene(project, activeSceneId)
          : null;
        await ingestPlotIndex(editor, onProgress, {
          projectId: project?.id ?? null,
          sceneId: activeSceneId,
          sceneMeta: resolved
            ? {
                title: resolved.scene.title,
                chapterId: resolved.chapter.id,
                chapterTitle: resolved.chapter.title,
              }
            : null,
        });
        return "Active scene index rebuilt.";
      } catch (e) {
        return `Index rebuild failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "get_plot_index_status": {
      try {
        const rows = await idbGetAllChunks();
        const st = usePlotIndexStore.getState();
        return JSON.stringify({
          indexedChunkCount: rows.length,
          ingestPhase: st.ingestPhase,
          ingestMessage: st.ingestMessage,
          lastIndexedAt: st.lastIndexedAt,
          indexError: st.indexError,
        });
      } catch (e) {
        return JSON.stringify({
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    case "plot_story_analyze": {
      uiStore.setShowPlotPanel(true);
      usePlotIndexStore.getState().setIngestState({
        ingestPhase: "extracting",
        ingestMessage: "Извлечение сущностей…",
      });
      try {
        const project = useProjectStore.getState().project;
        const ref = typeof args.sceneRef === "string" ? args.sceneRef : null;
        const targetSceneId =
          (ref ? resolveScene(project, ref)?.scene.id : null) ??
          uiStore.activeSceneId;
        const resolved = targetSceneId
          ? resolveScene(project, targetSceneId)
          : null;

        if (resolved) {
          const chunks = computeSceneChunks(resolved.scene, resolved.chapter);
          if (chunks.length === 0) {
            usePlotIndexStore.getState().setIngestState({
              ingestPhase: "idle",
              ingestMessage: null,
              indexError: null,
            });
            return JSON.stringify({
              ok: true,
              sceneRef: `scene:${resolved.scene.id}`,
              note: "Scene text is empty; nothing to analyse.",
            });
          }
          const data = await fetchPlotExtractionForChunks(chunks);
          usePlotStoryStore
            .getState()
            .mergeSceneExtraction(resolved.scene.id, data, chunks);
          usePlotIndexStore.getState().setIngestState({
            ingestPhase: "idle",
            ingestMessage: null,
            indexError: null,
          });
          return JSON.stringify({
            ok: true,
            merged: true,
            sceneRef: `scene:${resolved.scene.id}`,
            sceneTitle: resolved.scene.title,
            factsCount: data.facts.length,
            relationsCount: data.relations.length,
            salientObjectsCount: data.salientObjects.length,
          });
        }

        // Legacy: no project / no active scene → full editor extraction.
        if (!editor) {
          usePlotIndexStore.getState().setIngestState({
            ingestPhase: "idle",
            ingestMessage: null,
            indexError: null,
          });
          return "Editor not available.";
        }
        const data = await fetchPlotExtraction(editor);
        const chunks = computePlotChunks(editor);
        usePlotStoryStore.getState().applyFullExtraction(data, chunks);
        usePlotIndexStore.getState().setIngestState({
          ingestPhase: "idle",
          ingestMessage: null,
          indexError: null,
        });
        return JSON.stringify({
          ok: true,
          merged: false,
          factsCount: data.facts.length,
          relationsCount: data.relations.length,
          salientObjectsCount: data.salientObjects.length,
        });
      } catch (e) {
        usePlotStoryStore.getState().setExtractionError(
          e instanceof Error ? e.message : String(e),
        );
        usePlotIndexStore.getState().setIngestState({
          ingestPhase: "error",
          indexError: e instanceof Error ? e.message : String(e),
        });
        return `Story analysis failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "plot_story_analyze_project": {
      uiStore.setShowPlotPanel(true);
      const project = useProjectStore.getState().project;
      if (!project) return "No project loaded.";
      usePlotIndexStore.getState().setIngestState({
        ingestPhase: "extracting",
        ingestMessage: "Анализ проекта: подготовка сцен…",
      });
      try {
        const storyStore = usePlotStoryStore.getState();
        let scenesAnalyzed = 0;
        let factsCount = 0;
        let relationsCount = 0;
        for (const chapter of project.chapters) {
          for (const scene of chapter.scenes) {
            const chunks = computeSceneChunks(scene, chapter);
            if (chunks.length === 0) continue;
            usePlotIndexStore.getState().setIngestState({
              ingestPhase: "extracting",
              ingestMessage: `Анализ: ${chapter.title} / ${scene.title}`,
            });
            const data = await fetchPlotExtractionForChunks(chunks);
            storyStore.mergeSceneExtraction(scene.id, data, chunks);
            scenesAnalyzed += 1;
            factsCount += data.facts.length;
            relationsCount += data.relations.length;
          }
        }
        usePlotIndexStore.getState().setIngestState({
          ingestPhase: "idle",
          ingestMessage: null,
          indexError: null,
        });
        return JSON.stringify({
          ok: true,
          scenesAnalyzed,
          factsCount,
          relationsCount,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        usePlotStoryStore.getState().setExtractionError(msg);
        usePlotIndexStore.getState().setIngestState({
          ingestPhase: "error",
          indexError: msg,
        });
        return `Project analysis failed: ${msg}`;
      }
    }

    case "plot_story_reset": {
      usePlotStoryStore.getState().resetStory();
      return "Plot memory cleared.";
    }

    case "get_story_outline": {
      if (!editor) return "Editor not available.";
      const outline = buildStoryOutlineFromDoc(editor.state.doc);
      return JSON.stringify(outline);
    }

    case "set_writer_focus_mode": {
      const mode = args.mode as "draft" | "rewrite" | "continuity";
      uiStore.setWriterFocusMode(mode);
      return `Writer focus mode set to ${mode}.`;
    }

    case "jump_to_scene": {
      const ref = String(args.sceneRef ?? args.sceneId ?? "").trim();
      if (!ref) return "sceneRef is required.";

      const project = useProjectStore.getState().project;
      const resolved = resolveScene(project, ref);
      if (resolved) {
        const { scene, chapter } = resolved;
        uiStore.openSceneTab({ sceneId: scene.id, title: scene.title });
        uiStore.setActiveSceneId(scene.id);
        return JSON.stringify({
          ok: true,
          sceneId: scene.id,
          sceneRef: `scene:${scene.id}`,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          sceneTitle: scene.title,
        });
      }

      if (!editor) return `Scene ${ref} not found and editor unavailable for legacy outline lookup.`;
      const outline = buildStoryOutlineFromDoc(editor.state.doc);
      for (const chapter of outline.chapters) {
        const target = chapter.scenes.find((scene) => scene.id === ref);
        if (target) {
          editor.chain().focus().setTextSelection(target.from).scrollIntoView().run();
          uiStore.setActiveSceneId(target.id);
          return `Jumped to scene ${target.title}.`;
        }
      }
      return `Scene ${ref} not found.`;
    }

    case "set_continuity_filter": {
      const filter = args.filter as "all" | "new" | "acknowledged" | "resolved" | "ignored";
      uiStore.setContinuityFilter(filter);
      return `Continuity filter set to ${filter}.`;
    }

    case "set_continuity_warning_status": {
      const warningKey = String(args.warningKey ?? "");
      const status = args.status as "new" | "acknowledged" | "resolved" | "ignored";
      if (!warningKey) return "warningKey is required.";
      if (invocationSource !== "ui" && status === "resolved") {
        return "resolved status is reserved for verified re-check flow.";
      }
      usePlotStoryStore.getState().setWarningStatus(warningKey, status);
      return `Warning ${warningKey} marked as ${status}.`;
    }

    case "suggest_continuity_fix": {
      if (!editor) return "Editor not available.";
      const warningKey = String(args.warningKey ?? "").trim();
      if (!warningKey) return "warningKey is required.";
      const storyStore = usePlotStoryStore.getState();
      const fail = (message: string): string => {
        storyStore.setFixError(warningKey, message);
        return message;
      };
      const warning = storyStore.consistencyWarnings.find((w) => w.key === warningKey);
      if (!warning) return fail(`Warning ${warningKey} not found.`);

      const chunks = computePlotChunks(editor);
      const chunkCandidates =
        chunks.length > 0
          ? chunks
          : [
              {
                id: "editor-fulltext-p0",
                text: editor.state.doc.textContent,
                from: 1,
                to: Math.max(1, editor.state.doc.content.size),
                label: "Текущий документ",
                kind: "heading" as const,
                chapterId: null,
                chapterTitle: null,
                sceneId: null,
                sceneTitle: null,
                chunkVersion: 0,
                contentHash: "fallback",
              },
            ];
      const byId = new Map(chunkCandidates.map((chunk) => [chunk.id, chunk]));
      let targetChunkId = warning.newChunkIds[0] ?? warning.previousChunkIds[0] ?? "";
      let chunk = targetChunkId ? byId.get(targetChunkId) : undefined;

      if (!chunk) {
        const mappedSceneId = targetChunkId
          ? (storyStore.chunkSceneMap[targetChunkId]?.sceneId ?? null)
          : null;
        const sceneCandidates = mappedSceneId
          ? chunkCandidates.filter((c) => c.sceneId === mappedSceneId)
          : [];
        const candidates =
          sceneCandidates.length > 0 ? sceneCandidates : chunkCandidates;
        const needles = [
          warning.newValue,
          warning.previousValue,
          warning.evidence?.quoteA ?? "",
          warning.evidence?.quoteB ?? "",
        ]
          .map((s) => s.trim().toLowerCase())
          .filter((s) => s.length >= 8);

        let best: (typeof chunkCandidates)[number] | null = null;
        let bestScore = -1;
        for (const candidate of candidates) {
          const text = candidate.text.toLowerCase();
          let score = 0;
          for (const needle of needles) {
            if (text.includes(needle)) score += 1;
          }
          if (score > bestScore) {
            bestScore = score;
            best = candidate;
          }
        }
        if (best && (bestScore > 0 || candidates.length > 0)) {
          chunk = best;
          targetChunkId = best.id;
        } else if (candidates[0]) {
          chunk = candidates[0];
          targetChunkId = candidates[0].id;
        }
      }
      if (!chunk) {
        return fail(
          targetChunkId
            ? `Source chunk ${targetChunkId} not found in current document.`
            : `Warning ${warningKey} has no resolvable source chunk.`,
        );
      }
      if (!targetChunkId) {
        targetChunkId = chunk.id;
      }

      const suggestions = buildContinuityFixSuggestions({
        warning,
        chunkId: targetChunkId,
        chunkText: chunk.text,
        chunkFrom: chunk.from,
      });
      if (suggestions.length === 0) {
        return fail("Не удалось построить предложения правки для этого конфликта.");
      }
      storyStore.setFixSuggestions(warningKey, suggestions);
      storyStore.setFixPreview(warningKey, suggestions[0] ?? null);
      storyStore.setWarningStatus(warningKey, "acknowledged");
      return JSON.stringify({
        warningKey,
        suggestionCount: suggestions.length,
        suggestions: suggestions.map((s) => ({
          id: s.id,
          title: s.title,
          strategy: s.strategy,
          reason: s.reason,
        })),
      });
    }

    case "apply_continuity_fix": {
      if (!editor) return "Editor not available.";
      if (invocationSource !== "ui") {
        return "apply_continuity_fix is manual-only and can only be triggered from UI.";
      }
      const warningKey = String(args.warningKey ?? "").trim();
      const suggestionId = String(args.suggestionId ?? "").trim();
      if (!warningKey) return "warningKey is required.";
      if (!suggestionId) return "suggestionId is required.";
      const storyStore = usePlotStoryStore.getState();
      const suggestions = storyStore.fixSuggestionsByWarningKey[warningKey] ?? [];
      const suggestion = suggestions.find((s) => s.id === suggestionId);
      if (!suggestion) return `Suggestion ${suggestionId} not found for ${warningKey}.`;
      const warning = storyStore.consistencyWarnings.find((w) => w.key === warningKey);
      const warningFingerprint = warning ? getWarningSemanticFingerprint(warning) : null;

      try {
        storyStore.setFixApplying(warningKey);
        const maxPos = editor.state.doc.content.size;
        let replaceFrom = suggestion.replaceFrom;
        let replaceTo = suggestion.replaceTo;
        const initialRangeLooksValid =
          replaceFrom >= 1 &&
          replaceTo >= replaceFrom &&
          replaceTo <= maxPos &&
          (suggestion.expectedCurrentText.length === 0 ||
            editor.state.doc.textBetween(replaceFrom, replaceTo, "\n", "\n") ===
              suggestion.expectedCurrentText);
        if (!initialRangeLooksValid) {
          const relocated = relocateSuggestionRange(editor, suggestion);
          if (!relocated) {
            storyStore.setFixRangeValidation(
              warningKey,
              "stale",
              "Диапазон правки устарел после редактирования текста. Нажмите «предложить правку» снова.",
            );
            storyStore.setFixError(
              warningKey,
              "Диапазон правки устарел. Пересоздайте предложение, чтобы не повредить текст.",
            );
            return "Autofix blocked: stale replace range.";
          }
          replaceFrom = relocated.from;
          replaceTo = relocated.to;
          storyStore.setFixRangeValidation(warningKey, "valid", relocated.note);
        } else {
          storyStore.setFixRangeValidation(
            warningKey,
            "valid",
            "Диапазон проверен, правку можно применять вручную.",
          );
        }
        const tr = editor.state.tr;
        if (replaceTo > replaceFrom) {
          tr.insertText(suggestion.replacementText, replaceFrom, replaceTo);
        } else {
          tr.insertText(suggestion.replacementText, replaceFrom);
        }
        editor.view.dispatch(tr);
        storyStore.setFixApplied(warningKey, suggestionId, warningFingerprint);
        try {
          const { data, chunks } = await runFullContextRecheck(editor);
          storyStore.applyFullExtraction(data, chunks);
        } catch (recheckError) {
          const recheckMessage =
            recheckError instanceof Error ? recheckError.message : String(recheckError);
          storyStore.setFixError(
            warningKey,
            `Правка применена, но перепроверка не удалась: ${recheckMessage}`,
          );
        }
        return JSON.stringify({
          ok: true,
          warningKey,
          suggestionId,
          strategy: suggestion.strategy,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        storyStore.setFixError(warningKey, msg);
        return `Autofix apply failed: ${msg}`;
      }
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}

function countWordsPlain(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function paragraphsFromText(raw: string): JSONContent {
  const blocks: JSONContent[] = [];
  const parts = raw.split(/\n\s*\n/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) {
      blocks.push({ type: "paragraph" });
      continue;
    }
    const lines = trimmed.split(/\n/);
    const nodes: JSONContent[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) nodes.push({ type: "hardBreak" });
      nodes.push({ type: "text", text: lines[i] });
    }
    blocks.push({ type: "paragraph", content: nodes });
  }
  if (blocks.length === 0) blocks.push({ type: "paragraph" });
  return { type: "doc", content: blocks };
}

function buildSceneContentFromInput(
  json: JSONContent | undefined,
  text: string | undefined,
): JSONContent | null {
  if (json && typeof json === "object") {
    if ((json as { type?: unknown }).type === "doc") return json;
    return { type: "doc", content: [json] };
  }
  if (typeof text === "string") return paragraphsFromText(text);
  return null;
}

function replaceBlockText(
  content: JSONContent,
  blockId: string,
  newText: string,
): JSONContent {
  const clone = JSON.parse(JSON.stringify(content)) as JSONContent;
  const visit = (node: JSONContent): boolean => {
    const attrs = (node as { attrs?: Record<string, unknown> }).attrs;
    const bid = attrs && typeof attrs.blockId === "string" ? attrs.blockId : null;
    if (bid === blockId) {
      const nodeAny = node as {
        content?: JSONContent[];
        type?: string;
      };
      if (nodeAny.type === "paragraph" || nodeAny.type === "heading") {
        nodeAny.content = newText
          ? [{ type: "text", text: newText }]
          : [];
      } else {
        nodeAny.content = [
          {
            type: "paragraph",
            attrs: attrs ? { ...attrs, blockId: undefined } : undefined,
            content: newText ? [{ type: "text", text: newText }] : [],
          },
        ];
      }
      return true;
    }
    const children = (node as { content?: JSONContent[] }).content;
    if (Array.isArray(children)) {
      for (const child of children) {
        if (visit(child)) return true;
      }
    }
    return false;
  };
  visit(clone);
  return clone;
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
