/**
 * Shared prompts library (roadmap фаза 8).
 *
 * Пользователь может импортировать / экспортировать набор quick-commands
 * в JSON-формате, чтобы обмениваться с сообществом. Этот модуль — типы и
 * pure-валидация формата. UI-интеграция позже.
 */

export const SHARED_PROMPTS_FORMAT_VERSION = 1;

export type SharedPrompt = {
  id: string;
  label: string;
  prompt: string;
  /** Короткое описание — что делает и когда применять. */
  description?: string;
  /** Теги для фильтрации: rewrite, brainstorm, continuity, character, etc. */
  tags?: string[];
  /** Автор (свободный текст: никнейм, ссылка на профиль). */
  author?: string;
};

export type SharedPromptsPack = {
  formatVersion: number;
  /** Название набора. */
  name: string;
  description?: string;
  createdAt: string;
  prompts: SharedPrompt[];
};
