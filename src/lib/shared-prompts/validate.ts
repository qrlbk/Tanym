import {
  SHARED_PROMPTS_FORMAT_VERSION,
  type SharedPrompt,
  type SharedPromptsPack,
} from "./types";

export type ValidationResult =
  | { ok: true; pack: SharedPromptsPack }
  | { ok: false; error: string };

const MAX_PROMPT_LEN = 4000;
const MAX_LABEL_LEN = 80;
const MAX_PROMPTS = 200;

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function sanitizePrompt(raw: unknown): SharedPrompt | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!isString(o.id) || !isString(o.label) || !isString(o.prompt)) return null;
  if (!o.label.trim() || !o.prompt.trim()) return null;
  const label = o.label.slice(0, MAX_LABEL_LEN);
  const prompt = o.prompt.slice(0, MAX_PROMPT_LEN);
  return {
    id: o.id,
    label,
    prompt,
    description: isString(o.description) ? o.description.slice(0, 500) : undefined,
    tags: Array.isArray(o.tags)
      ? o.tags.filter(isString).slice(0, 12).map((t) => t.slice(0, 32))
      : undefined,
    author: isString(o.author) ? o.author.slice(0, 80) : undefined,
  };
}

/**
 * Валидация импортируемого JSON от пользователя / из internet. Никаких
 * выполняемых выражений не принимаем — это plain data. Лимиты нужны, чтобы
 * сообщество не импортировало мега-пакеты, ломающие UI.
 */
export function validateSharedPromptsPack(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Ожидался JSON-объект" };
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.formatVersion !== "number") {
    return { ok: false, error: "Отсутствует formatVersion" };
  }
  if (o.formatVersion !== SHARED_PROMPTS_FORMAT_VERSION) {
    return {
      ok: false,
      error: `Неподдерживаемая версия формата (${o.formatVersion}). Ожидалась ${SHARED_PROMPTS_FORMAT_VERSION}.`,
    };
  }
  if (!isString(o.name) || !o.name.trim()) {
    return { ok: false, error: "Поле name обязательно" };
  }
  if (!Array.isArray(o.prompts)) {
    return { ok: false, error: "Поле prompts должно быть массивом" };
  }
  const truncated = (o.prompts as unknown[]).slice(0, MAX_PROMPTS);
  const prompts = truncated
    .map(sanitizePrompt)
    .filter((x): x is SharedPrompt => x !== null);
  if (prompts.length === 0) {
    return { ok: false, error: "В пакете нет валидных prompts" };
  }
  const pack: SharedPromptsPack = {
    formatVersion: SHARED_PROMPTS_FORMAT_VERSION,
    name: o.name.slice(0, 120),
    description: isString(o.description) ? o.description.slice(0, 500) : undefined,
    createdAt: isString(o.createdAt) ? o.createdAt : new Date().toISOString(),
    prompts,
  };
  return { ok: true, pack };
}

/**
 * Сериализует пакет в pretty JSON для экспорта. Без user-input — безопасно.
 */
export function serializeSharedPromptsPack(pack: SharedPromptsPack): string {
  return JSON.stringify(pack, null, 2);
}
