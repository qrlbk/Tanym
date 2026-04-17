import { describe, expect, it } from "vitest";
import {
  buildProjectContextPayload,
  renderProjectContextForSystem,
} from "./project-context";
import type { StoryProject } from "@/lib/project/types";

function mkProject(): StoryProject {
  const now = new Date().toISOString();
  return {
    formatVersion: 4,
    id: "project-x",
    title: "Роман",
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
                  content: [{ type: "text", text: "Алтын вошла в комнату." }],
                },
              ],
            },
            entities: [],
            metadata: {},
            updatedAt: now,
            summary: "Алтын встречает отца.",
          },
        ],
      },
      {
        id: "c-2",
        title: "Глава 2",
        order: 1,
        scenes: [
          {
            id: "s-2",
            title: "Ссора",
            order: 0,
            content: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Громкий спор в ночи." }],
                },
              ],
            },
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
        aliases: ["Тыным"],
        role: "protagonist",
        tags: [],
        sections: {},
        sourceEntityIds: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

describe("project-context", () => {
  it("builds a payload with canonical refs and counts", () => {
    const payload = buildProjectContextPayload(mkProject(), "s-2");
    expect(payload).not.toBeNull();
    expect(payload!.chapterCount).toBe(2);
    expect(payload!.sceneCount).toBe(2);
    expect(payload!.characterCount).toBe(1);
    expect(payload!.chapters[0].scenes[0].sceneRef).toBe("scene:s-1");
    expect(payload!.chapters[1].scenes[0].isActive).toBe(true);
    expect(payload!.characters[0].ref).toBe("character:char-1");
  });

  it("renders a system block including outline, characters and synopses", () => {
    const payload = buildProjectContextPayload(mkProject(), "s-1")!;
    const text = renderProjectContextForSystem(payload, 40_000);
    expect(text).toMatch(/Project context/);
    expect(text).toMatch(/scene:s-1/);
    expect(text).toMatch(/\[ACTIVE\]/);
    expect(text).toMatch(/Алтын/);
    expect(text).toMatch(/Пролог/);
  });

  it("fits within the character budget", () => {
    const payload = buildProjectContextPayload(mkProject(), null)!;
    const text = renderProjectContextForSystem(payload, 500);
    // Budget is approximate; after dropping optional sections the remaining
    // head-of-block + hard truncation fits within ~10% of the requested cap.
    expect(text.length).toBeLessThanOrEqual(550);
  });

  it("returns null for missing project", () => {
    expect(buildProjectContextPayload(null, null)).toBeNull();
  });
});
