/**
 * Canonical addressing of project entities for AI tools.
 *
 * Addressable units:
 *   - scene:<uuid>             — a StoryScene by project UUID
 *   - scene:<uuid>#block:<uid> — a top-level block inside a scene (BlockId attr)
 *   - chapter:<uuid>           — a StoryChapter
 *   - character:<uuid>         — a CharacterProfile
 *
 * For backward compatibility we also accept legacy ids coming from
 * `buildStoryOutlineFromDoc` (`scene-0`, `chapter-0`, …) when a scoped
 * project lookup is required.
 */

import type { JSONContent } from "@tiptap/react";
import type {
  CharacterProfile,
  StoryChapter,
  StoryProject,
  StoryScene,
} from "@/lib/project/types";

export const SCENE_REF_PREFIX = "scene:";
export const CHAPTER_REF_PREFIX = "chapter:";
export const CHARACTER_REF_PREFIX = "character:";
export const BLOCK_REF_SEP = "#block:";

export type SceneRef = string; // "scene:<uuid>" or legacy "<uuid>" / "scene-N"
export type BlockRef = string; // "scene:<uuid>#block:<blockId>"
export type ChapterRef = string; // "chapter:<uuid>"
export type CharacterRef = string; // "character:<uuid>"

export function isSceneRef(value: unknown): value is SceneRef {
  return typeof value === "string" && value.length > 0;
}

export function isBlockRef(value: unknown): value is BlockRef {
  return typeof value === "string" && value.includes(BLOCK_REF_SEP);
}

export function parseSceneRef(raw: string): {
  sceneId: string;
  blockId: string | null;
} {
  const value = raw.trim();
  const sepIndex = value.indexOf(BLOCK_REF_SEP);
  let scenePart = value;
  let blockId: string | null = null;
  if (sepIndex >= 0) {
    scenePart = value.slice(0, sepIndex);
    blockId = value.slice(sepIndex + BLOCK_REF_SEP.length).trim() || null;
  }
  const sceneId = scenePart.startsWith(SCENE_REF_PREFIX)
    ? scenePart.slice(SCENE_REF_PREFIX.length).trim()
    : scenePart.trim();
  return { sceneId, blockId };
}

export function makeSceneRef(sceneId: string): SceneRef {
  return `${SCENE_REF_PREFIX}${sceneId}`;
}

export function makeBlockRef(sceneId: string, blockId: string): BlockRef {
  return `${makeSceneRef(sceneId)}${BLOCK_REF_SEP}${blockId}`;
}

export function makeChapterRef(chapterId: string): ChapterRef {
  return `${CHAPTER_REF_PREFIX}${chapterId}`;
}

export function parseChapterRef(raw: string): string {
  const value = raw.trim();
  return value.startsWith(CHAPTER_REF_PREFIX)
    ? value.slice(CHAPTER_REF_PREFIX.length).trim()
    : value;
}

export function makeCharacterRef(characterId: string): CharacterRef {
  return `${CHARACTER_REF_PREFIX}${characterId}`;
}

export function parseCharacterRef(raw: string): string {
  const value = raw.trim();
  return value.startsWith(CHARACTER_REF_PREFIX)
    ? value.slice(CHARACTER_REF_PREFIX.length).trim()
    : value;
}

export type ResolvedScene = {
  chapter: StoryChapter;
  scene: StoryScene;
};

/**
 * Resolve a scene reference against the project.
 * Accepts:
 *   - scene:<uuid>
 *   - <uuid>                    (a raw StoryScene.id)
 *   - legacy heading-outline ids like "scene-0" (index into the ordered scene list)
 *   - block ref strings (only the scene part is used)
 */
