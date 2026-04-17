/** Client-side calls to /api/ai/embeddings */

import { createSemaphore } from "@/lib/ai/semaphore";

const embeddingsSemaphore = createSemaphore(4);

export async function embedTextsOnServer(
  texts: string[],
  signal?: AbortSignal,
): Promise<number[][]> {
  return embeddingsSemaphore(() => embedTextsOnServerImpl(texts, signal));
}

async function embedTextsOnServerImpl(
  texts: string[],
  signal?: AbortSignal,
): Promise<number[][]> {
  let res: Response;
  try {
    res = await fetch("/api/ai/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts }),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    const msg = e instanceof Error ? e.message : String(e);
    if (/load failed/i.test(msg)) {
      throw new Error(
        "Сетевой сбой при получении эмбеддингов (Load failed). Проверьте, что dev-сервер активен.",
      );
    }
    throw new Error(`Не удалось обратиться к /api/ai/embeddings: ${msg}`);
  }
  const data = (await res.json()) as {
    embeddings?: number[][];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? `Embeddings HTTP ${res.status}`);
  }
  if (!data.embeddings) {
    throw new Error("Invalid embeddings response");
  }
  return data.embeddings;
}
