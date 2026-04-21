import { generateText } from "ai";
import { getProvider } from "@/lib/ai/providers";
import type { CharacterSectionKey } from "@/lib/project/types";
import { resolveProviderModel } from "@/app/api/ai/_shared/secrets";

const KEYS: CharacterSectionKey[] = [
  "appearance",
  "voice",
  "goals",
  "fears",
  "arc",
  "notes",
];

const MAX_FACTS = 24_000;
const MAX_EXCERPTS = 18_000;

function systemPromptForMode(mode: "structure" | "expand"): string {
  const base =
    "Reply with ONLY a single JSON object, no markdown fences. Keys (all strings): appearance, voice, goals, fears, arc, notes. Optional keys: role (string), confidence (number 0..1), reasons (string[]). Write in the same language as the source text (or Russian if mixed).";
  if (mode === "structure") {
    return (
      `You organize a novelist's character sheet using ONLY information present in the facts and manuscript excerpts below. ` +
      `Do NOT invent biography, backstory, or traits that are not supported by the sources. ` +
      `Rephrase and group facts into the sheet fields; leave "" where the sources say nothing. ` +
      `Set confidence higher only when evidence is explicit. ` +
      base
    );
  }
  return (
    `You help a novelist draft a character sheet. Use facts and excerpts as primary evidence. ` +
    `You may add careful, plausible hypotheses where gaps exist — keep them tentative and short; prefer "" over wild guesses. ` +
    `Return concise reasons[] for key updates. ` +
    base
  );
}

function userPrompt(args: {
  displayName: string;
  mode: "structure" | "expand";
  factsBlob: string;
  excerptsBlob: string;
}): string {
  const parts: string[] = [`Character: ${args.displayName}`, `Mode: ${args.mode}`];
  if (args.excerptsBlob.trim().length > 0) {
    parts.push(
      "",
      "Manuscript excerpts (voice, scene detail — use with facts):",
      args.excerptsBlob.slice(0, MAX_EXCERPTS),
    );
  }
  if (args.factsBlob.trim().length > 0) {
    parts.push("", "Story facts (structured):", args.factsBlob.slice(0, MAX_FACTS));
  }
  if (args.factsBlob.trim().length === 0 && args.excerptsBlob.trim().length === 0) {
    parts.push(
      "",
      "No facts or excerpts — return mostly empty strings; role may be empty or a minimal guess from the name only.",
    );
  }
  parts.push("", "JSON only.");
  return parts.join("\n");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const providerId = typeof body.providerId === "string" ? body.providerId : "openai-gpt4o-mini";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const factsBlob =
    typeof body.factsBlob === "string" ? body.factsBlob.trim() : "";
  const excerptsBlob =
    typeof body.excerptsBlob === "string" ? body.excerptsBlob.trim() : "";
  const mode: "structure" | "expand" =
    body.mode === "structure" ? "structure" : "expand";

  if (!displayName) {
    return Response.json({ error: "displayName required" }, { status: 400 });
  }

  const provider = getProvider(providerId);
  const resolved = await resolveProviderModel(provider);
  if (!resolved.model && resolved.missingKeyEnvVar) {
    return Response.json(
      { error: `${resolved.missingKeyEnvVar} is not configured on the server.` },
      { status: 503 },
    );
  }
  const { text } = await generateText({
    model: resolved.model!,
    system: systemPromptForMode(mode),
    prompt: userPrompt({ displayName, mode, factsBlob, excerptsBlob }),
  });

  let raw = text.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return Response.json(
      { error: "Model did not return valid JSON", raw: text.slice(0, 500) },
      { status: 422 },
    );
  }

  const sections: Partial<Record<CharacterSectionKey, string>> = {};
  for (const k of KEYS) {
    const v = parsed[k];
    if (typeof v === "string") sections[k] = v;
  }

  const role = typeof parsed.role === "string" ? parsed.role : undefined;
  const confidence =
    typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.5;
  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.filter((x): x is string => typeof x === "string").slice(0, 8)
    : [];

  return Response.json({
    sections,
    role: role ?? null,
    mode,
    confidence,
    reasons,
  });
}
