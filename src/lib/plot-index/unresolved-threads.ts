import type { PlotChunk } from "./chunks";
import type { PlotFact, SalientObject } from "./story-extraction";

export type ThreadLifecycleStage = "introduced" | "reinforced" | "paid_off" | "dropped";

export type UnresolvedThread = {
  id: string;
  label: string;
  stage: ThreadLifecycleStage;
  introducedChunkId: string;
  lastMentionChunkId: string | null;
  relatedChunkIds: string[];
  message: string;
};

function nextId(prefix: string, key: string): string {
  return `${prefix}-${key.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-")}`;
}

export function computeUnresolvedThreads(args: {
  chunks: PlotChunk[];
  salientObjects: SalientObject[];
  facts: PlotFact[];
}): UnresolvedThread[] {
  const { chunks, salientObjects, facts } = args;
  if (!chunks.length) return [];
  const chunkOrder = new Map(chunks.map((chunk, idx) => [chunk.id, idx]));
  const out: UnresolvedThread[] = [];

  for (const obj of salientObjects) {
    const introOrder = chunkOrder.get(obj.chunkId);
    if (introOrder == null) continue;
    const mentions = chunks
      .filter((chunk) => chunk.text.toLowerCase().includes(obj.name.toLowerCase()))
      .map((chunk) => ({ id: chunk.id, idx: chunkOrder.get(chunk.id) ?? 0 }));
    const factMentions = facts
      .filter((fact) => fact.entity.toLowerCase() === obj.name.toLowerCase())
      .flatMap((fact) => fact.chunkIds)
      .map((chunkId) => ({ id: chunkId, idx: chunkOrder.get(chunkId) ?? 0 }));
    const allMentions = [...mentions, ...factMentions].sort((a, b) => a.idx - b.idx);
    const uniqueMentions = Array.from(new Set(allMentions.map((m) => m.id)));
    const lastMention = allMentions[allMentions.length - 1] ?? null;

    const chunkTailGap = lastMention ? chunks.length - 1 - lastMention.idx : chunks.length - introOrder;
    const stage: ThreadLifecycleStage =
      uniqueMentions.length >= 3
        ? "reinforced"
        : chunkTailGap >= 6
          ? "dropped"
          : "introduced";
    if (stage !== "dropped") continue;

    out.push({
      id: nextId("thread", obj.name),
      label: obj.name,
      stage,
      introducedChunkId: obj.chunkId,
      lastMentionChunkId: lastMention?.id ?? null,
      relatedChunkIds: uniqueMentions.slice(-6),
      message: `"${obj.name}" введен(а) в сюжет, но линия не получила payoff в последних сценах.`,
    });
  }

  return out;
}
