import { generateObject } from "ai";
import { z } from "zod";
import { getProvider, pickModelFor } from "@/lib/ai/providers";
import {
  renderProjectContextForSystem,
  type ProjectContextPayload,
} from "@/lib/ai/project-context";
import { enforceRateLimit } from "@/app/api/ai/_shared/rate-limit";
import { resolveProviderModel } from "@/app/api/ai/_shared/secrets";

const MAX_INSTRUCTION_CHARS = 8_000;
const MAX_PROJECT_CONTEXT_CHARS = 40_000;

const planSchema = z.object({
  goal: z.string().describe("Restated user goal in one sentence."),
  notes: z.string().nullable().describe("Brief assumptions or caveats. Null if none."),
  steps: z
    .array(
      z.object({
        action: z.string().describe("What you will do in this step (one sentence)."),
        rationale: z.string().describe("Why this step moves us towards the goal."),
        sceneRef: z
          .string()
          .nullable()
          .describe("Canonical scene:<uuid> ref if the step targets a specific scene. Null otherwise."),
      }),
    )
    .min(1)
    .max(10),
});

function projectContextToSystemAppend(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const payload = raw as ProjectContextPayload;
  if (typeof payload.projectId !== "string" || !Array.isArray(payload.chapters)) {
    return "";
  }
  try {
    return renderProjectContextForSystem(payload, MAX_PROJECT_CONTEXT_CHARS);
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  const blocked = enforceRateLimit(req, "plan", 20, 60_000);
  if (blocked) return blocked;

  const { instruction, projectContext, providerId } = await req.json();

  const raw = typeof instruction === "string" ? instruction.trim() : "";
  if (!raw) {
    return Response.json({ error: "instruction is required." }, { status: 400 });
  }
  const safe = raw.slice(0, MAX_INSTRUCTION_CHARS);

  // Prefer explicit user choice, else router picks a reasoning model.
  const provider = providerId ? getProvider(providerId) : pickModelFor("planner");
  const resolved = await resolveProviderModel(provider);
  if (!resolved.model && resolved.missingKeyEnvVar) {
    return Response.json(
      {
        error: `${resolved.missingKeyEnvVar} is not configured on the server.`,
      },
      { status: 503 },
    );
  }

  try {
    const { object } = await generateObject({
      model: resolved.model!,
      schema: planSchema,
      temperature: 0.2,
      system:
        "You are the PLANNER for a novelist's AI copilot. " +
        "Given a user's request and the current StoryProject context, produce a SHORT, concrete plan (1-10 steps) that the executor agent will follow. " +
        "Do NOT rewrite prose. Each step must be one clear action that maps to an available tool (read_scene, edit_scene, plot_semantic_search, suggest_continuity_fix, replace_selection, etc.). " +
        "When a step targets one scene, include its canonical scene ref (scene:<uuid>) from the project context." +
        projectContextToSystemAppend(projectContext),
      prompt: `User request:\n"""${safe}"""\n\nReturn the plan as JSON per the schema.`,
    });
    return Response.json({ plan: object, provider: provider.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
