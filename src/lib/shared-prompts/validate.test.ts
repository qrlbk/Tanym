import { describe, expect, it } from "vitest";
import { SHARED_PROMPTS_FORMAT_VERSION } from "./types";
import {
  serializeSharedPromptsPack,
  validateSharedPromptsPack,
} from "./validate";

const validPack = {
  formatVersion: SHARED_PROMPTS_FORMAT_VERSION,
  name: "Russian writer starter",
  description: "Базовый набор для русскоязычных авторов",
  createdAt: "2026-04-01",
  prompts: [
    {
      id: "tighten_dialog",
      label: "Ужать диалог",
      prompt: "Сделай диалог плотнее…",
      tags: ["rewrite", "dialog"],
    },
  ],
};

describe("validateSharedPromptsPack", () => {
  it("accepts a valid pack", () => {
    const r = validateSharedPromptsPack(validPack);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.pack.prompts).toHaveLength(1);
      expect(r.pack.prompts[0]!.label).toBe("Ужать диалог");
    }
  });

  it("rejects non-objects", () => {
    expect(validateSharedPromptsPack(null).ok).toBe(false);
    expect(validateSharedPromptsPack("oops").ok).toBe(false);
    expect(validateSharedPromptsPack(42).ok).toBe(false);
  });

  it("rejects wrong format version", () => {
    const r = validateSharedPromptsPack({ ...validPack, formatVersion: 999 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/версия/);
  });

  it("rejects empty name", () => {
    const r = validateSharedPromptsPack({ ...validPack, name: "" });
    expect(r.ok).toBe(false);
  });

  it("rejects pack without any valid prompts", () => {
    const r = validateSharedPromptsPack({
      ...validPack,
      prompts: [{ id: "x" }, { label: "no id or prompt" }],
    });
    expect(r.ok).toBe(false);
  });

  it("truncates overlong labels and prompts", () => {
    const r = validateSharedPromptsPack({
      ...validPack,
      prompts: [
        {
          id: "x",
          label: "a".repeat(500),
          prompt: "b".repeat(10_000),
        },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.pack.prompts[0]!.label.length).toBeLessThanOrEqual(80);
      expect(r.pack.prompts[0]!.prompt.length).toBeLessThanOrEqual(4000);
    }
  });

  it("caps number of prompts in a pack", () => {
    const many = Array.from({ length: 500 }, (_, i) => ({
      id: `p${i}`,
      label: `L${i}`,
      prompt: "some prompt",
    }));
    const r = validateSharedPromptsPack({ ...validPack, prompts: many });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.pack.prompts.length).toBeLessThanOrEqual(200);
  });

  it("serializes round-trip", () => {
    const r = validateSharedPromptsPack(validPack);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const json = serializeSharedPromptsPack(r.pack);
      const parsed = JSON.parse(json);
      const r2 = validateSharedPromptsPack(parsed);
      expect(r2.ok).toBe(true);
    }
  });
});
