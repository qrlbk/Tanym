import { describe, expect, it } from "vitest";
import { migrateLegacyDocToProject } from "@/lib/project/migrate-legacy-to-project";

describe("migrateLegacyDocToProject", () => {
  it("creates chapters and scenes from headings", () => {
    const legacy = {
      type: "doc",
      content: [
        {
          type: "docPage",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: "Chapter A" }],
            },
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Scene A1" }],
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "Hello world" }],
            },
          ],
        },
      ],
    };
    const project = migrateLegacyDocToProject(legacy);
    expect(project.chapters).toHaveLength(1);
    expect(project.chapters[0]?.title).toBe("Chapter A");
    expect(project.chapters[0]?.scenes).toHaveLength(1);
    expect(project.chapters[0]?.scenes[0]?.title).toBe("Scene A1");
  });

  it("creates default content when legacy document is empty", () => {
    const project = migrateLegacyDocToProject({ type: "doc", content: [] });
    expect(project.chapters.length).toBeGreaterThan(0);
    expect(project.chapters[0]?.scenes.length).toBeGreaterThan(0);
  });
});
