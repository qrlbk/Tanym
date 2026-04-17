import { describe, expect, it } from "vitest";
import type { PlotFact } from "@/lib/plot-index/story-extraction";
import { createDefaultCharacterProfile } from "@/lib/project/defaults";
import { listEntityNamesMissingCards } from "@/lib/project/character-cards-from-facts";

describe("listEntityNamesMissingCards", () => {
  it("lists entity names from facts that have no card", () => {
    const facts: PlotFact[] = [
      {
        id: "1",
        entity: "Anna",
        entityType: "character",
        entityConfidence: 0.9,
        narrativeRole: null,
        attribute: "age",
        value: "30",
        chunkIds: [],
      },
      {
        id: "2",
        entity: "Boris",
        entityType: "character",
        entityConfidence: 0.9,
        narrativeRole: null,
        attribute: "job",
        value: "pilot",
        chunkIds: [],
      },
    ];
    const anna = createDefaultCharacterProfile("Anna");
    const missing = listEntityNamesMissingCards(facts, [anna]);
    expect(missing).toEqual(["Boris"]);
  });

  it("matches aliases as covered", () => {
    const facts: PlotFact[] = [
      {
        id: "1",
        entity: "Аня",
        entityType: "character",
        entityConfidence: 0.9,
        narrativeRole: null,
        attribute: "x",
        value: "y",
        chunkIds: [],
      },
    ];
    const p = createDefaultCharacterProfile("Главная");
    p.aliases = ["Аня"];
    expect(listEntityNamesMissingCards(facts, [p])).toEqual([]);
  });

  it("ignores non-character entities", () => {
    const facts: PlotFact[] = [
      {
        id: "1",
        entity: "Ключ",
        entityType: "object",
        entityConfidence: 0.92,
        narrativeRole: "clue",
        attribute: "location",
        value: "подвал",
        chunkIds: [],
      },
    ];
    expect(listEntityNamesMissingCards(facts, [])).toEqual([]);
  });
});
