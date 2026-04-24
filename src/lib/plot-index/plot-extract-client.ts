import { computePlotChunks, type PlotChunk } from "./chunks";
import type { Editor } from "@tiptap/react";
import { createSemaphore } from "@/lib/ai/semaphore";

const extractSemaphore = createSemaphore(3);

export type PlotExtractResponse = {
  facts: {
    entity: string;
    characterCanonicalId?: string | null;
    entityAliases?: string[];
    entityType:
      | "character"
      | "object"
      | "document"
      | "location"
      | "event"
      | "other";
    entityConfidence: number;
    narrativeRole:
      | "clue"
      | "tool"
      | "evidence"
      | "atmosphere"
      | "mcguffin"
      | "other"
      | null;
    attribute: string;
    value: string;
    chunkIds: string[];
    quote: string | null;
  }[];
  relations: {
    entityA: string;
    entityB: string;
    relation:
      | "friend"
      | "enemy"
      | "neutral"
      | "family"
      | "romantic"
      | "secret"
      | "other";
    note: string | null;
    chunkIds: string[];
  }[];
  salientObjects: {
    name: string;
    description: string;
    chunkId: string;
  }[];
  selfContradictions: {
    kind: "fact_conflict" | "timeline_conflict" | "causal_conflict";
    message: string;
    quoteA: string;
    quoteB: string;
    chunkIds: string[];
    confidence: number;
  }[];
  reasoningSignals: {
    type:
      | "characterIntent"
      | "motive"
      | "internalConflict"
      | "decision"
      | "consequence"
      | "promisePayoff";
    entity: string;
    characterCanonicalId?: string | null;
    summary: string;
    evidenceQuote: string;
    chunkIds: string[];
    confidence: number;
  }[];
  causalChains: {
    trigger: string;
    decision: string;
    action: string;
    consequence: string;
    involvedEntities: string[];
    chunkIds: string[];
    confidence: number;
    evidenceQuote: string;
  }[];
  motivationAssessments: {
    entity: string;
    characterCanonicalId?: string | null;
    motivation: string;
    verdict: "strong" | "weak";
    reason: string;
    evidenceQuote: string;
    chunkIds: string[];
    confidence: number;
  }[];
  consequenceAssessments: {
    event: string;
    verdict: "clear" | "missing";
    reason: string;
    evidenceQuote: string;
    chunkIds: string[];
    confidence: number;
  }[];
};

const MAX_BATCH_CHARS = 9000;
const MAX_RETRIES = 3;

type ExtractChunk = { id: string; text: string };

type TargetLanguage = "scene_cyrillic" | "scene_latin";

function detectTargetLanguage(text: string): TargetLanguage {
  const cyr = (text.match(/[\u0400-\u04FF]/g) ?? []).length;
  const lat = (text.match(/[A-Za-z]/g) ?? []).length;
  return cyr >= lat ? "scene_cyrillic" : "scene_latin";
}

function splitChunksForTransport(chunks: ExtractChunk[]): ExtractChunk[][] {
  const out: ExtractChunk[][] = [];
  let cur: ExtractChunk[] = [];
  let size = 0;
  for (const c of chunks) {
    const len = c.text.length;
    if (cur.length > 0 && size + len > MAX_BATCH_CHARS) {
      out.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(c);
    size += len;
  }
  if (cur.length > 0) out.push(cur);
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postExtractBatch(batch: ExtractChunk[]): Promise<PlotExtractResponse> {
  const targetLanguage = detectTargetLanguage(batch.map((item) => item.text).join("\n"));
  let res: Response;
  try {
    res = await fetch("/api/ai/plot-extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chunks: batch, targetLanguage }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`network:${msg}`);
  }

  const rawText = await res.text();
  let data: (PlotExtractResponse & { error?: string }) | null = null;
  try {
    data = rawText
      ? (JSON.parse(rawText) as PlotExtractResponse & { error?: string })
      : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new Error(data?.error ?? `http:${res.status}`);
  }
  if (!data) {
    throw new Error("invalid:empty-response");
  }
  if (data.error) {
    throw new Error(data.error);
  }
  return {
    facts: (data.facts ?? []).map((fact) => ({
      entity: fact.entity,
      characterCanonicalId: fact.characterCanonicalId ?? null,
      entityAliases: fact.entityAliases ?? [],
      entityType: fact.entityType ?? "other",
      entityConfidence:
        typeof fact.entityConfidence === "number"
          ? Math.max(0, Math.min(1, fact.entityConfidence))
          : 0.5,
      narrativeRole: fact.narrativeRole ?? null,
      attribute: fact.attribute,
      value: fact.value,
      chunkIds: fact.chunkIds ?? [],
      quote: fact.quote ?? null,
    })),
    relations: data.relations ?? [],
    salientObjects: data.salientObjects ?? [],
    selfContradictions: data.selfContradictions ?? [],
    reasoningSignals: data.reasoningSignals ?? [],
    causalChains: data.causalChains ?? [],
    motivationAssessments: data.motivationAssessments ?? [],
    consequenceAssessments: data.consequenceAssessments ?? [],
  };
}

async function postExtractBatchWithRetry(batch: ExtractChunk[]): Promise<PlotExtractResponse> {
  return extractSemaphore(async () => {
    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await postExtractBatch(batch);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        lastErr = err;
        const msg = err.message.toLowerCase();
        const retryable =
          msg.includes("network:") ||
          msg.includes("load failed") ||
          msg.includes("fetch failed") ||
          msg.includes("http:429") ||
          msg.includes("http:502") ||
          msg.includes("http:503") ||
          msg.includes("http:504");
        if (!retryable || attempt === MAX_RETRIES) break;
        await sleep(600 * attempt);
      }
    }
    throw lastErr ?? new Error("plot-extract failed");
  });
}

export async function fetchPlotExtraction(editor: Editor): Promise<PlotExtractResponse> {
  return fetchPlotExtractionForChunks(computePlotChunks(editor));
}

export async function fetchPlotExtractionForChunks(
  plotChunks: PlotChunk[],
): Promise<PlotExtractResponse> {
  const chunks: ExtractChunk[] = plotChunks.map((c) => ({
    id: c.id,
    text: c.text,
  }));
  const batches = splitChunksForTransport(chunks);

  const merged: PlotExtractResponse = {
    facts: [],
    relations: [],
    salientObjects: [],
    selfContradictions: [],
    reasoningSignals: [],
    causalChains: [],
    motivationAssessments: [],
    consequenceAssessments: [],
  };

  try {
    for (const batch of batches) {
      const part = await postExtractBatchWithRetry(batch);
      merged.facts.push(...part.facts);
      merged.relations.push(...part.relations);
      merged.salientObjects.push(...part.salientObjects);
      merged.selfContradictions.push(...part.selfContradictions);
      merged.reasoningSignals.push(...part.reasoningSignals);
      merged.causalChains.push(...part.causalChains);
      merged.motivationAssessments.push(...part.motivationAssessments);
      merged.consequenceAssessments.push(...part.consequenceAssessments);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/load failed/i.test(msg) || /network:/i.test(msg)) {
      throw new Error(
        "Сетевой сбой при загрузке анализа сюжета (Load failed). " +
          "Выполнено несколько автоповторов, но соединение не стабилизировалось.",
      );
    }
    throw new Error(`Ошибка анализа сюжета: ${msg}`);
  }
  return merged;
}
