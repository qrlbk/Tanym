import { describe, expect, it } from "vitest";
import { createDefaultCharacterProfile } from "@/lib/project/defaults";
import {
  classifyCharacterPatchImpact,
  type CharacterDraftPatch,
} from "./character-auto-policy";

describe("classifyCharacterPatchImpact", () => {
  it("marks role change as important", () => {
    const profile = createDefaultCharacterProfile("Артур");
    const patch: CharacterDraftPatch = {
      profileId: profile.id,
      sections: {},
      role: "антагонист",
      confidence: 0.8,
      reasons: [],
      generatedAt: Date.now(),
    };
    const result = classifyCharacterPatchImpact(profile, patch);
    expect(result.impact).toBe("important");
    expect(result.reasons).toContain("name_role");
  });

  it("keeps normal impact for small neutral changes", () => {
    const profile = createDefaultCharacterProfile("Артур");
    profile.sections.notes = "спокоен";
    const patch: CharacterDraftPatch = {
      profileId: profile.id,
      sections: { notes: "спокоен и собран" },
      role: null,
      confidence: 0.7,
      reasons: [],
      generatedAt: Date.now(),
    };
    const result = classifyCharacterPatchImpact(profile, patch);
    expect(result.impact).toBe("normal");
  });
});
