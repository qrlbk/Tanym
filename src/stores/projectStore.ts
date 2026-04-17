import type { JSONContent } from "@tiptap/react";
import { create } from "zustand";
import {
  createDefaultChapter,
  createDefaultCharacterProfile,
  createDefaultProject,
  createDefaultScene,
} from "@/lib/project/defaults";
import type {
  CharacterProfile,
  PendingCharacterPatch,
  StoryChapter,
  StoryProject,
  StoryScene,
} from "@/lib/project/types";

export type CharacterProfilePatch = Partial<
  Omit<CharacterProfile, "id" | "createdAt">
>;

type StoryProjectState = {
  project: StoryProject | null;
  setProject: (project: StoryProject) => void;
  resetProject: () => void;
  getSceneById: (sceneId: string) => StoryScene | null;
  getChapterBySceneId: (sceneId: string) => StoryChapter | null;
  setSceneContent: (sceneId: string, content: JSONContent) => void;
  renameScene: (sceneId: string, title: string) => void;
  renameChapter: (chapterId: string, title: string) => void;
  createScene: (chapterId: string) => string | null;
  /** Returns false if the scene does not exist or it is the last scene in the project. */
  deleteScene: (sceneId: string) => boolean;
  reorderScene: (
    sceneId: string,
    targetChapterId: string,
    targetIndex: number,
  ) => void;
  createChapter: (title?: string) => string | null;
  deleteChapter: (chapterId: string) => void;
  setSceneSummary: (
    sceneId: string,
    summary: string | null,
    summaryHash: string | null,
  ) => void;
  addCharacterProfile: (displayName: string) => string | null;
  updateCharacterProfile: (id: string, patch: CharacterProfilePatch) => void;
  queuePendingCharacterPatch: (patch: PendingCharacterPatch) => void;
  applyCharacterPatch: (patchId: string) => boolean;
  rejectCharacterPatch: (patchId: string) => boolean;
  deleteCharacterProfile: (id: string) => void;
  upsertCharacterProfile: (profile: CharacterProfile) => void;
  /**
   * Save a complete project (used by undo/restore).
   */
  replaceProject: (project: StoryProject) => void;
  /**
   * Push a snapshot of the current project onto the undo stack. Called by
   * AI write tools before they mutate scene content, so the user can revert
   * a round of AI edits with one click.
   */
  pushUndoSnapshot: (label: string) => void;
  /** Pop the most recent snapshot and restore the project to it. */
  popUndoSnapshot: () => string | null;
  /** Read-only snapshot stack for UI. */
  undoStack: Array<{ label: string; project: StoryProject; at: number }>;
};

