import { embedMany } from "ai";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/app/api/ai/_shared/rate-limit";
import { OLLAMA_BASE_URL } from "@/lib/ai/providers";

const MAX_VALUES = 64;
const MAX_CHARS = 8000;

/**
 * Выбор бэкенда эмбеддингов:
 *  - `EMBEDDINGS_BACKEND=ollama` → локальная модель через Ollama (privacy-first).
 *  - иначе — OpenAI `text-embedding-3-small`.
 *
 * Модель Ollama задаётся через `EMBEDDINGS_MODEL` (default: `nomic-embed-text`).
 */
function useLocalEmbeddings(): boolean {
  const backend = process.env.EMBEDDINGS_BACKEND?.toLowerCase();
  return backend === "ollama" || backend === "local";
}

export async function POST(req: Request) {
  const blocked = enforceRateLimit(req, "embeddings", 120, 60_000);
  if (blocked) return blocked;

  const localMode = useLocalEmbeddings();

  if (!localMode && !process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not set. Either configure it, or set EMBEDDINGS_BACKEND=ollama for local embeddings.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const texts = (body as { texts?: unknown }).texts;
  if (!Array.isArray(texts) || texts.some((t) => typeof t !== "string")) {
    return NextResponse.json(
      { error: "Expected { texts: string[] }" },
      { status: 400 },
    );
  }

  const cleaned = texts
    .map((t) => t.slice(0, MAX_CHARS))
    .filter((t) => t.trim().length > 0);

  if (cleaned.length === 0) {
    return NextResponse.json({ embeddings: [] });
  }

  if (cleaned.length > MAX_VALUES) {
    return NextResponse.json(
      { error: `Too many values (max ${MAX_VALUES})` },
      { status: 400 },
    );
  }

  try {
    const modelName = localMode
      ? process.env.EMBEDDINGS_MODEL || "nomic-embed-text"
      : "text-embedding-3-small";

    const model = localMode
      ? createOpenAI({
          baseURL: `${OLLAMA_BASE_URL.replace(/\/$/, "")}/v1`,
          apiKey: "ollama",
        }).embedding(modelName)
      : openai.embedding(modelName);

    const { embeddings } = await embedMany({
      model,
      values: cleaned,
    });
    return NextResponse.json({ embeddings });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Embedding failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
