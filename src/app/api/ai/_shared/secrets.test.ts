import { afterEach, describe, expect, it } from "vitest";
import { getProvider } from "@/lib/ai/providers";
import {
  __setKeytarLoaderForTests,
  getProviderSecret,
  resolveProviderModel,
} from "./secrets";

const ORIGINAL_OPENAI = process.env.OPENAI_API_KEY;

afterEach(() => {
  if (typeof ORIGINAL_OPENAI === "string") {
    process.env.OPENAI_API_KEY = ORIGINAL_OPENAI;
  } else {
    delete process.env.OPENAI_API_KEY;
  }
  __setKeytarLoaderForTests(async () => null);
});

describe("AI secret resolver", () => {
  it("uses environment variable first", async () => {
    process.env.OPENAI_API_KEY = "  env-key  ";
    __setKeytarLoaderForTests(async () => ({
      getPassword: async () => "keychain-key",
    }));
    const secret = await getProviderSecret("OPENAI_API_KEY");
    expect(secret).toBe("env-key");
  });

  it("falls back to keychain when env is absent", async () => {
    delete process.env.OPENAI_API_KEY;
    __setKeytarLoaderForTests(async () => ({
      getPassword: async () => "keychain-key",
    }));
    const secret = await getProviderSecret("OPENAI_API_KEY");
    expect(secret).toBe("keychain-key");
  });

  it("returns missing key marker for cloud provider", async () => {
    delete process.env.OPENAI_API_KEY;
    __setKeytarLoaderForTests(async () => null);
    const provider = getProvider("openai-gpt4o-mini");
    const resolved = await resolveProviderModel(provider);
    expect(resolved.model).toBeNull();
    expect(resolved.missingKeyEnvVar).toBe("OPENAI_API_KEY");
  });

  it("does not require API key for local provider", async () => {
    const provider = getProvider("local-ollama-llama3");
    const resolved = await resolveProviderModel(provider);
    expect(resolved.model).toBeTruthy();
    expect(resolved.missingKeyEnvVar).toBeNull();
  });
});
