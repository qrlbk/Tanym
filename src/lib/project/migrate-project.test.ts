import { describe, expect, it } from "vitest";
import { migrateProjectToLatest } from "@/lib/project/migrate-project";
import { PROJECT_FORMAT_VERSION } from "@/lib/project/types";

describe("migrateProjectToLatest", () => {
  it("adds characterProfiles to legacy v2 projects", () => {
    const legacy = {
      formatVersion: 2,
      id: "p1",
      title: "T",
      createdAt: "a",
      updatedAt: "b",
      chapters: [
        {
          id: "c1",
          title: "Ch",
          order: 0,
          scenes: [
            {
              id: "s1",
              title: "Sc",
              order: 0,
              content: { type: "doc", content: [] },
              entities: [],
              metadata: {},
              updatedAt: "x",
            },
          ],
        },
      ],
    };
    const next = migrateProjectToLatest(legacy);
    expect(next.formatVersion).toBe(PROJECT_FORMAT_VERSION);
    expect(next.characterProfiles).toEqual([]);
  });

  it("returns default project for invalid input", () => {
    const next = migrateProjectToLatest(null);
    expect(next.chapters.length).toBeGreaterThan(0);
    expect(Array.isArray(next.characterProfiles)).toBe(true);
  });
});
