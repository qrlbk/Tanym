export type ApiKeyProvider = "openai" | "anthropic" | "google";

export const DESKTOP_KEYCHAIN_SERVICE = "com.tanym.app.ai";

export type CloudApiKeyEnvVar =
  | "OPENAI_API_KEY"
  | "ANTHROPIC_API_KEY"
  | "GOOGLE_GENERATIVE_AI_API_KEY";

export const ENV_VAR_TO_PROVIDER: Record<CloudApiKeyEnvVar, ApiKeyProvider> = {
  OPENAI_API_KEY: "openai",
  ANTHROPIC_API_KEY: "anthropic",
  GOOGLE_GENERATIVE_AI_API_KEY: "google",
};

export function toCloudApiKeyEnvVar(value: string): CloudApiKeyEnvVar | null {
  if (
    value === "OPENAI_API_KEY" ||
    value === "ANTHROPIC_API_KEY" ||
    value === "GOOGLE_GENERATIVE_AI_API_KEY"
  ) {
    return value;
  }
  return null;
}
