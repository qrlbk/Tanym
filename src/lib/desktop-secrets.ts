import { invoke } from "@tauri-apps/api/core";
import type { ApiKeyProvider } from "@/lib/ai/secret-store";
import { isTauri } from "@/lib/tauri-helpers";

type ApiKeyStatus = { hasKey: boolean };

export async function getDesktopApiKeyStatus(
  provider: ApiKeyProvider,
): Promise<ApiKeyStatus> {
  if (!isTauri()) return { hasKey: false };
  try {
    const status = await invoke<{ has_key: boolean }>("get_api_key_status", {
      provider,
    });
    return { hasKey: status.has_key === true };
  } catch {
    return { hasKey: false };
  }
}

export async function setDesktopApiKey(
  provider: ApiKeyProvider,
  value: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isTauri()) return { ok: false, message: "not_tauri" };
  try {
    await invoke("set_api_key", { provider, value });
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message: message || "set_failed" };
  }
}

export async function deleteDesktopApiKey(
  provider: ApiKeyProvider,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isTauri()) return { ok: false, message: "not_tauri" };
  try {
    await invoke("delete_api_key", { provider });
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message: message || "delete_failed" };
  }
}
