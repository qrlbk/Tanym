import { generateText } from "ai";
import { getProvider } from "@/lib/ai/providers";
import { resolveProviderModel } from "@/app/api/ai/_shared/secrets";

const MAX_USER = 2000;
const MAX_ASSISTANT = 1500;

function sanitizeTitle(raw: string): string {
  const oneLine = raw.replace(/\s+/g, " ").trim();
  const cut = oneLine.slice(0, 80);
  return cut || "Новый чат";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const providerId =
    typeof body.providerId === "string" ? body.providerId : "openai-gpt4o-mini";
  let firstUserText =
    typeof body.firstUserText === "string" ? body.firstUserText.trim() : "";
  const assistantPreview =
    typeof body.assistantPreview === "string"
      ? body.assistantPreview.trim()
      : "";

  if (!firstUserText) {
    return Response.json({ error: "firstUserText required" }, { status: 400 });
  }

  if (firstUserText.length > MAX_USER) {
    firstUserText = firstUserText.slice(0, MAX_USER) + "…";
  }
  const assistantSafe =
    assistantPreview.length > MAX_ASSISTANT
      ? assistantPreview.slice(0, MAX_ASSISTANT) + "…"
      : assistantPreview;

  const provider = getProvider(providerId);
  const resolved = await resolveProviderModel(provider);
  if (!resolved.model) {
    return Response.json({ title: "Новый чат" });
  }
  const { text } = await generateText({
    model: resolved.model,
    system:
      "You name chat conversations for a novel-writing app. Output exactly one short title in Russian: 3–6 words. " +
      "No quotes, no prefix like «Чат» or «Chat», no trailing punctuation. " +
      "Capture the user's intent from their first message and (if given) the start of the assistant reply.",
    prompt: [
      "First user message:",
      firstUserText,
      assistantSafe ? `\nAssistant reply (start):\n${assistantSafe}` : "",
      "\nTitle only:",
    ].join("\n"),
  });

  const title = sanitizeTitle(text);
  return Response.json({ title });
}
