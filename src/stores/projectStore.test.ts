import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "./projectStore";
import { createDefaultProject, createDefaultCharacterProfile } from "@/lib/project/defaults";

describe("projectStore pending character patches", () => {
  beforeEach(() => {
    const project = createDefaultProject();
    const p = createDefaultCharacterProfile("Артур");
    project.characterProfiles = [p];
    project.pendingCharacterPatches = [];
    useProjectStore.setState({ project, undoStack: [] });
  });

  it("queues and applies patch", () => {
    const profileId = useProjectStore.getState().project!.characterProfiles[0]!.id;
    useProjectStore.getState().queuePendingCharacterPatch({
      id: "patch-1",
      profileId,
      sections: { notes: "новая заметка" },
      role: "протагонист",
      confidence: 0.9,
      reasons: ["name_role"],
      impact: "important",
      sourceSceneId: "scene-1",
      createdAt: Date.now(),
    });
    expect(useProjectStore.getState().project?.pendingCharacterPatches?.length).toBe(1);
    const applied = useProjectStore.getState().applyCharacterPatch("patch-1");
    expect(applied).toBe(true);
    const profile = useProjectStore.getState().project?.characterProfiles[0];
    expect(profile?.role).toBe("протагонист");
    expect(profile?.sections.notes).toContain("новая");
    expect(useProjectStore.getState().project?.pendingCharacterPatches?.length).toBe(0);
  });

  it("rejects patch without mutating profile", () => {
    const profileId = useProjectStore.getState().project!.characterProfiles[0]!.id;
    useProjectStore.getState().queuePendingCharacterPatch({
      id: "patch-2",
      profileId,
      sections: { notes: "x" },
      role: null,
      confidence: 0.5,
      reasons: ["large_rewrite"],
      impact: "important",
      sourceSceneId: null,
      createdAt: Date.now(),
    });
    const removed = useProjectStore.getState().rejectCharacterPatch("patch-2");
    expect(removed).toBe(true);
    expect(useProjectStore.getState().project?.pendingCharacterPatches?.length).toBe(0);
  });
});

describe("projectStore chapters and scenes", () => {
  beforeEach(() => {
    useProjectStore.setState({ project: createDefaultProject(), undoStack: [] });
  });

  it("renameChapter updates title", () => {
    const chapterId = useProjectStore.getState().project!.chapters[0]!.id;
    useProjectStore.getState().renameChapter(chapterId, "Новая глава");
    expect(useProjectStore.getState().project?.chapters[0]?.title).toBe("Новая глава");
  });

  it("deleteScene refuses last scene in project", () => {
    const sceneId = useProjectStore.getState().project!.chapters[0]!.scenes[0]!.id;
    const ok = useProjectStore.getState().deleteScene(sceneId);
    expect(ok).toBe(false);
    expect(useProjectStore.getState().project?.chapters[0]?.scenes.length).toBe(1);
  });

  it("deleteScene removes scene and normalizes order when another scene exists", () => {
    const chapterId = useProjectStore.getState().project!.chapters[0]!.id;
    const id2 = useProjectStore.getState().createScene(chapterId);
    expect(id2).toBeTruthy();
    const scenes = useProjectStore.getState().project!.chapters[0]!.scenes;
    expect(scenes.length).toBe(2);
    const ok = useProjectStore.getState().deleteScene(scenes[0]!.id);
    expect(ok).toBe(true);
    const after = useProjectStore.getState().project!.chapters[0]!.scenes;
    expect(after.length).toBe(1);
    expect(after[0]!.order).toBe(0);
  });
});
