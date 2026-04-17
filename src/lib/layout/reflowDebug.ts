export type ReflowDebugPayload = Record<string, unknown>;

const DEBUG_KEY = "DEBUG_PAGINATION_ACTIONS";

export function isReflowDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DEBUG_KEY) === "1";
}

export function logReflowAction(
  action: string,
  payload: ReflowDebugPayload = {},
): void {
  if (!isReflowDebugEnabled()) return;
  console.debug("[reflow-action]", action, payload);
}

