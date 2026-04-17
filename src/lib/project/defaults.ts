import type { JSONContent } from "@tiptap/react";
import {
  PROJECT_FORMAT_VERSION,
  type CharacterProfile,
  type StoryBible,
  type StoryChapter,
  type StoryProject,
  type StoryScene,
} from "./types";

export function createEmptyStoryBible(): StoryBible {
  return { locations: [], lore: [], timeline: [] };
}

export const EMPTY_SCENE_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function createId(prefix: string): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultScene(
  title = "Scene 1",
  order = 0,
  content: JSONContent = EMPTY_SCENE_DOC,
): StoryScene {
  const now = new Date().toISOString();
  return {
    id: createId("scene"),
    title,
    order,
    content,
    entities: [],
    metadata: {},
    updatedAt: now,
  };
}

export function createDefaultChapter(
  title = "Chapter 1",
  order = 0,
): StoryChapter {
  return {
    id: createId("chapter"),
    title,
    order,
    scenes: [createDefaultScene("Scene 1", 0)],
  };
}

export function createDefaultCharacterProfile(displayName: string): CharacterProfile {
  const now = new Date().toISOString();
  return {
    id: createId("char"),
    displayName,
    aliases: [],
    role: null,
    tags: [],
    sections: {},
    sourceEntityIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createDefaultProject(title = "Документ1"): StoryProject {
  const now = new Date().toISOString();
  return {
    formatVersion: PROJECT_FORMAT_VERSION,
    id: createId("project"),
    title,
    createdAt: now,
    updatedAt: now,
    chapters: [createDefaultChapter("Chapter 1", 0)],
    characterProfiles: [],
    pendingCharacterPatches: [],
    storyBible: createEmptyStoryBible(),
    styleMemory: null,
    sceneVersions: [],
  };
}
