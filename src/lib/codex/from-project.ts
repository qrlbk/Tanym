import type { StoryProject } from "@/lib/project/types";
import type { CodexEntity } from "./linking";

/**
 * Собирает codex-сущности из StoryProject:
 *  - персонажи из `characterProfiles`
 *  - локации из `storyBible.locations` (v6+)
 *  - лор из `storyBible.lore` (v6+)
 *
 * Возвращает плоский массив, готовый для `findCodexMentions`.
 */
export function collectCodexEntitiesFromProject(
  project: StoryProject | null,
): CodexEntity[] {
  if (!project) return [];
  const out: CodexEntity[] = [];

  for (const char of project.characterProfiles) {
    if (!char.displayName.trim()) continue;
    out.push({
      id: char.id,
      kind: "character",
      displayName: char.displayName,
      aliases: char.aliases,
    });
  }

  const bible = project.storyBible;
  if (bible) {
    for (const loc of bible.locations) {
      if (!loc.name.trim()) continue;
      out.push({
        id: loc.id,
        kind: "location",
        displayName: loc.name,
        // Для локаций нет отдельных aliases в v6; если будут добавлены — сюда.
      });
    }
    for (const lore of bible.lore) {
      if (!lore.title.trim()) continue;
      out.push({
        id: lore.id,
        kind: "lore",
        displayName: lore.title,
      });
    }
  }

  return out;
}
