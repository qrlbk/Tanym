import { afterEach, describe, expect, it } from "vitest";
import { getProvider } from "@/lib/ai/providers";
import {
  __setKeytarLoaderForTests,
  getProviderSecret,
  resolveProviderModel,
} from "./secrets";

afterEach(() => {
  __setKeytarLoaderForTests(async () => null);
});

describe("AI secret resolver", () => {
  it("reads cloud key from keychain", async () => {
    __setKeytarLoaderForTests(async () => ({
      getPassword: async () => "keychain-key",
    }));
    const secret = await getProviderSecret("OPENAI_API_KEY");
    expect(secret).toBe("keychain-key");
  });

  it("does not use environment fallback", async () => {
    process.env.OPENAI_API_KEY = "env-key";
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
