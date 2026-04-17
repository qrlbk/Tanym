import type { ConsistencyWarning } from "./story-extraction";

export type ConflictStrictness = "high_precision" | "balanced" | "high_recall";

type StrictnessProfile = {
  minDisplayConfidence: number;
  minLlmConfidence: number;
  minRuleConfidence: number;
};

const PROFILES: Record<ConflictStrictness, StrictnessProfile> = {
  high_precision: {
    minDisplayConfidence: 0.75,
    minLlmConfidence: 0.7,
    minRuleConfidence: 0.72,
  },
  balanced: {
    minDisplayConfidence: 0.6,
    minLlmConfidence: 0.55,
    minRuleConfidence: 0.62,
  },
  high_recall: {
    minDisplayConfidence: 0.45,
    minLlmConfidence: 0.4,
    minRuleConfidence: 0.45,
  },
};

export function getConflictStrictness(): ConflictStrictness {
  const raw = (
    process.env.NEXT_PUBLIC_CONFLICT_STRICTNESS ??
    process.env.CONFLICT_STRICTNESS ??
    "balanced"
  ).toLowerCase();
  if (raw === "high_precision" || raw === "high_recall") {
    return raw;
  }
  return "balanced";
}

export function getStrictnessProfile(
  strictness = getConflictStrictness(),
): StrictnessProfile {
  return PROFILES[strictness];
}

export function shouldDisplayWarning(
  warning: ConsistencyWarning,
  strictness = getConflictStrictness(),
): boolean {
  return warning.confidence >= getStrictnessProfile(strictness).minDisplayConfidence;
}
