import { describe, expect, it } from "vitest";
import {
  findBlockInSceneContent,
  listScenesInOrder,
  makeBlockRef,
  makeSceneRef,
  parseSceneRef,
  resolveScene,
  sceneContentToPlainText,
} from "./addressing";
import type { StoryProject } from "@/lib/project/types";

function sampleProject(): StoryProject {
  const now = new Date().toISOString();
  return {
    formatVersion: 3,
    id: "project-1",
    title: "Demo",
    createdAt: now,
    updatedAt: now,
    chapters: [
      {
        id: "chapter-a",
        title: "Глава 1",
        order: 0,
        scenes: [
          {
            id: "scene-a",
            title: "Первая сцена",
            order: 0,
            content: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  attrs: { blockId: "blk-1" },
                  content: [{ type: "text", text: "Hello world" }],
                },
                {
                  type: "heading",
                  attrs: { level: 2, blockId: "blk-heading" },
                  content: [{ type: "text", text: "Part" }],
                },
              ],
            },
            entities: [],
            metadata: {},
            updatedAt: now,
          },
          {
            id: "scene-b",
            title: "Вторая",
            order: 1,
            content: { type: "doc", content: [{ type: "paragraph" }] },
            entities: [],
            metadata: {},
            updatedAt: now,
          },
        ],
      },
    ],
    characterProfiles: [],
  };
}

describe("addressing", () => {
  it("parses scene refs (with and without prefix, with block)", () => {
    expect(parseSceneRef("scene:abc").sceneId).toBe("abc");
    expect(parseSceneRef("abc").sceneId).toBe("abc");
    const { sceneId, blockId } = parseSceneRef("scene:abc#block:xyz");
    expect(sceneId).toBe("abc");
    expect(blockId).toBe("xyz");
  });

  it("builds scene and block refs", () => {
    expect(makeSceneRef("abc")).toBe("scene:abc");
    expect(makeBlockRef("abc", "blk-1")).toBe("scene:abc#block:blk-1");
  });

  it("resolves scene by UUID, with or without prefix", () => {
    const project = sampleProject();
    expect(resolveScene(project, "scene:scene-a")?.scene.id).toBe("scene-a");
    expect(resolveScene(project, "scene-a")?.scene.id).toBe("scene-a");
    expect(resolveScene(project, "scene:scene-b#block:anything")?.scene.id).toBe("scene-b");
  });

  it("resolves legacy outline ids (scene-N index)", () => {
    const project = sampleProject();
    expect(resolveScene(project, "scene-0")?.scene.id).toBe("scene-a");
    expect(resolveScene(project, "scene-1")?.scene.id).toBe("scene-b");
  });

  it("returns null for unknown refs", () => {
    expect(resolveScene(sampleProject(), "scene:unknown")).toBeNull();
  });

  it("enumerates project scenes in reading order", () => {
    const order = listScenesInOrder(sampleProject()).map((e) => e.scene.id);
    expect(order).toEqual(["scene-a", "scene-b"]);
  });

  it("finds blocks by blockId inside scene JSON", () => {
    const project = sampleProject();
    const scene = project.chapters[0].scenes[0];
    const hit = findBlockInSceneContent(scene.content, "blk-heading");
    expect(hit?.node.type).toBe("heading");
  });

  it("extracts plain text from scene JSON", () => {
    const project = sampleProject();
    const text = sceneContentToPlainText(project.chapters[0].scenes[0].content);
    expect(text).toContain("Hello world");
    expect(text).toContain("Part");
  });
});
