import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type ProviderId = "openai-gpt4o" | "openai-gpt4o-mini" | "openai-o3-mini";

export interface ProviderOption {
  id: ProviderId;
  label: string;
  description: string;
  createModel: () => LanguageModel;
}

export const PROVIDERS: ProviderOption[] = [
  {
    id: "openai-gpt4o",
    label: "GPT-4o",
    description: "Самая умная — лучшее качество, дороже",
    createModel: () => openai("gpt-4o"),
  },
  {
    id: "openai-gpt4o-mini",
    label: "GPT-4o mini",
    description: "Быстрая и дешёвая, хорошее качество",
    createModel: () => openai("gpt-4o-mini"),
  },
  {
    id: "openai-o3-mini",
    label: "o3-mini",
    description: "Рассуждающая модель — для сложных задач",
    createModel: () => openai("o3-mini"),
  },
];

export function getProvider(id: string): ProviderOption {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}
