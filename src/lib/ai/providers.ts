import { openai, createOpenAI } from "@ai-sdk/openai";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export type ProviderFamily = "openai" | "anthropic" | "google" | "local-ollama";

export type ProviderId =
  // OpenAI
  | "openai-gpt4o"
  | "openai-gpt4o-mini"
  | "openai-o3-mini"
  | "openai-gpt5"
  | "openai-o4-mini"
  // Anthropic
  | "anthropic-sonnet-4-5"
  | "anthropic-opus-4-1"
  // Google
  | "google-gemini-2-5-pro"
  | "google-gemini-2-5-flash"
  // Local (roadmap фаза 6: Ollama sidecar через Tauri)
  | "local-ollama-llama3"
  | "local-ollama-qwen2"
  | "local-ollama-custom";

/**
 * Базовый URL Ollama-сервера. По умолчанию — дефолт Ollama (http://localhost:11434).
 * В Tauri-сборке sidecar поднимет тот же порт; если пользователь запускает
 * Ollama вручную на другом хосте, переопределяется через OLLAMA_BASE_URL.
 */
export const OLLAMA_BASE_URL =
  (typeof process !== "undefined" && process.env?.OLLAMA_BASE_URL) ||
  "http://localhost:11434";

/** Кастомный OpenAI-совместимый клиент Ollama (u/v1 endpoint). */
const ollama = createOpenAI({
  baseURL: `${OLLAMA_BASE_URL.replace(/\/$/, "")}/v1`,
  apiKey: "ollama",
});

export interface ProviderOption {
  id: ProviderId;
  family: ProviderFamily;
  label: string;
  description: string;
  /** Hint for the router: high for long-context/reasoning, low for cheap drafting. */
  capability: "draft" | "default" | "reasoning" | "long-context";
  /** Name of the env var required on the server. */
  envVar: string;
  createModel: () => LanguageModel;
}

export const PROVIDERS: ProviderOption[] = [
  // ── OpenAI ─────────────────────────────────────────────────────────
  {
    id: "openai-gpt4o-mini",
    family: "openai",
    label: "GPT-4o mini",
    description: "Быстрая и дешёвая — хороша для обычного письма",
    capability: "draft",
    envVar: "OPENAI_API_KEY",
    createModel: () => openai("gpt-4o-mini"),
  },
  {
    id: "openai-gpt4o",
    family: "openai",
    label: "GPT-4o",
    description: "Сильная повседневная модель",
    capability: "default",
    envVar: "OPENAI_API_KEY",
    createModel: () => openai("gpt-4o"),
  },
  {
    id: "openai-gpt5",
    family: "openai",
    label: "GPT-5",
    description: "Флагман OpenAI — высокое качество редактуры",
    capability: "default",
    envVar: "OPENAI_API_KEY",
    createModel: () => openai("gpt-5"),
  },
  {
    id: "openai-o3-mini",
    family: "openai",
    label: "o3-mini",
    description: "Reasoning — для сложного планирования",
    capability: "reasoning",
    envVar: "OPENAI_API_KEY",
    createModel: () => openai("o3-mini"),
  },
  {
    id: "openai-o4-mini",
    family: "openai",
    label: "o4-mini",
    description: "Reasoning, быстрее o3",
    capability: "reasoning",
    envVar: "OPENAI_API_KEY",
    createModel: () => openai("o4-mini"),
  },
  // ── Anthropic ──────────────────────────────────────────────────────
  {
    id: "anthropic-sonnet-4-5",
    family: "anthropic",
    label: "Claude Sonnet 4.5",
    description: "Длинный контекст, отличное качество прозы",
    capability: "long-context",
    envVar: "ANTHROPIC_API_KEY",
    createModel: () => anthropic("claude-sonnet-4-5"),
  },
  {
    id: "anthropic-opus-4-1",
    family: "anthropic",
    label: "Claude Opus 4.1",
    description: "Самая глубокая модель для важных сцен",
    capability: "long-context",
    envVar: "ANTHROPIC_API_KEY",
    createModel: () => anthropic("claude-opus-4-1"),
  },
  // ── Google ─────────────────────────────────────────────────────────
  {
    id: "google-gemini-2-5-pro",
    family: "google",
    label: "Gemini 2.5 Pro",
    description: "1M контекст — можно передать весь роман",
    capability: "long-context",
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    createModel: () => google("gemini-2.5-pro"),
  },
  {
    id: "google-gemini-2-5-flash",
    family: "google",
    label: "Gemini 2.5 Flash",
    description: "Быстрая Gemini с длинным контекстом",
    capability: "draft",
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    createModel: () => google("gemini-2.5-flash"),
  },
  // ── Local Ollama (только desktop / self-hosted) ─────────────────────
  // Env-переменная `OLLAMA_BASE_URL` не является ключом — но нужна, чтобы
  // UI мог различать «настроен ли локальный бэкенд». Поле `envVar` ниже
  // используется только как hint для `isProviderKeyMissing`; для локальных
  // моделей мы его переопределяем на сентинел, который всегда «задан».
  {
    id: "local-ollama-llama3",
    family: "local-ollama",
    label: "Llama 3 (local)",
    description: "Локальная Llama 3 через Ollama — роман не уходит в облако",
    capability: "default",
    envVar: "OLLAMA_BASE_URL",
    createModel: () => ollama("llama3"),
  },
  {
    id: "local-ollama-qwen2",
    family: "local-ollama",
    label: "Qwen2.5 (local)",
    description: "Локальный Qwen2.5 через Ollama — хорошая поддержка русского",
    capability: "long-context",
    envVar: "OLLAMA_BASE_URL",
    createModel: () => ollama("qwen2.5"),
  },
  {
    id: "local-ollama-custom",
    family: "local-ollama",
    label: "Ollama — своя модель",
    description: "Использует модель, указанную в переменной OLLAMA_MODEL",
    capability: "default",
    envVar: "OLLAMA_BASE_URL",
    createModel: () =>
      ollama(
        (typeof process !== "undefined" && process.env?.OLLAMA_MODEL) || "llama3",
      ),
  },
];

