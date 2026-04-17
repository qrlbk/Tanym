import { describe, expect, it } from "vitest";
import {
  findCodexMentions,
  groupMentionsByEntity,
  type CodexEntity,
} from "./linking";

const ALTYN: CodexEntity = {
  id: "char-altyn",
  kind: "character",
  displayName: "Алтын",
  aliases: ["Алтын Султановна", "Аля"],
};

const KARAGANDA: CodexEntity = {
  id: "loc-karaganda",
  kind: "location",
  displayName: "Караганда",
  aliases: [],
};

const ORDEN: CodexEntity = {
  id: "lore-orden",
  kind: "lore",
  displayName: "Орден Луны",
  aliases: ["Орден"],
};

describe("findCodexMentions", () => {
  it("returns empty for empty text or entities", () => {
    expect(findCodexMentions("", [ALTYN])).toEqual([]);
    expect(findCodexMentions("Алтын вошла", [])).toEqual([]);
  });

  it("matches a Russian display name as a whole word", () => {
    const text = "Алтын вошла в комнату. Алтын остановилась.";
    const mentions = findCodexMentions(text, [ALTYN]);
    expect(mentions).toHaveLength(2);
    expect(mentions[0]!.from).toBe(0);
    expect(mentions[0]!.matched).toBe("Алтын");
    expect(mentions[0]!.entity.id).toBe("char-altyn");
  });

  it("is case-insensitive but preserves original match casing", () => {
    const text = "алтын и АЛТЫН смотрят друг на друга";
    const mentions = findCodexMentions(text, [ALTYN]);
    expect(mentions).toHaveLength(2);
    expect(mentions[0]!.matched).toBe("алтын");
    expect(mentions[1]!.matched).toBe("АЛТЫН");
  });

  it("does not match inside a larger word", () => {
    // "Алтыны" содержит "Алтын" но это другое слово (мн.ч.)
    const text = "Алтыны бегут по полю.";
    const mentions = findCodexMentions(text, [ALTYN]);
    expect(mentions).toHaveLength(0);
  });

  it("matches aliases in addition to display name", () => {
    const text = "Аля кивнула. Алтын Султановна встала.";
    const mentions = findCodexMentions(text, [ALTYN]);
    expect(mentions.map((m) => m.alias)).toEqual(["Аля", "Алтын Султановна"]);
  });

  it("prefers longer alias over shorter when both overlap", () => {
    // "Орден Луны" длиннее "Орден" — должен победить.
    const text = "Орден Луны восходит над городом.";
    const mentions = findCodexMentions(text, [ORDEN]);
    expect(mentions).toHaveLength(1);
    expect(mentions[0]!.matched).toBe("Орден Луны");
  });

  it("handles multiple entity kinds", () => {
    const text = "Алтын приехала в Караганду. Орден ждёт.";
    const mentions = findCodexMentions(text, [ALTYN, KARAGANDA, ORDEN]);
    // "Караганду" содержит "Караганда" внутри — не должен матчиться (разные слова).
    expect(mentions.map((m) => m.entity.id)).toEqual(["char-altyn", "lore-orden"]);
  });

  it("treats apostrophe as a word boundary (possessive 's)", () => {
    const OBRIEN: CodexEntity = {
      id: "char-obrien",
      kind: "character",
      displayName: "O'Brien",
    };
    const text = "Mr. O'Brien arrived. O'Brien's coat was red.";
    const mentions = findCodexMentions(text, [OBRIEN]);
    // И «O'Brien», и «O'Brien's» считаем валидными упоминаниями персонажа:
    // апостроф — не буква/цифра, значит граница слова соблюдена.
    expect(mentions).toHaveLength(2);
    expect(mentions.map((m) => m.matched)).toEqual(["O'Brien", "O'Brien"]);
  });

  it("returns results sorted by start position", () => {
    const text = "Орден, Алтын, Орден, Аля.";
    const mentions = findCodexMentions(text, [ORDEN, ALTYN]);
    const positions = mentions.map((m) => m.from);
    const sorted = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sorted);
  });

  it("groups by entity id", () => {
    const text = "Алтын, Аля, Алтын Султановна, Караганда.";
    const mentions = findCodexMentions(text, [ALTYN, KARAGANDA]);
    const groups = groupMentionsByEntity(mentions);
    expect(groups.get("char-altyn")).toHaveLength(3);
    expect(groups.get("loc-karaganda")).toHaveLength(1);
  });
});
