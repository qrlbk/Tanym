import { describe, expect, it, beforeEach } from "vitest";
import { executeToolCall } from "./client-tools";
import { useProjectStore } from "@/stores/projectStore";
import type { StoryProject } from "@/lib/project/types";

function mkProject(): StoryProject {
  const now = new Date().toISOString();
  return {
    formatVersion: 4,
    id: "p-1",
    title: "Test",
    createdAt: now,
    updatedAt: now,
    chapters: [
      {
        id: "c-1",
        title: "Глава 1",
        order: 0,
        scenes: [
          {
            id: "s-1",
            title: "Пролог",
            order: 0,
            content: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  attrs: { blockId: "b-1" },
                  content: [{ type: "text", text: "Алтын вошла." }],
                },
              ],
            },
            entities: [],
            metadata: {},
            updatedAt: now,
          },
          {
            id: "s-2",
            title: "Ссора",
            order: 1,
            content: { type: "doc", content: [{ type: "paragraph" }] },
            entities: [],
            metadata: {},
            updatedAt: now,
          },
        ],
      },
    ],
    characterProfiles: [
      {
        id: "char-1",
        displayName: "Алтын",
        aliases: [],
        role: "protagonist",
        tags: [],
        sections: { appearance: "Высокая" },
        sourceEntityIds: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

beforeEach(() => {
  useProjectStore.getState().setProject(mkProject());
});

describe("cross-scene tools", () => {
  it("list_scenes returns canonical refs for every scene", async () => {
    const raw = await executeToolCall("list_scenes", {}, null);
    expect(typeof raw).toBe("string");
    const parsed = JSON.parse(raw as string);
    expect(parsed.count).toBe(2);
    expect(parsed.scenes[0].sceneRef).toBe("scene:s-1");
    expect(parsed.scenes[1].sceneRef).toBe("scene:s-2");
  });

  it("read_scene returns text and metadata", async () => {
    const raw = await executeToolCall(
      "read_scene",
      { sceneRef: "scene:s-1" },
      null,
    );
    const parsed = JSON.parse(raw as string);
    expect(parsed.sceneTitle).toBe("Пролог");
    expect(parsed.text).toMatch(/Алтын/);
  });

  it("read_scene_outline returns headings with blockRef", async () => {
    // prepend a heading into s-1
    useProjectStore.getState().setSceneContent("s-1", {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2, blockId: "heading-1" },
          content: [{ type: "text", text: "Часть 1" }],
        },
        {
          type: "paragraph",
          attrs: { blockId: "b-1" },
          content: [{ type: "text", text: "Алтын вошла." }],
        },
      ],
    });
    const raw = await executeToolCall(
      "read_scene_outline",
      { sceneRef: "scene:s-1" },
      null,
    );
    const parsed = JSON.parse(raw as string);
    expect(parsed.headings.length).toBe(1);
    expect(parsed.headings[0].blockRef).toBe("scene:s-1#block:heading-1");
  });

  it("read_block extracts a single block by blockRef", async () => {
    const raw = await executeToolCall(
      "read_block",
      { blockRef: "scene:s-1#block:b-1" },
      null,
    );
    const parsed = JSON.parse(raw as string);
    expect(parsed.text).toBe("Алтын вошла.");
    expect(parsed.type).toBe("paragraph");
  });

  it("edit_scene replaces a scene body from plain text", async () => {
    await executeToolCall(
      "edit_scene",
      {
        sceneRef: "scene:s-2",
        op: "replace",
        text: "Первый абзац.\n\nВторой абзац.",
      },
      null,
    );
    const scene = useProjectStore.getState().getSceneById("s-2");
    const paragraphs = (scene?.content.content as Array<{
      type?: string;
      content?: Array<{ text?: string }>;
    }>) ?? [];
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0].content?.[0].text).toBe("Первый абзац.");
    expect(paragraphs[1].content?.[0].text).toBe("Второй абзац.");
  });

  it("edit_block rewrites block text preserving type", async () => {
    await executeToolCall(
      "edit_block",
      {
        blockRef: "scene:s-1#block:b-1",
        newText: "Алтын ушла.",
      },
      null,
    );
    const scene = useProjectStore.getState().getSceneById("s-1");
    const first = (scene?.content.content as Array<{
      type?: string;
      content?: Array<{ text?: string }>;
    }>)?.[0];
    expect(first?.type).toBe("paragraph");
    expect(first?.content?.[0].text).toBe("Алтын ушла.");
  });

  it("create_scene and create_chapter mutate project structure", async () => {
    const raw1 = await executeToolCall(
      "create_scene",
      { chapterRef: "chapter:c-1", title: "Новая" },
      null,
    );
    const parsed = JSON.parse(raw1 as string);
    expect(parsed.ok).toBe(true);
    const project = useProjectStore.getState().project!;
    expect(project.chapters[0].scenes.some((s) => s.title === "Новая")).toBe(true);

    const raw2 = await executeToolCall(
      "create_chapter",
      { title: "Глава 2" },
      null,
    );
    const parsed2 = JSON.parse(raw2 as string);
    expect(parsed2.ok).toBe(true);
    const after = useProjectStore.getState().project!;
    expect(after.chapters.length).toBe(2);
  });

  it("move_scene relocates a scene to another chapter", async () => {
    await executeToolCall("create_chapter", { title: "Глава 2" }, null);
    const project = useProjectStore.getState().project!;
    const chapter2 = project.chapters[1];

    await executeToolCall(
      "move_scene",
      { sceneRef: "scene:s-2", toChapterRef: `chapter:${chapter2.id}`, position: 0 },
      null,
    );
    const after = useProjectStore.getState().project!;
    expect(after.chapters[0].scenes.some((s) => s.id === "s-2")).toBe(false);
    expect(after.chapters[1].scenes[0].id).toBe("s-2");
  });

  it("list_characters returns the project character roster", async () => {
    const raw = await executeToolCall("list_characters", {}, null);
    const parsed = JSON.parse(raw as string);
    expect(parsed.count).toBe(1);
    expect(parsed.characters[0].displayName).toBe("Алтын");
  });

  it("read_character returns a character profile", async () => {
    const raw = await executeToolCall(
      "read_character",
      { characterRef: "character:char-1" },
      null,
    );
    const parsed = JSON.parse(raw as string);
    expect(parsed.displayName).toBe("Алтын");
    expect(parsed.sections.appearance).toBe("Высокая");
  });

  it("jump_to_scene opens the scene in a tab by project ref", async () => {
    const raw = await executeToolCall(
      "jump_to_scene",
      { sceneRef: "scene:s-2" },
      null,
    );
    const parsed = JSON.parse(raw as string);
    expect(parsed.ok).toBe(true);
    expect(parsed.sceneId).toBe("s-2");
  });
});