function touch(project: StoryProject): StoryProject {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeChapterOrders(chapters: StoryChapter[]): StoryChapter[] {
  return chapters.map((chapter, chapterIndex) => ({
    ...chapter,
    order: chapterIndex,
    scenes: chapter.scenes.map((scene, sceneIndex) => ({
      ...scene,
      order: sceneIndex,
    })),
  }));
}

function updateProject(
  state: StoryProjectState,
  updater: (project: StoryProject) => StoryProject,
): StoryProjectState {
  if (!state.project) return state;
  return { ...state, project: touch(updater(state.project)) };
}

export const useProjectStore = create<StoryProjectState>((set, get) => ({
  project: null,
  setProject: (project) => set({ project }),
  resetProject: () => set({ project: createDefaultProject() }),
  getSceneById: (sceneId) => {
    const project = get().project;
    if (!project) return null;
    for (const chapter of project.chapters) {
      for (const scene of chapter.scenes) {
        if (scene.id === sceneId) return scene;
      }
    }
    return null;
  },
  getChapterBySceneId: (sceneId) => {
    const project = get().project;
    if (!project) return null;
    for (const chapter of project.chapters) {
      if (chapter.scenes.some((scene) => scene.id === sceneId)) return chapter;
    }
    return null;
  },
  setSceneContent: (sceneId, content) =>
    set((state) =>
      updateProject(state, (project) => ({
        ...project,
        chapters: project.chapters.map((chapter) => ({
          ...chapter,
          scenes: chapter.scenes.map((scene) =>
            scene.id === sceneId
              ? { ...scene, content, updatedAt: new Date().toISOString() }
              : scene,
          ),
        })),
      })),
    ),
  setSceneSummary: (sceneId, summary, summaryHash) =>
    set((state) =>
      updateProject(state, (project) => ({
        ...project,
        chapters: project.chapters.map((chapter) => ({
          ...chapter,
          scenes: chapter.scenes.map((scene) =>
            scene.id === sceneId
              ? {
                  ...scene,
                  summary: summary && summary.trim() ? summary : null,
                  summaryHash,
                  summaryUpdatedAt: Date.now(),
                }
              : scene,
          ),
        })),
      })),
    ),
  renameScene: (sceneId, title) =>
    set((state) =>
      updateProject(state, (project) => ({
        ...project,
        chapters: project.chapters.map((chapter) => ({
          ...chapter,
          scenes: chapter.scenes.map((scene) =>
            scene.id === sceneId ? { ...scene, title } : scene,
          ),
        })),
      })),
    ),
  renameChapter: (chapterId, title) =>
    set((state) =>
      updateProject(state, (project) => ({
        ...project,
        chapters: project.chapters.map((chapter) =>
          chapter.id === chapterId ? { ...chapter, title } : chapter,
        ),
      })),
    ),
  createScene: (chapterId) => {
    const project = get().project;
    if (!project) return null;
    const chapter = project.chapters.find((c) => c.id === chapterId);
    if (!chapter) return null;
    const scene = createDefaultScene(`Scene ${chapter.scenes.length + 1}`, chapter.scenes.length);
    set((state) =>
      updateProject(state, (current) => ({
        ...current,
        chapters: normalizeChapterOrders(
          current.chapters.map((c) =>
            c.id === chapterId ? { ...c, scenes: [...c.scenes, scene] } : c,
          ),
        ),
      })),
    );
    return scene.id;
  },
  deleteScene: (sceneId) => {
    const project = get().project;
    if (!project) return false;
    const totalScenes = project.chapters.reduce((n, ch) => n + ch.scenes.length, 0);
    if (totalScenes <= 1) return false;
    const exists = project.chapters.some((ch) => ch.scenes.some((s) => s.id === sceneId));
    if (!exists) return false;
    set((state) =>
      updateProject(state, (current) => ({
        ...current,
        chapters: normalizeChapterOrders(
          current.chapters.map((chapter) => ({
            ...chapter,
            scenes: chapter.scenes.filter((s) => s.id !== sceneId),
          })),
        ),
      })),
    );
    return true;
  },
  createChapter: (title) => {
    const project = get().project;
    if (!project) return null;
    const chapter = createDefaultChapter(
      title ?? `Chapter ${project.chapters.length + 1}`,
      project.chapters.length,
    );
    set((state) =>
      updateProject(state, (current) => ({
        ...current,
        chapters: normalizeChapterOrders([...current.chapters, chapter]),
      })),
    );
    return chapter.id;
  },
  deleteChapter: (chapterId) =>
    set((state) =>
      updateProject(state, (project) => ({
        ...project,
        chapters: normalizeChapterOrders(
          project.chapters.filter((c) => c.id !== chapterId),
        ),
      })),
    ),
  replaceProject: (project) => set({ project: touch(project) }),
  undoStack: [],
  pushUndoSnapshot: (label) =>
    set((state) => {
      if (!state.project) return state;
      const snapshot = {
        label,
        at: Date.now(),
        project: JSON.parse(JSON.stringify(state.project)) as StoryProject,
      };
      const next = [...state.undoStack, snapshot];
      const MAX = 20;
      if (next.length > MAX) next.splice(0, next.length - MAX);
      return { ...state, undoStack: next };
    }),
  popUndoSnapshot: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return null;
    const last = undoStack[undoStack.length - 1];
    set({
      project: touch(last.project),
      undoStack: undoStack.slice(0, -1),
    });
    return last.label;
  },
  reorderScene: (sceneId, targetChapterId, targetIndex) =>
    set((state) =>
      updateProject(state, (project) => {
        let moved: StoryScene | null = null;
        const withoutScene = project.chapters.map((chapter) => ({
          ...chapter,
          scenes: chapter.scenes.filter((scene) => {
            if (scene.id === sceneId) {
              moved = scene;
              return false;
            }
            return true;
          }),
        }));

        if (!moved) {
          return project;
        }

        const chapters = withoutScene.map((chapter) => {
          if (chapter.id !== targetChapterId) return chapter;
          const next = [...chapter.scenes];
          const index = Math.max(0, Math.min(targetIndex, next.length));
          next.splice(index, 0, moved as StoryScene);
          return { ...chapter, scenes: next };
        });

        return {
          ...project,
          chapters: normalizeChapterOrders(chapters),
        };
      }),
    ),
  addCharacterProfile: (displayName) => {
    const trimmed = displayName.trim();
    if (!trimmed) return null;
    const profile = createDefaultCharacterProfile(trimmed);
    set((state) =>
      updateProject(state, (project) => ({
        ...project,
        characterProfiles: [...project.characterProfiles, profile],
      })),
    );
    return profile.id;
  },
  updateCharacterProfile: (id, patch) =>
    set((state) =>
      updateProject(state, (project) => ({
        ...project,
        characterProfiles: project.characterProfiles.map((c) =>
          c.id === id
            ? {
                ...c,
                ...patch,
                updatedAt: new Date().toISOString(),
              }
            : c,
        ),
      })),
    ),
  queuePendingCharacterPatch: (patch) =>
    set((state) =>
      updateProject(state, (project) => {
        const pending = project.pendingCharacterPatches ?? [];
        const next = [...pending.filter((p) => p.id !== patch.id), patch];
        const MAX = 50;
        if (next.length > MAX) next.splice(0, next.length - MAX);
        return { ...project, pendingCharacterPatches: next };
      }),
    ),
  applyCharacterPatch: (patchId) => {
    let applied = false;
    set((state) =>
      updateProject(state, (project) => {
        const pending = project.pendingCharacterPatches ?? [];
        const patch = pending.find((p) => p.id === patchId);
        if (!patch) return project;
        applied = true;
        return {
          ...project,
          characterProfiles: project.characterProfiles.map((c) =>
            c.id === patch.profileId
              ? {
                  ...c,
                  role: patch.role ?? c.role,
                  sections: {
                    ...c.sections,
                    ...patch.sections,
                  },
                  updatedAt: new Date().toISOString(),
                }
              : c,
          ),
          pendingCharacterPatches: pending.filter((p) => p.id !== patchId),
        };
      }),
    );
    return applied;
  },
  rejectCharacterPatch: (patchId) => {
    let removed = false;
    set((state) =>
      updateProject(state, (project) => {
        const pending = project.pendingCharacterPatches ?? [];
        if (!pending.some((p) => p.id === patchId)) return project;
        removed = true;
        return {
          ...project,
          pendingCharacterPatches: pending.filter((p) => p.id !== patchId),
        };
      }),
    );
    return removed;
  },
  deleteCharacterProfile: (id) =>
    set((state) =>
      updateProject(state, (project) => ({
        ...project,
        characterProfiles: project.characterProfiles.filter((c) => c.id !== id),
        pendingCharacterPatches: (project.pendingCharacterPatches ?? []).filter(
          (p) => p.profileId !== id,
        ),
      })),
    ),
  upsertCharacterProfile: (profile) =>
    set((state) =>
      updateProject(state, (project) => {
        const idx = project.characterProfiles.findIndex((c) => c.id === profile.id);
        const next = [...project.characterProfiles];
        const updated = {
          ...profile,
          updatedAt: new Date().toISOString(),
        };
        if (idx >= 0) next[idx] = updated;
        else next.push(updated);
        return { ...project, characterProfiles: next };
      }),
    ),
}));