export function getProvider(id: string): ProviderOption {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

export function isProviderKeyMissing(p: ProviderOption): boolean {
  // Guard server-side only; in the browser `process.env` is empty and we
  // fall through to the API response which returns a structured 503.
  if (typeof process === "undefined" || !process.env) return false;
  // Локальные Ollama-провайдеры не требуют API-ключа. Если базовый URL вручную
  // не переопределён — дефолт (localhost:11434) считаем «настроенным».
  if (p.family === "local-ollama") return false;
  return !process.env[p.envVar];
}

export function isLocalProvider(p: ProviderOption): boolean {
  return p.family === "local-ollama";
}

export function requiresProviderApiKey(p: ProviderOption): boolean {
  return p.family !== "local-ollama";
}

function modelIdForProvider(id: ProviderId): string {
  switch (id) {
    case "openai-gpt4o-mini":
      return "gpt-4o-mini";
    case "openai-gpt4o":
      return "gpt-4o";
    case "openai-gpt5":
      return "gpt-5";
    case "openai-o3-mini":
      return "o3-mini";
    case "openai-o4-mini":
      return "o4-mini";
    case "anthropic-sonnet-4-5":
      return "claude-sonnet-4-5";
    case "anthropic-opus-4-1":
      return "claude-opus-4-1";
    case "google-gemini-2-5-pro":
      return "gemini-2.5-pro";
    case "google-gemini-2-5-flash":
      return "gemini-2.5-flash";
    case "local-ollama-llama3":
      return "llama3";
    case "local-ollama-qwen2":
      return "qwen2.5";
    case "local-ollama-custom":
      return (
        (typeof process !== "undefined" && process.env?.OLLAMA_MODEL) || "llama3"
      );
  }
}

export function createModelWithApiKey(
  provider: ProviderOption,
  apiKey: string | null,
): LanguageModel {
  if (provider.family === "local-ollama") {
    return provider.createModel();
  }
  if (!apiKey) {
    return provider.createModel();
  }
  const modelId = modelIdForProvider(provider.id);
  switch (provider.family) {
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelId);
    default:
      return provider.createModel();
  }
}

/** Decide which provider to use for a given task when no explicit choice. */
export type RouterTask =
  | "chat" // default conversational
  | "draft" // quick writing
  | "planner" // reasoning / step planning
  | "long-read"; // pass the whole project as context

export function pickModelFor(
  task: RouterTask,
  preferredId?: string,
): ProviderOption {
  if (preferredId) {
    const found = PROVIDERS.find((p) => p.id === preferredId);
    if (found) return found;
  }
  switch (task) {
    case "draft":
      return (
        PROVIDERS.find((p) => p.capability === "draft") ?? PROVIDERS[0]
      );
    case "planner":
      return (
        PROVIDERS.find((p) => p.capability === "reasoning") ??
        PROVIDERS.find((p) => p.id === "openai-gpt4o") ??
        PROVIDERS[0]
      );
    case "long-read":
      return (
        PROVIDERS.find((p) => p.capability === "long-context") ??
        PROVIDERS.find((p) => p.id === "anthropic-sonnet-4-5") ??
        PROVIDERS[0]
      );
    case "chat":
    default:
      return getProvider(preferredId ?? "openai-gpt4o-mini");
  }
}
