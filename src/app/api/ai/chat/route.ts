import { streamText, convertToModelMessages } from "ai";
import { serverTools } from "@/lib/ai/tools";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { getProvider } from "@/lib/ai/providers";
import {
  renderProjectContextForSystem,
  type ProjectContextPayload,
} from "@/lib/ai/project-context";
import { enforceRateLimit } from "@/app/api/ai/_shared/rate-limit";
import { resolveProviderModel } from "@/app/api/ai/_shared/secrets";

const MAX_EDITOR_CONTEXT_CHARS = 120_000;
const MAX_CHARACTER_CONTEXT_CHARS = 32_000;
const MAX_PROJECT_CONTEXT_CHARS = 40_000;

function isProjectContext(raw: unknown): raw is ProjectContextPayload {
  return (
    !!raw &&
    typeof raw === "object" &&
    typeof (raw as { projectId?: unknown }).projectId === "string" &&
    Array.isArray((raw as { chapters?: unknown }).chapters)
  );
}

function projectContextToSystemAppend(raw: unknown): string {
  if (!isProjectContext(raw)) return "";
  try {
    return renderProjectContextForSystem(raw, MAX_PROJECT_CONTEXT_CHARS);
  } catch {
    return "";
  }
}

function characterContextToSystemAppend(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const characterId = (raw as { characterId?: unknown }).characterId;
  const summaryText = (raw as { summaryText?: unknown }).summaryText;
  if (typeof summaryText !== "string") return "";
  const trimmed = summaryText.trim();
  if (!trimmed) return "";
  let safe = trimmed;
  if (safe.length > MAX_CHARACTER_CONTEXT_CHARS) {
    safe =
      safe.slice(0, MAX_CHARACTER_CONTEXT_CHARS) +
      "\n\n[Server-truncated for size.]";
  }
  const idLabel = typeof characterId === "string" ? characterId : "unknown";
  return `\n\n## Character focus (user chose this card in the UI)\n\nThe user is discussing character id \`${idLabel}\`. Use this profile and facts as primary context for character voice, consistency, and arc. Tools can still read the manuscript.\n\n---\n\n${safe}\n\n---\n`;
}

function editorContextToSystemAppend(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const mode = (raw as { mode?: unknown }).mode;
  const text = (raw as { text?: unknown }).text;
  if (mode !== "selection" && mode !== "full") return "";
  if (typeof text !== "string") return "";
  const trimmed = text.trim();
  if (!trimmed) return "";

  let safe = trimmed;
  if (safe.length > MAX_EDITOR_CONTEXT_CHARS) {
    safe =
      safe.slice(0, MAX_EDITOR_CONTEXT_CHARS) +
      "\n\n[Server-truncated for size.]";
  }

  const truncated = (raw as { truncated?: unknown }).truncated === true;
  const charCount = (raw as { charCount?: unknown }).charCount;
  const meta =
    typeof charCount === "number"
      ? `\n(Character count: ${charCount}${truncated ? "; client-truncated" : ""})`
      : "";

  const scope =
    mode === "selection"
      ? "The user has **selected text** in the editor. Prioritize this selection for answers and edits. Call reading tools for more of the manuscript only if the user asks for broader context."
      : "Nothing is selected. The text below is the **full current scene** in the editor — treat it as the primary manuscript context for this turn.";

  return `\n\n## Editor context (automatic; current when the message was sent)${meta}\n\n${scope}\n\n---\n\n${safe}\n\n---\n`;
}

export async function POST(req: Request) {
  const blocked = enforceRateLimit(req, "chat", 60, 60_000);
  if (blocked) return blocked;

  const {
    messages,
    providerId,
    editorContext,
    characterContext,
    projectContext,
  } = await req.json();

  const provider = getProvider(providerId ?? "openai-gpt4o-mini");
  const resolved = await resolveProviderModel(provider);
  if (!resolved.model && resolved.missingKeyEnvVar) {
    return Response.json(
      {
        error: `${resolved.missingKeyEnvVar} is not configured on the server.`,
      },
      { status: 503 },
    );
  }

  const uiMessages = Array.isArray(messages) ? messages : [];
  const modelMessages = await convertToModelMessages(uiMessages, {
    tools: serverTools,
  });

  const system =
    SYSTEM_PROMPT +
    projectContextToSystemAppend(projectContext) +
    editorContextToSystemAppend(editorContext) +
    characterContextToSystemAppend(characterContext);

  const result = streamText({
    model: resolved.model!,
    system,
    messages: modelMessages,
    tools: serverTools,
  });

  return result.toUIMessageStreamResponse();
}
