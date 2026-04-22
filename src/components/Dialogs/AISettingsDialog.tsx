"use client";

import { useState } from "react";
import { KeyRound, Trash2, X } from "lucide-react";
import { UI_COLORS } from "@/lib/theme/colors";
import { isTauri } from "@/lib/tauri-helpers";
import {
  deleteDesktopApiKey,
  getDesktopApiKeyStatus,
  setDesktopApiKey,
} from "@/lib/desktop-secrets";
import type { ApiKeyProvider } from "@/lib/ai/secret-store";
import { useToastStore } from "@/stores/toastStore";

type ProviderConfig = {
  id: ApiKeyProvider;
  label: string;
  hint: string;
};

const PROVIDERS: ProviderConfig[] = [
  { id: "openai", label: "OpenAI", hint: "Для моделей GPT / o-серии" },
  { id: "anthropic", label: "Anthropic", hint: "Для моделей Claude" },
  { id: "google", label: "Google", hint: "Для моделей Gemini" },
];

export default function AISettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pushToast = useToastStore((s) => s.push);
  const [values, setValues] = useState<Record<ApiKeyProvider, string>>({
    openai: "",
    anthropic: "",
    google: "",
  });
  const [hasKey, setHasKey] = useState<Record<ApiKeyProvider, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
  });
  const [loading, setLoading] = useState<Record<ApiKeyProvider, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
  });

  const desktop = isTauri();

  async function refreshStatuses() {
    const entries = await Promise.all(
      PROVIDERS.map(async ({ id }) => {
        const status = await getDesktopApiKeyStatus(id);
        return [id, status.hasKey] as const;
      }),
    );
    setHasKey((prev) => {
      const next = { ...prev };
      for (const [id, status] of entries) next[id] = status;
      return next;
    });
  }

  async function handleSave(provider: ApiKeyProvider) {
    const value = values[provider].trim();
    if (!value) {
      pushToast("Введите API-ключ перед сохранением", "error");
      return;
    }
    setLoading((s) => ({ ...s, [provider]: true }));
    const result = await setDesktopApiKey(provider, value);
    setLoading((s) => ({ ...s, [provider]: false }));
    if (!result.ok) {
      pushToast("Не удалось сохранить ключ: " + result.message, "error");
      return;
    }
    setValues((s) => ({ ...s, [provider]: "" }));
    await refreshStatuses();
    pushToast("Ключ сохранён в системном keychain", "info");
  }

  async function handleDelete(provider: ApiKeyProvider) {
    setLoading((s) => ({ ...s, [provider]: true }));
    const result = await deleteDesktopApiKey(provider);
    setLoading((s) => ({ ...s, [provider]: false }));
    if (!result.ok) {
      pushToast("Не удалось удалить ключ: " + result.message, "error");
      return;
    }
    setValues((s) => ({ ...s, [provider]: "" }));
    await refreshStatuses();
    pushToast("Ключ удалён из системного keychain", "info");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/50 p-3 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-[620px] rounded-[14px] border shadow-2xl"
        style={{
          borderColor: UI_COLORS.shellBorder,
          background: UI_COLORS.shellBgElevated,
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Настройки AI-ключей"
      >
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: UI_COLORS.shellBorder }}
        >
          <div>
            <p className="text-[14px] font-semibold" style={{ color: UI_COLORS.shellTextStrong }}>
              Настройки AI-ключей
            </p>
            <p className="mt-0.5 text-[11px]" style={{ color: UI_COLORS.shellTextMuted }}>
              Ключи хранятся локально в системном keychain и не сохраняются в проекте.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[9px] p-1.5 transition-colors"
            style={{ color: UI_COLORS.shellTextMuted }}
            title="Закрыть"
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          {!desktop && (
            <div
              className="rounded-[10px] border px-3 py-2.5 text-[12px]"
              style={{
                borderColor: UI_COLORS.shellBorder,
                background: "rgba(248, 113, 113, 0.1)",
                color: UI_COLORS.dangerText,
              }}
            >
              Эта секция доступна только в desktop (Tauri) сборке.
            </div>
          )}

          {PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className="rounded-[11px] border p-3"
              style={{ borderColor: UI_COLORS.shellBorder, background: "rgba(255,255,255,0.02)" }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <KeyRound size={14} style={{ color: UI_COLORS.shellTextMuted }} />
                  <span className="text-[13px] font-medium" style={{ color: UI_COLORS.shellTextStrong }}>
                    {provider.label}
                  </span>
                </div>
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px]"
                  style={{
                    borderColor: hasKey[provider.id]
                      ? UI_COLORS.successText
                      : UI_COLORS.shellBorder,
                    color: hasKey[provider.id]
                      ? UI_COLORS.successText
                      : UI_COLORS.shellTextMuted,
                  }}
                >
                  {hasKey[provider.id] ? "Ключ сохранён" : "Ключ не задан"}
                </span>
              </div>
              <p className="mb-2 text-[11px]" style={{ color: UI_COLORS.shellTextMuted }}>
                {provider.hint}
              </p>
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={values[provider.id]}
                onChange={(e) =>
                  setValues((s) => ({ ...s, [provider.id]: e.target.value }))
                }
                placeholder="Введите API-ключ"
                className="mb-2 w-full rounded-[9px] border px-3 py-2 text-[12px] outline-none"
                style={{
                  borderColor: UI_COLORS.shellBorder,
                  background: UI_COLORS.shellBg,
                  color: UI_COLORS.shellText,
                }}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!desktop || loading[provider.id]}
                  onClick={() => void handleSave(provider.id)}
                  className="rounded-[9px] px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
                  style={{ background: UI_COLORS.accentPrimaryBg }}
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  disabled={!desktop || loading[provider.id]}
                  onClick={() => void handleDelete(provider.id)}
                  className="inline-flex items-center gap-1 rounded-[9px] border px-3 py-1.5 text-[11px] disabled:opacity-50"
                  style={{
                    borderColor: UI_COLORS.shellBorder,
                    color: UI_COLORS.shellText,
                    background: "transparent",
                  }}
                >
                  <Trash2 size={12} />
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
