import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/ai/providers";
import { resolveProviderModel } from "@/app/api/ai/_shared/secrets";

const chunkSchema = z.object({
  id: z.string(),
  text: z.string(),
});

type TargetLanguage = "scene_cyrillic" | "scene_latin";

const batchResultSchema = z.object({
  facts: z.array(
    z.object({
      entity: z.string(),
      characterCanonicalId: z.string().nullable(),
      entityAliases: z.array(z.string()),
      entityType: z.enum([
        "character",
        "object",
        "document",
        "location",
        "event",
        "other",
      ]),
      entityConfidence: z.number().min(0).max(1),
      narrativeRole: z.enum([
        "clue",
        "tool",
        "evidence",
        "atmosphere",
        "mcguffin",
        "other",
      ]).nullable(),
      attribute: z.string(),
      value: z.string(),
      chunkIds: z.array(z.string()),
      quote: z.string().nullable(),
    }),
  ),
  relations: z.array(
    z.object({
      entityA: z.string(),
      entityB: z.string(),
      relation: z.enum([
        "friend",
        "enemy",
        "neutral",
        "family",
        "romantic",
        "secret",
        "other",
      ]),
      note: z.string().nullable(),
      chunkIds: z.array(z.string()),
    }),
  ),
  salientObjects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      chunkId: z.string(),
    }),
  ),
  selfContradictions: z.array(
    z.object({
      kind: z.enum(["fact_conflict", "timeline_conflict", "causal_conflict"]),
      message: z.string(),
      quoteA: z.string(),
      quoteB: z.string(),
      chunkIds: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    }),
  ),
  reasoningSignals: z.array(
    z.object({
      type: z.enum([
        "characterIntent",
        "motive",
        "internalConflict",
        "decision",
        "consequence",
        "promisePayoff",
      ]),
      entity: z.string(),
      characterCanonicalId: z.string().nullable(),
      summary: z.string(),
      evidenceQuote: z.string(),
      chunkIds: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    }),
  ),
  causalChains: z.array(
    z.object({
      trigger: z.string(),
      decision: z.string(),
      action: z.string(),
      consequence: z.string(),
      involvedEntities: z.array(z.string()),
      chunkIds: z.array(z.string()),
      confidence: z.number().min(0).max(1),
      evidenceQuote: z.string(),
    }),
  ),
  motivationAssessments: z.array(
    z.object({
      entity: z.string(),
      characterCanonicalId: z.string().nullable(),
      motivation: z.string(),
      verdict: z.enum(["strong", "weak"]),
      reason: z.string(),
      evidenceQuote: z.string(),
      chunkIds: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    }),
  ),
  consequenceAssessments: z.array(
    z.object({
      event: z.string(),
      verdict: z.enum(["clear", "missing"]),
      reason: z.string(),
      evidenceQuote: z.string(),
      chunkIds: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

const legacyBatchResultSchema = z.object({
  facts: z.array(
    z.object({
      entity: z.string(),
      entityType: z.enum([
        "character",
        "object",
        "document",
        "location",
        "event",
        "other",
      ]),
      entityConfidence: z.number().min(0).max(1),
      narrativeRole: z
        .enum(["clue", "tool", "evidence", "atmosphere", "mcguffin", "other"])
        .nullable(),
      attribute: z.string(),
      value: z.string(),
      chunkIds: z.array(z.string()),
      quote: z.string().nullable(),
    }),
  ),
  relations: z.array(
    z.object({
      entityA: z.string(),
      entityB: z.string(),
      relation: z.enum([
        "friend",
        "enemy",
        "neutral",
        "family",
        "romantic",
        "secret",
        "other",
      ]),
      note: z.string().nullable(),
      chunkIds: z.array(z.string()),
    }),
  ),
  salientObjects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      chunkId: z.string(),
    }),
  ),
  selfContradictions: z.array(
    z.object({
      kind: z.enum(["fact_conflict", "timeline_conflict", "causal_conflict"]),
      message: z.string(),
      quoteA: z.string(),
      quoteB: z.string(),
      chunkIds: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

// Keep batches small to avoid long single LLM calls in desktop webview sessions.
const MAX_BATCH_CHARS = 2500;

function batchChunks(
  chunks: { id: string; text: string }[],
): { id: string; text: string }[][] {
  const batches: { id: string; text: string }[][] = [];
  let cur: { id: string; text: string }[] = [];
  let size = 0;

  for (const c of chunks) {
    const t = c.text;
    if (size + t.length > MAX_BATCH_CHARS && cur.length > 0) {
      batches.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(c);
    size += t.length;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = z
    .object({
      chunks: z.array(chunkSchema),
      providerId: z.string().optional(),
      targetLanguage: z.enum(["scene_cyrillic", "scene_latin"]).optional(),
    })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Expected { chunks: { id, text }[] }" },
      { status: 400 },
    );
  }

  const provider = getProvider(parsed.data.providerId ?? "openai-gpt4o-mini");
  const resolved = await resolveProviderModel(provider);
  if (!resolved.model && resolved.missingKeyEnvVar) {
    return NextResponse.json(
      { error: `${resolved.missingKeyEnvVar} is not configured on the server.` },
      { status: 503 },
    );
  }

  const chunks = parsed.data.chunks.filter((c) => c.text.trim().length > 0);
  const targetLanguage: TargetLanguage = parsed.data.targetLanguage ?? "scene_cyrillic";
  if (chunks.length === 0) {
    return NextResponse.json({
      facts: [],
      relations: [],
      salientObjects: [],
      selfContradictions: [],
      reasoningSignals: [],
      causalChains: [],
      motivationAssessments: [],
      consequenceAssessments: [],
    });
  }

  const batches = batchChunks(chunks);
  const facts: z.infer<typeof batchResultSchema>["facts"] = [];
  const relations: z.infer<typeof batchResultSchema>["relations"] = [];
  const salientObjects: z.infer<typeof batchResultSchema>["salientObjects"] =
    [];
  const selfContradictions: z.infer<
    typeof batchResultSchema
  >["selfContradictions"] = [];
  const reasoningSignals: z.infer<typeof batchResultSchema>["reasoningSignals"] = [];
  const causalChains: z.infer<typeof batchResultSchema>["causalChains"] = [];
  const motivationAssessments: z.infer<typeof batchResultSchema>["motivationAssessments"] = [];
  const consequenceAssessments: z.infer<typeof batchResultSchema>["consequenceAssessments"] = [];

  const textLooksCyrillic = (value: string): boolean => /[\u0400-\u04FF]/.test(value);
  const textLooksLatin = (value: string): boolean => /[A-Za-z]/.test(value);
  const keepByLanguage = (value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed.length <= 2) return true;
    if (targetLanguage === "scene_cyrillic") {
      if (textLooksCyrillic(trimmed)) return true;
      if (!textLooksLatin(trimmed)) return true;
      return false;
    }
    if (textLooksLatin(trimmed)) return true;
    if (!textLooksCyrillic(trimmed)) return true;
    return false;
  };

  const normalizeLanguage = (input: z.infer<typeof batchResultSchema>) => ({
    ...input,
    facts: input.facts.filter((fact) => keepByLanguage(`${fact.entity} ${fact.value}`)),
    relations: input.relations.filter((rel) => keepByLanguage(`${rel.entityA} ${rel.entityB}`)),
    salientObjects: input.salientObjects.filter((obj) => keepByLanguage(`${obj.name} ${obj.description}`)),
    reasoningSignals: input.reasoningSignals.filter((sig) => keepByLanguage(`${sig.entity} ${sig.summary}`)),
    causalChains: input.causalChains.filter((chain) =>
      keepByLanguage(`${chain.trigger} ${chain.decision} ${chain.action} ${chain.consequence}`),
    ),
    motivationAssessments: input.motivationAssessments.filter((item) =>
      keepByLanguage(`${item.entity} ${item.motivation} ${item.reason}`),
    ),
    consequenceAssessments: input.consequenceAssessments.filter((item) =>
      keepByLanguage(`${item.event} ${item.reason}`),
    ),
  });

  async function extractBatchWithFallback(listing: string) {
    try {
      const { object } = await generateObject({
        model: resolved.model!,
        schema: batchResultSchema,
        temperature: 0,
        maxOutputTokens: 1200,
        system:
          "You extract structured story memory from fiction manuscript fragments. " +
          "Only include facts that clearly follow from the text; do not invent. " +
          "Every chunkIds entry must be an id that appears in the request fragments. " +
          "LANGUAGE: Write entity names, values, quotes, relation notes, and salient object name/description " +
          `in the same language as the manuscript text they come from (target=${targetLanguage}). ` +
          "If fragments mix languages, match each fact to the language of its cited fragment(s). " +
          "Use short snake_case Latin for attribute keys when possible (e.g. eye_color, left_arm_injury); " +
          "if the manuscript is not Latin-script, you may use concise keys in the manuscript language instead. " +
          "For each fact, classify entityType as one of: character, object, document, location, event, other. " +
          "For character facts set characterCanonicalId in stable lowercase-latin slug form; include common aliases in entityAliases. " +
          "Do not classify inanimate items (key, cigarette butt, glass, note) as character. " +
          "Set entityConfidence in [0..1] and narrativeRole when applicable " +
          "(clue/tool/evidence/atmosphere/mcguffin/other). " +
          "relations: only when ties between entities are clearly stated or shown in dialogue. " +
          "Return reasoningSignals for intents/motives/decisions/consequences only if clearly supported by text. " +
          "Return causalChains in form trigger->decision->action->consequence where explicit. " +
          "Return motivationAssessments and consequenceAssessments with evidenceQuote and confidence. " +
          "Also output selfContradictions only for explicit internal paradoxes in the fragments; " +
          "each must include direct quoteA/quoteB evidence and confidence (0..1). " +
          "Do not include stylistic metaphors or implicit interpretations.",
        prompt: `Analyze the fragments below and return JSON matching the schema.\n\n${listing}`,
      });
      return normalizeLanguage(object);
    } catch (strictError) {
      try {
        const { object } = await generateObject({
          model: resolved.model!,
          schema: legacyBatchResultSchema,
          temperature: 0,
          maxOutputTokens: 1200,
          system:
            "You extract structured story memory from fiction manuscript fragments. " +
            "Only include facts that clearly follow from the text; do not invent. " +
            "Every chunkIds entry must be an id that appears in the request fragments. " +
            `All free-text fields MUST follow target language=${targetLanguage}.`,
          prompt: `Analyze the fragments below and return JSON matching the schema.\n\n${listing}`,
        });
        return normalizeLanguage({
          ...object,
          facts: object.facts.map((fact) => ({
            ...fact,
            characterCanonicalId: null,
            entityAliases: [],
          })),
          reasoningSignals: [],
          causalChains: [],
          motivationAssessments: [],
          consequenceAssessments: [],
        });
      } catch (legacyError) {
        console.warn("[plot-extract] batch failed", {
          strictError: strictError instanceof Error ? strictError.message : String(strictError),
          legacyError: legacyError instanceof Error ? legacyError.message : String(legacyError),
        });
        return {
          facts: [],
          relations: [],
          salientObjects: [],
          selfContradictions: [],
          reasoningSignals: [],
          causalChains: [],
          motivationAssessments: [],
          consequenceAssessments: [],
        };
      }
    }
  }

  try {
    for (const batch of batches) {
      const listing = batch
        .map(
          (c) =>
            `--- FRAGMENT id=${JSON.stringify(c.id)} ---\n${c.text.trim()}`,
        )
        .join("\n\n");

      const object = await extractBatchWithFallback(listing);

      facts.push(...(object.facts ?? []));
      relations.push(...(object.relations ?? []));
      salientObjects.push(...(object.salientObjects ?? []));
      selfContradictions.push(...(object.selfContradictions ?? []));
      reasoningSignals.push(...(object.reasoningSignals ?? []));
      causalChains.push(...(object.causalChains ?? []));
      motivationAssessments.push(...(object.motivationAssessments ?? []));
      consequenceAssessments.push(...(object.consequenceAssessments ?? []));
    }

    return NextResponse.json({
      facts,
      relations,
      salientObjects,
      selfContradictions,
      reasoningSignals,
      causalChains,
      motivationAssessments,
      consequenceAssessments,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "plot-extract failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
