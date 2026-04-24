import type { PlotChunk } from "./chunks";

export type PlotFact = {
  id: string;
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
  quote?: string | null;
};

export type PlotRelation = {
  id: string;
  entityA: string;
  entityB: string;
  relation: "friend" | "enemy" | "neutral" | "family" | "romantic" | "secret" | "other";
  note?: string | null;
  chunkIds: string[];
};

export type SalientObject = {
  name: string;
  description: string;
  chunkId: string;
};

export type ConsistencyWarning = {
  id: string;
  key: string;
  kind: "fact_conflict" | "timeline_conflict" | "causal_conflict";
  source: "fact_merge" | "rule_pass" | "llm_self_check";
  confidence: number;
  message: string;
  entity: string;
  attribute: string;
  previousValue: string;
  newValue: string;
  previousChunkIds: string[];
  newChunkIds: string[];
  evidence?: {
    quoteA: string;
    quoteB: string;
  };
};

export type SelfContradictionInput = {
  kind: ConsistencyWarning["kind"];
  message: string;
  quoteA: string;
  quoteB: string;
  chunkIds: string[];
  confidence: number;
};

export type WarningStatus = "new" | "acknowledged" | "resolved" | "ignored";

export type ChekhovWarning = {
  id: string;
  objectName: string;
  introducedChunkId: string;
  lastMentionChunkId: string | null;
  message: string;
};

export type DeepReasoningSignalType =
  | "characterIntent"
  | "motive"
  | "internalConflict"
  | "decision"
  | "consequence"
  | "promisePayoff";

export type DeepReasoningSignal = {
  id: string;
  type: DeepReasoningSignalType;
  entity: string;
  characterCanonicalId?: string | null;
  summary: string;
  evidenceQuote: string;
  chunkIds: string[];
  confidence: number;
};

export type CausalChain = {
  id: string;
  trigger: string;
  decision: string;
  action: string;
  consequence: string;
  involvedEntities: string[];
  chunkIds: string[];
  confidence: number;
  evidenceQuote: string;
};

export type MotivationAssessment = {
  id: string;
  entity: string;
  characterCanonicalId?: string | null;
  motivation: string;
  verdict: "strong" | "weak";
  reason: string;
  evidenceQuote: string;
  chunkIds: string[];
  confidence: number;
};

export type ConsequenceAssessment = {
  id: string;
  event: string;
  verdict: "clear" | "missing";
  reason: string;
  evidenceQuote: string;
  chunkIds: string[];
  confidence: number;
};

const ENTITY_TYPE_RANK: Record<PlotFact["entityType"], number> = {
  character: 6,
  object: 5,
  document: 4,
  location: 3,
  event: 2,
  other: 1,
};

function clamp01(value: number | null | undefined, fallback = 0.5): number {
  if (typeof value !== "number") return fallback;
  return Math.max(0, Math.min(1, value));
}

function normalizeEntityToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[«»"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalizeCharacterId(name: string): string {
  const normalized = normalizeEntityToken(name)
    .replace(/\b(mr|mrs|ms|sir|lady|doctor|dr|капитан|господин|мисс|миссис)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.replace(/[^\p{L}\p{N}]+/gu, "-");
}

function canonicalEntityKey(
  entity: string,
  entityType: PlotFact["entityType"] | "unknown",
  canonicalId?: string | null,
): string {
  if (entityType === "character") {
    return `character:${canonicalId ?? canonicalizeCharacterId(entity)}`;
  }
  return `entity:${normalizeEntityToken(entity)}`;
}

export function normalizePlotFact(
  fact: (Omit<PlotFact, "entityType" | "entityConfidence" | "narrativeRole"> &
    Partial<Pick<PlotFact, "entityType" | "entityConfidence" | "narrativeRole">>) |
    (Omit<PlotFact, "id" | "entityType" | "entityConfidence" | "narrativeRole"> &
      { id?: string } &
      Partial<Pick<PlotFact, "entityType" | "entityConfidence" | "narrativeRole">>),
): PlotFact {
  return {
    ...fact,
    id: (fact as PlotFact).id ?? nextId("fact"),
    entityType: fact.entityType ?? "other",
    entityConfidence: clamp01(fact.entityConfidence, 0.5),
    narrativeRole: fact.narrativeRole ?? null,
    characterCanonicalId:
      (fact.entityType ?? "other") === "character"
        ? fact.characterCanonicalId ?? canonicalizeCharacterId(fact.entity)
        : null,
    entityAliases: Array.from(new Set((fact.entityAliases ?? []).map((alias) => alias.trim()).filter(Boolean))),
  };
}

export function normalizePlotFacts(
  facts: Array<
    Omit<PlotFact, "entityType" | "entityConfidence" | "narrativeRole"> &
      Partial<Pick<PlotFact, "entityType" | "entityConfidence" | "narrativeRole">>
  >,
): PlotFact[] {
  return facts.map((fact) => normalizePlotFact(fact));
}

function pickEntityMeta(prev: PlotFact | undefined, incoming: Omit<PlotFact, "id">): {
  entityType: PlotFact["entityType"];
  entityConfidence: number;
  narrativeRole: PlotFact["narrativeRole"];
} {
  const inType = incoming.entityType ?? "other";
  const inConfidence = clamp01(incoming.entityConfidence, 0.5);
  const inRole = incoming.narrativeRole ?? null;
  if (!prev) {
    return {
      entityType: inType,
      entityConfidence: inConfidence,
      narrativeRole: inRole,
    };
  }

  const prevType = prev.entityType ?? "other";
  const prevConfidence = clamp01(prev.entityConfidence, 0.5);
  if (inType === prevType) {
    return {
      entityType: prevType,
      entityConfidence: Math.max(prevConfidence, inConfidence),
      narrativeRole: prev.narrativeRole ?? inRole,
    };
  }

  const inScore = inConfidence + ENTITY_TYPE_RANK[inType] * 0.02;
  const prevScore = prevConfidence + ENTITY_TYPE_RANK[prevType] * 0.02;
  if (inScore >= prevScore) {
    return {
      entityType: inType,
      entityConfidence: inConfidence,
      narrativeRole: inRole ?? prev.narrativeRole ?? null,
    };
  }
  return {
    entityType: prevType,
    entityConfidence: prevConfidence,
    narrativeRole: prev.narrativeRole ?? inRole,
  };
}

export function normalizeConsistencyWarning(
  warning: Omit<ConsistencyWarning, "source" | "confidence"> &
    Partial<Pick<ConsistencyWarning, "source" | "confidence">>,
): ConsistencyWarning {
  return {
    ...warning,
    source: warning.source ?? "fact_merge",
    confidence:
      typeof warning.confidence === "number"
        ? Math.max(0, Math.min(1, warning.confidence))
        : 0.5,
  };
}

export function normalizeConsistencyWarnings(
  warnings: Array<
    Omit<ConsistencyWarning, "source" | "confidence"> &
      Partial<Pick<ConsistencyWarning, "source" | "confidence">>
  >,
): ConsistencyWarning[] {
  return warnings.map((warning) => normalizeConsistencyWarning(warning));
}

function inferConflictKind(
  attribute: string,
  previousValue: string,
  newValue: string,
): ConsistencyWarning["kind"] {
  const attr = attribute.toLowerCase();
  const prev = previousValue.toLowerCase();
  const next = newValue.toLowerCase();
  if (
    /время|дата|год|день|ночь|сначала|потом|до|после|timeline|time|date|year|day|night|morning|evening|noon|midnight|today|tomorrow|yesterday|before|after|first|then|later|clock|calendar/.test(
      attr,
    ) ||
    /вчера|сегодня|завтра|после|полуноч|утр|вечер|ночь/.test(prev) ||
    /вчера|сегодня|завтра|после|полуноч|утр|вечер|ночь/.test(next) ||
    /yesterday|today|tomorrow|before|after|midnight|morning|evening|night|noon|later|earlier|am\b|pm\b/i.test(
      prev,
    ) ||
    /yesterday|today|tomorrow|before|after|midnight|morning|evening|night|noon|later|earlier|am\b|pm\b/i.test(
      next,
    )
  ) {
    return "timeline_conflict";
  }
  if (/причин|мотив|cause|motivation|reason|why\b/.test(attr)) {
    return "causal_conflict";
  }
  return "fact_conflict";
}

let idSeq = 0;
function nextId(prefix: string): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

export function mergeFactsAndDetectConflicts(
  existing: PlotFact[],
  incoming: Omit<PlotFact, "id">[],
): { facts: PlotFact[]; warnings: ConsistencyWarning[] } {
  const map = new Map<string, PlotFact>();
  for (const f of existing) {
    const normalized = normalizePlotFact(f);
    const entityKey = canonicalEntityKey(
      normalized.entity,
      normalized.entityType,
      normalized.characterCanonicalId,
    );
    map.set(`${entityKey}|${normalized.attribute.trim().toLowerCase()}`, normalized);
  }

  const warnings: ConsistencyWarning[] = [];

  for (const raw of incoming) {
    const normalizedRaw = normalizePlotFact(raw);
    const incomingEntityType = raw.entityType ?? "other";
    const entityKey = canonicalEntityKey(
      raw.entity,
      incomingEntityType,
      incomingEntityType === "character" ? raw.characterCanonicalId ?? canonicalizeCharacterId(raw.entity) : null,
    );
    const key = `${entityKey}|${raw.attribute.trim().toLowerCase()}`;
    const prev = map.get(key);
    const normalizedNew = raw.value.trim().toLowerCase();
    const normalizedPrev = prev?.value.trim().toLowerCase();

    if (
      prev &&
      normalizedNew.length > 0 &&
      normalizedPrev &&
      normalizedNew !== normalizedPrev
    ) {
      const key = `${keyForWarning(raw.entity, raw.attribute)}/${normalizedPrev}->${normalizedNew}`;
      warnings.push({
        id: nextId("conflict"),
        key,
        kind: inferConflictKind(raw.attribute, prev.value, raw.value),
        source: "fact_merge",
        confidence: 0.86,
        message: `"${raw.entity}" / ${raw.attribute}: was "${prev.value}", now "${raw.value}".`,
        entity: raw.entity,
        attribute: raw.attribute,
        previousValue: prev.value,
        newValue: raw.value,
        previousChunkIds: [...prev.chunkIds],
        newChunkIds: [...raw.chunkIds],
        evidence:
          prev.quote && raw.quote
            ? {
                quoteA: prev.quote,
                quoteB: raw.quote,
              }
            : undefined,
      });
    }

    const merged: PlotFact = {
      id: prev?.id ?? nextId("fact"),
      entity: raw.entity,
      ...pickEntityMeta(prev, normalizedRaw),
      attribute: raw.attribute,
      value: raw.value,
      chunkIds: Array.from(new Set([...(prev?.chunkIds ?? []), ...raw.chunkIds])),
      quote: raw.quote ?? prev?.quote,
      characterCanonicalId:
        incomingEntityType === "character"
          ? normalizedRaw.characterCanonicalId ?? prev?.characterCanonicalId ?? canonicalizeCharacterId(raw.entity)
          : null,
      entityAliases: Array.from(
        new Set([...(prev?.entityAliases ?? []), ...(normalizedRaw.entityAliases ?? [])]),
      ),
    };
    map.set(key, merged);
  }

  return { facts: [...map.values()], warnings };
}

function keyForWarning(entity: string, attribute: string): string {
  return `${entity.trim().toLowerCase()}|${attribute.trim().toLowerCase()}`;
}

export function mergeRelations(
  existing: PlotRelation[],
  incoming: Omit<PlotRelation, "id">[],
): PlotRelation[] {
  const key = (a: string, b: string, rel: string) =>
    `${canonicalizeCharacterId(a)}|${canonicalizeCharacterId(b)}|${rel}`;
  const map = new Map<string, PlotRelation>();
  for (const r of existing) {
    map.set(key(r.entityA, r.entityB, r.relation), r);
  }
  for (const raw of incoming) {
    const k = key(raw.entityA, raw.entityB, raw.relation);
    const prev = map.get(k);
    const merged: PlotRelation = {
      id: prev?.id ?? nextId("rel"),
      entityA: raw.entityA,
      entityB: raw.entityB,
      relation: raw.relation,
      note: raw.note ?? prev?.note,
      chunkIds: Array.from(new Set([...(prev?.chunkIds ?? []), ...raw.chunkIds])),
    };
    map.set(k, merged);
  }
  return [...map.values()];
}

export function computeChekhovWarnings(
  chunks: PlotChunk[],
  salient: SalientObject[],
): ChekhovWarning[] {
  if (chunks.length === 0 || salient.length === 0) return [];

  const chunkOrder = new Map<string, number>();
  chunks.forEach((c, i) => chunkOrder.set(c.id, i));

  const earlyCut = Math.max(0, Math.floor(chunks.length / 3));
  const out: ChekhovWarning[] = [];

  for (const obj of salient) {
    const introIdx = chunkOrder.get(obj.chunkId) ?? 0;
    if (introIdx > earlyCut) continue;

    const name = obj.name.trim();
    if (name.length < 2) continue;

    let lastIdx: number | null = null;
    const lower = name.toLowerCase();
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].text.toLowerCase().includes(lower)) {
        lastIdx = i;
      }
    }

    if (lastIdx === null) continue;
    const gap = chunks.length - 1 - lastIdx;
    if (gap >= 8 && chunks.length >= 12) {
      out.push({
        id: nextId("chekhov"),
        objectName: name,
        introducedChunkId: obj.chunkId,
        lastMentionChunkId: chunks[lastIdx]?.id ?? null,
        message: `"${name}" is introduced early but barely appears in the last ${gap}+ chunks; resolve the thread or pay it off.`,
      });
    }
  }

  return out;
}
