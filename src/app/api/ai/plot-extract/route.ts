import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/ai/providers";
import { resolveProviderModel } from "@/app/api/ai/_shared/secrets";

const chunkSchema = z.object({
  id: z.string(),
  text: z.string(),
});

const batchResultSchema = z.object({
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
  if (chunks.length === 0) {
    return NextResponse.json({
      facts: [],
      relations: [],
      salientObjects: [],
      selfContradictions: [],
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

  try {
    for (const batch of batches) {
      const listing = batch
        .map(
          (c) =>
            `--- FRAGMENT id=${JSON.stringify(c.id)} ---\n${c.text.trim()}`,
        )
        .join("\n\n");

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
          "in the same language as the manuscript text they come from (Kazakh, Uzbek, English, Russian, etc.). " +
          "If fragments mix languages, match each fact to the language of its cited fragment(s). " +
          "Use short snake_case Latin for attribute keys when possible (e.g. eye_color, left_arm_injury); " +
          "if the manuscript is not Latin-script, you may use concise keys in the manuscript language instead. " +
          "For each fact, classify entityType as one of: character, object, document, location, event, other. " +
          "Do not classify inanimate items (key, cigarette butt, glass, note) as character. " +
          "Set entityConfidence in [0..1] and narrativeRole when applicable " +
          "(clue/tool/evidence/atmosphere/mcguffin/other). " +
          "relations: only when ties between entities are clearly stated or shown in dialogue. " +
          "Also output selfContradictions only for explicit internal paradoxes in the fragments; " +
          "each must include direct quoteA/quoteB evidence and confidence (0..1). " +
          "Do not include stylistic metaphors or implicit interpretations.",
        prompt: `Analyze the fragments below and return JSON matching the schema.\n\n${listing}`,
      });

      facts.push(...object.facts);
      relations.push(...object.relations);
      salientObjects.push(...object.salientObjects);
      selfContradictions.push(...object.selfContradictions);
    }

    return NextResponse.json({
      facts,
      relations,
      salientObjects,
      selfContradictions,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "plot-extract failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
