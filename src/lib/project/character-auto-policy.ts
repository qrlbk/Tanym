import type {
  CharacterProfile,
  CharacterSectionKey,
} from "@/lib/project/types";

export type CharacterPatchImpactReason =
  | "name_role"
  | "core_bio"
  | "timeline"
  | "relationships"
  | "large_rewrite";

export type CharacterDraftPatch = {
  profileId: string;
  sections: Partial<Record<CharacterSectionKey, string>>;
  role: string | null;
  confidence: number;
  reasons: string[];
  generatedAt: number;
};

export type CharacterPatchImpact = {
  impact: "normal" | "important";
  reasons: CharacterPatchImpactReason[];
  largeRewriteSections: CharacterSectionKey[];
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function changeRatio(before: string, after: string): number {
  const b = normalizeText(before);
  const a = normalizeText(after);
  if (!b && !a) return 0;
  const denom = Math.max(1, b.length);
  let samePrefix = 0;
  while (samePrefix < b.length && samePrefix < a.length && b[samePrefix] === a[samePrefix]) {
    samePrefix += 1;
  }
  const delta = Math.abs(a.length - b.length) + (b.length - samePrefix);
  return Math.max(0, Math.min(1, delta / denom));
}

export function classifyCharacterPatchImpact(
  profile: CharacterProfile,
  patch: CharacterDraftPatch,
): CharacterPatchImpact {
  const reasons: CharacterPatchImpactReason[] = [];
  const largeRewriteSections: CharacterSectionKey[] = [];

  if ((patch.role ?? null) !== (profile.role ?? null)) {
    reasons.push("name_role");
  }

  const sectionEntries = Object.entries(patch.sections) as Array<
    [CharacterSectionKey, string]
  >;
  for (const [section, nextValue] of sectionEntries) {
    const prev = profile.sections[section] ?? "";
    const ratio = changeRatio(prev, nextValue);
    const prevLen = normalizeText(prev).length;
    const nextLen = normalizeText(nextValue).length;
    if (Math.max(prevLen, nextLen) >= 40 && ratio >= 0.3) {
      largeRewriteSections.push(section);
    }

    const text = normalizeText(nextValue);
    if (
      /родил|происхожд|детств|семь|статус|биограф|возраст|identity|origin|background/.test(
        text,
      )
    ) {
      reasons.push("core_bio");
    }
    if (/вчера|сегодня|завтра|до|после|midnight|timeline|утром|ночью/.test(text)) {
      reasons.push("timeline");
    }
    if (/друг|враг|семья|любов|ally|enemy|family|relationship/.test(text)) {
      reasons.push("relationships");
    }
  }

  if (largeRewriteSections.length > 0) reasons.push("large_rewrite");
  const unique = Array.from(new Set(reasons));
  return {
    impact: unique.length > 0 ? "important" : "normal",
    reasons: unique,
    largeRewriteSections,
  };
}
