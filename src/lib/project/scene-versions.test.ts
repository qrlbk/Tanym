import { describe, expect, it } from "vitest";
import type { StoryProject } from "./types";
import {
  MAX_VERSIONS_PER_SCENE,
  listSceneVersions,
  revertSceneToVersion,
  snapshotScene,
} from "./scene-versions";

function makeProject(): StoryProject {
  const now = new Date().toISOString();
  return {
    formatVersion: 6,
    id: "p1",
    title: "Novel",
    createdAt: now,
    updatedAt: now,
    chapters: [
      {
        id: "c1",
        title: "Chapter 1",
        order: 0,
        scenes: [
          {
            id: "s1",
            title: "Scene 1",
            order: 0,
            content: {
              type: "doc",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Version A" }] },
              ],
            },
            entities: [],
            metadata: {},
            updatedAt: now,
          },
        ],
      },
    ],
    characterProfiles: [],
    pendingCharacterPatches: [],
    storyBible: { locations: [], lore: [], timeline: [] },
    styleMemory: null,
    sceneVersions: [],
  };
}

describe("snapshotScene", () => {
  it("creates a new version entry for an existing scene", () => {
    const p = makeProject();
    const next = snapshotScene(p, "s1", { label: "AI rewrite" });
    expect(next.sceneVersions).toHaveLength(1);
    expect(next.sceneVersions![0]!.label).toBe("AI rewrite");
    expect(next.sceneVersions![0]!.sceneId).toBe("s1");
  });

  it("returns project unchanged when scene id does not exist", () => {
    const p = makeProject();
    const next = snapshotScene(p, "unknown", {});
    expect(next).toBe(p);
  });

  it("deep-copies content so later scene edits do not mutate the snapshot", () => {
    const p = makeProject();
    const snapped = snapshotScene(p, "s1");
    // Мутируем ОРИГИНАЛЬНЫЙ JSONContent — снимок не должен измениться.
    const scene = snapped.chapters[0]!.scenes[0]!;
    (scene.content as { content: unknown[] }).content = [
      { type: "paragraph", content: [{ type: "text", text: "Version B" }] },
    ];
    const version = snapped.sceneVersions![0]!;
    const paragraph = (version.content as unknown as {
      content: Array<{ content: Array<{ text: string }> }>;
    }).content[0]!;
    expect(paragraph.content[0]!.text).toBe("Version A");
  });

  it("caps snapshots per scene at MAX_VERSIONS_PER_SCENE", () => {
    let p = makeProject();
    for (let i = 0; i < MAX_VERSIONS_PER_SCENE + 5; i++) {
      p = snapshotScene(p, "s1", { label: `rev ${i}` });
    }
    expect(p.sceneVersions).toHaveLength(MAX_VERSIONS_PER_SCENE);
    // Самая старая должна быть удалена — осталась "rev 5" как первая.
    const labels = p.sceneVersions!.map((v) => v.label);
    expect(labels[0]).toBe("rev 5");
    expect(labels[labels.length - 1]).toBe(`rev ${MAX_VERSIONS_PER_SCENE + 4}`);
  });

  it("listSceneVersions returns them sorted by createdAt ascending", () => {
    let p = makeProject();
    p = snapshotScene(p, "s1", { label: "a" });
    // Форсируем сдвиг времени для надёжности
    const list1 = listSceneVersions(p, "s1");
    p = snapshotScene(p, "s1", { label: "b" });
    const list2 = listSceneVersions(p, "s1");
    expect(list1).toHaveLength(1);
    expect(list2).toHaveLength(2);
    expect(list2[0]!.createdAt).toBeLessThanOrEqual(list2[1]!.createdAt);
  });
});

describe("revertSceneToVersion", () => {
  it("replaces scene content with the version and creates a backup snapshot", () => {
    let p = makeProject();
    p = snapshotScene(p, "s1", { label: "Before AI" });
    const versionId = p.sceneVersions![0]!.id;

    // Эмулируем AI-правку:
    p = {
      ...p,
      chapters: p.chapters.map((ch) => ({
        ...ch,
        scenes: ch.scenes.map((s) =>
          s.id === "s1"
            ? {
                ...s,
                content: {
                  type: "doc",
                  content: [
                    { type: "paragraph", content: [{ type: "text", text: "AI rewrite" }] },
                  ],
                },
              }
            : s,
        ),
      })),
    };

    const reverted = revertSceneToVersion(p, versionId);
    const scene = reverted.chapters[0]!.scenes[0]!;
    const paragraph = (scene.content as unknown as {
      content: Array<{ content: Array<{ text: string }> }>;
    }).content[0]!;
    expect(paragraph.content[0]!.text).toBe("Version A");
    // До отката был один снимок — после отката должен появиться ещё один ("Before revert").
    expect(reverted.sceneVersions!.length).toBe(2);
    expect(reverted.sceneVersions!.some((v) => v.label === "Before revert")).toBe(true);
  });

  it("returns project unchanged when version id is unknown", () => {
    const p = makeProject();
    const next = revertSceneToVersion(p, "nonexistent");
    expect(next).toBe(p);
  });
});
