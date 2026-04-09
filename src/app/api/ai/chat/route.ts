import { streamText, convertToModelMessages } from "ai";
import { serverTools } from "@/lib/ai/tools";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { getProvider } from "@/lib/ai/providers";

export async function POST(req: Request) {
  const { messages, providerId } = await req.json();

  const provider = getProvider(providerId ?? "openai-gpt4o-mini");

  const uiMessages = Array.isArray(messages) ? messages : [];
  const modelMessages = await convertToModelMessages(uiMessages, {
    tools: serverTools,
  });

  const result = streamText({
    model: provider.createModel(),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: serverTools,
  });

  return result.toUIMessageStreamResponse();
}
