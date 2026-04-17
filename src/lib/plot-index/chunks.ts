import type { Node as PMNode } from "@tiptap/pm/model";
import type { Editor, JSONContent } from "@tiptap/react";
import { buildStoryOutlineFromDoc } from "@/lib/story/outline";
import { sceneContentToPlainText } from "@/lib/ai/addressing";
import type {
  StoryChapter,
  StoryProject,
  StoryScene,
} from "@/lib/project/types";

/** FNV-1a 32-bit — stable fingerprint for change detection (not crypto). */
export function fnv1a32(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export type PlotChunkKind = "heading" | "page";
const CHUNK_VERSION = 2;

export type PlotChunk = {
  /** Stable within current outline: `h-{i}-p{j}` or `p-{i}-p{j}` */
  id: string;
  text: string;
  from: number;
  to: number;
  label: string;
  kind: PlotChunkKind;
  chapterId: string | null;
  chapterTitle: string | null;
  sceneId: string | null;
  sceneTitle: string | null;
  chunkVersion: number;
  /** Content hash for incremental re-embed */
  contentHash: string;
};

export type SceneChunkInput = {
  sceneId: string;
  sceneTitle: string;
  chapterId: string | null;
  chapterTitle: string | null;
  text: string;
};

const MAX_CHARS_PER_CHUNK = 6000;
const OVERLAP_CHARS = 200;

function splitLongText(
  text: string,
  baseId: string,
  from: number,
  to: number,
  label: string,
  kind: PlotChunkKind,
): PlotChunk[] {
  const t = text.trim();
  if (t.length === 0) return [];
  if (t.length <= MAX_CHARS_PER_CHUNK) {
    return [
      {
        id: `${baseId}-p0`,
        text: t,
        from,
        to,
        label,
        kind,
        chapterId: null,
        chapterTitle: null,
        sceneId: null,
        sceneTitle: null,
        chunkVersion: CHUNK_VERSION,
        contentHash: fnv1a32(`${CHUNK_VERSION}:${t}`),
      },
    ];
  }

  const out: PlotChunk[] = [];
  let start = 0;
  let part = 0;
  while (start < t.length) {
    const end = Math.min(start + MAX_CHARS_PER_CHUNK, t.length);
    const slice = t.slice(start, end).trim();
    if (slice.length > 0) {
      out.push({
        id: `${baseId}-p${part}`,
        text: slice,
        from,
        to,
        label,
        kind,
        chapterId: null,
        chapterTitle: null,
        sceneId: null,
        sceneTitle: null,
        chunkVersion: CHUNK_VERSION,
        contentHash: fnv1a32(`${CHUNK_VERSION}:${slice}`),
      });
      part++;
    }
    if (end >= t.length) break;
    start = end - OVERLAP_CHARS;
    if (start < 0) start = 0;
  }
  return out;
}

function collectDocPageInnerRanges(doc: PMNode): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "docPage") {
      ranges.push({
        from: pos + 1,
        to: pos + node.nodeSize - 1,
      });
    }
  });
  return ranges;
}

/**
 * Build plot chunks: prefer heading-defined sections; if there are no headings,
 * fall back to one chunk per document page (docPage inner content).
 */
export function computePlotChunks(editor: Editor): PlotChunk[] {
  const doc = editor.state.doc;
  const outline = buildStoryOutlineFromDoc(doc);
  const chunks: PlotChunk[] = [];

  if (outline.chapters.length > 0) {
    for (let i = 0; i < outline.chapters.length; i++) {
      const chapter = outline.chapters[i];
      for (let j = 0; j < chapter.scenes.length; j++) {
        const scene = chapter.scenes[j];
        const text = doc.textBetween(scene.from, scene.to, "\n").trim();
        if (!text) continue;
        const label = `${chapter.title} / ${scene.title}`;
        const split = splitLongText(
          text,
          `c-${i}-s-${j}`,
          scene.from,
          scene.to,
          label,
          "heading",
        ).map((chunk) => ({
          ...chunk,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          sceneId: scene.id,
          sceneTitle: scene.title,
          contentHash: fnv1a32(
            `${CHUNK_VERSION}:${chapter.id}:${scene.id}:${chunk.text}`,
          ),
        }));
        chunks.push(...split);
      }
    }
    return chunks;
  }

  const pages = collectDocPageInnerRanges(doc);
  const pageChunks: PlotChunk[] = [];
  for (let i = 0; i < pages.length; i++) {
    const { from, to } = pages[i];
    const text = doc.textBetween(from, to, "\n").trim();
    if (!text) continue;
    const label = `Страница ${i + 1}`;
    pageChunks.push(
      ...splitLongText(text, `p-${i}`, from, to, label, "page").map((chunk) => ({
        ...chunk,
        contentHash: fnv1a32(`${CHUNK_VERSION}:page-${i}:${chunk.text}`),
      })),
    );
  }
  return pageChunks;
}

export function documentTextFingerprint(editor: Editor): string {
  const t = editor.state.doc.textContent;
  return fnv1a32(t);
}

export function sceneTextFingerprint(text: string): string {
  return fnv1a32(text.trim());
}

/**
 * Build chunks for a single StoryScene from its saved `JSONContent`. Returns
 * chunk ids stable across re-indexing of the same scene: `scene:<sceneId>-p0`…
 */
export function computeSceneChunks(
  scene: StoryScene,
  chapter: StoryChapter | null,
): PlotChunk[] {
  const text = sceneContentToPlainText(scene.content);
  if (!text.trim()) return [];
  return computeSceneChunksFromText({
    sceneId: scene.id,
    sceneTitle: scene.title,
    chapterId: chapter?.id ?? null,
    chapterTitle: chapter?.title ?? null,
    text,
  });
}

/**
 * Build chunks for every scene in a project. Scenes with empty text are
 * skipped. Order follows chapter/scene order.
 */
export function computeProjectChunks(project: StoryProject): PlotChunk[] {
  const all: PlotChunk[] = [];
  for (const chapter of project.chapters) {
    for (const scene of chapter.scenes) {
      all.push(...computeSceneChunks(scene, chapter));
    }
  }
  return all;
}

/** Chunks for a scene expressed as raw `JSONContent` (e.g. for quick previews). */
export function computeSceneChunksFromContent(
  content: JSONContent,
  meta: {
    sceneId: string;
    sceneTitle: string;
    chapterId: string | null;
    chapterTitle: string | null;
  },
): PlotChunk[] {
  const text = sceneContentToPlainText(content);
  if (!text.trim()) return [];
  return computeSceneChunksFromText({ ...meta, text });
}

export function computeSceneChunksFromText(input: SceneChunkInput): PlotChunk[] {
  const text = input.text.trim();
  if (!text) return [];
  const split = splitLongText(
    text,
    `scene-${input.sceneId}`,
    0,
    text.length,
    `${input.chapterTitle ?? "Chapter"} / ${input.sceneTitle}`,
    "heading",
  );
  return split.map((chunk) => ({
    ...chunk,
    chapterId: input.chapterId,
    chapterTitle: input.chapterTitle,
    sceneId: input.sceneId,
    sceneTitle: input.sceneTitle,
    contentHash: fnv1a32(
      `${CHUNK_VERSION}:${input.sceneId}:${chunk.id}:${chunk.text}`,
    ),
  }));
}
