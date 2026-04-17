/**
 * Scene summaries used by the project context.
 *
 * - `fetchSceneSummary` calls `/api/ai/scene-summary` to generate a one-sentence
 *   synopsis. Cheap model (gpt-4o-mini by default) with tight char budget.
 * - `computeSceneSummaryHash` fingerprints the scene text so we only
 *   re-summarise on substantive change.
 */

import { fnv1a32 } from "@/lib/plot-index/chunks";

export function computeSceneSummaryHash(text: string): string {
  return fnv1a32(`v1:${text.trim()}`);
}

export type FetchSceneSummaryInput = {
  text: string;
  sceneTitle?: string | null;
  chapterTitle?: string | null;
  providerId?: string;
  signal?: AbortSignal;
};

export async function fetchSceneSummary(
  input: FetchSceneSummaryInput,
): Promise<string | null> {
  const text = input.text.trim();
  if (!text) return null;
  const res = await fetch("/api/ai/scene-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      sceneTitle: input.sceneTitle ?? null,
      chapterTitle: input.chapterTitle ?? null,
      providerId: input.providerId,
    }),
    signal: input.signal,
  });
  const data = (await res.json().catch(() => null)) as
    | { summary?: string | null; error?: string }
    | null;
  if (!res.ok) {
    throw new Error(data?.error ?? `scene-summary HTTP ${res.status}`);
  }
  if (!data?.summary || typeof data.summary !== "string") return null;
  return data.summary.trim() || null;
}
