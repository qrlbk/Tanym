import type { JSONContent } from "@tiptap/react";

/**
 * История версий:
 *  - 5: исходная (chapters / scenes / characterProfiles / pendingCharacterPatches).
 *  - 6: + storyBible (locations, lore, timeline), styleMemory, sceneVersions.
 *
 * Миграция: `src/lib/project/migrate-project.ts` → `migrateProjectToLatest`.
 */
export const PROJECT_FORMAT_VERSION = 6;

/** Editable RPG-style fields for a character card */
export type CharacterSectionKey =
  | "appearance"
  | "voice"
  | "goals"
  | "fears"
  | "arc"
  | "notes";

export type CharacterProfile = {
  id: string;
  displayName: string;
  aliases: string[];
  role: string | null;
  tags: string[];
  sections: Partial<Record<CharacterSectionKey, string>>;
  sourceEntityIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type PendingCharacterPatch = {
  id: string;
  profileId: string;
  sections: Partial<Record<CharacterSectionKey, string>>;
  role: string | null;
  confidence: number;
  reasons: string[];
  impact:
    | "normal"
    | "important";
  sourceSceneId: string | null;
  createdAt: number;
};

export type SceneEntity = {
  id: string;
  name: string;
  kind: "character" | "object" | "location" | "other";
};

export type SceneMetadata = {
  time?: string | null;
  place?: string | null;
};

export type StoryScene = {
  id: string;
  title: string;
  order: number;
  content: JSONContent;
  entities: SceneEntity[];
  metadata: SceneMetadata;
  updatedAt: string;
  /**
   * Short auto-generated synopsis used by the AI project context.
   * Null until summarisation runs for the scene.
   * See `src/lib/ai/summaries.ts`.
   */
  summary?: string | null;
  /** Timestamp (ms) used to decide when a summary needs refreshing. */
  summaryUpdatedAt?: number | null;
  /** Fingerprint of the scene text used to decide re-summarise. */
  summaryHash?: string | null;
};

export type StoryChapter = {
  id: string;
  title: string;
  order: number;
  scenes: StoryScene[];
};

/** Место в мире истории — Story Bible → Locations. */
export type LocationProfile = {
  id: string;
  name: string;
  /** Геофизический тип: город, комната, планета, корабль… */
  kind: string | null;
  /** Краткое описание — используется как контекст для AI. */
  description: string;
  /** Правила места (климат, политика, опасности). */
  rules: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

/** Запись лора (магия / технология / фракция / артефакт / организация). */
export type LoreEntry = {
  id: string;
  title: string;
  /** Категория: magic, tech, faction, artifact, organization, religion, … */
  category: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

/** Событие на таймлайне — привязано к сцене и/или абсолютной дате. */
export type TimelineEvent = {
  id: string;
  title: string;
  summary: string;
  /** ISO-дата или свободный текст («На 3-й день после…»). */
  when: string;
  /** Привязка к сцене, если применимо. */
  sceneId: string | null;
  /** Действующие лица (character ids). */
  participants: string[];
  /** Места (location ids). */
  locationIds: string[];
  /** Приоритет на таймлайне: plot-critical / background / foreshadow. */
  importance: "plot" | "background" | "foreshadow";
  createdAt: string;
  updatedAt: string;
};

/** Story Bible — агрегат: персонажей уже хранит `characterProfiles`. */
export type StoryBible = {
  locations: LocationProfile[];
  lore: LoreEntry[];
  timeline: TimelineEvent[];
};

/** Авторский голос — подмешивается в system prompt при генерации. */
export type StyleMemory = {
  /** Краткое описание голоса своими словами. */
  description: string;
  /** Примеры текста (≤5 коротких отрывков). */
  examples: string[];
  /** Явные правила: ритм, длина предложений, лексика. */
  rules: string[];
  /** Чего избегать: штампы, слова-паразиты. */
  avoid: string[];
  updatedAt: string;
};

/** Snapshot сцены — создаётся при каждом AI-applied edit. */
export type SceneVersion = {
  id: string;
  sceneId: string;
  /** Title, сохранённый на момент снимка (title редактируется отдельно). */
  title: string;
  content: JSONContent;
  createdAt: number;
  /** Короткое человеческое описание события: «AI rewrite», «Undo preview». */
  label: string;
  /** Опциональная ссылка на сообщение, вызвавшее правку. */
  source?: {
    kind: "ai" | "manual";
    /** id сообщения в чат-сессии (если kind=ai). */
    messageId?: string | null;
  };
};

export type StoryProject = {
  formatVersion: number;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  chapters: StoryChapter[];
  /** Writer-defined character sheets (independent of scene entities) */
  characterProfiles: CharacterProfile[];
  /** Auto-generated pending character updates that require approval. */
  pendingCharacterPatches?: PendingCharacterPatch[];
  /**
   * v6: Story Bible — места, лор и таймлайн.
   * Опционально для обратной совместимости с v5-проектами (мигратор добавит пустой).
   */
  storyBible?: StoryBible;
  /** v6: авторский голос. */
  styleMemory?: StyleMemory | null;
  /**
   * v6: история снимков сцен. Храним плоским списком, ограничиваем по N на сцену
   * (см. `src/stores/projectStore.ts`), чтобы не раздувать файл проекта.
   */
  sceneVersions?: SceneVersion[];
};
