import type { JSONContent } from "@tiptap/react";
import type { SceneVersion, StoryProject, StoryScene } from "./types";

/**
 * Версионирование сцен: снимки `JSONContent` сцены перед AI-правкой.
 *
 * Цель — дать писателю откат ровно к состоянию до AI-вмешательства,
 * не гоняя undo через десятки редакторских операций.
 *
 * Хранение: в `StoryProject.sceneVersions` (v6+). Ограничиваем
 * MAX_VERSIONS_PER_SCENE, чтобы не раздувать файл проекта.
 *
 * Все функции — pure: на вход проект, на выход новый проект.
 */

export const MAX_VERSIONS_PER_SCENE = 20;

function createId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `ver-${globalThis.crypto.randomUUID()}`;
  }
  return `ver-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export type SnapshotOptions = {
  label?: string;
  source?: SceneVersion["source"];
};

/**
 * Создаёт снимок текущего состояния сцены в проекте. Если сцены нет —
 * возвращает проект без изменений.
 */
export function snapshotScene(
  project: StoryProject,
  sceneId: string,
  options: SnapshotOptions = {},
): StoryProject {
  const scene = findSceneById(project, sceneId);
  if (!scene) return project;

  const version: SceneVersion = {
    id: createId(),
    sceneId,
    title: scene.title,
    // Копируем JSONContent через JSON roundtrip — иначе держим референс на живое
    // состояние TipTap и рискуем получить мутации после снимка.
    content: JSON.parse(JSON.stringify(scene.content)) as JSONContent,
    createdAt: Date.now(),
    label: options.label ?? "Snapshot",
    source: options.source,
  };

  const existing = project.sceneVersions ?? [];
  const forScene = existing.filter((v) => v.sceneId === sceneId);
  const others = existing.filter((v) => v.sceneId !== sceneId);

  // Трим старых версий: оставляем только последние MAX_VERSIONS_PER_SCENE.
  const trimmed = [...forScene, version].slice(-MAX_VERSIONS_PER_SCENE);

  return {
    ...project,
    sceneVersions: [...others, ...trimmed],
  };
}

/** Найти версию сцены по id. */
export function findSceneVersionById(
  project: StoryProject,
  versionId: string,
): SceneVersion | null {
  const all = project.sceneVersions ?? [];
  return all.find((v) => v.id === versionId) ?? null;
}

/** Все версии одной сцены, отсортированные от старых к новым. */
export function listSceneVersions(
  project: StoryProject,
  sceneId: string,
): SceneVersion[] {
  const all = project.sceneVersions ?? [];
  return all
    .filter((v) => v.sceneId === sceneId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Откатывает сцену к указанной версии. Сам откат не изменяет список версий,
 * чтобы пользователь мог вернуться назад. Делаем snapshot текущего состояния
 * перед откатом (label = "Before revert").
 */
export function revertSceneToVersion(
  project: StoryProject,
  versionId: string,
): StoryProject {
  const version = findSceneVersionById(project, versionId);
  if (!version) return project;
  const scene = findSceneById(project, version.sceneId);
  if (!scene) return project;

  const withBackup = snapshotScene(project, version.sceneId, {
    label: "Before revert",
    source: { kind: "manual" },
  });

  const nextChapters = withBackup.chapters.map((ch) => ({
    ...ch,
    scenes: ch.scenes.map((s) =>
      s.id === version.sceneId
        ? {
            ...s,
            title: version.title,
            content: JSON.parse(JSON.stringify(version.content)) as JSONContent,
            updatedAt: new Date().toISOString(),
          }
        : s,
    ),
  }));

  return {
    ...withBackup,
    chapters: nextChapters,
    updatedAt: new Date().toISOString(),
  };
}

function findSceneById(
  project: StoryProject,
  sceneId: string,
): StoryScene | null {
  for (const ch of project.chapters) {
    const scene = ch.scenes.find((s) => s.id === sceneId);
    if (scene) return scene;
  }
  return null;
}
