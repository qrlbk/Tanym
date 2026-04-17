import type { ConsistencyWarning } from "./story-extraction";
import type { ContinuityFixSuggestion } from "@/stores/plotStoryStore";

function createSuggestionId(warningKey: string, strategy: string): string {
  return `${warningKey}:${strategy}`;
}

function createSpanFingerprint(
  warning: ConsistencyWarning,
  targetValue: string,
  previousValue: string,
): string {
  const norm = (s: string) =>
    s.toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N}\s:/_-]+/gu, "").trim();
  return [
    warning.kind,
    norm(warning.entity),
    norm(warning.attribute),
    norm(targetValue),
    norm(previousValue),
  ].join("|");
}

function clampSnippet(value: string, max = 96): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function findIndex(text: string, needle: string): number {
  if (!needle) return -1;
  return text.toLowerCase().indexOf(needle.toLowerCase());
}

export function buildContinuityFixSuggestions(args: {
  warning: ConsistencyWarning;
  chunkId: string;
  chunkText: string;
  chunkFrom: number;
}): ContinuityFixSuggestion[] {
  const { warning, chunkId, chunkText, chunkFrom } = args;
  const safeText = chunkText || "";
  const targetValue = warning.newValue.trim();
  const previousValue = warning.previousValue.trim();
  const targetIdx = findIndex(safeText, targetValue);
  const hasExactTarget = targetIdx >= 0 && targetValue.length > 0;
  const locatorStrategy = hasExactTarget ? "exact_target" : "evidence_fuzzy";
  const canonicalPrev = clampSnippet(previousValue || warning.evidence?.quoteA || "");
  const canonicalNew = clampSnippet(targetValue || warning.evidence?.quoteB || "current value");
  const fallbackNote = `\n\n[Continuity note: ${warning.entity}/${warning.attribute} should be "${canonicalPrev}" instead of "${canonicalNew}".]`;
  const spanFingerprint = createSpanFingerprint(
    warning,
    canonicalNew || targetValue,
    canonicalPrev || previousValue,
  );

  const replaceFrom = hasExactTarget
    ? chunkFrom + targetIdx
    : chunkFrom + safeText.length;
  const replaceTo = hasExactTarget
    ? replaceFrom + targetValue.length
    : chunkFrom + safeText.length;
  const minimalReplacement = hasExactTarget ? previousValue : fallbackNote;
  const expectedCurrentText = hasExactTarget ? targetValue : "";
  const contextBefore = hasExactTarget ? safeText.slice(Math.max(0, targetIdx - 24), targetIdx) : "";
  const contextAfter = hasExactTarget
    ? safeText.slice(targetIdx + targetValue.length, targetIdx + targetValue.length + 24)
    : "";
  const windowFromHint = chunkFrom;
  const windowToHint = chunkFrom + safeText.length;

  const minimalAfter = hasExactTarget
    ? safeText.replace(targetValue, previousValue)
    : `${safeText}${fallbackNote}`;
  const conservativeReplacement = `${targetValue} (note: previously ${previousValue})`;
  const conservativeAfter = hasExactTarget
    ? safeText.replace(targetValue, conservativeReplacement)
    : `${safeText}\n\nContinuity note: previously ${previousValue}.`;
  const radicalAfter = `${safeText}\n\n[Author note: harmonize ${warning.attribute} for ${warning.entity}; canonical value: ${previousValue}]`;

  return [
    {
      id: createSuggestionId(warning.key, "minimal"),
      warningKey: warning.key,
      title: "Точечная замена",
      strategy: "minimal",
      editKind: "replace",
      locatorStrategy,
      spanFingerprint,
      targetChunkId: chunkId,
      replaceFrom,
      replaceTo,
      windowFromHint,
      windowToHint,
      contextBefore,
      contextAfter,
      expectedCurrentText,
      replacementText: minimalReplacement,
      beforeText: safeText,
      afterText: minimalAfter,
      reason: `Restore "${previousValue}" instead of "${targetValue}".`,
    },
    {
      id: createSuggestionId(warning.key, "conservative"),
      warningKey: warning.key,
      title: "Добавить пояснение",
      strategy: "conservative",
      editKind: hasExactTarget ? "replace" : "insert_note",
      locatorStrategy,
      spanFingerprint,
      targetChunkId: chunkId,
      replaceFrom,
      replaceTo,
      windowFromHint,
      windowToHint,
      contextBefore,
      contextAfter,
      expectedCurrentText,
      replacementText: conservativeReplacement,
      beforeText: safeText,
      afterText: conservativeAfter,
      reason: "Keep the current wording and add a short continuity clarification.",
    },
    {
      id: createSuggestionId(warning.key, "radical"),
      warningKey: warning.key,
      title: "Авторская заметка (вставка в текст)",
      strategy: "radical",
      editKind: "insert_note",
      locatorStrategy: "append_only",
      spanFingerprint,
      targetChunkId: chunkId,
      replaceFrom: chunkFrom + safeText.length,
      replaceTo: chunkFrom + safeText.length,
      windowFromHint,
      windowToHint,
      contextBefore: "",
      contextAfter: "",
      expectedCurrentText: "",
      replacementText: `\n\n[Author note: harmonize ${warning.attribute} for ${warning.entity}; canonical value: ${previousValue}]`,
      beforeText: safeText,
      afterText: radicalAfter,
      reason: "Append an author note for you to rewrite the scene by hand.",
    },
  ];
}
