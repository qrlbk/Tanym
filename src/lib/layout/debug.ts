export type LayoutDecisionPath = "cache" | "measure" | "legacy";

export type LayoutDebugEntry = {
  blockId: string;
  keyHash: string;
  cacheHit: boolean;
  path: LayoutDecisionPath;
  layoutVersion: number;
  reason?: string;
};

const DEBUG_KEY = "DEBUG_LAYOUT_ENGINE";

export function isLayoutDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DEBUG_KEY) === "1";
}

export function logLayoutDebug(entry: LayoutDebugEntry): void {
  if (!isLayoutDebugEnabled()) return;
  // Keep one-line structured logs for easier filtering in devtools.
  console.debug("[layout]", JSON.stringify(entry));
}

