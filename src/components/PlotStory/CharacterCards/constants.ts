import type { CharacterSectionKey } from "@/lib/project/types";

/**
 * Константы CharacterCardsPanel. Вынесены для возможности переиспользования
 * подпанелями (см. roadmap фаза 4 → `CharacterCards/`).
 */

export const CARD_SECTION_LABELS: Record<CharacterSectionKey, string> = {
  appearance: "Внешность",
  voice: "Голос",
  goals: "Цели",
  fears: "Страхи",
  arc: "Арка",
  notes: "Заметки",
};

/** Сколько сцен подряд без упоминания считается «долгим отсутствием». */
export const ABSENT_THRESHOLD_SCENES = 3;

export const IMPACT_REASON_LABEL: Record<string, string> = {
  name_role: "смена роли",
  core_bio: "биография",
  timeline: "таймлайн",
  relationships: "отношения",
  large_rewrite: "крупная правка",
};

export function characterInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function characterPreviewText(profile: {
  sections: Partial<Record<CharacterSectionKey, string>>;
}): string {
  const parts = [
    profile.sections.appearance,
    profile.sections.arc,
    profile.sections.notes,
  ]
    .filter(Boolean)
    .join(" ");
  return parts.slice(0, 120) + (parts.length > 120 ? "…" : "");
}
