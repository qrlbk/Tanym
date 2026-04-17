/**
 * Opt-in телеметрия. Roadmap фаза 8.
 *
 * Принципы:
 *  - По умолчанию ВЫКЛЮЧЕНА. Пользователь активно включает через Settings.
 *  - Тело события — никакого контента рукописи. Только факты вида
 *    «tool=generate_beat_sheet», «offlineOnly=true», «provider=local-ollama-llama3».
 *  - Любые имена сущностей, названия сцен, текст промптов — НЕ отправлять.
 *  - Транспорт — `navigator.sendBeacon` или fetch без await (fire-and-forget).
 *
 * UI-интеграция появится вместе с экраном настроек — это модуль-каркас.
 */

const STORAGE_KEY = "tanym.telemetryOptIn";
const INSTALL_ID_KEY = "tanym.installId";
const LEGACY_STORAGE_KEY = "wordai.telemetryOptIn";
const LEGACY_INSTALL_ID_KEY = "wordai.installId";

export type TelemetryEvent = {
  /** Стабильный идентификатор события в snake_case. */
  name: string;
  /** Примитивные значения только. Не пропускать строки длиннее 64 символов. */
  props?: Record<string, string | number | boolean>;
};

export function isTelemetryEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      localStorage.getItem(STORAGE_KEY) === "true" ||
      localStorage.getItem(LEGACY_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

export function setTelemetryEnabled(v: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, v ? "true" : "false");
  } catch {
    // ignore
  }
}

function getInstallId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing =
      localStorage.getItem(INSTALL_ID_KEY) ??
      localStorage.getItem(LEGACY_INSTALL_ID_KEY);
    if (existing) {
      if (!localStorage.getItem(INSTALL_ID_KEY)) {
        localStorage.setItem(INSTALL_ID_KEY, existing);
      }
      localStorage.removeItem(LEGACY_INSTALL_ID_KEY);
      return existing;
    }
    const fresh =
      (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : Math.random().toString(36).slice(2)) +
      "-" +
      Date.now().toString(36);
    localStorage.setItem(INSTALL_ID_KEY, fresh);
    return fresh;
  } catch {
    return "unknown";
  }
}

function sanitizeProps(
  props: TelemetryEvent["props"],
): Record<string, string | number | boolean> | undefined {
  if (!props) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!/^[a-zA-Z0-9_]+$/.test(k)) continue;
    if (typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    } else if (typeof v === "string") {
      out[k] = v.length > 64 ? v.slice(0, 64) : v;
    }
  }
  return out;
}

/**
 * Логирует событие, если телеметрия включена. Без await — не ломает UI.
 * Реальный endpoint настраивается через `NEXT_PUBLIC_TELEMETRY_URL`.
 * Если URL не задан или ответ не ok — событие молча теряется.
 */
export function track(event: TelemetryEvent): void {
  if (!isTelemetryEnabled()) return;
  if (typeof window === "undefined") return;

  const url =
    typeof process !== "undefined" && process.env?.NEXT_PUBLIC_TELEMETRY_URL;
  if (!url) return;

  const payload = JSON.stringify({
    installId: getInstallId(),
    name: event.name,
    props: sanitizeProps(event.props),
    ts: Date.now(),
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // fire-and-forget
  }
}