export function resolveScene(
  project: StoryProject | null,
  ref: string | null | undefined,
): ResolvedScene | null {
  if (!project || !ref) return null;
  const { sceneId } = parseSceneRef(ref);
  if (!sceneId) return null;

  for (const chapter of project.chapters) {
    for (const scene of chapter.scenes) {
      if (scene.id === sceneId) return { chapter, scene };
    }
  }

  // Legacy fallbacks for outline ids like `scene-<N>` (index) or `scene-fallback-<chapterId>`.
  const legacyMatch = /^scene-(\d+)$/.exec(sceneId);
  if (legacyMatch) {
    const idx = Number(legacyMatch[1]);
    let seen = 0;
    for (const chapter of project.chapters) {
      for (const scene of chapter.scenes) {
        if (seen === idx) return { chapter, scene };
        seen += 1;
      }
    }
  }

  return null;
}

export function resolveChapter(
  project: StoryProject | null,
  ref: string | null | undefined,
): StoryChapter | null {
  if (!project || !ref) return null;
  const chapterId = parseChapterRef(ref);
  return project.chapters.find((c) => c.id === chapterId) ?? null;
}

export function resolveCharacter(
  project: StoryProject | null,
  ref: string | null | undefined,
): CharacterProfile | null {
  if (!project || !ref) return null;
  const id = parseCharacterRef(ref);
  return project.characterProfiles.find((c) => c.id === id) ?? null;
}

/** Locate a block node inside a scene JSON by its `blockId` attribute. */
export function findBlockInSceneContent(
  content: JSONContent,
  blockId: string,
): { node: JSONContent; index: number; path: number[] } | null {
  if (!content || !blockId) return null;
  const stack: Array<{ node: JSONContent; path: number[] }> = [
    { node: content, path: [] },
  ];
  while (stack.length) {
    const { node, path } = stack.pop()!;
    const attrs = (node as { attrs?: Record<string, unknown> }).attrs;
    const bid = attrs && typeof attrs.blockId === "string" ? attrs.blockId : null;
    if (bid === blockId) {
      const parentIndex = path.length > 0 ? path[path.length - 1] : 0;
      return { node, index: parentIndex, path };
    }
    const children = (node as { content?: JSONContent[] }).content;
    if (Array.isArray(children)) {
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({ node: children[i], path: [...path, i] });
      }
    }
  }
  return null;
}

/** Walk scene JSON and collect plain text. */
export function sceneContentToPlainText(content: JSONContent): string {
  const parts: string[] = [];
  const walk = (node: JSONContent) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "text" && typeof node.text === "string") {
      parts.push(node.text);
      return;
    }
    const children = (node as { content?: JSONContent[] }).content;
    if (Array.isArray(children)) {
      for (const child of children) walk(child);
    }
    if (node.type && node.type !== "text" && parts.length > 0 && !parts[parts.length - 1].endsWith("\n")) {
      if (/^(paragraph|heading|blockquote|codeBlock|listItem|taskItem)$/.test(node.type)) {
        parts.push("\n");
      }
    }
  };
  walk(content);
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim();
}

export function countScenes(project: StoryProject): number {
  let n = 0;
  for (const chapter of project.chapters) n += chapter.scenes.length;
  return n;
}

/** Flatten project scenes in reading order (chapter order → scene order). */
export function listScenesInOrder(project: StoryProject): Array<{
  chapter: StoryChapter;
  scene: StoryScene;
  chapterIndex: number;
  sceneIndex: number;
  globalIndex: number;
}> {
  const out: Array<{
    chapter: StoryChapter;
    scene: StoryScene;
    chapterIndex: number;
    sceneIndex: number;
    globalIndex: number;
  }> = [];
  let globalIndex = 0;
  for (let i = 0; i < project.chapters.length; i++) {
    const chapter = project.chapters[i];
    for (let j = 0; j < chapter.scenes.length; j++) {
      out.push({
        chapter,
        scene: chapter.scenes[j],
        chapterIndex: i,
        sceneIndex: j,
        globalIndex,
      });
      globalIndex += 1;
    }
  }
  return out;
}
