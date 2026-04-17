import type { AgentPlan } from "@/stores/aiStore";
import type { ProjectContextPayload } from "@/lib/ai/project-context";

export type FetchPlanInput = {
  instruction: string;
  projectContext: ProjectContextPayload | null;
  providerId?: string;
  signal?: AbortSignal;
};

export async function fetchPlan(input: FetchPlanInput): Promise<AgentPlan> {
  const res = await fetch("/api/ai/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instruction: input.instruction,
      projectContext: input.projectContext,
      providerId: input.providerId,
    }),
    signal: input.signal,
  });
  const data = (await res.json().catch(() => null)) as
    | { plan?: { goal: string; notes?: string | null; steps: Array<{ action: string; rationale: string; sceneRef?: string | null }> }; error?: string }
    | null;
  if (!res.ok || !data?.plan) {
    throw new Error(data?.error ?? `Planner HTTP ${res.status}`);
  }
  return {
    goal: data.plan.goal,
    notes: data.plan.notes ?? null,
    steps: data.plan.steps.map((s, i) => ({
      id: `step-${i + 1}`,
      action: s.action,
      rationale: s.rationale,
      sceneRef: s.sceneRef ?? null,
    })),
    createdAt: Date.now(),
  };
}

export function planToExecutionInstruction(plan: AgentPlan): string {
  const lines: string[] = [
    `# Approved plan`,
    `Goal: ${plan.goal}`,
  ];
  if (plan.notes) lines.push(`Notes: ${plan.notes}`);
  lines.push("", "Follow these approved steps in order, using the cross-scene tools:");
  for (let i = 0; i < plan.steps.length; i++) {
    const s = plan.steps[i];
    const scene = s.sceneRef ? ` [scene: ${s.sceneRef}]` : "";
    lines.push(`${i + 1}. ${s.action}${scene}`);
  }
  lines.push(
    "",
    "Report briefly what you did in each step and confirm when the plan is complete.",
  );
  return lines.join("\n");
}
