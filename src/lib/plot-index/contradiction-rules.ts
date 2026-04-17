import type { PlotChunk } from "./chunks";
import type { ConsistencyWarning } from "./story-extraction";

type Rule = {
  id: string;
  kind: ConsistencyWarning["kind"];
  left: RegExp;
  right: RegExp;
  message: string;
  confidence: number;
};

const RULES: Rule[] = [
  {
    id: "silence-vs-noise",
    kind: "fact_conflict",
    left: /(тишин|silent|silence)/i,
    right: /(крик|шум|спор|громк|nois|shout|scream)/i,
    message: "В одном фрагменте одновременно заявлены тишина и интенсивный шум.",
    confidence: 0.72,
  },
  {
    id: "empty-vs-full",
    kind: "fact_conflict",
    left: /(пуст|empty)/i,
    right: /(до краев|переполн|полон|full|filled)/i,
    message: "Один и тот же объект описан как пустой и одновременно полный.",
    confidence: 0.79,
  },
  {
    id: "inside-vs-away",
    kind: "causal_conflict",
    left: /(находил.*в этот момент|was there at that moment)/i,
    right: /(в город|за покупк|away|in town)/i,
    message: "Персонаж одновременно присутствует на месте и в другом месте.",
    confidence: 0.68,
  },
  {
    id: "locked-vs-open",
    kind: "causal_conflict",
    left: /(заперт|locked)/i,
    right: /(открыт.*настежь|wide open)/i,
    message: "Дверь описана как запертая и одновременно открытая настежь.",
    confidence: 0.7,
  },
  {
    id: "winter-vs-burning-sun",
    kind: "timeline_conflict",
    left: /(зим|winter|cold)/i,
    right: /(палящ.*солнц|scorching sun|heat)/i,
    message: "Окружение одновременно маркирует зиму и жаркий зной.",
    confidence: 0.67,
  },
  {
    id: "tomorrow-vs-past",
    kind: "timeline_conflict",
    left: /(завтра|tomorrow)/i,
    right: /(уже|вчера|already|yesterday|when he left)/i,
    message: "Временная связка указывает на взаимоисключающие моменты времени.",
    confidence: 0.66,
  },
];

const MAX_QUOTE_LEN = 140;

let seq = 0;
function nextId(prefix: string): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  seq += 1;
  return `${prefix}-${seq}`;
}

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function excerptAround(text: string, hit: RegExp): string {
  const match = text.match(hit);
  if (!match || match.index == null) return compact(text).slice(0, MAX_QUOTE_LEN);
  const start = Math.max(0, match.index - 42);
  const end = Math.min(text.length, match.index + match[0].length + 42);
  return compact(text.slice(start, end)).slice(0, MAX_QUOTE_LEN);
}

function normalizeKey(input: string): string {
  return input.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 96);
}

function addWarning(
  out: ConsistencyWarning[],
  dedup: Set<string>,
  rule: Rule,
  quoteA: string,
  quoteB: string,
  chunkIds: string[],
): void {
  const key = `rule/${rule.id}/${normalizeKey(quoteA)}-${normalizeKey(quoteB)}`;
  if (dedup.has(key)) return;
  dedup.add(key);
  out.push({
    id: nextId("conflict"),
    key,
    kind: rule.kind,
    source: "rule_pass",
    confidence: rule.confidence,
    message: rule.message,
    entity: "scene",
    attribute: rule.id,
    previousValue: quoteA,
    newValue: quoteB,
    previousChunkIds: chunkIds.slice(0, 1),
    newChunkIds: chunkIds.slice(1, 2),
    evidence: { quoteA, quoteB },
  });
}

export function detectRuleContradictionsFromChunks(
  chunks: PlotChunk[],
): ConsistencyWarning[] {
  const out: ConsistencyWarning[] = [];
  const dedup = new Set<string>();

  for (let i = 0; i < chunks.length; i++) {
    const current = chunks[i];
    const nearby = chunks[i + 1];
    const texts = nearby ? [current.text, nearby.text] : [current.text];
    const mergedText = texts.join("\n");

    for (const rule of RULES) {
      if (!rule.left.test(mergedText) || !rule.right.test(mergedText)) continue;
      const leftQuote = excerptAround(mergedText, rule.left);
      const rightQuote = excerptAround(mergedText, rule.right);
      addWarning(
        out,
        dedup,
        rule,
        leftQuote,
        rightQuote,
        nearby ? [current.id, nearby.id] : [current.id],
      );
    }
  }
  return out;
}
