function boolFromEnv(value: string | undefined, defaultValue = false): boolean {
  if (value == null) return defaultValue;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export const plotFeatures = {
  storyGraphV1: boolFromEnv(process.env.NEXT_PUBLIC_STORY_GRAPH_V1, true),
  problemPanelV2: boolFromEnv(process.env.NEXT_PUBLIC_PROBLEM_PANEL_V2, true),
  contextualRewriteV1: boolFromEnv(process.env.NEXT_PUBLIC_CONTEXTUAL_REWRITE_V1, true),
  deepStoryReasoningV1: boolFromEnv(process.env.NEXT_PUBLIC_DEEP_STORY_REASONING_V1, true),
};
