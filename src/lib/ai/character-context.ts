import { factsForCharacter } from "@/lib/project/character-presence";
import type { PlotFact } from "@/lib/plot-index/story-extraction";
import type { CharacterProfile, CharacterSectionKey } from "@/lib/project/types";

const SECTION_LABELS: Record<CharacterSectionKey, string> = {
  appearance: "Внешность",
  voice: "Голос",
  goals: "Цели",
  fears: "Страхи",
  arc: "Арка",
  notes: "Заметки",
};

export type CharacterContextPayload = {
  characterId: string;
  summaryText: string;
};

/** Plain-text block for the model: card fields + matching plot facts */
export function buildCharacterContextSummary(
  profile: CharacterProfile,
  facts: PlotFact[],
  options?: { maxFacts?: number },
): CharacterContextPayload {
  const maxFacts = options?.maxFacts ?? 40;
  const rel = factsForCharacter(facts, profile.displayName, profile.aliases);
  const lines: string[] = [];
  lines.push(profile.displayName);
  if (profile.role?.trim()) lines.push(`Роль: ${profile.role}`);
  if (profile.aliases.length) lines.push(`Также: ${profile.aliases.join(", ")}`);
  if (profile.tags.length) lines.push(`Теги: ${profile.tags.join(", ")}`);
  (Object.keys(profile.sections) as CharacterSectionKey[]).forEach((key) => {
    const v = profile.sections[key];
    if (v?.trim()) lines.push(`${SECTION_LABELS[key]}: ${v}`);
  });
  if (rel.length) {
    lines.push("");
    lines.push("Факты из памяти сюжета:");
    for (const f of rel.slice(0, maxFacts)) {
      lines.push(`- ${f.attribute}: ${f.value}`);
    }
    if (rel.length > maxFacts) {
      lines.push(`… и ещё ${rel.length - maxFacts} фактов`);
    }
  }
  return {
    characterId: profile.id,
    summaryText: lines.join("\n"),
  };
}

/** Append extracted facts into the notes section (manual merge). */
export function mergeFactsIntoNotes(
  profile: CharacterProfile,
  facts: PlotFact[],
): string {
  const rel = factsForCharacter(facts, profile.displayName, profile.aliases);
  if (rel.length === 0) return profile.sections.notes ?? "";
  const block = rel.map((f) => `• ${f.attribute}: ${f.value}`).join("\n");
  const prev = profile.sections.notes?.trim() ?? "";
  const sep = prev ? "\n\n" : "";
  return `${prev}${sep}[Из памяти сюжета]\n${block}`;
}
