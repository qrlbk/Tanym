import { invoke } from "@tauri-apps/api/core";
import type { ApiKeyProvider } from "@/lib/ai/secret-store";
import { isTauri } from "@/lib/tauri-helpers";

type ApiKeyStatus = { hasKey: boolean };

export async function getDesktopApiKeyStatus(
  provider: ApiKeyProvider,
): Promise<ApiKeyStatus> {
  if (!isTauri()) return { hasKey: false };
  try {
    const res = await fetch("/api/ai/keychain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", provider }),
    });
    if (res.ok) {
      const data = (await res.json()) as { hasKey?: boolean };
      return { hasKey: data.hasKey === true };
    }
  } catch {
    // fallback to Tauri invoke path
  }
  try {
    const status = await invoke<{ has_key?: boolean; hasKey?: boolean }>(
      "get_api_key_status",
      {
      provider,
      },
    );
    return { hasKey: status.has_key === true || status.hasKey === true };
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
    const res = await fetch("/api/ai/keychain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set", provider, value }),
    });
    if (res.ok) return { ok: true };
    const text = await res.text();
    if (text) {
      return { ok: false, message: text };
    }
  } catch {
    // fallback to Tauri invoke path
  }
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
    const res = await fetch("/api/ai/keychain", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    if (res.ok) return { ok: true };
    const text = await res.text();
    if (text) {
      return { ok: false, message: text };
    }
  } catch {
    // fallback to Tauri invoke path
  }
  try {
    await invoke("delete_api_key", { provider });
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message: message || "delete_failed" };
  }
}
