/**
 * Codex-linking: pure-текстовый поиск упоминаний известных сущностей (персонажей,
 * локаций, элементов лора) в произвольном тексте.
 *
 * Используется:
 *  - ProseMirror decoration-плагином (roadmap фаза 5), чтобы подсвечивать имена
 *    в редакторе и показывать hover-карточку.
 *  - AI-контекстом: можно добавить список упомянутых сущностей к промпту.
 *
 * Требования:
 *  - Регистронезависимый поиск.
 *  - Пропускать совпадения внутри слова (matchingmouse → НЕ match Mouse).
 *  - Работать с русским и английским алфавитом (Unicode letter class).
 *  - Детерминированный порядок выдачи по `from asc`.
 *  - O(text * entities) — достаточно на сцену (десятки тысяч символов).
 */

export type CodexKind = "character" | "location" | "lore";

export type CodexEntity = {
  id: string;
  kind: CodexKind;
  /** Основное имя (в любой форме — ищем все алиасы вместе). */
  displayName: string;
  /** Дополнительные варианты написания (имя+фамилия, кличка, прозвище). */
  aliases?: string[];
};

export type CodexMention = {
  /** Индекс начала совпадения в тексте, inclusive. */
  from: number;
  /** Индекс конца совпадения, exclusive. */
  to: number;
  /** Совпавшая подстрока в оригинальном регистре. */
  matched: string;
  entity: CodexEntity;
  /** Какой алиас сработал — displayName или один из aliases. */
  alias: string;
};

/** Экранирование спец-символов regex. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Проверяем, что символ — не часть слова (буква или цифра).
 * Unicode-aware: русские буквы, ё, диакритика, апостроф в словах ("O'Brien").
 */
function isWordChar(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[\p{L}\p{N}_]/u.test(ch);
}

function allAliases(entity: CodexEntity): string[] {
  const set = new Set<string>();
  if (entity.displayName.trim()) set.add(entity.displayName.trim());
  for (const a of entity.aliases ?? []) {
    const trimmed = a.trim();
    if (trimmed) set.add(trimmed);
  }
  return [...set];
}

/**
 * Находит все упоминания codex-сущностей в тексте.
 * При пересечениях выигрывает более длинное совпадение; при равной длине —
 * то, что раньше в тексте.
 */
export function findCodexMentions(
  text: string,
  entities: readonly CodexEntity[],
): CodexMention[] {
  if (!text || entities.length === 0) return [];

  const raw: CodexMention[] = [];

  for (const entity of entities) {
    const aliases = allAliases(entity);
    for (const alias of aliases) {
      const pattern = new RegExp(escapeRegex(alias), "giu");
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        const from = m.index;
        const to = from + m[0].length;
        // Требуем границу слова с обеих сторон.
        const prev = from > 0 ? text[from - 1] : undefined;
        const next = to < text.length ? text[to] : undefined;
        if (isWordChar(prev) || isWordChar(next)) {
          continue;
        }
        raw.push({
          from,
          to,
          matched: m[0],
          entity,
          alias,
        });
      }
    }
  }

  // Сортируем и убираем пересечения (жадно оставляем более длинные, затем ранние).
  raw.sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from;
    return b.to - b.to === 0 ? b.to - a.to : b.to - a.to;
  });

  const result: CodexMention[] = [];
  let cursor = -1;
  for (const candidate of raw) {
    if (candidate.from < cursor) {
      // Уже покрыто предыдущим (более ранним и равно или более длинным) — проверяем длину
      const previous = result[result.length - 1];
      if (
        previous &&
        candidate.from >= previous.from &&
        candidate.to <= previous.to
      ) {
        continue;
      }
    }
    result.push(candidate);
    cursor = Math.max(cursor, candidate.to);
  }

  return result;
}

/** Группирует упоминания по сущности — удобно для сайдбара / счётчика. */
export function groupMentionsByEntity(
  mentions: readonly CodexMention[],
): Map<string, CodexMention[]> {
  const out = new Map<string, CodexMention[]>();
  for (const m of mentions) {
    const arr = out.get(m.entity.id) ?? [];
    arr.push(m);
    out.set(m.entity.id, arr);
  }
  return out;
}
