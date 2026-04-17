import { generateText } from "ai";
import { getProvider } from "@/lib/ai/providers";

const MAX_INPUT_CHARS = 8_000;
const MAX_OUTPUT_CHARS = 320;

function sanitise(text: unknown): string {
  if (typeof text !== "string") return "";
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.length > MAX_INPUT_CHARS
    ? `${trimmed.slice(0, MAX_INPUT_CHARS)}\n\n[Truncated for size.]`
    : trimmed;
}

export async function POST(req: Request) {
  const { text, sceneTitle, chapterTitle, providerId } = await req.json();
  const body = sanitise(text);
  if (!body) {
    return Response.json({ summary: null });
  }
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 503 },
    );
  }

  const provider = getProvider(providerId ?? "openai-gpt4o-mini");
  try {
    const { text: summary } = await generateText({
      model: provider.createModel(),
      system:
        "You write ultra-short scene synopses for a novelist's project index. " +
        "Output exactly ONE sentence in the language of the manuscript (default Russian). " +
        "Max 280 characters. No quotes, no lists, no meta commentary. " +
        "Focus on the concrete event or turning point of the scene.",
      prompt:
        `Chapter: ${chapterTitle ?? "(unknown)"}\nScene: ${sceneTitle ?? "(unknown)"}\n\n` +
        `Scene text:\n---\n${body}\n---\n\nSynopsis:`,
    });
    const compact = summary.replace(/\s+/g, " ").trim().slice(0, MAX_OUTPUT_CHARS);
    return Response.json({ summary: compact });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
