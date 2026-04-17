import type { Editor } from "@tiptap/react";
import type { PlotFact } from "@/lib/plot-index/story-extraction";
import {
  computePlotChunks,
  computeSceneChunksFromText,
  type PlotChunk,
} from "@/lib/plot-index/chunks";
import type { StoryChapter, StoryScene } from "@/lib/project/types";

const DEFAULT_MAX_EXCERPT_CHARS = 18_000;

/** Merge chunk lists by id (scene-scoped ids from extraction + outline-scoped ids from full doc). */
function buildChunkIndex(
  editor: Editor,
  opts?: {
    activeSceneId?: string | null;
    getSceneById?: (id: string) => StoryScene | null;
    getChapterBySceneId?: (id: string) => StoryChapter | null;
  },
): Map<string, PlotChunk> {
  const byId = new Map<string, PlotChunk>();
  for (const c of computePlotChunks(editor)) {
    byId.set(c.id, c);
  }
  const sceneId = opts?.activeSceneId;
  const scene = sceneId && opts?.getSceneById ? opts.getSceneById(sceneId) : null;
  const chapter = sceneId && opts?.getChapterBySceneId
    ? opts.getChapterBySceneId(sceneId)
    : null;
  if (scene && chapter) {
    const text = editor.state.doc.textContent;
    const sceneChunks = computeSceneChunksFromText({
      sceneId: scene.id,
      sceneTitle: scene.title,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      text,
    });
    for (const c of sceneChunks) {
      byId.set(c.id, c);
    }
  }
  return byId;
}

export type CharacterExcerptResult = {
  excerptsBlob: string;
  missingChunkIds: string[];
  excerptChars: number;
};

/**
 * Prose excerpts from manuscript chunks referenced by plot facts (best-effort: matches
 * outline chunks and scene-scoped extraction chunks for the active scene).
 */
export function buildCharacterExcerptsBlob(
  editor: Editor | null,
  relFacts: PlotFact[],
  options?: {
    maxChars?: number;
    activeSceneId?: string | null;
    getSceneById?: (id: string) => StoryScene | null;
    getChapterBySceneId?: (id: string) => StoryChapter | null;
  },
): CharacterExcerptResult {
  const maxChars = options?.maxChars ?? DEFAULT_MAX_EXCERPT_CHARS;
  if (!editor || relFacts.length === 0) {
    return { excerptsBlob: "", missingChunkIds: [], excerptChars: 0 };
  }

  const byId = buildChunkIndex(editor, {
    activeSceneId: options?.activeSceneId,
    getSceneById: options?.getSceneById,
    getChapterBySceneId: options?.getChapterBySceneId,
  });

  const factCountByChunk = new Map<string, number>();
  for (const f of relFacts) {
    for (const cid of f.chunkIds) {
      factCountByChunk.set(cid, (factCountByChunk.get(cid) ?? 0) + 1);
    }
  }

  const uniqueIds = [...new Set(relFacts.flatMap((f) => f.chunkIds))];
  const missing: string[] = [];
  const resolvedIds: string[] = [];
  for (const id of uniqueIds) {
    if (byId.has(id)) resolvedIds.push(id);
    else missing.push(id);
  }

  const sorted = resolvedIds.sort(
    (a, b) => (factCountByChunk.get(b) ?? 0) - (factCountByChunk.get(a) ?? 0),
  );

  const parts: string[] = [];
  let total = 0;
  for (const id of sorted) {
    const ch = byId.get(id);
    if (!ch) continue;
    const block = `[${ch.label}]\n${ch.text}\n\n`;
    if (total + block.length > maxChars) {
      const remaining = maxChars - total;
      if (remaining < 120) break;
      parts.push(block.slice(0, remaining));
      total = maxChars;
      break;
    }
    parts.push(block);
    total += block.length;
  }

  return {
    excerptsBlob: parts.join("").trim(),
    missingChunkIds: missing,
    excerptChars: total,
  };
}

export function buildFactsBlobForDraft(relFacts: PlotFact[], maxChars = 24_000): string {
  const lines = relFacts.map((f) => `• ${f.attribute}: ${f.value}`);
  const text = lines.join("\n");
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[…усечено]`;
}
