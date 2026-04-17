import { describe, expect, it } from "vitest";
import { migrateProjectToLatest } from "./migrate-project";
import { PROJECT_FORMAT_VERSION } from "./types";

/**
 * Миграция v5 → v6: добавляются storyBible, styleMemory, sceneVersions.
 * Старые проекты без этих полей должны получить пустые/null значения.
 */
describe("migrateProjectToLatest — v5 to v6", () => {
  const minimalV5 = {
    formatVersion: 5,
    id: "p1",
    title: "Test project",
    createdAt: "2020-01-01",
    updatedAt: "2020-01-02",
    chapters: [
      {
        id: "c1",
        title: "Chapter 1",
        order: 0,
        scenes: [],
      },
    ],
    characterProfiles: [],
  };

  it("upgrades formatVersion to current", () => {
    const out = migrateProjectToLatest(minimalV5);
    expect(out.formatVersion).toBe(PROJECT_FORMAT_VERSION);
    expect(PROJECT_FORMAT_VERSION).toBeGreaterThanOrEqual(6);
  });

  it("adds empty StoryBible when missing", () => {
    const out = migrateProjectToLatest(minimalV5);
    expect(out.storyBible).toBeDefined();
    expect(out.storyBible!.locations).toEqual([]);
    expect(out.storyBible!.lore).toEqual([]);
    expect(out.storyBible!.timeline).toEqual([]);
  });

  it("defaults styleMemory to null on v5", () => {
    const out = migrateProjectToLatest(minimalV5);
    expect(out.styleMemory).toBeNull();
  });

  it("defaults sceneVersions to empty array", () => {
    const out = migrateProjectToLatest(minimalV5);
    expect(Array.isArray(out.sceneVersions)).toBe(true);
    expect(out.sceneVersions).toEqual([]);
  });

  it("normalises LocationProfile entries", () => {
    const raw = {
      ...minimalV5,
      storyBible: {
        locations: [
          {
            id: "loc1",
            name: "Kingdom of Orel",
            kind: "kingdom",
            description: "Cold northern realm",
            rules: "Monarchy",
            tags: ["north", "cold"],
          },
          // Должен быть отфильтрован — нет name
          { id: "loc2" },
        ],
        lore: [],
        timeline: [],
      },
    };
    const out = migrateProjectToLatest(raw);
    expect(out.storyBible!.locations).toHaveLength(1);
    expect(out.storyBible!.locations[0]!.name).toBe("Kingdom of Orel");
    expect(out.storyBible!.locations[0]!.tags).toEqual(["north", "cold"]);
    expect(out.storyBible!.locations[0]!.createdAt).toBeTruthy();
  });

  it("normalises TimelineEvent importance to 'plot' by default", () => {
    const raw = {
      ...minimalV5,
      storyBible: {
        locations: [],
        lore: [],
        timeline: [
          {
            id: "ev1",
            title: "Coronation",
            summary: "",
            when: "Year 1",
            sceneId: "s-unknown",
            participants: [],
            locationIds: [],
            importance: "unknown_value",
          },
        ],
      },
    };
    const out = migrateProjectToLatest(raw);
    expect(out.storyBible!.timeline).toHaveLength(1);
    expect(out.storyBible!.timeline[0]!.importance).toBe("plot");
  });

  it("keeps valid styleMemory", () => {
    const raw = {
      ...minimalV5,
      styleMemory: {
        description: "terse, active voice",
        examples: ["Night fell.", "He ran."],
        rules: ["No adverbs."],
        avoid: ["suddenly"],
      },
    };
    const out = migrateProjectToLatest(raw);
    expect(out.styleMemory).not.toBeNull();
    expect(out.styleMemory!.description).toBe("terse, active voice");
    expect(out.styleMemory!.examples).toHaveLength(2);
    expect(out.styleMemory!.rules).toEqual(["No adverbs."]);
  });

  it("filters out malformed scene versions", () => {
    const raw = {
      ...minimalV5,
      sceneVersions: [
        {
          id: "v1",
          sceneId: "s1",
          title: "Old scene",
          content: { type: "doc", content: [] },
          createdAt: 1700000000000,
          label: "AI rewrite",
        },
        { id: "bad", sceneId: "s1" },
      ],
    };
    const out = migrateProjectToLatest(raw);
    expect(out.sceneVersions).toHaveLength(1);
    expect(out.sceneVersions![0]!.label).toBe("AI rewrite");
  });
});
