import type { JSONContent } from "@tiptap/react";
import { flattenDocPagesForExport, migrateDocJson } from "@/lib/migrate-doc-pages";
import { createDefaultProject, createDefaultScene, createId, EMPTY_SCENE_DOC } from "./defaults";
import {
  PROJECT_FORMAT_VERSION,
  type StoryChapter,
  type StoryProject,
  type StoryScene,
} from "./types";

function headingText(node: JSONContent): string {
  const text = (node.content ?? [])
    .map((part) => (part.type === "text" ? String(part.text ?? "") : ""))
    .join("")
    .trim();
  return text;
}

function ensureScene(
  chapter: StoryChapter,
  preferredTitle?: string,
): StoryScene {
  const existing = chapter.scenes[chapter.scenes.length - 1];
  if (existing) return existing;
  const scene = createDefaultScene(
    preferredTitle || `Scene ${chapter.scenes.length + 1}`,
    chapter.scenes.length,
    { ...EMPTY_SCENE_DOC, content: [] },
  );
  chapter.scenes.push(scene);
  return scene;
}

function normalizeOrders(project: StoryProject): StoryProject {
  return {
    ...project,
    chapters: project.chapters.map((chapter, chapterIndex) => ({
      ...chapter,
      order: chapterIndex,
      scenes: chapter.scenes.map((scene, sceneIndex) => ({
        ...scene,
        order: sceneIndex,
      })),
    })),
  };
}

export function migrateLegacyDocToProject(
  legacy: JSONContent | null | undefined,
): StoryProject {
  const migrated = migrateDocJson(legacy);
  const flatBlocks = flattenDocPagesForExport(migrated.content);
  const now = new Date().toISOString();

  if (!flatBlocks.length) {
    return createDefaultProject();
  }

  const chapters: StoryChapter[] = [];
  let chapterCounter = 1;
  let currentChapter: StoryChapter | null = null;
  let sceneCounter = 1;

  for (const block of flatBlocks) {
    if (block.type === "heading") {
      const level = Number(block.attrs?.level ?? 1);
      const text = headingText(block);

      if (level <= 1 || !currentChapter) {
        currentChapter = {
          id: createId("chapter"),
          title: text || `Chapter ${chapterCounter}`,
          order: chapters.length,
          scenes: [],
        };
        chapterCounter += 1;
        sceneCounter = 1;
        chapters.push(currentChapter);
        continue;
      }

      if (level === 2) {
        const scene = createDefaultScene(
          text || `Scene ${sceneCounter}`,
          currentChapter.scenes.length,
          { type: "doc", content: [block] },
        );
        sceneCounter += 1;
        currentChapter.scenes.push(scene);
        continue;
      }
    }

    if (!currentChapter) {
      currentChapter = {
        id: createId("chapter"),
        title: "Chapter 1",
        order: chapters.length,
        scenes: [],
      };
      chapters.push(currentChapter);
    }

    const scene = ensureScene(currentChapter, `Scene ${sceneCounter}`);
    const content = scene.content.content ? [...scene.content.content, block] : [block];
    scene.content = { type: "doc", content };
  }

  for (const chapter of chapters) {
    if (chapter.scenes.length === 0) {
      chapter.scenes.push(
        createDefaultScene("Scene 1", 0, {
          ...EMPTY_SCENE_DOC,
        }),
      );
    }
    chapter.scenes = chapter.scenes.map((scene, index) => ({
      ...scene,
      order: index,
      title: scene.title || `Scene ${index + 1}`,
      content:
        scene.content.content && scene.content.content.length > 0
          ? scene.content
          : { ...EMPTY_SCENE_DOC },
      updatedAt: scene.updatedAt || now,
    }));
  }

  const project: StoryProject = {
    formatVersion: PROJECT_FORMAT_VERSION,
    id: createId("project"),
    title: "Документ1",
    createdAt: now,
    updatedAt: now,
    chapters,
    characterProfiles: [],
  };
  return normalizeOrders(project);
}
