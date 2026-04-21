import type { ProviderOption } from "@/lib/ai/providers";
import {
  createModelWithApiKey,
  requiresProviderApiKey,
} from "@/lib/ai/providers";
import {
  DESKTOP_KEYCHAIN_SERVICE,
  ENV_VAR_TO_PROVIDER,
  toCloudApiKeyEnvVar,
} from "@/lib/ai/secret-store";

type KeytarLike = {
  getPassword: (service: string, account: string) => Promise<string | null>;
};

async function loadKeytarRuntime(): Promise<KeytarLike | null> {
  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const moduleName = ["key", "tar"].join("");
    const mod = require(moduleName);
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

let keytarLoader: () => Promise<KeytarLike | null> = loadKeytarRuntime;

export function __setKeytarLoaderForTests(
  loader: (() => Promise<KeytarLike | null>) | null,
) {
  keytarLoader = loader ?? loadKeytarRuntime;
}

async function readFromKeychain(envVar: string): Promise<string | null> {
  const typed = toCloudApiKeyEnvVar(envVar);
  if (!typed) return null;
  const provider = ENV_VAR_TO_PROVIDER[typed];
  const keytar = await keytarLoader();
  if (!keytar) return null;
  const value = await keytar.getPassword(DESKTOP_KEYCHAIN_SERVICE, provider);
  return value?.trim() ? value.trim() : null;
}

export async function getProviderSecret(envVar: string): Promise<string | null> {
  const fromEnv = process.env[envVar];
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim();
  }
  return readFromKeychain(envVar);
}

export async function resolveProviderModel(provider: ProviderOption) {
  if (!requiresProviderApiKey(provider)) {
    return {
      model: provider.createModel(),
      missingKeyEnvVar: null as string | null,
    };
  }
  const secret = await getProviderSecret(provider.envVar);
  if (!secret) {
    return {
      model: null,
      missingKeyEnvVar: provider.envVar,
    };
  }
  return {
    model: createModelWithApiKey(provider, secret),
    missingKeyEnvVar: null as string | null,
  };
}
